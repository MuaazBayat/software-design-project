import pytest
from datetime import datetime
from fastapi.testclient import TestClient
import services.messaging.main as module

pytestmark = pytest.mark.integration


@pytest.fixture
def client():
    return TestClient(module.app)


def test_message_content_too_long_422(client):
    body = {
        "match_id": "m",
        "sender_id": "s",
        "recipient_id": "r",
        "conversation_thread_id": "c",
        "message_content": "x" * 5001,
    }
    r = client.post("/messages", json=body)
    assert r.status_code == 422


def test_send_message_insert_failure(monkeypatch, client):
    """
    New flow:
      1) _get_active_match_and_thread() -> returns ids (we stub it)
      2) _next_sequence() -> _safe_execute(...) returns []
      3) insert(...) -> _safe_execute(...) returns None  => 500
    """
    fixed_now = datetime(2025, 8, 28, 10, 0, 0, tzinfo=module.ZoneInfo("Africa/Johannesburg"))
    monkeypatch.setattr(module, "now_in_sa", lambda: fixed_now)

    # Stub conversation/thread resolution so we don't hit match_records
    monkeypatch.setattr(
        module,
        "_get_active_match_and_thread",
        lambda x, y: {"match_id": "m", "conversation_thread_id": "c"},
    )

    class Resp:
        def __init__(self, data): self.data = data

    calls = {"i": 0}
    def fake_safe_execute(_q):
        calls["i"] += 1
        if calls["i"] == 1:
            # next_sequence -> no prior rows
            return Resp([])
        elif calls["i"] == 2:
            # insert -> DB returned no data (simulate failure)
            return Resp(None)
        else:
            pytest.fail("unexpected order")

    monkeypatch.setattr(module, "_safe_execute", fake_safe_execute)

    body = {
        "sender_id": "s",
        "recipient_id": "r",
        "message_content": "ok",
    }
    r = client.post("/messages", json=body)
    assert r.status_code == 500
    assert r.json()["detail"] == "Failed to insert message"


def test_send_message_omits_letter_styles_when_none(monkeypatch, client):
    """
    Ensure payload sent to insert(...) does not include 'letter_styles' when it is not provided.
    """
    fixed_now = datetime(2025, 8, 28, 10, 0, 0, tzinfo=module.ZoneInfo("Africa/Johannesburg"))
    monkeypatch.setattr(module, "now_in_sa", lambda: fixed_now)

    # Stub conversation/thread resolution
    monkeypatch.setattr(
        module,
        "_get_active_match_and_thread",
        lambda x, y: {"match_id": "m", "conversation_thread_id": "c-abc"},
    )

    captured = {"payload": None}

    class FakeInsertQuery:
        def execute(self):
            # Echo a row as PostgREST would (without letter_styles)
            return type("Resp", (), {"data": [{
                "message_id": "z",
                "conversation_thread_id": "c-abc",
                "message_sequence": 1,
                "sender_id": "s",
                "recipient_id": "r",
                "message_content": "ok",
                "scheduled_delivery_at": fixed_now.isoformat(),
            }]})()

    class FakeMessagesTable:
        def select(self, *a, **k): return self
        def eq(self, *a, **k): return self
        def order(self, *a, **k): return self
        def limit(self, *a, **k): return self
        def insert(self, payload):
            captured["payload"] = payload
            return FakeInsertQuery()

    class FakeSupabase:
        def table(self, name):  # only 'messages' is used here due to stub above
            return FakeMessagesTable()

    monkeypatch.setattr(module, "supabase", FakeSupabase())

    class Resp:
        def __init__(self, data): self.data = data

    calls = {"i": 0}
    def fake_safe_execute(_q):
        calls["i"] += 1
        if calls["i"] == 1:
            # next_sequence -> no existing sequence
            return Resp([])
        elif calls["i"] == 2:
            # insert echo handled by FakeInsertQuery.execute()
            return Resp([{"ok": True}])  # value not used; just keep call count aligned
        else:
            pytest.fail("unexpected call order")

    monkeypatch.setattr(module, "_safe_execute", fake_safe_execute)

    body = {
        "sender_id": "s",
        "recipient_id": "r",
        "message_content": "ok"
        # no letter_styles
    }
    r = client.post("/messages", json=body)
    assert r.status_code == 200

    assert captured["payload"] is not None
    assert "letter_styles" not in captured["payload"]