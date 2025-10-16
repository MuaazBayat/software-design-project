# conftest.py
# Shared pytest fixtures for core service tests with authentication

import os
import sys
import pytest
from dotenv import load_dotenv

# Add services directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'services'))

# Load environment variables
load_dotenv()

@pytest.fixture(autouse=True)
def mock_auth():
    """
    Automatically override the verify_token dependency for all tests.
    This allows tests to run without needing actual bearer tokens.
    """
    try:
        # Try both import paths
        try:
            from services.core.main import app
        except ImportError:
            try:
                from core.main import app
            except ImportError:
                # Integration tests might use main directly
                import main as core_main
                app = core_main.app

        try:
            from shared.auth import verify_token
        except ImportError:
            import sys
            shared_path = os.path.join(os.path.dirname(__file__), '..', '..', 'services', 'shared')
            sys.path.insert(0, shared_path)
            from auth import verify_token

        # Override verify_token to always return a mock token
        app.dependency_overrides[verify_token] = lambda: "mock-token-for-tests"

        yield

        # Clean up after test
        if verify_token in app.dependency_overrides:
            del app.dependency_overrides[verify_token]
    except Exception as e:
        # If imports fail, skip the override (tests might still work)
        print(f"Warning: Could not override auth: {e}")
        yield

@pytest.fixture
def api_key():
    """Fixture to provide the API key for authenticated requests"""
    key = os.getenv("INTERNAL_API_KEY")
    if not key:
        pytest.skip("INTERNAL_API_KEY not set in environment")
    return key

@pytest.fixture
def auth_headers(api_key):
    """Fixture to provide authentication headers"""
    return {
        "Authorization": f"Bearer {api_key}"
    }