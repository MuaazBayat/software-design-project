# tests/messaging/integration/test_create_profile.py
# ^ place anywhere under your tests; the name "integration" is fine even though we fully mock I/O.
# You can call it unit if you prefer; it’s “unit-style” because no network/DB.

from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient

# ---- Adjust this import path to your project structure ----
import services.core.main as main  # contains: app, get_supabase, route under test
# -----------------------------------------------------------

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

def test_create_profile_happy_path():
    # 1) SELECT returns empty (no existing profile)
    # 2) INSERT returns the created row (as a one-element list)
    created_row = {
        "age_range": "26-35",
        "primary_language": "fr",
        "secondary_languages": ["en"],
        "time_zone": "Europe/Paris",
        "country_code": "FR",
        "bio": "A student of culture and history from France.",
        "interests": ["history", "art", "travel"],
        "clerk_id": "user_123",
        "anonymous_handle": "globetrotter",
        "fingerprint": "fp_123"
    }
    fake = FakeSupabaseClient(results=[[], [created_row]])
    override_db(fake)
    client = make_client()

    payload = {
        "age_range": "26-35",
        "primary_language": "fr",
        "secondary_languages": ["en"],
        "time_zone": "Europe/Paris",
        "country_code": "FR",
        "bio": "A student of culture and history from France.",
        "interests": ["history", "art", "travel"],
        "clerk_id": "user_123",
        "anonymous_handle": "globetrotter",
        "fingerprint": "fp_123"
    }

    resp = client.post("/profiles/", json=payload)
    assert resp.status_code == 201
    assert resp.json() == created_row
    # Ensure we inserted exactly what the endpoint built
    assert fake.last_insert_payload == payload

def test_create_profile_duplicate_200():
    # 1) SELECT returns a row -> endpoint should 200 and return that row
    fake = FakeSupabaseClient(results=[[{"clerk_id": "user_123"}]])
    override_db(fake)
    client = make_client()

    resp = client.post(
        "/profiles/",  # no trailing slash to avoid redirect/422 weirdness
        json={"clerk_id": "user_123", "anonymous_handle": "anyhandle", "fingerprint": "fp_123"},
    )

    assert resp.status_code == 200, f"Got {resp.status_code} with body: {resp.text}"
    assert resp.json() == {"clerk_id": "user_123"}  # matches your FakeSupabase row

def test_create_profile_insert_failure_500():
# 1) SELECT returns empty list (ok to create)
# 2) INSERT returns None/falsy -> endpoint should 500
    fake = FakeSupabaseClient(results=[[], None])
    override_db(fake)
    client = make_client()


    # Add the required field anonymous_handle so request passes validation
    resp = client.post(
    "/profiles/",
    json={
    "clerk_id": "user_999",
    "anonymous_handle": "anyhandle", 
    "fingerprint": "fp_123"
    }
    # If your route requires a header, uncomment and adjust:
    # , headers={"X-User-Id": "user_999"}
    )
    assert resp.status_code == 500, f"Got {resp.status_code} with body: {resp.text}"