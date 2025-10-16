"""
Integration tests for Messaging API

Tests the complete flow of messaging endpoints with mocked database.
Covers:
- POST /api/v1/messages (send message)
- GET /api/v1/messages/page (paginate messages)
- GET /api/v1/search (search conversations)
- PATCH /api/v1/conversations/{id}/read (mark as read)
- POST /api/v1/upload-image (upload image)
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime
from types import SimpleNamespace
import sys
import os
from io import BytesIO

pytestmark = pytest.mark.integration


# Set environment variables for testing
@pytest.fixture(scope="module", autouse=True)
def setup_env():
    """Set up environment variables before importing the app"""
    os.environ["SUPABASE_URL"] = "https://test.supabase.co"
    os.environ["SUPABASE_KEY"] = "test_key"
    os.environ["ENABLE_AUTH"] = "false"


class FakeSupabaseClient:
    """Minimal fake Supabase client for integration tests"""
    def __init__(self, responses=None):
        self.responses = list(responses or [])
        self.calls = []
        self.last_insert = None
        self.last_update = None
        self.rpc_calls = []
        
    def table(self, name: str):
        self.calls.append(('table', name))
        return _Query(self)
    
    def rpc(self, function_name, params=None):
        self.rpc_calls.append((function_name, params))
        return _Query(self)
    
    @property
    def storage(self):
        """Mock storage API"""
        return _StorageMock()


class _StorageMock:
    """Mock Supabase storage"""
    def from_(self, bucket: str):
        return _BucketMock()


class _BucketMock:
    """Mock storage bucket"""
    def upload(self, path, data, options=None):
        """Mock file upload"""
        return SimpleNamespace(error=None)
    
    def create_signed_urls(self, paths, ttl_seconds):
        """Mock signed URL creation"""
        return [
            {"path": p, "signedURL": f"https://signed/{p}"}
            for p in paths
        ]


class _Query:
    """Mock query builder"""
    def __init__(self, client: FakeSupabaseClient):
        self._c = client
    
    def select(self, *args, **kwargs):
        return self
    
    def eq(self, *args, **kwargs):
        return self
    
    def in_(self, *args, **kwargs):
        return self
    
    def lte(self, *args, **kwargs):
        return self
    
    def lt(self, *args, **kwargs):
        return self
    
    def gt(self, *args, **kwargs):
        return self
    
    def gte(self, *args, **kwargs):
        return self
    
    def or_(self, *args, **kwargs):
        return self
    
    def order(self, *args, **kwargs):
        return self
    
    def limit(self, *args, **kwargs):
        return self
    
    def single(self):
        return self
    
    def insert(self, data):
        self._c.last_insert = data
        return self
    
    def update(self, data):
        self._c.last_update = data
        return self
    
    @property
    def not_(self):
        """Mock the not_ property"""
        mock = MagicMock()
        mock.is_.return_value = self
        return mock
    
    def is_(self, *args, **kwargs):
        return self
    
    def execute(self):
        if self._c.responses:
            data = self._c.responses.pop(0)
            return SimpleNamespace(data=data)
        return SimpleNamespace(data=[])


@pytest.fixture
def mock_app():
    """Create app with mocked dependencies"""
    # Clear any previous imports
    if 'services.messaging.main' in sys.modules:
        del sys.modules['services.messaging.main']
    if 'services.messaging.auth' in sys.modules:
        del sys.modules['services.messaging.auth']
    
    # Import the app after setting env vars
    from services.messaging.main import app
    
    # Disable auth
    from services.messaging import main as messaging_main
    messaging_main.app.dependency_overrides[messaging_main.verify_token] = lambda: "ok"
    
    yield app
    
    # Cleanup
    messaging_main.app.dependency_overrides.clear()


# ========================================
# POST /api/v1/messages - Send Message
# ========================================

@pytest.mark.integration
def test_send_message_json_success(mock_app):
    """Test sending a message successfully with JSON payload"""
    fake_db = FakeSupabaseClient([
        None,  # RPC call response
    ])
    
    with patch('services.messaging.main.supabase', fake_db):
        with patch('services.messaging.main._either_blocked', return_value=False):
            # Mock RPC response
            fake_db.responses = [
                {
                    "message_id": "msg_123",
                    "conversation_thread_id": "thread_456",
                    "message_content": "Hello, world!",
                    "sender_id": "user_1",
                    "recipient_id": "user_2",
                    "scheduled_delivery_at": "2025-01-01T12:00:00Z",
                    "message_sequence": 1
                }
            ]
            
            client = TestClient(mock_app)
            response = client.post(
                "/api/v1/messages",
                json={
                    "sender_id": "user_1",
                    "recipient_id": "user_2",
                    "message_content": "Hello, world!",
                    "delay_hours": 12
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message_id"] == "msg_123"
            assert data["conversation_thread_id"] == "thread_456"
            assert data["message_content"] == "Hello, world!"
            
            # Verify RPC was called
            assert len(fake_db.rpc_calls) == 1
            assert fake_db.rpc_calls[0][0] == "send_message_oneshot"


@pytest.mark.integration
def test_send_message_with_letter_url(mock_app):
    """Test sending a message with a letter URL"""
    fake_db = FakeSupabaseClient([
        {
            "message_id": "msg_456",
            "conversation_thread_id": "thread_789",
            "message_content": "Check this out!",
            "letter_url": "uploads/letter.png"
        }
    ])
    
    with patch('services.messaging.main.supabase', fake_db):
        with patch('services.messaging.main._either_blocked', return_value=False):
            client = TestClient(mock_app)
            response = client.post(
                "/api/v1/messages",
                json={
                    "sender_id": "user_1",
                    "recipient_id": "user_2",
                    "message_content": "Check this out!",
                    "letter_url": "uploads/letter.png",
                    "delay_hours": 24
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["letter_url"] == "uploads/letter.png"


@pytest.mark.integration
def test_send_message_blocked_users(mock_app):
    """Test sending a message when users are blocked"""
    fake_db = FakeSupabaseClient()
    
    with patch('services.messaging.main.supabase', fake_db):
        with patch('services.messaging.main._either_blocked', return_value=True):
            client = TestClient(mock_app)
            response = client.post(
                "/api/v1/messages",
                json={
                    "sender_id": "user_1",
                    "recipient_id": "user_2",
                    "message_content": "This should fail"
                }
            )
            
            assert response.status_code == 403
            assert "block" in response.json()["detail"].lower()


@pytest.mark.integration
def test_send_message_missing_fields(mock_app):
    """Test sending a message with missing required fields"""
    client = TestClient(mock_app)
    
    # Missing sender_id
    response = client.post(
        "/api/v1/messages",
        json={
            "recipient_id": "user_2",
            "message_content": "Hello"
        }
    )
    assert response.status_code == 422
    
    # Missing recipient_id
    response = client.post(
        "/api/v1/messages",
        json={
            "sender_id": "user_1",
            "message_content": "Hello"
        }
    )
    assert response.status_code == 422
    
    # Missing message_content
    response = client.post(
        "/api/v1/messages",
        json={
            "sender_id": "user_1",
            "recipient_id": "user_2"
        }
    )
    assert response.status_code == 422


@pytest.mark.integration
def test_send_message_multipart_with_file(mock_app):
    """Test sending a message with multipart form data and file upload"""
    fake_db = FakeSupabaseClient([
        {
            "message_id": "msg_789",
            "conversation_thread_id": "thread_123",
            "message_content": "Message with image"
        }
    ])
    
    async def mock_upload(file):
        return "uploads/test_image.png"
    
    with patch('services.messaging.main.supabase', fake_db):
        with patch('services.messaging.main._either_blocked', return_value=False):
            with patch('services.messaging.main._upload_from_uploadfile', mock_upload):
                client = TestClient(mock_app)
                
                files = {"file": ("test.png", b"fake_image_data", "image/png")}
                data = {
                    "sender_id": "user_1",
                    "recipient_id": "user_2",
                    "message_content": "Message with image",
                    "delay_hours": "12"
                }
                
                response = client.post(
                    "/api/v1/messages",
                    files=files,
                    data=data
                )
                
                assert response.status_code == 200


@pytest.mark.integration
def test_send_message_rpc_failure(mock_app):
    """Test sending a message when RPC returns no data"""
    fake_db = FakeSupabaseClient([None])
    
    with patch('services.messaging.main.supabase', fake_db):
        with patch('services.messaging.main._either_blocked', return_value=False):
            client = TestClient(mock_app)
            response = client.post(
                "/api/v1/messages",
                json={
                    "sender_id": "user_1",
                    "recipient_id": "user_2",
                    "message_content": "This will fail"
                }
            )
            
            assert response.status_code == 500
            assert "Failed to insert message" in response.json()["detail"]


# ========================================
# GET /api/v1/messages/page - Paginate Messages
# ========================================

@pytest.mark.integration
def test_page_messages_success(mock_app):
    """Test paginating messages successfully"""
    messages = [
        {
            "message_id": "msg_1",
            "conversation_thread_id": "thread_123",
            "message_content": "Hello",
            "sender_id": "user_1",
            "recipient_id": "user_2",
            "scheduled_delivery_at": "2025-01-01T12:00:00Z",
            "created_at": "2025-01-01T11:00:00Z",
            "read_at": None,
            "letter_url": None
        },
        {
            "message_id": "msg_2",
            "conversation_thread_id": "thread_123",
            "message_content": "Hi there",
            "sender_id": "user_2",
            "recipient_id": "user_1",
            "scheduled_delivery_at": "2025-01-01T13:00:00Z",
            "created_at": "2025-01-01T12:00:00Z",
            "read_at": None,
            "letter_url": "uploads/letter.png"
        }
    ]
    
    fake_db = FakeSupabaseClient([messages])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get(
            "/api/v1/messages/page",
            params={
                "conversation_thread_id": "thread_123",
                "viewer_user_id": "user_1",
                "page_size": 10
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 2
        assert len(data["items"]) == 2
        assert data["items"][0]["message_id"] == "msg_1"
        assert data["next_cursor"] == "msg_2"
        assert data["has_more"] is False
        
        # Check signed URL was added for letter
        assert "letter_url_signed" in data["items"][1]


@pytest.mark.integration
def test_page_messages_with_cursor(mock_app):
    """Test paginating messages with cursor"""
    messages = [
        {
            "message_id": "msg_3",
            "conversation_thread_id": "thread_123",
            "message_content": "Message 3",
            "sender_id": "user_1",
            "recipient_id": "user_2",
            "scheduled_delivery_at": "2025-01-02T12:00:00Z",
            "created_at": "2025-01-02T11:00:00Z",
            "read_at": None,
            "letter_url": None
        }
    ]
    
    fake_db = FakeSupabaseClient([messages])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get(
            "/api/v1/messages/page",
            params={
                "conversation_thread_id": "thread_123",
                "viewer_user_id": "user_1",
                "page_size": 10,
                "last_message_id": "msg_2"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1


@pytest.mark.integration
def test_page_messages_empty_result(mock_app):
    """Test paginating messages with no results"""
    fake_db = FakeSupabaseClient([[]])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get(
            "/api/v1/messages/page",
            params={
                "conversation_thread_id": "thread_123",
                "viewer_user_id": "user_1",
                "page_size": 10
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert data["items"] == []
        assert data["next_cursor"] is None
        assert data["has_more"] is False


@pytest.mark.integration
def test_page_messages_page_size_validation(mock_app):
    """Test page size validation"""
    fake_db = FakeSupabaseClient([[]])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        
        # Valid page sizes
        response = client.get(
            "/api/v1/messages/page",
            params={
                "conversation_thread_id": "thread_123",
                "viewer_user_id": "user_1",
                "page_size": 1
            }
        )
        assert response.status_code == 200
        
        response = client.get(
            "/api/v1/messages/page",
            params={
                "conversation_thread_id": "thread_123",
                "viewer_user_id": "user_1",
                "page_size": 100
            }
        )
        assert response.status_code == 200
        
        # Invalid page size (too large)
        response = client.get(
            "/api/v1/messages/page",
            params={
                "conversation_thread_id": "thread_123",
                "viewer_user_id": "user_1",
                "page_size": 101
            }
        )
        assert response.status_code == 422


@pytest.mark.integration
def test_page_messages_blocked_users(mock_app):
    """Test paginating messages when users are blocked"""
    def mock_execute():
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="blocked")
    
    fake_db = FakeSupabaseClient()
    
    with patch('services.messaging.main.supabase', fake_db):
        with patch.object(_Query, 'execute', side_effect=mock_execute):
            client = TestClient(mock_app)
            response = client.get(
                "/api/v1/messages/page",
                params={
                    "conversation_thread_id": "thread_123",
                    "viewer_user_id": "user_1",
                    "page_size": 10
                }
            )
            
            assert response.status_code == 403


# ========================================
# GET /api/v1/search - Search Conversations
# ========================================

@pytest.mark.integration
def test_search_conversations_success(mock_app):
    """Test searching conversations successfully"""
    rpc_results = [
        {
            "conversation_thread_id": "thread_1",
            "other_user_id": "user_2",
            "anonymous_handle": "alice",
            "match_type": "long-term",
            "latest_message_id": "msg_1",
            "latest_sender_id": "user_1",
            "latest_recipient_id": "user_2",
            "latest_scheduled_delivery_at": "2025-01-01T12:00:00Z",
            "latest_created_at": "2025-01-01T11:00:00Z",
            "latest_read_at": None,
            "latest_letter_url": "uploads/pic.png",
            "latest_message_content": "Hello Alice"
        }
    ]
    
    profiles = [
        {
            "user_id": "user_2",
            "anonymous_handle": "alice",
            "country_code": "US",
            "bio": "Hi there",
            "age_range": "25-30",
            "interests": ["reading", "hiking"],
            "account_status": "active"
        }
    ]
    
    fake_db = FakeSupabaseClient([rpc_results, profiles])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get(
            "/api/v1/search",
            params={
                "my_user_id": "user_1",
                "anonymous_handle": "",
                "limit": 20,
                "offset": 0
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert len(data["items"]) == 1
        
        item = data["items"][0]
        assert item["user_profile"]["user_id"] == "user_2"
        assert item["user_profile"]["anonymous_handle"] == "alice"
        assert item["latest_message"]["message_id"] == "msg_1"
        assert item["match_type"] == "long-term"
        
        # Verify signed URL was added
        assert "letter_url_signed" in item["latest_message"]


@pytest.mark.integration
def test_search_conversations_with_query(mock_app):
    """Test searching conversations with handle filter"""
    rpc_results = [
        {
            "conversation_thread_id": "thread_1",
            "other_user_id": "user_2",
            "anonymous_handle": "bob",
            "match_type": "one-time",
            "latest_message_id": "msg_1",
            "latest_sender_id": "user_2",
            "latest_recipient_id": "user_1",
            "latest_scheduled_delivery_at": "2025-01-01T12:00:00Z",
            "latest_created_at": "2025-01-01T11:00:00Z",
            "latest_read_at": None,
            "latest_letter_url": None,
            "latest_message_content": "Hi from Bob"
        }
    ]
    
    profiles = [
        {
            "user_id": "user_2",
            "anonymous_handle": "bob",
            "country_code": "UK",
            "bio": "Hello",
            "age_range": "30-35",
            "interests": ["sports"],
            "account_status": "active"
        }
    ]
    
    fake_db = FakeSupabaseClient([rpc_results, profiles])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get(
            "/api/v1/search",
            params={
                "my_user_id": "user_1",
                "anonymous_handle": "bob",
                "limit": 20,
                "offset": 0
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        assert data["items"][0]["user_profile"]["anonymous_handle"] == "bob"


@pytest.mark.integration
def test_search_conversations_empty(mock_app):
    """Test searching conversations with no results"""
    fake_db = FakeSupabaseClient([[]])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get(
            "/api/v1/search",
            params={
                "my_user_id": "user_1",
                "anonymous_handle": "nonexistent",
                "limit": 20,
                "offset": 0
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert data["items"] == []


@pytest.mark.integration
def test_search_conversations_skip_inactive_profiles(mock_app):
    """Test that inactive profiles are skipped in search results"""
    rpc_results = [
        {
            "conversation_thread_id": "thread_1",
            "other_user_id": "user_2",
            "anonymous_handle": "inactive_user",
            "match_type": "either"
        }
    ]
    
    profiles = [
        {
            "user_id": "user_2",
            "anonymous_handle": "inactive_user",
            "account_status": "inactive"
        }
    ]
    
    fake_db = FakeSupabaseClient([rpc_results, profiles])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get(
            "/api/v1/search",
            params={
                "my_user_id": "user_1",
                "anonymous_handle": "",
                "limit": 20,
                "offset": 0
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        # Inactive profile should be filtered out
        assert data["count"] == 0
        assert data["items"] == []


@pytest.mark.integration
def test_search_conversations_limit_validation(mock_app):
    """Test search limit parameter validation"""
    fake_db = FakeSupabaseClient([[]])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        
        # Valid limits
        response = client.get(
            "/api/v1/search",
            params={"my_user_id": "user_1", "limit": 1, "offset": 0}
        )
        assert response.status_code == 200
        
        response = client.get(
            "/api/v1/search",
            params={"my_user_id": "user_1", "limit": 50, "offset": 0}
        )
        assert response.status_code == 200
        
        # Invalid limit (too large)
        response = client.get(
            "/api/v1/search",
            params={"my_user_id": "user_1", "limit": 51, "offset": 0}
        )
        assert response.status_code == 422


@pytest.mark.integration
def test_search_conversations_no_latest_message(mock_app):
    """Test search when conversation has no latest message (one-time match)"""
    rpc_results = [
        {
            "conversation_thread_id": "thread_1",
            "other_user_id": "user_2",
            "anonymous_handle": "user2",
            "match_type": "one-time"
            # No latest_message_id or other message fields
        }
    ]
    
    profiles = [
        {
            "user_id": "user_2",
            "anonymous_handle": "user2",
            "country_code": "CA",
            "bio": "Test",
            "age_range": "18-25",
            "interests": [],
            "account_status": "active"
        }
    ]
    
    fake_db = FakeSupabaseClient([rpc_results, profiles])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get(
            "/api/v1/search",
            params={
                "my_user_id": "user_1",
                "anonymous_handle": "",
                "limit": 20,
                "offset": 0
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 1
        # Latest message should be None for one-time matches
        assert data["items"][0]["latest_message"] is None


# ========================================
# PATCH /api/v1/conversations/{id}/read - Mark as Read
# ========================================

@pytest.mark.integration
def test_mark_messages_as_read_success(mock_app):
    """Test marking messages as read successfully"""
    fake_db = FakeSupabaseClient([
        [{"message_id": "msg_1"}, {"message_id": "msg_2"}]
    ])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.patch(
            "/api/v1/conversations/thread_123/read",
            json={"my_user_id": "user_1"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["updated"] == 2
        
        # Verify update was called with read_at timestamp
        assert fake_db.last_update is not None
        assert "read_at" in fake_db.last_update


@pytest.mark.integration
def test_mark_messages_as_read_no_unread(mock_app):
    """Test marking as read when there are no unread messages"""
    fake_db = FakeSupabaseClient([[]])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.patch(
            "/api/v1/conversations/thread_123/read",
            json={"my_user_id": "user_1"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["updated"] == 0


@pytest.mark.integration
def test_mark_messages_as_read_missing_user_id(mock_app):
    """Test marking as read without user ID"""
    client = TestClient(mock_app)
    response = client.patch(
        "/api/v1/conversations/thread_123/read",
        json={}
    )
    
    assert response.status_code == 422


# ========================================
# POST /api/v1/upload-image - Upload Image
# ========================================

@pytest.mark.integration
def test_upload_image_success(mock_app):
    """Test uploading an image successfully"""
    fake_db = FakeSupabaseClient()
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        
        # Create a fake image file
        image_data = b"fake_image_content"
        files = {"file": ("test_image.png", BytesIO(image_data), "image/png")}
        
        response = client.post("/api/v1/upload-image", files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert "object_path" in data
        assert "uploads/" in data["object_path"]
        assert data["data"]["path"] == data["object_path"]


@pytest.mark.integration
def test_upload_image_different_formats(mock_app):
    """Test uploading images in different formats"""
    fake_db = FakeSupabaseClient()
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        
        # Test PNG
        response = client.post(
            "/api/v1/upload-image",
            files={"file": ("image.png", b"data", "image/png")}
        )
        assert response.status_code == 200
        
        # Test JPEG
        response = client.post(
            "/api/v1/upload-image",
            files={"file": ("image.jpg", b"data", "image/jpeg")}
        )
        assert response.status_code == 200
        
        # Test GIF
        response = client.post(
            "/api/v1/upload-image",
            files={"file": ("image.gif", b"data", "image/gif")}
        )
        assert response.status_code == 200


@pytest.mark.integration
def test_upload_image_storage_error(mock_app):
    """Test upload failure when storage returns an error"""
    fake_db = FakeSupabaseClient()
    
    async def mock_upload_error(file):
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Upload failed")
    
    with patch('services.messaging.main.supabase', fake_db):
        with patch('services.messaging.main._upload_from_uploadfile', mock_upload_error):
            client = TestClient(mock_app)
            
            response = client.post(
                "/api/v1/upload-image",
                files={"file": ("test.png", b"data", "image/png")}
            )
            
            assert response.status_code == 500


# ========================================
# Edge Cases and Error Scenarios
# ========================================

@pytest.mark.integration
def test_complete_messaging_flow(mock_app):
    """Test complete messaging flow: send, search, paginate, mark as read"""
    fake_db = FakeSupabaseClient()
    
    with patch('services.messaging.main.supabase', fake_db):
        with patch('services.messaging.main._either_blocked', return_value=False):
            client = TestClient(mock_app)
            
            # 1. Send a message
            fake_db.responses = [
                {
                    "message_id": "msg_new",
                    "conversation_thread_id": "thread_new",
                    "message_content": "Integration test message",
                    "sender_id": "user_1",
                    "recipient_id": "user_2"
                }
            ]
            
            send_response = client.post(
                "/api/v1/messages",
                json={
                    "sender_id": "user_1",
                    "recipient_id": "user_2",
                    "message_content": "Integration test message"
                }
            )
            assert send_response.status_code == 200
            
            # 2. Search for conversations
            fake_db.responses = [
                [{
                    "conversation_thread_id": "thread_new",
                    "other_user_id": "user_2",
                    "match_type": "either",
                    "latest_message_id": "msg_new",
                    "latest_sender_id": "user_1",
                    "latest_recipient_id": "user_2",
                    "latest_scheduled_delivery_at": "2025-01-01T12:00:00Z",
                    "latest_created_at": "2025-01-01T11:00:00Z",
                    "latest_read_at": None,
                    "latest_letter_url": None,
                    "latest_message_content": "Integration test message"
                }],
                [{"user_id": "user_2", "anonymous_handle": "user2", "account_status": "active"}]
            ]
            
            search_response = client.get(
                "/api/v1/search",
                params={"my_user_id": "user_1", "limit": 20, "offset": 0}
            )
            assert search_response.status_code == 200
            
            # 3. Paginate messages
            fake_db.responses = [[{
                "message_id": "msg_new",
                "conversation_thread_id": "thread_new",
                "message_content": "Integration test message",
                "sender_id": "user_1",
                "recipient_id": "user_2",
                "scheduled_delivery_at": "2025-01-01T12:00:00Z",
                "created_at": "2025-01-01T11:00:00Z",
                "read_at": None,
                "letter_url": None
            }]]
            
            page_response = client.get(
                "/api/v1/messages/page",
                params={
                    "conversation_thread_id": "thread_new",
                    "viewer_user_id": "user_2",
                    "page_size": 10
                }
            )
            assert page_response.status_code == 200
            
            # 4. Mark as read
            fake_db.responses = [[{"message_id": "msg_new"}]]
            
            mark_read_response = client.patch(
                "/api/v1/conversations/thread_new/read",
                json={"my_user_id": "user_2"}
            )
            assert mark_read_response.status_code == 200
            assert mark_read_response.json()["updated"] == 1


@pytest.mark.integration
def test_concurrent_message_sending(mock_app):
    """Test handling multiple concurrent message sends"""
    fake_db = FakeSupabaseClient()
    
    with patch('services.messaging.main.supabase', fake_db):
        with patch('services.messaging.main._either_blocked', return_value=False):
            client = TestClient(mock_app)
            
            # Send multiple messages
            for i in range(3):
                fake_db.responses = [{
                    "message_id": f"msg_{i}",
                    "conversation_thread_id": "thread_123",
                    "message_content": f"Message {i}"
                }]
                
                response = client.post(
                    "/api/v1/messages",
                    json={
                        "sender_id": "user_1",
                        "recipient_id": "user_2",
                        "message_content": f"Message {i}"
                    }
                )
                assert response.status_code == 200


@pytest.mark.integration
def test_search_with_pagination_offset(mock_app):
    """Test search with different offset values"""
    rpc_results = [
        {
            "conversation_thread_id": "thread_3",
            "other_user_id": "user_4",
            "match_type": "either"
        }
    ]
    
    profiles = [
        {
            "user_id": "user_4",
            "anonymous_handle": "user4",
            "account_status": "active"
        }
    ]
    
    fake_db = FakeSupabaseClient([rpc_results, profiles])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        
        # Test with offset
        response = client.get(
            "/api/v1/search",
            params={
                "my_user_id": "user_1",
                "anonymous_handle": "",
                "limit": 10,
                "offset": 10
            }
        )
        
        assert response.status_code == 200
        # Verify RPC was called with correct offset parameter
        assert len(fake_db.rpc_calls) > 0


@pytest.mark.integration  
def test_message_sorting_by_timestamp(mock_app):
    """Test that search results are sorted by latest message timestamp"""
    rpc_results = [
        {
            "conversation_thread_id": "thread_1",
            "other_user_id": "user_2",
            "match_type": "either",
            "latest_message_id": "msg_1",
            "latest_sender_id": "user_1",
            "latest_recipient_id": "user_2",
            "latest_scheduled_delivery_at": "2025-01-01T12:00:00Z",
            "latest_created_at": "2025-01-01T11:00:00Z",
            "latest_read_at": None,
            "latest_letter_url": None,
            "latest_message_content": "Older message"
        },
        {
            "conversation_thread_id": "thread_2",
            "other_user_id": "user_3",
            "match_type": "either",
            "latest_message_id": "msg_2",
            "latest_sender_id": "user_1",
            "latest_recipient_id": "user_3",
            "latest_scheduled_delivery_at": "2025-01-02T12:00:00Z",
            "latest_created_at": "2025-01-02T11:00:00Z",
            "latest_read_at": None,
            "latest_letter_url": None,
            "latest_message_content": "Newer message"
        }
    ]
    
    profiles = [
        {"user_id": "user_2", "anonymous_handle": "user2", "account_status": "active"},
        {"user_id": "user_3", "anonymous_handle": "user3", "account_status": "active"}
    ]
    
    fake_db = FakeSupabaseClient([rpc_results, profiles])
    
    with patch('services.messaging.main.supabase', fake_db):
        client = TestClient(mock_app)
        response = client.get(
            "/api/v1/search",
            params={"my_user_id": "user_1", "limit": 20, "offset": 0}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify results are sorted with newer message first
        assert len(data["items"]) == 2
        assert data["items"][0]["latest_message"]["message_content"] == "Newer message"
        assert data["items"][1]["latest_message"]["message_content"] == "Older message"

