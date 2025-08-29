import pytest
import services.messaging.main as module

pytestmark = pytest.mark.integration


def test_search_route_wrapper_executes(monkeypatch):
    # Covers the wrapper function line explicitly
    fixed_now = module.datetime(2025, 8, 28, 10, 0, 0, tzinfo=module.ZoneInfo("Africa/Johannesburg"))
    monkeypatch.setattr(module, "now_in_sa", lambda: fixed_now)

    # stub helpers so wrapper runs
    monkeypatch.setattr(module, "_get_conv_map_for_user", lambda uid: {"u": "c"})
    monkeypatch.setattr(module, "_search_active_profiles_fts", lambda ids, **kw: [
        {"user_id": "u", "anonymous_handle": "alpha", "account_status": "active"},
    ])
    monkeypatch.setattr(
        module, "_fetch_latest_visible_messages",
        lambda conv_ids, now_iso, limit_cap=1000: {"c": {
            "message_id": "m", "conversation_thread_id": "c", "message_content": "x",
            "sender_id": "u", "recipient_id": "me", "scheduled_delivery_at": now_iso, "read_at": None
        }}
    )
    out = module.search(module.SearchUsers(anonymous_handle="", my_user_id="me", limit=10, offset=0))
    assert out["count"] == 1
