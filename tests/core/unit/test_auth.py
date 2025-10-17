"""
Unit tests for core/auth.py module
Tests the verify_token function with various scenarios
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials


@pytest.mark.unit
def test_validation():
    """Marker test for unit test discovery"""
    assert True


@pytest.mark.unit
def test_verify_token_auth_disabled():
    """Test that verify_token returns 'no-auth' when AUTH_ENABLED is false"""
    with patch("services.core.auth.AUTH_ENABLED", False):
        from services.core.auth import verify_token
        
        # Should succeed without credentials when auth is disabled
        result = verify_token(None)
        assert result == "no-auth"
        
        # Should also succeed with credentials but ignore them
        mock_creds = Mock(spec=HTTPAuthorizationCredentials)
        mock_creds.credentials = "some-token"
        result = verify_token(mock_creds)
        assert result == "no-auth"


@pytest.mark.unit
def test_verify_token_missing_credentials():
    """Test that verify_token raises 403 when credentials are missing and auth is enabled"""
    with patch("services.core.auth.AUTH_ENABLED", True):
        from services.core.auth import verify_token
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token(None)
        
        assert exc_info.value.status_code == 403
        assert "Authentication required" in exc_info.value.detail


@pytest.mark.unit
def test_verify_token_no_clerk_secret():
    """Test that verify_token raises 500 when CLERK_SECRET_KEY is not set"""
    with patch("services.core.auth.AUTH_ENABLED", True), \
         patch("services.core.auth.CLERK_SECRET_KEY", None):
        from services.core.auth import verify_token
        
        mock_creds = Mock(spec=HTTPAuthorizationCredentials)
        mock_creds.credentials = "some-token"
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token(mock_creds)
        
        assert exc_info.value.status_code == 500
        assert "Server authentication not configured" in exc_info.value.detail


@pytest.mark.unit
def test_verify_token_with_clerk_import_error():
    """Test that verify_token handles clerk module import errors gracefully"""
    with patch("services.core.auth.AUTH_ENABLED", True), \
         patch("services.core.auth.CLERK_SECRET_KEY", "test-secret-key"):
        
        from services.core.auth import verify_token
        
        mock_creds = Mock(spec=HTTPAuthorizationCredentials)
        mock_creds.credentials = "some-token"
        
        # Mock the import of clerk_backend_api to raise ImportError
        with patch("builtins.__import__", side_effect=ImportError("No module named 'clerk_backend_api'")):
            # If clerk library isn't installed, it should raise 401 due to import error
            with pytest.raises(HTTPException) as exc_info:
                verify_token(mock_creds)
            
            assert exc_info.value.status_code == 401
            assert "Invalid authentication credentials" in exc_info.value.detail

