import pytest
from datetime import datetime
from fastapi.testclient import TestClient
import services.messaging.main as module

pytestmark = pytest.mark.integration


@pytest.fixture
def client():
    return TestClient(module.app)


def test_messages_page_with_cursor_short_page(monkeypatch, client):
    fixed_now = datetime(2025, 8, 28, 10, 0, 0, tzinfo=module.ZoneInfo("Africa/Johannesburg"))
    monkeypatch.setattr(module, "now_in_sa", lambda: fixed_now)

    class Resp:
        def __init__(self, data): self.data = data

    calls = {"i": 0}
    def fake_safe_execute(_q):
        calls["i"] += 1
        if calls["i"] == 1:
            return Resp({"created_at": "2025-08-28T08:00:00+02:00"})
        elif calls["i"] == 2:
            rows = [{"message_id": "older-1", "created_at": "2025-08-28T07:59:00+02:00"}]
            return Resp(rows)
        else:
            pytest.fail("Unexpected DB calls")

    monkeypatch.setattr(module, "_safe_execute", fake_safe_execute)

    payload = {"conversation_thread_id": "c-xyz", "page_size": 2, "last_message_id": "last-seen"}
    r = client.post("/messages/page", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 1
    assert data["has_more"] is False
    assert data["next_cursor"] == "older-1"


def test_messages_page_with_cursor_empty_result(monkeypatch, client):
    fixed_now = datetime(2025, 8, 28, 10, 0, 0, tzinfo=module.ZoneInfo("Africa/Johannesburg"))
    monkeypatch.setattr(module, "now_in_sa", lambda: fixed_now)

    class Resp:
        def __init__(self, data): self.data = data

    calls = {"i": 0}
    def fake_safe_execute(_q):
        calls["i"] += 1
        if calls["i"] == 1:
            # lookup created_at for last_message_id
            return Resp({"created_at": "2025-08-28T08:00:00+02:00"})
        elif calls["i"] == 2:
            # then query returns no rows
            return Resp([])
        else:
            pytest.fail("unexpected DB call")

    monkeypatch.setattr(module, "_safe_execute", fake_safe_execute)

    payload = {"conversation_thread_id": "c1", "page_size": 3, "last_message_id": "older-x"}
    r = client.post("/messages/page", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 0
    assert data["has_more"] is False
    assert data["next_cursor"] is None


def test_page_messages_cursor_lines(monkeypatch):
    # Exercise the 404 branch and the has_more/next_cursor calc (~299 region)
    import services.messaging.main as module_local

    fixed_now = module_local.datetime(2025, 8, 28, 10, 0, 0, tzinfo=module_local.ZoneInfo("Africa/Johannesburg"))
    monkeypatch.setattr(module_local, "now_in_sa", lambda: fixed_now)

    # --- minimal fake supabase with the query-builder surface used by the route
    class QB:
        # supports: select, eq, lte, order, limit, lt, single
        def select(self, *a, **k): return self
        def eq(self, *a, **k): return self
        def lte(self, *a, **k): return self
        def order(self, *a, **k): return self
        def limit(self, *a, **k): return self
        def lt(self, *a, **k): return self
        def single(self): return self

    class FakeSupabase:
        def table(self, _): return QB()

    monkeypatch.setattr(module_local, "supabase", FakeSupabase())

    class Resp:
        def __init__(self, data): self.data = data

    # 1) last_message_id lookup returns None -> 404 branch
    def safe_404(_q): return Resp(None)
    monkeypatch.setattr(module_local, "_safe_execute", safe_404)
    with pytest.raises(module_local.HTTPException) as ei:
        module_local.page_messages_sa(module_local.MessagesPage(conversation_thread_id="c", page_size=2, last_message_id="bad"))
    assert ei.value.status_code == 404

    # 2) happy path to hit has_more/next_cursor when a page is full
    calls = {"i": 0}
    def safe_ok(_q):
        calls["i"] += 1
        if calls["i"] == 1:
            return Resp({"created_at": "2025-08-28T08:00:00+02:00"})
        elif calls["i"] == 2:
            return Resp([
                {"message_id": "m1", "created_at": "2025-08-28T07:59:00+02:00"},
                {"message_id": "m2", "created_at": "2025-08-28T07:58:00+02:00"},
            ])
        else:
            pytest.fail("unexpected order")

    monkeypatch.setattr(module_local, "_safe_execute", safe_ok)
    out = module_local.page_messages_sa(module_local.MessagesPage(conversation_thread_id="c", page_size=2, last_message_id="ok"))
    assert out["count"] == 2
    assert out["has_more"] is True
    assert out["next_cursor"] == "m2"
