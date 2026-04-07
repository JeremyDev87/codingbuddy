"""Permission forecast formatting for CodingBuddy plugin (#1418).

Formats permission forecast data from parse_mode MCP responses and
generates standalone forecasts for self-contained mode.

All public functions are pure — no I/O, no side effects.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Sequence


# ─── Permission class definitions ────────────────────────────────────

# Map of permission class to compact icon+label
PERMISSION_CLASS_LABELS: Dict[str, str] = {
    "read-only": "read-only",
    "repo-write": "repo-write",
    "network": "network",
    "destructive": "destructive",
    "external": "external",
}

# ─── Standalone forecasts per mode ────────────────────────────────────

# Default permission classes per mode (mirrors MCP server MODE_BASE_CLASSES)
MODE_BASE_CLASSES: Dict[str, List[str]] = {
    "PLAN": ["read-only"],
    "ACT": ["read-only", "repo-write"],
    "EVAL": ["read-only"],
    "AUTO": ["read-only", "repo-write", "external"],
}

# Default approval bundles per mode for standalone
MODE_DEFAULT_BUNDLES: Dict[str, List[Dict[str, str]]] = {
    "PLAN": [],
    "ACT": [
        {"name": "Code changes", "permissionClass": "repo-write"},
    ],
    "EVAL": [],
    "AUTO": [
        {"name": "Code changes", "permissionClass": "repo-write"},
        {"name": "Ship changes", "permissionClass": "external"},
    ],
}


# ─── Public API ───────────────────────────────────────────────────────


def format_permission_forecast(
    permission_classes: Sequence[str],
    approval_bundles: Optional[Sequence[Dict[str, str]]] = None,
) -> str:
    """Format permission forecast data as a compact status line.

    Args:
        permission_classes: List of permission class names
            (e.g. ["read-only", "repo-write"]).
        approval_bundles: Optional list of bundle dicts, each with
            at least ``name`` and ``permissionClass`` keys.

    Returns:
        Compact one-line string, e.g.
        ``Permissions: repo-write (Code changes) | external (Ship changes)``

        Returns empty string when there are no permission classes
        or only "read-only" with no bundles.
    """
    if not permission_classes:
        return ""

    # Filter out read-only when it is the only class and there are no bundles
    non_readonly = [c for c in permission_classes if c != "read-only"]
    if not non_readonly and not approval_bundles:
        return ""

    parts: list[str] = []

    if approval_bundles:
        # Group bundles by permission class for compact display
        for bundle in approval_bundles:
            name = bundle.get("name", "")
            pclass = bundle.get("permissionClass", "")
            label = PERMISSION_CLASS_LABELS.get(pclass, pclass)
            parts.append(f"{label} ({name})")
    else:
        # No bundles — just list the non-readonly classes
        for pclass in non_readonly:
            label = PERMISSION_CLASS_LABELS.get(pclass, pclass)
            parts.append(label)

    if not parts:
        return ""

    return "Permissions: " + " | ".join(parts)


def format_permission_forecast_from_mcp(
    forecast: Optional[Dict],
) -> str:
    """Extract and format permission forecast from a parse_mode MCP response.

    NOTE: Reserved for future MCP integration — not yet called by production code.

    Args:
        forecast: The ``permissionForecast`` dict from parse_mode, or None.

    Returns:
        Compact status line string, or empty string if no forecast data.
    """
    if not forecast:
        return ""

    classes = forecast.get("permissionClasses", [])
    bundles = forecast.get("approvalBundles", [])

    return format_permission_forecast(classes, bundles if bundles else None)


def generate_standalone_forecast(mode: str) -> str:
    """Generate a permission forecast for standalone (non-MCP) mode.

    Uses the same base permission classes as the MCP server to keep
    the display consistent regardless of backend.

    Args:
        mode: Mode name (PLAN, ACT, EVAL, AUTO).

    Returns:
        Compact status line string, or empty string for read-only modes.
    """
    mode_upper = mode.upper()
    classes = MODE_BASE_CLASSES.get(mode_upper, [])
    bundles = MODE_DEFAULT_BUNDLES.get(mode_upper, [])

    return format_permission_forecast(classes, bundles if bundles else None)
