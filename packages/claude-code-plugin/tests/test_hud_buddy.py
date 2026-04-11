"""Sanity test for hud_buddy re-export (Wave 0 / #1463)."""
import importlib
import os
import sys

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
_lib_dir = os.path.join(_hooks_dir, "lib")
for _p in (_hooks_dir, _lib_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import hud_buddy  # noqa: E402
from tiny_actor_presets import BUDDY_FACE as CANONICAL_BUDDY_FACE  # noqa: E402


def test_reexport_is_canonical_ssot():
    """hud_buddy.BUDDY_FACE must be the canonical tiny_actor_presets.BUDDY_FACE."""
    assert hud_buddy.BUDDY_FACE is CANONICAL_BUDDY_FACE


def test_value_matches_glyph():
    """Sanity: the face is the three-char smiley."""
    assert hud_buddy.BUDDY_FACE == "\u25d5\u203f\u25d5"


def test_reexport_identity_from_codingbuddy_hud():
    """Lock: hud.BUDDY_FACE is the same object (re-export chain intact)."""
    hud_main = importlib.import_module("codingbuddy-hud")
    assert hud_main.BUDDY_FACE is hud_buddy.BUDDY_FACE
    assert hud_main.BUDDY_FACE is CANONICAL_BUDDY_FACE


# ========================= Wave 2-A: face state engine ======================


def test_face_constants_defined():
    """All five named faces are distinct non-empty strings."""
    faces = {
        hud_buddy.FACE_IDLE,
        hud_buddy.FACE_THINKING,
        hud_buddy.FACE_ACTIVE,
        hud_buddy.FACE_ERROR,
        hud_buddy.FACE_VICTORY,
    }
    assert len(faces) == 5
    for face in faces:
        assert face  # non-empty
        assert len(face) >= 3  # 3-char glyphs


def test_face_idle_matches_canonical_buddy():
    """FACE_IDLE is the canonical buddy face."""
    assert hud_buddy.FACE_IDLE is hud_buddy.BUDDY_FACE


# --- get_buddy_face: phase mapping ---


def test_get_face_ready_phase_is_idle():
    assert hud_buddy.get_buddy_face("ready") == hud_buddy.FACE_IDLE


def test_get_face_planning_phase_is_thinking():
    assert hud_buddy.get_buddy_face("planning") == hud_buddy.FACE_THINKING


def test_get_face_executing_phase_is_active():
    assert hud_buddy.get_buddy_face("executing") == hud_buddy.FACE_ACTIVE


def test_get_face_evaluating_phase_is_thinking():
    assert hud_buddy.get_buddy_face("evaluating") == hud_buddy.FACE_THINKING


def test_get_face_cycling_phase_is_active():
    assert hud_buddy.get_buddy_face("cycling") == hud_buddy.FACE_ACTIVE


def test_get_face_completed_phase_is_victory():
    assert hud_buddy.get_buddy_face("completed") == hud_buddy.FACE_VICTORY


def test_get_face_case_insensitive():
    assert hud_buddy.get_buddy_face("PLANNING") == hud_buddy.FACE_THINKING
    assert hud_buddy.get_buddy_face("Executing") == hud_buddy.FACE_ACTIVE


def test_get_face_unknown_phase_falls_back_to_idle():
    assert hud_buddy.get_buddy_face("waiting") == hud_buddy.FACE_IDLE
    assert hud_buddy.get_buddy_face("unknown") == hud_buddy.FACE_IDLE


def test_get_face_empty_phase_is_idle():
    assert hud_buddy.get_buddy_face("") == hud_buddy.FACE_IDLE


def test_get_face_none_phase_is_idle():
    assert hud_buddy.get_buddy_face(None) == hud_buddy.FACE_IDLE


# --- get_buddy_face: priority rules ---


def test_blocker_count_beats_phase():
    """Any positive blocker_count triggers the error face."""
    assert (
        hud_buddy.get_buddy_face("executing", blocker_count=1)
        == hud_buddy.FACE_ERROR
    )


def test_blocker_count_zero_does_not_trigger():
    assert (
        hud_buddy.get_buddy_face("executing", blocker_count=0)
        == hud_buddy.FACE_ACTIVE
    )


def test_blocker_count_beats_victory():
    """Even a victory event yields error when blockers are present."""
    assert (
        hud_buddy.get_buddy_face(
            "completed", blocker_count=3, recent_event="victory"
        )
        == hud_buddy.FACE_ERROR
    )


def test_blocker_count_malformed_ignored():
    """Non-numeric blocker_count falls through to phase mapping."""
    assert (
        hud_buddy.get_buddy_face("planning", blocker_count="abc")  # type: ignore[arg-type]
        == hud_buddy.FACE_THINKING
    )


def test_recent_event_victory_beats_phase():
    """Victory event wins over phase when no blockers."""
    assert (
        hud_buddy.get_buddy_face("executing", recent_event="victory")
        == hud_buddy.FACE_VICTORY
    )


def test_recent_event_case_insensitive():
    assert (
        hud_buddy.get_buddy_face("planning", recent_event="VICTORY")
        == hud_buddy.FACE_VICTORY
    )


def test_recent_event_unknown_ignored():
    assert (
        hud_buddy.get_buddy_face("planning", recent_event="foobar")
        == hud_buddy.FACE_THINKING
    )


# --- select_face_from_state ---


def test_select_face_from_empty_state():
    assert hud_buddy.select_face_from_state({}) == hud_buddy.FACE_IDLE


def test_select_face_from_none_state():
    assert hud_buddy.select_face_from_state(None) == hud_buddy.FACE_IDLE  # type: ignore[arg-type]


def test_select_face_from_planning_state():
    state = {"phase": "planning", "blockerCount": 0}
    assert hud_buddy.select_face_from_state(state) == hud_buddy.FACE_THINKING


def test_select_face_from_blocked_state():
    state = {"phase": "executing", "blockerCount": 2}
    assert hud_buddy.select_face_from_state(state) == hud_buddy.FACE_ERROR


def test_select_face_from_victory_state():
    state = {"phase": "completed", "blockerCount": 0, "lastEvent": "victory"}
    assert hud_buddy.select_face_from_state(state) == hud_buddy.FACE_VICTORY


def test_select_face_from_completed_state_without_victory_marker():
    state = {"phase": "completed", "blockerCount": 0}
    assert hud_buddy.select_face_from_state(state) == hud_buddy.FACE_VICTORY


# --- __all__ exports ---


def test_public_api_exported():
    assert "BUDDY_FACE" in hud_buddy.__all__
    assert "get_buddy_face" in hud_buddy.__all__
    assert "select_face_from_state" in hud_buddy.__all__
    for name in ("FACE_IDLE", "FACE_THINKING", "FACE_ACTIVE", "FACE_ERROR", "FACE_VICTORY"):
        assert name in hud_buddy.__all__
