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


class TestFormatDurationMs:
    def test_zero(self):
        assert hud.format_duration_ms(0) == "0m"

    def test_minutes(self):
        assert hud.format_duration_ms(720_000) == "12m"

    def test_hours(self):
        assert hud.format_duration_ms(4_980_000) == "1h23m"

    def test_sub_minute(self):
        assert hud.format_duration_ms(30_000) == "0m"


class TestResolveCost:
    def test_exact_from_stdin(self):
        stdin = {"cost": {"total_cost_usd": 1.23}}
        cost, is_exact = hud.resolve_cost(stdin, "", {})
        assert cost == 1.23
        assert is_exact is True

    def test_fallback_to_estimate(self):
        stdin = {}
        ctx = {"current_usage": {
            "input_tokens": 10000,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 0,
        }}
        cost, is_exact = hud.resolve_cost(stdin, "claude-sonnet-4-5", ctx)
        assert cost > 0
        assert is_exact is False

    def test_zero_exact_cost_is_exact(self):
        stdin = {"cost": {"total_cost_usd": 0}}
        cost, is_exact = hud.resolve_cost(stdin, "", {})
        assert cost == 0.0
        assert is_exact is True

    def test_missing_cost_key(self):
        stdin = {"cost": {}}
        cost, is_exact = hud.resolve_cost(stdin, "", {})
        assert is_exact is False


class TestResolveDuration:
    def test_exact_from_stdin(self):
        stdin = {"cost": {"total_duration_ms": 720_000}}
        assert hud.resolve_duration(stdin, {}) == "12m"

    def test_fallback_to_hud_state(self):
        ts = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        stdin = {}
        state = {"sessionStartTimestamp": ts}
        result = hud.resolve_duration(stdin, state)
        assert "5m" in result or "4m" in result

    def test_no_data_returns_zero(self):
        assert hud.resolve_duration({}, {}) == "0m"


class TestResolveAgent:
    def test_stdin_agent_preferred(self):
        stdin = {"agent": {"name": "security-reviewer"}}
        assert hud.resolve_agent(stdin, env_agent="old-env-agent") == "security-reviewer"

    def test_stdin_overrides_hud_state(self):
        stdin = {"agent": {"name": "security-reviewer"}}
        state = {"activeAgent": "plan-mode"}
        assert hud.resolve_agent(stdin, state, "env-agent") == "security-reviewer"

    def test_hud_state_fallback(self):
        assert hud.resolve_agent({}, {"activeAgent": "security-specialist"}) == "security-specialist"

    def test_hud_state_overrides_env(self):
        state = {"activeAgent": "security-specialist"}
        assert hud.resolve_agent({}, state, "env-agent") == "security-specialist"

    def test_fallback_to_env(self):
        assert hud.resolve_agent({}, env_agent="env-agent") == "env-agent"

    def test_env_when_hud_state_empty(self):
        assert hud.resolve_agent({}, {"activeAgent": ""}, "env-agent") == "env-agent"

    def test_env_when_hud_state_none(self):
        assert hud.resolve_agent({}, None, "env-agent") == "env-agent"

    def test_all_empty(self):
        assert hud.resolve_agent({}, {}, "") == ""

    def test_both_empty_no_hud(self):
        assert hud.resolve_agent({}, None, "") == ""


class TestResolveModelLabel:
    def test_display_name_and_id(self):
        stdin = {"model": {"id": "claude-opus-4-6", "display_name": "Opus"}}
        mid, display = hud.resolve_model_label(stdin)
        assert mid == "claude-opus-4-6"
        assert display == "Opus"

    def test_no_model(self):
        mid, display = hud.resolve_model_label({})
        assert mid == ""
        assert display == ""


class TestFormatRateLimits:
    def test_no_rate_limits(self):
        assert hud.format_rate_limits({}) == ""

    def test_five_hour_only(self):
        stdin = {"rate_limits": {"five_hour": {"used_percentage": 23.5}}}
        assert hud.format_rate_limits(stdin) == "RL:5h:24%"

    def test_both_limits(self):
        stdin = {"rate_limits": {
            "five_hour": {"used_percentage": 10},
            "seven_day": {"used_percentage": 40},
        }}
        result = hud.format_rate_limits(stdin)
        assert "5h:10%" in result
        assert "7d:40%" in result


class TestFormatWorktree:
    def test_no_worktree(self):
        assert hud.format_worktree({}) == ""

    def test_with_name(self):
        stdin = {"worktree": {"name": "my-feature", "path": "/tmp/wt"}}
        assert hud.format_worktree(stdin) == "WT:my-feature"

    def test_empty_name(self):
        stdin = {"worktree": {"path": "/tmp/wt"}}
        assert hud.format_worktree(stdin) == ""


class TestFormatStatusLine:
    # Use a nonexistent plugins_file to isolate from real installed_plugins.json
    _NO_PLUGINS = "/tmp/_nonexistent_plugins_.json"

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
        result = hud.format_status_line(stdin, state, plugins_file=self._NO_PLUGINS)
        assert "\u25d5\u203f\u25d5" in result  # ◕‿◕
        assert "PLAN" in result
        assert "5.1.1" in result
        assert "~$" in result  # estimated (no cost.total_cost_usd)
        assert "Ctx:45%" in result
        assert "Opus" in result  # display_name shown

    def test_exact_cost_prefix(self):
        stdin = {
            "cost": {"total_cost_usd": 0.42, "total_duration_ms": 60000},
            "model": {"id": "claude-sonnet-4-5"},
            "context_window": {"used_percentage": 10},
        }
        result = hud.format_status_line(stdin, {})
        assert "$0.42" in result
        assert "~$" not in result  # exact, not estimated

    def test_exact_duration_from_stdin(self):
        stdin = {
            "cost": {"total_duration_ms": 720_000},
            "context_window": {"used_percentage": 0},
        }
        result = hud.format_status_line(stdin, {})
        assert "12m" in result

    def test_no_mode_shows_ready(self):
        result = hud.format_status_line({}, {"version": "5.1.1"})
        assert "Ready" in result

    def test_empty_state(self):
        result = hud.format_status_line({}, {})
        assert "\u25d5\u203f\u25d5" in result  # always has buddy face

    def test_agent_from_stdin_badge(self):
        stdin = {"agent": {"name": "security-specialist"}}
        result = hud.format_status_line(stdin, {})
        lines = result.strip().split("\n")
        assert len(lines) == 2
        assert "[\u25ee secu]" in lines[1]  # [◮ secu]
        assert "[\u2713]" in lines[1]  # [✓]

    def test_agent_line_env_fallback_badge(self):
        result = hud.format_status_line(
            {},
            {"version": "5.1.1", "currentMode": "ACT"},
            active_agent="architecture-specialist",
        )
        lines = result.strip().split("\n")
        assert len(lines) == 2
        assert "[\u2b21 arch]" in lines[1]  # [⬡ arch]

    def test_stdin_agent_overrides_env_badge(self):
        stdin = {"agent": {"name": "frontend-developer"}}
        result = hud.format_status_line(stdin, {}, active_agent="backend-developer")
        assert "[\u2605 fron]" in result   # [★ fron]
        assert "\u25d0" not in result      # ◐ (backend glyph) absent

    def test_hud_state_agent_fallback_badge(self):
        result = hud.format_status_line(
            {},
            {"activeAgent": "security-specialist", "focus": "auth", "blockerCount": 1},
        )
        lines = result.strip().split("\n")
        assert len(lines) == 2
        assert "[\u25ee secu]" in lines[1]  # [◮ secu]
        assert "[auth]" in lines[1]
        assert "[\u26a01]" in lines[1]  # [⚠1]

    def test_stdin_agent_overrides_hud_state(self):
        stdin = {"agent": {"name": "frontend-developer"}}
        state = {"activeAgent": "security-specialist"}
        result = hud.format_status_line(stdin, state)
        assert "[\u2605 fron]" in result   # [★ fron]
        assert "\u25ee" not in result      # ◮ (security glyph) absent

    def test_hud_state_agent_overrides_env(self):
        state = {"activeAgent": "security-specialist"}
        result = hud.format_status_line({}, state, active_agent="backend-developer")
        lines = result.strip().split("\n")
        assert len(lines) == 2
        assert "[\u25ee secu]" in lines[1]  # [◮ secu] from hud_state
        assert "\u25d0" not in result        # ◐ (backend glyph) absent

    def test_no_agent_single_line(self):
        result = hud.format_status_line({}, {"version": "5.1.1"})
        assert "\n" not in result

    def test_focus_only_shows_badges(self):
        result = hud.format_status_line(
            {},
            {"version": "5.1.1", "focus": "auth flow"},
        )
        lines = result.strip().split("\n")
        assert len(lines) == 2
        assert "[auth flow]" in lines[1]
        assert "[\u2713]" in lines[1]

    def test_blocker_badge_shown(self):
        stdin = {"agent": {"name": "test-engineer"}}
        state = {"blockerCount": 3}
        result = hud.format_status_line(stdin, state)
        lines = result.strip().split("\n")
        assert len(lines) == 2
        assert "[\u26a03]" in lines[1]  # [⚠3]

    def test_all_badges_compose(self):
        stdin = {"agent": {"name": "security-specialist"}}
        state = {"focus": "login", "blockerCount": 1}
        result = hud.format_status_line(stdin, state)
        lines = result.strip().split("\n")
        assert len(lines) == 2
        assert "[\u25ee secu]" in lines[1]  # actor
        assert "[login]" in lines[1]         # focus
        assert "[\u26a01]" in lines[1]       # state

    def test_no_agent_no_focus_single_line(self):
        result = hud.format_status_line(
            {},
            {"version": "5.1.1", "blockerCount": 2},
        )
        assert "\n" not in result

    def test_rate_limits_shown(self):
        stdin = {"rate_limits": {
            "five_hour": {"used_percentage": 50},
            "seven_day": {"used_percentage": 20},
        }}
        result = hud.format_status_line(stdin, {})
        assert "RL:" in result
        assert "5h:50%" in result

    def test_worktree_shown(self):
        stdin = {"worktree": {"name": "feat-x"}}
        result = hud.format_status_line(stdin, {})
        assert "WT:feat-x" in result

    def test_full_telemetry(self):
        """All exact stdin fields present — full telemetry line + badge line."""
        stdin = {
            "model": {"id": "claude-opus-4-6", "display_name": "Opus"},
            "cost": {"total_cost_usd": 2.50, "total_duration_ms": 4_980_000},
            "context_window": {
                "used_percentage": 65,
                "current_usage": {
                    "input_tokens": 5000,
                    "cache_creation_input_tokens": 1000,
                    "cache_read_input_tokens": 3000,
                },
            },
            "rate_limits": {
                "five_hour": {"used_percentage": 30},
                "seven_day": {"used_percentage": 15},
            },
            "worktree": {"name": "wt-1"},
            "agent": {"name": "test-engineer"},
        }
        state = {"version": "5.3.0", "currentMode": "ACT", "focus": "api", "blockerCount": 0}
        result = hud.format_status_line(stdin, state)
        assert "$2.50" in result
        assert "~$" not in result
        assert "1h23m" in result
        assert "ACT" in result
        assert "Opus" in result
        assert "RL:" in result
        assert "WT:wt-1" in result
        lines = result.strip().split("\n")
        assert len(lines) == 2
        assert "[\u25c9 test]" in lines[1]  # [◉ test] actor badge
        assert "[api]" in lines[1]           # focus badge
        assert "[\u2713]" in lines[1]        # [✓] state badge


class TestAbbreviateAgent:
    def test_security_specialist(self):
        assert hud.abbreviate_agent("security-specialist") == "secu"

    def test_test_strategy_specialist(self):
        assert hud.abbreviate_agent("test-strategy-specialist") == "test"

    def test_plan_mode(self):
        assert hud.abbreviate_agent("plan-mode") == "plan"

    def test_frontend_developer(self):
        assert hud.abbreviate_agent("frontend-developer") == "fron"

    def test_empty_string(self):
        assert hud.abbreviate_agent("") == ""

    def test_unknown_agent(self):
        assert hud.abbreviate_agent("my-custom-tool") == "my"

    def test_single_word_role(self):
        # All words are role suffixes → fallback to first
        assert hud.abbreviate_agent("specialist") == "spec"


class TestFormatActorBadge:
    def test_known_agent(self):
        assert hud.format_actor_badge("security-specialist") == "[\u25ee secu]"

    def test_unknown_agent_fallback_glyph(self):
        badge = hud.format_actor_badge("unknown-tool")
        assert badge == "[\U0001f916 unkn]"

    def test_empty_returns_empty(self):
        assert hud.format_actor_badge("") == ""


class TestFormatFocusBadge:
    def test_with_focus(self):
        assert hud.format_focus_badge("auth flow") == "[auth flow]"

    def test_empty_returns_empty(self):
        assert hud.format_focus_badge("") == ""

    def test_none_returns_empty(self):
        assert hud.format_focus_badge(None) == ""


class TestFormatStateBadge:
    def test_no_blockers(self):
        assert hud.format_state_badge(0) == "[\u2713]"

    def test_with_blockers(self):
        assert hud.format_state_badge(2) == "[\u26a02]"

    def test_none_treated_as_zero(self):
        assert hud.format_state_badge(None) == "[\u2713]"

    def test_string_number(self):
        assert hud.format_state_badge("3") == "[\u26a03]"

    def test_invalid_string(self):
        assert hud.format_state_badge("bad") == "[\u2713]"


class TestFormatBadgeLine:
    def test_agent_only(self):
        line = hud.format_badge_line("security-specialist", "", 0)
        assert "[\u25ee secu]" in line
        assert "[\u2713]" in line

    def test_focus_only(self):
        line = hud.format_badge_line("", "auth flow", 0)
        assert "[auth flow]" in line
        assert "[\u2713]" in line

    def test_all_slots(self):
        line = hud.format_badge_line("test-engineer", "login", 1)
        assert "[\u25c9 test]" in line
        assert "[login]" in line
        assert "[\u26a01]" in line

    def test_no_content_returns_empty(self):
        assert hud.format_badge_line("", "", 0) == ""

    def test_no_content_with_blockers_returns_empty(self):
        # blockerCount alone doesn't trigger line 2
        assert hud.format_badge_line("", "", 5) == ""


class TestIntegration:
    def test_pipe_stdin(self):
        """Run the script as a subprocess with piped stdin."""
        script = os.path.join(_hooks_dir, "codingbuddy-hud.py")
        stdin_data = json.dumps({
            "transcript_path": "/tmp/t",
            "cwd": "/tmp",
            "model": {"id": "claude-opus-4-6", "display_name": "Opus"},
            "cost": {"total_cost_usd": 0.05, "total_duration_ms": 60000},
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
        assert "$0.05" in result.stdout  # exact cost

    def test_pipe_stdin_estimated_cost(self):
        """Run script with no cost object — should show ~$ estimated."""
        script = os.path.join(_hooks_dir, "codingbuddy-hud.py")
        stdin_data = json.dumps({
            "model": {"id": "claude-sonnet-4-5"},
            "context_window": {
                "used_percentage": 10,
                "current_usage": {
                    "input_tokens": 5000,
                    "cache_creation_input_tokens": 0,
                    "cache_read_input_tokens": 0,
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
        assert "~$" in result.stdout

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
