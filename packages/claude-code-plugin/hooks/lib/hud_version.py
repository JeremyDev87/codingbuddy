"""Version resolution for CodingBuddy statusLine (#1326, #1464 Wave 1-A).

Wave 1-A strengthens the version resolution chain with a local
``plugin.json`` fallback so the HUD never shows a stale snapshot after
a plugin update even when ``installed_plugins.json`` is missing or
cannot be parsed.

The public entry point is :func:`get_fresh_version`. ``codingbuddy-hud``
calls it internally from ``format_status_line``; callers pass the
current ``hud_state`` dict and optional path overrides used by tests.

Resolution chain (first non-empty result wins):

1. ``installed_plugins.json`` — authoritative after ``/plugin update``
   (global Claude Code plugin registry).
2. ``../.claude-plugin/plugin.json`` — deterministic via ``__file__``
   relative path, authoritative for dev installs where the plugin is
   running from a git checkout.
3. ``hud_state.get("version", "")`` — snapshot written at session
   start (may be stale, last resort).
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional


def _default_plugin_json_path() -> str:
    """Resolve ``plugin.json`` relative to this module's location.

    ``hud_version.py`` lives at
    ``packages/claude-code-plugin/hooks/lib/hud_version.py``.
    ``plugin.json`` lives at
    ``packages/claude-code-plugin/.claude-plugin/plugin.json``.
    So we walk up two levels (``lib/`` -> ``hooks/`` -> package root)
    and then descend into ``.claude-plugin/``.
    """
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.normpath(
        os.path.join(here, "..", "..", ".claude-plugin", "plugin.json")
    )


def _read_local_plugin_json(path: str) -> str:
    """Read ``plugin.json`` and return its ``version`` field.

    Returns an empty string on any failure (missing file, parse error,
    missing key). Never raises — caller must be able to skip silently.
    """
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        v = data.get("version")
        return v if isinstance(v, str) else ""
    except Exception:
        return ""


def get_fresh_version(
    hud_state: Dict[str, Any],
    *,
    plugins_file: str = "",
    plugin_json_file: Optional[str] = None,
) -> str:
    """Return the freshest known plugin version string.

    Args:
        hud_state: Current HUD state dict (supplies the final fallback
            ``version`` field).
        plugins_file: Optional override for the
            ``installed_plugins.json`` path, used by tests.
        plugin_json_file: Local ``plugin.json`` fallback control:

            * ``None`` (default) — tier-2 fallback is **disabled**.
              Only ``installed_plugins.json`` and ``hud_state`` are
              consulted. This keeps the signature backwards-compatible
              with callers that do not opt in.
            * ``""`` — use the default dev-install path resolved from
              ``__file__`` (i.e. ``../.claude-plugin/plugin.json``).
              ``format_status_line`` passes this in production so
              statusLine always reflects a fresh local version.
            * non-empty string — treat as an explicit file path
              override, used by the test suite for fixture files.

    Notes:
        ``hud_helpers`` is imported lazily inside the function body to
        preserve the hot-path resilience of the original monolith. If
        ``hud_helpers`` is temporarily broken (e.g. mid-wave refactor),
        the statusLine still renders via the later fallbacks instead
        of crashing at module load.
    """
    # 1. Global installed_plugins.json (authoritative after /plugin update)
    try:
        from hud_helpers import read_installed_version  # lazy for resilience
        kwargs = {"plugins_file": plugins_file} if plugins_file else {}
        fresh = read_installed_version(**kwargs)
        if fresh:
            return fresh
    except Exception:
        pass

    # 2. Local plugin.json (opt-in: None disables this tier entirely)
    if plugin_json_file is not None:
        path_to_try = plugin_json_file or _default_plugin_json_path()
        local = _read_local_plugin_json(path_to_try)
        if local:
            return local

    # 3. hud-state snapshot (may be stale, last resort)
    return hud_state.get("version", "")
