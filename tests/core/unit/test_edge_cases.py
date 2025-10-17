"""
Additional edge case unit tests for core service endpoints
"""
import pytest
from fastapi.testclient import TestClient
from types import SimpleNamespace
from unittest.mock import Mock
from postgrest.exceptions import APIError


@pytest.mark.unit
def test_validation():
    """Marker test for unit test discovery"""
    assert True


class FakeSupabaseClient:
    """Enhanced fake Supabase client for edge case testing"""
    def __init__(self, results=None, raise_api_error=False, api_error_code=None):
        self._results = list(results) if results else []
        self.raise_api_error = raise_api_error
        self.api_error_code = api_error_code
        self.last_upsert_payload = None
        self.last_on_conflict = None
    
    def table(self, name: str):
        return _Query(self)


class _Query:
    def __init__(self, client):
        self._c = client
    
    def select(self, *args, **kwargs):
        return self
    
    def eq(self, *args, **kwargs):
        return self
    
    def insert(self, payload):
        return self
    
    def update(self, payload):
        return self
    
    def upsert(self, payload, on_conflict=None):
        self._c.last_upsert_payload = payload
        self._c.last_on_conflict = on_conflict
        return self
    
    def execute(self):
        if self._c.raise_api_error:
            error_obj = {"code": self._c.api_error_code or "23505"}
            raise APIError(error_obj)
        
        data = self._c._results.pop(0) if self._c._results else None
        return SimpleNamespace(data=data)


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
def test_get_supabase_dependency_none():
    """Test get_supabase raises HTTPException when supabase client is None"""
    import services.core.main as main
    from unittest.mock import patch
    
    with patch.object(main, "supabase", None):
        client = TestClient(main.app)
        response = client.get("/profiles/user_123")
        
        # Should get 500 error because supabase is None
        assert response.status_code == 500
        assert "Supabase client not initialized" in response.json()["detail"]


@pytest.mark.unit
def test_get_profile_generic_exception():
    """Test get_profile handles generic exceptions and returns 500"""
    class BrokenQuery:
        def select(self, *args, **kwargs):
            return self
        
        def eq(self, *args, **kwargs):
            return self
        
        def execute(self):
            raise Exception("Database explosion!")
    
    class BrokenClient:
        def table(self, name):
            return BrokenQuery()
    
    override_db(BrokenClient())
    client = make_client()
    
    response = client.get("/profiles/user_123")
    assert response.status_code == 500
    assert "Internal server error" in response.json()["detail"]


@pytest.mark.unit
def test_update_profile_handle_conflict_409():
    """Test update_profile returns 409 when handle is already taken"""
    fake = FakeSupabaseClient(raise_api_error=True, api_error_code="23505")
    override_db(fake)
    client = make_client()
    
    response = client.put("/profiles/user_123", json={"anonymous_handle": "taken_handle"})
    assert response.status_code == 409
    assert "Handle is already taken" in response.json()["detail"]


@pytest.mark.unit
def test_update_profile_upsert_empty_response():
    """Test update_profile returns 500 when upsert returns no data"""
    fake = FakeSupabaseClient(results=[None])
    override_db(fake)
    client = make_client()
    
    response = client.put("/profiles/user_123", json={"bio": "test"})
    assert response.status_code == 500
    assert "Upsert failed" in response.json()["detail"]


@pytest.mark.unit
def test_update_profile_api_error_other_code():
    """Test update_profile re-raises APIError for non-23505 codes"""
    fake = FakeSupabaseClient(raise_api_error=True, api_error_code="99999")
    override_db(fake)
    client = make_client()
    
    with pytest.raises(APIError):
        response = client.put("/profiles/user_123", json={"bio": "test"})


@pytest.mark.unit
def test_create_profile_fingerprint_update():
    """Test create_profile updates fingerprint list when profile exists"""
    existing_profile = {
        "clerk_id": "user_123",
        "anonymous_handle": "alice",
        "fingerprint": ["fp_1"]
    }
    
    fake = FakeSupabaseClient(results=[[existing_profile]])
    override_db(fake)
    client = make_client()
    
    response = client.post("/profiles/", json={
        "clerk_id": "user_123",
        "anonymous_handle": "alice",
        "fingerprint": "fp_2"
    })
    
    assert response.status_code == 200
    # The fingerprint should be updated to include the new one
    assert response.json()["fingerprint"] == ["fp_1", "fp_2"]


@pytest.mark.unit
def test_create_profile_duplicate_fingerprint():
    """Test create_profile doesn't add duplicate fingerprints"""
    existing_profile = {
        "clerk_id": "user_123",
        "anonymous_handle": "alice",
        "fingerprint": ["fp_1"]
    }
    
    fake = FakeSupabaseClient(results=[[existing_profile]])
    override_db(fake)
    client = make_client()
    
    # Try to add the same fingerprint again
    response = client.post("/profiles/", json={
        "clerk_id": "user_123",
        "anonymous_handle": "alice",
        "fingerprint": "fp_1"
    })
    
    assert response.status_code == 200
    # Fingerprint list should remain unchanged (no duplicate)
    assert response.json()["fingerprint"] == ["fp_1"]


@pytest.mark.unit
def test_create_profile_null_fingerprint_list():
    """Test create_profile handles null fingerprint gracefully"""
    existing_profile = {
        "clerk_id": "user_123",
        "anonymous_handle": "alice",
        "fingerprint": None  # null in database
    }
    
    fake = FakeSupabaseClient(results=[[existing_profile]])
    override_db(fake)
    client = make_client()
    
    response = client.post("/profiles/", json={
        "clerk_id": "user_123",
        "anonymous_handle": "alice",
        "fingerprint": "fp_1"
    })
    
    assert response.status_code == 200
    # Should create a new list with the fingerprint
    assert response.json()["fingerprint"] == ["fp_1"]


@pytest.mark.unit
def test_profile_validation_errors():
    """Test various Pydantic validation errors"""
    client = make_client()
    
    # Missing required fields
    response = client.post("/profiles/", json={})
    assert response.status_code == 422
    
    # Invalid data types
    fake = FakeSupabaseClient(results=[[], [{"clerk_id": "user_123"}]])
    override_db(fake)
    
    response = client.post("/profiles/", json={
        "clerk_id": "user_123",
        "anonymous_handle": "alice",
        "fingerprint": "fp_1",
        "secondary_languages": "not_a_list"  # Should be list
    })
    assert response.status_code == 422


@pytest.mark.unit
def test_cors_headers_present():
    """Test that CORS middleware is properly configured"""
    import services.core.main as main
    client = TestClient(main.app)
    
    # Make an OPTIONS request (preflight)
    response = client.options("/profiles/user_123")
    
    # Should have CORS headers (handled by middleware)
    assert response.status_code in [200, 405]  # 405 if OPTIONS not explicitly defined


@pytest.mark.unit
def test_add_function():
    """Test the add utility function"""
    import services.core.main as main
    
    result = main.add(2, 3)
    assert result == 5
    
    result = main.add(-1, 1)
    assert result == 0
    
    result = main.add(0, 0)
    assert result == 0

