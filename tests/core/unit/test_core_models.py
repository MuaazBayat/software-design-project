"""
Unit tests for core/models.py Pydantic models
Tests data validation and model behavior
"""
import pytest
from datetime import datetime
from pydantic import ValidationError


@pytest.mark.unit
def test_validation():
    """Marker test for unit test discovery"""
    assert True


@pytest.mark.unit
def test_profile_create_valid():
    """Test ProfileCreate model with valid data"""
    from services.core.models import ProfileCreate
    
    data = {
        "clerk_id": "user_123",
        "anonymous_handle": "globetrotter",
        "fingerprint": "fp_abc123",
        "age_range": "26-35",
        "primary_language": "en",
        "secondary_languages": ["fr", "es"],
        "time_zone": "America/New_York",
        "country_code": "US",
        "bio": "Hello world",
        "interests": ["travel", "music"]
    }
    
    profile = ProfileCreate(**data)
    assert profile.clerk_id == "user_123"
    assert profile.anonymous_handle == "globetrotter"
    assert profile.fingerprint == "fp_abc123"
    assert profile.age_range == "26-35"
    assert profile.primary_language == "en"
    assert len(profile.secondary_languages) == 2
    assert len(profile.interests) == 2


@pytest.mark.unit
def test_profile_create_minimal():
    """Test ProfileCreate with only required fields"""
    from services.core.models import ProfileCreate
    
    profile = ProfileCreate(
        clerk_id="user_123",
        anonymous_handle="alice",
        fingerprint="fp_xyz"
    )
    
    assert profile.clerk_id == "user_123"
    assert profile.anonymous_handle == "alice"
    assert profile.fingerprint == "fp_xyz"
    assert profile.secondary_languages == []
    assert profile.interests == []
    assert profile.age_range is None
    assert profile.bio is None


@pytest.mark.unit
def test_profile_create_missing_required_fields():
    """Test ProfileCreate validation fails when required fields are missing"""
    from services.core.models import ProfileCreate
    
    # Missing clerk_id
    with pytest.raises(ValidationError) as exc_info:
        ProfileCreate(anonymous_handle="alice", fingerprint="fp_123")
    assert "clerk_id" in str(exc_info.value)
    
    # Missing anonymous_handle
    with pytest.raises(ValidationError) as exc_info:
        ProfileCreate(clerk_id="user_123", fingerprint="fp_123")
    assert "anonymous_handle" in str(exc_info.value)
    
    # Missing fingerprint
    with pytest.raises(ValidationError) as exc_info:
        ProfileCreate(clerk_id="user_123", anonymous_handle="alice")
    assert "fingerprint" in str(exc_info.value)


@pytest.mark.unit
def test_profile_update_all_optional():
    """Test ProfileUpdate model where all fields are optional"""
    from services.core.models import ProfileUpdate
    
    # Empty update should be valid
    profile = ProfileUpdate()
    assert profile.age_range is None
    assert profile.bio is None
    assert profile.anonymous_handle is None
    
    # Partial update should work
    profile = ProfileUpdate(bio="New bio", age_range="36-45")
    assert profile.bio == "New bio"
    assert profile.age_range == "36-45"
    assert profile.primary_language is None


@pytest.mark.unit
def test_profile_update_invalid_types():
    """Test ProfileUpdate validation with invalid data types"""
    from services.core.models import ProfileUpdate
    
    # secondary_languages should be a list, not a string
    with pytest.raises(ValidationError):
        ProfileUpdate(secondary_languages="en")
    
    # interests should be a list, not a string
    with pytest.raises(ValidationError):
        ProfileUpdate(interests="music")


@pytest.mark.unit
def test_profile_full_model():
    """Test full Profile model with all fields"""
    from services.core.models import Profile
    
    now = datetime.now()
    
    data = {
        "clerk_id": "user_123",
        "anonymous_handle": "alice",
        "fingerprint": ["fp_1", "fp_2"],
        "age_range": "18-25",
        "primary_language": "en",
        "secondary_languages": ["fr"],
        "time_zone": "UTC",
        "country_code": "US",
        "bio": "Test bio",
        "interests": ["coding"],
        "created_at": now,
        "updated_at": now,
        "last_active": None
    }
    
    profile = Profile(**data)
    assert profile.clerk_id == "user_123"
    assert profile.anonymous_handle == "alice"
    assert len(profile.fingerprint) == 2
    assert profile.created_at == now
    assert profile.updated_at == now
    assert profile.last_active is None


@pytest.mark.unit
def test_profile_base_defaults():
    """Test ProfileBase default values"""
    from services.core.models import ProfileBase
    
    profile = ProfileBase()
    assert profile.age_range is None
    assert profile.primary_language is None
    assert profile.secondary_languages == []
    assert profile.time_zone is None
    assert profile.country_code is None
    assert profile.bio is None
    assert profile.interests == []


@pytest.mark.unit
def test_profile_create_dict_conversion():
    """Test ProfileCreate model_dump() method for database insertion"""
    from services.core.models import ProfileCreate
    
    profile = ProfileCreate(
        clerk_id="user_123",
        anonymous_handle="alice",
        fingerprint="fp_abc",
        bio="Hello"
    )
    
    profile_dict = profile.model_dump()
    assert profile_dict["clerk_id"] == "user_123"
    assert profile_dict["anonymous_handle"] == "alice"
    assert profile_dict["fingerprint"] == "fp_abc"
    assert profile_dict["bio"] == "Hello"
    assert "secondary_languages" in profile_dict
    assert "interests" in profile_dict


@pytest.mark.unit
def test_profile_update_exclude_unset():
    """Test ProfileUpdate with exclude_unset to only update provided fields"""
    from services.core.models import ProfileUpdate
    
    # Only bio is provided
    profile = ProfileUpdate(bio="Updated bio")
    
    # Using model_dump(exclude_unset=True) should only include bio
    update_dict = profile.model_dump(exclude_unset=True)
    assert "bio" in update_dict
    assert update_dict["bio"] == "Updated bio"
    
    # Fields that weren't set should not be in the dict
    assert "age_range" not in update_dict
    assert "primary_language" not in update_dict
    assert "anonymous_handle" not in update_dict

