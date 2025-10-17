"""
Unit tests for get_profile_by_user_id endpoint
Tests retrieving profile by UUID user_id
"""
from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient


@pytest.mark.unit
def test_validation():
    """Marker test for unit test discovery"""
    assert True


class FakeTable:
    """Minimal chainable fake for Supabase table operations"""
    def __init__(self, results_queue, client_ref):
        self._results = results_queue
        self._client = client_ref

    def select(self, *_, **__):
        return self

    def eq(self, *_, **__):
        return self

    def execute(self):
        data = self._results.pop(0) if self._results else None
        return SimpleNamespace(data=data)


class FakeSupabaseClient:
    """Fake Supabase client for testing"""
    def __init__(self, results):
        self._results = list(results)

    def table(self, name: str):
        assert name == "user_profiles"
        return FakeTable(self._results, client_ref=self)


@pytest.fixture(autouse=True)
def clear_dep_overrides():
    """Ensure dependency overrides don't leak across tests"""
    import services.core.main as main
    main.app.dependency_overrides.clear()
    yield
    main.app.dependency_overrides.clear()


def override_db(fake_client):
    import services.core.main as main
    main.app.dependency_overrides[main.get_supabase] = lambda: fake_client


def make_client():
    import services.core.main as main
    return TestClient(main.app)


@pytest.mark.unit
def test_get_profile_by_user_id_200():
    """Test successful profile retrieval by user_id"""
    row = {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "clerk_id": "user_123",
        "anonymous_handle": "alice",
        "age_range": "18-25",
        "country_code": "ZA",
        "time_zone": "Africa/Johannesburg",
        "primary_language": "en",
        "secondary_languages": ["af"],
        "bio": "Hello world",
        "interests": ["music", "art"],
        "fingerprint": ["fp_123"],
        "created_at": "2025-08-31T12:00:00+00:00",
        "updated_at": "2025-08-31T12:00:00+00:00",
        "last_active": None,
    }

    fake = FakeSupabaseClient(results=[[row]])
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/by-user-id/123e4567-e89b-12d3-a456-426614174000")
    assert resp.status_code == 200, f"{resp.status_code} {resp.text}"
    data = resp.json()
    assert data["user_id"] == "123e4567-e89b-12d3-a456-426614174000"
    assert data["anonymous_handle"] == "alice"
    assert data["age_range"] == "18-25"


@pytest.mark.unit
def test_get_profile_by_user_id_404():
    """Test profile not found by user_id"""
    fake = FakeSupabaseClient(results=[[]])
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/by-user-id/does_not_exist")
    assert resp.status_code == 404, f"{resp.status_code} {resp.text}"
    assert resp.json()["detail"] == "Profile not found."


@pytest.mark.unit
def test_get_profile_by_user_id_handles_none_arrays():
    """Test that None values for array fields are converted to empty arrays"""
    row = {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "clerk_id": "user_123",
        "anonymous_handle": "bob",
        "age_range": "26-35",
        "country_code": "US",
        "fingerprint": None,  # Should be converted to []
        "secondary_languages": None,  # Should be converted to []
        "interests": None,  # Should be converted to []
        "bio": "Test",
        "created_at": "2025-08-31T12:00:00+00:00",
        "updated_at": "2025-08-31T12:00:00+00:00",
        "last_active": None,
    }

    fake = FakeSupabaseClient(results=[[row]])
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/by-user-id/123e4567-e89b-12d3-a456-426614174000")
    assert resp.status_code == 200, f"{resp.status_code} {resp.text}"
    data = resp.json()
    
    # Verify None arrays are converted to empty lists
    assert data["fingerprint"] == []
    assert data["secondary_languages"] == []
    assert data["interests"] == []


@pytest.mark.unit
def test_get_profile_by_user_id_generic_exception():
    """Test get_profile_by_user_id handles generic exceptions"""
    class BrokenQuery:
        def select(self, *args, **kwargs):
            return self
        
        def eq(self, *args, **kwargs):
            return self
        
        def execute(self):
            raise Exception("Database connection error!")
    
    class BrokenClient:
        def table(self, name):
            return BrokenQuery()
    
    override_db(BrokenClient())
    client = make_client()
    
    response = client.get("/profiles/by-user-id/some-user-id")
    assert response.status_code == 500
    assert "Internal server error" in response.json()["detail"]


@pytest.mark.unit
def test_get_profile_by_user_id_preserves_array_fields():
    """Test that populated array fields are preserved correctly"""
    row = {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "clerk_id": "user_456",
        "anonymous_handle": "charlie",
        "fingerprint": ["fp_1", "fp_2", "fp_3"],
        "secondary_languages": ["es", "fr", "de"],
        "interests": ["coding", "music", "travel"],
        "age_range": "26-35",
        "country_code": "CA",
        "bio": "Test bio",
        "created_at": "2025-08-31T12:00:00+00:00",
        "updated_at": "2025-08-31T12:00:00+00:00",
        "last_active": None,
    }

    fake = FakeSupabaseClient(results=[[row]])
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/by-user-id/123e4567-e89b-12d3-a456-426614174000")
    assert resp.status_code == 200
    data = resp.json()
    
    assert len(data["fingerprint"]) == 3
    assert len(data["secondary_languages"]) == 3
    assert len(data["interests"]) == 3

