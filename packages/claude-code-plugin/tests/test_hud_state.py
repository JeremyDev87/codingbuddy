"""Tests for HUD state management module (#1087, #1326)."""
import json
import os
import sys
import time

import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from hud_state import _EXTENDED_DEFAULTS, init_hud_state, read_hud_state, update_hud_state


class TestReadHudState:
    def test_returns_empty_dict_when_file_missing(self, tmp_path):
        path = str(tmp_path / "nonexistent.json")
        result = read_hud_state(path)
        assert result == {}

    def test_returns_empty_dict_when_json_corrupted(self, tmp_path):
        path = str(tmp_path / "bad.json")
        with open(path, "w") as f:
            f.write("{invalid json")
        result = read_hud_state(path)
        assert result == {}

    def test_reads_valid_state(self, tmp_path):
        path = str(tmp_path / "state.json")
        data = {"sessionId": "abc", "currentMode": "PLAN"}
        with open(path, "w") as f:
            json.dump(data, f)
        result = read_hud_state(path)
        assert result == data


class TestInitHudState:
    def test_creates_file_with_correct_schema(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        init_hud_state("session-123", "5.1.1", state_file=path)

        with open(path, "r") as f:
            data = json.load(f)

        assert data["sessionId"] == "session-123"
        assert data["version"] == "5.1.1"
        assert data["currentMode"] is None
        assert data["activeAgent"] is None
        assert "sessionStartTimestamp" in data
        assert "updatedAt" in data

    def test_creates_parent_directory(self, tmp_path):
        path = str(tmp_path / "nested" / "deep" / "hud-state.json")
        init_hud_state("s1", "5.1.1", state_file=path)
        assert os.path.isfile(path)


class TestUpdateHudState:
    def test_merges_kwargs_into_existing_state(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        init_hud_state("s1", "5.1.1", state_file=path)
        update_hud_state(state_file=path, currentMode="ACT")

        result = read_hud_state(path)
        assert result["currentMode"] == "ACT"
        assert result["sessionId"] == "s1"
        assert result["version"] == "5.1.1"

    def test_updates_timestamp(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        init_hud_state("s1", "5.1.1", state_file=path)

        before = read_hud_state(path)["updatedAt"]
        time.sleep(0.01)
        update_hud_state(state_file=path, currentMode="EVAL")

        after = read_hud_state(path)["updatedAt"]
        assert after > before

    def test_noop_when_file_missing(self, tmp_path):
        path = str(tmp_path / "nonexistent.json")
        # Should not raise
        update_hud_state(state_file=path, currentMode="PLAN")


class TestExtendedSchemaDefaults:
    """Tests for extended HUD schema fields (#1326)."""

    def test_init_includes_extended_fields(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        init_hud_state("s1", "5.3.0", state_file=path)
        data = read_hud_state(path)

        assert data["phase"] == "ready"
        assert data["focus"] is None
        assert data["executionStrategy"] is None
        assert data["councilStatus"] is None
        assert data["blockerCount"] == 0
        assert data["lastHandoff"] is None
        # Council fields (#1364)
        assert data["councilActive"] is False
        assert data["councilStage"] == ""
        assert data["councilCast"] == []

    def test_update_extended_fields(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        init_hud_state("s1", "5.3.0", state_file=path)

        update_hud_state(
            state_file=path,
            phase="planning",
            focus="auth-feature",
            executionStrategy="subagent",
            blockerCount=2,
        )
        data = read_hud_state(path)

        assert data["phase"] == "planning"
        assert data["focus"] == "auth-feature"
        assert data["executionStrategy"] == "subagent"
        assert data["blockerCount"] == 2
        # Unchanged fields preserved
        assert data["councilStatus"] is None
        assert data["lastHandoff"] is None

    def test_partial_update_preserves_other_extended_fields(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        init_hud_state("s1", "5.3.0", state_file=path)

        update_hud_state(state_file=path, phase="acting", councilStatus="quorum")
        update_hud_state(state_file=path, blockerCount=1)

        data = read_hud_state(path)
        assert data["phase"] == "acting"
        assert data["councilStatus"] == "quorum"
        assert data["blockerCount"] == 1


class TestCouncilFields:
    """Tests for council UX fields (#1364)."""

    def test_init_includes_council_defaults(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        init_hud_state("s1", "5.4.0", state_file=path)
        data = read_hud_state(path)

        assert data["councilActive"] is False
        assert data["councilStage"] == ""
        assert data["councilCast"] == []

    def test_update_council_active(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        init_hud_state("s1", "5.4.0", state_file=path)

        update_hud_state(state_file=path, councilActive=True)
        data = read_hud_state(path)
        assert data["councilActive"] is True

    def test_update_council_stage(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        init_hud_state("s1", "5.4.0", state_file=path)

        update_hud_state(state_file=path, councilStage="reviewing")
        data = read_hud_state(path)
        assert data["councilStage"] == "reviewing"

    def test_update_council_cast(self, tmp_path):
        path = str(tmp_path / "hud-state.json")
        init_hud_state("s1", "5.4.0", state_file=path)

        cast = ["security-specialist", "frontend-developer"]
        update_hud_state(state_file=path, councilCast=cast)
        data = read_hud_state(path)
        assert data["councilCast"] == cast

    def test_council_full_lifecycle(self, tmp_path):
        """Council start -> review -> consensus -> done."""
        path = str(tmp_path / "hud-state.json")
        init_hud_state("s1", "5.4.0", state_file=path)

        # Start council
        update_hud_state(
            state_file=path,
            councilActive=True,
            councilStage="opening",
            councilCast=["arch", "security"],
        )
        data = read_hud_state(path)
        assert data["councilActive"] is True
        assert data["councilStage"] == "opening"
        assert data["councilCast"] == ["arch", "security"]

        # Advance to reviewing
        update_hud_state(state_file=path, councilStage="reviewing")
        data = read_hud_state(path)
        assert data["councilStage"] == "reviewing"
        assert data["councilActive"] is True  # preserved

        # Consensus
        update_hud_state(state_file=path, councilStage="consensus")
        data = read_hud_state(path)
        assert data["councilStage"] == "consensus"

        # Done
        update_hud_state(
            state_file=path,
            councilActive=False,
            councilStage="done",
            councilCast=[],
        )
        data = read_hud_state(path)
        assert data["councilActive"] is False
        assert data["councilStage"] == "done"
        assert data["councilCast"] == []

    def test_fill_defaults_includes_council_fields(self, tmp_path):
        """Old state files get council defaults via fill_defaults."""
        path = str(tmp_path / "old.json")
        old_data = {"sessionId": "old-1", "version": "5.1.0"}
        with open(path, "w") as f:
            json.dump(old_data, f)

        result = read_hud_state(path, fill_defaults=True)
        assert result["councilActive"] is False
        assert result["councilStage"] == ""
        assert result["councilCast"] == []

    def test_fill_defaults_does_not_overwrite_council(self, tmp_path):
        """fill_defaults must not overwrite existing council fields."""
        path = str(tmp_path / "partial.json")
        partial = {
            "sessionId": "p-1",
            "councilActive": True,
            "councilStage": "reviewing",
            "councilCast": ["agent-a"],
        }
        with open(path, "w") as f:
            json.dump(partial, f)

        result = read_hud_state(path, fill_defaults=True)
        assert result["councilActive"] is True
        assert result["councilStage"] == "reviewing"
        assert result["councilCast"] == ["agent-a"]


class TestBackwardCompat:
    """Backward compatibility with older state files missing extended keys (#1326)."""

    def test_read_old_state_without_fill(self, tmp_path):
        """Reading an old-format file without fill_defaults returns raw data."""
        path = str(tmp_path / "old.json")
        old_data = {
            "sessionId": "old-1",
            "version": "5.1.0",
            "currentMode": "PLAN",
            "activeAgent": None,
            "updatedAt": "2026-01-01T00:00:00+00:00",
            "sessionStartTimestamp": "2026-01-01T00:00:00+00:00",
        }
        with open(path, "w") as f:
            json.dump(old_data, f)

        result = read_hud_state(path)
        assert "phase" not in result
        assert "blockerCount" not in result

    def test_read_old_state_with_fill_defaults(self, tmp_path):
        """fill_defaults=True back-fills missing extended keys."""
        path = str(tmp_path / "old.json")
        old_data = {
            "sessionId": "old-1",
            "version": "5.1.0",
            "currentMode": "PLAN",
            "activeAgent": None,
            "updatedAt": "2026-01-01T00:00:00+00:00",
            "sessionStartTimestamp": "2026-01-01T00:00:00+00:00",
        }
        with open(path, "w") as f:
            json.dump(old_data, f)

        result = read_hud_state(path, fill_defaults=True)
        assert result["phase"] == "ready"
        assert result["blockerCount"] == 0
        assert result["focus"] is None
        assert result["executionStrategy"] is None
        assert result["councilStatus"] is None
        assert result["lastHandoff"] is None
        # Original fields untouched
        assert result["sessionId"] == "old-1"
        assert result["currentMode"] == "PLAN"

    def test_fill_defaults_does_not_overwrite_existing(self, tmp_path):
        """fill_defaults must not overwrite keys already present."""
        path = str(tmp_path / "partial.json")
        partial = {
            "sessionId": "p-1",
            "phase": "acting",
            "blockerCount": 3,
        }
        with open(path, "w") as f:
            json.dump(partial, f)

        result = read_hud_state(path, fill_defaults=True)
        assert result["phase"] == "acting"
        assert result["blockerCount"] == 3
        assert result["focus"] is None  # filled

    def test_fill_defaults_on_empty_returns_empty(self, tmp_path):
        """fill_defaults on missing file still returns empty dict."""
        path = str(tmp_path / "nope.json")
        result = read_hud_state(path, fill_defaults=True)
        assert result == {}

    def test_update_old_state_adds_new_field(self, tmp_path):
        """Updating an old-format state file can add new fields."""
        path = str(tmp_path / "old.json")
        old_data = {
            "sessionId": "old-1",
            "version": "5.1.0",
            "currentMode": None,
            "activeAgent": None,
            "updatedAt": "2026-01-01T00:00:00+00:00",
            "sessionStartTimestamp": "2026-01-01T00:00:00+00:00",
        }
        with open(path, "w") as f:
            json.dump(old_data, f)

        update_hud_state(state_file=path, phase="evaluating", blockerCount=1)
        result = read_hud_state(path)
        assert result["phase"] == "evaluating"
        assert result["blockerCount"] == 1
        assert result["sessionId"] == "old-1"


class TestRoundtrip:
    def test_init_read_update_read(self, tmp_path):
        path = str(tmp_path / "hud-state.json")

        init_hud_state("rt-1", "5.1.1", state_file=path)
        state1 = read_hud_state(path)
        assert state1["currentMode"] is None

        update_hud_state(state_file=path, currentMode="PLAN", activeAgent="architect")
        state2 = read_hud_state(path)
        assert state2["currentMode"] == "PLAN"
        assert state2["activeAgent"] == "architect"
        assert state2["sessionId"] == "rt-1"

        update_hud_state(state_file=path, currentMode="ACT")
        state3 = read_hud_state(path)
        assert state3["currentMode"] == "ACT"
        assert state3["activeAgent"] == "architect"  # preserved
