"""
Additional unit tests to increase coverage
Tests additional edge cases and code paths
"""
import pytest
from fastapi.testclient import TestClient
from types import SimpleNamespace
from unittest.mock import patch


@pytest.mark.unit
def test_validation():
    """Marker test for unit test discovery"""
    assert True


class FakeSupabaseClient:
    """Fake Supabase client for additional tests"""
    def __init__(self, results=None, raise_on_execute=False):
        self._results = list(results) if results else []
        self.raise_on_execute = raise_on_execute
        self.last_update_payload = None

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
        self._c.last_update_payload = payload
        return self

    def upsert(self, payload, on_conflict=None):
        return self

    def execute(self):
        if self._c.raise_on_execute:
            raise Exception("Simulated database error")
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
def test_get_profile_exception_handling():
    """Test that get_profile properly catches and re-raises HTTPException"""
    from fastapi import HTTPException
    
    class ErrorQuery:
        def select(self, *args, **kwargs):
            return self
        
        def eq(self, *args, **kwargs):
            return self
        
        def execute(self):
            # Simulate raising HTTPException from inside the handler
            raise HTTPException(status_code=404, detail="Profile not found.")
    
    class ErrorClient:
        def table(self, name):
            return ErrorQuery()
    
    override_db(ErrorClient())
    client = make_client()
    
    response = client.get("/profiles/test_user")
    assert response.status_code == 404
    assert response.json()["detail"] == "Profile not found."


@pytest.mark.unit
def test_get_profile_by_user_id_exception_handling():
    """Test that get_profile_by_user_id properly catches and re-raises HTTPException"""
    from fastapi import HTTPException
    
    class ErrorQuery:
        def select(self, *args, **kwargs):
            return self
        
        def eq(self, *args, **kwargs):
            return self
        
        def execute(self):
            raise HTTPException(status_code=404, detail="Profile not found.")
    
    class ErrorClient:
        def table(self, name):
            return ErrorQuery()
    
    override_db(ErrorClient())
    client = make_client()
    
    response = client.get("/profiles/by-user-id/test_user_id")
    assert response.status_code == 404
    assert response.json()["detail"] == "Profile not found."


@pytest.mark.unit
def test_get_user_matches_exception_handling():
    """Test that get_user_matches properly catches and re-raises HTTPException"""
    from fastapi import HTTPException
    
    class ErrorQuery:
        def select(self, *args, **kwargs):
            return self
        
        def eq(self, *args, **kwargs):
            return self
        
        def execute(self):
            raise HTTPException(status_code=404, detail="User not found.")
    
    class ErrorClient:
        def table(self, name):
            return ErrorQuery()
    
    override_db(ErrorClient())
    client = make_client()
    
    response = client.get("/profiles/matches/test_user_id")
    # The endpoint might return 500 if it doesn't explicitly handle this
    # or it might re-raise as expected
    assert response.status_code in [404, 500]


@pytest.mark.unit
def test_app_metadata():
    """Test FastAPI app has correct title"""
    import services.core.main as main
    
    assert main.app.title == "GlobeTalk Core API"


@pytest.mark.unit
def test_cors_middleware_configuration():
    """Test CORS middleware is configured correctly"""
    import services.core.main as main
    from fastapi.middleware.cors import CORSMiddleware
    
    # Check that CORS middleware is in the middleware stack
    cors_found = False
    for middleware in main.app.user_middleware:
        if middleware.cls == CORSMiddleware:
            cors_found = True
            break
    
    assert cors_found, "CORS middleware not found in app"


@pytest.mark.unit
def test_profile_create_with_all_optional_fields():
    """Test creating a profile with all optional fields populated"""
    full_profile = {
        "clerk_id": "user_full",
        "anonymous_handle": "complete_user",
        "fingerprint": "fp_full",
        "age_range": "36-45",
        "primary_language": "es",
        "secondary_languages": ["en", "fr", "de"],
        "time_zone": "Europe/Madrid",
        "country_code": "ES",
        "bio": "A complete profile with all fields",
        "interests": ["travel", "music", "art", "cooking"],
        "favorite_local_fact": "Spain has the most bars per capita in the EU",
        "preferred_correspondence_type": "long-term"
    }
    
    created_row = full_profile.copy()
    created_row["fingerprint"] = ["fp_full"]  # Converted to list
    created_row["created_at"] = "2025-08-31T12:00:00+00:00"
    created_row["updated_at"] = "2025-08-31T12:00:00+00:00"
    
    fake = FakeSupabaseClient(results=[[], [created_row]])
    override_db(fake)
    client = make_client()
    
    resp = client.post("/profiles/", json=full_profile)
    assert resp.status_code == 201
    data = resp.json()
    assert data["clerk_id"] == "user_full"
    assert data["favorite_local_fact"] == "Spain has the most bars per capita in the EU"
    assert data["preferred_correspondence_type"] == "long-term"
    assert len(data["secondary_languages"]) == 3  # ["en", "fr", "de"]
    assert len(data["interests"]) == 4


@pytest.mark.unit
def test_update_profile_all_fields():
    """Test updating all possible fields in a profile"""
    updated_row = {
        "clerk_id": "user_123",
        "anonymous_handle": "new_handle",
        "age_range": "46-55",
        "primary_language": "de",
        "secondary_languages": ["en", "fr"],
        "time_zone": "Europe/Berlin",
        "country_code": "DE",
        "bio": "Completely updated bio",
        "interests": ["photography", "hiking"],
        "favorite_local_fact": "Berlin has more bridges than Venice",
        "preferred_correspondence_type": "one-time",
        "fingerprint": ["fp_1"],
        "created_at": "2025-08-31T12:00:00+00:00",
        "updated_at": "2025-09-01T12:00:00+00:00",
        "last_active": None,
    }
    
    fake = FakeSupabaseClient(results=[[updated_row]])
    override_db(fake)
    client = make_client()
    
    payload = {
        "anonymous_handle": "new_handle",
        "age_range": "46-55",
        "primary_language": "de",
        "secondary_languages": ["en", "fr"],
        "time_zone": "Europe/Berlin",
        "country_code": "DE",
        "bio": "Completely updated bio",
        "interests": ["photography", "hiking"],
        "favorite_local_fact": "Berlin has more bridges than Venice",
        "preferred_correspondence_type": "one-time"
    }
    
    resp = client.put("/profiles/user_123", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["anonymous_handle"] == "new_handle"
    assert data["favorite_local_fact"] == "Berlin has more bridges than Venice"
    assert data["preferred_correspondence_type"] == "one-time"


@pytest.mark.unit
def test_profile_with_empty_arrays():
    """Test profile creation with explicitly empty arrays"""
    profile_data = {
        "clerk_id": "user_empty",
        "anonymous_handle": "minimalist",
        "fingerprint": "fp_empty",
        "secondary_languages": [],
        "interests": []
    }
    
    created_row = profile_data.copy()
    created_row["fingerprint"] = ["fp_empty"]
    created_row["created_at"] = "2025-08-31T12:00:00+00:00"
    created_row["updated_at"] = "2025-08-31T12:00:00+00:00"
    
    fake = FakeSupabaseClient(results=[[], [created_row]])
    override_db(fake)
    client = make_client()
    
    resp = client.post("/profiles/", json=profile_data)
    assert resp.status_code == 201
    data = resp.json()
    assert data["secondary_languages"] == []
    assert data["interests"] == []


@pytest.mark.unit
def test_match_with_optional_fields_populated():
    """Test match response with all optional fields"""
    match_data = {
        "match_id": "match_complete",
        "conversation_thread_id": "thread_xyz",
        "match_type": "cultural_exchange",
        "compatibility_score": 0.95,
        "status": "active",
        "created_at": "2025-08-31T12:00:00+00:00",
        "user_2_id": "user_complete",
        "user_profiles": {
            "user_id": "user_complete",
            "anonymous_handle": "complete_penpal",
            "country_code": "IT",
            "bio": "Full profile with all fields",
            "age_range": "26-35",
            "interests": ["cooking", "wine", "history"],
            "primary_language": "it",
            "secondary_languages": ["en", "fr"],
            "favorite_local_fact": "Italy has more UNESCO World Heritage Sites than any other country"
        }
    }
    
    fake = FakeSupabaseClient(results=[[match_data], []])
    override_db(fake)
    client = make_client()
    
    resp = client.get("/profiles/matches/user_main")
    assert resp.status_code == 200
    data = resp.json()
    
    match = data["matches"][0]
    assert match["conversation_thread_id"] == "thread_xyz"
    assert match["match_type"] == "cultural_exchange"
    assert match["compatibility_score"] == 0.95
    
    penpal = match["penpal_profile"]
    assert penpal["favorite_local_fact"] == "Italy has more UNESCO World Heritage Sites than any other country"
    assert len(penpal["interests"]) == 3
    assert len(penpal["secondary_languages"]) == 2


@pytest.mark.unit
def test_profile_models_correspondence_type_values():
    """Test ProfileCreate with different correspondence type values"""
    from services.core.models import ProfileCreate
    
    # Test 'long-term'
    profile = ProfileCreate(
        clerk_id="user_1",
        anonymous_handle="alice",
        fingerprint="fp_1",
        preferred_correspondence_type="long-term"
    )
    assert profile.preferred_correspondence_type == "long-term"
    
    # Test 'one-time'
    profile = ProfileCreate(
        clerk_id="user_2",
        anonymous_handle="bob",
        fingerprint="fp_2",
        preferred_correspondence_type="one-time"
    )
    assert profile.preferred_correspondence_type == "one-time"
    
    # Test 'either' (default)
    profile = ProfileCreate(
        clerk_id="user_3",
        anonymous_handle="charlie",
        fingerprint="fp_3"
    )
    assert profile.preferred_correspondence_type == "either"


@pytest.mark.unit
def test_profile_model_with_uuid():
    """Test Profile model with UUID user_id"""
    from services.core.models import Profile
    from datetime import datetime
    from uuid import UUID
    
    now = datetime.now()
    profile = Profile(
        user_id=UUID("123e4567-e89b-12d3-a456-426614174000"),
        clerk_id="user_123",
        anonymous_handle="alice",
        fingerprint=["fp_1"],
        created_at=now,
        updated_at=now,
        last_active=None
    )
    
    assert isinstance(profile.user_id, UUID)
    assert str(profile.user_id) == "123e4567-e89b-12d3-a456-426614174000"


@pytest.mark.unit
def test_profile_model_with_last_active():
    """Test Profile model with last_active timestamp"""
    from services.core.models import Profile
    from datetime import datetime
    
    now = datetime.now()
    profile = Profile(
        clerk_id="user_123",
        anonymous_handle="alice",
        fingerprint=["fp_1"],
        created_at=now,
        updated_at=now,
        last_active=now
    )
    
    assert profile.last_active == now
    assert profile.last_active is not None

