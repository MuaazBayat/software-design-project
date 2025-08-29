import pytest
from datetime import datetime
import services.messaging.main as module

pytestmark = pytest.mark.unit


def test_search_users_impl_no_conversations(monkeypatch):
    monkeypatch.setattr(module, "_get_conv_map_for_user", lambda my_id: {})
    out = module._search_users_impl(anonymous_handle="", my_user_id="me", limit=10, offset=0)
    assert out == {"count": 0, "items": []}


def test_search_users_impl_no_profiles(monkeypatch):
    monkeypatch.setattr(module, "_get_conv_map_for_user", lambda my_id: {"u1": "c1"})
    monkeypatch.setattr(module, "_search_active_profiles_fts", lambda ids, **kw: [])
    out = module._search_users_impl(anonymous_handle="anything", my_user_id="me", limit=10, offset=0)
    assert out == {"count": 0, "items": []}


def test_search_users_impl_pagination(monkeypatch):
    monkeypatch.setattr(module, "_get_conv_map_for_user", lambda my_id: {"u1": "c1", "u2": "c2", "u3": "c3"})
    profiles = [
        {"user_id": "u1", "anonymous_handle": "adam", "account_status": "active"},
        {"user_id": "u2", "anonymous_handle": "bella", "account_status": "active"},
        {"user_id": "u3", "anonymous_handle": "carl", "account_status": "active"},
    ]
    monkeypatch.setattr(module, "_search_active_profiles_fts", lambda ids, **kw: profiles)
    monkeypatch.setattr(module, "_fetch_latest_visible_messages", lambda conv_ids, now_iso, limit_cap=1000: {})
    fixed_now = datetime(2025, 8, 28, 10, 0, 0, tzinfo=module.ZoneInfo("Africa/Johannesburg"))
    monkeypatch.setattr(module, "now_in_sa", lambda: fixed_now)

    out = module._search_users_impl(anonymous_handle="", my_user_id="me", limit=2, offset=1)
    assert out["count"] == 2
    users = [item["user_profile"]["anonymous_handle"] for item in out["items"]]
    assert users == ["bella", "carl"]
    assert all(item["latest_message"] is None for item in out["items"])


def test_fetch_active_profiles_no_filter(monkeypatch):
    class Resp:
        def __init__(self, data): self.data = data

    monkeypatch.setattr(module, "_safe_execute", lambda _q: Resp([
        {"user_id": "u1", "anonymous_handle": "adam", "account_status": "active"},
        {"user_id": "u2", "anonymous_handle": "bella", "account_status": "active"},
    ]))
    out = module._fetch_active_profiles(["u1", "u2"], handle_filter=None)
    assert [p["anonymous_handle"] for p in out] == ["adam", "bella"]


def test_fetch_active_profiles_with_filter(monkeypatch):
    class Resp:
        def __init__(self, data): self.data = data

    monkeypatch.setattr(module, "_safe_execute", lambda _q: Resp([
        {"user_id": "u2", "anonymous_handle": "bella", "account_status": "active"}
    ]))
    out = module._fetch_active_profiles(["u2"], handle_filter="bel")
    assert out[0]["anonymous_handle"] == "bella"


class FakeQuery:
    def __init__(self, resp):
        self._resp = resp
    def select(self, *a, **k): return self
    def in_(self, *a, **k): return self
    def eq(self, *a, **k): return self
    def order(self, *a, **k): return self
    def filter(self, *a, **k): return self
    def text_search(self, *a, **k): return self
    def execute(self): return type("Resp", (), {"data": self._resp})()


def test_search_active_profiles_fts_inbox_behavior(monkeypatch):
    class Resp:
        def __init__(self, data): self.data = data
    monkeypatch.setattr(module, "_safe_execute", lambda _q: Resp([
        {"user_id": "u1", "anonymous_handle": "alpha", "account_status": "active"},
        {"user_id": "u2", "anonymous_handle": "beta", "account_status": "active"},
    ]))
    out = module._search_active_profiles_fts(["u1", "u2"], qtext="")
    assert len(out) == 2 and out[0]["anonymous_handle"] == "alpha"


def test_search_active_profiles_fts_websearch_success(monkeypatch):
    resp = [
        {"user_id": "u3", "anonymous_handle": "gamma", "account_status": "active"},
        {"user_id": "u4", "anonymous_handle": "delta", "account_status": "active"},
    ]
    class FakeSupabase:
        def table(self, name): return FakeQuery(resp)

    monkeypatch.setattr(module, "supabase", FakeSupabase())
    out = module._search_active_profiles_fts(["u3", "u4"], qtext="gam OR del")
    assert [p["anonymous_handle"] for p in out] == ["gamma", "delta"]


class FakeQueryNoTextSearch(FakeQuery):
    def text_search(self, *a, **k):
        raise AttributeError("no text_search in this supabase client")


def test_search_active_profiles_fts_fallback_operator(monkeypatch):
    resp = [{"user_id": "u5", "anonymous_handle": "echo", "account_status": "active"}]
    class FakeSupabase:
        def table(self, name): return FakeQueryNoTextSearch(resp)

    monkeypatch.setattr(module, "supabase", FakeSupabase())
    out = module._search_active_profiles_fts(["u5"], qtext="echo")
    assert out[0]["anonymous_handle"] == "echo"


def test_fetch_active_profiles_empty_ids():
    assert module._fetch_active_profiles([], handle_filter=None) == []


def test_search_active_profiles_fts_empty_ids():
    assert module._search_active_profiles_fts([], qtext="anything") == []
