"""Unit tests for profile filtering and prioritization"""
import pytest
from unittest.mock import Mock
from services.matchmaking.main import (
    prioritize_profiles_by_filters,
    apply_language_filter,
    apply_interest_filter,
    get_passed_users,
    should_reset_passed_users
)


@pytest.mark.unit
def test_prioritize_profiles_all_filters_match():
    """Test prioritization when profile matches all filters"""
    user = {
        "user_id": "user1",
        "primary_language": "English",
        "age_range": "18-25",
        "country_code": "US",
        "interests": ["music", "sports"]
    }
    
    profiles = [
        {
            "user_id": "user2",
            "primary_language": "Spanish",
            "age_range": "26-35",
            "country_code": "MX",
            "interests": ["art"],
            "preferred_correspondence_type": "email"
        },
        {
            "user_id": "user3",
            "primary_language": "English",
            "age_range": "18-25",
            "country_code": "US",
            "interests": ["music", "sports"],
            "preferred_correspondence_type": "chat"
        }
    ]
    
    preferences = Mock()
    preferences.languages = ["English"]
    preferences.age_ranges = ["18-25"]
    preferences.country_codes = ["US"]
    preferences.interests = ["music", "sports"]
    preferences.match_type = "either"
    
    result = prioritize_profiles_by_filters(profiles, user, preferences)
    
    # user3 should be first as it matches all filters
    assert result[0]["user_id"] == "user3"


@pytest.mark.unit
def test_prioritize_profiles_empty_list():
    """Test prioritization with empty profiles list"""
    user = {"user_id": "user1"}
    preferences = Mock()
    preferences.languages = []
    preferences.age_ranges = []
    preferences.country_codes = []
    preferences.interests = []
    preferences.match_type = "either"
    
    result = prioritize_profiles_by_filters([], user, preferences)
    
    assert result == []


@pytest.mark.unit
def test_prioritize_profiles_no_matches():
    """Test prioritization when no profiles match filters"""
    user = {
        "user_id": "user1",
        "primary_language": "English",
        "age_range": "18-25",
        "country_code": "US",
        "interests": ["music"]
    }
    
    profiles = [
        {
            "user_id": "user2",
            "primary_language": "Spanish",
            "age_range": "26-35",
            "country_code": "MX",
            "interests": ["art"],
            "preferred_correspondence_type": "email"
        }
    ]
    
    preferences = Mock()
    preferences.languages = ["French"]
    preferences.age_ranges = ["46+"]
    preferences.country_codes = ["FR"]
    preferences.interests = ["cooking"]
    preferences.match_type = "either"
    
    result = prioritize_profiles_by_filters(profiles, user, preferences)
    
    # Should still return profiles even if they don't match
    assert len(result) == 1


@pytest.mark.unit
def test_prioritize_profiles_language_filter_secondary():
    """Test prioritization with secondary language match"""
    user = {"user_id": "user1"}
    
    profiles = [
        {
            "user_id": "user2",
            "primary_language": "English",
            "secondary_languages": None,
            "interests": [],
            "preferred_correspondence_type": "email"
        },
        {
            "user_id": "user3",
            "primary_language": "French",
            "secondary_languages": ["English", "Spanish"],
            "interests": [],
            "preferred_correspondence_type": "chat"
        }
    ]
    
    preferences = Mock()
    preferences.languages = ["English"]
    preferences.age_ranges = []
    preferences.country_codes = []
    preferences.interests = []
    preferences.match_type = "either"
    
    result = prioritize_profiles_by_filters(profiles, user, preferences)
    
    # Both should be prioritized as they have English
    first_two_ids = [p["user_id"] for p in result[:2]]
    assert "user2" in first_two_ids
    assert "user3" in first_two_ids


@pytest.mark.unit
def test_prioritize_profiles_match_type_long_term():
    """Test prioritization with long-term match type filter"""
    user = {"user_id": "user1"}
    
    profiles = [
        {
            "user_id": "user2",
            "primary_language": "English",
            "secondary_languages": [],
            "interests": [],
            "preferred_correspondence_type": "chat"
        },
        {
            "user_id": "user3",
            "primary_language": "English",
            "secondary_languages": [],
            "interests": [],
            "preferred_correspondence_type": "email"
        }
    ]
    
    preferences = Mock()
    preferences.languages = []
    preferences.age_ranges = []
    preferences.country_codes = []
    preferences.interests = []
    preferences.match_type = "long-term"
    
    result = prioritize_profiles_by_filters(profiles, user, preferences)
    
    # user3 should be first as it matches long-term (email)
    assert result[0]["user_id"] == "user3"


@pytest.mark.unit
def test_prioritize_profiles_match_type_one_time():
    """Test prioritization with one-time match type filter"""
    user = {"user_id": "user1"}
    
    profiles = [
        {
            "user_id": "user2",
            "primary_language": "English",
            "secondary_languages": [],
            "interests": [],
            "preferred_correspondence_type": "email"
        },
        {
            "user_id": "user3",
            "primary_language": "English",
            "secondary_languages": [],
            "interests": [],
            "preferred_correspondence_type": "chat"
        }
    ]
    
    preferences = Mock()
    preferences.languages = []
    preferences.age_ranges = []
    preferences.country_codes = []
    preferences.interests = []
    preferences.match_type = "one-time"
    
    result = prioritize_profiles_by_filters(profiles, user, preferences)
    
    # user3 should be first as it matches one-time (chat)
    assert result[0]["user_id"] == "user3"


@pytest.mark.unit
def test_prioritize_profiles_match_type_either():
    """Test prioritization with either match type"""
    user = {"user_id": "user1"}
    
    profiles = [
        {
            "user_id": "user2",
            "primary_language": "English",
            "secondary_languages": [],
            "interests": [],
            "preferred_correspondence_type": "email"
        },
        {
            "user_id": "user3",
            "primary_language": "English",
            "secondary_languages": [],
            "interests": [],
            "preferred_correspondence_type": "chat"
        }
    ]
    
    preferences = Mock()
    preferences.languages = []
    preferences.age_ranges = []
    preferences.country_codes = []
    preferences.interests = []
    preferences.match_type = "either"
    
    result = prioritize_profiles_by_filters(profiles, user, preferences)
    
    # Both should be included without preference
    assert len(result) == 2


@pytest.mark.unit
def test_prioritize_profiles_case_insensitive_languages():
    """Test that language filtering is case insensitive"""
    user = {"user_id": "user1"}
    
    profiles = [
        {
            "user_id": "user2",
            "primary_language": "ENGLISH",
            "secondary_languages": ["SPANISH"],
            "interests": [],
            "preferred_correspondence_type": "email"
        }
    ]
    
    preferences = Mock()
    preferences.languages = ["english", "spanish"]
    preferences.age_ranges = []
    preferences.country_codes = []
    preferences.interests = []
    preferences.match_type = "either"
    
    result = prioritize_profiles_by_filters(profiles, user, preferences)
    
    # Should match despite case differences
    assert result[0]["user_id"] == "user2"


@pytest.mark.unit
def test_prioritize_profiles_case_insensitive_interests():
    """Test that interest filtering is case insensitive"""
    user = {"user_id": "user1"}
    
    profiles = [
        {
            "user_id": "user2",
            "primary_language": "English",
            "secondary_languages": [],
            "interests": ["MUSIC", "SPORTS"],
            "preferred_correspondence_type": "email"
        }
    ]
    
    preferences = Mock()
    preferences.languages = []
    preferences.age_ranges = []
    preferences.country_codes = []
    preferences.interests = ["music", "sports"]
    preferences.match_type = "either"
    
    result = prioritize_profiles_by_filters(profiles, user, preferences)
    
    # Should match despite case differences
    assert result[0]["user_id"] == "user2"


@pytest.mark.unit
def test_prioritize_profiles_null_secondary_languages():
    """Test prioritization when secondary_languages is None"""
    user = {"user_id": "user1"}
    
    profiles = [
        {
            "user_id": "user2",
            "primary_language": "English",
            "secondary_languages": None,
            "interests": [],
            "preferred_correspondence_type": "email"
        }
    ]
    
    preferences = Mock()
    preferences.languages = ["English"]
    preferences.age_ranges = []
    preferences.country_codes = []
    preferences.interests = []
    preferences.match_type = "either"
    
    result = prioritize_profiles_by_filters(profiles, user, preferences)
    
    # Should handle None gracefully
    assert len(result) == 1


@pytest.mark.unit
def test_prioritize_profiles_null_interests():
    """Test prioritization when interests is None"""
    user = {"user_id": "user1"}
    
    profiles = [
        {
            "user_id": "user2",
            "primary_language": "English",
            "secondary_languages": [],
            "interests": None,
            "preferred_correspondence_type": "email"
        }
    ]
    
    preferences = Mock()
    preferences.languages = []
    preferences.age_ranges = []
    preferences.country_codes = []
    preferences.interests = ["music"]
    preferences.match_type = "either"
    
    result = prioritize_profiles_by_filters(profiles, user, preferences)
    
    # Should handle None gracefully
    assert len(result) == 1


@pytest.mark.unit
def test_prioritize_profiles_multiple_age_ranges():
    """Test prioritization with multiple age range filters"""
    user = {"user_id": "user1"}
    
    profiles = [
        {
            "user_id": "user2",
            "primary_language": "English",
            "age_range": "18-25",
            "interests": [],
            "preferred_correspondence_type": "email"
        },
        {
            "user_id": "user3",
            "primary_language": "English",
            "age_range": "26-35",
            "interests": [],
            "preferred_correspondence_type": "email"
        },
        {
            "user_id": "user4",
            "primary_language": "English",
            "age_range": "46+",
            "interests": [],
            "preferred_correspondence_type": "email"
        }
    ]
    
    preferences = Mock()
    preferences.languages = []
    preferences.age_ranges = ["18-25", "26-35"]
    preferences.country_codes = []
    preferences.interests = []
    preferences.match_type = "either"
    
    result = prioritize_profiles_by_filters(profiles, user, preferences)
    
    # First two should be prioritized
    first_two_ids = [p["user_id"] for p in result[:2]]
    assert "user2" in first_two_ids
    assert "user3" in first_two_ids
    # user4 should be last
    assert result[2]["user_id"] == "user4"


@pytest.mark.unit
def test_prioritize_profiles_multiple_countries():
    """Test prioritization with multiple country filters"""
    user = {"user_id": "user1"}
    
    profiles = [
        {
            "user_id": "user2",
            "primary_language": "English",
            "country_code": "US",
            "interests": [],
            "preferred_correspondence_type": "email"
        },
        {
            "user_id": "user3",
            "primary_language": "English",
            "country_code": "UK",
            "interests": [],
            "preferred_correspondence_type": "email"
        },
        {
            "user_id": "user4",
            "primary_language": "English",
            "country_code": "AU",
            "interests": [],
            "preferred_correspondence_type": "email"
        }
    ]
    
    preferences = Mock()
    preferences.languages = []
    preferences.age_ranges = []
    preferences.country_codes = ["US", "UK"]
    preferences.interests = []
    preferences.match_type = "either"
    
    result = prioritize_profiles_by_filters(profiles, user, preferences)
    
    # First two should be prioritized
    first_two_ids = [p["user_id"] for p in result[:2]]
    assert "user2" in first_two_ids
    assert "user3" in first_two_ids


@pytest.mark.unit
def test_apply_language_filter_empty_languages():
    """Test applying language filter with empty list"""
    mock_query = Mock()
    
    result = apply_language_filter(mock_query, [])
    
    # Should return query unchanged
    assert result == mock_query
    mock_query.or_.assert_not_called()


@pytest.mark.unit
def test_apply_language_filter_single_language():
    """Test applying language filter with single language"""
    mock_query = Mock()
    
    apply_language_filter(mock_query, ["English"])
    
    mock_query.or_.assert_called_once()


@pytest.mark.unit
def test_apply_language_filter_multiple_languages():
    """Test applying language filter with multiple languages"""
    mock_query = Mock()
    
    apply_language_filter(mock_query, ["English", "Spanish", "French"])
    
    mock_query.or_.assert_called_once()


@pytest.mark.unit
def test_apply_interest_filter_empty_interests():
    """Test applying interest filter with empty list"""
    mock_query = Mock()
    
    result = apply_interest_filter(mock_query, [])
    
    # Should return query unchanged
    assert result == mock_query
    mock_query.or_.assert_not_called()


@pytest.mark.unit
def test_apply_interest_filter_single_interest():
    """Test applying interest filter with single interest"""
    mock_query = Mock()
    
    apply_interest_filter(mock_query, ["music"])
    
    mock_query.or_.assert_called_once()


@pytest.mark.unit
def test_apply_interest_filter_multiple_interests():
    """Test applying interest filter with multiple interests"""
    mock_query = Mock()
    
    apply_interest_filter(mock_query, ["music", "sports", "reading"])
    
    mock_query.or_.assert_called_once()

