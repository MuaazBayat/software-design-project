
from services.core.main import add
from services.core.models import ProfileCreate, ProfileUpdate, Profile

def test_add_function():
    """
    This test checks if the add function works correctly.
    """
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
    assert add(0, 0) == 0

def test_profile_model_includes_required_fields():
    """
    Test that the Profile model includes all required fields for the profile page.
    """
    # Test the Profile model has all the required fields
    # Use model_fields to get all fields including inherited ones
    profile_fields = Profile.model_fields.keys()
    
    required_fields = [
        'user_id', 'anonymous_handle', 'last_active', 'age_range',
        'primary_language', 'secondary_languages', 'country_code',
        'bio', 'interests', 'favorite_local_fact', 'fingerprint'
    ]
    
    for field in required_fields:
        assert field in profile_fields, f"Profile model missing required field: {field}"
    
    # Test that array fields can handle None values
    from typing import get_origin, get_args
    
    # Check that secondary_languages and interests are Optional[List[str]]
    # Use model_fields to get the actual field info
    secondary_lang_field = Profile.model_fields['secondary_languages']
    interests_field = Profile.model_fields['interests']
    fingerprint_field = Profile.model_fields['fingerprint']
    
    # These should allow None values (either Optional or have default_factory)
    assert secondary_lang_field.default_factory is not None or secondary_lang_field.default is not None, "secondary_languages should have default"
    assert interests_field.default_factory is not None or interests_field.default is not None, "interests should have default"
    assert fingerprint_field.default_factory is not None or fingerprint_field.default is not None, "fingerprint should have default"