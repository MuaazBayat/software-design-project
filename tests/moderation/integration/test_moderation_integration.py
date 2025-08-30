import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime
import uuid

# Set environment variables and mock Supabase before any imports
os.environ.setdefault('SUPABASE_URL', 'https://fake-url.supabase.co')
os.environ.setdefault('SUPABASE_KEY', 'fake-key')

# Patch the create_client function at its source before importing main
with patch('supabase.create_client') as mock_create_client:
    mock_create_client.return_value = MagicMock()
    
    # Now import the FastAPI app
    from services.moderation.main import app

# Create a test client
client = TestClient(app)


@pytest.fixture
def mock_supabase():
    """Mock the Supabase client"""
    with patch("services.moderation.main.supabase") as mock_sb:
        yield mock_sb


@pytest.fixture
def mock_profanity():
    """Mock the profanity module"""
    with patch("services.moderation.main.profanity") as mock_prof:
        yield mock_prof


@pytest.fixture
def mock_uuid():
    """Mock uuid.uuid4()"""
    with patch("services.moderation.main.uuid.uuid4") as mock_uuid:
        mock_uuid.return_value = uuid.UUID("12345678-1234-1234-1234-123456789abc")
        yield mock_uuid


@pytest.fixture
def mock_datetime():
    """Mock datetime.utcnow()"""
    with patch("services.moderation.main.datetime") as mock_dt:
        mock_dt.utcnow.return_value.isoformat.return_value = "2023-01-01T12:00:00.000000"
        yield mock_dt


@pytest.mark.integration
class TestAuthenticationValidation:
    """Test authentication scenarios"""

    def test_missing_auth_headers(self):
        """Test request without authentication headers"""
        response = client.post("/api/v1/check", json={"text": "Hello world"})
        assert response.status_code == 400
        assert response.json()["detail"] == "Missing authentication header"

    def test_both_auth_headers_provided(self):
        """Test request with both X-User-Id and X-Api-Key headers"""
        headers = {
            "X-User-Id": "user123",
            "X-Api-Key": "api123"
        }
        response = client.post("/api/v1/check", json={"text": "Hello world"}, headers=headers)
        assert response.status_code == 400
        assert response.json()["detail"] == "Provide either X-User-Id or X-Api-Key, not both"


@pytest.mark.integration
class TestExternalUserFlow:
    """Test external user authentication and usage tracking"""

    def test_invalid_api_key(self, mock_supabase, mock_profanity):
        """Test request with invalid API key"""
        # Mock Supabase response for invalid API key
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        headers = {"X-Api-Key": "invalid_key"}
        response = client.post("/api/v1/check", json={"text": "Hello world"}, headers=headers)
        
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid API key"

    def test_usage_limit_reached(self, mock_supabase, mock_profanity):
        """Test request when usage limit is reached"""
        # Mock Supabase response for valid API key but usage limit reached
        mock_user_data = {
            "id": "ext_user_1",
            "api_key": "valid_key",
            "usage_count": 100,
            "usage_limit": 100
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user_data]
        
        headers = {"X-Api-Key": "valid_key"}
        response = client.post("/api/v1/check", json={"text": "Hello world"}, headers=headers)
        
        assert response.status_code == 429
        assert response.json()["detail"] == "Usage limit reached"

    def test_successful_external_user_request_no_profanity(self, mock_supabase, mock_profanity):
        """Test successful request for external user with no profanity"""
        # Mock Supabase response for valid API key with available usage
        mock_user_data = {
            "id": "ext_user_1",
            "api_key": "valid_key",
            "usage_count": 50,
            "usage_limit": 100
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user_data]
        
        # Mock profanity check
        mock_profanity.contains_profanity.return_value = False
        mock_profanity.censor.return_value = "Hello world"
        
        headers = {"X-Api-Key": "valid_key"}
        response = client.post("/api/v1/check", json={"text": "Hello world"}, headers=headers)
        
        assert response.status_code == 200
        assert response.json() == {
            "contains_profanity": False,
            "censored_text": "Hello world"
        }
        
        # Verify usage count was incremented
        mock_supabase.table.return_value.update.assert_called_with({"usage_count": 51})

    def test_successful_external_user_request_with_profanity(self, mock_supabase, mock_profanity):
        """Test successful request for external user with profanity"""
        # Mock Supabase response for valid API key
        mock_user_data = {
            "id": "ext_user_1",
            "api_key": "valid_key",
            "usage_count": 25,
            "usage_limit": 100
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user_data]
        
        # Mock profanity check
        mock_profanity.contains_profanity.return_value = True
        mock_profanity.censor.return_value = "Hello ****"
        
        headers = {"X-Api-Key": "valid_key"}
        response = client.post("/api/v1/check", json={"text": "Hello shit"}, headers=headers)
        
        assert response.status_code == 200
        assert response.json() == {
            "contains_profanity": True,
            "censored_text": "Hello ****"
        }


@pytest.mark.integration
class TestInternalUserFlow:
    """Test internal user authentication and moderation logging"""

    def test_user_not_found(self, mock_supabase, mock_profanity):
        """Test request with non-existent user ID"""
        # Mock Supabase response for non-existent user
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
        
        headers = {"X-User-Id": "nonexistent_user"}
        response = client.post("/api/v1/check", json={"text": "Hello world"}, headers=headers)
        
        assert response.status_code == 404
        assert response.json()["detail"] == "User not found"

    def test_successful_internal_user_request_no_profanity(self, mock_supabase, mock_profanity):
        """Test successful request for internal user with no profanity"""
        # Mock Supabase response for valid user
        mock_user_data = {
            "user_id": "internal_user_1",
            "reported_count": 0
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user_data]
        
        # Mock profanity check
        mock_profanity.contains_profanity.return_value = False
        mock_profanity.censor.return_value = "Hello world"
        
        headers = {"X-User-Id": "internal_user_1"}
        response = client.post("/api/v1/check", json={"text": "Hello world"}, headers=headers)
        
        assert response.status_code == 200
        assert response.json() == {
            "contains_profanity": False,
            "censored_text": "Hello world"
        }
        
        # Verify no moderation log was created (no profanity detected)
        mock_supabase.table.return_value.insert.assert_not_called()

    def test_successful_internal_user_request_with_profanity(self, mock_supabase, mock_profanity, mock_uuid, mock_datetime):
        """Test successful request for internal user with profanity - should create moderation log"""
        # Mock Supabase response for valid user
        mock_user_data = {
            "user_id": "internal_user_1",
            "reported_count": 2
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user_data]
        
        # Mock profanity check
        mock_profanity.contains_profanity.return_value = True
        mock_profanity.censor.return_value = "Hello ****"
        
        headers = {"X-User-Id": "internal_user_1"}
        response = client.post("/api/v1/check", json={"text": "Hello shit"}, headers=headers)
        
        assert response.status_code == 200
        assert response.json() == {
            "contains_profanity": True,
            "censored_text": "Hello ****"
        }
        
        # Verify moderation log was created
        expected_log_entry = {
            "target_type": "message",
            "target_id": "12345678-1234-1234-1234-123456789abc",
            "reported_user_id": "internal_user_1",
            "reporting_user_id": None,
            "violation_type": "inappropriate_content",
            "violation_description": "Profanity detected in text: 'Hello ****'",
            "severity_level": "low",
            "automated_detection": True,
            "status": "resolved",
            "resolution_action": "content_removal",
            "resolution_notes": "Profanity automatically detected and censored",
            "reviewed_at": "2023-01-01T12:00:00.000000",
            "system_context": {
                "original_text_length": 10,
                "censored_text": "Hello ****",
                "detection_method": "better_profanity"
            }
        }
        
        # Verify the moderation log insert was called
        mock_supabase.table.return_value.insert.assert_called_with(expected_log_entry)
        
        # Verify reported_count was incremented
        mock_supabase.table.return_value.update.assert_called_with({
            "reported_count": 3,
            "updated_at": "2023-01-01T12:00:00.000000"
        })


@pytest.mark.integration
class TestProfanityDetectionIntegration:
    """Test profanity detection functionality through API"""

    @pytest.mark.parametrize("input_text,expected_profanity,expected_censored", [
        ("Hello world", False, "Hello world"),
        ("This is shit", True, "This is ****"),
        ("What the hell", True, "What the ****"),
        ("Clean text here", False, "Clean text here"),
        ("", False, ""),
        ("Multiple bad words shit damn", True, "Multiple bad words **** ****"),
    ])
    def test_profanity_detection_scenarios_via_api(
        self, 
        mock_supabase, 
        mock_profanity, 
        input_text, 
        expected_profanity, 
        expected_censored
    ):
        """Test various profanity detection scenarios through API"""
        # Mock external user for simplicity
        mock_user_data = {
            "id": "ext_user_1",
            "api_key": "valid_key",
            "usage_count": 10,
            "usage_limit": 100
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user_data]
        
        # Mock profanity responses
        mock_profanity.contains_profanity.return_value = expected_profanity
        mock_profanity.censor.return_value = expected_censored
        
        headers = {"X-Api-Key": "valid_key"}
        response = client.post("/api/v1/check", json={"text": input_text}, headers=headers)
        
        assert response.status_code == 200
        assert response.json() == {
            "contains_profanity": expected_profanity,
            "censored_text": expected_censored
        }


@pytest.mark.integration
class TestAPIEdgeCases:
    """Test API edge cases and error scenarios"""

    def test_empty_text_via_api(self, mock_supabase, mock_profanity):
        """Test API request with empty text"""
        # Mock external user
        mock_user_data = {
            "id": "ext_user_1",
            "api_key": "valid_key",
            "usage_count": 10,
            "usage_limit": 100
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user_data]
        
        mock_profanity.contains_profanity.return_value = False
        mock_profanity.censor.return_value = ""
        
        headers = {"X-Api-Key": "valid_key"}
        response = client.post("/api/v1/check", json={"text": ""}, headers=headers)
        
        assert response.status_code == 200
        assert response.json() == {
            "contains_profanity": False,
            "censored_text": ""
        }

    def test_very_long_text_via_api(self, mock_supabase, mock_profanity):
        """Test API request with very long text"""
        long_text = "Hello " * 1000  # 6000 characters
        
        # Mock external user
        mock_user_data = {
            "id": "ext_user_1",
            "api_key": "valid_key",
            "usage_count": 10,
            "usage_limit": 100
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user_data]
        
        mock_profanity.contains_profanity.return_value = False
        mock_profanity.censor.return_value = long_text
        
        headers = {"X-Api-Key": "valid_key"}
        response = client.post("/api/v1/check", json={"text": long_text}, headers=headers)
        
        assert response.status_code == 200
        assert response.json()["contains_profanity"] == False
        assert len(response.json()["censored_text"]) == len(long_text)

    def test_invalid_json_request(self):
        """Test API request with invalid JSON"""
        headers = {"X-Api-Key": "valid_key"}
        response = client.post(
            "/api/v1/check", 
            data="invalid json", 
            headers={**headers, "Content-Type": "application/json"}
        )
        assert response.status_code == 422  # FastAPI validation error

    def test_missing_text_field(self, mock_supabase):
        """Test API request without text field"""
        # Mock external user
        mock_user_data = {
            "id": "ext_user_1",
            "api_key": "valid_key",
            "usage_count": 10,
            "usage_limit": 100
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user_data]
        
        headers = {"X-Api-Key": "valid_key"}
        response = client.post("/api/v1/check", json={}, headers=headers)
        assert response.status_code == 422  # FastAPI validation error

    def test_special_characters_via_api(self, mock_supabase, mock_profanity):
        """Test API request with special characters"""
        special_text = "Hello! @#$%^&*() 你好 🌟"
        
        # Mock external user
        mock_user_data = {
            "id": "ext_user_1",
            "api_key": "valid_key",
            "usage_count": 10,
            "usage_limit": 100
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user_data]
        
        mock_profanity.contains_profanity.return_value = False
        mock_profanity.censor.return_value = special_text
        
        headers = {"X-Api-Key": "valid_key"}
        response = client.post("/api/v1/check", json={"text": special_text}, headers=headers)
        
        assert response.status_code == 200
        assert response.json() == {
            "contains_profanity": False,
            "censored_text": special_text
        }


@pytest.mark.integration
class TestDatabaseInteractionIntegration:
    """Test database interaction scenarios through API"""

    def test_supabase_connection_error_handling(self, mock_supabase, mock_profanity):
        """Test API handling of database connection errors"""
        # Mock Supabase to raise an exception
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("Database connection error")
        
        headers = {"X-Api-Key": "valid_key"}
        
        with pytest.raises(Exception):
            client.post("/api/v1/check", json={"text": "Hello world"}, headers=headers)

    def test_moderation_log_creation_failure_via_api(self, mock_supabase, mock_profanity, mock_uuid, mock_datetime):
        """Test API handling when moderation log creation fails"""
        # Mock internal user
        mock_user_data = {
            "user_id": "internal_user_1",
            "reported_count": 0
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_user_data]
        
        # Mock profanity detection
        mock_profanity.contains_profanity.return_value = True
        mock_profanity.censor.return_value = "Hello ****"
        
        # Mock moderation log insert to fail
        mock_supabase.table.return_value.insert.side_effect = Exception("Insert failed")
        
        headers = {"X-User-Id": "internal_user_1"}
        
        with pytest.raises(Exception):
            client.post("/api/v1/check", json={"text": "Hello shit"}, headers=headers)


@pytest.mark.integration
class TestEndToEndFlows:
    """Test complete end-to-end API flows"""

    def test_complete_external_user_flow_with_usage_tracking(self, mock_supabase, mock_profanity):
        """Test complete flow for external user with usage tracking"""
        # Setup initial user state
        initial_user_data = {
            "id": "ext_user_1",
            "api_key": "valid_key",
            "usage_count": 25,
            "usage_limit": 100
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [initial_user_data]
        
        # Mock profanity detection
        mock_profanity.contains_profanity.return_value = True
        mock_profanity.censor.return_value = "This is ****"
        
        # Make API request
        headers = {"X-Api-Key": "valid_key"}
        response = client.post("/api/v1/check", json={"text": "This is shit"}, headers=headers)
        
        # Verify response
        assert response.status_code == 200
        assert response.json() == {
            "contains_profanity": True,
            "censored_text": "This is ****"
        }
        
        # Verify database interactions
        mock_supabase.table.assert_any_call("external_users")
        mock_supabase.table.return_value.update.assert_called_with({"usage_count": 26})

    def test_complete_internal_user_flow_with_moderation_logging(self, mock_supabase, mock_profanity, mock_uuid, mock_datetime):
        """Test complete flow for internal user with moderation logging"""
        # Setup initial user state
        initial_user_data = {
            "user_id": "internal_user_1",
            "reported_count": 1
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [initial_user_data]
        
        # Mock profanity detection
        mock_profanity.contains_profanity.return_value = True
        mock_profanity.censor.return_value = "Bad ****"
        
        # Make API request
        headers = {"X-User-Id": "internal_user_1"}
        response = client.post("/api/v1/check", json={"text": "Bad word"}, headers=headers)
        
        # Verify response
        assert response.status_code == 200
        assert response.json() == {
            "contains_profanity": True,
            "censored_text": "Bad ****"
        }
        
        # Verify moderation log creation
        mock_supabase.table.assert_any_call("moderation_logs")
        mock_supabase.table.return_value.insert.assert_called()
        
        # Verify user reported count update
        mock_supabase.table.assert_any_call("user_profiles")
        mock_supabase.table.return_value.update.assert_called_with({
            "reported_count": 2,
            "updated_at": "2023-01-01T12:00:00.000000"
        })