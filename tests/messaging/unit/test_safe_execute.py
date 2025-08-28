import pytest
from fastapi import HTTPException
import services.messaging.main as module

pytestmark = pytest.mark.unit


class FakeQ:
    def __init__(self, exc: Exception):
        self._exc = exc
    def execute(self):
        raise self._exc


def test_safe_execute_fk_violation():
    q = FakeQ(Exception("boom 23503 foreign key violation blah"))
    with pytest.raises(HTTPException) as ei:
        module._safe_execute(q)
    assert ei.value.status_code == 400
    assert "Foreign key violation" in ei.value.detail


def test_safe_execute_check_violation():
    q = FakeQ(Exception("oops 23514 check constraint"))
    with pytest.raises(HTTPException) as ei:
        module._safe_execute(q)
    assert ei.value.status_code == 400
    assert "Check constraint" in ei.value.detail


def test_safe_execute_other_exception():
    q = FakeQ(RuntimeError("weird"))
    with pytest.raises(RuntimeError) as ei:
        module._safe_execute(q)
    assert str(ei.value) == "weird"


