"""Version resolution for CodingBuddy statusLine (#1326).

Wave 0 extracts the plugin-version fallback logic from
``codingbuddy-hud.py`` so Wave 1-A can extend the resolution chain
without touching the monolith.

The public entry point is :func:`get_fresh_version`. ``codingbuddy-hud``
calls it internally from ``format_status_line``; callers pass the
current ``hud_state`` dict and an optional ``plugins_file`` override
used by the test-suite to point at a fixture path.

Behavior-preserving contract (mirrors the original monolith helper):

1. Attempt to read the freshest version from
   ``installed_plugins.json`` via
   :func:`hud_helpers.read_installed_version`.
2. On success, return that value.
3. On any failure (missing file, parse error, unexpected exception),
   fall back to ``hud_state.get("version", "")``.
"""
from __future__ import annotations

from typing import Any, Dict


def get_fresh_version(
    hud_state: Dict[str, Any],
    *,
    plugins_file: str = "",
) -> str:
    """Return the freshest known plugin version string.

    Args:
        hud_state: Current HUD state dict (supplies the fallback
            ``version`` field).
        plugins_file: Optional override for the
            ``installed_plugins.json`` path, used by tests.

    Notes:
        ``hud_helpers`` is imported lazily inside the function body to
        preserve the hot-path resilience of the original monolith. If
        ``hud_helpers`` is temporarily broken (e.g. mid-wave refactor),
        the statusLine still renders via the ``hud_state`` fallback
        instead of crashing at module load.
    """
    try:
        from hud_helpers import read_installed_version  # lazy for resilience
        kwargs = {"plugins_file": plugins_file} if plugins_file else {}
        fresh = read_installed_version(**kwargs)
        if fresh:
            return fresh
    except Exception:
        pass
    return hud_state.get("version", "")
