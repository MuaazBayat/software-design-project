import sys
import types
import importlib
import time
from datetime import datetime
from unittest.mock import MagicMock
from io import BytesIO

import pytest
from fastapi import UploadFile
from fastapi.testclient import TestClient

MODULE_PATH = "services.messaging.main"

# ---------------------------
# Fixtures
# ---------------------------
@pytest.fixture(scope="function")
def app_module(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_KEY", "service-role-key")
    monkeypatch.syspath_prepend(".")

    sys.modules.pop("supabase", None)
    fake_supabase = types.ModuleType("supabase")
    fake_supabase.Client = MagicMock()
    mock_client = MagicMock(name="SupabaseClient")
    fake_supabase.create_client = MagicMock(return_value=mock_client)
    sys.modules["supabase"] = fake_supabase

    sys.modules.pop(MODULE_PATH, None)
    mod = importlib.import_module(MODULE_PATH)
    mod._TEST_SUPABASE_CLIENT = mock_client
    return mod

@pytest.fixture()
def client(app_module):
    return TestClient(app_module.app)

def _make_query_mock(data=None, *, side_effect=None):
    q = MagicMock(name="Query")
    q._limit_val = None
    for m in ("select","or_","eq","order","in_","lte","lt","single",
              "insert","text_search","filter","ilike"):
        getattr(q,m).return_value = q
    def _limit(n): q._limit_val=n; return q
    q.limit.side_effect=_limit
    q.not_ = MagicMock()
    q.not_.is_.return_value = q
    if side_effect:
        q.execute.side_effect = side_effect
    else:
        def _exec():
            out=data
            if isinstance(out,list) and q._limit_val:
                out=out[:q._limit_val]
            resp=MagicMock(); resp.data=out; return resp
        q.execute.side_effect=_exec
    return q

# ---------------------------
# Tests
# ---------------------------
def test_safe_execute_variants(app_module):
    q=_make_query_mock(data=[{"ok":1}])
    assert app_module._safe_execute(q).data==[{"ok":1}]
    class Bad: 
        def execute(self): raise Exception("boom")
    with pytest.raises(app_module.HTTPException):
        app_module._safe_execute(Bad())

def test_normalize_pair_variants(app_module):
    assert app_module._normalize_pair("a","b")==("a","b")
    assert app_module._normalize_pair("z","y")==("y","z")
    assert app_module._normalize_pair("same","same")==("same","same")

def test_get_active_match_and_thread_found_and_notfound(app_module):
    q=_make_query_mock(data=[{"match_id":"m","conversation_thread_id":"t"}])
    app_module._TEST_SUPABASE_CLIENT.table.return_value=q
    out=app_module._get_active_match_and_thread("a","b")
    assert out["match_id"]=="m"
    q2=_make_query_mock(data=[])
    app_module._TEST_SUPABASE_CLIENT.table.return_value=q2
    with pytest.raises(app_module.HTTPException):
        app_module._get_active_match_and_thread("x","y")

def test_get_conv_map(app_module):
    q1=_make_query_mock(data=[{"user_2_id":"u2","conversation_thread_id":"t2"}])
    q2=_make_query_mock(data=[{"user_1_id":"u3","conversation_thread_id":"t3"}])
    app_module._TEST_SUPABASE_CLIENT.table.side_effect=[q1,q2]
    out=app_module._get_conv_map_for_user("me")
    assert out=={"u2":"t2","u3":"t3"}

def test_search_active_profiles_fts_variants(app_module):
    app_module._TEST_SUPABASE_CLIENT.table.return_value=_make_query_mock(data=[])
    assert app_module._search_active_profiles_fts([],None)==[]
    q=_make_query_mock(data=[{"user_id":"u1"}])
    app_module._TEST_SUPABASE_CLIENT.table.return_value=q
    assert app_module._search_active_profiles_fts(["u1"]," ")==[{"user_id":"u1"}]
    q2=_make_query_mock(data=[{"user_id":"u2"}])
    app_module._TEST_SUPABASE_CLIENT.table.return_value=q2
    assert app_module._search_active_profiles_fts(["u2"],"cool")==[{"user_id":"u2"}]

def test_fetch_latest_visible_messages_variants(app_module):
    assert app_module._fetch_latest_visible_messages([], "2025-01-01T00:00:00")=={}
    rows=[{"conversation_thread_id":"t1","message_id":"m1"},
          {"conversation_thread_id":"t1","message_id":"m2"}]
    q=_make_query_mock(data=rows)
    app_module._TEST_SUPABASE_CLIENT.table.return_value=q
    out=app_module._fetch_latest_visible_messages(["t1"],"2025-01-01T00:00:00")
    assert out["t1"]["message_id"]=="m1"

def test_batch_signed_urls_cache_and_resign(app_module,monkeypatch):
    # fresh hit
    app_module._SIGNED_URL_CACHE["p1"]=("signed1", time.time()+999)
    out=app_module._batch_signed_urls(["p1"])
    assert out["p1"]=="signed1"
    # expired -> re-sign
    app_module._SIGNED_URL_CACHE["p2"]=("old", time.time()-1)
    monkeypatch.setattr(app_module,"supabase",MagicMock())
    fake_storage=app_module.supabase.storage.from_.return_value
    fake_storage.create_signed_urls.return_value=[{"path":"p2","signedURL":"new"}]
    out=app_module._batch_signed_urls(["p2"])
    assert out["p2"]=="new"

@pytest.mark.asyncio
async def test_upload_from_uploadfile_success_and_error(app_module,monkeypatch):
    fake_storage=MagicMock()
    fake_storage.upload.return_value=MagicMock(error=None)
    monkeypatch.setattr(app_module.supabase,"storage",MagicMock())
    app_module.supabase.storage.from_.return_value=fake_storage
    file=UploadFile(filename="x.txt",file=BytesIO(b"hi"))
    out=await app_module._upload_from_uploadfile(file)
    assert out.startswith("uploads/")
    bad_storage=MagicMock()
    bad_storage.upload.return_value=MagicMock(error="fail")
    app_module.supabase.storage.from_.return_value=bad_storage
    file2=UploadFile(filename="bad.txt",file=BytesIO(b"x"))
    with pytest.raises(app_module.HTTPException):
        await app_module._upload_from_uploadfile(file2)

def test_page_messages_variants(client,app_module,monkeypatch):
    # missing ids
    assert client.post("/messages/page",json={}).status_code==422
    # null thread
    monkeypatch.setattr(app_module,"_get_active_match_and_thread",
                        lambda a,b:{"match_id":"m","conversation_thread_id":None})
    r=client.post("/messages/page",json={"my_user_id":"a","other_user_id":"b"})
    assert r.json()["count"]==0
    # page_size too big
    assert client.post("/messages/page",json={"conversation_thread_id":"t","page_size":101}).status_code==422

def test_search_variants(client, app_module, monkeypatch):
    # Case 1: no conversations
    monkeypatch.setattr(app_module, "_get_conv_map_for_user", lambda _: {})
    r = client.post("/search", json={"anonymous_handle": "", "my_user_id": "me"})
    assert r.json() == {"count": 0, "items": []}

    # Case 2: conversations but no profiles
    monkeypatch.setattr(app_module, "_get_conv_map_for_user", lambda _: {"u": "t"})
    monkeypatch.setattr(app_module, "_search_active_profiles_fts", lambda *_a, **_kw: [])
    r = client.post("/search", json={"anonymous_handle": "", "my_user_id": "me"})
    assert r.json() == {"count": 0, "items": []}

    # Case 3: one profile, with a signed URL
    monkeypatch.setattr(
        app_module,
        "_search_active_profiles_fts",
        lambda *_a, **_kw: [{"user_id": "u", "anonymous_handle": "h", "account_status": "active"}],
    )
    monkeypatch.setattr(app_module, "_fetch_latest_visible_messages", lambda *_a, **_k: {"t": {"letter_url": "p1"}})
    monkeypatch.setattr(app_module, "_batch_signed_urls", lambda *_a, **_k: {"p1": "signed"})

    r = client.post("/search", json={"anonymous_handle": "", "my_user_id": "me"})
    body = r.json()
    assert body["count"] == 1
    assert body["items"][0]["user_profile"]["anonymous_handle"] == "h"
    assert body["items"][0]["latest_message"]["letter_url_signed"] == "signed"

def test_get_image_variants(client,app_module,monkeypatch):
    monkeypatch.setattr(app_module,"_batch_signed_urls",lambda *_:{"ok":"signed"})
    assert client.get("/get-image",params={"object_path":"ok"}).status_code==200
    monkeypatch.setattr(app_module,"_batch_signed_urls",lambda *_:{})
    assert client.get("/get-image",params={"object_path":"bad"}).status_code==404

def test_env_missing_vars(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_KEY", raising=False)
    sys.modules.pop(MODULE_PATH, None)
    with pytest.raises(RuntimeError):
        importlib.import_module(MODULE_PATH)

def test_search_active_profiles_fts_attributeerror(app_module, monkeypatch):
    fake_query = _make_query_mock(data=[{"user_id": "x"}])
    # remove text_search to trigger AttributeError
    del fake_query.text_search
    app_module._TEST_SUPABASE_CLIENT.table.return_value = fake_query
    out = app_module._search_active_profiles_fts(["x"], "query")
    assert out == [{"user_id": "x"}]

def test_page_messages_last_message_not_found(client, app_module, monkeypatch):
    # Mock for the lookup of last_message_id (returns no data)
    q_cur = _make_query_mock(data=None)
    # Mock for the second table query (not actually used because of early 404)
    q_main = _make_query_mock(data=[])

    # Provide both in side_effect so both table() calls are satisfied
    app_module._TEST_SUPABASE_CLIENT.table.side_effect = [q_cur, q_main]

    r = client.post(
        "/messages/page",
        json={"conversation_thread_id": "t", "page_size": 5, "last_message_id": "bad"},
    )
    assert r.status_code == 404
    assert "last_message_id not found" in r.text

def test_page_messages_signed_url_added(client, app_module, monkeypatch):
    row = {"message_id": "m", "conversation_thread_id": "t", "created_at": "2025-01-01T00:00:00", "letter_url": "p1"}
    q = _make_query_mock(data=[row])
    app_module._TEST_SUPABASE_CLIENT.table.return_value = q
    monkeypatch.setattr(app_module, "_batch_signed_urls", lambda *_: {"p1": "signed"})
    r = client.post("/messages/page", json={"conversation_thread_id": "t", "page_size": 1})
    body = r.json()
    assert body["items"][0]["letter_url_signed"] == "signed"

def test_search_empty_after_paging(client, app_module, monkeypatch):
    monkeypatch.setattr(app_module, "_get_conv_map_for_user", lambda _: {"u": "t"})
    monkeypatch.setattr(app_module, "_search_active_profiles_fts",
                        lambda *_a, **_k: [{"user_id": "u", "anonymous_handle": "h", "account_status": "active"}])
    # force paging to drop everything
    r = client.post("/search", json={"anonymous_handle": "", "my_user_id": "me", "limit": 0, "offset": 10})
    assert r.json() == {"count": 0, "items": []}

def test_get_image_error_branch(client, app_module, monkeypatch):
    monkeypatch.setattr(app_module, "_batch_signed_urls", lambda *_: {})
    r = client.get("/get-image", params={"object_path": "missing"})
    assert r.status_code == 404