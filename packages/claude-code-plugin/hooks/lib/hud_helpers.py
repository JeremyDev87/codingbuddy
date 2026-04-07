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

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional

from hud_state import read_hud_state, update_hud_state

# Council lifecycle stages — forward-only progression (#1368)
COUNCIL_STAGES = ("opening", "reviewing", "consensus", "done")

# Tool completions that signal specialist analysis is underway
_SPECIALIST_SIGNAL_TOOLS = frozenset({
    "Agent",
    "mcp__codingbuddy__analyze_task",
    "mcp__codingbuddy__prepare_parallel_agents",
    "mcp__codingbuddy__dispatch_agents",
    "mcp__codingbuddy__generate_checklist",
})

# Tool completions that signal the council is converging on decisions
_CONSENSUS_SIGNAL_TOOLS = frozenset({
    "Edit",
    "Write",
    "mcp__codingbuddy__update_context",
})

# Quality-check command patterns for blocker detection
_TEST_CMD_PATTERNS = ("pytest", "vitest", "jest", "yarn test", "npm test")
_TYPECHECK_CMD_PATTERNS = ("tsc", "type-check", "typecheck")
_LINT_CMD_PATTERNS = ("eslint", "prettier --check", "yarn lint", "npm run lint")

_DEFAULT_PLUGINS_FILE = str(
    Path.home() / ".claude" / "plugins" / "installed_plugins.json"
)


def read_installed_version(
    plugins_file: str = _DEFAULT_PLUGINS_FILE,
) -> Optional[str]:
    """Read codingbuddy version from installed_plugins.json.

    Returns the version string or None if unavailable.
    Accepts an explicit *plugins_file* path for testing.
    """
    try:
        path = Path(plugins_file)
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        for key, entries in data.get("plugins", {}).items():
            if "codingbuddy" in key and entries:
                return entries[0].get("version")
    except Exception:
        return None
    return None

# Map mode -> initial phase value
_MODE_PHASE_MAP = {
    "PLAN": "planning",
    "ACT": "executing",
    "EVAL": "evaluating",
    "AUTO": "cycling",
}


# Modes eligible for council state seeding (#1361)
_COUNCIL_ELIGIBLE_MODES = {"PLAN", "EVAL", "AUTO"}


def on_mode_entry(
    mode: str,
    *,
    council_preset: Optional[Dict] = None,
    state_file: Optional[str] = None,
) -> None:
    """Reset workflow fields when a new mode is entered.

    Called from UserPromptSubmit after mode keyword detection.
    When *council_preset* is supplied and the mode is eligible
    (PLAN/EVAL/AUTO), council state is seeded immediately so
    downstream surfaces can render a first-scene (#1361).

    Args:
        mode: The detected mode (PLAN, ACT, EVAL, AUTO).
        council_preset: Optional dict with ``primary`` (str) and
            ``specialists`` (list[str]) keys.  Ignored for ACT mode.
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
            # Council UX reset (#1364)
            "councilActive": False,
            "councilStage": "",
            "councilCast": [],
        }

        # Seed council state for eligible modes (#1361)
        if council_preset and mode.upper() in _COUNCIL_ELIGIBLE_MODES:
            primary = council_preset.get("primary", "")
            specialists = council_preset.get("specialists", [])
            cast = [primary] + list(specialists) if primary else list(specialists)
            kwargs["councilActive"] = True
            kwargs["councilStage"] = "opening"
            kwargs["councilCast"] = cast

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

    Called from PostToolUse.  Captures agent handoffs, phase
    transitions, council stage advancement, and blocker counts
    evident from tool outputs (#1368).

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

        # Council stage advancement (#1368) — only read state when the
        # tool could actually trigger a transition, avoiding disk I/O
        # on every Read/Grep/Glob call.
        _council_tools = _SPECIALIST_SIGNAL_TOOLS | _CONSENSUS_SIGNAL_TOOLS | {"mcp__codingbuddy__parse_mode"}
        if tool_name in _council_tools:
            sf_kwargs = {"state_file": state_file} if state_file else {}
            state = read_hud_state(fill_defaults=True, **sf_kwargs)

            if state.get("councilActive"):
                current_stage = state.get("councilStage", "")
                next_stage = _infer_council_advance(tool_name, current_stage)
                if next_stage:
                    updates["councilStage"] = next_stage

        # Blocker detection (#1368)
        blocker_count = _detect_blocker_count(tool_name, tool_input, tool_output)
        if blocker_count is not None:
            updates["blockerCount"] = blocker_count

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
            # Council UX reset (#1364)
            "councilActive": False,
            "councilStage": "",
            "councilCast": [],
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


def on_council_update(
    *,
    active: Optional[bool] = None,
    stage: Optional[str] = None,
    cast: Optional[List[str]] = None,
    state_file: Optional[str] = None,
) -> None:
    """Update council-related HUD fields (#1364).

    Only supplied arguments are written; omitted fields are preserved.
    Allows callers to start, advance, or end a council session.

    Args:
        active: Whether a council is currently active.
        stage: Current council stage (opening, reviewing, consensus, done).
        cast: List of specialist agent names participating in the council.
        state_file: Optional explicit path; uses default when None.
    """
    try:
        updates: dict = {}
        if active is not None:
            updates["councilActive"] = active
        if stage is not None:
            updates["councilStage"] = stage
        if cast is not None:
            updates["councilCast"] = cast

        if updates:
            if state_file:
                update_hud_state(state_file=state_file, **updates)
            else:
                update_hud_state(**updates)
    except Exception:
        pass


# ---- private helpers ----


def _infer_council_advance(
    tool_name: str,
    current_stage: str,
) -> Optional[str]:
    """Infer the next council stage from a completed tool.

    Stage transitions are forward-only:
        opening → reviewing → consensus → done

    Returns the new stage name, or None if no transition applies.
    """
    if not current_stage or current_stage not in COUNCIL_STAGES:
        return None

    if current_stage == "done":
        return None

    if current_stage == "opening" and tool_name in _SPECIALIST_SIGNAL_TOOLS:
        return "reviewing"

    if current_stage == "reviewing" and tool_name in _CONSENSUS_SIGNAL_TOOLS:
        return "consensus"

    if current_stage == "consensus" and tool_name == "mcp__codingbuddy__parse_mode":
        return "done"

    return None


def _detect_blocker_count(
    tool_name: str,
    tool_input: dict,
    tool_output: str,
) -> Optional[int]:
    """Detect blocker count from quality-check Bash output.

    Returns:
        int >= 0 when the tool is a quality-check command
            (0 means all checks passed — clear blockers).
        None for non-quality tools (meaning "don't touch blockerCount").
    """
    if tool_name != "Bash":
        return None

    cmd = tool_input.get("command", "")
    output = (tool_output or "").lower()

    # Test runner
    if any(p in cmd for p in _TEST_CMD_PATTERNS):
        match = re.search(r"(\d+)\s+failed", output)
        if match:
            return int(match.group(1))
        if "failed" in output or "fail" in output:
            return 1
        return 0

    # Type checker
    if any(p in cmd for p in _TYPECHECK_CMD_PATTERNS):
        errors = re.findall(r"error ts\d+", output)
        if errors:
            return len(errors)
        if "error" in output:
            return 1
        return 0

    # Linter
    if any(p in cmd for p in _LINT_CMD_PATTERNS):
        if "error" in output:
            return 1
        return 0

    return None


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
