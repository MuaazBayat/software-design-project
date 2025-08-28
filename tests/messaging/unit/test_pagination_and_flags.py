import pytest
import services.messaging.main as module

pytestmark = pytest.mark.unit


def test_paginate_list_negative_offset_and_zero_limit():
    items = list(range(5))
    # negative offset should clamp to 0; limit<=0 should clamp to 1
    page, has_more, next_off = module._paginate_list(items, limit=0, offset=-10)
    assert page == [0]
    assert has_more is True
    assert next_off == 1


def test_format_latest_message_read_flags():
    m = {
        "message_id": "m9",
        "conversation_thread_id": "c9",
        "message_content": "hi",
        "sender_id": "other",
        "recipient_id": "me",
        "scheduled_delivery_at": "2025-08-28T10:00:00+02:00",
        "read_at": "2025-08-28T10:05:00+02:00",
        "delivery_status": "read",
    }
    out = module._format_latest_message(m, my_user_id="me")
    assert out["from_me"] is False
    assert out["is_read"] is True
    assert out["delivery_status"] == "read"
