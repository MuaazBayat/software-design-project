# services/core/tests/unit/test_get_supabase.py
import importlib

def test_get_supabase_returns_module_singleton(monkeypatch):
    # If your database module constructs a client at import time and needs env vars,
    # set safe dummy values *before* importing the module so import doesn't explode.
    monkeypatch.setenv("SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("SUPABASE_KEY", "testing-only-not-real")

    main = importlib.import_module("services.core.main")  # change path if needed

    # Replace the module-level 'supabase' with a sentinel, then ensure get_supabase returns it
    sentinel = object()
    monkeypatch.setattr(main, "supabase", sentinel, raising=False)

    assert main.get_supabase() is sentinel
