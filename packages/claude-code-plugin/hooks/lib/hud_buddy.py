"""Buddy face re-export for CodingBuddy statusLine (#1326).

``BUDDY_FACE`` is canonically defined in
``tiny_actor_presets.BUDDY_FACE`` and already covered by
``tests/test_tiny_actor_presets.py`` for value/type assertions. This
module re-exports it so statusLine helpers that conceptually belong to
the HUD layer can depend on a ``hud_*`` module instead of reaching into
``tiny_actor_presets``.

Wave 0 establishes the re-export only. Wave 2-A will extend this file
with breathing Buddy face state logic (e.g., ``get_buddy_face(phase)``).
"""
from __future__ import annotations

from tiny_actor_presets import BUDDY_FACE  # canonical SSoT

__all__ = ["BUDDY_FACE"]
