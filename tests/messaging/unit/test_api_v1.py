import sys
import types as pytypes
import importlib
from io import BytesIO
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException

MODULE_PATH = "services.messaging.main"

# ---------------------------
# Minimal Supabase query mock
# ---------------------------
def _make_query_mock(data=None, *, side_effect=None):
    """
    Minimal chained Supabase query mock that supports:
    select, insert, update, eq, in_, lte, lt, gt, or_, order, limit, single,
    text_search, filter, ilike, not_.is_, is_
    """
    q = MagicMock(name="Query")
    q._limit_val = None
    chainers = (
        "select", "insert", "update", "eq", "in_", "lte", "lt", "gt", "or_",
        "order", "single", "text_search", "filter", "ilike"
    )
    for m in chainers:
        getattr(q, m).return_value = q

    def _limit(n):
        q._limit_val = n
        return q
    q.limit.side_effect = _limit

    q.not_ = MagicMock()
    q.not_.is_.return_value = q
    q.is_ = MagicMock(return_value=q)

    if side_effect is not None:
        q.execute.side_effect = side_effect
    else:
        def _exec():
            out = data
            if isinstance(out, list) and q._limit_val:
                out = out[:q._limit_val]
            resp = MagicMock()
            resp.data = out
            return resp
        q.execute.side_effect = _exec
    return q

# ---------------------------
# Fixtures
# ---------------------------
@pytest.fixture(scope="function")
def app_module(monkeypatch):
    # ENV needed at import time
    monkeypatch.setenv("SUPABASE_URL", "https://proj.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "service-role-key")
    monkeypatch.syspath_prepend(".")

    # Fake supabase module
    sys.modules.pop("supabase", None)
    fake_supabase = pytypes.ModuleType("supabase")
    fake_client = MagicMock(name="SupabaseClient")
    fake_supabase.Client = MagicMock()
    fake_supabase.create_client = MagicMock(return_value=fake_client)
    sys.modules["supabase"] = fake_supabase

    # Import the module fresh
    sys.modules.pop(MODULE_PATH, None)
    mod = importlib.import_module(MODULE_PATH)

    # Shortcuts
    mod._TEST_SUPABASE_CLIENT = fake_client

    # auth: disable verify_token
    mod.app.dependency_overrides[mod.verify_token] = lambda: "ok"

    # storage mocks common default
    storage_from = MagicMock()
    storage_from.create_signed_urls = MagicMock(return_value=[])
    fake_client.storage.from_.return_value = storage_from

    return mod

@pytest.fixture()
def client(app_module):
    return TestClient(app_module.app)

# ---------------------------
# Helper functions coverage
# ---------------------------
def test_normalize_pair(app_module):
    assert app_module._normalize_pair("b", "a") == ("a", "b")
    assert app_module._normalize_pair("a", "a") == ("a", "a")

def test_safe_execute_wraps_exception(app_module):
    class Boom:
        def execute(self): raise ValueError("nope")
    with pytest.raises(HTTPException) as e:
        app_module._safe_execute(Boom())
    assert e.value.status_code == 500

def test_get_active_match_and_thread_success_and_404(app_module, monkeypatch):
    # success
    q_ok = _make_query_mock(data=[{"match_id": "m1", "conversation_thread_id": "t1"}])
    # 404
    q_404 = _make_query_mock(data=[])
    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q_ok, q_404]

    out = app_module._get_active_match_and_thread("uA", "uB")
    assert out == {"match_id": "m1", "conversation_thread_id": "t1"}

    with pytest.raises(HTTPException) as e2:
        app_module._get_active_match_and_thread("x", "y")
    assert e2.value.status_code == 404

def test_get_conv_map_for_user_both_directions(app_module):
    q1 = _make_query_mock(data=[{"user_2_id": "u2", "conversation_thread_id": "t2", "match_type": None}])
    q2 = _make_query_mock(data=[{"user_1_id": "u3", "conversation_thread_id": "t3", "match_type": "long-term"}])
    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q1, q2]
    out = app_module._get_conv_map_for_user("me")
    assert out == {
        "u2": {"conversation_thread_id": "t2", "match_type": "either"},
        "u3": {"conversation_thread_id": "t3", "match_type": "long-term"},
    }

def test_get_blocked_users_variants_and_either_blocked(app_module, monkeypatch):
    q1 = _make_query_mock(data={"blocked_users": '["x","y"]'})
    app_module._TEST_SUPABASE_CLIENT.table.return_value = q1
    assert set(app_module._get_blocked_users("me")) == {"x", "y"}

    q2 = _make_query_mock(data={"blocked_users": ["a"]})
    app_module._TEST_SUPABASE_CLIENT.table.return_value = q2
    assert app_module._get_blocked_users("me") == ["a"]

    q3 = _make_query_mock(data={})
    app_module._TEST_SUPABASE_CLIENT.table.return_value = q3
    assert app_module._get_blocked_users("me") == []

    q4 = _make_query_mock(side_effect=Exception("boom"))
    app_module._TEST_SUPABASE_CLIENT.table.return_value = q4
    assert app_module._get_blocked_users("me") == []

    # _either_blocked true/false
    monkeypatch.setattr(app_module, "_get_blocked_users", lambda u: ["b"] if u == "a" else [])
    assert app_module._either_blocked("a", "b") is True
    monkeypatch.setattr(app_module, "_get_blocked_users", lambda u: [])
    assert app_module._either_blocked("a", "b") is False

def test_search_active_profiles_fts_no_ids_and_query_fallback(app_module):
    assert app_module._search_active_profiles_fts([], "x") == []

    base = MagicMock()
    base.order.return_value = base
    base.execute.return_value = MagicMock(data=[{"user_id": "u"}])
    tbl = MagicMock()
    tbl.select.return_value = tbl
    tbl.in_.return_value = tbl
    tbl.eq.return_value = base
    app_module._TEST_SUPABASE_CLIENT.table.return_value = tbl
    out = app_module._search_active_profiles_fts(["u"], None)
    assert out and out[0]["user_id"] == "u"

    base2 = MagicMock()
    base2.filter.return_value = base2
    base2.order.return_value = base2
    base2.execute.return_value = MagicMock(data=[{"user_id": "x"}])
    tbl2 = MagicMock()
    tbl2.select.return_value = tbl2
    tbl2.in_.return_value = tbl2
    tbl2.eq.return_value = base2
    # force fallback (no text_search attr)
    if hasattr(base2, "text_search"):
        delattr(base2, "text_search")
    app_module._TEST_SUPABASE_CLIENT.table.return_value = tbl2
    out2 = app_module._search_active_profiles_fts(["x"], "hello")
    assert out2 and out2[0]["user_id"] == "x"

def test_batch_signed_urls_cache_and_empty(app_module):
    # empty
    assert app_module._batch_signed_urls([]) == {}

    paths = ["uploads/p1.png"]
    storage_from = app_module._TEST_SUPABASE_CLIENT.storage.from_.return_value
    storage_from.create_signed_urls.return_value = [
        {"path": "uploads/p1.png", "signedURL": "https://signed/p1.png"}
    ]
    # Use a TTL large enough so "exp - now > 60" holds and cache is reused
    out1 = app_module._batch_signed_urls(paths, ttl_seconds=3600)
    assert out1["uploads/p1.png"].startswith("https://")

    # Using cache: if it tries to sign again, we blow up
    def _boom(*a, **k): raise AssertionError("should not resign")
    storage_from.create_signed_urls.side_effect = _boom
    out2 = app_module._batch_signed_urls(paths, ttl_seconds=3600)
    assert out2["uploads/p1.png"].startswith("https://")

# ---------------------------
# Direct coverage of message helper queries
# ---------------------------
def test_latest_delivered_by_convo_picks_first_per_thread(app_module):
    rows = [
        {"conversation_thread_id": "t1", "created_at": "2025-01-02T00:00:00"},
        {"conversation_thread_id": "t1", "created_at": "2025-01-01T00:00:00"},
        {"conversation_thread_id": "t2", "created_at": "2025-01-01T00:00:00"},
    ]
    app_module._TEST_SUPABASE_CLIENT.table.return_value = _make_query_mock(data=rows)
    out = app_module._latest_delivered_by_convo(["t1","t2"], "2025-02-01T00:00:00")
    assert set(out.keys()) == {"t1","t2"}
    assert out["t1"]["created_at"] == "2025-01-02T00:00:00"
    assert app_module._latest_delivered_by_convo([], "now") == {}

def test_latest_in_transit_from_me_sets_flag(app_module):
    rows = [
        {"conversation_thread_id": "t9", "scheduled_delivery_at": "2030-01-01T00:00:00"},
        {"conversation_thread_id": "t9", "scheduled_delivery_at": "2029-01-01T00:00:00"},
    ]
    app_module._TEST_SUPABASE_CLIENT.table.return_value = _make_query_mock(data=rows)
    out = app_module._latest_in_transit_from_me(["t9"], "2028-01-01T00:00:00", "me")
    assert "t9" in out and out["t9"].get("in_transit") is True
    assert app_module._latest_in_transit_from_me([], "now", "me") == {}

def test_latest_unread_to_me_and_from_me(app_module):
    rows_to_me = [
        {"conversation_thread_id": "t1", "scheduled_delivery_at": "2025-01-02T00:00:00"},
        {"conversation_thread_id": "t1", "scheduled_delivery_at": "2025-01-01T00:00:00"},
    ]
    app_module._TEST_SUPABASE_CLIENT.table.return_value = _make_query_mock(data=rows_to_me)
    out_to_me = app_module._latest_unread_to_me(["t1"], "2025-02-01T00:00:00", "me")
    assert out_to_me["t1"]["scheduled_delivery_at"] == "2025-01-02T00:00:00"
    assert app_module._latest_unread_to_me([], "now", "me") == {}

    rows_from_me = [
        {"conversation_thread_id": "t2", "scheduled_delivery_at": "2025-01-03T00:00:00"},
        {"conversation_thread_id": "t2", "scheduled_delivery_at": "2025-01-02T00:00:00"},
    ]
    app_module._TEST_SUPABASE_CLIENT.table.return_value = _make_query_mock(data=rows_from_me)
    out_from_me = app_module._latest_unread_from_me(["t2"], "2025-02-01T00:00:00", "me")
    assert out_from_me["t2"]["scheduled_delivery_at"] == "2025-01-03T00:00:00"
    assert app_module._latest_unread_from_me([], "now", "me") == {}

def test_latest_received_any_and_sent_any(app_module):
    rows_recv = [
        {"conversation_thread_id": "t1", "created_at": "2025-01-04T00:00:00"},
        {"conversation_thread_id": "t1", "created_at": "2025-01-03T00:00:00"},
    ]
    app_module._TEST_SUPABASE_CLIENT.table.return_value = _make_query_mock(data=rows_recv)
    out_recv = app_module._latest_received_any(["t1"], "2025-02-01T00:00:00", "me")
    assert out_recv["t1"]["created_at"] == "2025-01-04T00:00:00"
    assert app_module._latest_received_any([], "now", "me") == {}

    rows_sent = [
        {"conversation_thread_id": "t2", "created_at": "2025-01-05T00:00:00"},
        {"conversation_thread_id": "t2", "created_at": "2025-01-01T00:00:00"},
    ]
    app_module._TEST_SUPABASE_CLIENT.table.return_value = _make_query_mock(data=rows_sent)
    out_sent = app_module._latest_sent_any(["t2"], "2025-02-01T00:00:00", "me")
    assert out_sent["t2"]["created_at"] == "2025-01-05T00:00:00"
    assert app_module._latest_sent_any([], "now", "me") == {}

# ---------------------------
# /api/v1/messages (POST)
# ---------------------------
def test_send_message_happy_json(app_module, client, monkeypatch):
    monkeypatch.setattr(app_module, "_either_blocked", lambda a, b: False)
    rpc_out = {
        "message_id": "00000000-0000-0000-0000-000000000111",
        "conversation_thread_id": "11111111-1111-1111-1111-111111111111",
        "message_sequence": 7,
        "message_content": "hi",
        "scheduled_delivery_at": "2025-01-01T00:00:00Z",
        "sender_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "recipient_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    }
    rpc_exec = MagicMock()
    rpc_resp = MagicMock()
    rpc_resp.data = rpc_out
    rpc_exec.execute.return_value = rpc_resp
    app_module.supabase.rpc.return_value = rpc_exec

    res = client.post(
        "/api/v1/messages",
        json={
            "sender_id": rpc_out["sender_id"],
            "recipient_id": rpc_out["recipient_id"],
            "message_content": "hi",
            "letter_url": "uploads/x.png",
            "delay_hours": 2,
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["message_id"] == rpc_out["message_id"]
    assert body["message_content"] == "hi"

def test_send_message_missing_fields_422(client):
    res = client.post("/api/v1/messages", json={})
    assert res.status_code == 422

def test_send_message_blocked_403(app_module, client, monkeypatch):
    monkeypatch.setattr(app_module, "_either_blocked", lambda a, b: True)
    res = client.post(
        "/api/v1/messages",
        json={
            "sender_id": "a",
            "recipient_id": "b",
            "message_content": "nope",
            "letter_url": None,
        },
    )
    assert res.status_code == 403

def test_send_message_json_bad_delay_400(app_module, client):
    r = client.post("/api/v1/messages",
                    json={"sender_id":"s","recipient_id":"r","message_content":"x","delay_hours":"NaN"})
    assert r.status_code == 400

def test_send_message_multipart_with_file_ok(app_module, client, monkeypatch):
    async def fake_upload(file): return "uploads/abc.png"
    monkeypatch.setattr(app_module, "_upload_from_uploadfile", fake_upload)
    payload_row = {"message_id": "m3"}
    app_module._TEST_SUPABASE_CLIENT.rpc.return_value = _make_query_mock(data=payload_row)
    files = {"file": ("f.png", b"data", "image/png")}
    data = {"sender_id": "s", "recipient_id": "r", "message_content": "hi", "delay_hours": "2"}
    r = client.post("/api/v1/messages", files=files, data=data)
    assert r.status_code == 200

def test_send_message_multipart_no_file_letter_url_passthrough(app_module, client):
    # multipart with no "file" field, but letter_url present
    payload_row = {"message_id": "m4"}
    app_module._TEST_SUPABASE_CLIENT.rpc.return_value = _make_query_mock(data=payload_row)
    files = {"dummy": ("noop.txt", b"x", "text/plain")}  # forces multipart
    data = {"sender_id": "s", "recipient_id": "r", "message_content": "x", "letter_url": "uploads/z.png", "delay_hours":"1"}
    r = client.post("/api/v1/messages", files=files, data=data)
    assert r.status_code == 200

def test_send_message_multipart_bad_delay_400(client, app_module):
    app_module._TEST_SUPABASE_CLIENT.rpc.return_value = _make_query_mock(data={"ok": True})
    files = {"dummy": ("noop.txt", b"x", "text/plain")}
    data = {"sender_id": "s", "recipient_id": "r", "message_content": "x", "delay_hours": "NaN"}
    r = client.post("/api/v1/messages", files=files, data=data)
    assert r.status_code == 400

def test_send_message_rpc_returns_none_500(app_module, client, monkeypatch):
    monkeypatch.setattr(app_module, "_either_blocked", lambda a, b: False)
    app_module._TEST_SUPABASE_CLIENT.rpc.return_value = _make_query_mock(data=None)
    r = client.post("/api/v1/messages",
                    json={"sender_id":"s","recipient_id":"r","message_content":"hi"})
    assert r.status_code == 500

# ---------------------------
# /api/v1/messages/page (GET)
# ---------------------------
def test_page_messages_basic(app_module, client):
    rows = [
        {
            "message_id": "m1",
            "conversation_thread_id": "t1",
            "message_content": "hello",
            "scheduled_delivery_at": "2025-01-02T00:00:00Z",
            "created_at": "2025-01-01T00:00:00Z",
            "sender_id": "me",
            "recipient_id": "you",
            "letter_url": "uploads/letter1.png",
        },
        {
            "message_id": "m0",
            "conversation_thread_id": "t1",
            "message_content": "older",
            "scheduled_delivery_at": "2024-12-31T00:00:00Z",
            "created_at": "2024-12-30T00:00:00Z",
            "sender_id": "you",
            "recipient_id": "me",
            "letter_url": None,
        },
    ]
    rpc_exec = MagicMock()
    rpc_resp = MagicMock()
    rpc_resp.data = rows
    rpc_exec.execute.return_value = rpc_resp
    app_module.supabase.rpc.return_value = rpc_exec

    storage_from = app_module.supabase.storage.from_.return_value
    storage_from.create_signed_urls.return_value = [
        {"path": "uploads/letter1.png", "signedURL": "https://signed/letter1.png"}
    ]

    res = client.get(
        "/api/v1/messages/page",
        params={"conversation_thread_id": "t1","viewer_user_id": "me","page_size": 2},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["count"] == 2
    assert data["items"][0]["letter_url_signed"] == "https://signed/letter1.png"
    assert data["next_cursor"] == "m0"

def test_page_messages_cursor_not_belong_400(app_module, client):
    def _raise(): raise HTTPException(status_code=400, detail="cursor does not belong to thread")
    rpc_exec = MagicMock(); rpc_exec.execute.side_effect = _raise
    app_module.supabase.rpc.return_value = rpc_exec
    res = client.get("/api/v1/messages/page",
                     params={"conversation_thread_id":"t1","viewer_user_id":"me","page_size":10,"last_message_id":"bad"})
    assert res.status_code == 400

def test_page_messages_blocked_403(app_module, client):
    def _raise(): raise HTTPException(status_code=403, detail="blocked")
    rpc_exec = MagicMock(); rpc_exec.execute.side_effect = _raise
    app_module.supabase.rpc.return_value = rpc_exec
    res = client.get("/api/v1/messages/page", params={"conversation_thread_id":"t1","viewer_user_id":"me"})
    assert res.status_code == 403

def test_page_messages_last_message_id_not_found_404(app_module, client):
    def _raise(): raise HTTPException(status_code=404, detail="last_message_id not found")
    rpc_exec = MagicMock(); rpc_exec.execute.side_effect = _raise
    app_module.supabase.rpc.return_value = rpc_exec
    res = client.get("/api/v1/messages/page", params={"conversation_thread_id":"t1","viewer_user_id":"me"})
    assert res.status_code == 404

def test_page_messages_page_size_bounds(app_module, client):
    rpc_exec = MagicMock(); rpc_resp = MagicMock(); rpc_resp.data = []; rpc_exec.execute.return_value = rpc_resp
    app_module.supabase.rpc.return_value = rpc_exec

    ok1 = client.get("/api/v1/messages/page", params={"conversation_thread_id":"t1","viewer_user_id":"me","page_size":1})
    assert ok1.status_code == 200
    ok2 = client.get("/api/v1/messages/page", params={"conversation_thread_id":"t1","viewer_user_id":"me","page_size":100})
    assert ok2.status_code == 200

    bad = client.get("/api/v1/messages/page", params={"conversation_thread_id":"t1","viewer_user_id":"me","page_size":101})
    assert bad.status_code == 422

def test_page_messages_nosign_branch(client, app_module):
    rpc_exec = MagicMock(); rpc_resp = MagicMock()
    rpc_resp.data = [{"message_id": "m1", "conversation_thread_id": "t1", "letter_url": None}]
    rpc_exec.execute.return_value = rpc_resp
    app_module._TEST_SUPABASE_CLIENT.rpc.return_value = rpc_exec
    res = client.get("/api/v1/messages/page", params={"conversation_thread_id": "t1", "viewer_user_id": "me", "page_size": 10})
    assert res.status_code == 200
    assert res.json()["items"][0].get("letter_url_signed") is None

# ---------------------------
# /api/v1/search (GET)
# ---------------------------
def test_search_happy_profile_shape(app_module, client):
    rpc_rows = [{
        "conversation_thread_id": "t1",
        "other_user_id": "u2",
        "anonymous_handle": "alice",
        "match_type": "either",
        "latest_message_id": "m1",
        "latest_sender_id": "u1",
        "latest_recipient_id": "u2",
        "latest_scheduled_delivery_at": "2025-01-02T00:00:00Z",
        "latest_created_at": "2025-01-01T00:00:00Z",
        "latest_read_at": None,
        "latest_letter_url": "uploads/pic.png",
        "latest_message_content": "hello there",
    }]
    rpc_exec = MagicMock(); rpc_resp = MagicMock(); rpc_resp.data = rpc_rows; rpc_exec.execute.return_value = rpc_resp
    app_module.supabase.rpc.return_value = rpc_exec

    profs = [{
        "user_id": "u2", "anonymous_handle": "alice", "country_code":"ZA",
        "bio":"Hi","age_range":"20-25","interests":["reading"], "account_status":"active",
    }]
    app_module.supabase.table.return_value = _make_query_mock(data=profs)

    storage_from = app_module.supabase.storage.from_.return_value
    storage_from.create_signed_urls.return_value = [{"path":"uploads/pic.png","signedURL":"https://signed/pic.png"}]

    res = client.get("/api/v1/search", params={"my_user_id":"u1","anonymous_handle":"","limit":20,"offset":0})
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 1
    item = data["items"][0]
    assert set(item["user_profile"].keys()) == {"user_id","anonymous_handle","country_code","bio","age_range","interests"}
    assert item["latest_message"]["message_id"] == "m1"
    assert item["latest_message"]["letter_url_signed"] == "https://signed/pic.png"
    assert item["match_type"] == "either"

def test_search_empty_page(app_module, client):
    rpc_exec = MagicMock(); rpc_resp = MagicMock(); rpc_resp.data = []; rpc_exec.execute.return_value = rpc_resp
    app_module.supabase.rpc.return_value = rpc_exec
    res = client.get("/api/v1/search", params={"my_user_id":"u1","anonymous_handle":"","limit":5,"offset":0})
    assert res.status_code == 200
    assert res.json() == {"count": 0, "items": []}

def test_search_limit_bounds_validation(client, app_module):
    ok = client.get("/api/v1/search", params={"my_user_id":"u1","anonymous_handle":"","limit":1,"offset":0})
    assert ok.status_code == 200
    bad = client.get("/api/v1/search", params={"my_user_id":"u1","anonymous_handle":"","limit":51,"offset":0})
    assert bad.status_code == 422

def test_search_offset_non_negative(client, app_module):
    bad = client.get("/api/v1/search", params={"my_user_id":"u1","anonymous_handle":"","limit":10,"offset":-1})
    assert bad.status_code == 422

def test_search_skips_inactive_profiles(client, app_module):
    rpc_exec = MagicMock(); rpc_resp = MagicMock()
    rpc_resp.data = [{"conversation_thread_id": "t1","other_user_id": "u2","match_type": "either"}]
    rpc_exec.execute.return_value = rpc_resp
    app_module._TEST_SUPABASE_CLIENT.rpc.return_value = rpc_exec

    app_module._TEST_SUPABASE_CLIENT.table.return_value = MagicMock(
        **{"select.return_value.in_.return_value.execute.return_value.data": [{"user_id":"u2","account_status":"inactive"}]}
    )

    res = client.get("/api/v1/search", params={"my_user_id":"u1","anonymous_handle":"","limit":20,"offset":0})
    assert res.status_code == 200
    assert res.json() == {"count": 0, "items": []}

def test_search_sorting_uses_latest_timestamp(client, app_module):
    rpc_rows = [
        {
            "conversation_thread_id": "t1",
            "other_user_id": "u1",
            "anonymous_handle": "a",
            "match_type": "either",
            "latest_message_id": "m1",
            "latest_sender_id": "me",
            "latest_recipient_id": "u1",
            "latest_scheduled_delivery_at": "2025-01-01T00:00:00Z",
            "latest_created_at": "2025-01-01T00:00:00Z",
            "latest_read_at": None,
            "latest_letter_url": None,
            "latest_message_content": "old",
        },
        {
            "conversation_thread_id": "t2",
            "other_user_id": "u2",
            "anonymous_handle": "b",
            "match_type": "either",
            "latest_message_id": "m2",
            "latest_sender_id": "me",
            "latest_recipient_id": "u2",
            "latest_scheduled_delivery_at": "2026-01-01T00:00:00Z",
            "latest_created_at": "2025-01-02T00:00:00Z",
            "latest_read_at": None,
            "latest_letter_url": None,
            "latest_message_content": "new",
        },
    ]
    rpc_exec = MagicMock(); rpc_resp = MagicMock(); rpc_resp.data = rpc_rows; rpc_exec.execute.return_value = rpc_resp
    app_module.supabase.rpc.return_value = rpc_exec

    profs = [
        {"user_id":"u1","anonymous_handle":"a","account_status":"active"},
        {"user_id":"u2","anonymous_handle":"b","account_status":"active"},
    ]
    app_module.supabase.table.return_value = _make_query_mock(data=profs)

    res = client.get("/api/v1/search", params={"my_user_id":"me","anonymous_handle":"","limit":20,"offset":0})
    assert res.status_code == 200
    items = res.json()["items"]
    assert items[0]["user_profile"]["user_id"] == "u2"  # newer scheduled first

def test_search_no_latest_message_id_sets_none(client, app_module):
    rpc_rows = [{
        "conversation_thread_id": "t1",
        "other_user_id": "u2",
        "anonymous_handle": "alice",
        "match_type": "either",
        # no latest_* fields -> latest_message should be None
    }]
    rpc_exec = MagicMock(); rpc_resp = MagicMock(); rpc_resp.data = rpc_rows; rpc_exec.execute.return_value = rpc_resp
    app_module.supabase.rpc.return_value = rpc_exec

    profs = [{"user_id":"u2","anonymous_handle":"alice","account_status":"active"}]
    app_module.supabase.table.return_value = _make_query_mock(data=profs)

    res = client.get("/api/v1/search", params={"my_user_id":"u1","anonymous_handle":"","limit":20,"offset":0})
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 1
    assert data["items"][0]["latest_message"] is None

# ---------------------------
# /api/v1/conversations/{id}/read (PATCH)
# ---------------------------
def test_mark_read_updates_count(app_module, client):
    app_module.supabase.table.return_value = _make_query_mock(data=[{"x":1},{"y":2}])
    res = client.patch("/api/v1/conversations/t1/read", json={"my_user_id": "u1"})
    assert res.status_code == 200
    assert res.json()["updated"] == 2

def test_mark_read_zero_updates(app_module, client):
    app_module.supabase.table.return_value = _make_query_mock(data=[])
    res = client.patch("/api/v1/conversations/t1/read", json={"my_user_id": "u1"})
    assert res.status_code == 200
    assert res.json()["updated"] == 0

# ---------------------------
# /api/v1/upload-image (POST)
# ---------------------------
def test_upload_image_basic(app_module, client):
    storage_from = app_module.supabase.storage.from_.return_value
    upload_resp = pytypes.SimpleNamespace(error=None)
    storage_from.upload.return_value = upload_resp
    f = BytesIO(b"img")
    files = {"file": ("a.png", f, "image/png")}
    res = client.post("/api/v1/upload-image", files=files)
    assert res.status_code == 200, res.text
    body = res.json()
    assert "object_path" in body and body["data"]["path"] == body["object_path"]

def test_upload_image_error_branch(client, app_module, monkeypatch):
    async def bad_upload(file): raise HTTPException(status_code=500, detail="forced")
    monkeypatch.setattr(app_module, "_upload_from_uploadfile", bad_upload)
    res = client.post("/api/v1/upload-image", files={"file": ("x.png", b"d", "image/png")})
    assert res.status_code == 500
