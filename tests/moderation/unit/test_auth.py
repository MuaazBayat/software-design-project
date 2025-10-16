import os
import sys
import importlib
import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

# Set environment variables for testing before imports
os.environ["SUPABASE_URL"] = "test"
os.environ["SUPABASE_KEY"] = "test"

# Mock external dependencies before importing auth module
sys.modules['clerk_backend_api'] = MagicMock()
sys.modules['clerk_backend_api.security'] = MagicMock()
sys.modules['clerk_backend_api.security.types'] = MagicMock()


class TestAuthModule:
    """Test suite for the moderation service authentication module."""

    def setup_method(self):
        """Setup method run before each test."""
        # Clean up auth module to force re-import
        if 'services.moderation.auth' in sys.modules:
            del sys.modules['services.moderation.auth']

    def teardown_method(self):
        """Cleanup method run after each test."""
        # Clean up any module imports for fresh testing
        if 'services.moderation.auth' in sys.modules:
            del sys.modules['services.moderation.auth']

    @patch.dict(os.environ, {'ENABLE_AUTH': 'false'}, clear=False)
    def test_auth_disabled_allows_all_requests(self):
        """Test that when auth is disabled, all requests are allowed."""
        from services.moderation.auth import verify_token
        
        # Test with no credentials
        result = verify_token(None)
        assert result == "no-auth"
        
        # Test with valid credentials (should still return no-auth)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="some-token")
        result = verify_token(credentials)
        assert result == "no-auth"

    @patch.dict(os.environ, {'ENABLE_AUTH': 'true', 'CLERK_SECRET_KEY': 'test-secret'}, clear=False)
    def test_auth_enabled_requires_credentials(self):
        """Test that when auth is enabled, credentials are required."""
        from services.moderation.auth import verify_token
        
        # Test with no credentials should raise exception
        with pytest.raises(HTTPException) as exc_info:
            verify_token(None)
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Authentication required" in exc_info.value.detail
        assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}

    @patch.dict(os.environ, {'ENABLE_AUTH': 'true'}, clear=False)
    def test_auth_enabled_without_secret_key_raises_error(self):
        """Test that auth enabled without secret key raises server error."""
        # Ensure CLERK_SECRET_KEY is not set for this test
        original_value = os.environ.get('CLERK_SECRET_KEY')
        if 'CLERK_SECRET_KEY' in os.environ:
            del os.environ['CLERK_SECRET_KEY']
        
        try:
            from services.moderation.auth import verify_token
            
            credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="some-token")
            
            with pytest.raises(HTTPException) as exc_info:
                verify_token(credentials)
            
            assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
            assert "Server authentication not configured" in exc_info.value.detail
        finally:
            # Restore original value
            if original_value is not None:
                os.environ['CLERK_SECRET_KEY'] = original_value

    @patch.dict(os.environ, {'ENABLE_AUTH': 'true', 'CLERK_SECRET_KEY': 'test-secret'}, clear=False)
    def test_valid_token_returns_user_id(self):
        """Test that a valid token returns the user ID."""
        # Mock the clerk_backend_api functions
        mock_authenticate_request = MagicMock()
        mock_request_state = MagicMock()
        mock_request_state.is_signed_in = True
        mock_request_state.user_id = "clerk_user_123"
        mock_authenticate_request.return_value = mock_request_state
        
        mock_auth_options = MagicMock()
        
        # Patch the sys.modules to include our mocks
        sys.modules['clerk_backend_api'].authenticate_request = mock_authenticate_request
        sys.modules['clerk_backend_api.security.types'].AuthenticateRequestOptions = mock_auth_options
        
        from services.moderation.auth import verify_token
        
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="valid-token")
        result = verify_token(credentials)
        
        assert result == "clerk_user_123"
        mock_authenticate_request.assert_called_once()

    @patch.dict(os.environ, {'ENABLE_AUTH': 'true', 'CLERK_SECRET_KEY': 'test-secret'}, clear=False)
    def test_invalid_token_raises_unauthorized(self):
        """Test that an invalid token raises unauthorized exception."""
        # Mock the clerk_backend_api functions
        mock_authenticate_request = MagicMock()
        mock_request_state = MagicMock()
        mock_request_state.is_signed_in = False
        mock_authenticate_request.return_value = mock_request_state
        
        mock_auth_options = MagicMock()
        
        # Patch the sys.modules to include our mocks
        sys.modules['clerk_backend_api'].authenticate_request = mock_authenticate_request
        sys.modules['clerk_backend_api.security.types'].AuthenticateRequestOptions = mock_auth_options
        
        from services.moderation.auth import verify_token
        
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid-token")
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token(credentials)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid or expired token" in exc_info.value.detail
        assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}

    @patch.dict(os.environ, {'ENABLE_AUTH': 'true', 'CLERK_SECRET_KEY': 'test-secret'}, clear=False)
    def test_token_without_user_id_raises_unauthorized(self):
        """Test that a token without user_id raises unauthorized exception."""
        # Mock the clerk_backend_api functions
        mock_authenticate_request = MagicMock()
        mock_request_state = MagicMock()
        mock_request_state.is_signed_in = True
        mock_request_state.user_id = None
        mock_authenticate_request.return_value = mock_request_state
        
        mock_auth_options = MagicMock()
        
        # Patch the sys.modules to include our mocks
        sys.modules['clerk_backend_api'].authenticate_request = mock_authenticate_request
        sys.modules['clerk_backend_api.security.types'].AuthenticateRequestOptions = mock_auth_options
        
        from services.moderation.auth import verify_token
        
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="token-no-userid")
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token(credentials)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid token: missing user identifier" in exc_info.value.detail
        assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}

    @patch.dict(os.environ, {'ENABLE_AUTH': 'true', 'CLERK_SECRET_KEY': 'test-secret'}, clear=False)
    def test_clerk_exception_raises_unauthorized(self):
        """Test that Clerk API exceptions are handled and raise unauthorized."""
        # Mock the clerk_backend_api functions
        mock_authenticate_request = MagicMock()
        mock_authenticate_request.side_effect = Exception("Clerk API error")
        
        mock_auth_options = MagicMock()
        
        # Patch the sys.modules to include our mocks
        sys.modules['clerk_backend_api'].authenticate_request = mock_authenticate_request
        sys.modules['clerk_backend_api.security.types'].AuthenticateRequestOptions = mock_auth_options
        
        from services.moderation.auth import verify_token
        
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="error-token")
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token(credentials)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid authentication credentials: Clerk API error" in exc_info.value.detail
        assert exc_info.value.headers == {"WWW-Authenticate": "Bearer"}

    @patch.dict(os.environ, {'ENABLE_AUTH': 'true', 'CLERK_SECRET_KEY': 'test-secret'}, clear=False)
    def test_http_exception_is_re_raised(self):
        """Test that HTTPExceptions from internal logic are re-raised."""
        # Mock the clerk_backend_api functions
        mock_authenticate_request = MagicMock()
        http_exc = HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Custom HTTP error"
        )
        mock_authenticate_request.side_effect = http_exc
        
        mock_auth_options = MagicMock()
        
        # Patch the sys.modules to include our mocks
        sys.modules['clerk_backend_api'].authenticate_request = mock_authenticate_request
        sys.modules['clerk_backend_api.security.types'].AuthenticateRequestOptions = mock_auth_options
        
        from services.moderation.auth import verify_token
        
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="http-error-token")
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token(credentials)
        
        # Should re-raise the original HTTPException
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert exc_info.value.detail == "Custom HTTP error"

    @patch.dict(os.environ, {'ENABLE_AUTH': 'true', 'CLERK_SECRET_KEY': 'test-secret'}, clear=False)
    def test_mock_request_object_created_correctly(self):
        """Test that the MockRequest object is created with correct headers."""
        # Mock the clerk_backend_api functions
        mock_authenticate_request = MagicMock()
        mock_request_state = MagicMock()
        mock_request_state.is_signed_in = True
        mock_request_state.user_id = "test_user"
        mock_authenticate_request.return_value = mock_request_state
        
        mock_auth_options = MagicMock()
        mock_options_instance = MagicMock()
        mock_auth_options.return_value = mock_options_instance
        
        # Patch the sys.modules to include our mocks
        sys.modules['clerk_backend_api'].authenticate_request = mock_authenticate_request
        sys.modules['clerk_backend_api.security.types'].AuthenticateRequestOptions = mock_auth_options
        
        from services.moderation.auth import verify_token
        
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="test-token")
        verify_token(credentials)
        
        # Check that authenticate_request was called with proper arguments
        mock_authenticate_request.assert_called_once()
        call_args = mock_authenticate_request.call_args
        
        # Verify the mock request object
        mock_request = call_args[0][0]  # First positional argument
        assert mock_request.headers["Authorization"] == "Bearer test-token"
        assert mock_request.cookies == {}
        assert mock_request.url == ""
        
        # Verify the options object
        options = call_args[0][1]  # Second positional argument
        assert options == mock_options_instance
        mock_auth_options.assert_called_once_with(secret_key='test-secret')


class TestEnvironmentVariableHandling:
    """Test suite for environment variable handling in auth module."""

    def setup_method(self):
        """Setup method run before each test."""
        # Clean up auth module to force re-import
        if 'services.moderation.auth' in sys.modules:
            del sys.modules['services.moderation.auth']

    def teardown_method(self):
        """Cleanup method run after each test."""
        # Clean up any module imports for fresh testing
        if 'services.moderation.auth' in sys.modules:
            del sys.modules['services.moderation.auth']

    def test_enable_auth_variations(self):
        """Test various values for ENABLE_AUTH environment variable."""
        test_cases = [
            ("true", True),
            ("TRUE", True),
            ("True", True),
            ("1", True),
            ("yes", True),
            ("YES", True),
            ("false", False),
            ("FALSE", False),
            ("False", False),
            ("0", False),
            ("no", False),
            ("NO", False),
            ("", False),
            ("invalid", False),
        ]
        
        for env_value, expected_result in test_cases:
            with patch.dict(os.environ, {'ENABLE_AUTH': env_value}, clear=False):
                if 'services.moderation.auth' in sys.modules:
                    del sys.modules['services.moderation.auth']
                
                from services.moderation.auth import AUTH_ENABLED
                assert AUTH_ENABLED == expected_result, f"ENABLE_AUTH='{env_value}' should result in AUTH_ENABLED={expected_result}"

    def test_enable_auth_not_set(self):
        """Test behavior when ENABLE_AUTH environment variable is not set."""
        # Temporarily remove ENABLE_AUTH if it exists
        original_value = os.environ.get('ENABLE_AUTH')
        if 'ENABLE_AUTH' in os.environ:
            del os.environ['ENABLE_AUTH']
        
        try:
            if 'services.moderation.auth' in sys.modules:
                del sys.modules['services.moderation.auth']
            
            from services.moderation.auth import AUTH_ENABLED
            assert AUTH_ENABLED is False
        finally:
            # Restore original value
            if original_value is not None:
                os.environ['ENABLE_AUTH'] = original_value

    def test_clerk_secret_key_from_environment(self):
        """Test that CLERK_SECRET_KEY is correctly read from environment."""
        test_secret = "test-clerk-secret-123"
        with patch.dict(os.environ, {'CLERK_SECRET_KEY': test_secret}, clear=False):
            if 'services.moderation.auth' in sys.modules:
                del sys.modules['services.moderation.auth']
            
            from services.moderation.auth import CLERK_SECRET_KEY
            assert CLERK_SECRET_KEY == test_secret

    def test_missing_clerk_secret_key(self):
        """Test behavior when CLERK_SECRET_KEY is not set."""
        # Temporarily remove CLERK_SECRET_KEY if it exists
        original_value = os.environ.get('CLERK_SECRET_KEY')
        if 'CLERK_SECRET_KEY' in os.environ:
            del os.environ['CLERK_SECRET_KEY']
        
        try:
            if 'services.moderation.auth' in sys.modules:
                del sys.modules['services.moderation.auth']
            
            from services.moderation.auth import CLERK_SECRET_KEY
            assert CLERK_SECRET_KEY is None
        finally:
            # Restore original value
            if original_value is not None:
                os.environ['CLERK_SECRET_KEY'] = original_value


# Integration test to verify the entire auth flow works together
class TestAuthIntegration:
    """Integration tests for the auth module."""

    def setup_method(self):
        """Setup method run before each test."""
        # Clean up auth module to force re-import
        if 'services.moderation.auth' in sys.modules:
            del sys.modules['services.moderation.auth']

    def teardown_method(self):
        """Cleanup method run after each test."""
        # Clean up any module imports for fresh testing
        if 'services.moderation.auth' in sys.modules:
            del sys.modules['services.moderation.auth']

    @patch.dict(os.environ, {'ENABLE_AUTH': 'false'}, clear=False)
    def test_disabled_auth_integration(self):
        """Integration test for disabled authentication flow."""
        from services.moderation.auth import verify_token, AUTH_ENABLED
        
        assert AUTH_ENABLED is False
        
        # Should work with no credentials
        result = verify_token(None)
        assert result == "no-auth"
        
        # Should work with any credentials
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="any-token")
        result = verify_token(credentials)
        assert result == "no-auth"

    @patch.dict(os.environ, {'ENABLE_AUTH': 'true', 'CLERK_SECRET_KEY': 'secret'}, clear=False)
    def test_enabled_auth_integration(self):
        """Integration test for enabled authentication flow."""
        # Mock the clerk_backend_api functions
        mock_authenticate_request = MagicMock()
        mock_request_state = MagicMock()
        mock_request_state.is_signed_in = True
        mock_request_state.user_id = "integration_user_123"
        mock_authenticate_request.return_value = mock_request_state
        
        mock_auth_options = MagicMock()
        
        # Patch the sys.modules to include our mocks
        sys.modules['clerk_backend_api'].authenticate_request = mock_authenticate_request
        sys.modules['clerk_backend_api.security.types'].AuthenticateRequestOptions = mock_auth_options
        
        from services.moderation.auth import verify_token, AUTH_ENABLED
        
        assert AUTH_ENABLED is True
        
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="valid-integration-token")
        result = verify_token(credentials)
        
        assert result == "integration_user_123"
        
        # Verify the full call chain
        mock_authenticate_request.assert_called_once()
        call_args = mock_authenticate_request.call_args
        mock_request = call_args[0][0]
        options = call_args[0][1]
        
        assert mock_request.headers["Authorization"] == "Bearer valid-integration-token"
        assert hasattr(options, 'secret_key')