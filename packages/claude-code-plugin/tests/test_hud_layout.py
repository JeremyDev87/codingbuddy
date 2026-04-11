"""Behavior tests for hud_layout adaptive rendering (Wave 1-D / #1326)."""
import os
import sys

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
_lib_dir = os.path.join(_hooks_dir, "lib")
for _p in (_hooks_dir, _lib_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import hud_layout  # noqa: E402


# --------------------------- visible_len ------------------------------------


def test_visible_len_ascii():
    assert hud_layout.visible_len("hello") == 5


def test_visible_len_empty():
    assert hud_layout.visible_len("") == 0


def test_visible_len_cjk_doubled():
    """CJK characters count as 2 columns each."""
    assert hud_layout.visible_len("안녕") == 4
    assert hud_layout.visible_len("日本") == 4


def test_visible_len_emoji_doubled():
    """Wide emoji count as 2 columns."""
    # U+1F7E2 green circle is East-Asian Wide
    assert hud_layout.visible_len("A\U0001f7e2B") == 4


def test_visible_len_mixed():
    assert hud_layout.visible_len("ab안c") == 5  # 1 + 1 + 2 + 1


def test_visible_len_ansi_not_stripped():
    """ANSI escape characters are counted (caller must strip)."""
    # This documents current behavior — Wave 2-D will revisit.
    s = "\x1b[32mX\x1b[0m"
    assert hud_layout.visible_len(s) > 1


# --------------------------- terminal_width --------------------------------


def test_terminal_width_falls_back_on_zero(monkeypatch):
    """terminal_width returns fallback when shutil reports 0 columns."""
    import shutil as _shutil

    class FakeSize:
        columns = 0
        lines = 24

    monkeypatch.setattr(
        _shutil, "get_terminal_size", lambda *a, **k: FakeSize()
    )
    assert hud_layout.terminal_width() == hud_layout.FALLBACK_TERMINAL_WIDTH


def test_terminal_width_custom_fallback(monkeypatch):
    """Fallback parameter is honoured when shutil raises."""
    import shutil as _shutil

    def _raise(*a, **k):
        raise RuntimeError("no tty")

    monkeypatch.setattr(_shutil, "get_terminal_size", _raise)
    assert hud_layout.terminal_width(fallback=60) == 60


def test_terminal_width_uses_real_value(monkeypatch):
    """When shutil reports a real value, terminal_width passes it through."""
    import shutil as _shutil

    class FakeSize:
        columns = 100
        lines = 30

    monkeypatch.setattr(
        _shutil, "get_terminal_size", lambda *a, **k: FakeSize()
    )
    assert hud_layout.terminal_width() == 100


# --------------------------- shorten_model_label ---------------------------


def test_shorten_strips_context_suffix():
    assert (
        hud_layout.shorten_model_label("Opus 4.6 (1M context)") == "Opus 4.6"
    )


def test_shorten_keeps_plain_name():
    assert hud_layout.shorten_model_label("Sonnet 4.5") == "Sonnet 4.5"


def test_shorten_compact_mode():
    assert (
        hud_layout.shorten_model_label("Opus 4.6 (1M context)", compact=True)
        == "Opus(1M)"
    )


def test_shorten_compact_fallback_no_context():
    """No context suffix → first token only in compact mode."""
    assert hud_layout.shorten_model_label("Sonnet 4.5", compact=True) == "Sonnet"


def test_shorten_compact_single_word():
    assert hud_layout.shorten_model_label("Haiku", compact=True) == "Haiku"


def test_shorten_empty_input():
    assert hud_layout.shorten_model_label("") == ""


def test_shorten_empty_compact():
    assert hud_layout.shorten_model_label("", compact=True) == ""


def test_shorten_case_insensitive_context_suffix():
    """Case differences in 'Context' still stripped."""
    assert (
        hud_layout.shorten_model_label("Opus 4.6 (1M Context)") == "Opus 4.6"
    )


# --------------------------- fit_segments ----------------------------------


def test_fit_all_segments_fit_no_drop():
    segments = [
        ("face", 0, "◕‿◕ CB"),
        ("mode", 1, "PLAN"),
        ("cost", 2, "$1.23"),
    ]
    result = hud_layout.fit_segments(segments, width=60)
    assert "◕‿◕ CB" in result
    assert "PLAN" in result
    assert "$1.23" in result
    assert "|" in result  # default separator contains |


def test_fit_drops_low_priority_when_tight():
    """Lowest-priority segment dropped first when width is exceeded."""
    segments = [
        ("face", 0, "FACE"),
        ("mode", 1, "MODE"),
        ("cost", 2, "COST-LONG"),
    ]
    # 15-col budget fits "FACE | MODE" (11) but not "FACE | MODE | COST-LONG" (23)
    result = hud_layout.fit_segments(segments, width=15)
    assert "FACE" in result
    assert "MODE" in result
    assert "COST-LONG" not in result


def test_fit_sacred_segments_never_dropped():
    """Priority 0 and 1 segments survive even when their neighbor is huge."""
    segments = [
        ("face", 0, "FACE"),
        ("mode", 1, "MODE"),
        ("x", 2, "X" * 100),
    ]
    result = hud_layout.fit_segments(segments, width=12)
    assert "FACE" in result
    assert "MODE" in result


def test_fit_empty_segments_skipped():
    segments = [
        ("face", 0, "FACE"),
        ("mode", 1, ""),
        ("cost", 2, "$1"),
    ]
    result = hud_layout.fit_segments(segments, width=40)
    assert "FACE" in result
    assert "$1" in result
    # No double separator where the empty segment used to be
    assert "||" not in result
    assert " |  | " not in result


def test_fit_hard_truncate_when_sacred_overflows():
    """When even sacred segments exceed the budget, hard-truncate with ellipsis."""
    segments = [
        ("face", 0, "A" * 50),
        ("mode", 1, "B" * 50),
    ]
    result = hud_layout.fit_segments(segments, width=20)
    assert result.endswith("\u2026")
    assert hud_layout.visible_len(result) <= 20


def test_fit_preserves_segment_order():
    segments = [
        ("face", 0, "FACE"),
        ("mode", 1, "MODE"),
    ]
    result = hud_layout.fit_segments(segments, width=100)
    assert result.index("FACE") < result.index("MODE")


def test_fit_drops_highest_priority_number_first():
    """When multiple segments are droppable, priority 8 goes before 3."""
    segments = [
        ("face", 0, "FACE"),
        ("mode", 1, "MODE"),
        ("duration", 3, "DUR"),
        ("worktree", 8, "WT"),
    ]
    # Tight budget that keeps sacred+duration but not worktree
    result = hud_layout.fit_segments(segments, width=20)
    assert "FACE" in result
    assert "MODE" in result
    assert "WT" not in result


def test_fit_custom_separator():
    segments = [
        ("a", 0, "A"),
        ("b", 1, "B"),
    ]
    assert hud_layout.fit_segments(segments, width=40, separator=" · ") == "A · B"


def test_fit_width_of_zero_yields_empty():
    segments = [("face", 0, "FACE")]
    assert hud_layout.fit_segments(segments, width=0) == ""


def test_fit_width_of_one_returns_only_ellipsis():
    segments = [("face", 0, "LARGE")]
    assert hud_layout.fit_segments(segments, width=1) == "\u2026"


def test_fit_ignores_empty_segment_list():
    assert hud_layout.fit_segments([], width=80) == ""


def test_fit_single_sacred_within_budget():
    segments = [("face", 0, "◕‿◕")]
    assert hud_layout.fit_segments(segments, width=10) == "◕‿◕"


# --------------------------- SEGMENT_PRIORITY ------------------------------


def test_segment_priority_has_sacred_entries():
    """SEGMENT_PRIORITY must include face_version and mode_health as sacred."""
    p = dict(hud_layout.SEGMENT_PRIORITY)
    assert p["face_version"] == 0
    assert p["mode_health"] == 1


def test_segment_priority_is_non_decreasing():
    """Priorities should be non-decreasing in the canonical list."""
    priorities = [p for _, p in hud_layout.SEGMENT_PRIORITY]
    assert priorities == sorted(priorities)


def test_segment_priority_contains_all_statusline_slots():
    """All rendering slots documented in format_status_line are listed."""
    names = {name for name, _ in hud_layout.SEGMENT_PRIORITY}
    expected = {
        "face_version",
        "mode_health",
        "cost",
        "duration",
        "ctx",
        "cache",
        "model",
        "rate_limits",
        "worktree",
    }
    assert expected <= names


def test_sacred_priority_constant():
    """Sacred threshold is documented as 1."""
    assert hud_layout.SACRED_PRIORITY == 1


def test_default_separator_is_pipe():
    assert hud_layout.DEFAULT_SEPARATOR == " | "
