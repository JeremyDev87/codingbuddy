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
