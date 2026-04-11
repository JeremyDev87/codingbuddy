"""Behavior tests for hud_rainbow ANSI coloring (Wave 2-D / #1326)."""
import os
import sys

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
_lib_dir = os.path.join(_hooks_dir, "lib")
for _p in (_hooks_dir, _lib_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import hud_rainbow  # noqa: E402


# --------------------------- is_color_enabled ------------------------------


def test_color_enabled_when_no_env_var():
    assert hud_rainbow.is_color_enabled(env={}) is True


def test_color_disabled_by_no_color_env():
    """NO_COLOR=1 disables color output."""
    assert hud_rainbow.is_color_enabled(env={"NO_COLOR": "1"}) is False


def test_color_disabled_by_any_nonempty_no_color():
    """Any non-empty NO_COLOR value disables color (per spec)."""
    assert hud_rainbow.is_color_enabled(env={"NO_COLOR": "true"}) is False
    assert hud_rainbow.is_color_enabled(env={"NO_COLOR": "yes"}) is False


def test_color_enabled_when_no_color_is_empty_string():
    """Empty NO_COLOR value means color is allowed."""
    assert hud_rainbow.is_color_enabled(env={"NO_COLOR": ""}) is True


def test_color_env_default_uses_os_environ(monkeypatch):
    """When env=None, reads from os.environ."""
    monkeypatch.delenv("NO_COLOR", raising=False)
    assert hud_rainbow.is_color_enabled() is True
    monkeypatch.setenv("NO_COLOR", "1")
    assert hud_rainbow.is_color_enabled() is False


# --------------------------- mode_glyph -----------------------------------


def test_mode_glyph_plan():
    assert hud_rainbow.mode_glyph("PLAN") == "\u25c7"  # ◇


def test_mode_glyph_act():
    assert hud_rainbow.mode_glyph("ACT") == "\u25c6"  # ◆


def test_mode_glyph_eval():
    assert hud_rainbow.mode_glyph("EVAL") == "\u25c8"  # ◈


def test_mode_glyph_auto():
    assert hud_rainbow.mode_glyph("AUTO") == "\u25ca"  # ◊


def test_mode_glyph_case_insensitive():
    assert hud_rainbow.mode_glyph("plan") == "\u25c7"


def test_mode_glyph_unknown_returns_empty():
    assert hud_rainbow.mode_glyph("Ready") == ""
    assert hud_rainbow.mode_glyph("DEBUG") == ""


def test_mode_glyph_empty_input():
    assert hud_rainbow.mode_glyph("") == ""


# --------------------------- gradient_ansi --------------------------------


def test_gradient_single_color_wraps_text():
    """Single color palette wraps entire text in one escape."""
    result = hud_rainbow.gradient_ansi("PLAN", [(0, 0, 255)])
    assert "PLAN" in result
    assert result.startswith("\x1b[38;2;0;0;255m")
    assert result.endswith("\x1b[0m")


def test_gradient_multiple_colors_per_char():
    """Multi-stop palette assigns a color per character."""
    palette = [(255, 0, 0), (0, 255, 0), (0, 0, 255)]
    result = hud_rainbow.gradient_ansi("abc", palette)
    assert "a" in result
    assert "b" in result
    assert "c" in result
    # At least one red and one blue escape present
    assert "38;2;255;0;0" in result
    assert "38;2;0;0;255" in result


def test_gradient_empty_text_returns_empty():
    assert hud_rainbow.gradient_ansi("", [(255, 0, 0)]) == ""


def test_gradient_empty_palette_returns_text_unchanged():
    assert hud_rainbow.gradient_ansi("PLAN", []) == "PLAN"


def test_gradient_ends_with_reset():
    result = hud_rainbow.gradient_ansi("X", [(100, 100, 100)])
    assert result.endswith(hud_rainbow.RESET)


# --------------------------- render_mode_rainbow --------------------------


def test_render_plan_has_glyph_and_label():
    result = hud_rainbow.render_mode_rainbow("PLAN", enabled=False)
    assert "\u25c7" in result  # ◇
    assert "PLAN" in result


def test_render_act_has_glyph_and_label():
    result = hud_rainbow.render_mode_rainbow("ACT", enabled=False)
    assert "\u25c6" in result  # ◆
    assert "ACT" in result


def test_render_eval_has_glyph_and_label():
    result = hud_rainbow.render_mode_rainbow("EVAL", enabled=False)
    assert "\u25c8" in result  # ◈
    assert "EVAL" in result


def test_render_auto_has_glyph_and_label():
    result = hud_rainbow.render_mode_rainbow("AUTO", enabled=False)
    assert "\u25ca" in result  # ◊
    assert "AUTO" in result


def test_render_disabled_strips_ansi():
    """With enabled=False, output is plain text."""
    result = hud_rainbow.render_mode_rainbow("PLAN", enabled=False)
    assert "\x1b[" not in result
    assert result == "\u25c7 PLAN"


def test_render_enabled_wraps_ansi():
    """With enabled=True, output contains ANSI escape codes."""
    result = hud_rainbow.render_mode_rainbow("PLAN", enabled=True)
    assert "\x1b[" in result
    assert "\u25c7" in result
    assert "PLAN" in result
    assert result.endswith("\x1b[0m")


def test_render_auto_uses_multi_color_gradient():
    """AUTO mode applies a multi-stop rainbow."""
    result = hud_rainbow.render_mode_rainbow("AUTO", enabled=True)
    # Rainbow palette has 6 distinct color escapes
    assert result.count("\x1b[38;2;") >= 2


def test_render_no_color_env_forces_plain(monkeypatch):
    """NO_COLOR env var forces plain output."""
    monkeypatch.setenv("NO_COLOR", "1")
    result = hud_rainbow.render_mode_rainbow("PLAN")
    assert "\x1b[" not in result


def test_render_unknown_mode_plain():
    """Unknown mode still renders as plain uppercase text."""
    result = hud_rainbow.render_mode_rainbow("Ready", enabled=True)
    assert "READY" in result
    # No ANSI escapes because no palette entry for unknown mode
    assert "\x1b[" not in result


def test_render_empty_mode_returns_empty():
    assert hud_rainbow.render_mode_rainbow("") == ""


def test_render_case_insensitive():
    """Mode name matching is case-insensitive."""
    result = hud_rainbow.render_mode_rainbow("plan", enabled=False)
    assert "PLAN" in result
    assert "\u25c7" in result


# --------------------------- strip_ansi -----------------------------------


def test_strip_ansi_removes_escapes():
    colored = hud_rainbow.render_mode_rainbow("PLAN", enabled=True)
    stripped = hud_rainbow.strip_ansi(colored)
    assert stripped == "\u25c7 PLAN"


def test_strip_ansi_noop_on_plain_text():
    assert hud_rainbow.strip_ansi("hello") == "hello"


def test_strip_ansi_empty_string():
    assert hud_rainbow.strip_ansi("") == ""


def test_strip_ansi_preserves_text_between_escapes():
    s = "\x1b[31mred\x1b[0m and \x1b[32mgreen\x1b[0m"
    assert hud_rainbow.strip_ansi(s) == "red and green"


# --------------------------- MODE_PALETTE ---------------------------------


def test_mode_palette_has_all_four_modes():
    for mode in ("PLAN", "ACT", "EVAL", "AUTO"):
        assert mode in hud_rainbow.MODE_PALETTE
        assert len(hud_rainbow.MODE_PALETTE[mode]) >= 1


def test_mode_palette_auto_is_rainbow():
    """AUTO palette is a multi-stop gradient."""
    assert len(hud_rainbow.MODE_PALETTE["AUTO"]) >= 3


def test_mode_palette_solid_modes_have_single_stop():
    """PLAN, ACT, EVAL are solid colors (single stop)."""
    for mode in ("PLAN", "ACT", "EVAL"):
        assert len(hud_rainbow.MODE_PALETTE[mode]) == 1
