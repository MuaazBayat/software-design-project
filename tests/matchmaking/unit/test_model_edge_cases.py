"""Unit tests for model edge cases and validation"""
import pytest
from pydantic import ValidationError
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
def test_user_profile_with_empty_strings():
    """Test UserProfile with empty strings"""
    profile = UserProfile(
        user_id="123",
        anonymous_handle="",
        bio="",
        primary_language=""
    )
    
    assert profile.user_id == "123"
    assert profile.anonymous_handle == ""
    assert profile.bio == ""
    assert profile.primary_language == ""


@pytest.mark.unit
def test_user_profile_with_long_bio():
    """Test UserProfile with very long bio"""
    long_bio = "A" * 10000
    profile = UserProfile(
        user_id="123",
        anonymous_handle="test",
        bio=long_bio
    )
    
    assert len(profile.bio) == 10000


@pytest.mark.unit
def test_user_profile_with_many_interests():
    """Test UserProfile with many interests"""
    interests = [f"interest_{i}" for i in range(100)]
    profile = UserProfile(
        user_id="123",
        anonymous_handle="test",
        interests=interests
    )
    
    assert len(profile.interests) == 100


@pytest.mark.unit
def test_user_profile_with_many_languages():
    """Test UserProfile with many secondary languages"""
    languages = [f"language_{i}" for i in range(50)]
    profile = UserProfile(
        user_id="123",
        anonymous_handle="test",
        secondary_languages=languages
    )
    
    assert len(profile.secondary_languages) == 50


@pytest.mark.unit
def test_user_profile_with_special_characters():
    """Test UserProfile with special characters"""
    profile = UserProfile(
        user_id="123",
        anonymous_handle="test_user_!@#$%",
        bio="Bio with 特殊字符 and émojis 🎉",
        favorite_local_fact="Fact with symbols: <>&\""
    )
    
    assert "特殊字符" in profile.bio
    assert "🎉" in profile.bio
    assert "<>&\"" in profile.favorite_local_fact


@pytest.mark.unit
def test_user_profile_negative_completeness_score():
    """Test UserProfile with negative completeness score"""
    profile = UserProfile(
        user_id="123",
        anonymous_handle="test",
        cultural_completeness_score=-0.5
    )
    
    assert profile.cultural_completeness_score == -0.5


@pytest.mark.unit
def test_user_profile_score_greater_than_one():
    """Test UserProfile with completeness score > 1"""
    profile = UserProfile(
        user_id="123",
        anonymous_handle="test",
        cultural_completeness_score=1.5
    )
    
    assert profile.cultural_completeness_score == 1.5


@pytest.mark.unit
def test_matching_preferences_negative_timezone():
    """Test MatchingPreferences with negative timezone difference"""
    preferences = MatchingPreferences(
        max_timezone_difference=-5
    )
    
    assert preferences.max_timezone_difference == -5


@pytest.mark.unit
def test_matching_preferences_zero_timezone():
    """Test MatchingPreferences with zero timezone difference"""
    preferences = MatchingPreferences(
        max_timezone_difference=0
    )
    
    assert preferences.max_timezone_difference == 0


@pytest.mark.unit
def test_matching_preferences_large_timezone():
    """Test MatchingPreferences with very large timezone difference"""
    preferences = MatchingPreferences(
        max_timezone_difference=24
    )
    
    assert preferences.max_timezone_difference == 24


@pytest.mark.unit
def test_matching_preferences_empty_lists():
    """Test MatchingPreferences with all empty lists"""
    preferences = MatchingPreferences(
        languages=[],
        age_ranges=[],
        country_codes=[],
        interests=[]
    )
    
    assert preferences.languages == []
    assert preferences.age_ranges == []
    assert preferences.country_codes == []
    assert preferences.interests == []


@pytest.mark.unit
def test_matching_preferences_exclude_previous_false():
    """Test MatchingPreferences with exclude_previous set to False"""
    preferences = MatchingPreferences(
        exclude_previous=False
    )
    
    assert preferences.exclude_previous is False


@pytest.mark.unit
def test_match_response_empty_ids():
    """Test MatchResponse with empty string IDs"""
    profile = UserProfile(user_id="123", anonymous_handle="test")
    response = MatchResponse(
        match_id="",
        thread_id="",
        penpal_profile=profile,
        match_type="either",
        compatibility_score=0.5,
        created_at="2023-01-01T00:00:00"
    )
    
    assert response.match_id == ""
    assert response.thread_id == ""


@pytest.mark.unit
def test_match_response_zero_compatibility():
    """Test MatchResponse with zero compatibility score"""
    profile = UserProfile(user_id="123", anonymous_handle="test")
    response = MatchResponse(
        match_id="match123",
        thread_id="thread123",
        penpal_profile=profile,
        match_type="either",
        compatibility_score=0.0,
        created_at="2023-01-01T00:00:00"
    )
    
    assert response.compatibility_score == 0.0


@pytest.mark.unit
def test_match_response_perfect_compatibility():
    """Test MatchResponse with perfect compatibility score"""
    profile = UserProfile(user_id="123", anonymous_handle="test")
    response = MatchResponse(
        match_id="match123",
        thread_id="thread123",
        penpal_profile=profile,
        match_type="either",
        compatibility_score=1.0,
        created_at="2023-01-01T00:00:00"
    )
    
    assert response.compatibility_score == 1.0


@pytest.mark.unit
def test_match_response_over_one_compatibility():
    """Test MatchResponse with compatibility score > 1"""
    profile = UserProfile(user_id="123", anonymous_handle="test")
    response = MatchResponse(
        match_id="match123",
        thread_id="thread123",
        penpal_profile=profile,
        match_type="either",
        compatibility_score=1.5,
        created_at="2023-01-01T00:00:00"
    )
    
    assert response.compatibility_score == 1.5


@pytest.mark.unit
def test_daily_stats_response_negative_values():
    """Test DailyStatsResponse with negative values (edge case)"""
    stats = DailyStatsResponse(
        matches_used=-1,
        matches_remaining=-1,
        total_daily_limit=5,
        reset_time="2023-01-02T00:00:00"
    )
    
    assert stats.matches_used == -1
    assert stats.matches_remaining == -1


@pytest.mark.unit
def test_daily_stats_response_large_values():
    """Test DailyStatsResponse with very large values"""
    stats = DailyStatsResponse(
        matches_used=1000000,
        matches_remaining=0,
        total_daily_limit=5,
        reset_time="2023-01-02T00:00:00"
    )
    
    assert stats.matches_used == 1000000


@pytest.mark.unit
def test_daily_stats_response_zero_limit():
    """Test DailyStatsResponse with zero limit"""
    stats = DailyStatsResponse(
        matches_used=0,
        matches_remaining=0,
        total_daily_limit=0,
        reset_time="2023-01-02T00:00:00"
    )
    
    assert stats.total_daily_limit == 0


@pytest.mark.unit
def test_match_decision_request_none_preferences():
    """Test MatchDecisionRequest with None preferences"""
    decision = MatchDecisionRequest(
        clerk_id="clerk_123",
        accept=True,
        preferences=None
    )
    
    assert decision.preferences is None


@pytest.mark.unit
def test_match_decision_request_empty_suggested_user():
    """Test MatchDecisionRequest with empty string suggested_user_id"""
    decision = MatchDecisionRequest(
        clerk_id="clerk_123",
        accept=True,
        suggested_user_id=""
    )
    
    assert decision.suggested_user_id == ""


@pytest.mark.unit
def test_preference_selection_fake_type():
    """Test PreferenceSelection with fake preference type"""
    selection = PreferenceSelection(
        clerk_id="clerk_123",
        selected_profile_id="fake-1",
        preference_type="fake"
    )
    
    assert selection.preference_type == "fake"


@pytest.mark.unit
def test_preference_selection_real_type():
    """Test PreferenceSelection with real preference type"""
    selection = PreferenceSelection(
        clerk_id="clerk_123",
        selected_profile_id="user_123",
        preference_type="real"
    )
    
    assert selection.preference_type == "real"


@pytest.mark.unit
def test_preference_profile_all_none():
    """Test PreferenceProfile with all optional fields as None"""
    profile = PreferenceProfile(
        profile_id="profile_123",
        anonymous_handle="test",
        is_real=True,
        country_code=None,
        bio=None,
        interests=None,
        age_range=None,
        primary_language=None,
        favorite_local_fact=None
    )
    
    assert profile.country_code is None
    assert profile.bio is None
    assert profile.interests is None


@pytest.mark.unit
def test_preference_profile_fake_profile():
    """Test PreferenceProfile for fake profile"""
    profile = PreferenceProfile(
        profile_id="fake-1",
        anonymous_handle="FakeUser",
        is_real=False,
        country_code="XX",
        bio="Fake bio"
    )
    
    assert profile.is_real is False
    assert profile.profile_id == "fake-1"


@pytest.mark.unit
def test_passed_profile_with_timestamps():
    """Test PassedProfile with various timestamp formats"""
    passed = PassedProfile(
        user_id="user1",
        passed_user_id="user2",
        passed_at="2023-01-01T12:34:56.789Z"
    )
    
    assert "2023-01-01" in passed.passed_at


@pytest.mark.unit
def test_match_request_with_all_filters():
    """Test MatchRequest with all preference filters set"""
    preferences = MatchingPreferences(
        match_type="long-term",
        languages=["English", "Spanish"],
        age_ranges=["18-25", "26-35"],
        country_codes=["US", "UK", "CA"],
        interests=["music", "sports", "reading"],
        exclude_previous=True,
        max_timezone_difference=6
    )
    
    request = MatchRequest(
        clerk_id="clerk_123",
        preferences=preferences
    )
    
    assert len(request.preferences.languages) == 2
    assert len(request.preferences.age_ranges) == 2
    assert len(request.preferences.country_codes) == 3
    assert len(request.preferences.interests) == 3


@pytest.mark.unit
def test_user_profile_with_all_age_ranges():
    """Test UserProfile with different age ranges"""
    age_ranges = ["18-25", "26-35", "36-45", "46+"]
    
    for age_range in age_ranges:
        profile = UserProfile(
            user_id="123",
            anonymous_handle="test",
            age_range=age_range
        )
        assert profile.age_range == age_range


@pytest.mark.unit
def test_user_profile_with_custom_age_range():
    """Test UserProfile with custom age range format"""
    profile = UserProfile(
        user_id="123",
        anonymous_handle="test",
        age_range="30-40"  # Custom format
    )
    
    assert profile.age_range == "30-40"

