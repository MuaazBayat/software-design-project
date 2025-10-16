"""Unit tests for pass tracking and reset logic"""
import pytest
from unittest.mock import Mock, patch
from services.matchmaking.main import (
    get_passed_users,
    record_pass,
    should_reset_passed_users
)


@pytest.mark.unit
def test_get_passed_users_with_results():
    """Test getting passed users when data exists"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"passed_user_id": "user1"},
        {"passed_user_id": "user2"},
        {"passed_user_id": "user3"}
    ]
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = get_passed_users("test_user")
        
        assert len(result) == 3
        assert "user1" in result
        assert "user2" in result
        assert "user3" in result


@pytest.mark.unit
def test_get_passed_users_empty():
    """Test getting passed users when no data exists"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = get_passed_users("test_user")
        
        assert result == []


@pytest.mark.unit
def test_get_passed_users_none_data():
    """Test getting passed users when data is None"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = None
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = get_passed_users("test_user")
        
        assert result == []


@pytest.mark.unit
def test_record_pass_new_pass():
    """Test recording a new pass"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    
    with patch('services.matchmaking.main.supabase', mock_supabase), \
         patch('services.matchmaking.main.datetime') as mock_datetime:
        
        mock_datetime.now.return_value.isoformat.return_value = "2023-01-01T00:00:00"
        
        record_pass("user1", "user2")
        
        # Should call insert for new pass
        mock_supabase.table.return_value.insert.assert_called_once()


@pytest.mark.unit
def test_record_pass_existing_pass():
    """Test recording a pass that already exists"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"user_id": "user1", "passed_user_id": "user2"}
    ]
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        record_pass("user1", "user2")
        
        # Should not call insert for existing pass
        mock_supabase.table.return_value.insert.assert_not_called()


@pytest.mark.unit
def test_record_pass_different_users():
    """Test recording passes for different user combinations"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    
    with patch('services.matchmaking.main.supabase', mock_supabase), \
         patch('services.matchmaking.main.datetime') as mock_datetime:
        
        mock_datetime.now.return_value.isoformat.return_value = "2023-01-01T00:00:00"
        
        # Record pass from user1 to user2
        record_pass("user1", "user2")
        
        # Record pass from user2 to user1 (different direction)
        record_pass("user2", "user1")
        
        # Both should be recorded
        assert mock_supabase.table.return_value.insert.call_count == 2


@pytest.mark.unit
def test_should_reset_passed_users_all_passed():
    """Test reset logic when all available users have been passed"""
    available_profiles = [
        {"user_id": "user1"},
        {"user_id": "user2"},
        {"user_id": "user3"}
    ]
    
    with patch('services.matchmaking.main.get_passed_users', return_value=["user1", "user2", "user3"]):
        result = should_reset_passed_users("test_user", available_profiles)
        
        assert result is True


@pytest.mark.unit
def test_should_reset_passed_users_some_remaining():
    """Test reset logic when some users haven't been passed"""
    available_profiles = [
        {"user_id": "user1"},
        {"user_id": "user2"},
        {"user_id": "user3"}
    ]
    
    with patch('services.matchmaking.main.get_passed_users', return_value=["user1", "user2"]):
        result = should_reset_passed_users("test_user", available_profiles)
        
        assert result is False


@pytest.mark.unit
def test_should_reset_passed_users_none_passed():
    """Test reset logic when no users have been passed"""
    available_profiles = [
        {"user_id": "user1"},
        {"user_id": "user2"}
    ]
    
    with patch('services.matchmaking.main.get_passed_users', return_value=[]):
        result = should_reset_passed_users("test_user", available_profiles)
        
        assert result is False


@pytest.mark.unit
def test_should_reset_passed_users_empty_available():
    """Test reset logic with empty available profiles"""
    with patch('services.matchmaking.main.get_passed_users', return_value=["user1"]):
        result = should_reset_passed_users("test_user", [])
        
        assert result is False


@pytest.mark.unit
def test_should_reset_passed_users_more_passed_than_available():
    """Test reset logic when more users are passed than available"""
    available_profiles = [
        {"user_id": "user1"}
    ]
    
    with patch('services.matchmaking.main.get_passed_users', return_value=["user1", "user2", "user3"]):
        result = should_reset_passed_users("test_user", available_profiles)
        
        # All available users are in passed list
        assert result is True


@pytest.mark.unit
def test_should_reset_passed_users_single_profile():
    """Test reset logic with single available profile"""
    available_profiles = [{"user_id": "user1"}]
    
    with patch('services.matchmaking.main.get_passed_users', return_value=["user1"]):
        result = should_reset_passed_users("test_user", available_profiles)
        
        assert result is True


@pytest.mark.unit
def test_should_reset_passed_users_single_profile_not_passed():
    """Test reset logic with single profile not yet passed"""
    available_profiles = [{"user_id": "user1"}]
    
    with patch('services.matchmaking.main.get_passed_users', return_value=[]):
        result = should_reset_passed_users("test_user", available_profiles)
        
        assert result is False


@pytest.mark.unit
def test_should_reset_passed_users_partial_overlap():
    """Test reset logic with partial overlap between passed and available"""
    available_profiles = [
        {"user_id": "user1"},
        {"user_id": "user2"},
        {"user_id": "user3"},
        {"user_id": "user4"}
    ]
    
    # Passed users include some not in available
    with patch('services.matchmaking.main.get_passed_users', 
               return_value=["user1", "user2", "user5", "user6"]):
        result = should_reset_passed_users("test_user", available_profiles)
        
        # user3 and user4 are still available
        assert result is False


@pytest.mark.unit
def test_should_reset_passed_users_exact_match():
    """Test reset logic when passed users exactly match available"""
    available_profiles = [
        {"user_id": "user1"},
        {"user_id": "user2"}
    ]
    
    with patch('services.matchmaking.main.get_passed_users', return_value=["user1", "user2"]):
        result = should_reset_passed_users("test_user", available_profiles)
        
        assert result is True


@pytest.mark.unit
def test_should_reset_passed_users_large_dataset():
    """Test reset logic with large number of profiles"""
    available_profiles = [{"user_id": f"user{i}"} for i in range(100)]
    passed_users = [f"user{i}" for i in range(100)]
    
    with patch('services.matchmaking.main.get_passed_users', return_value=passed_users):
        result = should_reset_passed_users("test_user", available_profiles)
        
        assert result is True


@pytest.mark.unit
def test_should_reset_passed_users_large_dataset_one_remaining():
    """Test reset logic with large dataset and one remaining user"""
    available_profiles = [{"user_id": f"user{i}"} for i in range(100)]
    passed_users = [f"user{i}" for i in range(99)]  # All except user99
    
    with patch('services.matchmaking.main.get_passed_users', return_value=passed_users):
        result = should_reset_passed_users("test_user", available_profiles)
        
        assert result is False

