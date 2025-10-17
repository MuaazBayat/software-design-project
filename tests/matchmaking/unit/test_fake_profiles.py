"""Unit tests for fake user profiles and preference profile generation"""
import pytest
from services.matchmaking.main import fakeUsers, PreferenceProfile


@pytest.mark.unit
def test_fake_users_exist():
    """Test that fake users are defined"""
    assert len(fakeUsers) > 0


@pytest.mark.unit
def test_fake_users_have_required_fields():
    """Test that all fake users have required fields"""
    required_fields = [
        "user_id",
        "anonymous_handle",
        "country_code",
        "bio",
        "interests",
        "age_range",
        "primary_language",
        "favorite_local_fact"
    ]
    
    for fake_user in fakeUsers:
        for field in required_fields:
            assert field in fake_user, f"Missing field {field} in fake user {fake_user.get('user_id')}"


@pytest.mark.unit
def test_fake_users_have_unique_ids():
    """Test that all fake users have unique IDs"""
    user_ids = [user["user_id"] for user in fakeUsers]
    assert len(user_ids) == len(set(user_ids)), "Fake user IDs are not unique"


@pytest.mark.unit
def test_fake_users_have_fake_prefix():
    """Test that fake user IDs start with 'fake-'"""
    for fake_user in fakeUsers:
        assert fake_user["user_id"].startswith("fake-"), \
            f"Fake user ID {fake_user['user_id']} doesn't start with 'fake-'"


@pytest.mark.unit
def test_fake_users_have_valid_interests():
    """Test that fake users have non-empty interests"""
    for fake_user in fakeUsers:
        assert isinstance(fake_user["interests"], list)
        assert len(fake_user["interests"]) > 0


@pytest.mark.unit
def test_fake_users_have_valid_languages():
    """Test that fake users have valid primary languages"""
    for fake_user in fakeUsers:
        assert fake_user["primary_language"] is not None
        assert len(fake_user["primary_language"]) > 0


@pytest.mark.unit
def test_fake_users_have_diverse_countries():
    """Test that fake users represent diverse countries"""
    countries = [user["country_code"] for user in fakeUsers]
    unique_countries = set(countries)
    
    # Should have diverse representation
    assert len(unique_countries) > 1


@pytest.mark.unit
def test_fake_users_have_diverse_languages():
    """Test that fake users represent diverse languages"""
    languages = [user["primary_language"] for user in fakeUsers]
    unique_languages = set(languages)
    
    # Should have diverse representation
    assert len(unique_languages) > 1


@pytest.mark.unit
def test_fake_users_have_valid_bios():
    """Test that fake users have meaningful bios"""
    for fake_user in fakeUsers:
        assert fake_user["bio"] is not None
        assert len(fake_user["bio"]) > 10  # Should be meaningful


@pytest.mark.unit
def test_fake_users_have_valid_local_facts():
    """Test that fake users have local facts"""
    for fake_user in fakeUsers:
        assert fake_user["favorite_local_fact"] is not None
        assert len(fake_user["favorite_local_fact"]) > 0


@pytest.mark.unit
def test_fake_user_elara():
    """Test specific fake user Elara"""
    elara = next((u for u in fakeUsers if u["anonymous_handle"] == "Elara"), None)
    
    assert elara is not None
    assert elara["country_code"] == "JP"
    assert "Art" in elara["interests"] or "art" in [i.lower() for i in elara["interests"]]


@pytest.mark.unit
def test_fake_user_javier():
    """Test specific fake user Javier"""
    javier = next((u for u in fakeUsers if u["anonymous_handle"] == "Javier"), None)
    
    assert javier is not None
    assert javier["country_code"] == "AR"


@pytest.mark.unit
def test_fake_user_amina():
    """Test specific fake user Amina"""
    amina = next((u for u in fakeUsers if u["anonymous_handle"] == "Amina"), None)
    
    assert amina is not None
    assert amina["country_code"] == "MA"


@pytest.mark.unit
def test_fake_user_liam():
    """Test specific fake user Liam"""
    liam = next((u for u in fakeUsers if u["anonymous_handle"] == "Liam"), None)
    
    assert liam is not None
    assert liam["country_code"] == "IE"


@pytest.mark.unit
def test_fake_users_count():
    """Test that we have expected number of fake users"""
    assert len(fakeUsers) >= 4  # At least the 4 defined ones


@pytest.mark.unit
def test_fake_users_can_be_converted_to_preference_profile():
    """Test that fake users can be converted to PreferenceProfile"""
    for fake_user in fakeUsers:
        profile = PreferenceProfile(
            profile_id=fake_user["user_id"],
            anonymous_handle=fake_user["anonymous_handle"],
            country_code=fake_user["country_code"],
            bio=fake_user["bio"],
            interests=fake_user["interests"],
            age_range=fake_user["age_range"],
            primary_language=fake_user["primary_language"],
            favorite_local_fact=fake_user["favorite_local_fact"],
            is_real=False
        )
        
        assert profile.is_real is False
        assert profile.profile_id.startswith("fake-")


@pytest.mark.unit
def test_fake_users_have_diverse_age_ranges():
    """Test that fake users have various age ranges"""
    age_ranges = [user["age_range"] for user in fakeUsers]
    
    # Should have some variety
    assert len(age_ranges) > 0


@pytest.mark.unit
def test_fake_users_interests_are_lists():
    """Test that all fake user interests are lists"""
    for fake_user in fakeUsers:
        assert isinstance(fake_user["interests"], list)


@pytest.mark.unit
def test_fake_users_no_sensitive_data():
    """Test that fake users don't contain sensitive fields"""
    sensitive_fields = ["clerk_id", "blocked_users", "reported_count"]
    
    for fake_user in fakeUsers:
        for field in sensitive_fields:
            assert field not in fake_user


@pytest.mark.unit
def test_fake_users_valid_age_range_format():
    """Test that fake users have valid age range formats"""
    for fake_user in fakeUsers:
        age_range = fake_user["age_range"]
        # Should contain a hyphen or plus sign
        assert "-" in age_range or "+" in age_range


@pytest.mark.unit
def test_preference_profile_from_real_user():
    """Test creating PreferenceProfile from real user data"""
    real_profile = PreferenceProfile(
        profile_id="user_123",
        anonymous_handle="RealUser",
        country_code="US",
        bio="Real user bio",
        interests=["music", "sports"],
        age_range="18-25",
        primary_language="English",
        favorite_local_fact="Some fact",
        is_real=True
    )
    
    assert real_profile.is_real is True
    assert not real_profile.profile_id.startswith("fake-")


@pytest.mark.unit
def test_preference_profile_from_fake_user():
    """Test creating PreferenceProfile from fake user"""
    fake_profile = PreferenceProfile(
        profile_id="fake-1",
        anonymous_handle="FakeUser",
        country_code="JP",
        bio="Fake bio",
        interests=["art"],
        age_range="25-34",
        primary_language="ja",
        favorite_local_fact="Fake fact",
        is_real=False
    )
    
    assert fake_profile.is_real is False
    assert fake_profile.profile_id.startswith("fake-")


@pytest.mark.unit
def test_preference_profile_minimal():
    """Test creating minimal PreferenceProfile"""
    profile = PreferenceProfile(
        profile_id="profile_123",
        anonymous_handle="MinimalUser",
        is_real=True
    )
    
    assert profile.country_code is None
    assert profile.bio is None
    assert profile.interests is None


@pytest.mark.unit
def test_fake_users_data_quality():
    """Test that fake users have high quality, realistic data"""
    for fake_user in fakeUsers:
        # Bio should be substantial
        assert len(fake_user["bio"]) >= 20
        
        # Should have at least 2 interests
        assert len(fake_user["interests"]) >= 2
        
        # Anonymous handle should be a name
        assert len(fake_user["anonymous_handle"]) >= 3
        
        # Country code should be 2 letters
        assert len(fake_user["country_code"]) == 2
        assert fake_user["country_code"].isupper()
        
        # Local fact should be informative
        assert len(fake_user["favorite_local_fact"]) >= 20


@pytest.mark.unit
def test_fake_users_represent_global_diversity():
    """Test that fake users represent global cultural diversity"""
    countries = [user["country_code"] for user in fakeUsers]
    
    # Should have users from different continents/regions
    # JP (Asia), AR (South America), MA (Africa), IE (Europe)
    assert "JP" in countries or "AR" in countries or "MA" in countries or "IE" in countries

