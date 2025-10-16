"""
Integration tests for Moderation API
Tests the complete flow with mocked database
"""
import pytest
from fastapi.testclient import TestClient
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
import sys
import os

@pytest.mark.integration
def test_validation():
    """Marker test for integration test discovery"""
    assert True


# Set environment variables for testing
os.environ["SUPABASE_URL"] = "test"
os.environ["SUPABASE_KEY"] = "test"
os.environ["CLERK_SECRET_KEY"] = "test"

# Mock external dependencies before importing the app
sys.modules['clerk_backend_api'] = MagicMock()
sys.modules['supabase'] = MagicMock()
sys.modules['better_profanity'] = MagicMock()


class FakeSupabaseClient:
    """Minimal fake Supabase client for integration tests"""
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []
        self.last_insert = None
        self.last_update = None
        self.last_delete = None
        
    def table(self, name: str):
        self.calls.append(('table', name))
        return _Query(self)
    
    def rpc(self, function_name, params=None):
        self.calls.append(('rpc', function_name, params))
        return _Query(self)


class _Query:
    def __init__(self, client: FakeSupabaseClient):
        self._c = client
    
    def select(self, *args, **kwargs):
        return self
    
    def eq(self, *args, **kwargs):
        return self
    
    def order(self, *args, **kwargs):
        return self
    
    def insert(self, data):
        self._c.last_insert = data
        return self
    
    def update(self, data):
        self._c.last_update = data
        return self
    
    def delete(self):
        self._c.last_delete = True
        return self
    
    def execute(self):
        if self._c.responses:
            data = self._c.responses.pop(0)
            return SimpleNamespace(data=data)
        return SimpleNamespace(data=[])


@pytest.fixture
def mock_app():
    """Create app with mocked dependencies"""
    from services.moderation.main import app
    return app


@pytest.mark.integration
def test_check_profanity_internal_user_flow(mock_app):
    """Test complete profanity check flow for internal user"""
    fake_db = FakeSupabaseClient([
        [{"user_id": "user123", "reported_count": 0}],  # user_profiles select
        None,  # moderation_logs insert
        None   # user_profiles update
    ])
    
    with patch('services.moderation.main.supabase', fake_db):
        with patch('services.moderation.main.profanity') as mock_profanity:
            mock_profanity.contains_profanity.return_value = True
            mock_profanity.censor.return_value = "*** text"
            
            client = TestClient(mock_app)
            response = client.post(
                "/api/v1/check",
                json={"text": "bad text"},
                headers={"X-User-Id": "user123"}
            )
            
            assert response.status_code == 200
            assert response.json()["contains_profanity"] is True
            assert response.json()["censored_text"] == "*** text"
            
            # Verify moderation log was created
            assert fake_db.last_insert is not None
            assert fake_db.last_insert["target_type"] == "message"
            assert fake_db.last_insert["automated_detection"] is True


@pytest.mark.integration
def test_check_profanity_external_user_flow(mock_app):
    """Test complete profanity check flow for external user"""
    fake_db = FakeSupabaseClient([
        [{"id": "ext123", "usage_count": 5, "usage_limit": 100}],  # external_users select
        None  # external_users update (increment usage)
    ])
    
    with patch('services.moderation.main.supabase', fake_db):
        with patch('services.moderation.main.profanity') as mock_profanity:
            mock_profanity.contains_profanity.return_value = False
            mock_profanity.censor.return_value = "clean text"
            
            client = TestClient(mock_app)
            response = client.post(
                "/api/v1/check",
                json={"text": "clean text"},
                headers={"X-Api-Key": "valid-api-key"}
            )
            
            assert response.status_code == 200
            assert response.json()["contains_profanity"] is False
            
            # Verify usage was incremented
            assert fake_db.last_update is not None
            assert fake_db.last_update["usage_count"] == 6


@pytest.mark.integration
def test_report_user_complete_flow(mock_app):
    """Test complete user reporting flow"""
    fake_db = FakeSupabaseClient([
        [{"reported_users": []}],  # select reporter's reported_users
        [{"reported_users": ["user2"]}],  # update reporter's reported_users
        None,  # rpc increment_user_reported_count
        None   # insert moderation_log
    ])
    
    with patch('services.moderation.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.post(
            "/api/v1/report-user",
            json={
                "reporterId": "user1",
                "reportedId": "user2",
                "violationType": "harassment"
            }
        )
        
        assert response.status_code == 201
        assert "user2" in response.json()
        
        # Verify moderation log was created
        assert fake_db.last_insert is not None
        assert fake_db.last_insert["target_type"] == "user"
        assert fake_db.last_insert["reported_user_id"] == "user2"
        assert fake_db.last_insert["reporting_user_id"] == "user1"


@pytest.mark.integration
def test_report_message_complete_flow(mock_app):
    """Test complete message reporting flow"""
    fake_db = FakeSupabaseClient([
        [],  # select - no existing report
        None  # insert moderation_log
    ])
    
    with patch('services.moderation.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.post(
            "/api/v1/report-message",
            json={
                "reporterId": "user1",
                "reportedUserId": "user2",
                "reportedMessageId": "msg123",
                "violationType": "spam"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["target_id"] == "msg123"
        assert data["target_type"] == "message"
        assert data["violation_type"] == "spam"


@pytest.mark.integration
def test_block_user_complete_flow(mock_app):
    """Test complete user blocking flow"""
    fake_db = FakeSupabaseClient([
        [{"blocked_users": ["user1"]}],  # select blocker's blocked_users
        [{"blocked_users": ["user1", "user3"]}]  # update blocker's blocked_users
    ])
    
    with patch('services.moderation.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.post(
            "/api/v1/block-user",
            json={
                "reporterId": "user2",
                "reportedId": "user3"
            }
        )
        
        assert response.status_code == 201
        assert "user3" in response.json()
        assert "user1" in response.json()


@pytest.mark.integration
@patch('services.moderation.main.clerk')
def test_ban_user_complete_flow(mock_clerk, mock_app):
    """Test complete user banning flow"""
    fake_db = FakeSupabaseClient([
        [{"log_id": "log1", "reported_user_id": "user1"}],  # select moderation_log
        [{"user_id": "user1", "clerk_id": "clerk1", "fingerprint": ["fp1", "fp2"]}],  # select user_profiles
        None,  # update user_profiles (set banned)
        None,  # update moderation_logs (resolve)
        None,  # insert banned_fingerprints fp1
        None   # insert banned_fingerprints fp2
    ])
    
    mock_clerk.users.ban.return_value = True
    
    with patch('services.moderation.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.post("/api/v1/ban-user/log1")
        
        assert response.status_code == 200
        assert "has been banned" in response.json()["message"]
        
        # Verify Clerk ban was called
        mock_clerk.users.ban.assert_called_once_with(user_id="clerk1")


@pytest.mark.integration
@patch('services.moderation.main.clerk')
def test_unban_user_complete_flow(mock_clerk, mock_app):
    """Test complete user unbanning flow"""
    fake_db = FakeSupabaseClient([
        [{"user_id": "user1", "clerk_id": "clerk1"}],  # select user_profiles
        None,  # update user_profiles (set active)
        None   # delete from banned_fingerprints
    ])
    
    mock_clerk.users.unban.return_value = True
    
    with patch('services.moderation.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.post("/api/v1/unban-user/user1")
        
        assert response.status_code == 200
        assert "has been unbanned" in response.json()["message"]
        
        # Verify database updates
        assert fake_db.last_update["account_status"] == "active"
        assert fake_db.last_delete is True


@pytest.mark.integration
def test_resolve_case_complete_flow(mock_app):
    """Test complete case resolution flow"""
    fake_db = FakeSupabaseClient([
        [{"log_id": "log1", "status": "open"}],  # select moderation_log
        None  # update moderation_log
    ])
    
    with patch('services.moderation.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.post(
            "/api/v1/resolve-case",
            json={
                "log_id": "log1",
                "action": "warning",
                "notes": "User warned about behavior"
            }
        )
        
        assert response.status_code == 200
        assert "has been updated" in response.json()["message"]
        
        # Verify update data
        assert fake_db.last_update["status"] == "resolved"
        assert fake_db.last_update["resolution_action"] == "warning"
        assert fake_db.last_update["resolution_notes"] == "User warned about behavior"


@pytest.mark.integration
def test_check_fingerprint_flow(mock_app):
    """Test fingerprint checking flow"""
    # Test banned fingerprint
    fake_db = FakeSupabaseClient([
        [{"fingerprint": "banned_fp", "user_id": "user1"}]
    ])
    
    with patch('services.moderation.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get("/api/v1/fingerprint/banned_fp")
        
        assert response.status_code == 200
        assert response.json()["is_banned"] is True
    
    # Test non-banned fingerprint
    fake_db = FakeSupabaseClient([[]])
    
    with patch('services.moderation.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get("/api/v1/fingerprint/clean_fp")
        
        assert response.status_code == 200
        assert response.json()["is_banned"] is False


@pytest.mark.integration
def test_get_moderation_logs_flow(mock_app):
    """Test fetching moderation logs as moderator"""
    fake_db = FakeSupabaseClient([
        [{"user_id": "mod1", "moderator": True}],  # select user_profiles
        [  # select moderation_logs (ordered)
            {"log_id": "log1", "status": "open", "created_at": "2024-01-01"},
            {"log_id": "log2", "status": "resolved", "created_at": "2024-01-02"}
        ]
    ])
    
    with patch('services.moderation.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get(
            "/api/v1/logs",
            headers={"X-User-Id": "mod1"}
        )
        
        assert response.status_code == 200
        assert "logs" in response.json()
        assert len(response.json()["logs"]) == 2


@pytest.mark.integration
def test_get_banned_users_flow(mock_app):
    """Test fetching all banned users"""
    fake_db = FakeSupabaseClient([
        [
            {"user_id": "user1", "account_status": "banned"},
            {"user_id": "user2", "account_status": "banned"}
        ]
    ])
    
    with patch('services.moderation.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get("/api/v1/banned-users")
        
        assert response.status_code == 200
        assert "banned_users" in response.json()
        assert len(response.json()["banned_users"]) == 2


@pytest.mark.integration
def test_profanity_check_creates_log_for_internal(mock_app):
    """Test that profanity check creates moderation log for internal users"""
    fake_db = FakeSupabaseClient([
        [{"user_id": "user1", "reported_count": 0}],  # user lookup
        None,  # insert moderation_log
        None   # update user_profiles (increment reported_count)
    ])
    
    with patch('services.moderation.main.supabase', fake_db):
        with patch('services.moderation.main.profanity') as mock_profanity:
            mock_profanity.contains_profanity.return_value = True
            mock_profanity.censor.return_value = "*** bad ***"
            
            client = TestClient(mock_app)
            response = client.post(
                "/api/v1/check",
                json={"text": "bad word"},
                headers={"X-User-Id": "user1"}
            )
            
            assert response.status_code == 200
            
            # Verify moderation log was inserted
            assert fake_db.last_insert is not None
            log = fake_db.last_insert
            assert log["violation_type"] == "inappropriate_content"
            assert log["automated_detection"] is True
            assert log["status"] == "resolved"
            
            # Verify user reported_count was incremented
            assert fake_db.last_update["reported_count"] == 1


@pytest.mark.integration
def test_profanity_check_no_log_for_clean_text(mock_app):
    """Test that no moderation log is created for clean text"""
    fake_db = FakeSupabaseClient([
        [{"user_id": "user1", "reported_count": 0}]  # user lookup only
    ])
    
    with patch('services.moderation.main.supabase', fake_db):
        with patch('services.moderation.main.profanity') as mock_profanity:
            mock_profanity.contains_profanity.return_value = False
            mock_profanity.censor.return_value = "clean text"
            
            client = TestClient(mock_app)
            response = client.post(
                "/api/v1/check",
                json={"text": "clean text"},
                headers={"X-User-Id": "user1"}
            )
            
            assert response.status_code == 200
            assert response.json()["contains_profanity"] is False
            
            # Verify no moderation log was inserted
            assert fake_db.last_insert is None


@pytest.mark.integration
def test_error_handling_chain(mock_app):
    """Test error handling across multiple operations"""
    # Test missing headers
    client = TestClient(mock_app)
    response = client.post("/api/v1/check", json={"text": "test"})
    assert response.status_code == 400
    
    # Test invalid API key
    fake_db = FakeSupabaseClient([[]])
    with patch('services.moderation.main.supabase', fake_db):
        response = client.post(
            "/api/v1/check",
            json={"text": "test"},
            headers={"X-Api-Key": "invalid"}
        )
        assert response.status_code == 401
    
    # Test usage limit
    fake_db = FakeSupabaseClient([[{"id": "ext1", "usage_count": 100, "usage_limit": 100}]])
    with patch('services.moderation.main.supabase', fake_db):
        response = client.post(
            "/api/v1/check",
            json={"text": "test"},
            headers={"X-Api-Key": "key1"}
        )
        assert response.status_code == 429

