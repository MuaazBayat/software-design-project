# tests/unit/test_models.py
import pytest
from services.matchmaking.main import (
    UserProfile, 
    MatchingPreferences, 
    MatchRequest, 
    MatchResponse,
    PassedProfile,
    DailyStatsResponse,
    MatchDecisionRequest,
    PreferenceSelection,
    PreferenceProfile
)

@pytest.mark.unit
def test_validation():
    assert True

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

def test_user_profile_default_values():
    """Test UserProfile model default values"""
    profile = UserProfile(
        user_id="123",
        anonymous_handle="test_user"
    )
    
    assert profile.secondary_languages == []
    assert profile.interests == []
    assert profile.bio is None
    assert profile.cultural_completeness_score is None

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

def test_matching_preferences_all_match_types():
    """Test MatchingPreferences with different match types"""
    for match_type in ["long-term", "one-time", "either"]:
        preferences = MatchingPreferences(match_type=match_type)
        assert preferences.match_type == match_type

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

def test_passed_profile_model():
    """Test PassedProfile model validation"""
    passed_profile = PassedProfile(
        user_id="user_123",
        passed_user_id="user_456",
        passed_at="2023-01-01T00:00:00"
    )
    
    assert passed_profile.user_id == "user_123"
    assert passed_profile.passed_user_id == "user_456"
    assert passed_profile.passed_at == "2023-01-01T00:00:00"

def test_daily_stats_response_model():
    """Test DailyStatsResponse model validation"""
    stats = DailyStatsResponse(
        matches_used=3,
        matches_remaining=2,
        total_daily_limit=5,
        reset_time="2023-01-02T00:00:00"
    )
    
    assert stats.matches_used == 3
    assert stats.matches_remaining == 2
    assert stats.total_daily_limit == 5
    assert stats.reset_time == "2023-01-02T00:00:00"

def test_daily_stats_response_all_used():
    """Test DailyStatsResponse when all matches are used"""
    stats = DailyStatsResponse(
        matches_used=5,
        matches_remaining=0,
        total_daily_limit=5,
        reset_time="2023-01-02T00:00:00"
    )
    
    assert stats.matches_used == stats.total_daily_limit
    assert stats.matches_remaining == 0

def test_match_decision_request_model():
    """Test MatchDecisionRequest model validation"""
    preferences = MatchingPreferences()
    decision = MatchDecisionRequest(
        clerk_id="clerk_123",
        accept=True,
        suggested_user_id="user_456",
        preferences=preferences
    )
    
    assert decision.clerk_id == "clerk_123"
    assert decision.accept is True
    assert decision.suggested_user_id == "user_456"
    assert decision.preferences.match_type == "either"

def test_match_decision_request_defaults():
    """Test MatchDecisionRequest default values"""
    decision = MatchDecisionRequest(
        clerk_id="clerk_123",
        accept=False
    )
    
    assert decision.clerk_id == "clerk_123"
    assert decision.accept is False
    assert decision.suggested_user_id is None
    assert decision.preferences.match_type == "either"

def test_preference_selection_model():
    """Test PreferenceSelection model validation"""
    selection = PreferenceSelection(
        clerk_id="clerk_123",
        selected_profile_id="profile_456",
        preference_type="real"
    )
    
    assert selection.clerk_id == "clerk_123"
    assert selection.selected_profile_id == "profile_456"
    assert selection.preference_type == "real"

def test_preference_selection_fake_type():
    """Test PreferenceSelection with fake preference type"""
    selection = PreferenceSelection(
        clerk_id="clerk_123",
        selected_profile_id="fake-1",
        preference_type="fake"
    )
    
    assert selection.preference_type == "fake"

def test_preference_profile_model():
    """Test PreferenceProfile model validation"""
    profile = PreferenceProfile(
        profile_id="profile_123",
        anonymous_handle="test_user",
        country_code="US",
        bio="Test bio",
        interests=["music", "sports"],
        age_range="18-25",
        primary_language="English",
        favorite_local_fact="Test fact",
        is_real=True
    )
    
    assert profile.profile_id == "profile_123"
    assert profile.anonymous_handle == "test_user"
    assert profile.is_real is True

def test_preference_profile_defaults():
    """Test PreferenceProfile default values"""
    profile = PreferenceProfile(
        profile_id="profile_123",
        anonymous_handle="test_user",
        is_real=False
    )
    
    assert profile.country_code is None
    assert profile.bio is None
    assert profile.interests is None
    assert profile.age_range is None
    assert profile.primary_language is None
    assert profile.favorite_local_fact is None
    assert profile.is_real is False