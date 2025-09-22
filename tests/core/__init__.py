from services.core.main import add
from services.core.models import ProfileCreate, ProfileUpdate, Profile
def test_add_function():
    """
    This test checks if the add function works correctly.
    """
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
    assert add(0, 0) == 0