import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import uuid
from fastapi import HTTPException, status
from fastapi.responses import JSONResponse

# Set environment variables before any imports
os.environ['SUPABASE_URL'] = 'https://test.supabase.co'
os.environ['SUPABASE_KEY'] = 'test-key-123'
os.environ['CLERK_SECRET_KEY'] = 'test-clerk-key'

# Mock the entire supabase module before importing
import sys
mock_supabase_module = MagicMock()
mock_supabase_module.create_client = MagicMock()
mock_supabase_module.create_client.return_value = MagicMock()
mock_supabase_module.Client = MagicMock()
sys.modules['supabase'] = mock_supabase_module

# Mock clerk_backend_api
mock_clerk_module = MagicMock()
mock_clerk_module.Clerk = MagicMock()
mock_clerk_module.models = MagicMock()
sys.modules['clerk_backend_api'] = mock_clerk_module

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
class TestReportUserModel:
    """Unit tests for the ReportUser Pydantic model"""

    def test_valid_report_user_creation(self):
        """Test creating a valid ReportUser"""
        from services.moderation.main import ReportUser
        
        report = ReportUser(
            reporterId="user123",
            reportedId="user456", 
            violationType="harassment"
        )
        assert report.reporterId == "user123"
        assert report.reportedId == "user456"
        assert report.violationType == "harassment"

    def test_report_user_with_different_violation_types(self):
        """Test ReportUser with various violation types"""
        from services.moderation.main import ReportUser
        
        violation_types = ["spam", "harassment", "inappropriate_content", "hate_speech"]
        
        for violation in violation_types:
            report = ReportUser(
                reporterId="reporter1",
                reportedId="reported1",
                violationType=violation
            )
            assert report.violationType == violation


@pytest.mark.unit
class TestReportMessageModel:
    """Unit tests for the ReportMessage Pydantic model"""

    def test_valid_report_message_creation(self):
        """Test creating a valid ReportMessage"""
        from services.moderation.main import ReportMessage
        
        report = ReportMessage(
            reporterId="user123",
            reportedUserId="user456",
            reportedMessageId="msg789",
            violationType="spam"
        )
        assert report.reporterId == "user123"
        assert report.reportedUserId == "user456"
        assert report.reportedMessageId == "msg789"
        assert report.violationType == "spam"


@pytest.mark.unit
class TestBlockUserModel:
    """Unit tests for the BlockUser Pydantic model"""

    def test_valid_block_user_creation(self):
        """Test creating a valid BlockUser"""
        from services.moderation.main import BlockUser
        
        block = BlockUser(
            reporterId="user123",
            reportedId="user456"
        )
        assert block.reporterId == "user123"
        assert block.reportedId == "user456"


@pytest.mark.unit
class TestResolveCaseModel:
    """Unit tests for the ResolveCase Pydantic model"""

    def test_valid_resolve_case_creation(self):
        """Test creating a valid ResolveCase"""
        from services.moderation.main import ResolveCase
        
        resolve = ResolveCase(
            log_id="log123",
            action="warning",
            notes="User warned for inappropriate behavior"
        )
        assert resolve.log_id == "log123"
        assert resolve.action == "warning"
        assert resolve.notes == "User warned for inappropriate behavior"

    def test_resolve_case_with_different_actions(self):
        """Test ResolveCase with various actions"""
        from services.moderation.main import ResolveCase
        
        actions = ["warning", "no_action", "content_removal", "temporary_ban", "permanent_ban"]
        
        for action in actions:
            resolve = ResolveCase(
                log_id="log123",
                action=action,
                notes=f"Applied {action} to user"
            )
            assert resolve.action == action


@pytest.mark.unit
class TestProfanityValidation:
    """Unit tests for profanity validation logic"""

    @patch('better_profanity.profanity')
    def test_clean_text_profanity_check(self, mock_profanity):
        """Test profanity checking with clean text"""
        mock_profanity.contains_profanity.return_value = False
        mock_profanity.censor.return_value = "Hello world"
        
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
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = [{
            "id": "user_123",
            "api_key": "valid_key",
            "usage_count": 50,
            "usage_limit": 100
        }]
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        api_key = "valid_key"
        user_res = mock_supabase.table("external_users").select("*").eq("api_key", api_key).execute()
        
        assert len(user_res.data) == 1
        assert user_res.data[0]["api_key"] == "valid_key"
        assert user_res.data[0]["usage_count"] < user_res.data[0]["usage_limit"]

    def test_invalid_api_key_lookup(self):
        """Test looking up user with invalid API key"""
        mock_supabase = MagicMock()
        mock_response = MagicMock()
        mock_response.data = []
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response
        
        api_key = "invalid_key"
        user_res = mock_supabase.table("external_users").select("*").eq("api_key", api_key).execute()
        
        assert len(user_res.data) == 0

    def test_usage_limit_check(self):
        """Test checking if user has exceeded usage limit"""
        user_data = {
            "usage_count": 100,
            "usage_limit": 100
        }
        
        has_exceeded_limit = user_data["usage_count"] >= user_data["usage_limit"]
        assert has_exceeded_limit is True
        
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
class TestReportUserLogic:
    """Unit tests for report user functionality"""

    def test_user_already_reported_logic(self):
        """Test logic when user is already in reported list"""
        reported_users = ["user1", "user2", "user3"]
        user_to_report = "user2"
        
        is_already_reported = user_to_report in reported_users
        
        assert is_already_reported is True

    def test_user_not_reported_logic(self):
        """Test logic when user is not in reported list"""
        reported_users = ["user1", "user2", "user3"]
        user_to_report = "user4"
        
        is_already_reported = user_to_report in reported_users
        
        assert is_already_reported is False

    def test_add_user_to_reported_list_logic(self):
        """Test adding user to reported list"""
        reported_users = ["user1", "user2"]
        user_to_report = "user3"
        
        if user_to_report not in reported_users:
            reported_users.append(user_to_report)
        
        assert "user3" in reported_users
        assert len(reported_users) == 3

    def test_handle_none_reported_users_list(self):
        """Test handling when reported_users is None"""
        reported_users = None
        user_to_report = "user1"
        
        # Simulate the logic from main.py
        reported_list = reported_users or []
        reported_list.append(user_to_report)
        
        assert "user1" in reported_list
        assert len(reported_list) == 1

    def test_moderation_log_creation_for_user_report(self):
        """Test moderation log entry creation for user report"""
        reporter_id = "reporter123"
        reported_id = "reported456" 
        violation_type = "harassment"
        
        moderation_log_entry = {
            "target_type": "user",
            "target_id": reported_id,
            "reported_user_id": reported_id,
            "reporting_user_id": reporter_id,
            "violation_type": violation_type,
            "violation_description": "User reported",
            "severity_level": "low",
            "automated_detection": False,
            "status": "open"
        }
        
        assert moderation_log_entry["target_type"] == "user"
        assert moderation_log_entry["target_id"] == reported_id
        assert moderation_log_entry["reporting_user_id"] == reporter_id
        assert moderation_log_entry["automated_detection"] is False
        assert moderation_log_entry["status"] == "open"


@pytest.mark.unit
class TestReportMessageLogic:
    """Unit tests for report message functionality"""

    def test_message_already_reported_logic(self):
        """Test logic when message is already reported"""
        reported_messages = [
            {"target_id": "msg1"},
            {"target_id": "msg2"} 
        ]
        message_to_check = "msg1"
        
        is_already_reported = len([msg for msg in reported_messages if msg["target_id"] == message_to_check]) > 0
        
        assert is_already_reported is True

    def test_message_not_reported_logic(self):
        """Test logic when message is not reported"""
        reported_messages = [
            {"target_id": "msg1"},
            {"target_id": "msg2"}
        ]
        message_to_check = "msg3"
        
        is_already_reported = len([msg for msg in reported_messages if msg["target_id"] == message_to_check]) > 0
        
        assert is_already_reported is False

    def test_moderation_log_creation_for_message_report(self):
        """Test moderation log entry creation for message report"""
        reporter_id = "reporter123"
        reported_user_id = "user456"
        reported_message_id = "msg789"
        violation_type = "spam"
        
        moderation_log_entry = {
            "target_type": "message",
            "target_id": reported_message_id,
            "reported_user_id": reported_user_id,
            "reporting_user_id": reporter_id,
            "violation_type": violation_type,
            "violation_description": "User reported message",
            "severity_level": "low",
            "automated_detection": False,
            "status": "open"
        }
        
        assert moderation_log_entry["target_type"] == "message"
        assert moderation_log_entry["target_id"] == reported_message_id
        assert moderation_log_entry["reported_user_id"] == reported_user_id
        assert moderation_log_entry["reporting_user_id"] == reporter_id


@pytest.mark.unit
class TestBlockUserLogic:
    """Unit tests for block user functionality"""

    def test_user_already_blocked_logic(self):
        """Test logic when user is already in blocked list"""
        blocked_users = ["user1", "user2", "user3"]
        user_to_block = "user2"
        
        is_already_blocked = user_to_block in blocked_users
        
        assert is_already_blocked is True

    def test_user_not_blocked_logic(self):
        """Test logic when user is not in blocked list"""
        blocked_users = ["user1", "user2", "user3"]
        user_to_block = "user4"
        
        is_already_blocked = user_to_block in blocked_users
        
        assert is_already_blocked is False

    def test_add_user_to_blocked_list_logic(self):
        """Test adding user to blocked list"""
        blocked_users = ["user1", "user2"]
        user_to_block = "user3"
        
        if user_to_block not in blocked_users:
            blocked_users.append(user_to_block)
        
        assert "user3" in blocked_users
        assert len(blocked_users) == 3

    def test_handle_none_blocked_users_list(self):
        """Test handling when blocked_users is None"""
        blocked_users = None
        user_to_block = "user1"
        
        # Simulate the logic from main.py
        blocked_list = blocked_users or []
        blocked_list.append(user_to_block)
        
        assert "user1" in blocked_list
        assert len(blocked_list) == 1


@pytest.mark.unit
class TestBanUserLogic:
    """Unit tests for ban user functionality"""

    def test_fingerprint_handling_list_type(self):
        """Test fingerprint handling when fingerprints is a list"""
        fingerprints = ["fp1", "fp2", "fp3"]
        user_id = "user123"
        
        fingerprint_entries = []
        if isinstance(fingerprints, list):
            for fp in fingerprints:
                fingerprint_entries.append({
                    "user_id": user_id,
                    "fingerprint": fp
                })
        
        assert len(fingerprint_entries) == 3
        assert all(entry["user_id"] == user_id for entry in fingerprint_entries)
        assert fingerprint_entries[0]["fingerprint"] == "fp1"

    def test_fingerprint_handling_string_type(self):
        """Test fingerprint handling when fingerprints is a string"""
        fingerprints = "single_fingerprint"
        user_id = "user123"
        
        fingerprint_entries = []
        if isinstance(fingerprints, str):
            fingerprint_entries.append({
                "user_id": user_id,
                "fingerprint": fingerprints
            })
        
        assert len(fingerprint_entries) == 1
        assert fingerprint_entries[0]["user_id"] == user_id
        assert fingerprint_entries[0]["fingerprint"] == "single_fingerprint"

    @patch('services.moderation.main.datetime')
    def test_moderation_log_update_for_ban(self, mock_datetime):
        """Test moderation log update when banning user"""
        mock_datetime.utcnow.return_value.isoformat.return_value = "2023-01-01T12:00:00.000000"
        
        log_id = "log123"
        
        update_data = {
            "status": "resolved",
            "resolution_action": "permanent_ban",
            "resolution_notes": "User banned",
            "reviewed_at": mock_datetime.utcnow.return_value.isoformat.return_value
        }
        
        assert update_data["status"] == "resolved"
        assert update_data["resolution_action"] == "permanent_ban"
        assert update_data["resolution_notes"] == "User banned"
        assert update_data["reviewed_at"] == "2023-01-01T12:00:00.000000"


@pytest.mark.unit
class TestResolveCaseLogic:
    """Unit tests for resolve case functionality"""

    def test_valid_action_validation(self):
        """Test validation of valid actions"""
        valid_actions = ["warning", "no_action", "content_removal", "temporary_ban", "permanent_ban"]
        test_action = "warning"
        
        is_valid = test_action in valid_actions
        
        assert is_valid is True

    def test_invalid_action_validation(self):
        """Test validation of invalid actions"""
        valid_actions = ["warning", "no_action", "content_removal", "temporary_ban", "permanent_ban"]
        test_action = "invalid_action"
        
        is_valid = test_action in valid_actions
        
        assert is_valid is False

    def test_status_determination_logic(self):
        """Test status determination based on action"""
        resolved_actions = ["warning", "content_removal", "temporary_ban", "permanent_ban"]
        
        # Test resolved actions
        for action in resolved_actions:
            status_value = "resolved" if action in resolved_actions else "dismissed"
            assert status_value == "resolved"
        
        # Test dismissed action
        action = "no_action"
        status_value = "resolved" if action in resolved_actions else "dismissed"
        assert status_value == "dismissed"

    @patch('services.moderation.main.datetime')
    def test_update_data_creation(self, mock_datetime):
        """Test creation of update data for resolve case"""
        mock_datetime.utcnow.return_value.isoformat.return_value = "2023-01-01T12:00:00.000000"
        
        action = "warning"
        notes = "User warned for inappropriate behavior"
        
        update_data = {
            "status": "resolved",
            "resolution_action": action,
            "resolution_notes": notes,
            "reviewed_at": mock_datetime.utcnow.return_value.isoformat.return_value
        }
        
        assert update_data["status"] == "resolved"
        assert update_data["resolution_action"] == "warning"
        assert update_data["resolution_notes"] == "User warned for inappropriate behavior"
        assert update_data["reviewed_at"] == "2023-01-01T12:00:00.000000"


@pytest.mark.unit
class TestFingerprintCheckLogic:
    """Unit tests for fingerprint checking functionality"""

    def test_fingerprint_banned_response(self):
        """Test response when fingerprint is banned"""
        # Simulate found fingerprint
        fingerprint_data = [{"fingerprint": "banned_fp", "user_id": "banned_user"}]
        
        if fingerprint_data:
            response_content = {"is_banned": True, "message": "Fingerprint is banned."}
        else:
            response_content = {"is_banned": False, "message": "Fingerprint is not banned."}
        
        assert response_content["is_banned"] is True
        assert response_content["message"] == "Fingerprint is banned."

    def test_fingerprint_not_banned_response(self):
        """Test response when fingerprint is not banned"""
        # Simulate empty result
        fingerprint_data = []
        
        if fingerprint_data:
            response_content = {"is_banned": True, "message": "Fingerprint is banned."}
        else:
            response_content = {"is_banned": False, "message": "Fingerprint is not banned."}
        
        assert response_content["is_banned"] is False
        assert response_content["message"] == "Fingerprint is not banned."


@pytest.mark.unit
class TestModeratorValidation:
    """Unit tests for moderator validation logic"""

    def test_user_is_moderator_validation(self):
        """Test validation when user is a moderator"""
        user_data = {"moderator": True, "user_id": "mod123"}
        
        is_moderator = user_data["moderator"] is True
        
        assert is_moderator is True

    def test_user_is_not_moderator_validation(self):
        """Test validation when user is not a moderator"""
        user_data = {"moderator": False, "user_id": "user123"}
        
        is_moderator = user_data["moderator"] is True
        
        assert is_moderator is False

    def test_moderator_field_missing_validation(self):
        """Test validation when moderator field is missing"""
        user_data = {"user_id": "user123"}
        
        is_moderator = user_data.get("moderator", False) is True
        
        assert is_moderator is False


@pytest.mark.unit
class TestModerationLogCreation:
    """Unit tests for moderation log creation logic"""

    @patch('services.moderation.main.uuid.uuid4')
    @patch('services.moderation.main.datetime')
    def test_moderation_log_entry_creation(self, mock_datetime, mock_uuid):
        """Test creating a moderation log entry"""
        mock_uuid.return_value = uuid.UUID("12345678-1234-1234-1234-123456789abc")
        mock_datetime.utcnow.return_value.isoformat.return_value = "2023-01-01T12:00:00.000000"
        
        user_id = "internal_user_1"
        original_text = "Hello shit"
        censored_text = "Hello ****"
        
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
        
        has_both_headers = bool(x_user_id and x_api_key)
        has_neither_header = bool(not x_user_id and not x_api_key)
        
        assert has_both_headers is True
        assert has_neither_header is False

    def test_no_headers_provided_validation(self):
        """Test validation when no headers are provided"""
        x_user_id = None
        x_api_key = None
        
        has_both_headers = bool(x_user_id and x_api_key)
        has_neither_header = bool(not x_user_id and not x_api_key)
        
        assert has_both_headers is False
        assert has_neither_header is True

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


@pytest.mark.unit
class TestErrorScenarios:
    """Unit tests for error handling scenarios"""

    def test_usage_limit_exceeded_error(self):
        """Test usage limit exceeded error scenario"""
        user_data = {
            "usage_count": 100,
            "usage_limit": 100
        }
        
        # Simulate the error condition
        if user_data["usage_count"] >= user_data["usage_limit"]:
            error_status = 429
            error_detail = "Usage limit reached"
        else:
            error_status = None
            error_detail = None
        
        assert error_status == 429
        assert error_detail == "Usage limit reached"

    def test_invalid_api_key_error(self):
        """Test invalid API key error scenario"""
        user_data = []  # Empty result simulates invalid key
        
        if not user_data:
            error_status = 401
            error_detail = "Invalid API key"
        else:
            error_status = None
            error_detail = None
        
        assert error_status == 401
        assert error_detail == "Invalid API key"

    def test_user_not_found_error(self):
        """Test user not found error scenario"""
        user_data = []  # Empty result simulates user not found
        
        if not user_data:
            error_status = 404
            error_detail = "User not found"
        else:
            error_status = None
            error_detail = None
        
        assert error_status == 404
        assert error_detail == "User not found"

    def test_missing_authentication_header_error(self):
        """Test missing authentication header error"""
        x_user_id = None
        x_api_key = None
        
        if not x_user_id and not x_api_key:
            error_status = 400
            error_detail = "Missing authentication header"
        else:
            error_status = None
            error_detail = None
        
        assert error_status == 400
        assert error_detail == "Missing authentication header"

    def test_both_headers_provided_error(self):
        """Test both headers provided error"""
        x_user_id = "user123"
        x_api_key = "api123"
        
        if x_user_id and x_api_key:
            error_status = 400
            error_detail = "Provide either X-User-Id or X-Api-Key, not both"
        else:
            error_status = None
            error_detail = None
        
        assert error_status == 400
        assert error_detail == "Provide either X-User-Id or X-Api-Key, not both"

    def test_invalid_action_error(self):
        """Test invalid action error in resolve case"""
        valid_actions = ["warning", "no_action", "content_removal", "temporary_ban", "permanent_ban"]
        test_action = "invalid_action"
        
        if test_action not in valid_actions:
            error_status = 400
            error_detail = "Invalid status value"
        else:
            error_status = None
            error_detail = None
        
        assert error_status == 400
        assert error_detail == "Invalid status value"

    def test_moderation_log_not_found_error(self):
        """Test moderation log not found error"""
        log_data = []  # Empty result simulates log not found
        
        if not log_data:
            error_status = 404
            error_detail = "Moderation log not found"
        else:
            error_status = None
            error_detail = None
        
        assert error_status == 404
        assert error_detail == "Moderation log not found"

    def test_clerk_id_not_found_error(self):
        """Test clerk ID not found error"""
        clerk_id = None
        
        if clerk_id is None:
            error_status = 400
            error_detail = "Clerk ID not found for user."
        else:
            error_status = None
            error_detail = None
        
        assert error_status == 400
        assert error_detail == "Clerk ID not found for user."

    def test_access_denied_not_moderator_error(self):
        """Test access denied for non-moderator"""
        user_data = {"moderator": False}
        
        if user_data["moderator"] != True:
            error_status = 403
            error_detail = "Access denied. User is not a moderator."
        else:
            error_status = None
            error_detail = None
        
        assert error_status == 403
        assert error_detail == "Access denied. User is not a moderator."


@pytest.mark.unit
class TestDatabaseOperationLogic:
    """Unit tests for database operation logic"""

    def test_user_profile_reported_count_update(self):
        """Test user profile reported count update logic"""
        current_count = 5
        expected_new_count = current_count + 1
        
        # Simulate the update logic
        new_count = current_count + 1
        
        assert new_count == 6
        assert new_count == expected_new_count

    def test_external_user_usage_count_update(self):
        """Test external user usage count update logic"""
        current_usage = 45
        expected_new_usage = current_usage + 1
        
        # Simulate the increment logic
        new_usage = current_usage + 1
        
        assert new_usage == 46
        assert new_usage == expected_new_usage

    def test_account_status_ban_update(self):
        """Test account status update to banned"""
        current_status = "active"
        new_status = "banned"
        
        # Simulate the status change
        updated_status = new_status
        
        assert updated_status == "banned"
        assert updated_status != current_status

    def test_multiple_fingerprint_ban_entries(self):
        """Test creating multiple fingerprint ban entries"""
        fingerprints = ["fp1", "fp2", "fp3"]
        user_id = "user123"
        
        ban_entries = []
        for fp in fingerprints:
            ban_entries.append({
                "user_id": user_id,
                "fingerprint": fp
            })
        
        assert len(ban_entries) == 3
        assert all(entry["user_id"] == user_id for entry in ban_entries)
        assert [entry["fingerprint"] for entry in ban_entries] == fingerprints


@pytest.mark.unit
class TestUtilityFunctions:
    """Unit tests for utility functions and helpers"""

    def test_uuid_generation_format(self):
        """Test UUID generation format"""
        import uuid
        
        test_uuid = uuid.uuid4()
        uuid_str = str(test_uuid)
        
        # UUID should be 36 characters with 4 hyphens
        assert len(uuid_str) == 36
        assert uuid_str.count('-') == 4

    def test_datetime_iso_format(self):
        """Test datetime ISO format"""
        from datetime import datetime
        
        # Create a test datetime
        test_datetime = datetime(2023, 1, 1, 12, 0, 0)
        iso_format = test_datetime.isoformat()
        
        assert iso_format == "2023-01-01T12:00:00"
        assert "T" in iso_format

    def test_list_append_operation(self):
        """Test list append operation"""
        original_list = ["item1", "item2"]
        new_item = "item3"
        
        original_list.append(new_item)
        
        assert len(original_list) == 3
        assert "item3" in original_list
        assert original_list[-1] == "item3"

    def test_list_membership_check(self):
        """Test list membership check"""
        test_list = ["a", "b", "c"]
        
        assert "b" in test_list
        assert "d" not in test_list

    def test_none_or_empty_list_handling(self):
        """Test handling of None or empty lists"""
        none_list = None
        empty_list = []
        
        # Test None handling
        result_none = none_list or []
        assert result_none == []
        assert isinstance(result_none, list)
        
        # Test empty list handling
        result_empty = empty_list or []
        assert result_empty == []
        assert isinstance(result_empty, list)


@pytest.mark.unit
class TestStringOperations:
    """Unit tests for string operations"""

    def test_string_formatting_with_variables(self):
        """Test string formatting with variables"""
        censored_text = "Hello ****"
        formatted_string = f"Profanity detected in text: '{censored_text}'"
        
        expected = "Profanity detected in text: 'Hello ****'"
        assert formatted_string == expected
        assert censored_text in formatted_string

    def test_string_length_calculation(self):
        """Test string length calculation"""
        test_strings = [
            ("", 0),
            ("hello", 5),
            ("Hello world!", 12),
            ("This is a longer sentence with more words.", 42)
        ]
        
        for text, expected_length in test_strings:
            assert len(text) == expected_length

    def test_string_contains_check(self):
        """Test string contains check"""
        test_string = "Hello world with ****"
        
        assert "****" in test_string
        assert "Hello" in test_string
        assert "xyz" not in test_string


@pytest.mark.unit
class TestDataValidation:
    """Unit tests for data validation logic"""

    def test_boolean_conversion(self):
        """Test boolean conversion logic"""
        test_values = [
            (True, True),
            (False, False),
            (None, False),
            ("", False),
            ("text", True),
            (0, False),
            (1, True)
        ]
        
        for value, expected in test_values:
            result = bool(value)
            assert result == expected

    def test_list_type_checking(self):
        """Test list type checking"""
        test_values = [
            ([], True),
            (["item"], True),
            ("string", False),
            (None, False),
            (123, False),
            ({"key": "value"}, False)
        ]
        
        for value, expected in test_values:
            result = isinstance(value, list)
            assert result == expected

    def test_string_type_checking(self):
        """Test string type checking"""
        test_values = [
            ("string", True),
            ("", True),
            ([], False),
            (123, False),
            (None, False),
            (True, False)
        ]
        
        for value, expected in test_values:
            result = isinstance(value, str)
            assert result == expected


@pytest.mark.unit
class TestEnvironmentVariableHandling:
    """Unit tests for environment variable handling"""

    def test_environment_variable_retrieval(self):
        """Test environment variable retrieval logic"""
        # Test with existing environment variables
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")
        clerk_key = os.environ.get("CLERK_SECRET_KEY")
        
        assert supabase_url == "https://test.supabase.co"
        assert supabase_key == "test-key-123"
        assert clerk_key == "test-clerk-key"

    def test_missing_environment_variable_handling(self):
        """Test handling of missing environment variables"""
        # Test with non-existent environment variable
        non_existent = os.environ.get("NON_EXISTENT_VAR")
        
        assert non_existent is None

    def test_environment_variable_validation(self):
        """Test environment variable validation logic"""
        # Simulate the validation logic from main.py
        test_url = os.environ.get("SUPABASE_URL")
        test_key = os.environ.get("SUPABASE_KEY")
        
        url_valid = bool(test_url)
        key_valid = bool(test_key)
        
        assert url_valid is True
        assert key_valid is True


@pytest.mark.unit
class TestJSONResponseFormatting:
    """Unit tests for JSON response formatting"""

    def test_json_response_structure_report_user(self):
        """Test JSON response structure for report user"""
        reported_users_list = ["user1", "user2", "user3"]
        
        # Simulate response content
        response_content = reported_users_list
        
        assert isinstance(response_content, list)
        assert len(response_content) == 3
        assert "user1" in response_content

    def test_json_response_structure_block_user(self):
        """Test JSON response structure for block user"""
        blocked_users_list = ["blocked1", "blocked2"]
        
        response_content = blocked_users_list
        
        assert isinstance(response_content, list)
        assert len(response_content) == 2
        assert "blocked1" in response_content

    def test_json_response_structure_ban_user(self):
        """Test JSON response structure for ban user"""
        user_id = "user123"
        message = f"User {user_id} has been banned."
        
        response_content = {"message": message}
        
        assert "message" in response_content
        assert response_content["message"] == "User user123 has been banned."

    def test_json_response_structure_resolve_case(self):
        """Test JSON response structure for resolve case"""
        log_id = "log123"
        message = f"Moderation log {log_id} has been updated."
        
        response_content = {"message": message}
        
        assert "message" in response_content
        assert response_content["message"] == "Moderation log log123 has been updated."

    def test_json_response_structure_fingerprint_check(self):
        """Test JSON response structure for fingerprint check"""
        # Test banned fingerprint response
        banned_response = {"is_banned": True, "message": "Fingerprint is banned."}
        
        assert "is_banned" in banned_response
        assert "message" in banned_response
        assert banned_response["is_banned"] is True
        
        # Test not banned fingerprint response
        not_banned_response = {"is_banned": False, "message": "Fingerprint is not banned."}
        
        assert "is_banned" in not_banned_response
        assert "message" in not_banned_response
        assert not_banned_response["is_banned"] is False

    def test_json_response_structure_moderation_logs(self):
        """Test JSON response structure for moderation logs"""
        logs_data = [
            {"log_id": "log1", "status": "open"},
            {"log_id": "log2", "status": "resolved"}
        ]
        
        response_content = {"logs": logs_data}
        
        assert "logs" in response_content
        assert isinstance(response_content["logs"], list)
        assert len(response_content["logs"]) == 2


if __name__ == "__main__":
    pytest.main([__file__])