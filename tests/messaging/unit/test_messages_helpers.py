import pytest
from datetime import datetime
import services.messaging.main as module

pytestmark = pytest.mark.unit


def test_format_latest_message_none_returns_none():
    assert module._format_latest_message(None, my_user_id="x") is None


def test_fetch_latest_visible_messages_fastreturn_for_empty():
    out = module._fetch_latest_visible_messages([], now_sa_iso="2025-08-28T10:00:00+02:00")
    assert out == {}


def test_fetch_latest_visible_messages_picks_latest(monkeypatch):
    class Resp:
        def __init__(self, data): self.data = data

    msgs = [
        {"message_id": "m2", "conversation_thread_id": "c1", "message_content": "new", "sender_id": "a",
         "recipient_id": "b", "scheduled_delivery_at": "2025-08-28T10:00:00+02:00", "read_at": None,
         "delivery_status": "sent", "created_at": "2025-08-28T10:00:00+02:00"},
        {"message_id": "m1", "conversation_thread_id": "c1", "message_content": "old", "sender_id": "a",
         "recipient_id": "b", "scheduled_delivery_at": "2025-08-28T09:00:00+02:00", "read_at": None,
         "delivery_status": "sent", "created_at": "2025-08-28T09:00:00+02:00"},
        {"message_id": "m3", "conversation_thread_id": "c2", "message_content": "hey", "sender_id": "x",
         "recipient_id": "y", "scheduled_delivery_at": "2025-08-28T11:00:00+02:00", "read_at": None,
         "delivery_status": "sent", "created_at": "2025-08-28T11:00:00+02:00"},
    ]
    monkeypatch.setattr(module, "_safe_execute", lambda _q: Resp(msgs))

    out = module._fetch_latest_visible_messages(["c1", "c2"], now_sa_iso="2025-08-28T12:00:00+02:00", limit_cap=10)
    assert out["c1"]["message_id"] == "m2"
    assert out["c2"]["message_id"] == "m3"


def test_get_conv_map_for_user_both_roles(monkeypatch):
    class Resp:
        def __init__(self, data): self.data = data

    calls = {"i": 0}
    def fake_safe_execute(_q):
        calls["i"] += 1
        if calls["i"] == 1:
            return Resp([
                {"user_1_id": "me", "user_2_id": "u2", "conversation_thread_id": "c2", "status": "active"}
            ])
        elif calls["i"] == 2:
            return Resp([
                {"user_1_id": "u1", "user_2_id": "me", "conversation_thread_id": "c1", "status": "active"}
            ])
        else:
            pytest.fail("unexpected call order")

    monkeypatch.setattr(module, "_safe_execute", fake_safe_execute)
    out = module._get_conv_map_for_user("me")
    assert out == {"u2": "c2", "u1": "c1"}
