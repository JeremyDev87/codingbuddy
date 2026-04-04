"""HUD state helper functions for consistent updates across hooks (#1324).

Provides high-level helpers that multiple hooks can call to update the
HUD state file with standard field semantics.  All functions silently
no-op on any error so they never block Claude Code.

Field ownership:
    SessionStart      -> init_baseline()
    UserPromptSubmit  -> on_mode_entry()
    PreToolUse        -> on_tool_start()
    PostToolUse       -> on_tool_end()
    Stop              -> on_session_stop()
"""

from __future__ import annotations

import os
from typing import Optional

from hud_state import update_hud_state

# Map mode -> initial phase value
_MODE_PHASE_MAP = {
    "PLAN": "planning",
    "ACT": "executing",
    "EVAL": "evaluating",
    "AUTO": "cycling",
}


def on_mode_entry(
    mode: str,
    *,
    state_file: Optional[str] = None,
) -> None:
    """Reset workflow fields when a new mode is entered.

    Called from UserPromptSubmit after mode keyword detection.

    Args:
        mode: The detected mode (PLAN, ACT, EVAL, AUTO).
        state_file: Optional explicit path; uses default when None.
    """
    try:
        phase = _MODE_PHASE_MAP.get(mode, "ready")
        kwargs = {
            "currentMode": mode,
            "phase": phase,
            "focus": None,
            "blockerCount": 0,
            "activeAgent": None,
            "executionStrategy": None,
            "councilStatus": None,
            "lastHandoff": None,
        }
        if state_file:
            update_hud_state(state_file=state_file, **kwargs)
        else:
            update_hud_state(**kwargs)
    except Exception:
        pass


def on_tool_start(
    tool_name: str,
    tool_input: dict,
    *,
    state_file: Optional[str] = None,
) -> None:
    """Update HUD when a tool invocation begins.

    Called from PreToolUse.  Only updates when the information is
    meaningfully stable (e.g. active agent change, MCP parse_mode).

    Args:
        tool_name: Name of the tool being invoked.
        tool_input: The tool_input dict from the hook payload.
        state_file: Optional explicit path; uses default when None.
    """
    try:
        updates: dict = {}

        # Detect active agent from environment (set by parse_mode MCP)
        agent = os.environ.get("CODINGBUDDY_ACTIVE_AGENT", "")
        if agent:
            updates["activeAgent"] = agent

        # Detect focus from meaningful tool patterns
        focus = _detect_focus(tool_name, tool_input)
        if focus is not None:
            updates["focus"] = focus

        # Detect execution strategy from Agent/Task tool use
        strategy = _detect_strategy(tool_name, tool_input)
        if strategy is not None:
            updates["executionStrategy"] = strategy

        if updates:
            if state_file:
                update_hud_state(state_file=state_file, **updates)
            else:
                update_hud_state(**updates)
    except Exception:
        pass


def on_tool_end(
    tool_name: str,
    tool_input: dict,
    tool_output: str,
    *,
    state_file: Optional[str] = None,
) -> None:
    """Record stable post-action state after a tool completes.

    Called from PostToolUse.  Captures agent handoffs and phase
    transitions that are evident from tool outputs.

    Args:
        tool_name: Name of the completed tool.
        tool_input: The tool_input dict from the hook payload.
        tool_output: The tool_output string from the hook payload.
        state_file: Optional explicit path; uses default when None.
    """
    try:
        updates: dict = {}

        # Track agent handoffs via environment changes
        agent = os.environ.get("CODINGBUDDY_ACTIVE_AGENT", "")
        if agent:
            updates["activeAgent"] = agent
            updates["lastHandoff"] = agent

        # Detect phase changes from parse_mode MCP calls
        if tool_name == "mcp__codingbuddy__parse_mode":
            mode = _extract_mode_from_parse_mode(tool_input)
            if mode:
                phase = _MODE_PHASE_MAP.get(mode, "ready")
                updates["currentMode"] = mode
                updates["phase"] = phase

        if updates:
            if state_file:
                update_hud_state(state_file=state_file, **updates)
            else:
                update_hud_state(**updates)
    except Exception:
        pass


def on_session_stop(
    *,
    state_file: Optional[str] = None,
) -> None:
    """Clear active workflow state when the session ends.

    Called from Stop hook.

    Args:
        state_file: Optional explicit path; uses default when None.
    """
    try:
        kwargs = {
            "activeAgent": None,
            "phase": "completed",
            "focus": None,
            "executionStrategy": None,
            "councilStatus": None,
            "blockerCount": 0,
        }
        if state_file:
            update_hud_state(state_file=state_file, **kwargs)
        else:
            update_hud_state(**kwargs)
    except Exception:
        pass


def init_baseline(
    pending_context: Optional[dict] = None,
    *,
    state_file: Optional[str] = None,
) -> None:
    """Enrich the freshly-initialised HUD state with baseline context.

    Called from SessionStart *after* ``init_hud_state()``.  If a pending
    context.md was detected, seeds currentMode and phase so the status
    bar immediately reflects the resuming session.

    Args:
        pending_context: Dict with optional ``mode``/``status`` keys
            from ``_read_pending_context()``.
        state_file: Optional explicit path; uses default when None.
    """
    if not pending_context:
        return

    try:
        mode = pending_context.get("mode")
        if not mode:
            return

        updates: dict = {"currentMode": mode}
        phase = _MODE_PHASE_MAP.get(mode)
        if phase:
            updates["phase"] = phase

        if state_file:
            update_hud_state(state_file=state_file, **updates)
        else:
            update_hud_state(**updates)
    except Exception:
        pass


# ---- private helpers ----


def _detect_focus(tool_name: str, tool_input: dict) -> Optional[str]:
    """Infer a human-readable focus label from the current tool call."""
    if tool_name == "Edit" or tool_name == "Write":
        path = tool_input.get("file_path", "")
        if path:
            # Return just the filename for brevity
            return os.path.basename(path)

    if tool_name == "Bash":
        cmd = tool_input.get("command", "")
        if cmd.startswith("git commit"):
            return "committing"
        if cmd.startswith("git push"):
            return "pushing"
        if "pytest" in cmd or "vitest" in cmd or "jest" in cmd:
            return "testing"
        if "yarn build" in cmd or "npm run build" in cmd:
            return "building"

    if tool_name == "mcp__codingbuddy__parse_mode":
        prompt = tool_input.get("prompt", "")
        if prompt:
            # First 40 chars of the prompt as focus
            return prompt[:40].strip()

    return None


def _detect_strategy(tool_name: str, tool_input: dict) -> Optional[str]:
    """Detect execution strategy from Agent/Task tool patterns."""
    if tool_name == "Agent":
        return "subagent"
    if tool_name == "Bash":
        cmd = tool_input.get("command", "")
        if "tmux" in cmd:
            return "taskmaestro"
    return None


def _extract_mode_from_parse_mode(tool_input: dict) -> Optional[str]:
    """Extract the mode keyword from a parse_mode tool_input."""
    prompt = tool_input.get("prompt", "")
    if not prompt:
        return None
    first_word = prompt.strip().split()[0].upper().rstrip(":")
    valid_modes = {"PLAN", "ACT", "EVAL", "AUTO"}
    return first_word if first_word in valid_modes else None
