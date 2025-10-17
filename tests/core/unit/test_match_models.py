"""
Unit tests for Match-related Pydantic models
Tests MatchedUserProfile, Match, and MatchesResponse
"""
import pytest
from datetime import datetime
from pydantic import ValidationError


@pytest.mark.unit
def test_validation():
    """Marker test for unit test discovery"""
    assert True


@pytest.mark.unit
def test_matched_user_profile_valid():
    """Test MatchedUserProfile model with valid data"""
    from services.core.models import MatchedUserProfile
    
    data = {
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "anonymous_handle": "globetrotter",
        "country_code": "FR",
        "bio": "Hello from France",
        "age_range": "26-35",
        "interests": ["art", "travel"],
        "primary_language": "fr",
        "secondary_languages": ["en", "es"],
        "favorite_local_fact": "The Eiffel Tower is painted every 7 years"
    }
    
    profile = MatchedUserProfile(**data)
    assert profile.user_id == "123e4567-e89b-12d3-a456-426614174000"
    assert profile.anonymous_handle == "globetrotter"
    assert profile.country_code == "FR"
    assert profile.bio == "Hello from France"
    assert len(profile.interests) == 2
    assert len(profile.secondary_languages) == 2


@pytest.mark.unit
def test_matched_user_profile_minimal():
    """Test MatchedUserProfile with only required fields"""
    from services.core.models import MatchedUserProfile
    
    profile = MatchedUserProfile(
        user_id="user_123",
        anonymous_handle="alice"
    )
    
    assert profile.user_id == "user_123"
    assert profile.anonymous_handle == "alice"
    assert profile.country_code is None
    assert profile.bio is None
    assert profile.age_range is None
    assert profile.interests == []
    assert profile.primary_language is None
    assert profile.secondary_languages == []
    assert profile.favorite_local_fact is None


@pytest.mark.unit
def test_matched_user_profile_missing_required():
    """Test MatchedUserProfile validation fails without required fields"""
    from services.core.models import MatchedUserProfile
    
    # Missing user_id
    with pytest.raises(ValidationError) as exc_info:
        MatchedUserProfile(anonymous_handle="alice")
    assert "user_id" in str(exc_info.value)
    
    # Missing anonymous_handle
    with pytest.raises(ValidationError) as exc_info:
        MatchedUserProfile(user_id="user_123")
    assert "anonymous_handle" in str(exc_info.value)


@pytest.mark.unit
def test_match_valid():
    """Test Match model with valid data"""
    from services.core.models import Match, MatchedUserProfile
    
    penpal = MatchedUserProfile(
        user_id="user_456",
        anonymous_handle="penpal_bob",
        country_code="JP",
        bio="Learning English",
        age_range="18-25",
        interests=["anime", "gaming"],
        primary_language="ja",
        secondary_languages=["en"]
    )
    
    now = datetime.now()
    match = Match(
        match_id="match_123",
        conversation_thread_id="thread_abc",
        match_type="language_practice",
        compatibility_score=0.85,
        status="active",
        created_at=now,
        penpal_profile=penpal
    )
    
    assert match.match_id == "match_123"
    assert match.conversation_thread_id == "thread_abc"
    assert match.match_type == "language_practice"
    assert match.compatibility_score == 0.85
    assert match.status == "active"
    assert match.created_at == now
    assert match.penpal_profile.user_id == "user_456"


@pytest.mark.unit
def test_match_minimal():
    """Test Match with minimal fields"""
    from services.core.models import Match, MatchedUserProfile
    
    penpal = MatchedUserProfile(
        user_id="user_456",
        anonymous_handle="minimal_user"
    )
    
    now = datetime.now()
    match = Match(
        match_id="match_123",
        status="active",
        created_at=now,
        penpal_profile=penpal
    )
    
    assert match.match_id == "match_123"
    assert match.conversation_thread_id is None
    assert match.match_type is None
    assert match.compatibility_score is None
    assert match.status == "active"


@pytest.mark.unit
def test_match_missing_required_fields():
    """Test Match validation fails without required fields"""
    from services.core.models import Match, MatchedUserProfile
    
    penpal = MatchedUserProfile(
        user_id="user_456",
        anonymous_handle="alice"
    )
    
    now = datetime.now()
    
    # Missing match_id
    with pytest.raises(ValidationError) as exc_info:
        Match(
            status="active",
            created_at=now,
            penpal_profile=penpal
        )
    assert "match_id" in str(exc_info.value)
    
    # Missing status
    with pytest.raises(ValidationError) as exc_info:
        Match(
            match_id="match_123",
            created_at=now,
            penpal_profile=penpal
        )
    assert "status" in str(exc_info.value)
    
    # Missing created_at
    with pytest.raises(ValidationError) as exc_info:
        Match(
            match_id="match_123",
            status="active",
            penpal_profile=penpal
        )
    assert "created_at" in str(exc_info.value)
    
    # Missing penpal_profile
    with pytest.raises(ValidationError) as exc_info:
        Match(
            match_id="match_123",
            status="active",
            created_at=now
        )
    assert "penpal_profile" in str(exc_info.value)


@pytest.mark.unit
def test_matches_response_valid():
    """Test MatchesResponse model with valid data"""
    from services.core.models import MatchesResponse, Match, MatchedUserProfile
    
    penpal1 = MatchedUserProfile(user_id="user_1", anonymous_handle="alice")
    penpal2 = MatchedUserProfile(user_id="user_2", anonymous_handle="bob")
    
    now = datetime.now()
    match1 = Match(
        match_id="match_1",
        status="active",
        created_at=now,
        penpal_profile=penpal1
    )
    match2 = Match(
        match_id="match_2",
        status="active",
        created_at=now,
        penpal_profile=penpal2
    )
    
    response = MatchesResponse(
        matches=[match1, match2],
        total_count=2
    )
    
    assert len(response.matches) == 2
    assert response.total_count == 2
    assert response.matches[0].match_id == "match_1"
    assert response.matches[1].match_id == "match_2"


@pytest.mark.unit
def test_matches_response_empty():
    """Test MatchesResponse with no matches"""
    from services.core.models import MatchesResponse
    
    response = MatchesResponse(
        matches=[],
        total_count=0
    )
    
    assert response.matches == []
    assert response.total_count == 0


@pytest.mark.unit
def test_matches_response_missing_fields():
    """Test MatchesResponse validation fails without required fields"""
    from services.core.models import MatchesResponse
    
    # Missing matches
    with pytest.raises(ValidationError) as exc_info:
        MatchesResponse(total_count=0)
    assert "matches" in str(exc_info.value)
    
    # Missing total_count
    with pytest.raises(ValidationError) as exc_info:
        MatchesResponse(matches=[])
    assert "total_count" in str(exc_info.value)


@pytest.mark.unit
def test_matched_user_profile_dict_conversion():
    """Test MatchedUserProfile model_dump() method"""
    from services.core.models import MatchedUserProfile
    
    profile = MatchedUserProfile(
        user_id="user_123",
        anonymous_handle="alice",
        country_code="US",
        bio="Test bio",
        interests=["music", "art"]
    )
    
    profile_dict = profile.model_dump()
    assert profile_dict["user_id"] == "user_123"
    assert profile_dict["anonymous_handle"] == "alice"
    assert profile_dict["country_code"] == "US"
    assert profile_dict["bio"] == "Test bio"
    assert len(profile_dict["interests"]) == 2
    assert "secondary_languages" in profile_dict


@pytest.mark.unit
def test_match_with_null_compatibility_score():
    """Test Match handles null compatibility_score"""
    from services.core.models import Match, MatchedUserProfile
    
    penpal = MatchedUserProfile(user_id="user_123", anonymous_handle="alice")
    now = datetime.now()
    
    match = Match(
        match_id="match_123",
        status="active",
        created_at=now,
        compatibility_score=None,
        penpal_profile=penpal
    )
    
    assert match.compatibility_score is None


@pytest.mark.unit
def test_match_serialization():
    """Test Match can be serialized to dict"""
    from services.core.models import Match, MatchedUserProfile
    
    penpal = MatchedUserProfile(
        user_id="user_456",
        anonymous_handle="bob",
        country_code="CA"
    )
    
    now = datetime.now()
    match = Match(
        match_id="match_123",
        conversation_thread_id="thread_abc",
        match_type="cultural_exchange",
        compatibility_score=0.90,
        status="active",
        created_at=now,
        penpal_profile=penpal
    )
    
    match_dict = match.model_dump()
    assert match_dict["match_id"] == "match_123"
    assert match_dict["conversation_thread_id"] == "thread_abc"
    assert match_dict["compatibility_score"] == 0.90
    assert match_dict["penpal_profile"]["user_id"] == "user_456"

