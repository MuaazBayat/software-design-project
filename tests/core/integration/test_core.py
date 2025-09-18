"""Integration tests for GlobeTalk Core API profile endpoints.

Covers:
- POST /profiles (create or return existing)
- GET /profiles/{clerk_id}
- PUT /profiles/{clerk_id} (upsert)

These tests override the app's Supabase dependency with a fully in‑memory fake that
simulates select/insert/upsert chains and allows per‑test result injection.


"""
from __future__ import annotations

import contextlib
from typing import Any, Dict, Optional

import pytest
from fastapi.testclient import TestClient

with contextlib.suppress(ModuleNotFoundError):
    from services.core.main import app, get_supabase  # type: ignore
with contextlib.suppress(ModuleNotFoundError):
    from main import app, get_supabase  # type: ignore  # fallback if above import fails

try:
    from postgrest.exceptions import APIError
except Exception:  # pragma: no cover - keeps tests importable even if lib isn't installed locally
    class APIError(Exception):
        def __init__(self, obj: Dict[str, Any]):
            super().__init__(obj)
            self.code = obj.get("code")


# ----------------------------
# In‑memory Fake Supabase
# ----------------------------
class FakeExecuteResult:
    def __init__(self, data: Any):
        self.data = data


class FakeBuilder:
    def __init__(self, table: "FakeTable", kind: str):
        self._table = table
        self._kind = kind

    # Common query modifiers — return self for chainability
    def select(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def or_(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    def upsert(self, *_args, **_kwargs):
        # For API parity; tests set the upsert result by configuring the table
        self._kind = "upsert"
        return self

    # Terminal
    def execute(self):
        if self._kind == "select":
            return FakeExecuteResult(self._table.select_result)
        if self._kind == "insert":
            return FakeExecuteResult(self._table.insert_result)
        if self._kind == "upsert":
            if self._table.upsert_error is not None:
                raise self._table.upsert_error
            return FakeExecuteResult(self._table.upsert_result)
        # Default: empty
        return FakeExecuteResult([])


class FakeTable:
    def __init__(self, name: str):
        self.name = name
        self.select_result: Any = []
        self.insert_result: Any = []
        self.upsert_result: Any = []
        self.upsert_error: Optional[Exception] = None

    def set_select(self, data: Any):
        self.select_result = data

    def set_insert(self, data: Any):
        self.insert_result = data

    def set_upsert(self, data: Any):
        self.upsert_result = data
        self.upsert_error = None

    def set_upsert_error(self, exc: Exception):
        self.upsert_error = exc

    # Builders used by the app code
    def select(self, *_args, **_kwargs) -> FakeBuilder:
        return FakeBuilder(self, "select")

    def insert(self, *_args, **_kwargs) -> FakeBuilder:
        return FakeBuilder(self, "insert")

    def upsert(self, *_args, **_kwargs) -> FakeBuilder:
        return FakeBuilder(self, "upsert")


class FakeSupabase:
    def __init__(self):
        self._tables: Dict[str, FakeTable] = {}

    def table(self, name: str) -> FakeTable:
        if name not in self._tables:
            self._tables[name] = FakeTable(name)
        return self._tables[name]

    @property
    def user_profiles(self) -> FakeTable:
        return self.table("user_profiles")


# ----------------------------
# Fixtures
# ----------------------------
@pytest.fixture()
def fake_db():
    return FakeSupabase()


@pytest.fixture()
def client(fake_db):
    # Override the dependency for each test instance
    app.dependency_overrides[get_supabase] = lambda: fake_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


# ----------------------------
# Helpers
# ----------------------------

def profile_row(**overrides: Any) -> Dict[str, Any]:
    """Return a DB row shaped exactly like the Profile response model expects.

    Required keys: created_at, updated_at, last_active (may be None), and all profile fields.
    """
    base = {
        "clerk_id": "clerk_123",
        "anonymous_handle": "alice",
        "age_range": "18-25",
        "primary_language": "en",
        "secondary_languages": [],
        "time_zone": "Africa/Johannesburg",
        "country_code": "ZA",
        "bio": "hi",
        "interests": [],
        # Required by response model
        "created_at": "2025-08-31T12:00:00+00:00",
        "updated_at": "2025-08-31T12:00:00+00:00",
        "last_active": None,
        "fingerprint": "fp_123",
    }
    base.update(overrides)
    return base


# ----------------------------
# Tests: POST /profiles
# ----------------------------

def test_create_profile_returns_existing_200(client: TestClient, fake_db: FakeSupabase):
    existing = profile_row(anonymous_handle="existing_user")
    fake_db.user_profiles.set_select([existing])  # select(...).eq(...).execute().data

    # ProfileCreate requires BOTH clerk_id and anonymous_handle
    payload = {"clerk_id": existing["clerk_id"], "anonymous_handle": "whatever", "fingerprint": "fp_123"}
    resp = client.post("/profiles", json=payload)

    assert resp.status_code == 200
    data = resp.json()
    assert data["clerk_id"] == existing["clerk_id"]
    assert data["anonymous_handle"] == "existing_user"
    # Response model fields should be present
    assert "created_at" in data and "updated_at" in data and "last_active" in data


def test_create_profile_inserts_new_201(client: TestClient, fake_db: FakeSupabase):
    fake_db.user_profiles.set_select([])  # no existing
    created = profile_row(anonymous_handle="alice")
    fake_db.user_profiles.set_insert([created])  # insert(...).execute().data

    # Only send create fields the API expects (no created_at etc.)
    payload = {"clerk_id": created["clerk_id"], "anonymous_handle": created["anonymous_handle"], "fingerprint": "fp_123"}
    resp = client.post("/profiles", json=payload)

    assert resp.status_code == 201
    data = resp.json()
    assert data["clerk_id"] == created["clerk_id"]
    assert data["anonymous_handle"] == created["anonymous_handle"]
    assert "created_at" in data and "updated_at" in data


def test_create_profile_insert_failed_500(client: TestClient, fake_db: FakeSupabase):
    fake_db.user_profiles.set_select([])
    fake_db.user_profiles.set_insert([])  # simulate DB insert returned no rows

    payload = {"clerk_id": "clerk_123", "anonymous_handle": "alice", "fingerprint": "fp_123"}
    resp = client.post("/profiles", json=payload)

    assert resp.status_code == 500
    assert resp.json()["detail"] == "Failed to create profile."


# ----------------------------
# Tests: GET /profiles/{clerk_id}
# ----------------------------

def test_get_profile_200(client: TestClient, fake_db: FakeSupabase):
    row = profile_row(clerk_id="clerk_abc", anonymous_handle="zara")
    fake_db.user_profiles.set_select([row])

    resp = client.get("/profiles/clerk_abc")
    assert resp.status_code == 200
    data = resp.json()
    assert data["anonymous_handle"] == "zara"
    assert data["clerk_id"] == "clerk_abc"
    assert "created_at" in data and "updated_at" in data


def test_get_profile_404(client: TestClient, fake_db: FakeSupabase):
    fake_db.user_profiles.set_select([])  # not found

    resp = client.get("/profiles/missing")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Profile not found."


# ----------------------------
# Tests: PUT /profiles/{clerk_id}
# ----------------------------

def test_update_profile_upsert_success_200(client: TestClient, fake_db: FakeSupabase):
    updated = profile_row(anonymous_handle="new_name")
    fake_db.user_profiles.set_upsert([updated])

    resp = client.put("/profiles/clerk_123", json={"anonymous_handle": "new_name"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["anonymous_handle"] == "new_name"
    assert "created_at" in data and "updated_at" in data


def test_update_profile_upsert_conflict_409(client: TestClient, fake_db: FakeSupabase):
    # Simulate a database unique violation (e.g., handle already taken)
    fake_db.user_profiles.set_upsert_error(APIError({"code": "23505"}))

    resp = client.put("/profiles/clerk_123", json={"anonymous_handle": "taken_name"})
    assert resp.status_code == 409
    assert resp.json()["detail"] == "Handle is already taken."


def test_update_profile_upsert_no_data_500(client: TestClient, fake_db: FakeSupabase):
    # Execute returns object with empty/falsey .data
    fake_db.user_profiles.set_upsert([])

    resp = client.put("/profiles/clerk_123", json={"bio": "hi"})
    assert resp.status_code == 500
    assert resp.json()["detail"] == "Upsert failed."
