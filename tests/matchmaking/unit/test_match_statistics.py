"""Unit tests for match statistics and tracking"""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
from services.matchmaking.main import (
    get_daily_match_stats,
    get_previous_matches
)


@pytest.mark.unit
def test_get_daily_match_stats_no_matches():
    """Test daily stats when user has no matches today"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.gte.return_value.execute.return_value.data = []
    
    with patch('services.matchmaking.main.supabase', mock_supabase), \
         patch('services.matchmaking.main.datetime') as mock_datetime:
        
        mock_datetime.now.return_value.date.return_value.isoformat.return_value = "2023-01-01"
        mock_datetime.now.return_value.replace.return_value.isoformat.return_value = "2023-01-02T00:00:00"
        
        result = get_daily_match_stats("user1")
        
        assert result["matches_used"] == 0
        assert result["matches_remaining"] == 5
        assert result["total_daily_limit"] == 5


@pytest.mark.unit
def test_get_daily_match_stats_one_match():
    """Test daily stats with one match"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.gte.return_value.execute.return_value.data = [
        {"user_1_id": "user1", "user_2_id": "user2"}
    ]
    
    with patch('services.matchmaking.main.supabase', mock_supabase), \
         patch('services.matchmaking.main.datetime') as mock_datetime:
        
        mock_datetime.now.return_value.date.return_value.isoformat.return_value = "2023-01-01"
        mock_datetime.now.return_value.replace.return_value.isoformat.return_value = "2023-01-02T00:00:00"
        
        result = get_daily_match_stats("user1")
        
        assert result["matches_used"] == 1
        assert result["matches_remaining"] == 4
        assert result["total_daily_limit"] == 5


@pytest.mark.unit
def test_get_daily_match_stats_limit_reached():
    """Test daily stats when daily limit is reached"""
    mock_supabase = Mock()
    mock_data = [
        {"user_1_id": "user1", "user_2_id": f"user{i}"}
        for i in range(2, 7)  # 5 matches
    ]
    mock_supabase.table.return_value.select.return_value.or_.return_value.gte.return_value.execute.return_value.data = mock_data
    
    with patch('services.matchmaking.main.supabase', mock_supabase), \
         patch('services.matchmaking.main.datetime') as mock_datetime:
        
        mock_datetime.now.return_value.date.return_value.isoformat.return_value = "2023-01-01"
        mock_datetime.now.return_value.replace.return_value.isoformat.return_value = "2023-01-02T00:00:00"
        
        result = get_daily_match_stats("user1")
        
        assert result["matches_used"] == 5
        assert result["matches_remaining"] == 0
        assert result["total_daily_limit"] == 5


@pytest.mark.unit
def test_get_daily_match_stats_over_limit():
    """Test daily stats when matches exceed limit (edge case)"""
    mock_supabase = Mock()
    mock_data = [
        {"user_1_id": "user1", "user_2_id": f"user{i}"}
        for i in range(2, 9)  # 7 matches
    ]
    mock_supabase.table.return_value.select.return_value.or_.return_value.gte.return_value.execute.return_value.data = mock_data
    
    with patch('services.matchmaking.main.supabase', mock_supabase), \
         patch('services.matchmaking.main.datetime') as mock_datetime:
        
        mock_datetime.now.return_value.date.return_value.isoformat.return_value = "2023-01-01"
        mock_datetime.now.return_value.replace.return_value.isoformat.return_value = "2023-01-02T00:00:00"
        
        result = get_daily_match_stats("user1")
        
        assert result["matches_used"] == 7
        assert result["matches_remaining"] == 0  # Should be 0, not negative
        assert result["total_daily_limit"] == 5


@pytest.mark.unit
def test_get_daily_match_stats_as_user_1():
    """Test daily stats when user is user_1_id"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.gte.return_value.execute.return_value.data = [
        {"user_1_id": "user1", "user_2_id": "user2"},
        {"user_1_id": "user1", "user_2_id": "user3"}
    ]
    
    with patch('services.matchmaking.main.supabase', mock_supabase), \
         patch('services.matchmaking.main.datetime') as mock_datetime:
        
        mock_datetime.now.return_value.date.return_value.isoformat.return_value = "2023-01-01"
        mock_datetime.now.return_value.replace.return_value.isoformat.return_value = "2023-01-02T00:00:00"
        
        result = get_daily_match_stats("user1")
        
        assert result["matches_used"] == 2


@pytest.mark.unit
def test_get_daily_match_stats_as_user_2():
    """Test daily stats when user is user_2_id"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.gte.return_value.execute.return_value.data = [
        {"user_1_id": "user2", "user_2_id": "user1"},
        {"user_1_id": "user3", "user_2_id": "user1"}
    ]
    
    with patch('services.matchmaking.main.supabase', mock_supabase), \
         patch('services.matchmaking.main.datetime') as mock_datetime:
        
        mock_datetime.now.return_value.date.return_value.isoformat.return_value = "2023-01-01"
        mock_datetime.now.return_value.replace.return_value.isoformat.return_value = "2023-01-02T00:00:00"
        
        result = get_daily_match_stats("user1")
        
        assert result["matches_used"] == 2


@pytest.mark.unit
def test_get_daily_match_stats_mixed_positions():
    """Test daily stats when user appears in both positions"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.gte.return_value.execute.return_value.data = [
        {"user_1_id": "user1", "user_2_id": "user2"},
        {"user_1_id": "user3", "user_2_id": "user1"},
        {"user_1_id": "user1", "user_2_id": "user4"}
    ]
    
    with patch('services.matchmaking.main.supabase', mock_supabase), \
         patch('services.matchmaking.main.datetime') as mock_datetime:
        
        mock_datetime.now.return_value.date.return_value.isoformat.return_value = "2023-01-01"
        mock_datetime.now.return_value.replace.return_value.isoformat.return_value = "2023-01-02T00:00:00"
        
        result = get_daily_match_stats("user1")
        
        assert result["matches_used"] == 3


@pytest.mark.unit
def test_get_daily_match_stats_reset_time():
    """Test that reset time is set correctly"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.gte.return_value.execute.return_value.data = []
    
    with patch('services.matchmaking.main.supabase', mock_supabase), \
         patch('services.matchmaking.main.datetime') as mock_datetime:
        
        # Create a proper mock datetime object
        from datetime import datetime as real_datetime
        mock_now = Mock()
        mock_now.date.return_value.isoformat.return_value = "2023-01-01"
        
        # Mock the replace and timedelta operations
        mock_midnight = Mock()
        mock_tomorrow = Mock()
        mock_tomorrow.isoformat.return_value = "2023-01-02T00:00:00"
        mock_midnight.__add__ = Mock(return_value=mock_tomorrow)
        mock_now.replace.return_value = mock_midnight
        
        mock_datetime.now.return_value = mock_now
        
        result = get_daily_match_stats("user1")
        
        assert "reset_time" in result


@pytest.mark.unit
def test_get_previous_matches_no_matches():
    """Test getting previous matches when user has none"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.execute.return_value.data = []
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = get_previous_matches("user1")
        
        assert result == []


@pytest.mark.unit
def test_get_previous_matches_as_user_1():
    """Test getting previous matches when user is user_1_id"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.execute.return_value.data = [
        {"user_1_id": "user1", "user_2_id": "user2"},
        {"user_1_id": "user1", "user_2_id": "user3"}
    ]
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = get_previous_matches("user1")
        
        assert len(result) == 2
        assert "user2" in result
        assert "user3" in result


@pytest.mark.unit
def test_get_previous_matches_as_user_2():
    """Test getting previous matches when user is user_2_id"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.execute.return_value.data = [
        {"user_1_id": "user2", "user_2_id": "user1"},
        {"user_1_id": "user3", "user_2_id": "user1"}
    ]
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = get_previous_matches("user1")
        
        assert len(result) == 2
        assert "user2" in result
        assert "user3" in result


@pytest.mark.unit
def test_get_previous_matches_mixed_positions():
    """Test getting previous matches when user appears in both positions"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.execute.return_value.data = [
        {"user_1_id": "user1", "user_2_id": "user2"},
        {"user_1_id": "user3", "user_2_id": "user1"},
        {"user_1_id": "user1", "user_2_id": "user4"},
        {"user_1_id": "user5", "user_2_id": "user1"}
    ]
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = get_previous_matches("user1")
        
        assert len(result) == 4
        assert "user2" in result
        assert "user3" in result
        assert "user4" in result
        assert "user5" in result


@pytest.mark.unit
def test_get_previous_matches_none_data():
    """Test getting previous matches when data is None"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.execute.return_value.data = None
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = get_previous_matches("user1")
        
        assert result == []


@pytest.mark.unit
def test_get_previous_matches_single_match():
    """Test getting previous matches with single match"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.execute.return_value.data = [
        {"user_1_id": "user1", "user_2_id": "user2"}
    ]
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = get_previous_matches("user1")
        
        assert len(result) == 1
        assert result[0] == "user2"


@pytest.mark.unit
def test_get_previous_matches_large_dataset():
    """Test getting previous matches with many matches"""
    mock_supabase = Mock()
    mock_data = [
        {"user_1_id": "user1", "user_2_id": f"user{i}"}
        for i in range(2, 52)  # 50 matches
    ]
    mock_supabase.table.return_value.select.return_value.or_.return_value.execute.return_value.data = mock_data
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = get_previous_matches("user1")
        
        assert len(result) == 50


@pytest.mark.unit
def test_get_previous_matches_duplicate_detection():
    """Test that duplicate matches are handled"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.or_.return_value.execute.return_value.data = [
        {"user_1_id": "user1", "user_2_id": "user2"},
        {"user_1_id": "user1", "user_2_id": "user2"}  # Duplicate
    ]
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = get_previous_matches("user1")
        
        # Should return both even if duplicates (database should prevent this)
        assert len(result) == 2

