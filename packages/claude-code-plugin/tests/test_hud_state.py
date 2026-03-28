"""Tests for HUD state management module (#1087)."""
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

from hud_state import init_hud_state, read_hud_state, update_hud_state


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
