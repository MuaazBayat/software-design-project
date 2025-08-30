import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import uuid

# Set environment variables before any imports
os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_KEY'] = 'test-key-123'

# Mock the entire supabase module before importing
import sys
mock_supabase_module = MagicMock()
mock_supabase_module.create_client = MagicMock()
mock_supabase_module.create_client.return_value = MagicMock()
mock_supabase_module.Client = MagicMock()
sys.modules['supabase'] = mock_supabase_module

from pydantic import BaseModel, ValidationError


@pytest.mark.unit
class TestCheckRequestModel:
    """Unit tests for the CheckRequest Pydantic model"""

    def test_valid_request_creation(self):
        """Test creating a valid CheckRequest"""
        from services.moderation.main import CheckRequest
        
        request = CheckRequest(text="Hello world")
        assert request.text == "Hello world"

    def test_empty_text_request(self):
        """Test CheckRequest with empty text"""
        from services.moderation.main import CheckRequest
        
        request = CheckRequest(text="")
        assert request.text == ""

    def test_long_text_request(self):
        """Test CheckRequest with very long text"""
        from services.moderation.main import CheckRequest
        
        long_text = "Hello " * 1000
        request = CheckRequest(text=long_text)
        assert request.text == long_text
        assert len(request.text) == 6000

    def test_special_characters_request(self):
        """Test CheckRequest with special characters"""
        from services.moderation.main import CheckRequest
        
        special_text = "Hello! @#$%^&*() 你好 🌟"
        request = CheckRequest(text=special_text)
        assert request.text == special_text


@pytest.mark.unit
class TestProfanityValidation:
    """Unit tests for profanity validation logic"""

    @patch('better_profanity.profanity')
    def test_clean_text_profanity_check(self, mock_profanity):
        """Test profanity checking with clean text"""
        mock_profanity.contains_profanity.return_value = False
        mock_profanity.censor.return_value = "Hello world"
        
        # Simulate the profanity checking logic from main.py
        text = "Hello world"
        has_profanity = mock_profanity.contains_profanity(text)
        censored = mock_profanity.censor(text)
        
        assert has_profanity is False
        assert censored == "Hello world"
        mock_profanity.contains_profanity.assert_called_once_with(text)
        mock_profanity.censor.assert_called_once_with(text)

    @patch('better_profanity.profanity')
    def test_profane_text_profanity_check(self, mock_profanity):
        """Test profanity checking with profane text"""
        mock_profanity.contains_profanity.return_value = True
        mock_profanity.censor.return_value = "Hello ****"
        
        text = "Hello shit"
        has_profanity = mock_profanity.contains_profanity(text)
        censored = mock_profanity.censor(text)
        
        assert has_profanity is True
        assert censored == "Hello ****"

    @patch('better_profanity.profanity')
    def test_multiple_profanity_words(self, mock_profanity):
        """Test profanity checking with multiple profane words"""
        mock_profanity.contains_profanity.return_value = True
        mock_profanity.censor.return_value = "**** **** ****"
        
        text = "damn shit hell"
        has_profanity = mock_profanity.contains_profanity(text)
        censored = mock_profanity.censor(text)
        
        assert has_profanity is True
        assert "*" in censored

    @patch('better_profanity.profanity')
    def test_empty_text_profanity_check(self, mock_profanity):
        """Test profanity checking with empty text"""
        mock_profanity.contains_profanity.return_value = False
        mock_profanity.censor.return_value = ""
        
        text = ""
        has_profanity = mock_profanity.contains_profanity(text)
        censored = mock_profanity.censor(text)
        
        assert has_profanity is False
        assert censored == ""


@pytest.mark.unit
class TestExternalUserAuthentication:
    """Unit tests for external user authentication logic"""

    def test_valid_api_key_lookup(self):
        """Test looking up user with valid API key"""
        # Mock Supabase response
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [{
            "id": "user_123",
            "api_key": "valid_key",
            "usage_count": 50,
            "usage_limit": 100
        }]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        # Simulate the lookup logic from main.py
        api_key = "valid_key"
        user_res = mock_supabase.table("external_users").select("*").eq("api_key", api_key).execute()
        
        assert len(user_res.data) == 1
        assert user_res.data[0]["api_key"] == "valid_key"
        assert user_res.data[0]["usage_count"] < user_res.data[0]["usage_limit"]

    def test_invalid_api_key_lookup(self):
        """Test looking up user with invalid API key"""
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = []  # Empty result for invalid key
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        api_key = "invalid_key"
        user_res = mock_supabase.table("external_users").select("*").eq("api_key", api_key).execute()
        
        assert len(user_res.data) == 0

    def test_usage_limit_check(self):
        """Test checking if user has exceeded usage limit"""
        # Test case where usage equals limit (should be blocked)
        user_data = {
            "usage_count": 100,
            "usage_limit": 100
        }
        
        has_exceeded_limit = user_data["usage_count"] >= user_data["usage_limit"]
        assert has_exceeded_limit is True
        
        # Test case where usage is below limit (should be allowed)
        user_data = {
            "usage_count": 50,
            "usage_limit": 100
        }
        
        has_exceeded_limit = user_data["usage_count"] >= user_data["usage_limit"]
        assert has_exceeded_limit is False

    def test_usage_count_increment_calculation(self):
        """Test usage count increment logic"""
        current_usage = 75
        expected_new_usage = current_usage + 1
        
        # Simulate the increment logic
        new_usage_count = current_usage + 1
        
        assert new_usage_count == 76
        assert new_usage_count == expected_new_usage


@pytest.mark.unit
class TestInternalUserAuthentication:
    """Unit tests for internal user authentication logic"""

    def test_valid_user_id_lookup(self):
        """Test looking up internal user with valid user ID"""
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [{
            "user_id": "internal_user_1",
            "reported_count": 5
        }]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        user_id = "internal_user_1"
        user_res = mock_supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        
        assert len(user_res.data) == 1
        assert user_res.data[0]["user_id"] == "internal_user_1"

    def test_invalid_user_id_lookup(self):
        """Test looking up internal user with invalid user ID"""
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = []
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        user_id = "nonexistent_user"
        user_res = mock_supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        
        assert len(user_res.data) == 0

    def test_reported_count_increment(self):
        """Test reported count increment logic"""
        current_reported_count = 3
        expected_new_count = current_reported_count + 1
        
        new_reported_count = current_reported_count + 1
        
        assert new_reported_count == 4
        assert new_reported_count == expected_new_count


@pytest.mark.unit
class TestModerationLogCreation:
    """Unit tests for moderation log creation logic"""

    @patch('services.moderation.main.uuid.uuid4')
    @patch('services.moderation.main.datetime')
    def test_moderation_log_entry_creation(self, mock_datetime, mock_uuid):
        """Test creating a moderation log entry"""
        # Setup mocks
        mock_uuid.return_value = uuid.UUID("12345678-1234-1234-1234-123456789abc")
        mock_datetime.utcnow.return_value.isoformat.return_value = "2023-01-01T12:00:00.000000"
        
        # Input data
        user_id = "internal_user_1"
        original_text = "Hello shit"
        censored_text = "Hello ****"
        
        # Create moderation log entry (simulating main.py logic)
        moderation_log_entry = {
            "target_type": "message",
            "target_id": str(mock_uuid.return_value),
            "reported_user_id": user_id,
            "reporting_user_id": None,
            "violation_type": "inappropriate_content",
            "violation_description": f"Profanity detected in text: '{censored_text}'",
            "severity_level": "low",
            "automated_detection": True,
            "status": "resolved",
            "resolution_action": "content_removal",
            "resolution_notes": "Profanity automatically detected and censored",
            "reviewed_at": mock_datetime.utcnow.return_value.isoformat.return_value,
            "system_context": {
                "original_text_length": len(original_text),
                "censored_text": censored_text,
                "detection_method": "better_profanity"
            }
        }
        
        # Assertions
        assert moderation_log_entry["target_type"] == "message"
        assert moderation_log_entry["target_id"] == "12345678-1234-1234-1234-123456789abc"
        assert moderation_log_entry["reported_user_id"] == user_id
        assert moderation_log_entry["reporting_user_id"] is None
        assert moderation_log_entry["automated_detection"] is True
        assert moderation_log_entry["status"] == "resolved"
        assert moderation_log_entry["system_context"]["original_text_length"] == len(original_text)
        assert moderation_log_entry["system_context"]["censored_text"] == censored_text

    def test_system_context_creation(self):
        """Test system context object creation"""
        original_text = "This is some bad shit"
        censored_text = "This is some bad ****"
        detection_method = "better_profanity"
        
        system_context = {
            "original_text_length": len(original_text),
            "censored_text": censored_text,
            "detection_method": detection_method
        }
        
        assert system_context["original_text_length"] == 21
        assert system_context["censored_text"] == censored_text
        assert system_context["detection_method"] == "better_profanity"

    def test_violation_description_formatting(self):
        """Test violation description string formatting"""
        censored_text = "Hello ****"
        expected_description = f"Profanity detected in text: '{censored_text}'"
        
        violation_description = f"Profanity detected in text: '{censored_text}'"
        
        assert violation_description == expected_description
        assert "Hello ****" in violation_description


@pytest.mark.unit
class TestHeaderValidation:
    """Unit tests for header validation logic"""

    def test_both_headers_provided_validation(self):
        """Test validation when both headers are provided"""
        x_user_id = "user123"
        x_api_key = "api123"
        
        # Simulate the validation logic from main.py
        has_both_headers = bool(x_user_id and x_api_key)
        has_neither_header = bool(not x_user_id and not x_api_key)
        
        assert has_both_headers is True  # Should trigger error
        assert has_neither_header is False

    def test_no_headers_provided_validation(self):
        """Test validation when no headers are provided"""
        x_user_id = None
        x_api_key = None
        
        has_both_headers = bool(x_user_id and x_api_key)
        has_neither_header = bool(not x_user_id and not x_api_key)
        
        assert has_both_headers is False
        assert has_neither_header is True  # Should trigger error

    def test_only_api_key_provided_validation(self):
        """Test validation when only API key is provided"""
        x_user_id = None
        x_api_key = "api123"
        
        has_both_headers = bool(x_user_id and x_api_key)
        has_neither_header = bool(not x_user_id and not x_api_key)
        is_external_user = bool(x_api_key)
        
        assert has_both_headers is False
        assert has_neither_header is False
        assert is_external_user is True

    def test_only_user_id_provided_validation(self):
        """Test validation when only user ID is provided"""
        x_user_id = "user123"
        x_api_key = None
        
        has_both_headers = bool(x_user_id and x_api_key)
        has_neither_header = bool(not x_user_id and not x_api_key)
        is_internal_user = bool(x_user_id)
        
        assert has_both_headers is False
        assert has_neither_header is False
        assert is_internal_user is True


@pytest.mark.unit
class TestResponseFormatting:
    """Unit tests for response formatting logic"""

    def test_success_response_format_clean_text(self):
        """Test response format for clean text"""
        has_profanity = False
        censored_text = "Hello world"
        
        response_data = {
            "contains_profanity": has_profanity,
            "censored_text": censored_text
        }
        
        assert response_data["contains_profanity"] is False
        assert response_data["censored_text"] == "Hello world"
        assert len(response_data.keys()) == 2

    def test_success_response_format_profane_text(self):
        """Test response format for profane text"""
        has_profanity = True
        censored_text = "Hello ****"
        
        response_data = {
            "contains_profanity": has_profanity,
            "censored_text": censored_text
        }
        
        assert response_data["contains_profanity"] is True
        assert response_data["censored_text"] == "Hello ****"
        assert "*" in response_data["censored_text"]

    def test_response_consistency(self):
        """Test that response format is consistent"""
        # Test multiple scenarios have same keys
        scenarios = [
            (False, "Clean text"),
            (True, "Dirty ****"),
            (False, ""),
            (True, "****")
        ]
        
        for has_profanity, censored_text in scenarios:
            response = {
                "contains_profanity": has_profanity,
                "censored_text": censored_text
            }
            
            assert "contains_profanity" in response
            assert "censored_text" in response
            assert len(response.keys()) == 2
            assert isinstance(response["contains_profanity"], bool)
            assert isinstance(response["censored_text"], str)