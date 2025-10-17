"""Unit tests for profile cleaning and sanitization"""
import pytest
from services.matchmaking.main import clean_profile


@pytest.mark.unit
def test_clean_profile_removes_sensitive_fields():
    """Test that sensitive fields are removed"""
    profile = {
        "user_id": "user123",
        "anonymous_handle": "test_user",
        "clerk_id": "clerk_123",
        "blocked_users": ["user1", "user2"],
        "reported_count": 5,
        "bio": "Test bio"
    }
    
    result = clean_profile(profile)
    
    assert "clerk_id" not in result
    assert "blocked_users" not in result
    assert "reported_count" not in result
    assert "user_id" in result
    assert "anonymous_handle" in result
    assert "bio" in result


@pytest.mark.unit
def test_clean_profile_preserves_safe_fields():
    """Test that safe fields are preserved"""
    profile = {
        "user_id": "user123",
        "anonymous_handle": "test_user",
        "bio": "Test bio",
        "age_range": "18-25",
        "primary_language": "English",
        "secondary_languages": ["Spanish"],
        "time_zone": "UTC+2",
        "country_code": "US",
        "interests": ["music", "sports"],
        "favorite_local_fact": "Local fact",
        "preferred_correspondence_type": "long-term",
        "last_active": "2023-01-01T00:00:00",
        "cultural_completeness_score": 0.8
    }
    
    result = clean_profile(profile)
    
    assert result["user_id"] == "user123"
    assert result["anonymous_handle"] == "test_user"
    assert result["bio"] == "Test bio"
    assert result["age_range"] == "18-25"
    assert result["primary_language"] == "English"
    assert result["secondary_languages"] == ["Spanish"]
    assert result["time_zone"] == "UTC+2"
    assert result["country_code"] == "US"
    assert result["interests"] == ["music", "sports"]
    assert result["favorite_local_fact"] == "Local fact"
    assert result["preferred_correspondence_type"] == "long-term"
    assert result["last_active"] == "2023-01-01T00:00:00"
    assert result["cultural_completeness_score"] == 0.8


@pytest.mark.unit
def test_clean_profile_converts_null_interests_to_empty_list():
    """Test that None interests are converted to empty list"""
    profile = {
        "user_id": "user123",
        "interests": None
    }
    
    result = clean_profile(profile)
    
    assert result["interests"] == []


@pytest.mark.unit
def test_clean_profile_converts_null_secondary_languages_to_empty_list():
    """Test that None secondary_languages are converted to empty list"""
    profile = {
        "user_id": "user123",
        "secondary_languages": None
    }
    
    result = clean_profile(profile)
    
    assert result["secondary_languages"] == []


@pytest.mark.unit
def test_clean_profile_preserves_empty_lists():
    """Test that existing empty lists are preserved"""
    profile = {
        "user_id": "user123",
        "interests": [],
        "secondary_languages": []
    }
    
    result = clean_profile(profile)
    
    assert result["interests"] == []
    assert result["secondary_languages"] == []


@pytest.mark.unit
def test_clean_profile_empty_profile():
    """Test cleaning an empty profile"""
    profile = {}
    
    result = clean_profile(profile)
    
    assert result["interests"] == []
    assert result["secondary_languages"] == []


@pytest.mark.unit
def test_clean_profile_only_sensitive_fields():
    """Test cleaning profile with only sensitive fields"""
    profile = {
        "clerk_id": "clerk_123",
        "blocked_users": ["user1"],
        "reported_count": 3
    }
    
    result = clean_profile(profile)
    
    assert "clerk_id" not in result
    assert "blocked_users" not in result
    assert "reported_count" not in result
    assert result["interests"] == []
    assert result["secondary_languages"] == []


@pytest.mark.unit
def test_clean_profile_minimal_profile():
    """Test cleaning minimal profile with just user_id"""
    profile = {
        "user_id": "user123",
        "anonymous_handle": "test_user"
    }
    
    result = clean_profile(profile)
    
    assert result["user_id"] == "user123"
    assert result["anonymous_handle"] == "test_user"
    assert result["interests"] == []
    assert result["secondary_languages"] == []


@pytest.mark.unit
def test_clean_profile_complete_profile():
    """Test cleaning a complete profile with all fields"""
    profile = {
        "user_id": "user123",
        "clerk_id": "clerk_123",  # Should be removed
        "anonymous_handle": "test_user",
        "bio": "Test bio",
        "age_range": "18-25",
        "primary_language": "English",
        "secondary_languages": ["Spanish", "French"],
        "time_zone": "UTC+2",
        "country_code": "US",
        "interests": ["music", "sports", "reading"],
        "favorite_local_fact": "Local fact",
        "preferred_correspondence_type": "long-term",
        "last_active": "2023-01-01T00:00:00",
        "cultural_completeness_score": 0.9,
        "blocked_users": ["user1", "user2"],  # Should be removed
        "reported_count": 2  # Should be removed
    }
    
    result = clean_profile(profile)
    
    # Check sensitive fields are removed
    assert "clerk_id" not in result
    assert "blocked_users" not in result
    assert "reported_count" not in result
    
    # Check safe fields are preserved
    assert result["user_id"] == "user123"
    assert result["anonymous_handle"] == "test_user"
    assert result["bio"] == "Test bio"
    assert len(result["interests"]) == 3
    assert len(result["secondary_languages"]) == 2


@pytest.mark.unit
def test_clean_profile_preserves_zero_values():
    """Test that zero values are preserved"""
    profile = {
        "user_id": "user123",
        "cultural_completeness_score": 0,
        "reported_count": 0  # Should still be removed
    }
    
    result = clean_profile(profile)
    
    assert result["cultural_completeness_score"] == 0
    assert "reported_count" not in result


@pytest.mark.unit
def test_clean_profile_preserves_false_values():
    """Test that false boolean values are preserved"""
    profile = {
        "user_id": "user123",
        "some_boolean_field": False
    }
    
    result = clean_profile(profile)
    
    assert result["some_boolean_field"] is False


@pytest.mark.unit
def test_clean_profile_multiple_profiles():
    """Test cleaning multiple profiles independently"""
    profile1 = {
        "user_id": "user1",
        "clerk_id": "clerk_1",
        "interests": ["music"]
    }
    
    profile2 = {
        "user_id": "user2",
        "clerk_id": "clerk_2",
        "interests": None
    }
    
    result1 = clean_profile(profile1)
    result2 = clean_profile(profile2)
    
    assert "clerk_id" not in result1
    assert "clerk_id" not in result2
    assert result1["interests"] == ["music"]
    assert result2["interests"] == []


@pytest.mark.unit
def test_clean_profile_does_not_modify_original():
    """Test that cleaning doesn't modify the original profile"""
    original = {
        "user_id": "user123",
        "clerk_id": "clerk_123",
        "interests": None
    }
    
    original_copy = original.copy()
    result = clean_profile(original)
    
    # Original should be unchanged
    assert original == original_copy
    # But result should be cleaned
    assert "clerk_id" not in result
    assert result["interests"] == []


@pytest.mark.unit
def test_clean_profile_with_additional_fields():
    """Test cleaning profile with extra unexpected fields"""
    profile = {
        "user_id": "user123",
        "clerk_id": "clerk_123",
        "custom_field": "custom_value",
        "another_field": 123
    }
    
    result = clean_profile(profile)
    
    assert "clerk_id" not in result
    assert result["custom_field"] == "custom_value"
    assert result["another_field"] == 123


@pytest.mark.unit
def test_clean_profile_preserves_nested_structures():
    """Test that nested structures in allowed fields are preserved"""
    profile = {
        "user_id": "user123",
        "interests": ["music", "sports"],
        "secondary_languages": ["Spanish", "French", "German"]
    }
    
    result = clean_profile(profile)
    
    assert isinstance(result["interests"], list)
    assert isinstance(result["secondary_languages"], list)
    assert len(result["interests"]) == 2
    assert len(result["secondary_languages"]) == 3

