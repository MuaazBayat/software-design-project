import sys
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os
@pytest.mark.unit  # Add this to unit tests
def test_validation():
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

@patch('services.moderation.main.supabase')
def test_check_profanity_internal_user(mock_supabase):
	# Mock user_profiles found
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
		{"user_id": "user1", "reported_count": 0}
	]
	mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
	# Patch profanity
	with patch('services.moderation.main.profanity') as mock_profanity:
		mock_profanity.contains_profanity.return_value = True
		mock_profanity.censor.return_value = "censored text"
		resp = client.post("/api/v1/check", json={"text": "badword"}, headers={"X-User-Id": "user1"})
		assert resp.status_code == 200
		assert resp.json()["contains_profanity"] is True
		assert resp.json()["censored_text"] == "censored text"

@patch('services.moderation.main.supabase')
def test_check_profanity_external_user(mock_supabase):
	# Mock external_users found
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
		{"id": "ext1", "usage_count": 0, "usage_limit": 10}
	]
	mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
	with patch('services.moderation.main.profanity') as mock_profanity:
		mock_profanity.contains_profanity.return_value = False
		mock_profanity.censor.return_value = "clean text"
		resp = client.post("/api/v1/check", json={"text": "hello"}, headers={"X-Api-Key": "apikey"})
		assert resp.status_code == 200
		assert resp.json()["contains_profanity"] is False

@patch('services.moderation.main.supabase')
def test_report_user_new_report(mock_supabase):
	# Mock user_profiles with no reported users
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
		{"reported_users": []}
	]
	mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
		{"reported_users": ["user2"]}
	]
	mock_supabase.rpc.return_value.execute.return_value = MagicMock()
	mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()
	resp = client.post("/api/v1/report-user", json={"reporterId": "user1", "reportedId": "user2", "violationType": "spam"})
	assert resp.status_code == 201
	assert "user2" in resp.json()

@patch('services.moderation.main.supabase')
def test_report_user_already_reported(mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
		{"reported_users": ["user2"]}
	]
	resp = client.post("/api/v1/report-user", json={"reporterId": "user1", "reportedId": "user2", "violationType": "spam"})
	assert resp.status_code == 200
	assert resp.json() == ["user2"]

@patch('services.moderation.main.supabase')
def test_report_message_new(mock_supabase):
	# No previous report
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
	mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()
	resp = client.post("/api/v1/report-message", json={"reporterId": "user1", "reportedUserId": "user2", "reportedMessageId": "msg1", "violationType": "spam"})
	assert resp.status_code == 200
	assert resp.json()["target_id"] == "msg1"

@patch('services.moderation.main.supabase')
def test_report_message_already_reported(mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
		{"target_id": "msg1"}
	]
	resp = client.post("/api/v1/report-message", json={"reporterId": "user1", "reportedUserId": "user2", "reportedMessageId": "msg1", "violationType": "spam"})
	assert resp.status_code == 200
	assert resp.json()[0]["target_id"] == "msg1"

@patch('services.moderation.main.supabase')
def test_block_user_new(mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
		{"blocked_users": []}
	]
	mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
		{"blocked_users": ["user2"]}
	]
	resp = client.post("/api/v1/block-user", json={"reporterId": "user1", "reportedId": "user2"})
	assert resp.status_code == 201
	assert "user2" in resp.json()

@patch('services.moderation.main.supabase')
def test_block_user_already_blocked(mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
		{"blocked_users": ["user2"]}
	]
	resp = client.post("/api/v1/block-user", json={"reporterId": "user1", "reportedId": "user2"})
	assert resp.status_code == 200
	assert resp.json() == ["user2"]

@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_ban_user_success(mock_clerk, mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
		MagicMock(data=[{"log_id": "log1", "reported_user_id": "user1"}]),
		MagicMock(data=[{"user_id": "user1", "clerk_id": "clerk1", "fingerprint": ["fp1"]}])
	]
	mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
	mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()
	mock_clerk.users.ban.return_value = True
	resp = client.post("/api/v1/ban-user/log1")
	assert resp.status_code == 200
	assert "has been banned" in resp.json()["message"]

@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_ban_user_log_not_found(mock_clerk, mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
	resp = client.post("/api/v1/ban-user/log404")
	assert resp.status_code == 404
	assert resp.json()["detail"] == "Moderation log not found"

@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_ban_user_user_not_found(mock_clerk, mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
		MagicMock(data=[{"log_id": "log1", "reported_user_id": "user1"}]),
		MagicMock(data=[])
	]
	resp = client.post("/api/v1/ban-user/log1")
	assert resp.status_code == 404
	assert resp.json()["detail"] == "User not found"

@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_ban_user_clerk_id_missing(mock_clerk, mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
		MagicMock(data=[{"log_id": "log1", "reported_user_id": "user1"}]),
		MagicMock(data=[{"user_id": "user1"}])
	]
	resp = client.post("/api/v1/ban-user/log1")
	assert resp.status_code == 400
	assert resp.json()["detail"] == "Clerk ID not found for user."

@patch('services.moderation.main.supabase')
@patch('services.moderation.main.clerk')
def test_ban_user_clerk_ban_error(mock_clerk, mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
		MagicMock(data=[{"log_id": "log1", "reported_user_id": "user1"}]),
		MagicMock(data=[{"user_id": "user1", "clerk_id": "clerk1", "fingerprint": []}])
	]
	mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
	mock_supabase.table.return_value.insert.return_value.execute.return_value = MagicMock()
	mock_clerk.users.ban.side_effect = Exception("clerk error")
	resp = client.post("/api/v1/ban-user/log1")
	assert resp.status_code == 502
	assert resp.json()["detail"] == "clerk error"

@patch('services.moderation.main.clerk')
def test_ban_clerk_user_success(mock_clerk):
	mock_clerk.users.ban.return_value = True
	resp = client.post("/api/v1/ban-clerk-user/clerk1")
	assert resp.status_code == 200
	assert "Clerk user clerk1 has been banned." in resp.json()["message"]

@patch('services.moderation.main.clerk')
def test_ban_clerk_user_error(mock_clerk):
	mock_clerk.users.ban.side_effect = Exception("ban error")
	resp = client.post("/api/v1/ban-clerk-user/clerk1")
	assert resp.status_code == 502
	assert resp.json()["detail"] == "ban error"

@patch('services.moderation.main.supabase')
def test_resolve_case_success(mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
		{"log_id": "log1"}
	]
	mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
	resp = client.post("/api/v1/resolve-case", json={"log_id": "log1", "action": "warning", "notes": "warned"})
	assert resp.status_code == 200
	assert "has been updated" in resp.json()["message"]

@patch('services.moderation.main.supabase')
def test_resolve_case_invalid_action(mock_supabase):
	resp = client.post("/api/v1/resolve-case", json={"log_id": "log1", "action": "bad", "notes": "nope"})
	assert resp.status_code == 400
	assert resp.json()["detail"] == "Invalid status value"

@patch('services.moderation.main.supabase')
def test_resolve_case_log_not_found(mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
	resp = client.post("/api/v1/resolve-case", json={"log_id": "log404", "action": "warning", "notes": "warned"})
	assert resp.status_code == 404
	assert resp.json()["detail"] == "Moderation log not found"

@patch('services.moderation.main.supabase')
def test_check_fingerprint_banned(mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
		{"fingerprint": "fp1"}
	]
	resp = client.get("/api/v1/fingerprint/fp1")
	assert resp.status_code == 200
	assert resp.json()["is_banned"] is True

@patch('services.moderation.main.supabase')
def test_check_fingerprint_not_banned(mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
	resp = client.get("/api/v1/fingerprint/fp2")
	assert resp.status_code == 200
	assert resp.json()["is_banned"] is False

@patch('services.moderation.main.supabase')
def test_get_moderation_logs_success(mock_supabase):
	# User is moderator
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
		MagicMock(data=[{"user_id": "mod1", "moderator": True}])
	]
	mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value.data = [
		{"log_id": "log1"}, {"log_id": "log2"}
	]
	resp = client.get("/api/v1/logs", headers={"X-User-Id": "mod1"})
	assert resp.status_code == 200
	assert "logs" in resp.json()
	assert len(resp.json()["logs"]) == 2

@patch('services.moderation.main.supabase')
def test_get_moderation_logs_no_user(mock_supabase):
	resp = client.get("/api/v1/logs")
	assert resp.status_code == 400
	assert resp.json()["detail"] == "Missing X-User-Id header"

@patch('services.moderation.main.supabase')
def test_get_moderation_logs_user_not_found(mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
	resp = client.get("/api/v1/logs", headers={"X-User-Id": "mod1"})
	assert resp.status_code == 404
	assert resp.json()["detail"] == "User not found"

@patch('services.moderation.main.supabase')
def test_get_moderation_logs_not_moderator(mock_supabase):
	mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
		{"user_id": "mod1", "moderator": False}
	]
	resp = client.get("/api/v1/logs", headers={"X-User-Id": "mod1"})
	assert resp.status_code == 403
	assert resp.json()["detail"] == "Access denied. User is not a moderator."
