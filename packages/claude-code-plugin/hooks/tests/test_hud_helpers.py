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
    _infer_council_advance,
    _detect_blocker_count,
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

class TestOnModeEntryCouncilSeeding:
    """UserPromptSubmit: on_mode_entry seeds council state for eligible modes (#1361)."""

    SAMPLE_PRESET = {
        "primary": "technical-planner",
        "specialists": ["architecture-specialist", "security-specialist"],
    }

    def test_plan_mode_seeds_council_when_preset_provided(self, state_file):
        on_mode_entry("PLAN", council_preset=self.SAMPLE_PRESET, state_file=state_file)
        state = _read(state_file)
        assert state["councilActive"] is True
        assert state["councilStage"] == "opening"
        assert state["councilCast"] == [
            "technical-planner",
            "architecture-specialist",
            "security-specialist",
        ]

    def test_eval_mode_seeds_council_when_preset_provided(self, state_file):
        preset = {
            "primary": "code-reviewer",
            "specialists": ["security-specialist", "performance-specialist"],
        }
        on_mode_entry("EVAL", council_preset=preset, state_file=state_file)
        state = _read(state_file)
        assert state["councilActive"] is True
        assert state["councilStage"] == "opening"
        assert state["councilCast"] == [
            "code-reviewer",
            "security-specialist",
            "performance-specialist",
        ]

    def test_auto_mode_seeds_council_when_preset_provided(self, state_file):
        preset = {
            "primary": "auto-mode",
            "specialists": ["architecture-specialist", "code-quality-specialist"],
        }
        on_mode_entry("AUTO", council_preset=preset, state_file=state_file)
        state = _read(state_file)
        assert state["councilActive"] is True
        assert state["councilStage"] == "opening"

    def test_act_mode_does_not_seed_council_even_with_preset(self, state_file):
        on_mode_entry("ACT", council_preset=self.SAMPLE_PRESET, state_file=state_file)
        state = _read(state_file)
        assert state["councilActive"] is False
        assert state["councilStage"] == ""
        assert state["councilCast"] == []

    def test_no_preset_keeps_council_inactive_for_plan(self, state_file):
        on_mode_entry("PLAN", state_file=state_file)
        state = _read(state_file)
        assert state["councilActive"] is False
        assert state["councilStage"] == ""
        assert state["councilCast"] == []

    def test_council_cast_includes_primary_and_specialists(self, state_file):
        on_mode_entry("PLAN", council_preset=self.SAMPLE_PRESET, state_file=state_file)
        state = _read(state_file)
        cast = state["councilCast"]
        assert cast[0] == "technical-planner"  # primary first
        assert "architecture-specialist" in cast
        assert "security-specialist" in cast
        assert len(cast) == 3  # 1 primary + 2 specialists

    def test_mode_entry_resets_then_seeds(self, state_file):
        """Council fields should be reset first, then seeded from preset."""
        from hud_state import update_hud_state
        update_hud_state(
            state_file=state_file,
            councilActive=True,
            councilStage="consensus",
            councilCast=["old-agent"],
        )
        on_mode_entry("PLAN", council_preset=self.SAMPLE_PRESET, state_file=state_file)
        state = _read(state_file)
        assert state["councilActive"] is True
        assert state["councilStage"] == "opening"  # reset to opening, not consensus
        assert "old-agent" not in state["councilCast"]


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


# ---- _infer_council_advance (#1368) ----

class TestInferCouncilAdvance:
    """Council stage advancement heuristic (#1368)."""

    # opening → reviewing
    def test_opening_to_reviewing_on_agent_tool(self):
        assert _infer_council_advance("Agent", "opening") == "reviewing"

    def test_opening_to_reviewing_on_analyze_task(self):
        assert _infer_council_advance("mcp__codingbuddy__analyze_task", "opening") == "reviewing"

    def test_opening_to_reviewing_on_dispatch_agents(self):
        assert _infer_council_advance("mcp__codingbuddy__dispatch_agents", "opening") == "reviewing"

    def test_opening_to_reviewing_on_generate_checklist(self):
        assert _infer_council_advance("mcp__codingbuddy__generate_checklist", "opening") == "reviewing"

    def test_opening_to_reviewing_on_prepare_parallel_agents(self):
        assert _infer_council_advance("mcp__codingbuddy__prepare_parallel_agents", "opening") == "reviewing"

    # reviewing → consensus
    def test_reviewing_to_consensus_on_edit(self):
        assert _infer_council_advance("Edit", "reviewing") == "consensus"

    def test_reviewing_to_consensus_on_write(self):
        assert _infer_council_advance("Write", "reviewing") == "consensus"

    def test_reviewing_to_consensus_on_update_context(self):
        assert _infer_council_advance("mcp__codingbuddy__update_context", "reviewing") == "consensus"

    # consensus → done
    def test_consensus_to_done_on_parse_mode(self):
        assert _infer_council_advance("mcp__codingbuddy__parse_mode", "consensus") == "done"

    # no-ops
    def test_no_advance_on_unrelated_tool(self):
        assert _infer_council_advance("Read", "opening") is None
        assert _infer_council_advance("Grep", "reviewing") is None
        assert _infer_council_advance("Bash", "consensus") is None

    def test_no_backward_transition(self):
        assert _infer_council_advance("Agent", "consensus") is None
        assert _infer_council_advance("Edit", "opening") is None

    def test_no_advance_from_done(self):
        assert _infer_council_advance("Agent", "done") is None
        assert _infer_council_advance("Edit", "done") is None

    def test_no_advance_when_stage_empty(self):
        assert _infer_council_advance("Agent", "") is None

    def test_no_advance_when_stage_unknown(self):
        assert _infer_council_advance("Agent", "unknown-stage") is None


# ---- _detect_blocker_count (#1368) ----

class TestDetectBlockerCount:
    """Blocker detection from quality-check tool output (#1368)."""

    # Test runners
    def test_pytest_failure_count(self):
        output = "FAILED tests/test_a.py - 3 failed, 7 passed"
        assert _detect_blocker_count("Bash", {"command": "pytest tests/"}, output) == 3

    def test_pytest_single_failure(self):
        output = "FAILED tests/test_a.py\n1 failed"
        assert _detect_blocker_count("Bash", {"command": "python3 -m pytest"}, output) == 1

    def test_pytest_pass_clears_blockers(self):
        output = "10 passed in 2.3s"
        assert _detect_blocker_count("Bash", {"command": "pytest tests/ -v"}, output) == 0

    def test_vitest_failure(self):
        output = "Tests Failed: 2 failed | 8 passed"
        assert _detect_blocker_count("Bash", {"command": "npx vitest run"}, output) == 2

    def test_jest_pass(self):
        output = "Tests: 5 passed, 5 total"
        assert _detect_blocker_count("Bash", {"command": "npx jest"}, output) == 0

    def test_yarn_test_failure_fallback(self):
        output = "Test failed."
        assert _detect_blocker_count("Bash", {"command": "yarn test"}, output) == 1

    # Type checkers
    def test_tsc_error_count(self):
        output = "src/a.ts(1,1): error TS2304: ...\nsrc/b.ts(2,2): error TS1005: ..."
        assert _detect_blocker_count("Bash", {"command": "npx tsc --noEmit"}, output) == 2

    def test_tsc_pass(self):
        assert _detect_blocker_count("Bash", {"command": "npx tsc --noEmit"}, "") == 0

    def test_typecheck_generic_error(self):
        output = "error: something went wrong"
        assert _detect_blocker_count("Bash", {"command": "yarn type-check"}, output) == 1

    # Linters
    def test_eslint_error(self):
        output = "1 error and 2 warnings"
        assert _detect_blocker_count("Bash", {"command": "npx eslint src/"}, output) == 1

    def test_eslint_pass(self):
        assert _detect_blocker_count("Bash", {"command": "npx eslint src/"}, "") == 0

    def test_prettier_check_error(self):
        output = "error: some files are not formatted"
        assert _detect_blocker_count("Bash", {"command": "prettier --check ."}, output) == 1

    def test_yarn_lint_error(self):
        output = "1 error found"
        assert _detect_blocker_count("Bash", {"command": "yarn lint"}, output) == 1

    def test_npm_run_lint_pass(self):
        assert _detect_blocker_count("Bash", {"command": "npm run lint"}, "") == 0

    # Non-quality tools
    def test_returns_none_for_non_bash_tool(self):
        assert _detect_blocker_count("Edit", {}, "anything") is None
        assert _detect_blocker_count("Agent", {}, "anything") is None

    def test_returns_none_for_non_quality_bash(self):
        assert _detect_blocker_count("Bash", {"command": "git status"}, "output") is None
        assert _detect_blocker_count("Bash", {"command": "ls -la"}, "") is None

    # Edge cases
    def test_empty_output_for_test_runner(self):
        assert _detect_blocker_count("Bash", {"command": "pytest"}, "") == 0

    def test_none_output_for_test_runner(self):
        assert _detect_blocker_count("Bash", {"command": "pytest"}, None) == 0

    def test_npm_test_failure(self):
        output = "5 failed, 10 passed"
        assert _detect_blocker_count("Bash", {"command": "npm test"}, output) == 5


# ---- on_tool_end council integration (#1368) ----

class TestOnToolEndCouncilAdvancement:
    """PostToolUse: on_tool_end council stage + blocker integration (#1368)."""

    def _seed_council(self, state_file, stage="opening"):
        from hud_state import update_hud_state
        update_hud_state(
            state_file=state_file,
            councilActive=True,
            councilStage=stage,
            councilCast=["technical-planner", "security-specialist"],
        )

    def test_advances_opening_to_reviewing_on_agent(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        self._seed_council(state_file, "opening")
        on_tool_end("Agent", {"prompt": "review security"}, "{}", state_file=state_file)
        state = _read(state_file)
        assert state["councilStage"] == "reviewing"

    def test_advances_reviewing_to_consensus_on_edit(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        self._seed_council(state_file, "reviewing")
        on_tool_end("Edit", {"file_path": "/src/a.py"}, "", state_file=state_file)
        state = _read(state_file)
        assert state["councilStage"] == "consensus"

    def test_advances_consensus_to_done_on_parse_mode(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        self._seed_council(state_file, "consensus")
        on_tool_end(
            "mcp__codingbuddy__parse_mode",
            {"prompt": "EVAL: review"},
            "{}",
            state_file=state_file,
        )
        state = _read(state_file)
        assert state["councilStage"] == "done"

    def test_no_advance_when_council_inactive(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        on_tool_end("Agent", {}, "{}", state_file=state_file)
        state = _read(state_file)
        assert state["councilStage"] == ""

    def test_updates_blocker_count_on_test_failure(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        on_tool_end(
            "Bash",
            {"command": "pytest tests/"},
            "FAILED - 3 failed, 7 passed",
            state_file=state_file,
        )
        state = _read(state_file)
        assert state["blockerCount"] == 3

    def test_clears_blockers_on_test_pass(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        from hud_state import update_hud_state
        update_hud_state(state_file=state_file, blockerCount=5)

        on_tool_end(
            "Bash",
            {"command": "pytest tests/ -v"},
            "10 passed in 1.2s",
            state_file=state_file,
        )
        state = _read(state_file)
        assert state["blockerCount"] == 0

    def test_stage_and_blocker_independent(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        self._seed_council(state_file, "opening")

        on_tool_end("Agent", {}, "{}", state_file=state_file)
        state = _read(state_file)
        assert state["councilStage"] == "reviewing"
        assert state["blockerCount"] == 0

        on_tool_end(
            "Bash",
            {"command": "pytest tests/"},
            "2 failed",
            state_file=state_file,
        )
        state = _read(state_file)
        assert state["councilStage"] == "reviewing"
        assert state["blockerCount"] == 2

    def test_no_blocker_update_for_non_quality_bash(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        from hud_state import update_hud_state
        update_hud_state(state_file=state_file, blockerCount=1)

        on_tool_end("Bash", {"command": "git status"}, "clean", state_file=state_file)
        state = _read(state_file)
        assert state["blockerCount"] == 1

    def test_preserves_council_active_on_advance(self, state_file, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        self._seed_council(state_file, "opening")
        on_tool_end("Agent", {}, "{}", state_file=state_file)
        state = _read(state_file)
        assert state["councilActive"] is True
        assert state["councilCast"] == ["technical-planner", "security-specialist"]


# ---- Full lifecycle with council (#1368) ----

class TestFullLifecycleWithCouncil:
    """End-to-end test of council state through a complete request lifecycle (#1368)."""

    def test_council_lifecycle_through_request(self, tmp_path, monkeypatch):
        sf = str(tmp_path / "hud-state.json")

        # 1. SessionStart: init
        init_hud_state("council-lifecycle", "5.3.0", state_file=sf)
        state = _read(sf)
        assert state["councilActive"] is False

        # 2. UserPromptSubmit: mode entry seeds council
        on_mode_entry(
            "PLAN",
            council_preset={
                "primary": "technical-planner",
                "specialists": ["security-specialist", "architecture-specialist"],
            },
            state_file=sf,
        )
        state = _read(sf)
        assert state["councilActive"] is True
        assert state["councilStage"] == "opening"
        assert len(state["councilCast"]) == 3

        # 3. PreToolUse: agent dispatched
        monkeypatch.setenv("CODINGBUDDY_ACTIVE_AGENT", "technical-planner")
        on_tool_start("Agent", {"prompt": "analyze architecture"}, state_file=sf)

        # 4. PostToolUse: Agent complete → opening → reviewing
        on_tool_end("Agent", {"prompt": "analyze"}, '{"result": "ok"}', state_file=sf)
        state = _read(sf)
        assert state["councilStage"] == "reviewing"
        assert state["lastHandoff"] == "technical-planner"

        # 5. PostToolUse: test failure → blocker count
        monkeypatch.delenv("CODINGBUDDY_ACTIVE_AGENT", raising=False)
        on_tool_end(
            "Bash",
            {"command": "pytest tests/ -v"},
            "FAILED tests/test_a.py - 2 failed, 8 passed",
            state_file=sf,
        )
        state = _read(sf)
        assert state["blockerCount"] == 2
        assert state["councilStage"] == "reviewing"

        # 6. PostToolUse: Edit → reviewing → consensus
        on_tool_end("Edit", {"file_path": "/src/fix.py"}, "", state_file=sf)
        state = _read(sf)
        assert state["councilStage"] == "consensus"

        # 7. PostToolUse: tests pass → blockers cleared
        on_tool_end(
            "Bash",
            {"command": "pytest tests/ -v"},
            "10 passed in 1.5s",
            state_file=sf,
        )
        state = _read(sf)
        assert state["blockerCount"] == 0

        # 8. PostToolUse: parse_mode → consensus → done
        on_tool_end(
            "mcp__codingbuddy__parse_mode",
            {"prompt": "EVAL: review the changes"},
            "{}",
            state_file=sf,
        )
        state = _read(sf)
        assert state["councilStage"] == "done"
        assert state["currentMode"] == "EVAL"
        assert state["phase"] == "evaluating"

        # 9. New mode entry resets council
        on_mode_entry("EVAL", state_file=sf)
        state = _read(sf)
        assert state["councilActive"] is False
        assert state["councilStage"] == ""

        # 10. Stop clears everything
        on_session_stop(state_file=sf)
        state = _read(sf)
        assert state["phase"] == "completed"
        assert state["councilActive"] is False
