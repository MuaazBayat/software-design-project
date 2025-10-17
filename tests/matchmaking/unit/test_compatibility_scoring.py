"""Unit tests for compatibility scoring algorithms"""
import pytest
from unittest.mock import Mock
from services.matchmaking.main import (
    calculate_compatibility_score,
    calculate_similarity_score
)


@pytest.mark.unit
def test_calculate_compatibility_perfect_match():
    """Test compatibility score with perfect match"""
    user1 = {
        "primary_language": "English",
        "secondary_languages": ["Spanish", "French"],
        "interests": ["music", "sports", "reading"],
        "age_range": "18-25",
        "country_code": "US",
        "cultural_completeness_score": 1.0
    }
    
    user2 = {
        "primary_language": "English",
        "secondary_languages": ["Spanish", "French"],
        "interests": ["music", "sports", "reading"],
        "age_range": "18-25",
        "country_code": "UK",
        "cultural_completeness_score": 1.0
    }
    
    preferences = Mock()
    preferences.languages = ["English"]
    preferences.interests = ["music", "sports"]
    
    score = calculate_compatibility_score(user1, user2, preferences)
    
    assert 0 <= score <= 1
    assert score > 0.8  # Should be very high for near-perfect match


@pytest.mark.unit
def test_calculate_compatibility_no_common_languages():
    """Test compatibility score with no common languages"""
    user1 = {
        "primary_language": "English",
        "secondary_languages": [],
        "interests": ["music"],
        "age_range": "18-25",
        "country_code": "US"
    }
    
    user2 = {
        "primary_language": "Japanese",
        "secondary_languages": ["Chinese"],
        "interests": ["music"],
        "age_range": "18-25",
        "country_code": "JP"
    }
    
    preferences = Mock()
    preferences.languages = []
    preferences.interests = []
    
    score = calculate_compatibility_score(user1, user2, preferences)
    
    assert 0 <= score <= 1
    # Score should be lower due to no language overlap


@pytest.mark.unit
def test_calculate_compatibility_secondary_language_match():
    """Test compatibility when only secondary languages match"""
    user1 = {
        "primary_language": "English",
        "secondary_languages": ["Spanish"],
        "interests": ["music"],
        "age_range": "18-25",
        "country_code": "US"
    }
    
    user2 = {
        "primary_language": "French",
        "secondary_languages": ["Spanish"],
        "interests": ["music"],
        "age_range": "18-25",
        "country_code": "FR"
    }
    
    preferences = Mock()
    preferences.languages = []
    preferences.interests = []
    
    score = calculate_compatibility_score(user1, user2, preferences)
    
    assert 0 <= score <= 1
    assert score > 0.3  # Should have some score due to secondary language match


@pytest.mark.unit
def test_calculate_compatibility_multiple_common_languages():
    """Test compatibility with multiple common languages"""
    user1 = {
        "primary_language": "English",
        "secondary_languages": ["Spanish", "French", "German"],
        "interests": ["music"],
        "age_range": "18-25",
        "country_code": "US"
    }
    
    user2 = {
        "primary_language": "English",
        "secondary_languages": ["Spanish", "French"],
        "interests": ["music"],
        "age_range": "18-25",
        "country_code": "UK"
    }
    
    preferences = Mock()
    preferences.languages = []
    preferences.interests = []
    
    score = calculate_compatibility_score(user1, user2, preferences)
    
    assert 0 <= score <= 1
    assert score > 0.5  # Multiple language matches should boost score


@pytest.mark.unit
def test_calculate_compatibility_adjacent_age_ranges():
    """Test compatibility with adjacent age ranges"""
    user1 = {
        "primary_language": "English",
        "secondary_languages": [],
        "interests": ["music"],
        "age_range": "18-25",
        "country_code": "US"
    }
    
    user2 = {
        "primary_language": "English",
        "secondary_languages": [],
        "interests": ["music"],
        "age_range": "26-35",
        "country_code": "US"
    }
    
    preferences = Mock()
    preferences.languages = []
    preferences.interests = []
    
    score = calculate_compatibility_score(user1, user2, preferences)
    
    assert 0 <= score <= 1


@pytest.mark.unit
def test_calculate_compatibility_different_countries():
    """Test compatibility with different countries (diversity bonus)"""
    user1 = {
        "primary_language": "English",
        "secondary_languages": [],
        "interests": ["music"],
        "age_range": "18-25",
        "country_code": "US"
    }
    
    user2 = {
        "primary_language": "English",
        "secondary_languages": [],
        "interests": ["music"],
        "age_range": "18-25",
        "country_code": "UK"
    }
    
    preferences = Mock()
    preferences.languages = []
    preferences.interests = []
    
    score = calculate_compatibility_score(user1, user2, preferences)
    
    assert 0 <= score <= 1


@pytest.mark.unit
def test_calculate_compatibility_with_preference_filters():
    """Test compatibility with user preference filters"""
    user1 = {
        "primary_language": "English",
        "secondary_languages": [],
        "interests": ["music", "sports"],
        "age_range": "18-25",
        "country_code": "US"
    }
    
    user2 = {
        "primary_language": "English",
        "secondary_languages": ["Spanish"],
        "interests": ["music", "art"],
        "age_range": "18-25",
        "country_code": "UK"
    }
    
    preferences = Mock()
    preferences.languages = ["Spanish"]
    preferences.interests = ["music"]
    
    score = calculate_compatibility_score(user1, user2, preferences)
    
    assert 0 <= score <= 1
    # Should get bonus for matching preference filters


@pytest.mark.unit
def test_calculate_compatibility_empty_profiles():
    """Test compatibility with minimal profile data"""
    user1 = {}
    user2 = {}
    
    preferences = Mock()
    preferences.languages = []
    preferences.interests = []
    
    score = calculate_compatibility_score(user1, user2, preferences)
    
    assert score == 0.0


@pytest.mark.unit
def test_calculate_compatibility_partial_profiles():
    """Test compatibility with partial profile data"""
    user1 = {
        "primary_language": "English",
        "interests": ["music"]
    }
    
    user2 = {
        "age_range": "18-25",
        "country_code": "US"
    }
    
    preferences = Mock()
    preferences.languages = []
    preferences.interests = []
    
    score = calculate_compatibility_score(user1, user2, preferences)
    
    assert 0 <= score <= 1


@pytest.mark.unit
def test_calculate_compatibility_high_completeness_score():
    """Test compatibility bonus from high cultural completeness"""
    user1 = {
        "primary_language": "English",
        "secondary_languages": [],
        "interests": ["music"],
        "age_range": "18-25",
        "country_code": "US"
    }
    
    user2 = {
        "primary_language": "English",
        "secondary_languages": [],
        "interests": ["music"],
        "age_range": "18-25",
        "country_code": "US",
        "cultural_completeness_score": 0.95
    }
    
    preferences = Mock()
    preferences.languages = []
    preferences.interests = []
    
    score_high = calculate_compatibility_score(user1, user2, preferences)
    
    user2["cultural_completeness_score"] = 0.2
    score_low = calculate_compatibility_score(user1, user2, preferences)
    
    assert score_high > score_low


@pytest.mark.unit
def test_calculate_similarity_perfect_match():
    """Test similarity score with identical profiles"""
    profile = {
        "country_code": "US",
        "primary_language": "English",
        "secondary_languages": ["Spanish"],
        "interests": ["music", "sports"],
        "age_range": "18-25"
    }
    
    score = calculate_similarity_score(profile, profile)
    
    assert score == 1.0


@pytest.mark.unit
def test_calculate_similarity_no_match():
    """Test similarity score with completely different profiles"""
    profile1 = {
        "country_code": "US",
        "primary_language": "English",
        "secondary_languages": [],
        "interests": ["music"],
        "age_range": "18-25"
    }
    
    profile2 = {
        "country_code": "JP",
        "primary_language": "Japanese",
        "secondary_languages": [],
        "interests": ["art"],
        "age_range": "36-45"
    }
    
    score = calculate_similarity_score(profile1, profile2)
    
    assert 0 <= score <= 1
    assert score < 0.3  # Should be low for completely different profiles


@pytest.mark.unit
def test_calculate_similarity_partial_match():
    """Test similarity score with partial matches"""
    profile1 = {
        "country_code": "US",
        "primary_language": "English",
        "secondary_languages": ["Spanish"],
        "interests": ["music", "sports"],
        "age_range": "18-25"
    }
    
    profile2 = {
        "country_code": "US",
        "primary_language": "English",
        "secondary_languages": ["French"],
        "interests": ["music", "art"],
        "age_range": "26-35"
    }
    
    score = calculate_similarity_score(profile1, profile2)
    
    assert 0 <= score <= 1
    assert 0.3 < score < 0.8  # Should be moderate


@pytest.mark.unit
def test_calculate_similarity_empty_profiles():
    """Test similarity with empty profiles"""
    score = calculate_similarity_score({}, {})
    
    assert score == 0.0


@pytest.mark.unit
def test_calculate_similarity_missing_fields():
    """Test similarity with missing fields"""
    profile1 = {
        "country_code": "US",
        "interests": ["music"]
    }
    
    profile2 = {
        "primary_language": "English",
        "age_range": "18-25"
    }
    
    score = calculate_similarity_score(profile1, profile2)
    
    assert 0 <= score <= 1


@pytest.mark.unit
def test_calculate_similarity_multiple_common_interests():
    """Test similarity with multiple common interests"""
    profile1 = {
        "country_code": "US",
        "primary_language": "English",
        "secondary_languages": [],
        "interests": ["music", "sports", "reading", "gaming"],
        "age_range": "18-25"
    }
    
    profile2 = {
        "country_code": "US",
        "primary_language": "English",
        "secondary_languages": [],
        "interests": ["music", "sports", "reading"],
        "age_range": "18-25"
    }
    
    score = calculate_similarity_score(profile1, profile2)
    
    assert 0 <= score <= 1
    assert score > 0.7  # High similarity due to many common interests


@pytest.mark.unit
def test_calculate_similarity_case_sensitivity():
    """Test similarity with different casing in interests and languages"""
    profile1 = {
        "country_code": "US",
        "primary_language": "English",
        "secondary_languages": ["Spanish"],
        "interests": ["Music", "Sports"],
        "age_range": "18-25"
    }
    
    profile2 = {
        "country_code": "US",
        "primary_language": "english",
        "secondary_languages": ["spanish"],
        "interests": ["music", "sports"],
        "age_range": "18-25"
    }
    
    score = calculate_similarity_score(profile1, profile2)
    
    # Should handle case differences properly
    assert score > 0.8


@pytest.mark.unit
def test_calculate_compatibility_no_interests():
    """Test compatibility when users have no interests"""
    user1 = {
        "primary_language": "English",
        "secondary_languages": [],
        "interests": [],
        "age_range": "18-25",
        "country_code": "US"
    }
    
    user2 = {
        "primary_language": "English",
        "secondary_languages": [],
        "interests": [],
        "age_range": "18-25",
        "country_code": "US"
    }
    
    preferences = Mock()
    preferences.languages = []
    preferences.interests = []
    
    score = calculate_compatibility_score(user1, user2, preferences)
    
    assert 0 <= score <= 1


@pytest.mark.unit
def test_calculate_compatibility_null_interests():
    """Test compatibility when interests are None"""
    user1 = {
        "primary_language": "English",
        "secondary_languages": [],
        "interests": None,
        "age_range": "18-25",
        "country_code": "US"
    }
    
    user2 = {
        "primary_language": "English",
        "secondary_languages": [],
        "interests": None,
        "age_range": "18-25",
        "country_code": "US"
    }
    
    preferences = Mock()
    preferences.languages = []
    preferences.interests = []
    
    score = calculate_compatibility_score(user1, user2, preferences)
    
    assert 0 <= score <= 1

