"""Behavior tests for hud_velocity cost spend rate (Wave 2-B / #1326)."""
import os
import sys
from datetime import datetime, timedelta, timezone

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
_lib_dir = os.path.join(_hooks_dir, "lib")
for _p in (_hooks_dir, _lib_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import hud_velocity  # noqa: E402

_HOT = "\U0001f525"
_RISING = "\u2197"
_STEADY = "\u2192"
_IDLE = "\U0001f4a4"


# --------------------------- compute_spend_rate ---------------------------


def test_compute_zero_cost_returns_zero():
    assert hud_velocity.compute_spend_rate(0, 60_000) == 0.0


def test_compute_zero_duration_returns_zero():
    assert hud_velocity.compute_spend_rate(1.0, 0) == 0.0


def test_compute_negative_cost_returns_zero():
    assert hud_velocity.compute_spend_rate(-1, 60_000) == 0.0


def test_compute_negative_duration_returns_zero():
    assert hud_velocity.compute_spend_rate(1.0, -60_000) == 0.0


def test_compute_non_numeric_cost_returns_zero():
    assert hud_velocity.compute_spend_rate("abc", 60_000) == 0.0


def test_compute_non_numeric_duration_returns_zero():
    assert hud_velocity.compute_spend_rate(1.0, "abc") == 0.0


def test_compute_1_dollar_1_minute():
    """$1 over 1 minute → $1/min."""
    assert hud_velocity.compute_spend_rate(1.0, 60_000) == 1.0


def test_compute_half_dollar_30_seconds():
    """$0.50 over 30s → $1/min."""
    assert hud_velocity.compute_spend_rate(0.50, 30_000) == 1.0


def test_compute_ten_minute_session():
    """$6 over 10 minutes → $0.60/min."""
    rate = hud_velocity.compute_spend_rate(6.0, 10 * 60_000)
    assert abs(rate - 0.60) < 0.001


def test_compute_numeric_strings_accepted():
    assert hud_velocity.compute_spend_rate("1.0", "60000") == 1.0


# --------------------------- trend_glyph ---------------------------------


def test_trend_glyph_hot():
    """Rate >= $0.20/min → 🔥."""
    assert hud_velocity.trend_glyph(0.25) == _HOT
    assert hud_velocity.trend_glyph(1.0) == _HOT


def test_trend_glyph_rising():
    """$0.01 ≤ rate < $0.20 → ↗."""
    assert hud_velocity.trend_glyph(0.05) == _RISING
    assert hud_velocity.trend_glyph(0.15) == _RISING


def test_trend_glyph_steady():
    """Positive but below idle-max → →."""
    assert hud_velocity.trend_glyph(0.005) == _STEADY


def test_trend_glyph_idle_zero():
    """Zero rate → 💤."""
    assert hud_velocity.trend_glyph(0.0) == _IDLE


def test_trend_glyph_idle_negative():
    """Negative rate (nonsense) → 💤."""
    assert hud_velocity.trend_glyph(-0.5) == _IDLE


def test_trend_glyph_non_numeric():
    assert hud_velocity.trend_glyph("abc") == _IDLE  # type: ignore[arg-type]


def test_trend_glyph_threshold_boundaries():
    """Exact threshold values belong to the upper tier (inclusive)."""
    assert hud_velocity.trend_glyph(hud_velocity.TREND_HOT_MIN) == _HOT
    assert hud_velocity.trend_glyph(hud_velocity.TREND_IDLE_MAX) == _RISING


# --------------------------- format_velocity_segment ---------------------


def test_format_segment_empty_stdin_returns_empty():
    assert hud_velocity.format_velocity_segment({}) == ""


def test_format_segment_missing_cost_returns_empty():
    assert hud_velocity.format_velocity_segment({"cost": {}}) == ""


def test_format_segment_missing_duration_without_state_returns_empty():
    """Without hud_state fallback, missing duration → empty."""
    stdin = {"cost": {"total_cost_usd": 1.0}}
    assert hud_velocity.format_velocity_segment(stdin) == ""


def test_format_segment_zero_rate_returns_empty():
    stdin = {"cost": {"total_cost_usd": 0.0, "total_duration_ms": 60_000}}
    assert hud_velocity.format_velocity_segment(stdin) == ""


def test_format_segment_normal_rendering():
    """$1.00 over 60s → rate $1/min, hot burn tier."""
    stdin = {"cost": {"total_cost_usd": 1.0, "total_duration_ms": 60_000}}
    result = hud_velocity.format_velocity_segment(stdin)
    assert _HOT in result
    assert "$1.00/m" in result


def test_format_segment_rising_tier():
    """$0.05 over 60s → rate $0.05/min → rising."""
    stdin = {"cost": {"total_cost_usd": 0.05, "total_duration_ms": 60_000}}
    result = hud_velocity.format_velocity_segment(stdin)
    assert _RISING in result
    assert "$0.05/m" in result


def test_format_segment_duration_fallback_from_state():
    """When stdin lacks duration, use hud_state.sessionStartTimestamp."""
    start = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    stdin = {"cost": {"total_cost_usd": 6.0}}
    state = {"sessionStartTimestamp": start}
    result = hud_velocity.format_velocity_segment(stdin, state)
    assert result != ""
    # Should be roughly $0.60/min
    assert "$0.6" in result or "$0.5" in result  # allow slight drift


def test_format_segment_duration_fallback_no_state():
    """No state → no fallback → empty."""
    stdin = {"cost": {"total_cost_usd": 6.0}}
    assert hud_velocity.format_velocity_segment(stdin, None) == ""


# --------------------------- format_cost_with_velocity -------------------


def test_cost_with_velocity_exact_prefix():
    stdin = {"cost": {"total_cost_usd": 1.23, "total_duration_ms": 60_000}}
    result = hud_velocity.format_cost_with_velocity(
        1.23, stdin, is_exact=True
    )
    assert result.startswith("$1.23")


def test_cost_with_velocity_estimate_prefix():
    stdin = {"cost": {"total_cost_usd": 1.23, "total_duration_ms": 60_000}}
    result = hud_velocity.format_cost_with_velocity(
        1.23, stdin, is_exact=False
    )
    assert result.startswith("~$1.23")


def test_cost_without_velocity_fallback():
    """Empty stdin → just the cost, no velocity suffix."""
    result = hud_velocity.format_cost_with_velocity(1.23, {})
    assert result == "$1.23"


def test_cost_non_numeric_coerced_to_zero():
    result = hud_velocity.format_cost_with_velocity("abc", {})
    assert result == "$0.00"


def test_cost_with_velocity_has_both_parts():
    stdin = {"cost": {"total_cost_usd": 1.23, "total_duration_ms": 60_000}}
    result = hud_velocity.format_cost_with_velocity(1.23, stdin)
    # Cost first, then velocity suffix
    assert "$1.23" in result
    assert "/m" in result


def test_cost_with_velocity_two_decimals():
    stdin = {"cost": {"total_cost_usd": 0.1234, "total_duration_ms": 60_000}}
    result = hud_velocity.format_cost_with_velocity(0.1234, stdin)
    assert "$0.12" in result


# --------------------------- constants -----------------------------------


def test_hot_min_greater_than_idle_max():
    assert hud_velocity.TREND_HOT_MIN > hud_velocity.TREND_IDLE_MAX


def test_hot_min_is_positive():
    assert hud_velocity.TREND_HOT_MIN > 0
