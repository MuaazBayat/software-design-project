import os
import sys
import types
import pathlib
import pytest
import services.messaging.main as loaded_module  # only to get the real path

pytestmark = pytest.mark.integration


def _exec_main_with_env(monkeypatch, **env):
    """
    Re-exec services/messaging/main.py in an isolated namespace with patched env
    and a stubbed supabase module so we don't need real creds.
    Returns the namespace dict.
    """
    # Patch environment
    for k in ("SUPABASE_URL", "SUPABASE_KEY", "FRONTEND_URL"):
        if k in env:
            monkeypatch.setenv(k, env[k])
        else:
            monkeypatch.delenv(k, raising=False)

    # Stub supabase so `from supabase import create_client, Client` is safe
    fake_supabase = types.SimpleNamespace(
        Client=type("FakeClient", (), {}),
        create_client=lambda *a, **k: "FAKE_CLIENT",
    )
    monkeypatch.setitem(sys.modules, "supabase", fake_supabase)

    # Load and exec the real source with the real filename so coverage maps lines
    path = pathlib.Path(loaded_module.__file__)
    code = compile(path.read_text(encoding="utf-8"), str(path), "exec")
    ns = {}
    exec(code, ns, ns)
    return ns


def test_import_guard_raises_without_env(monkeypatch):
    # 1) Remove env so the guard can trigger
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_KEY", raising=False)

    # 2) Stub dotenv.load_dotenv to NO-OP so it doesn't repopulate from .env files
    fake_dotenv = types.SimpleNamespace(load_dotenv=lambda *a, **k: False)
    monkeypatch.setitem(sys.modules, "dotenv", fake_dotenv)

    # 3) (Optional) stub supabase so import is cheap, not required for the guard but harmless
    fake_supabase = types.SimpleNamespace(
        Client=type("FakeClient", (), {}),
        create_client=lambda *a, **k: "FAKE_CLIENT",
    )
    monkeypatch.setitem(sys.modules, "supabase", fake_supabase)

    # 4) Exec the module source with proper builtins so imports/classes work
    path = pathlib.Path(loaded_module.__file__)
    src = path.read_text(encoding="utf-8")
    code = compile(src, str(path), "exec")
    g = {"__builtins__": __builtins__}
    with pytest.raises(RuntimeError) as ei:
        exec(code, g, g)
    assert "Missing SUPABASE_URL or SUPABASE_KEY" in str(ei.value)


def test_cors_frontend_url_is_appended(monkeypatch):
    # Ensures the ALLOWED_ORIGINS.append(...) line is executed
    ns = _exec_main_with_env(
        monkeypatch,
        SUPABASE_URL="http://dummy",
        SUPABASE_KEY="dummy",
        FRONTEND_URL="https://example.app",
    )
    assert ns["ALLOWED_ORIGINS"][-1] == "https://example.app"
    # sanity: app and supabase were created without touching network
    assert ns["supabase"] == "FAKE_CLIENT"
    assert ns["app"].title.startswith("Simple Messages API")


def test_send_message_letter_styles_line_is_hit(monkeypatch):
    # Hits the exact line that copies letter_styles into payload
    ns = _exec_main_with_env(
        monkeypatch,
        SUPABASE_URL="http://dummy",
        SUPABASE_KEY="dummy",
        FRONTEND_URL="",
    )
    module = types.SimpleNamespace(**ns)

    # Fake supabase.table to capture insert payload
    captured = {"payload": None}

    class FakeInsert:
        def execute(self):
            return type("Resp", (), {"data": [{
                "message_id": "id",
                "conversation_thread_id": "c",
                "message_sequence": 1,
                "sender_id": "s",
                "recipient_id": "r",
                "message_content": "ok",
                "scheduled_delivery_at": "2025-08-28T10:00:00+02:00",
                "letter_styles": {"font_size": 12, "font_family": "A"},
            }]})()

    class FakeMessages:
        def select(self, *a, **k): return self
        def eq(self, *a, **k): return self
        def order(self, *a, **k): return self
        def limit(self, *a, **k): return self
        def insert(self, payload):
            captured["payload"] = payload
            return FakeInsert()

    class FakeSupabase:
        def table(self, name):
            assert name == "messages"
            return FakeMessages()

    # patch supabase + time + safe execute
    monkeypatch.setitem(ns, "supabase", FakeSupabase())
    module.supabase = FakeSupabase()

    fixed_now = loaded_module.datetime(2025, 8, 28, 10, 0, 0, tzinfo=loaded_module.ZoneInfo("Africa/Johannesburg"))
    monkeypatch.setitem(ns, "now_in_sa", lambda: fixed_now)
    module.now_in_sa = lambda: fixed_now

    class Resp:
        def __init__(self, data): self.data = data

    calls = {"i": 0}
    def fake_safe_execute(_q):
        calls["i"] += 1
        if calls["i"] == 1:
            return Resp([])  # no existing sequence
        elif calls["i"] == 2:
            # handled inside FakeInsert.execute above via returned echo
            return Resp([{
                "message_id": "id",
                "conversation_thread_id": "c",
                "message_sequence": 1,
                "sender_id": "s",
                "recipient_id": "r",
                "message_content": "ok",
                "scheduled_delivery_at": fixed_now.isoformat(),
                "letter_styles": {"font_size": 12, "font_family": "A"},
            }])
        else:
            pytest.fail("unexpected call order")

    monkeypatch.setitem(ns, "_safe_execute", fake_safe_execute)
    module._safe_execute = fake_safe_execute

    # call the endpoint function directly
    body = ns["MessageCreate"](
        match_id="m",
        sender_id="s",
        recipient_id="r",
        conversation_thread_id="c",
        message_content="ok",
        letter_styles=ns["LetterStyles"](font_size=12, font_family="A"),
    )
    out = ns["send_message"](body)
    assert out["message_sequence"] == 1
    # prove the letter_styles line executed
    assert captured["payload"]["letter_styles"] == {"font_size": 12, "font_family": "A"}
