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
    fixed_now = datetime(2025, 8, 28, 10, 0, 0, tzinfo=module.ZoneInfo("Africa/Johannesburg"))
    monkeypatch.setattr(module, "now_in_sa", lambda: fixed_now)

    class Resp:
        def __init__(self, data): self.data = data

    calls = {"i": 0}
    def fake_safe_execute(_q):
        calls["i"] += 1
        if calls["i"] == 1:
            return Resp([])
        elif calls["i"] == 2:
            return Resp(None)
        else:
            pytest.fail("unexpected order")

    monkeypatch.setattr(module, "_safe_execute", fake_safe_execute)

    body = {
        "match_id": "m",
        "sender_id": "s",
        "recipient_id": "r",
        "conversation_thread_id": "c",
        "message_content": "ok",
    }
    r = client.post("/messages", json=body)
    assert r.status_code == 500
    assert r.json()["detail"] == "Failed to insert message"


def test_send_message_omits_letter_styles_when_none(monkeypatch, client):
    fixed_now = datetime(2025, 8, 28, 10, 0, 0, tzinfo=module.ZoneInfo("Africa/Johannesburg"))
    monkeypatch.setattr(module, "now_in_sa", lambda: fixed_now)

    captured = {"payload": None}

    class FakeInsertQuery:
        def execute(self):
            return type("Resp", (), {"data": []})()

    class FakeMessagesTable:
        def select(self, *a, **k): return self
        def eq(self, *a, **k): return self
        def order(self, *a, **k): return self
        def limit(self, *a, **k): return self
        def insert(self, payload):
            captured["payload"] = payload
            return FakeInsertQuery()

    class FakeSupabase:
        def table(self, name): return FakeMessagesTable()

    monkeypatch.setattr(module, "supabase", FakeSupabase())

    class Resp:
        def __init__(self, data): self.data = data

    calls = {"i": 0}
    def fake_safe_execute(_q):
        calls["i"] += 1
        if calls["i"] == 1:
            # no prior sequence
            return Resp([])
        elif calls["i"] == 2:
            # DB echo row (no letter_styles)
            return Resp([{
                "message_id": "z",
                "conversation_thread_id": "c-abc",
                "message_sequence": 1,
                "sender_id": "s",
                "recipient_id": "r",
                "message_content": "ok",
                "scheduled_delivery_at": fixed_now.isoformat(),
            }])
        else:
            pytest.fail("unexpected call order")

    monkeypatch.setattr(module, "_safe_execute", fake_safe_execute)

    body = {
        "match_id": "m",
        "sender_id": "s",
        "recipient_id": "r",
        "conversation_thread_id": "c-abc",
        "message_content": "ok"
        # no letter_styles
    }
    r = client.post("/messages", json=body)
    assert r.status_code == 200

    assert captured["payload"] is not None
    assert "letter_styles" not in captured["payload"]
