from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.security import TenantCredentialCounter


class _Counter:
    def __init__(self, last_value=0):
        self.last_value = last_value


class _Query:
    """
    Minimal controlled query double for the exact call chain:

        cls.query
            .without_tenant_filter()
            .filter_by(...)
            .with_for_update()
            .first()
    """

    def __init__(self, first_results):
        self._results = iter(first_results)
        self.filter_calls = []

    def without_tenant_filter(self):
        return self

    def filter_by(self, **kwargs):
        self.filter_calls.append(kwargs)
        return self

    def with_for_update(self):
        return self

    def first(self):
        return next(self._results)


def _integrity_error():
    return IntegrityError(
        "INSERT INTO tenant_credential_counters ...",
        {},
        Exception("duplicate key"),
    )


def test_non_integrity_flush_error_propagates_without_session_rollback():
    """
    Arbitrary programming/runtime/database failures are not a legitimate
    concurrent-insert race.

    Desired contract:
      * original exception propagates;
      * broad session.rollback() is never invoked.
    """
    tenant_id = uuid.uuid4()
    query = _Query([None])

    session = MagicMock()
    session.flush.side_effect = RuntimeError("synthetic non-integrity failure")

    with (
        patch.object(TenantCredentialCounter, "query", query),
        patch("app.models.security.db.session", session),
    ):
        with pytest.raises(
            RuntimeError,
            match="synthetic non-integrity failure",
        ):
            TenantCredentialCounter.get_next_serial(
                tenant_id=tenant_id,
                year=2026,
            )

    session.rollback.assert_not_called()


def test_integrity_race_does_not_broad_rollback_caller_transaction():
    """
    A duplicate-row initialization race may be recoverable, but recovery
    must not roll back the caller's whole SQLAlchemy session/transaction.
    """
    tenant_id = uuid.uuid4()
    winner = _Counter(last_value=7)

    # Initial lookup misses. Retry sees the concurrently-created winner.
    query = _Query([None, winner])

    session = MagicMock()
    session.flush.side_effect = [
        _integrity_error(),
        None,
    ]

    with (
        patch.object(TenantCredentialCounter, "query", query),
        patch("app.models.security.db.session", session),
    ):
        value = TenantCredentialCounter.get_next_serial(
            tenant_id=tenant_id,
            year=2026,
        )

    assert value == 8
    assert winner.last_value == 8

    # This is the critical RED assertion against the current implementation.
    session.rollback.assert_not_called()


def test_integrity_race_with_missing_winner_fails_explicitly():
    """
    If the duplicate-insert path cannot find the winning row, do not fall
    through into `None.last_value`.

    The hardened implementation must raise an explicit transaction/race
    recovery error instead of AttributeError.
    """
    tenant_id = uuid.uuid4()

    # Initial lookup misses; retry also misses.
    query = _Query([None, None])

    session = MagicMock()
    session.flush.side_effect = _integrity_error()

    with (
        patch.object(TenantCredentialCounter, "query", query),
        patch("app.models.security.db.session", session),
    ):
        with pytest.raises(RuntimeError, match="counter"):
            TenantCredentialCounter.get_next_serial(
                tenant_id=tenant_id,
                year=2026,
            )


def test_existing_counter_path_still_increments_without_rollback():
    """
    Existing-row path remains simple and unchanged:
    lock -> increment -> flush -> return.
    """
    tenant_id = uuid.uuid4()
    counter = _Counter(last_value=11)
    query = _Query([counter])

    session = MagicMock()

    with (
        patch.object(TenantCredentialCounter, "query", query),
        patch("app.models.security.db.session", session),
    ):
        value = TenantCredentialCounter.get_next_serial(
            tenant_id=tenant_id,
            year=2026,
        )

    assert value == 12
    assert counter.last_value == 12
    session.rollback.assert_not_called()
    assert session.flush.call_count == 1


def test_explicit_tenant_and_year_are_preserved_on_lookup():
    """
    Hardening must not weaken the explicit authoritative tenant predicate.
    """
    tenant_id = uuid.uuid4()
    counter = _Counter(last_value=2)
    query = _Query([counter])

    session = MagicMock()

    with (
        patch.object(TenantCredentialCounter, "query", query),
        patch("app.models.security.db.session", session),
    ):
        value = TenantCredentialCounter.get_next_serial(
            tenant_id=str(tenant_id),
            year=2031,
        )

    assert value == 3

    assert query.filter_calls == [
        {
            "tenant_id": tenant_id,
            "year": 2031,
        }
    ]