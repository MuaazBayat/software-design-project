"""
Unit tests for matchmaking API endpoints
Tests the /suggestions and /matches/find endpoints with various scenarios
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime
from fastapi import HTTPException
from fastapi.testclient import TestClient
from services.matchmaking.main import (
    app,
    MatchDecisionRequest,
    MatchingPreferences,
    PreferenceSelection,
    fakeUsers
)

# Create test client
client = TestClient(app)


@pytest.fixture
def mock_supabase():
    """Mock supabase client"""
    with patch('services.matchmaking.main.supabase') as mock:
        yield mock


@pytest.fixture
def mock_user():
    """Sample user for testing"""
    return {
        'user_id': 'user-123',
        'clerk_id': 'clerk-123',
        'anonymous_handle': 'TestUser',
        'bio': 'Test bio',
        'age_range': '25-34',
        'primary_language': 'en',
        'secondary_languages': ['es', 'fr'],
        'time_zone': 'UTC+00:00',
        'country_code': 'US',
        'interests': ['hiking', 'reading'],
        'preferred_correspondence_type': 'either',
        'account_status': 'active',
        'cultural_completeness_score': 0.8
    }


@pytest.fixture
def mock_profiles():
    """Sample profiles for testing"""
    return [
        {
            'user_id': 'user-456',
            'anonymous_handle': 'Profile1',
            'primary_language': 'en',
            'secondary_languages': ['es'],
            'age_range': '25-34',
            'country_code': 'CA',
            'interests': ['hiking', 'music'],
            'time_zone': 'UTC-05:00',
            'account_status': 'active',
            'preferred_correspondence_type': 'long-term',
            'cultural_completeness_score': 0.7
        },
        {
            'user_id': 'user-789',
            'anonymous_handle': 'Profile2',
            'primary_language': 'es',
            'secondary_languages': ['en'],
            'age_range': '35-44',
            'country_code': 'MX',
            'interests': ['reading', 'travel'],
            'time_zone': 'UTC-06:00',
            'account_status': 'active',
            'preferred_correspondence_type': 'one-time',
            'cultural_completeness_score': 0.9
        }
    ]


# Test /suggestions endpoint
@pytest.mark.asyncio
async def test_get_suggestions_success(mock_supabase, mock_user, mock_profiles):
    """Test successful suggestions retrieval"""
    # Mock async functions
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_previous_matches', return_value=[]):
            with patch('services.matchmaking.main.get_passed_users', return_value=[]):
                with patch('services.matchmaking.main.should_reset_passed_users', return_value=False):
                    with patch('services.matchmaking.main.verify_token', return_value='clerk-123'):
                        # Mock supabase query
                        mock_execute = Mock()
                        mock_execute.data = mock_profiles
                        mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
                        
                        # Call endpoint via test client
                        response = client.get(
                            "/profiles/suggestions/clerk-123",
                            params={'limit': 10, 'languages': 'en,es', 'age_ranges': '25-34', 'interests': 'hiking', 'match_type': 'either'},
                            headers={'Authorization': 'Bearer test-token'}
                        )
                        
                        assert response.status_code == 200
                        data = response.json()
                        assert len(data) > 0
                        assert data[0]['user_id'] in ['user-456', 'user-789']


@pytest.mark.asyncio
async def test_get_suggestions_no_profiles_available(mock_supabase, mock_user):
    """Test suggestions when no profiles are available"""
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.verify_token', return_value='clerk-123'):
            # Mock empty profiles
            mock_execute = Mock()
            mock_execute.data = []
            mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
            
            response = client.get(
                "/profiles/suggestions/clerk-123",
                params={'limit': 10},
                headers={'Authorization': 'Bearer test-token'}
            )
            
            assert response.status_code == 404
            assert "No profiles available" in response.json()['detail']


@pytest.mark.asyncio
async def test_get_suggestions_all_matched(mock_supabase, mock_user, mock_profiles):
    """Test suggestions when all profiles are already matched"""
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_previous_matches', return_value=['user-456', 'user-789']):
            with patch('services.matchmaking.main.verify_token', return_value='clerk-123'):
                mock_execute = Mock()
                mock_execute.data = mock_profiles
                mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
                
                response = client.get(
                    "/profiles/suggestions/clerk-123",
                    params={'limit': 10},
                    headers={'Authorization': 'Bearer test-token'}
                )
                
                assert response.status_code == 404
                assert "No new profiles available" in response.json()['detail']


@pytest.mark.asyncio
async def test_get_suggestions_with_passed_users_reset(mock_supabase, mock_user, mock_profiles):
    """Test suggestions with passed users reset"""
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_previous_matches', return_value=[]):
            with patch('services.matchmaking.main.get_passed_users', return_value=['user-456']):
                with patch('services.matchmaking.main.should_reset_passed_users', return_value=True):
                    with patch('services.matchmaking.main.verify_token', return_value='clerk-123'):
                        # Mock supabase operations
                        mock_execute = Mock()
                        mock_execute.data = mock_profiles
                        mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
                        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = Mock()
                        
                        response = client.get(
                            "/profiles/suggestions/clerk-123",
                            params={'limit': 10},
                            headers={'Authorization': 'Bearer test-token'}
                        )
                        
                        assert response.status_code == 200
                        data = response.json()
                        assert len(data) > 0
                        # Verify delete was called for reset
                        mock_supabase.table.return_value.delete.return_value.eq.assert_called()


@pytest.mark.asyncio
async def test_get_suggestions_with_filters(mock_supabase, mock_user, mock_profiles):
    """Test suggestions with language and interest filters"""
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_previous_matches', return_value=[]):
            with patch('services.matchmaking.main.get_passed_users', return_value=[]):
                with patch('services.matchmaking.main.should_reset_passed_users', return_value=False):
                    with patch('services.matchmaking.main.verify_token', return_value='clerk-123'):
                        mock_execute = Mock()
                        mock_execute.data = mock_profiles
                        mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
                        
                        response = client.get(
                            "/profiles/suggestions/clerk-123",
                            params={'limit': 10, 'languages': 'en', 'interests': 'hiking,reading', 'age_ranges': '25-34,35-44', 'match_type': 'long-term'},
                            headers={'Authorization': 'Bearer test-token'}
                        )
                        
                        assert response.status_code == 200
                        data = response.json()
                        assert len(data) > 0


# Test /matches/find endpoint
@pytest.mark.asyncio
async def test_find_match_accept_success(mock_supabase, mock_user, mock_profiles):
    """Test successful match acceptance"""
    from services.matchmaking.main import find_match_with_decision
    
    match_request = MatchDecisionRequest(
        clerk_id='clerk-123',
        accept=True,
        suggested_user_id='user-456',
        preferences=MatchingPreferences(
            match_type='either',
            languages=['en'],
            exclude_previous=True
        )
    )
    
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_user_by_id', new=AsyncMock(return_value=mock_profiles[0])):
            with patch('services.matchmaking.main.get_daily_match_stats', return_value={'matches_remaining': 5}):
                # Mock insert
                mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock()
                
                result = await find_match_with_decision(
                    match_request=match_request,
                    token='valid-token'
                )
                
                assert result.penpal_profile.user_id == 'user-456'
                assert result.match_type is not None
                assert result.compatibility_score >= 0.0
                # Verify match was inserted
                mock_supabase.table.return_value.insert.assert_called()


@pytest.mark.asyncio
async def test_find_match_reject_records_pass(mock_supabase, mock_user, mock_profiles):
    """Test match rejection records pass"""
    from services.matchmaking.main import find_match_with_decision
    
    match_request = MatchDecisionRequest(
        clerk_id='clerk-123',
        accept=False,
        suggested_user_id='user-456',
        preferences=MatchingPreferences()
    )
    
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_user_by_id', new=AsyncMock(return_value=mock_profiles[0])):
            with patch('services.matchmaking.main.record_pass') as mock_record_pass:
                result = await find_match_with_decision(
                    match_request=match_request,
                    token='valid-token'
                )
                
                # Verify pass was recorded
                mock_record_pass.assert_called_once_with(mock_user['user_id'], 'user-456')
                assert result.penpal_profile.user_id == 'user-456'


@pytest.mark.asyncio
async def test_find_match_daily_limit_exceeded(mock_supabase, mock_user, mock_profiles):
    """Test match when daily limit is exceeded"""
    from services.matchmaking.main import find_match_with_decision
    
    match_request = MatchDecisionRequest(
        clerk_id='clerk-123',
        accept=True,
        suggested_user_id='user-456',
        preferences=MatchingPreferences()
    )
    
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_user_by_id', new=AsyncMock(return_value=mock_profiles[0])):
            with patch('services.matchmaking.main.get_daily_match_stats', return_value={'matches_remaining': 0}):
                with pytest.raises(HTTPException) as exc_info:
                    await find_match_with_decision(
                        match_request=match_request,
                        token='valid-token'
                    )
                
                assert exc_info.value.status_code == 400
                assert "Daily match limit exceeded" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_find_match_no_suggested_user(mock_supabase, mock_user, mock_profiles):
    """Test match without suggested user (uses matching logic)"""
    from services.matchmaking.main import find_match_with_decision
    
    match_request = MatchDecisionRequest(
        clerk_id='clerk-123',
        accept=True,
        suggested_user_id=None,
        preferences=MatchingPreferences(
            match_type='either',
            languages=['en']
        )
    )
    
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_daily_match_stats', return_value={'matches_remaining': 5}):
            with patch('services.matchmaking.main.get_previous_matches', return_value=[]):
                with patch('services.matchmaking.main.get_passed_users', return_value=[]):
                    with patch('services.matchmaking.main.should_reset_passed_users', return_value=False):
                        # Mock supabase query
                        mock_execute = Mock()
                        mock_execute.data = mock_profiles
                        mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
                        mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock()
                        
                        result = await find_match_with_decision(
                            match_request=match_request,
                            token='valid-token'
                        )
                        
                        assert result.penpal_profile.user_id in ['user-456', 'user-789']


@pytest.mark.asyncio
async def test_find_match_no_profiles_available(mock_supabase, mock_user):
    """Test match when no profiles are available"""
    from services.matchmaking.main import find_match_with_decision
    
    match_request = MatchDecisionRequest(
        clerk_id='clerk-123',
        accept=True,
        suggested_user_id=None,
        preferences=MatchingPreferences()
    )
    
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_daily_match_stats', return_value={'matches_remaining': 5}):
            # Mock empty profiles
            mock_execute = Mock()
            mock_execute.data = []
            mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
            
            with pytest.raises(HTTPException) as exc_info:
                await find_match_with_decision(
                    match_request=match_request,
                    token='valid-token'
                )
            
            assert exc_info.value.status_code == 404
            assert "No profiles available" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_find_match_with_timezone_filter(mock_supabase, mock_user, mock_profiles):
    """Test match with timezone filtering"""
    from services.matchmaking.main import find_match_with_decision
    
    match_request = MatchDecisionRequest(
        clerk_id='clerk-123',
        accept=True,
        suggested_user_id=None,
        preferences=MatchingPreferences(
            max_timezone_difference=3,
            exclude_previous=True
        )
    )
    
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_daily_match_stats', return_value={'matches_remaining': 5}):
            with patch('services.matchmaking.main.get_previous_matches', return_value=[]):
                with patch('services.matchmaking.main.get_passed_users', return_value=[]):
                    with patch('services.matchmaking.main.should_reset_passed_users', return_value=False):
                        with patch('services.matchmaking.main.filter_profiles_by_timezone', return_value=mock_profiles):
                            mock_execute = Mock()
                            mock_execute.data = mock_profiles
                            mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
                            mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock()
                            
                            result = await find_match_with_decision(
                                match_request=match_request,
                                token='valid-token'
                            )
                            
                            assert result.penpal_profile.user_id in ['user-456', 'user-789']


@pytest.mark.asyncio
async def test_find_match_with_preference_selection_real(mock_supabase, mock_user, mock_profiles):
    """Test match with real user preference selection"""
    from services.matchmaking.main import find_match_with_decision
    
    match_request = MatchDecisionRequest(
        clerk_id='clerk-123',
        accept=True,
        suggested_user_id=None,
        preferences=MatchingPreferences()
    )
    
    # Mock preference selection
    preference_selection = {
        'user_id': 'user-123',
        'preference_type': 'real',
        'selected_profile_id': 'user-999'
    }
    
    mock_pref_profile = {
        'user_id': 'user-999',
        'anonymous_handle': 'PreferredUser',
        'primary_language': 'en',
        'interests': ['hiking'],
        'age_range': '25-34',
        'country_code': 'US'
    }
    
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_user_by_id', new=AsyncMock(return_value=mock_pref_profile)):
            with patch('services.matchmaking.main.get_daily_match_stats', return_value={'matches_remaining': 5}):
                with patch('services.matchmaking.main.get_previous_matches', return_value=[]):
                    with patch('services.matchmaking.main.get_passed_users', return_value=[]):
                        with patch('services.matchmaking.main.should_reset_passed_users', return_value=False):
                            # Mock supabase for profiles and preference selection
                            mock_execute = Mock()
                            mock_execute.data = mock_profiles
                            mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
                            
                            mock_pref_execute = Mock()
                            mock_pref_execute.data = [preference_selection]
                            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_pref_execute
                            
                            mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock()
                            
                            result = await find_match_with_decision(
                                match_request=match_request,
                                token='valid-token'
                            )
                            
                            assert result.penpal_profile.user_id in ['user-456', 'user-789']


@pytest.mark.asyncio
async def test_find_match_with_preference_selection_fake(mock_supabase, mock_user, mock_profiles):
    """Test match with fake user preference selection"""
    from services.matchmaking.main import find_match_with_decision
    
    match_request = MatchDecisionRequest(
        clerk_id='clerk-123',
        accept=True,
        suggested_user_id=None,
        preferences=MatchingPreferences()
    )
    
    # Use a fake user from fakeUsers
    fake_user_id = fakeUsers[0]['user_id']
    preference_selection = {
        'user_id': 'user-123',
        'preference_type': 'fake',
        'selected_profile_id': fake_user_id
    }
    
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_daily_match_stats', return_value={'matches_remaining': 5}):
            with patch('services.matchmaking.main.get_previous_matches', return_value=[]):
                with patch('services.matchmaking.main.get_passed_users', return_value=[]):
                    with patch('services.matchmaking.main.should_reset_passed_users', return_value=False):
                        mock_execute = Mock()
                        mock_execute.data = mock_profiles
                        mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
                        
                        mock_pref_execute = Mock()
                        mock_pref_execute.data = [preference_selection]
                        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_pref_execute
                        
                        mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock()
                        
                        result = await find_match_with_decision(
                            match_request=match_request,
                            token='valid-token'
                        )
                        
                        assert result.penpal_profile.user_id in ['user-456', 'user-789']


@pytest.mark.asyncio
async def test_find_match_exclude_previous_false(mock_supabase, mock_user, mock_profiles):
    """Test match with exclude_previous set to False"""
    from services.matchmaking.main import find_match_with_decision
    
    match_request = MatchDecisionRequest(
        clerk_id='clerk-123',
        accept=True,
        suggested_user_id=None,
        preferences=MatchingPreferences(
            exclude_previous=False
        )
    )
    
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_daily_match_stats', return_value={'matches_remaining': 5}):
            with patch('services.matchmaking.main.get_passed_users', return_value=[]):
                with patch('services.matchmaking.main.should_reset_passed_users', return_value=False):
                    mock_execute = Mock()
                    mock_execute.data = mock_profiles
                    mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
                    mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock()
                    
                    result = await find_match_with_decision(
                        match_request=match_request,
                        token='valid-token'
                    )
                    
                    assert result.penpal_profile.user_id in ['user-456', 'user-789']


@pytest.mark.asyncio
async def test_find_match_suggested_user_not_found_fallback(mock_supabase, mock_user, mock_profiles):
    """Test match when suggested user doesn't exist (should fallback to matching logic)"""
    from services.matchmaking.main import find_match_with_decision
    
    match_request = MatchDecisionRequest(
        clerk_id='clerk-123',
        accept=True,
        suggested_user_id='non-existent-user',
        preferences=MatchingPreferences()
    )
    
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_user_by_id', new=AsyncMock(side_effect=HTTPException(404, "User not found"))):
            with patch('services.matchmaking.main.get_daily_match_stats', return_value={'matches_remaining': 5}):
                with patch('services.matchmaking.main.get_previous_matches', return_value=[]):
                    with patch('services.matchmaking.main.get_passed_users', return_value=[]):
                        with patch('services.matchmaking.main.should_reset_passed_users', return_value=False):
                            mock_execute = Mock()
                            mock_execute.data = mock_profiles
                            mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
                            mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock()
                            
                            result = await find_match_with_decision(
                                match_request=match_request,
                                token='valid-token'
                            )
                            
                            # Should fallback to matching logic and find a profile
                            assert result.penpal_profile.user_id in ['user-456', 'user-789']


@pytest.mark.asyncio
async def test_find_match_passed_users_reset_triggered(mock_supabase, mock_user, mock_profiles):
    """Test match when passed users reset is triggered"""
    from services.matchmaking.main import find_match_with_decision
    
    match_request = MatchDecisionRequest(
        clerk_id='clerk-123',
        accept=True,
        suggested_user_id=None,
        preferences=MatchingPreferences()
    )
    
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_daily_match_stats', return_value={'matches_remaining': 5}):
            with patch('services.matchmaking.main.get_previous_matches', return_value=[]):
                with patch('services.matchmaking.main.get_passed_users', return_value=['user-456', 'user-789']):
                    with patch('services.matchmaking.main.should_reset_passed_users', return_value=True):
                        mock_execute = Mock()
                        mock_execute.data = mock_profiles
                        mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
                        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = Mock()
                        mock_supabase.table.return_value.insert.return_value.execute.return_value = Mock()
                        
                        result = await find_match_with_decision(
                            match_request=match_request,
                            token='valid-token'
                        )
                        
                        # Should reset and find profiles
                        assert result.penpal_profile.user_id in ['user-456', 'user-789']
                        # Verify delete was called for reset
                        mock_supabase.table.return_value.delete.return_value.eq.assert_called()


@pytest.mark.asyncio
async def test_find_match_no_compatible_profiles_after_filters(mock_supabase, mock_user, mock_profiles):
    """Test match when no compatible profiles found after applying all filters"""
    from services.matchmaking.main import find_match_with_decision
    
    match_request = MatchDecisionRequest(
        clerk_id='clerk-123',
        accept=True,
        suggested_user_id=None,
        preferences=MatchingPreferences(
            exclude_previous=True
        )
    )
    
    with patch('services.matchmaking.main.get_user_by_clerk_id', new=AsyncMock(return_value=mock_user)):
        with patch('services.matchmaking.main.get_daily_match_stats', return_value={'matches_remaining': 5}):
            with patch('services.matchmaking.main.get_previous_matches', return_value=['user-456', 'user-789']):
                mock_execute = Mock()
                mock_execute.data = mock_profiles
                mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.limit.return_value.execute.return_value = mock_execute
                
                with pytest.raises(HTTPException) as exc_info:
                    await find_match_with_decision(
                        match_request=match_request,
                        token='valid-token'
                    )
                
                assert exc_info.value.status_code == 404
                assert "No new profiles available matching your preferences" in str(exc_info.value.detail)
