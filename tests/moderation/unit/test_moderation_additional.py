"""
Additional unit tests for moderation service edge cases
"""
import sys
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os

@pytest.mark.unit
def test_validation():
    """Marker test for unit test discovery"""
    assert True

# Set environment variables for testing
os.environ["SUPABASE_URL"] = "test"
os.environ["SUPABASE_KEY"] = "test"
os.environ["CLERK_SECRET_KEY"] = "test"

# Mock external dependencies before importing the app
sys.modules['clerk_backend_api'] = MagicMock()
sys.modules['supabase'] = MagicMock()
sys.modules['better_profanity'] = MagicMock()

from services.moderation.main import app

client = TestClient(app)


@pytest.mark.unit
@patch('services.moderation.main.supabase')
def test_check_profanity_both_headers_error(mock_supabase):
    """Test error when both X-User-Id and X-Api-Key are provided"""
    resp = client.post(
        "/api/v1/check", 
        json={"text": "test"}, 
        headers={"X-User-Id": "user1", "X-Api-Key": "key1"}
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Provide either X-User-Id or X-Api-Key, not both"


@pytest.mark.unit
@patch('services.moderation.main.supabase')
def test_check_profanity_no_headers_error(mock_supabase):
    """Test error when no authentication headers are provided"""
    resp = client.post("/api/v1/check", json={"text": "test"})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Missing authentication header"


@pytest.mark.unit
@patch('services.moderation.main.supabase')
def test_check_profanity_invalid_api_key(mock_supabase):
    """Test error when API key is invalid"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    resp = client.post("/api/v1/check", json={"text": "test"}, headers={"X-Api-Key": "invalid"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid API key"


@pytest.mark.unit
@patch('services.moderation.main.supabase')
def test_check_profanity_usage_limit_exceeded(mock_supabase):
    """Test error when external user reaches usage limit"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "ext1", "usage_count": 100, "usage_limit": 100}
    ]
    resp = client.post("/api/v1/check", json={"text": "test"}, headers={"X-Api-Key": "key1"})
    assert resp.status_code == 429
    assert resp.json()["detail"] == "Usage limit reached"


@pytest.mark.unit
@patch('services.moderation.main.supabase')
def test_check_profanity_internal_user_not_found(mock_supabase):
    """Test error when internal user is not found"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    resp = client.post("/api/v1/check", json={"text": "test"}, headers={"X-User-Id": "user999"})
    assert resp.status_code == 404
    assert resp.json()["detail"] == "User not found"


@pytest.mark.unit
@patch('services.moderation.main.supabase')
def test_check_profanity_external_increments_usage(mock_supabase):
    """Test that external user usage is incremented"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "ext1", "usage_count": 5, "usage_limit": 10}
    ]
    
    with patch('services.moderation.main.profanity') as mock_profanity:
        mock_profanity.contains_profanity.return_value = False
        mock_profanity.censor.return_value = "clean text"
        
        resp = client.post("/api/v1/check", json={"text": "hello"}, headers={"X-Api-Key": "key1"})
        assert resp.status_code == 200
        
        # Verify update was called to increment usage
        mock_supabase.table.return_value.update.assert_called()


@pytest.mark.unit
@patch('services.moderation.main.supabase')
def test_report_user_null_reported_users(mock_supabase):
    """Test reporting when reported_users field is null"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"reported_users": None}
    ]
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {"reported_users": ["user2"]}
    ]
    mock_supabase.rpc.return_value.execute.return_value = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()
    
    resp = client.post("/api/v1/report-user", json={
        "reporterId": "user1",
        "reportedId": "user2",
        "violationType": "harassment"
    })
    assert resp.status_code == 201
    assert "user2" in resp.json()


@pytest.mark.unit
@patch('services.moderation.main.supabase')
def test_block_user_null_blocked_users(mock_supabase):
    """Test blocking when blocked_users field is null"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"blocked_users": None}
    ]
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        {"blocked_users": ["user2"]}
    ]
    
    resp = client.post("/api/v1/block-user", json={
        "reporterId": "user1",
        "reportedId": "user2"
    })
    assert resp.status_code == 201
    assert "user2" in resp.json()


@pytest.mark.unit
@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_ban_user_with_string_fingerprint(mock_clerk, mock_supabase):
    """Test banning user when fingerprint is a string instead of list"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
        MagicMock(data=[{"log_id": "log1", "reported_user_id": "user1"}]),
        MagicMock(data=[{"user_id": "user1", "clerk_id": "clerk1", "fingerprint": "fp1"}])
    ]
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()
    mock_clerk.users.ban.return_value = True
    
    resp = client.post("/api/v1/ban-user/log1")
    assert resp.status_code == 200
    assert "has been banned" in resp.json()["message"]


@pytest.mark.unit
@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_ban_user_with_empty_fingerprint(mock_clerk, mock_supabase):
    """Test banning user when fingerprint list is empty"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
        MagicMock(data=[{"log_id": "log1", "reported_user_id": "user1"}]),
        MagicMock(data=[{"user_id": "user1", "clerk_id": "clerk1", "fingerprint": []}])
    ]
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    mock_clerk.users.ban.return_value = True
    
    resp = client.post("/api/v1/ban-user/log1")
    assert resp.status_code == 200


@pytest.mark.unit
@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_ban_clerk_user_updates_profile(mock_clerk, mock_supabase):
    """Test that banning clerk user also updates user profile if exists"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"user_id": "user1", "clerk_id": "clerk1"}
    ]
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    mock_clerk.users.ban.return_value = True
    
    resp = client.post("/api/v1/ban-clerk-user/clerk1")
    assert resp.status_code == 200
    # Verify update was called
    mock_supabase.table.return_value.update.assert_called()


@pytest.mark.unit
@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_unban_user_success(mock_clerk, mock_supabase):
    """Test successful user unbanning"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"user_id": "user1", "clerk_id": "clerk1"}
    ]
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock()
    mock_clerk.users.unban.return_value = True
    
    resp = client.post("/api/v1/unban-user/user1")
    assert resp.status_code == 200
    assert "has been unbanned" in resp.json()["message"]


@pytest.mark.unit
@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_unban_user_not_found(mock_clerk, mock_supabase):
    """Test unbanning non-existent user"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    
    resp = client.post("/api/v1/unban-user/user999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "User not found"


@pytest.mark.unit
@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_unban_user_missing_clerk_id(mock_clerk, mock_supabase):
    """Test unbanning user without clerk_id"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"user_id": "user1"}
    ]
    
    resp = client.post("/api/v1/unban-user/user1")
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Clerk ID not found for user."


@pytest.mark.unit
@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_unban_user_clerk_error(mock_clerk, mock_supabase):
    """Test error when Clerk API fails during unban"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"user_id": "user1", "clerk_id": "clerk1"}
    ]
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock()
    mock_clerk.users.unban.side_effect = Exception("Clerk API error")
    
    resp = client.post("/api/v1/unban-user/user1")
    assert resp.status_code == 502
    assert "Clerk API error" in resp.json()["detail"]


@pytest.mark.unit
@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_unban_clerk_user_success(mock_clerk, mock_supabase):
    """Test successful clerk user unbanning"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"user_id": "user1"}
    ]
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    mock_clerk.users.unban.return_value = True
    
    resp = client.post("/api/v1/unban-clerk-user/clerk1")
    assert resp.status_code == 200
    assert "has been unbanned" in resp.json()["message"]


@pytest.mark.unit
@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_unban_clerk_user_error(mock_clerk, mock_supabase):
    """Test error when Clerk API fails during clerk user unban"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock_clerk.users.unban.side_effect = Exception("unban error")
    
    resp = client.post("/api/v1/unban-clerk-user/clerk1")
    assert resp.status_code == 502
    assert "unban error" in resp.json()["detail"]


@pytest.mark.unit
@patch('services.moderation.main.supabase')
def test_get_banned_users(mock_supabase):
    """Test fetching all banned users"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"user_id": "user1", "account_status": "banned"},
        {"user_id": "user2", "account_status": "banned"}
    ]
    
    resp = client.get("/api/v1/banned-users")
    assert resp.status_code == 200
    assert "banned_users" in resp.json()
    assert len(resp.json()["banned_users"]) == 2


@pytest.mark.unit
@patch('services.moderation.main.supabase')
def test_resolve_case_all_actions(mock_supabase):
    """Test resolve case with all valid actions"""
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"log_id": "log1"}
    ]
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    
    valid_actions = ["warning", "no_action", "content_removal", "temporary_ban", "permanent_ban"]
    
    for action in valid_actions:
        resp = client.post("/api/v1/resolve-case", json={
            "log_id": "log1",
            "action": action,
            "notes": f"Test {action}"
        })
        assert resp.status_code == 200
        assert "has been updated" in resp.json()["message"]

