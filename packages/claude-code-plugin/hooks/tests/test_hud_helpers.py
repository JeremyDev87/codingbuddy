"""Tests for hud_helpers module (#1324).

Validates HUD state transitions driven by each hook lifecycle event:
SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop.
"""

import json
import os
import sys
import tempfile

import pytest

# Ensure hooks/lib is importable
_hooks_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_lib_dir = os.path.join(_hooks_dir, "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from hud_state import init_hud_state, read_hud_state
from hud_helpers import (
    init_baseline,
    on_mode_entry,
    on_tool_start,
    on_tool_end,
    on_session_stop,
    on_council_update,
    read_installed_version,
    _detect_focus,
    _detect_strategy,
    _extract_mode_from_parse_mode,
)


@pytest.fixture()
def state_file(tmp_path):
    """Create a temp HUD state file, initialized with baseline state."""
    sf = str(tmp_path / "hud-state.json")
    init_hud_state("test-session-123", "5.0.0", state_file=sf)
    return sf


def _read(sf: str) -> dict:
    """Read and return state from file."""
    return read_hud_state(sf, fill_defaults=True)


# ---- init_baseline ----

class TestInitBaseline:
    """SessionStart: init_baseline enriches freshly-initialized state."""

    def test_sets_mode_and_phase_from_pending_context(self, state_file):
        init_baseline({"mode": "ACT"}, state_file=state_file)
        state = _read(state_file)
        assert state["currentMode"] == "ACT"
        assert state["phase"] == "executing"

    def test_noop_when_no_pending_context(self, state_file):
        init_baseline(None, state_file=state_file)
        state = _read(state_file)
        assert state["currentMode"] is None  # unchanged from init
        assert state["phase"] == "ready"

    def test_noop_when_pending_context_has_no_mode(self, state_file):
        init_baseline({"status": "in_progress"}, state_file=state_file)
        state = _read(state_file)
        assert state["currentMode"] is None

    def test_plan_mode_from_context(self, state_file):
        init_baseline({"mode": "PLAN"}, state_file=state_file)
        state = _read(state_file)
        assert state["currentMode"] == "PLAN"
        assert state["phase"] == "planning"


# ---- on_mode_entry ----

class TestOnModeEntry:
    """UserPromptSubmit: on_mode_entry resets workflow fields."""

    def test_plan_mode_sets_phase_planning(self, state_file):
        on_mode_entry("PLAN", state_file=state_file)
        state = _read(state_file)
        assert state["currentMode"] == "PLAN"
        assert state["phase"] == "planning"
        assert state["focus"] is None
        assert state["blockerCount"] == 0

    def test_act_mode_sets_phase_executing(self, state_file):
        on_mode_entry("ACT", state_file=state_file)
        state = _read(state_file)
        assert state["currentMode"] == "ACT"
        assert state["phase"] == "executing"

    def test_eval_mode_sets_phase_evaluating(self, state_file):
        on_mode_entry("EVAL", state_file=state_file)
        state = _read(state_file)
        assert state["currentMode"] == "EVAL"
        assert state["phase"] == "evaluating"

    def test_auto_mode_sets_phase_cycling(self, state_file):
        on_mode_entry("AUTO", state_file=state_file)
        state = _read(state_file)
        assert state["currentMode"] == "AUTO"
        assert state["phase"] == "cycling"

    def test_resets_focus_and_blockers(self, state_file):
        # Set some values first
        from hud_state import update_hud_state
        update_hud_state(state_file=state_file, focus="old-file.py", blockerCount=3)

        on_mode_entry("PLAN", state_file=state_file)
        state = _read(state_file)
        assert state["focus"] is None
        assert state["blockerCount"] == 0

    @pytest.mark.parametrize("mode,expected_phase", [
        ("PLAN", "planning"),
        ("ACT", "executing"),
        ("EVAL", "evaluating"),
        ("AUTO", "cycling"),
    ])
    def test_resets_all_stale_workflow_fields(self, state_file, mode, expected_phase):
        """Seed ALL workflow fields with non-default values then verify full reset."""
        from hud_state import update_hud_state
        update_hud_state(
            state_file=state_file,
            currentMode="EVAL",
            phase="evaluating",
            focus="old-file.py",
            blockerCount=5,
            activeAgent="Security Specialist",
            executionStrategy="subagent",
            councilStatus="voting",
            lastHandoff="Frontend Developer",
            councilActive=True,
            councilStage="reviewing",
            councilCast=["arch", "security"],
        )

        on_mode_entry(mode, state_file=state_file)
        state = _read(state_file)

        assert state["currentMode"] == mode
        assert state["phase"] == expected_phase
        assert state["focus"] is None
        assert state["blockerCount"] == 0
        assert state["activeAgent"] is None
        assert state["executionStrategy"] is None
        assert state["councilStatus"] is None
        assert state["lastHandoff"] is None
        # Council fields reset (#1364)
        assert state["councilActive"] is False
        assert state["councilStage"] == ""
        assert state["councilCast"] == []

    def test_unknown_mode_defaults_to_ready(self, state_file):
        on_mode_entry("UNKNOWN", state_file=state_file)
        state = _read(state_file)
        assert state["currentMode"] == "UNKNOWN"
        assert state["phase"] == "ready"


# ---- on_tool_start ----

class TestOnToolStart:
    """PreToolUse: on_tool_start updates active agent, focus, strategy."""

    def test_sets_active_agent_from_env(self, state_file, monkeypatch):
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "Frontend Developer")
        on_tool_start("Edit", {"file_path": "/src/app.tsx"}, state_file=state_file)
        state = _read(state_file)
        assert state["activeAgent"] == "Frontend Developer"

    def test_sets_focus_for_edit_tool(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        on_tool_start("Edit", {"file_path": "/src/components/Button.tsx"}, state_file=state_file)
        state = _read(state_file)
        assert state["focus"] == "Button.tsx"

    def test_sets_focus_for_write_tool(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        on_tool_start("Write", {"file_path": "/src/new-file.py"}, state_file=state_file)
        state = _read(state_file)
        assert state["focus"] == "new-file.py"

    def test_sets_focus_testing_for_pytest_command(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        on_tool_start("Bash", {"command": "python -m pytest tests/ -v"}, state_file=state_file)
        state = _read(state_file)
        assert state["focus"] == "testing"

    def test_sets_focus_building_for_build_command(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        on_tool_start("Bash", {"command": "yarn build"}, state_file=state_file)
        state = _read(state_file)
        assert state["focus"] == "building"

    def test_sets_strategy_subagent_for_agent_tool(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        on_tool_start("Agent", {"prompt": "review code"}, state_file=state_file)
        state = _read(state_file)
        assert state["executionStrategy"] == "subagent"

    def test_sets_strategy_taskmaestro_for_tmux(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        on_tool_start("Bash", {"command": "tmux split-window"}, state_file=state_file)
        state = _read(state_file)
        assert state["executionStrategy"] == "taskmaestro"

    def test_noop_when_no_meaningful_info(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        # Read tool with no matching patterns
        old_state = _read(state_file)
        on_tool_start("Read", {"file_path": "/src/app.py"}, state_file=state_file)
        new_state = _read(state_file)
        # updatedAt may change, compare meaningful fields
        assert new_state["activeAgent"] == old_state["activeAgent"]
        assert new_state["focus"] == old_state["focus"]


# ---- on_tool_end ----

class TestOnToolEnd:
    """PostToolUse: on_tool_end records post-action state."""

    def test_updates_agent_and_handoff(self, state_file, monkeypatch):
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "Security Specialist")
        on_tool_end("Bash", {}, "", state_file=state_file)
        state = _read(state_file)
        assert state["activeAgent"] == "Security Specialist"
        assert state["lastHandoff"] == "Security Specialist"

    def test_updates_mode_from_parse_mode(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        on_tool_end(
            "mcp__codingbuddy__parse_mode",
            {"prompt": "EVAL: review code quality"},
            "{}",
            state_file=state_file,
        )
        state = _read(state_file)
        assert state["currentMode"] == "EVAL"
        assert state["phase"] == "evaluating"

    def test_noop_when_no_agent_and_no_parse_mode(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        old_state = _read(state_file)
        on_tool_end("Read", {}, "", state_file=state_file)
        new_state = _read(state_file)
        assert new_state["activeAgent"] == old_state["activeAgent"]


# ---- on_session_stop ----

class TestOnSessionStop:
    """Stop: on_session_stop clears active state."""

    def test_clears_agent_and_sets_completed(self, state_file):
        # Set up active state first
        from hud_state import update_hud_state
        update_hud_state(
            state_file=state_file,
            activeAgent="Frontend Developer",
            phase="executing",
            focus="app.tsx",
            executionStrategy="subagent",
            blockerCount=2,
            councilActive=True,
            councilStage="reviewing",
            councilCast=["arch"],
        )

        on_session_stop(state_file=state_file)
        state = _read(state_file)

        assert state["activeAgent"] is None
        assert state["phase"] == "completed"
        assert state["focus"] is None
        assert state["executionStrategy"] is None
        assert state["councilStatus"] is None
        assert state["blockerCount"] == 0
        # Council fields cleared (#1364)
        assert state["councilActive"] is False
        assert state["councilStage"] == ""
        assert state["councilCast"] == []

    def test_preserves_session_metadata(self, state_file):
        on_session_stop(state_file=state_file)
        state = _read(state_file)
        # Session metadata should survive
        assert state["sessionId"] == "test-session-123"
        assert state["version"] == "5.0.0"
        assert "sessionStartTimestamp" in state


# ---- private helpers ----

class TestDetectFocus:
    def test_returns_filename_for_edit(self):
        assert _detect_focus("Edit", {"file_path": "/a/b/c.py"}) == "c.py"

    def test_returns_filename_for_write(self):
        assert _detect_focus("Write", {"file_path": "/x/y.ts"}) == "y.ts"

    def test_returns_testing_for_pytest(self):
        assert _detect_focus("Bash", {"command": "python -m pytest"}) == "testing"

    def test_returns_testing_for_vitest(self):
        assert _detect_focus("Bash", {"command": "npx vitest run"}) == "testing"

    def test_returns_building_for_yarn_build(self):
        assert _detect_focus("Bash", {"command": "yarn build"}) == "building"

    def test_returns_committing_for_git_commit(self):
        assert _detect_focus("Bash", {"command": "git commit -m 'fix'"}) == "committing"

    def test_returns_pushing_for_git_push(self):
        assert _detect_focus("Bash", {"command": "git push origin main"}) == "pushing"

    def test_returns_none_for_unrecognized_tool(self):
        assert _detect_focus("Glob", {"pattern": "*.py"}) is None

    def test_returns_none_for_generic_bash(self):
        assert _detect_focus("Bash", {"command": "ls -la"}) is None

    def test_truncates_parse_mode_prompt(self):
        result = _detect_focus(
            "mcp__codingbuddy__parse_mode",
            {"prompt": "PLAN: implement a very long feature description here that exceeds limit"},
        )
        assert len(result) <= 40


class TestDetectStrategy:
    def test_subagent_for_agent_tool(self):
        assert _detect_strategy("Agent", {}) == "subagent"

    def test_taskmaestro_for_tmux_command(self):
        assert _detect_strategy("Bash", {"command": "tmux new-session"}) == "taskmaestro"

    def test_none_for_regular_tool(self):
        assert _detect_strategy("Edit", {}) is None

    def test_none_for_non_tmux_bash(self):
        assert _detect_strategy("Bash", {"command": "git status"}) is None


class TestExtractModeFromParseMode:
    def test_extracts_plan(self):
        assert _extract_mode_from_parse_mode({"prompt": "PLAN: test"}) == "PLAN"

    def test_extracts_act(self):
        assert _extract_mode_from_parse_mode({"prompt": "ACT: do it"}) == "ACT"

    def test_extracts_eval(self):
        assert _extract_mode_from_parse_mode({"prompt": "EVAL: review"}) == "EVAL"

    def test_extracts_auto(self):
        assert _extract_mode_from_parse_mode({"prompt": "AUTO: build"}) == "AUTO"

    def test_returns_none_for_no_mode(self):
        assert _extract_mode_from_parse_mode({"prompt": "hello world"}) is None

    def test_returns_none_for_empty_prompt(self):
        assert _extract_mode_from_parse_mode({"prompt": ""}) is None

    def test_returns_none_for_missing_prompt(self):
        assert _extract_mode_from_parse_mode({}) is None


# ---- on_council_update ----

class TestOnCouncilUpdate:
    """Council update helper (#1364)."""

    def test_starts_council(self, state_file):
        on_council_update(
            active=True,
            stage="opening",
            cast=["security-specialist", "arch-specialist"],
            state_file=state_file,
        )
        state = _read(state_file)
        assert state["councilActive"] is True
        assert state["councilStage"] == "opening"
        assert state["councilCast"] == ["security-specialist", "arch-specialist"]

    def test_advances_stage(self, state_file):
        on_council_update(
            active=True,
            stage="opening",
            cast=["a", "b"],
            state_file=state_file,
        )
        on_council_update(stage="reviewing", state_file=state_file)
        state = _read(state_file)
        assert state["councilStage"] == "reviewing"
        assert state["councilActive"] is True  # preserved
        assert state["councilCast"] == ["a", "b"]  # preserved

    def test_ends_council(self, state_file):
        on_council_update(
            active=True,
            stage="opening",
            cast=["a"],
            state_file=state_file,
        )
        on_council_update(
            active=False,
            stage="done",
            cast=[],
            state_file=state_file,
        )
        state = _read(state_file)
        assert state["councilActive"] is False
        assert state["councilStage"] == "done"
        assert state["councilCast"] == []

    def test_noop_when_no_args(self, state_file):
        """No-op when called with no arguments."""
        old_state = _read(state_file)
        on_council_update(state_file=state_file)
        new_state = _read(state_file)
        assert new_state["councilActive"] == old_state["councilActive"]
        assert new_state["councilStage"] == old_state["councilStage"]
        assert new_state["councilCast"] == old_state["councilCast"]


# ---- Full lifecycle transition test ----

class TestFullLifecycle:
    """End-to-end test of HUD state through a complete session lifecycle."""

    def test_session_lifecycle(self, tmp_path, monkeypatch):
        sf = str(tmp_path / "hud-state.json")

        # 1. SessionStart: init
        init_hud_state("lifecycle-test", "5.0.0", state_file=sf)
        state = _read(sf)
        assert state["phase"] == "ready"
        assert state["currentMode"] is None

        # 2. SessionStart: baseline from pending context
        init_baseline({"mode": "PLAN"}, state_file=sf)
        state = _read(sf)
        assert state["currentMode"] == "PLAN"
        assert state["phase"] == "planning"

        # 3. UserPromptSubmit: new mode entry
        on_mode_entry("ACT", state_file=sf)
        state = _read(sf)
        assert state["currentMode"] == "ACT"
        assert state["phase"] == "executing"
        assert state["focus"] is None
        assert state["blockerCount"] == 0

        # 4. PreToolUse: editing a file with agent active
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "Frontend Developer")
        on_tool_start("Edit", {"file_path": "/src/App.tsx"}, state_file=sf)
        state = _read(sf)
        assert state["activeAgent"] == "Frontend Developer"
        assert state["focus"] == "App.tsx"

        # 5. PostToolUse: agent handoff recorded
        on_tool_end("Edit", {}, "", state_file=sf)
        state = _read(sf)
        assert state["lastHandoff"] == "Frontend Developer"

        # 6. PreToolUse: running tests
        on_tool_start("Bash", {"command": "python -m pytest tests/"}, state_file=sf)
        state = _read(sf)
        assert state["focus"] == "testing"

        # 7. Council activity during session
        on_council_update(
            active=True, stage="opening",
            cast=["security-specialist", "arch-specialist"],
            state_file=sf,
        )
        state = _read(sf)
        assert state["councilActive"] is True
        assert state["councilStage"] == "opening"
        assert state["councilCast"] == ["security-specialist", "arch-specialist"]

        # 8. Council advances
        on_council_update(stage="consensus", state_file=sf)
        state = _read(sf)
        assert state["councilStage"] == "consensus"

        # 9. Mode re-entry resets council
        on_mode_entry("EVAL", state_file=sf)
        state = _read(sf)
        assert state["councilActive"] is False
        assert state["councilStage"] == ""
        assert state["councilCast"] == []

        # 10. Stop: clear active state
        on_session_stop(state_file=sf)
        state = _read(sf)
        assert state["activeAgent"] is None
        assert state["phase"] == "completed"
        assert state["focus"] is None
        assert state["executionStrategy"] is None
        assert state["councilActive"] is False
        assert state["councilStage"] == ""
        assert state["councilCast"] == []
        # Session metadata survives
        assert state["sessionId"] == "lifecycle-test"


class TestReadInstalledVersion:
    """Tests for read_installed_version() — reads from installed_plugins.json."""

    def test_returns_version_from_valid_json(self, tmp_path):
        plugins_json = tmp_path / "installed_plugins.json"
        plugins_json.write_text(json.dumps({
            "version": 2,
            "plugins": {
                "codingbuddy@jeremydev87": [{
                    "version": "5.3.0",
                    "installPath": "/some/path",
                }]
            }
        }))
        result = read_installed_version(plugins_file=str(plugins_json))
        assert result == "5.3.0"

    def test_returns_none_when_file_missing(self, tmp_path):
        result = read_installed_version(plugins_file=str(tmp_path / "nonexistent.json"))
        assert result is None

    def test_returns_none_when_no_codingbuddy_entry(self, tmp_path):
        plugins_json = tmp_path / "installed_plugins.json"
        plugins_json.write_text(json.dumps({
            "version": 2,
            "plugins": {
                "other-plugin@foo": [{"version": "1.0.0"}]
            }
        }))
        result = read_installed_version(plugins_file=str(plugins_json))
        assert result is None

    def test_returns_none_on_malformed_json(self, tmp_path):
        plugins_json = tmp_path / "installed_plugins.json"
        plugins_json.write_text("not valid json{{{")
        result = read_installed_version(plugins_file=str(plugins_json))
        assert result is None
