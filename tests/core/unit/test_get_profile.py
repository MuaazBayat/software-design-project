from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient
@pytest.mark.unit  # Add this to unit tests
def test_validation():
    assert True
# ---- Adjust this import path to your project structure ----
import services.core.main as main  # contains: app, get_supabase, route under test
class FakeTable:
    """
    Minimal chainable fake that supports:
      .select(...).eq(...).execute()  -> returns next queued result
      .insert(payload).execute()      -> returns next queued result and records payload
    """
    def __init__(self, results_queue, client_ref):
        self._results = results_queue
        self._client = client_ref

    # SELECT path
    def select(self, *_, **__):
        return self

    def eq(self, *_, **__):
        return self

    # INSERT path
    def insert(self, payload):
        self._client.last_insert_payload = payload
        return self

    # Terminal call
    def execute(self):
        # Pop the next queued "data" payload (list or None), wrap like Supabase's response
        data = self._results.pop(0) if self._results else None
        return SimpleNamespace(data=data)

class FakeSupabaseClient:
    """
    results must be a list whose items will be returned in order as `.execute().data`
    across calls. Your handler executes twice:
      1) SELECT existing_profile -> results[0]
      2) INSERT new row          -> results[1]
    """
    def __init__(self, results):
        self._results = list(results)
        self.last_insert_payload = None

    def table(self, name: str):
        assert name == "user_profiles"  # sanity check; remove if not desired
        return FakeTable(self._results, client_ref=self)

@pytest.fixture(autouse=True)
def clear_dep_overrides():
    # Ensure dependency overrides don't leak across tests
    main.app.dependency_overrides.clear()
    yield
    main.app.dependency_overrides.clear()

def override_db(fake_client):
    main.app.dependency_overrides[main.get_supabase] = lambda: fake_client

def make_client():
    return TestClient(main.app)
# core/unit/test_get_profile.py

def test_get_profile_200():
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
        "fingerprint": ["fp_123"]
    }

    fake = FakeSupabaseClient(results=[[row]])  # SELECT -> one row
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/user_123")
    assert resp.status_code == 200, f"{resp.status_code} {resp.text}"
    data = resp.json()
    # minimal assertions (response_model may reorder/serialize fields)
    assert data["clerk_id"] == "user_123"
    assert data["anonymous_handle"] == "alice"
    assert "created_at" in data and "updated_at" in data

def test_get_profile_404():
    fake = FakeSupabaseClient(results=[[]])  # SELECT -> no rows
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/does_not_exist")
    assert resp.status_code == 404, f"{resp.status_code} {resp.text}"
    assert resp.json()["detail"] == "Profile not found."
