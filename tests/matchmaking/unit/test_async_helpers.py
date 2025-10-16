"""Unit tests for async helper functions in matchmaking API"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi import HTTPException
from services.matchmaking.main import get_user_by_clerk_id, get_user_by_id

@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_user_by_clerk_id_success():
    """Test successful retrieval of user by clerk ID"""
    mock_user = {
        "user_id": "user_123",
        "clerk_id": "clerk_123",
        "anonymous_handle": "test_user",
        "bio": "Test bio"
    }
    
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user]
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = await get_user_by_clerk_id("clerk_123")
        assert result == mock_user
        assert result["clerk_id"] == "clerk_123"
        assert result["user_id"] == "user_123"

@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_user_by_clerk_id_not_found():
    """Test retrieval of user by clerk ID when user doesn't exist"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        with pytest.raises(HTTPException) as exc_info:
            await get_user_by_clerk_id("nonexistent_clerk_id")
        
        assert exc_info.value.status_code == 404
        assert "User not found" in str(exc_info.value.detail)

@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_user_by_clerk_id_empty_string():
    """Test retrieval with empty clerk ID"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        with pytest.raises(HTTPException) as exc_info:
            await get_user_by_clerk_id("")
        
        assert exc_info.value.status_code == 404

@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_user_by_id_success():
    """Test successful retrieval of user by user ID"""
    mock_user = {
        "user_id": "user_123",
        "clerk_id": "clerk_123",
        "anonymous_handle": "test_user",
        "bio": "Test bio"
    }
    
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user]
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = await get_user_by_id("user_123")
        assert result == mock_user
        assert result["user_id"] == "user_123"

@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_user_by_id_not_found():
    """Test retrieval of user by user ID when user doesn't exist"""
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        with pytest.raises(HTTPException) as exc_info:
            await get_user_by_id("nonexistent_user_id")
        
        assert exc_info.value.status_code == 404
        assert "User not found" in str(exc_info.value.detail)

@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_user_by_id_multiple_results():
    """Test retrieval when multiple users are returned (should take first)"""
    mock_users = [
        {"user_id": "user_123", "clerk_id": "clerk_123"},
        {"user_id": "user_124", "clerk_id": "clerk_124"}
    ]
    
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = mock_users
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = await get_user_by_id("user_123")
        assert result == mock_users[0]

@pytest.mark.unit
@pytest.mark.asyncio
async def test_get_user_by_clerk_id_with_complete_profile():
    """Test retrieval of user with complete profile data"""
    mock_user = {
        "user_id": "user_123",
        "clerk_id": "clerk_123",
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
        "cultural_completeness_score": 0.9
    }
    
    mock_supabase = Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user]
    
    with patch('services.matchmaking.main.supabase', mock_supabase):
        result = await get_user_by_clerk_id("clerk_123")
        assert result["user_id"] == "user_123"
        assert len(result["secondary_languages"]) == 2
        assert len(result["interests"]) == 3
        assert result["cultural_completeness_score"] == 0.9

