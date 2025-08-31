# tests/messaging/unit/test_moop.py
import sys
import types
import importlib
from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

# Point to your real module
MODULE_PATH = "services.messaging.main"


# ---------------------------
# Test fixtures
# ---------------------------
@pytest.fixture(scope="function")
def app_module(monkeypatch):
    """
    Import services.messaging.main with:
      - SUPABASE_* env set
      - a fully MagicMock'd 'supabase' module injected into sys.modules
      - create_client() returns a MagicMock client
    """
    # Env so import passes the guard
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "service-role-key")
    monkeypatch.setenv("NEXT_PUBLIC_FRONTEND_URL", "http://localhost:8000")

    # Ensure project root is importable
    monkeypatch.syspath_prepend(".")

    # Build a fake supabase module and inject BEFORE import
    sys.modules.pop("supabase", None)
    fake_supabase = types.ModuleType("supabase")
    fake_supabase.Client = MagicMock(name="Client")
    mock_client = MagicMock(name="SupabaseClient")
    fake_supabase.create_client = MagicMock(return_value=mock_client)
    sys.modules["supabase"] = fake_supabase

    # Import fresh
    sys.modules.pop(MODULE_PATH, None)
    mod = importlib.import_module(MODULE_PATH)

    # Expose the mock client so tests can configure table() behavior
    mod._TEST_SUPABASE_CLIENT = mock_client
    return mod


@pytest.fixture()
def client(app_module):
    return TestClient(app_module.app)


def _make_query_mock(data=None, *, side_effect=None):
    q = MagicMock(name="Query")
    q._limit_val = None

    # chainable methods
    for m in ("select", "or_", "eq", "order", "in_", "lte", "lt",
              "single", "insert", "text_search", "filter", "ilike"):
        getattr(q, m).return_value = q

    # record limit
    def _limit(n):
        q._limit_val = n
        return q
    q.limit.side_effect = _limit

    q.not_ = MagicMock()
    q.not_.is_.return_value = q

    if side_effect is not None:
        q.execute.side_effect = side_effect
    else:
        def _exec():
            out = data
            if isinstance(out, list) and q._limit_val is not None:
                out = out[:q._limit_val]
            resp = MagicMock()
            resp.data = out
            return resp
        q.execute.side_effect = _exec

    return q


# ---------------------------
# /health
# ---------------------------
def test_health_magicmock(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}


# ---------------------------
# /messages (POST)
# ---------------------------
def test_messages_create_success_magicmock(client, app_module, monkeypatch):
    fixed_now = datetime(2025, 8, 30, 10, 0, 0)
    monkeypatch.setattr(app_module, "now_in_sa", lambda: fixed_now)

    # 1) match_records -> row exists with thread id
    q_match = _make_query_mock(data=[{
        "match_id": "mid-1",
        "conversation_thread_id": "thread-1",
        "status": "active"
    }])

    # 2) messages (sequence) -> last sequence 7
    q_seq = _make_query_mock(data=[{"message_sequence": 7}])

    # 3) messages (insert) -> inserted row
    inserted = [{
        "message_id": "msg-123",
        "match_id": "mid-1",
        "sender_id": "uA",
        "recipient_id": "uB",
        "conversation_thread_id": "thread-1",
        "message_sequence": 8,
        "message_content": "Hello",
        "scheduled_delivery_at": (fixed_now + timedelta(hours=12)).isoformat(),
    }]
    q_insert = _make_query_mock(data=inserted)

    # Wire table() call sequence for this handler
    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q_match, q_seq, q_insert]

    payload = {
        "sender_id": "uA",
        "recipient_id": "uB",
        "message_content": "Hello",
        "letter_styles": {"font_size": 14, "font_family": "Inter"},
    }

    r = client.post("/messages", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["message_id"] == "msg-123"
    assert body["message_sequence"] == 8
    assert body["scheduled_delivery_at"] == (fixed_now + timedelta(hours=12)).isoformat()

    # Assert table call order & args
    calls = app_module._TEST_SUPABASE_CLIENT.table.call_args_list
    assert calls[0].args[0] == "match_records"
    assert calls[1].args[0] == "messages"
    assert calls[2].args[0] == "messages"


def test_messages_create_no_active_match_magicmock(client, app_module, monkeypatch):
    fixed_now = datetime(2025, 8, 30, 10, 0, 0)
    monkeypatch.setattr(app_module, "now_in_sa", lambda: fixed_now)

    q_match = _make_query_mock(data=[])  # no rows
    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q_match]

    r = client.post("/messages", json={
        "sender_id": "uX", "recipient_id": "uY", "message_content": "Hi"
    })
    assert r.status_code == 404
    assert r.json()["detail"] == "No active match between users."


def test_messages_create_null_thread_magicmock(client, app_module, monkeypatch):
    fixed_now = datetime(2025, 8, 30, 10, 0, 0)
    monkeypatch.setattr(app_module, "now_in_sa", lambda: fixed_now)

    q_match = _make_query_mock(data=[{"match_id": "mid-1", "conversation_thread_id": None, "status": "active"}])
    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q_match]

    r = client.post("/messages", json={"sender_id": "a", "recipient_id": "b", "message_content": "Yo"})
    assert r.status_code == 409
    assert "conversation_thread_id is NULL" in r.json()["detail"]


def test_messages_create_validation_422_magicmock(client):
    r = client.post("/messages", json={"sender_id": "a", "recipient_id": "b", "message_content": ""})
    assert r.status_code == 422


# ---------------------------
# /messages/page (POST)
# ---------------------------
def test_messages_page_with_cursor_magicmock(client, app_module, monkeypatch):
    fixed_now = datetime(2025, 8, 30, 12, 0, 0)
    monkeypatch.setattr(app_module, "now_in_sa", lambda: fixed_now)

    # 2) page fetch (base q -> later executed)
    rows = [{
        "message_id": "m3",
        "conversation_thread_id": "thread-1",
        "message_content": "older",
        "created_at": "2025-08-30T09:59:00+02:00",
        "scheduled_delivery_at": "2025-08-30T09:30:00+02:00",
    }]
    q_page = _make_query_mock(data=rows)

    # 1) lookup last_message_id -> single row (dict)
    q_last = _make_query_mock(data={"created_at": "2025-08-30T10:00:00+02:00"})

    # Order matters: base q first, then the single() lookup
    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q_page, q_last]

    r = client.post("/messages/page", json={
        "conversation_thread_id": "thread-1",
        "page_size": 2,
        "last_message_id": "m2",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 1
    assert body["items"][0]["message_id"] == "m3"
    assert body["next_cursor"] == "m3"
    assert body["has_more"] is False


def test_messages_page_last_cursor_not_found_magicmock(client, app_module):
    q_base = _make_query_mock(data=[])          # base q (never executed, but consumed by table() call #1)
    q_last = _make_query_mock(data=None)        # single() lookup returns no data -> 404

    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q_base, q_last]

    r = client.post("/messages/page", json={
        "conversation_thread_id": "thread-1",
        "page_size": 5,
        "last_message_id": "nope",
    })
    assert r.status_code == 404
    assert r.json()["detail"] == "last_message_id not found"



def test_messages_page_filters_future_by_sa_magicmock(client, app_module, monkeypatch):
    fixed_now = datetime(2025, 8, 30, 12, 0, 0)
    monkeypatch.setattr(app_module, "now_in_sa", lambda: fixed_now)

    visible = [{
        "message_id": "past",
        "conversation_thread_id": "thread-1",
        "message_content": "visible",
        "created_at": "2025-08-30T10:00:00+02:00",
        "scheduled_delivery_at": "2025-08-30T11:59:59+02:00",
    }]
    q_page = _make_query_mock(data=visible)
    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q_page]

    r = client.post("/messages/page", json={
        "conversation_thread_id": "thread-1",
        "page_size": 10,
    })
    assert r.status_code == 200
    body = r.json()
    assert [it["message_id"] for it in body["items"]] == ["past"]


def test_messages_page_cursor_flow_magicmock(client, app_module, monkeypatch):
    fixed_now = datetime(2025, 8, 30, 12, 0, 0)
    monkeypatch.setattr(app_module, "now_in_sa", lambda: fixed_now)

    # First page: 3 rows returned from DB (N+1), handler returns 2 and sets next_cursor='m3'
    q_page1 = _make_query_mock(data=[
        {"message_id": "m5", "conversation_thread_id": "thread-1",
         "message_content": "newest", "created_at": "2025-08-30T10:59:00+02:00",
         "scheduled_delivery_at": "2025-08-30T10:59:00+02:00"},
        {"message_id": "m4", "conversation_thread_id": "thread-1",
         "message_content": "older", "created_at": "2025-08-30T10:58:00+02:00",
         "scheduled_delivery_at": "2025-08-30T10:58:00+02:00"},
        {"message_id": "m3", "conversation_thread_id": "thread-1",
         "message_content": "overflow", "created_at": "2025-08-30T10:57:00+02:00",
         "scheduled_delivery_at": "2025-08-30T10:57:00+02:00"},
    ])
    # Second page fetch will:
    #  - look up last_message_id='m3' to get its created_at (single())
    #  - then query for items strictly older than that timestamp
    q_lookup = _make_query_mock(data={"created_at": "2025-08-30T10:57:00+02:00"})
    q_page2 = _make_query_mock(data=[
        {"message_id": "m2", "conversation_thread_id": "thread-1",
         "message_content": "older-2", "created_at": "2025-08-30T10:56:00+02:00",
         "scheduled_delivery_at": "2025-08-30T10:56:00+02:00"},
        {"message_id": "m1", "conversation_thread_id": "thread-1",
         "message_content": "older-3", "created_at": "2025-08-30T10:55:00+02:00",
         "scheduled_delivery_at": "2025-08-30T10:55:00+02:00"},
    ])

    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q_page1, q_page2, q_lookup]

    # Page 1
    r1 = client.post("/messages/page", json={"conversation_thread_id": "thread-1", "page_size": 2})
    assert r1.status_code == 200
    b1 = r1.json()
    assert [it["message_id"] for it in b1["items"]] == ["m5", "m4"]
    assert b1["has_more"] is True
    assert b1["next_cursor"] == "m4"

    # Page 2 using the cursor
    r2 = client.post("/messages/page", json={
        "conversation_thread_id": "thread-1",
        "page_size": 2,
        "last_message_id": b1["next_cursor"],
    })
    assert r2.status_code == 200
    b2 = r2.json()
    assert [it["message_id"] for it in b2["items"]] == ["m2", "m1"]  # strictly older; no overlap


def test_messages_page_zero_size_422_magicmock(client):
    r = client.post("/messages/page", json={"conversation_thread_id": "t1", "page_size": 0})
    assert r.status_code == 422


def test_messages_page_with_last_cursor_window_magicmock(client, app_module, monkeypatch):
    fixed_now = datetime(2025, 8, 30, 12, 0, 0)
    monkeypatch.setattr(app_module, "now_in_sa", lambda: fixed_now)

    # Base page query (older than last cursor) returns two items
    rows = [
        {
            "message_id": "m9",
            "conversation_thread_id": "thread-1",
            "message_content": "older-1",
            "created_at": "2025-08-30T09:59:00+02:00",
            "scheduled_delivery_at": "2025-08-30T09:59:00+02:00",
        },
        {
            "message_id": "m8",
            "conversation_thread_id": "thread-1",
            "message_content": "older-2",
            "created_at": "2025-08-30T09:58:00+02:00",
            "scheduled_delivery_at": "2025-08-30T09:58:00+02:00",
        },
    ]
    q_page = _make_query_mock(data=rows)

    # Lookup the last_message_id -> created_at 10:00
    q_last = _make_query_mock(data={"created_at": "2025-08-30T10:00:00+02:00"})

    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q_page, q_last]

    r = client.post("/messages/page", json={
        "conversation_thread_id": "thread-1",
        "page_size": 5,
        "last_message_id": "m10",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 2
    assert [it["message_id"] for it in body["items"]] == ["m9", "m8"]
    assert body["has_more"] is False
    assert body["next_cursor"] == "m8"


def test_messages_page_size_upper_bound_422_magicmock(client):
    r = client.post("/messages/page", json={"conversation_thread_id": "t1", "page_size": 101})
    assert r.status_code == 422




# ---------------------------
# /search (POST)
# ---------------------------
def test_search_inbox_empty_magicmock(client, app_module, monkeypatch):
    monkeypatch.setattr(app_module, "_get_conv_map_for_user", lambda _uid: {})

    r = client.post("/search", json={
        "anonymous_handle": "",
        "my_user_id": "me",
        "limit": 20,
        "offset": 0,
    })
    assert r.status_code == 200
    assert r.json() == {"count": 0, "items": []}


def test_search_returns_latest_message_magicmock(client, app_module, monkeypatch):
    fixed_now = datetime(2025, 8, 30, 12, 0, 0)
    monkeypatch.setattr(app_module, "now_in_sa", lambda: fixed_now)

    # Conversations present
    monkeypatch.setattr(app_module, "_get_conv_map_for_user", lambda _uid: {"u2": "t2"})
    # Active profiles
    monkeypatch.setattr(app_module, "_search_active_profiles_fts",
                        lambda _ids, qtext=None: [{"user_id": "u2", "anonymous_handle": "cool_user", "account_status": "active"}])
    # Latest visible messages
    latest_map = {
        "t2": {
            "message_id": "m-22",
            "conversation_thread_id": "t2",
            "message_content": "last visible",
            "sender_id": "u2",
            "recipient_id": "me",
            "scheduled_delivery_at": (fixed_now - timedelta(seconds=5)).isoformat(),
            "read_at": None,
            "delivery_status": "delivered",
        }
    }
    monkeypatch.setattr(app_module, "_fetch_latest_visible_messages", lambda *_a, **_k: latest_map)

    r = client.post("/search", json={
        "anonymous_handle": "",
        "my_user_id": "me",
        "limit": 10,
        "offset": 0,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 1
    item = body["items"][0]
    assert item["user_profile"]["anonymous_handle"] == "cool_user"
    assert item["latest_message"]["message_id"] == "m-22"
    assert item["latest_message"]["from_me"] is False
    assert item["latest_message"]["is_read"] is False


def test_messages_create_starts_sequence_at_1_magicmock(client, app_module, monkeypatch):
    fixed_now = datetime(2025, 8, 30, 10, 0, 0)
    monkeypatch.setattr(app_module, "now_in_sa", lambda: fixed_now)

    # 1) active match with thread
    q_match = _make_query_mock(data=[{
        "match_id": "mid-9",
        "conversation_thread_id": "thread-9",
        "status": "active"
    }])

    # 2) empty prior messages list (no sequence yet)
    q_seq = _make_query_mock(data=[])

    # 3) insert new with sequence 1
    inserted = [{
        "message_id": "msg-first",
        "match_id": "mid-9",
        "sender_id": "uA",
        "recipient_id": "uB",
        "conversation_thread_id": "thread-9",
        "message_sequence": 1,
        "message_content": "First!",
        "scheduled_delivery_at": (fixed_now + timedelta(hours=12)).isoformat(),
    }]
    q_insert = _make_query_mock(data=inserted)

    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q_match, q_seq, q_insert]

    r = client.post("/messages", json={
        "sender_id": "uA",
        "recipient_id": "uB",
        "message_content": "First!",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["message_id"] == "msg-first"
    assert body["message_sequence"] == 1

def test_messages_create_inactive_match_magicmock(client, app_module, monkeypatch):
    fixed_now = datetime(2025, 8, 30, 10, 0, 0)
    monkeypatch.setattr(app_module, "now_in_sa", lambda: fixed_now)

    # Simulate no ACTIVE match (eq("status","active") yields nothing)
    q_match = _make_query_mock(data=[])
    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q_match]

    r = client.post("/messages", json={
        "sender_id": "u1",
        "recipient_id": "u2",
        "message_content": "Hey",
    })
    assert r.status_code == 404
    assert r.json()["detail"] == "No active match between users."

def test_search_pagination_offset_magicmock(client, app_module, monkeypatch):
    fixed_now = datetime(2025, 8, 30, 12, 0, 0)
    monkeypatch.setattr(app_module, "now_in_sa", lambda: fixed_now)

    monkeypatch.setattr(app_module, "_get_conv_map_for_user", lambda _uid: {"u1": "t1", "u2": "t2", "u3": "t3"})
    monkeypatch.setattr(
        app_module,
        "_search_active_profiles_fts",
        lambda _ids, qtext=None: [
            {"user_id": "u1", "anonymous_handle": "alpha", "account_status": "active"},
            {"user_id": "u2", "anonymous_handle": "beta", "account_status": "active"},
            {"user_id": "u3", "anonymous_handle": "gamma", "account_status": "active"},
        ],
    )
    latest_map = {
        "t1": {"message_id": "m1", "conversation_thread_id": "t1", "message_content": "a",
               "sender_id": "u1", "recipient_id": "me",
               "scheduled_delivery_at": (fixed_now - timedelta(seconds=5)).isoformat(),
               "read_at": None, "delivery_status": "delivered"},
        "t2": {"message_id": "m2", "conversation_thread_id": "t2", "message_content": "b",
               "sender_id": "u2", "recipient_id": "me",
               "scheduled_delivery_at": (fixed_now - timedelta(seconds=3)).isoformat(),
               "read_at": None, "delivery_status": "delivered"},
        "t3": {"message_id": "m3", "conversation_thread_id": "t3", "message_content": "c",
               "sender_id": "u3", "recipient_id": "me",
               "scheduled_delivery_at": (fixed_now - timedelta(seconds=1)).isoformat(),
               "read_at": None, "delivery_status": "delivered"},
    }
    monkeypatch.setattr(app_module, "_fetch_latest_visible_messages", lambda *_a, **_k: latest_map)

    r = client.post("/search", json={"anonymous_handle": "", "my_user_id": "me", "limit": 2, "offset": 1})
    assert r.status_code == 200
    body = r.json()
    # Sorted desc by time -> gamma, beta, alpha; offset 1, limit 2 -> beta, alpha
    handles = [it["user_profile"]["anonymous_handle"] for it in body["items"]]
    assert body["count"] == 2
    assert handles == ["beta", "gamma"]


def test_search_passes_qtext_to_fts_magicmock(client, app_module, monkeypatch):
    fixed_now = datetime(2025, 8, 30, 12, 0, 0)
    monkeypatch.setattr(app_module, "now_in_sa", lambda: fixed_now)

    monkeypatch.setattr(app_module, "_get_conv_map_for_user", lambda _uid: {"u2": "t2", "u3": "t3"})

    called = {}
    def fake_fts(ids, qtext=None):
        called["ids"] = set(ids)
        called["qtext"] = qtext
        # Return only u2 as a match for the search text
        return [{"user_id": "u2", "anonymous_handle": "cool_user", "account_status": "active"}]

    monkeypatch.setattr(app_module, "_search_active_profiles_fts", fake_fts)

    latest_map = {
        "t2": {"message_id": "m-22", "conversation_thread_id": "t2", "message_content": "hi",
               "sender_id": "u2", "recipient_id": "me",
               "scheduled_delivery_at": (fixed_now - timedelta(seconds=1)).isoformat(),
               "read_at": None, "delivery_status": "delivered"}
    }
    monkeypatch.setattr(app_module, "_fetch_latest_visible_messages", lambda *_a, **_k: latest_map)

    r = client.post("/search", json={
        "anonymous_handle": "cool",  # qtext
        "my_user_id": "me",
        "limit": 10,
        "offset": 0,
    })
    assert r.status_code == 200
    body = r.json()
    assert called["qtext"] == "cool"
    assert called["ids"] == {"u2", "u3"}  # full inbox set passed down
    assert body["count"] == 1
    assert body["items"][0]["user_profile"]["anonymous_handle"] == "cool_user"