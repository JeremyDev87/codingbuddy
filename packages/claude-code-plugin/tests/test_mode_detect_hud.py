"""Test that mode detection updates HUD state (#1090)."""
import json
import os
import subprocess
import sys

import pytest


@pytest.fixture
def hook_path():
    tests_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(os.path.dirname(tests_dir), "hooks", "user-prompt-submit.py")


@pytest.fixture
def state_file(tmp_path):
    path = tmp_path / "hud-state.json"
    path.write_text(json.dumps({
        "sessionId": "test",
        "version": "5.1.1",
        "currentMode": None,
        "activeAgent": None,
        "updatedAt": "2026-01-01T00:00:00",
    }))
    return str(path)


class TestModeDetectHudUpdate:
    def test_plan_updates_hud_state(self, hook_path, state_file):
        env = {**os.environ, "CODINGBUDDY_HUD_STATE_FILE": state_file}
        result = subprocess.run(
            [sys.executable, hook_path],
            input=json.dumps({"prompt": "PLAN: design auth"}),
            capture_output=True, text=True, env=env,
        )
        assert result.returncode == 0

        data = json.loads(open(state_file).read())
        assert data["currentMode"] == "PLAN"

    def test_act_updates_hud_state(self, hook_path, state_file):
        env = {**os.environ, "CODINGBUDDY_HUD_STATE_FILE": state_file}
        result = subprocess.run(
            [sys.executable, hook_path],
            input=json.dumps({"prompt": "ACT: implement feature"}),
            capture_output=True, text=True, env=env,
        )
        assert result.returncode == 0

        data = json.loads(open(state_file).read())
        assert data["currentMode"] == "ACT"

    def test_no_mode_does_not_update(self, hook_path, state_file):
        env = {**os.environ, "CODINGBUDDY_HUD_STATE_FILE": state_file}
        result = subprocess.run(
            [sys.executable, hook_path],
            input=json.dumps({"prompt": "just a regular message"}),
            capture_output=True, text=True, env=env,
        )
        assert result.returncode == 0

        data = json.loads(open(state_file).read())
        assert data["currentMode"] is None  # unchanged

    def test_korean_mode_updates(self, hook_path, state_file):
        env = {**os.environ, "CODINGBUDDY_HUD_STATE_FILE": state_file}
        result = subprocess.run(
            [sys.executable, hook_path],
            input=json.dumps({"prompt": "계획: auth 설계"}),
            capture_output=True, text=True, env=env,
        )
        assert result.returncode == 0

        data = json.loads(open(state_file).read())
        assert data["currentMode"] == "PLAN"
