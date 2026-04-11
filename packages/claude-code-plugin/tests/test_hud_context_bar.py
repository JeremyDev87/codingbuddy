"""Behavior tests for hud_context_bar (Wave 2-E / #1326)."""
import os
import sys

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
_lib_dir = os.path.join(_hooks_dir, "lib")
for _p in (_hooks_dir, _lib_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import hud_context_bar  # noqa: E402

_FULL = "\u2588"
_EMPTY = "\u2591"
_DARK = "\u2593"
_WARN = "\u26a0"


# --------------------------- render_context_bar: basic shape --------------


def test_zero_percent_all_empty():
    result = hud_context_bar.render_context_bar(0)
    assert _FULL not in result
    assert _EMPTY * hud_context_bar.CONTEXT_BAR_WIDTH in result
    assert "0%" in result


def test_fifty_percent_half_filled():
    result = hud_context_bar.render_context_bar(50)
    # 50% of 10 cells = 5 filled
    assert _FULL * 5 in result
    assert _EMPTY * 5 in result
    assert "50%" in result


def test_hundred_percent_all_filled():
    """100% shows the full bar but also danger glyph + warning suffix."""
    result = hud_context_bar.render_context_bar(100)
    # Danger glyph replaces last cell
    assert _DARK in result
    # And warning suffix
    assert _WARN in result
    assert "100%" in result


# --------------------------- shape: format --------------------------------


def test_output_has_bracket_wrapper():
    result = hud_context_bar.render_context_bar(42)
    assert result.startswith("[")
    assert "] " in result


def test_output_shows_percent_symbol():
    result = hud_context_bar.render_context_bar(42)
    assert "42%" in result


# --------------------------- rounding -------------------------------------


def test_rounding_nearest_5pct_fills_half_cell():
    """5% rounds up to 1 filled cell (round-half-to-even)."""
    result = hud_context_bar.render_context_bar(5)
    # filled = round(5/100 * 10) = round(0.5) = 0 (banker's rounding)
    # So 0 full cells expected.
    assert _FULL not in result


def test_rounding_15pct_fills_2_cells():
    """15% → 1.5 → rounds to 2 (banker's rounding to even)."""
    result = hud_context_bar.render_context_bar(15)
    assert _FULL * 2 in result


def test_rounding_95pct_fills_10_with_danger():
    result = hud_context_bar.render_context_bar(95)
    # filled = round(9.5) = 10 (banker's) → full bar with danger glyph
    assert result.count(_FULL) + result.count(_DARK) == 10
    assert _DARK in result
    assert _WARN in result


# --------------------------- warning / danger thresholds ------------------


def test_below_warning_no_suffix():
    result = hud_context_bar.render_context_bar(50)
    assert _WARN not in result


def test_at_warning_threshold_adds_suffix():
    """80% is the warning threshold (inclusive)."""
    result = hud_context_bar.render_context_bar(80)
    assert _WARN in result


def test_above_warning_has_suffix():
    result = hud_context_bar.render_context_bar(85)
    assert _WARN in result


def test_below_danger_no_dark_glyph():
    result = hud_context_bar.render_context_bar(80)
    # 80 is warning but below danger (85) → no dark glyph
    assert _DARK not in result


def test_at_danger_threshold_has_dark_glyph():
    """85% is the danger threshold (inclusive)."""
    result = hud_context_bar.render_context_bar(85)
    assert _DARK in result


def test_above_danger_has_dark_glyph():
    result = hud_context_bar.render_context_bar(92)
    assert _DARK in result


# --------------------------- clamping -------------------------------------


def test_negative_clamped_to_zero():
    result = hud_context_bar.render_context_bar(-50)
    assert "0%" in result
    assert _FULL not in result


def test_above_100_clamped_to_100():
    result = hud_context_bar.render_context_bar(150)
    assert "100%" in result


def test_non_numeric_treated_as_zero():
    result = hud_context_bar.render_context_bar("abc")
    assert "0%" in result


def test_none_treated_as_zero():
    result = hud_context_bar.render_context_bar(None)
    assert "0%" in result


def test_numeric_string_accepted():
    result = hud_context_bar.render_context_bar("42")
    assert "42%" in result


# --------------------------- custom width ---------------------------------


def test_custom_width_20():
    result = hud_context_bar.render_context_bar(50, width=20)
    # 50% of 20 = 10 filled
    assert _FULL * 10 in result


def test_width_zero_returns_empty():
    assert hud_context_bar.render_context_bar(50, width=0) == ""


def test_width_one_minimal_bar():
    """Width 1 is a degenerate but valid case."""
    result = hud_context_bar.render_context_bar(100, width=1)
    assert "[" in result
    assert "]" in result
    assert "100%" in result


# --------------------------- format_context_bar_segment -------------------


def test_segment_empty_stdin():
    assert hud_context_bar.format_context_bar_segment({}) == ""


def test_segment_no_context_window():
    assert hud_context_bar.format_context_bar_segment({"cost": {}}) == ""


def test_segment_missing_used_percentage():
    stdin = {"context_window": {"total_tokens": 1000}}
    assert hud_context_bar.format_context_bar_segment(stdin) == ""


def test_segment_normal_render():
    stdin = {"context_window": {"used_percentage": 42}}
    result = hud_context_bar.format_context_bar_segment(stdin)
    assert "42%" in result
    assert "[" in result


def test_segment_zero_renders():
    """Zero percent still renders (not same as missing)."""
    stdin = {"context_window": {"used_percentage": 0}}
    result = hud_context_bar.format_context_bar_segment(stdin)
    assert "0%" in result


# --------------------------- constants ------------------------------------


def test_context_bar_width_default():
    assert hud_context_bar.CONTEXT_BAR_WIDTH == 10


def test_thresholds_ordered():
    """warning ≤ danger ≤ critical."""
    w, d, c = hud_context_bar.CONTEXT_BAR_THRESHOLDS
    assert w <= d <= c
