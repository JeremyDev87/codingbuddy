"""Tests for codingbuddy statusLine script (#1088)."""
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone

import pytest

# Ensure hooks/ is on path for imports
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
if _hooks_dir not in sys.path:
    sys.path.insert(0, _hooks_dir)

# Also ensure hooks/lib is on path (for read_state fallback)
_lib_dir = os.path.join(_hooks_dir, "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)


# noinspection PyUnresolvedReferences
from importlib import import_module

hud = import_module("codingbuddy-hud")


class TestParseStdin:
    def test_valid_json(self):
        data = hud.parse_stdin('{"model":{"id":"opus"},"cwd":"/tmp"}')
        assert data["model"]["id"] == "opus"

    def test_empty_input(self):
        assert hud.parse_stdin("") == {}

    def test_whitespace_only(self):
        assert hud.parse_stdin("   ") == {}

    def test_invalid_json(self):
        assert hud.parse_stdin("{bad") == {}


class TestModelPricing:
    def test_haiku(self):
        inp, out = hud.get_model_pricing("claude-haiku-4-5-20251001")
        assert inp == 0.80
        assert out == 4.00

    def test_sonnet(self):
        inp, out = hud.get_model_pricing("claude-sonnet-4-5-20250929")
        assert inp == 3.00
        assert out == 15.00

    def test_opus(self):
        inp, out = hud.get_model_pricing("claude-opus-4-6-20260205")
        assert inp == 15.00
        assert out == 75.00

    def test_unknown_defaults_to_sonnet(self):
        inp, out = hud.get_model_pricing("unknown-model-xyz")
        assert inp == 3.00
        assert out == 15.00


class TestEstimateCost:
    def test_basic_cost(self):
        ctx = {"current_usage": {
            "input_tokens": 10000,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 0,
        }}
        cost = hud.estimate_cost("claude-sonnet-4-5", ctx)
        assert cost > 0

    def test_zero_tokens(self):
        cost = hud.estimate_cost("claude-sonnet-4-5", {})
        assert cost == 0.0

    def test_empty_usage(self):
        cost = hud.estimate_cost("claude-opus-4-6", {"current_usage": {}})
        assert cost == 0.0

    def test_cache_reduces_cost(self):
        ctx_no_cache = {"current_usage": {
            "input_tokens": 10000,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 0,
        }}
        ctx_with_cache = {"current_usage": {
            "input_tokens": 5000,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 5000,
        }}
        cost_no = hud.estimate_cost("claude-sonnet-4-5", ctx_no_cache)
        cost_with = hud.estimate_cost("claude-sonnet-4-5", ctx_with_cache)
        assert cost_with < cost_no


class TestCacheHitRate:
    def test_no_cache(self):
        assert hud.compute_cache_hit_rate({}) == 0.0

    def test_zero_tokens(self):
        ctx = {"current_usage": {
            "input_tokens": 0,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 0,
        }}
        assert hud.compute_cache_hit_rate(ctx) == 0.0

    def test_partial_cache(self):
        ctx = {"current_usage": {
            "input_tokens": 500,
            "cache_creation_input_tokens": 200,
            "cache_read_input_tokens": 800,
        }}
        rate = hud.compute_cache_hit_rate(ctx)
        assert 53 < rate < 54  # 800/1500 = 53.3%

    def test_full_cache(self):
        ctx = {"current_usage": {
            "input_tokens": 0,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 1000,
        }}
        assert hud.compute_cache_hit_rate(ctx) == 100.0


class TestHealth:
    def test_green(self):
        assert "\U0001f7e2" in hud.get_health(45)  # 🟢

    def test_yellow_at_61(self):
        assert "\U0001f7e1" in hud.get_health(61)  # 🟡

    def test_red_at_86(self):
        assert "\U0001f534" in hud.get_health(86)  # 🔴

    def test_boundary_60_is_green(self):
        assert "\U0001f7e2" in hud.get_health(60)

    def test_boundary_85_is_yellow(self):
        assert "\U0001f7e1" in hud.get_health(85)


class TestFormatDuration:
    def test_minutes(self):
        ts = (datetime.now(timezone.utc) - timedelta(minutes=12)).isoformat()
        result = hud.format_duration(ts)
        assert "12m" in result or "11m" in result

    def test_hours(self):
        ts = (datetime.now(timezone.utc) - timedelta(hours=1, minutes=23)).isoformat()
        result = hud.format_duration(ts)
        assert "1h23m" in result

    def test_zero(self):
        ts = datetime.now(timezone.utc).isoformat()
        result = hud.format_duration(ts)
        assert "0m" in result

    def test_invalid_timestamp(self):
        assert hud.format_duration("not-a-date") == "0m"

    def test_empty_string(self):
        assert hud.format_duration("") == "0m"


class TestFormatStatusLine:
    def test_full_output_with_mode(self):
        stdin = {
            "model": {"id": "claude-opus-4-6", "display_name": "Opus"},
            "context_window": {
                "context_window_size": 200000,
                "used_percentage": 45,
                "current_usage": {
                    "input_tokens": 1000,
                    "cache_creation_input_tokens": 500,
                    "cache_read_input_tokens": 2000,
                },
            },
        }
        state = {
            "version": "5.1.1",
            "sessionStartTimestamp": datetime.now(timezone.utc).isoformat(),
            "currentMode": "PLAN",
        }
        result = hud.format_status_line(stdin, state)
        assert "\u25d5\u203f\u25d5" in result  # ◕‿◕
        assert "PLAN" in result
        assert "5.1.1" in result
        assert "$" in result
        assert "Ctx:45%" in result

    def test_no_mode_shows_ready(self):
        result = hud.format_status_line({}, {"version": "5.1.1"})
        assert "Ready" in result

    def test_empty_state(self):
        result = hud.format_status_line({}, {})
        assert "\u25d5\u203f\u25d5" in result  # always has buddy face

    def test_agent_line(self):
        result = hud.format_status_line(
            {},
            {"version": "5.1.1", "currentMode": "ACT"},
            active_agent="architect",
        )
        lines = result.strip().split("\n")
        assert len(lines) == 2
        assert "architect" in lines[1]

    def test_no_agent_single_line(self):
        result = hud.format_status_line({}, {"version": "5.1.1"})
        assert "\n" not in result


class TestIntegration:
    def test_pipe_stdin(self):
        """Run the script as a subprocess with piped stdin."""
        script = os.path.join(_hooks_dir, "codingbuddy-hud.py")
        stdin_data = json.dumps({
            "transcript_path": "/tmp/t",
            "cwd": "/tmp",
            "model": {"id": "claude-opus-4-6", "display_name": "Opus"},
            "context_window": {
                "context_window_size": 200000,
                "used_percentage": 45,
                "current_usage": {
                    "input_tokens": 1000,
                    "cache_creation_input_tokens": 500,
                    "cache_read_input_tokens": 2000,
                },
            },
        })
        result = subprocess.run(
            [sys.executable, script],
            input=stdin_data,
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0
        assert "\u25d5\u203f\u25d5" in result.stdout  # ◕‿◕
        assert "Ctx:45%" in result.stdout

    def test_empty_stdin_fallback(self):
        """Script should output fallback on empty stdin."""
        script = os.path.join(_hooks_dir, "codingbuddy-hud.py")
        result = subprocess.run(
            [sys.executable, script],
            input="",
            capture_output=True,
            text=True,
        )
        assert result.returncode == 0
        assert "\u25d5\u203f\u25d5" in result.stdout
