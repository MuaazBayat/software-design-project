# tests/unit/test_models.py
import pytest
from services.matchmaking.main import UserProfile, MatchingPreferences, MatchRequest, MatchResponse

def test_user_profile_model():
    """Test UserProfile model validation"""
    # Test valid profile
    profile = UserProfile(
        user_id="123",
        anonymous_handle="test_user",
        bio="Test bio",
        age_range="18-25",
        primary_language="English",
        secondary_languages=["Spanish"],
        time_zone="UTC+2",
        country_code="US",
        interests=["music", "sports"],
        favorite_local_fact="Local fact",
        preferred_correspondence_type="long-term",
        last_active="2023-01-01T00:00:00",
        cultural_completeness_score=0.8
    )
    
    assert profile.user_id == "123"
    assert profile.anonymous_handle == "test_user"
    
    # Test with minimal data
    minimal_profile = UserProfile(
        user_id="123",
        anonymous_handle="test_user"
    )
    
    assert minimal_profile.user_id == "123"
    assert minimal_profile.bio is None

def test_matching_preferences_model():
    """Test MatchingPreferences model validation"""
    preferences = MatchingPreferences(
        match_type="long-term",
        languages=["English", "Spanish"],
        age_ranges=["18-25", "26-35"],
        country_codes=["US", "UK"],
        interests=["music", "sports"],
        exclude_previous=True,
        max_timezone_difference=6
    )
    
    assert preferences.match_type == "long-term"
    assert "English" in preferences.languages
    assert preferences.max_timezone_difference == 6
    
    # Test defaults
    default_preferences = MatchingPreferences()
    assert default_preferences.match_type == "either"
    assert default_preferences.languages == []
    assert default_preferences.exclude_previous is True

def test_match_request_model():
    """Test MatchRequest model validation"""
    preferences = MatchingPreferences()
    request = MatchRequest(
        clerk_id="clerk_123",
        preferences=preferences
    )
    
    assert request.clerk_id == "clerk_123"
    assert request.preferences.match_type == "either"

def test_match_response_model():
    """Test MatchResponse model validation"""
    profile = UserProfile(
        user_id="123",
        anonymous_handle="test_user"
    )
    
    response = MatchResponse(
        match_id="match_123",
        thread_id="thread_123",
        penpal_profile=profile,
        match_type="long-term",
        compatibility_score=0.85,
        created_at="2023-01-01T00:00:00"
    )
    
    assert response.match_id == "match_123"
    assert response.compatibility_score == 0.85
    assert response.penpal_profile.user_id == "123"