"""Behavior tests for hud_cache_savings (Wave 2-C / #1326)."""
import os
import sys

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
_lib_dir = os.path.join(_hooks_dir, "lib")
for _p in (_hooks_dir, _lib_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import hud_cache_savings  # noqa: E402

_MONEY = "\U0001f4b0"  # 💰


# --------------------------- _input_price_per_million ----------------------


def test_input_price_haiku():
    assert hud_cache_savings._input_price_per_million("claude-haiku-4-5") == 0.80


def test_input_price_sonnet():
    assert hud_cache_savings._input_price_per_million("claude-sonnet-4-6") == 3.00


def test_input_price_opus():
    assert hud_cache_savings._input_price_per_million("claude-opus-4-6") == 15.00


def test_input_price_unknown_defaults_to_sonnet():
    assert hud_cache_savings._input_price_per_million("gpt-4") == 3.00


def test_input_price_empty_defaults():
    assert hud_cache_savings._input_price_per_million("") == 3.00


def test_input_price_case_insensitive():
    assert hud_cache_savings._input_price_per_million("CLAUDE-OPUS-4") == 15.00


# --------------------------- compute_cache_savings ------------------------


def test_compute_zero_tokens_returns_zero():
    assert hud_cache_savings.compute_cache_savings(0, "opus") == 0.0


def test_compute_negative_tokens_returns_zero():
    assert hud_cache_savings.compute_cache_savings(-100, "opus") == 0.0


def test_compute_non_numeric_returns_zero():
    assert hud_cache_savings.compute_cache_savings("abc", "opus") == 0.0
    assert hud_cache_savings.compute_cache_savings(None, "opus") == 0.0


def test_compute_opus_savings():
    """1M cache_read tokens on opus → 1M * $15/M * 0.9 = $13.50 saved."""
    result = hud_cache_savings.compute_cache_savings(1_000_000, "claude-opus")
    assert abs(result - 13.50) < 0.001


def test_compute_sonnet_savings():
    """1M cache_read tokens on sonnet → 1M * $3/M * 0.9 = $2.70 saved."""
    result = hud_cache_savings.compute_cache_savings(1_000_000, "claude-sonnet")
    assert abs(result - 2.70) < 0.001


def test_compute_haiku_savings():
    """1M cache_read tokens on haiku → 1M * $0.80/M * 0.9 = $0.72 saved."""
    result = hud_cache_savings.compute_cache_savings(1_000_000, "claude-haiku")
    assert abs(result - 0.72) < 0.001


def test_compute_scales_linearly():
    """Double the tokens → double the savings."""
    a = hud_cache_savings.compute_cache_savings(100_000, "opus")
    b = hud_cache_savings.compute_cache_savings(200_000, "opus")
    assert abs(b - 2 * a) < 0.001


def test_compute_numeric_string_accepted():
    """Numeric string coerced via int()."""
    result = hud_cache_savings.compute_cache_savings("500000", "sonnet")
    assert result > 0


# --------------------------- format_cache_savings -------------------------


def test_format_empty_stdin_returns_empty():
    assert hud_cache_savings.format_cache_savings({}) == ""


def test_format_no_context_window_returns_empty():
    assert hud_cache_savings.format_cache_savings({"cost": {}}) == ""


def test_format_no_current_usage_returns_empty():
    stdin = {"context_window": {}}
    assert hud_cache_savings.format_cache_savings(stdin) == ""


def test_format_zero_cache_read_returns_empty():
    stdin = {
        "context_window": {
            "current_usage": {"cache_read_input_tokens": 0}
        }
    }
    assert hud_cache_savings.format_cache_savings(stdin) == ""


def test_format_missing_cache_read_returns_empty():
    stdin = {
        "context_window": {
            "current_usage": {"input_tokens": 1000}
        }
    }
    assert hud_cache_savings.format_cache_savings(stdin) == ""


def test_format_below_one_cent_returns_empty():
    """Tiny savings (< $0.01) are hidden to avoid flicker."""
    stdin = {
        "context_window": {
            "current_usage": {"cache_read_input_tokens": 100}
        },
        "model": {"id": "claude-sonnet"},
    }
    # 100 tokens * $3/M * 0.9 = $0.00027 → below threshold
    result = hud_cache_savings.format_cache_savings(stdin)
    assert result == ""


def test_format_meaningful_savings_opus():
    """500K cache_read tokens on opus → $6.75 saved."""
    stdin = {
        "context_window": {
            "current_usage": {"cache_read_input_tokens": 500_000}
        },
        "model": {"id": "claude-opus-4-6"},
    }
    result = hud_cache_savings.format_cache_savings(stdin)
    assert result.startswith(_MONEY)
    assert "6.75" in result
    assert "saved" in result


def test_format_uses_display_name_fallback():
    """When model.id is empty, fall back to display_name for pricing."""
    stdin = {
        "context_window": {
            "current_usage": {"cache_read_input_tokens": 1_000_000}
        },
        "model": {"display_name": "Opus 4.6"},
    }
    result = hud_cache_savings.format_cache_savings(stdin)
    assert "13.50" in result


def test_format_unknown_model_uses_sonnet_default():
    """Unknown model → sonnet-tier pricing ($2.70 per 1M tokens)."""
    stdin = {
        "context_window": {
            "current_usage": {"cache_read_input_tokens": 1_000_000}
        },
        "model": {"id": "some-unknown"},
    }
    result = hud_cache_savings.format_cache_savings(stdin)
    assert "2.70" in result


def test_format_uses_money_glyph():
    stdin = {
        "context_window": {
            "current_usage": {"cache_read_input_tokens": 1_000_000}
        },
        "model": {"id": "opus"},
    }
    result = hud_cache_savings.format_cache_savings(stdin)
    assert result.startswith(_MONEY)


def test_format_two_decimal_places():
    """Output always has 2 decimal places."""
    stdin = {
        "context_window": {
            "current_usage": {"cache_read_input_tokens": 100_000}
        },
        "model": {"id": "opus"},
    }
    result = hud_cache_savings.format_cache_savings(stdin)
    # Should look like "💰$1.35 saved"
    import re

    assert re.search(r"\$\d+\.\d{2} saved", result)


def test_format_negative_tokens_returns_empty():
    """Malformed payload with negative cache_read is silently skipped."""
    stdin = {
        "context_window": {
            "current_usage": {"cache_read_input_tokens": -500}
        },
        "model": {"id": "opus"},
    }
    assert hud_cache_savings.format_cache_savings(stdin) == ""
