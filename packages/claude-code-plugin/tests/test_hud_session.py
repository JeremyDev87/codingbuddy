"""Behavior tests for hud_session self-heal (Wave 1-B / #1326)."""
import os
import sys
from datetime import datetime, timedelta, timezone

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
_lib_dir = os.path.join(_hooks_dir, "lib")
for _p in (_hooks_dir, _lib_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import hud_session  # noqa: E402


# --------------------------- detect_stale_session ---------------------------


def test_empty_state_not_stale():
    """Empty state is not stale — there is nothing to heal."""
    assert hud_session.detect_stale_session({}) is False


def test_none_state_not_stale():
    """None-ish state is not stale."""
    assert hud_session.detect_stale_session(None) is False  # type: ignore[arg-type]


def test_manual_fix_marker_is_stale():
    """'manual-fix' is a known repair marker."""
    assert hud_session.detect_stale_session({"sessionId": "manual-fix"}) is True


def test_empty_session_id_is_stale():
    """Empty sessionId indicates uninitialized state."""
    assert hud_session.detect_stale_session({"sessionId": ""}) is True


def test_unknown_marker_is_stale():
    """'unknown' is treated as a repair marker."""
    assert hud_session.detect_stale_session({"sessionId": "unknown"}) is True


def test_none_marker_is_stale():
    """'none' string is treated as a repair marker."""
    assert hud_session.detect_stale_session({"sessionId": "none"}) is True


def test_stdin_mismatch_is_stale():
    """When stdin provides a different sessionId, state is stale."""
    now = datetime.now(timezone.utc).isoformat()
    state = {"sessionId": "abc-123", "sessionStartTimestamp": now}
    assert (
        hud_session.detect_stale_session(state, stdin_session_id="def-456")
        is True
    )


def test_stdin_match_not_stale():
    """When stdin matches and timestamp is fresh, state is valid."""
    now = datetime.now(timezone.utc).isoformat()
    state = {"sessionId": "abc-123", "sessionStartTimestamp": now}
    assert (
        hud_session.detect_stale_session(state, stdin_session_id="abc-123")
        is False
    )


def test_empty_stdin_session_id_skips_mismatch_check():
    """Empty stdin_session_id means 'not available' — skip that check."""
    now = datetime.now(timezone.utc).isoformat()
    state = {"sessionId": "abc-123", "sessionStartTimestamp": now}
    assert hud_session.detect_stale_session(state, stdin_session_id="") is False


def test_old_timestamp_is_stale():
    """Timestamp older than SESSION_STALE_SECONDS triggers stale."""
    old = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    state = {"sessionId": "abc-123", "sessionStartTimestamp": old}
    assert hud_session.detect_stale_session(state) is True


def test_recent_timestamp_not_stale():
    """Timestamp within SESSION_STALE_SECONDS is fresh."""
    recent = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    state = {"sessionId": "abc-123", "sessionStartTimestamp": recent}
    assert hud_session.detect_stale_session(state) is False


def test_unparseable_timestamp_is_stale():
    """Garbage timestamp is treated as stale."""
    state = {
        "sessionId": "abc-123",
        "sessionStartTimestamp": "not-a-timestamp",
    }
    assert hud_session.detect_stale_session(state) is True


def test_naive_timestamp_treated_as_utc():
    """Naive datetime string (no tz) is interpreted as UTC."""
    now = datetime.now(timezone.utc)
    naive_str = now.replace(tzinfo=None).isoformat()
    state = {"sessionId": "abc-123", "sessionStartTimestamp": naive_str}
    assert hud_session.detect_stale_session(state, now=now) is False


def test_now_override_for_deterministic_age_check():
    """Clock override makes age checks deterministic."""
    fixed_now = datetime(2026, 4, 11, 12, 0, 0, tzinfo=timezone.utc)
    old = (fixed_now - timedelta(hours=5)).isoformat()
    fresh = (fixed_now - timedelta(hours=1)).isoformat()
    assert (
        hud_session.detect_stale_session(
            {"sessionId": "abc", "sessionStartTimestamp": old}, now=fixed_now
        )
        is True
    )
    assert (
        hud_session.detect_stale_session(
            {"sessionId": "abc", "sessionStartTimestamp": fresh}, now=fixed_now
        )
        is False
    )


def test_repair_marker_beats_fresh_timestamp():
    """Repair marker triggers stale even when timestamp is fresh."""
    now = datetime.now(timezone.utc).isoformat()
    state = {"sessionId": "manual-fix", "sessionStartTimestamp": now}
    assert hud_session.detect_stale_session(state) is True


# --------------------------- heal_stale_state -------------------------------


def test_heal_clears_ephemeral_fields():
    """heal_stale_state zeroes out rendering-relevant fields."""
    state = {
        "sessionId": "abc-123",
        "sessionStartTimestamp": "2026-04-01T00:00:00+00:00",
        "currentMode": "ACT",
        "version": "5.2.0",
        "activeAgent": "code-reviewer",
        "phase": "executing",
        "focus": "debugging",
        "blockerCount": 3,
    }
    healed = hud_session.heal_stale_state(state)
    assert healed["currentMode"] is None
    assert healed["version"] == ""
    assert healed["activeAgent"] is None
    assert healed["phase"] == "ready"
    assert healed["focus"] is None
    assert healed["blockerCount"] == 0


def test_heal_preserves_session_id_and_moves_timestamp_to_forensics():
    """heal_stale_state keeps sessionId but relocates sessionStartTimestamp.

    Historical note: an earlier version of this function preserved
    ``sessionStartTimestamp`` verbatim for "audit / forensics". That
    caused the Wave 1-B duration-leak bug — ``resolve_duration`` in
    codingbuddy-hud.py uses ``sessionStartTimestamp`` as a fallback
    when stdin has no ``total_duration_ms``, so a healed (but
    timestamp-retaining) state rendered enormous durations
    (e.g., ``322h52m``) for brand-new sessions.

    The fix: relocate the timestamp into ``_healedFromSessionStartTimestamp``
    so forensic value is preserved for debuggers/tests while the render
    fallback path no longer sees it.
    """
    state = {
        "sessionId": "abc-123",
        "sessionStartTimestamp": "2026-04-01T00:00:00+00:00",
        "currentMode": "ACT",
    }
    healed = hud_session.heal_stale_state(state)
    assert healed["sessionId"] == "abc-123"
    # Render fallback path must not see the stale timestamp
    assert healed["sessionStartTimestamp"] == ""
    # Forensic value is preserved for post-mortem debugging
    assert healed["_healedFromSessionStartTimestamp"] == "2026-04-01T00:00:00+00:00"


def test_heal_without_timestamp_does_not_add_forensics_field():
    """If there is no sessionStartTimestamp to heal, no forensics field is added."""
    state = {"sessionId": "abc-123", "currentMode": "ACT"}
    healed = hud_session.heal_stale_state(state)
    assert healed["sessionStartTimestamp"] == ""
    assert "_healedFromSessionStartTimestamp" not in healed


def test_heal_is_idempotent_on_forensics_field():
    """Re-healing a healed state preserves the forensics timestamp stably.

    Guards against a naive implementation that would overwrite
    ``_healedFromSessionStartTimestamp`` with the empty string on
    the second pass, losing the original value.
    """
    stale = {
        "sessionId": "manual-fix",
        "sessionStartTimestamp": "2026-03-29T04:10:47+00:00",
    }
    once = hud_session.heal_stale_state(stale)
    twice = hud_session.heal_stale_state(once)
    assert twice["_healedFromSessionStartTimestamp"] == "2026-03-29T04:10:47+00:00"
    assert twice["sessionStartTimestamp"] == ""


def test_heal_does_not_mutate_input():
    """heal_stale_state returns a copy, not a mutated input."""
    state = {
        "sessionId": "abc-123",
        "currentMode": "ACT",
        "version": "5.2.0",
    }
    healed = hud_session.heal_stale_state(state)
    assert state["currentMode"] == "ACT"  # original untouched
    assert state["version"] == "5.2.0"
    assert healed is not state


def test_heal_preserves_unknown_fields():
    """Fields not in the clear-set are preserved."""
    state = {
        "sessionId": "abc-123",
        "currentMode": "ACT",
        "customField": "should survive",
        "anotherCustom": 42,
    }
    healed = hud_session.heal_stale_state(state)
    assert healed["customField"] == "should survive"
    assert healed["anotherCustom"] == 42


def test_heal_empty_state():
    """Healing an empty dict produces a dict with default clears."""
    healed = hud_session.heal_stale_state({})
    assert healed["currentMode"] is None
    assert healed["version"] == ""
    assert healed["phase"] == "ready"


# --------------------------- reset_stale_session ----------------------------


def test_reset_stale_session_noop_on_fresh_state(tmp_path):
    """reset_stale_session should not modify a fresh state file."""
    import json

    state_file = tmp_path / "hud-state.json"
    fresh = {
        "sessionId": "abc-123",
        "sessionStartTimestamp": datetime.now(timezone.utc).isoformat(),
        "currentMode": "ACT",
        "version": "5.5.0",
    }
    state_file.write_text(json.dumps(fresh), encoding="utf-8")

    hud_session.reset_stale_session(str(state_file))

    after = json.loads(state_file.read_text(encoding="utf-8"))
    assert after["currentMode"] == "ACT"  # unchanged
    assert after["version"] == "5.5.0"


def test_reset_stale_session_heals_repair_marker(tmp_path):
    """reset_stale_session writes healed fields to a marker-tainted file."""
    import json

    state_file = tmp_path / "hud-state.json"
    stale = {
        "sessionId": "manual-fix",
        "sessionStartTimestamp": datetime.now(timezone.utc).isoformat(),
        "currentMode": "ACT",
        "version": "5.2.0",
        "activeAgent": "old-agent",
        "phase": "executing",
        "focus": "old-focus",
        "blockerCount": 5,
    }
    state_file.write_text(json.dumps(stale), encoding="utf-8")

    hud_session.reset_stale_session(str(state_file))

    after = json.loads(state_file.read_text(encoding="utf-8"))
    assert after["currentMode"] is None
    assert after["version"] == ""
    assert after["activeAgent"] is None
    assert after["phase"] == "ready"
    assert after["focus"] is None
    assert after["blockerCount"] == 0


def test_reset_stale_session_silent_on_missing_file(tmp_path):
    """reset_stale_session never raises when the file is missing."""
    missing = tmp_path / "absent.json"
    # Should not raise
    hud_session.reset_stale_session(str(missing))


def test_reset_stale_session_silent_on_malformed_file(tmp_path):
    """reset_stale_session never raises when the file is not JSON."""
    bad = tmp_path / "hud-state.json"
    bad.write_text("not a json at all", encoding="utf-8")
    hud_session.reset_stale_session(str(bad))


# --------------------------- constants --------------------------------------


def test_session_stale_seconds_is_four_hours():
    """Document the stale threshold constant."""
    assert hud_session.SESSION_STALE_SECONDS == 4 * 60 * 60
