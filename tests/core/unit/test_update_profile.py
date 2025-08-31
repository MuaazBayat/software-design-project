# test_update_profile.py — cleaned fake + working PUT tests
from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient

# Adjust to your project structure
import services.core.main as main  # contains: app, get_supabase

# -------------------- Minimal chainable fake --------------------
class FakeSupabaseClient:
    """Queue-driven fake that supports select/insert/update with eq+execute."""
    def __init__(self, results):
        self._results = list(results)  # each execute() pops one item and returns it as .data
        self.last_insert_payload = None
        self.last_update_payload = None
        self.last_filters = []

    def table(self, name: str):
        assert name == "user_profiles"  # optional guard
        return _Query(self)

class _Query:
    def __init__(self, client: FakeSupabaseClient):
        self._c = client

    # READ
    def select(self, *_args, **_kwargs):
        return self

    # WRITE
    def insert(self, payload):
        self._c.last_insert_payload = payload
        return self

    def update(self, payload):
        self._c.last_update_payload = payload
        return self

    # FILTERS
    def eq(self, column, value):
        self._c.last_filters.append((column, value))
        return self

    # TERMINAL
    def execute(self):
        data = self._c._results.pop(0) if self._c._results else None
        return SimpleNamespace(data=data)

# -------------------- Test helpers --------------------
@pytest.fixture(autouse=True)
def clear_dep_overrides():
    main.app.dependency_overrides.clear()
    yield
    main.app.dependency_overrides.clear()

def override_db(fake_client):
    main.app.dependency_overrides[main.get_supabase] = lambda: fake_client

def make_client():
    return TestClient(main.app)

# -------------------- Shared row factory --------------------

def _row_base(**overrides):
    row = {
        "clerk_id": "user_123",
        "anonymous_handle": "alice",
        "age_range": "18-25",
        "country_code": "ZA",
        "time_zone": "Africa/Johannesburg",
        "primary_language": "en",
        "secondary_languages": [],
        "bio": "hi",
        "interests": [],
        "created_at": "2025-08-31T12:00:00+00:00",
        "updated_at": "2025-08-31T12:00:00+00:00",
        "last_active": None,
    }
    row.update(overrides)
    return row

# -------------------- PUT /profiles/{clerk_id} tests --------------------

def test_update_profile_200_partial():
    updated_row = _row_base(bio="Hello there", secondary_languages=["en", "af"])
    fake = FakeSupabaseClient(results=[[updated_row]])  # UPDATE -> one row
    override_db(fake)
    client = make_client()

    payload = {"bio": "Hello there", "secondary_languages": ["en", "af"]}
    resp = client.put("/profiles/user_123", json=payload)

    assert resp.status_code == 200, f"{resp.status_code} {resp.text}"
    data = resp.json()
    assert data["clerk_id"] == "user_123"
    assert data["bio"] == "Hello there"
    assert data["secondary_languages"] == ["en", "af"]
    assert "created_at" in data and "updated_at" in data


def test_update_profile_404_when_not_found_or_no_changes():
    fake = FakeSupabaseClient(results=[[]])  # UPDATE -> no rows
    override_db(fake)
    client = make_client()

    resp = client.put("/profiles/does_not_exist", json={"bio": "x"})
    assert resp.status_code == 404, f"{resp.status_code} {resp.text}"
    assert resp.json()["detail"] == "Profile not found or no changes were made."


def test_update_profile_422_on_invalid_payload():
    # Wrong type for secondary_languages -> validation error before DB
    fake = FakeSupabaseClient(results=[[ _row_base() ]])
    override_db(fake)
    client = make_client()

    resp = client.put("/profiles/user_123", json={"secondary_languages": "en"})
    assert resp.status_code == 422, f"{resp.status_code} {resp.text}"


def test_update_profile_200_update_handle_and_language():
    updated_row = _row_base(anonymous_handle="alice2", primary_language="af")
    fake = FakeSupabaseClient(results=[[updated_row]])
    override_db(fake)
    client = make_client()

    payload = {"anonymous_handle": "alice2", "primary_language": "af"}
    resp = client.put("/profiles/user_123", json=payload)

    assert resp.status_code == 200, f"{resp.status_code} {resp.text}"
    data = resp.json()
    assert data["anonymous_handle"] == "alice2"
    assert data["primary_language"] == "af"
