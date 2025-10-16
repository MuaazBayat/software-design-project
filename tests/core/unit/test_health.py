"""
Unit tests for health endpoint in core service
"""
import pytest
from fastapi.testclient import TestClient
from types import SimpleNamespace
from unittest.mock import Mock, patch


@pytest.mark.unit
def test_validation():
    """Marker test for unit test discovery"""
    assert True


class FakeSupabaseClient:
    """Minimal fake Supabase client for health check tests"""
    def __init__(self, should_fail=False, raise_exception=False):
        self.should_fail = should_fail
        self.raise_exception = raise_exception
    
    def table(self, name: str):
        return self
    
    def select(self, *args, **kwargs):
        return self
    
    def limit(self, n):
        return self
    
    def execute(self):
        if self.raise_exception:
            raise Exception("Database connection error")
        return SimpleNamespace(data=[])


@pytest.fixture(autouse=True)
def clear_dep_overrides():
    """Ensure dependency overrides don't leak across tests"""
    import services.core.main as main
    main.app.dependency_overrides.clear()
    yield
    main.app.dependency_overrides.clear()


@pytest.mark.unit
def test_health_check_healthy():
    """Test health endpoint returns healthy status when database is accessible"""
    import services.core.main as main
    
    fake_db = FakeSupabaseClient()
    
    with patch.object(main, "supabase", fake_db):
        client = TestClient(main.app)
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["supabase_connected"] is True
        assert data["profiles_table_accessible"] is True


@pytest.mark.unit
def test_health_check_no_supabase():
    """Test health endpoint returns unhealthy when Supabase client is None"""
    import services.core.main as main
    
    with patch.object(main, "supabase", None):
        client = TestClient(main.app)
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unhealthy"
        assert "Supabase client not initialized" in data["error"]


@pytest.mark.unit
def test_health_check_database_error():
    """Test health endpoint returns unhealthy when database operation fails"""
    import services.core.main as main
    
    fake_db = FakeSupabaseClient(raise_exception=True)
    
    with patch.object(main, "supabase", fake_db):
        client = TestClient(main.app)
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unhealthy"
        assert "error" in data
        assert data["supabase_connected"] is True

