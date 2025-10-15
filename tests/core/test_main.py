
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
    profile_fields = Profile.__annotations__.keys()
    
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
    secondary_lang_annotation = Profile.__annotations__['secondary_languages']
    interests_annotation = Profile.__annotations__['interests']
    fingerprint_annotation = Profile.__annotations__['fingerprint']
    
    # These should be Optional (Union with None)
    assert get_origin(secondary_lang_annotation) is type(None) or str(secondary_lang_annotation).startswith('typing.Union'), "secondary_languages should be Optional"
    assert get_origin(interests_annotation) is type(None) or str(interests_annotation).startswith('typing.Union'), "interests should be Optional"
    assert get_origin(fingerprint_annotation) is type(None) or str(fingerprint_annotation).startswith('typing.Union'), "fingerprint should be Optional"