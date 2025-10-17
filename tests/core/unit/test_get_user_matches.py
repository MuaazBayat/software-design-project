"""
Unit tests for get_user_matches endpoint
Tests retrieving matches with profile data
"""
from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient


@pytest.mark.unit
def test_validation():
    """Marker test for unit test discovery"""
    assert True


class FakeQuery:
    """Chainable fake for complex Supabase queries with joins"""
    def __init__(self, results_queue, client_ref):
        self._results = results_queue
        self._client = client_ref

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def execute(self):
        data = self._results.pop(0) if self._results else None
        return SimpleNamespace(data=data)


class FakeSupabaseClient:
    """Fake Supabase client for testing matches"""
    def __init__(self, results):
        self._results = list(results)

    def table(self, name: str):
        assert name == "match_records"
        return FakeQuery(self._results, client_ref=self)


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
def test_get_user_matches_200_as_user1():
    """Test getting matches where the user is user_1"""
    match_data = {
        "match_id": "match_123",
        "conversation_thread_id": "thread_abc",
        "match_type": "cultural_exchange",
        "compatibility_score": 0.85,
        "status": "active",
        "created_at": "2025-08-31T12:00:00+00:00",
        "user_2_id": "user_456",
        "user_profiles": {
            "user_id": "user_456",
            "anonymous_handle": "penpal_alice",
            "country_code": "FR",
            "bio": "Hello from France",
            "age_range": "26-35",
            "interests": ["art", "travel"],
            "primary_language": "fr",
            "secondary_languages": ["en"],
            "favorite_local_fact": "The Eiffel Tower is painted every 7 years"
        }
    }

    # Two queries: as user_1 (returns match), as user_2 (returns empty)
    fake = FakeSupabaseClient(results=[[match_data], []])
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/matches/user_123")
    assert resp.status_code == 200, f"{resp.status_code} {resp.text}"
    data = resp.json()
    
    assert data["total_count"] == 1
    assert len(data["matches"]) == 1
    
    match = data["matches"][0]
    assert match["match_id"] == "match_123"
    assert match["compatibility_score"] == 0.85
    assert match["status"] == "active"
    
    penpal = match["penpal_profile"]
    assert penpal["user_id"] == "user_456"
    assert penpal["anonymous_handle"] == "penpal_alice"
    assert penpal["country_code"] == "FR"


@pytest.mark.unit
def test_get_user_matches_200_as_user2():
    """Test getting matches where the user is user_2"""
    match_data = {
        "match_id": "match_789",
        "conversation_thread_id": "thread_xyz",
        "match_type": "language_practice",
        "compatibility_score": 0.92,
        "status": "active",
        "created_at": "2025-09-01T12:00:00+00:00",
        "user_1_id": "user_111",
        "user_profiles": {
            "user_id": "user_111",
            "anonymous_handle": "penpal_bob",
            "country_code": "JP",
            "bio": "Learning English",
            "age_range": "18-25",
            "interests": ["anime", "gaming"],
            "primary_language": "ja",
            "secondary_languages": ["en"],
            "favorite_local_fact": None
        }
    }

    # Two queries: as user_1 (returns empty), as user_2 (returns match)
    fake = FakeSupabaseClient(results=[[], [match_data]])
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/matches/user_456")
    assert resp.status_code == 200
    data = resp.json()
    
    assert data["total_count"] == 1
    assert len(data["matches"]) == 1
    
    match = data["matches"][0]
    assert match["match_id"] == "match_789"
    assert match["penpal_profile"]["user_id"] == "user_111"


@pytest.mark.unit
def test_get_user_matches_200_multiple_matches():
    """Test getting multiple matches from both user_1 and user_2 queries"""
    match1 = {
        "match_id": "match_1",
        "conversation_thread_id": "thread_1",
        "match_type": "cultural_exchange",
        "compatibility_score": 0.80,
        "status": "active",
        "created_at": "2025-08-31T12:00:00+00:00",
        "user_2_id": "user_2",
        "user_profiles": {
            "user_id": "user_2",
            "anonymous_handle": "alice",
            "country_code": "US",
            "bio": "Hello",
            "age_range": "18-25",
            "interests": ["music"],
            "primary_language": "en",
            "secondary_languages": [],
            "favorite_local_fact": None
        }
    }
    
    match2 = {
        "match_id": "match_2",
        "conversation_thread_id": "thread_2",
        "match_type": "language_practice",
        "compatibility_score": 0.75,
        "status": "active",
        "created_at": "2025-09-01T12:00:00+00:00",
        "user_1_id": "user_3",
        "user_profiles": {
            "user_id": "user_3",
            "anonymous_handle": "bob",
            "country_code": "CA",
            "bio": "Hi there",
            "age_range": "26-35",
            "interests": ["sports"],
            "primary_language": "en",
            "secondary_languages": ["fr"],
            "favorite_local_fact": "Maple syrup"
        }
    }

    # Two queries: as user_1 (returns match1), as user_2 (returns match2)
    fake = FakeSupabaseClient(results=[[match1], [match2]])
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/matches/user_main")
    assert resp.status_code == 200
    data = resp.json()
    
    assert data["total_count"] == 2
    assert len(data["matches"]) == 2


@pytest.mark.unit
def test_get_user_matches_200_empty():
    """Test getting matches when user has no matches"""
    # Both queries return empty
    fake = FakeSupabaseClient(results=[[], []])
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/matches/user_with_no_matches")
    assert resp.status_code == 200
    data = resp.json()
    
    assert data["total_count"] == 0
    assert data["matches"] == []


@pytest.mark.unit
def test_get_user_matches_skips_matches_without_profiles():
    """Test that matches without user_profiles are skipped"""
    match_without_profile = {
        "match_id": "match_incomplete",
        "status": "active",
        "created_at": "2025-08-31T12:00:00+00:00",
        "user_2_id": "user_2",
        # No user_profiles field
    }

    fake = FakeSupabaseClient(results=[[match_without_profile], []])
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/matches/user_123")
    assert resp.status_code == 200
    data = resp.json()
    
    # Should skip the match without profile
    assert data["total_count"] == 0
    assert len(data["matches"]) == 0


@pytest.mark.unit
def test_get_user_matches_handles_none_arrays():
    """Test that None values in interests and secondary_languages are handled"""
    match_data = {
        "match_id": "match_null_arrays",
        "conversation_thread_id": "thread_abc",
        "match_type": "cultural_exchange",
        "compatibility_score": 0.70,
        "status": "active",
        "created_at": "2025-08-31T12:00:00+00:00",
        "user_2_id": "user_456",
        "user_profiles": {
            "user_id": "user_456",
            "anonymous_handle": "minimal_user",
            "country_code": None,
            "bio": None,
            "age_range": None,
            "interests": None,  # Should be converted to []
            "primary_language": "en",
            "secondary_languages": None,  # Should be converted to []
            "favorite_local_fact": None
        }
    }

    fake = FakeSupabaseClient(results=[[match_data], []])
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/matches/user_123")
    assert resp.status_code == 200
    data = resp.json()
    
    penpal = data["matches"][0]["penpal_profile"]
    assert penpal["interests"] == []
    assert penpal["secondary_languages"] == []


@pytest.mark.unit
def test_get_user_matches_null_conversation_thread_id():
    """Test matches with null conversation_thread_id"""
    match_data = {
        "match_id": "match_new",
        "conversation_thread_id": None,  # No conversation yet
        "match_type": "cultural_exchange",
        "compatibility_score": 0.88,
        "status": "active",
        "created_at": "2025-08-31T12:00:00+00:00",
        "user_2_id": "user_789",
        "user_profiles": {
            "user_id": "user_789",
            "anonymous_handle": "newbie",
            "country_code": "DE",
            "bio": "New to the platform",
            "age_range": "18-25",
            "interests": ["reading"],
            "primary_language": "de",
            "secondary_languages": ["en"],
            "favorite_local_fact": None
        }
    }

    fake = FakeSupabaseClient(results=[[match_data], []])
    override_db(fake)
    client = make_client()

    resp = client.get("/profiles/matches/user_123")
    assert resp.status_code == 200
    data = resp.json()
    
    match = data["matches"][0]
    assert match["conversation_thread_id"] is None


@pytest.mark.unit
def test_get_user_matches_generic_exception():
    """Test get_user_matches handles generic exceptions"""
    class BrokenQuery:
        def select(self, *args, **kwargs):
            return self
        
        def eq(self, *args, **kwargs):
            return self
        
        def execute(self):
            raise Exception("Database query failed!")
    
    class BrokenClient:
        def table(self, name):
            return BrokenQuery()
    
    override_db(BrokenClient())
    client = make_client()
    
    response = client.get("/profiles/matches/user_123")
    assert response.status_code == 500
    assert "Internal server error" in response.json()["detail"]

