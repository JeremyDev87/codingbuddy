"""Behavior tests for hud_rate_limits severity rendering (Wave 1-C / #1326)."""
import importlib
import os
import sys

_tests_dir = os.path.dirname(os.path.abspath(__file__))
_hooks_dir = os.path.join(os.path.dirname(_tests_dir), "hooks")
_lib_dir = os.path.join(_hooks_dir, "lib")
for _p in (_hooks_dir, _lib_dir):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import hud_rate_limits  # noqa: E402

_ICON_LOW = "\u2591"  # ░
_ICON_MID = "\u2592"  # ▒
_ICON_HIGH = "\u2593"  # ▓


# --------------------------- fallthrough cases ------------------------------


def test_empty_returns_empty():
    assert hud_rate_limits.format_rate_limits({}) == ""


def test_no_rate_limits_key_returns_empty():
    assert hud_rate_limits.format_rate_limits({"cost": {}}) == ""


def test_empty_rate_limits_object_returns_empty():
    assert hud_rate_limits.format_rate_limits({"rate_limits": {}}) == ""


# --------------------------- severity buckets ------------------------------


def test_five_hour_low_severity():
    """23.5% → rounds to 24%, ≤ 60 → ░ low icon."""
    stdin = {"rate_limits": {"five_hour": {"used_percentage": 23.5}}}
    assert (
        hud_rate_limits.format_rate_limits(stdin)
        == f"RL:5h{_ICON_LOW}24%"
    )


def test_five_hour_medium_severity():
    """75% → within (60, 85] → ▒ medium icon."""
    stdin = {"rate_limits": {"five_hour": {"used_percentage": 75}}}
    assert (
        hud_rate_limits.format_rate_limits(stdin)
        == f"RL:5h{_ICON_MID}75%"
    )


def test_five_hour_high_severity():
    """96% → > 85 → ▓ high icon."""
    stdin = {"rate_limits": {"five_hour": {"used_percentage": 96}}}
    assert (
        hud_rate_limits.format_rate_limits(stdin)
        == f"RL:5h{_ICON_HIGH}96%"
    )


def test_boundary_60_is_low():
    """Exactly 60% stays in the low bucket (inclusive upper bound)."""
    stdin = {"rate_limits": {"five_hour": {"used_percentage": 60}}}
    assert _ICON_LOW in hud_rate_limits.format_rate_limits(stdin)


def test_boundary_85_is_medium():
    """Exactly 85% is still medium (inclusive upper bound)."""
    stdin = {"rate_limits": {"five_hour": {"used_percentage": 85}}}
    assert _ICON_MID in hud_rate_limits.format_rate_limits(stdin)


def test_boundary_over_85_is_high():
    """85.01% crosses into high."""
    stdin = {"rate_limits": {"five_hour": {"used_percentage": 85.01}}}
    assert _ICON_HIGH in hud_rate_limits.format_rate_limits(stdin)


# --------------------------- seven-day tier --------------------------------


def test_seven_day_only():
    """Seven-day tier renders with its own icon."""
    stdin = {"rate_limits": {"seven_day": {"used_percentage": 80}}}
    result = hud_rate_limits.format_rate_limits(stdin)
    assert f"7d{_ICON_MID}80%" in result


# --------------------------- both tiers, separator -------------------------


def test_both_tiers_space_separated():
    stdin = {
        "rate_limits": {
            "five_hour": {"used_percentage": 10},
            "seven_day": {"used_percentage": 40},
        }
    }
    result = hud_rate_limits.format_rate_limits(stdin)
    assert result == f"RL:5h{_ICON_LOW}10% 7d{_ICON_LOW}40%"
    assert "," not in result  # Wave 1-C replaces comma with space


def test_both_tiers_mixed_severity():
    """One tier low, one critical."""
    stdin = {
        "rate_limits": {
            "five_hour": {"used_percentage": 13},
            "seven_day": {"used_percentage": 96},
        }
    }
    result = hud_rate_limits.format_rate_limits(stdin)
    assert f"5h{_ICON_LOW}13%" in result
    assert f"7d{_ICON_HIGH}96%" in result


# --------------------------- defensive coercion ----------------------------


def test_none_percentage_coerced_to_zero():
    """None used_percentage does not crash; renders as 0%."""
    stdin = {"rate_limits": {"five_hour": {"used_percentage": None}}}
    result = hud_rate_limits.format_rate_limits(stdin)
    assert result == f"RL:5h{_ICON_LOW}0%"


def test_string_percentage_coerced_to_zero():
    """Non-numeric string used_percentage does not crash."""
    stdin = {"rate_limits": {"five_hour": {"used_percentage": "N/A"}}}
    result = hud_rate_limits.format_rate_limits(stdin)
    assert result == f"RL:5h{_ICON_LOW}0%"


def test_numeric_string_percentage_accepted():
    """Numeric string is parsed as float."""
    stdin = {"rate_limits": {"five_hour": {"used_percentage": "42"}}}
    result = hud_rate_limits.format_rate_limits(stdin)
    assert f"5h{_ICON_LOW}42%" in result


def test_empty_tier_object_is_skipped():
    """Empty tier dict (falsy) is skipped, not rendered as 0%.

    This mirrors the original Wave 0 behavior: `if five:` checks
    truthiness, and an empty dict falls through without being rendered.
    """
    stdin = {"rate_limits": {"five_hour": {}}}
    result = hud_rate_limits.format_rate_limits(stdin)
    assert result == ""


def test_tier_with_null_used_percentage_renders_zero():
    """Explicit None used_percentage (key present) coerces to 0%."""
    stdin = {"rate_limits": {"five_hour": {"used_percentage": None, "foo": "bar"}}}
    result = hud_rate_limits.format_rate_limits(stdin)
    assert result == f"RL:5h{_ICON_LOW}0%"


# --------------------------- re-export lock --------------------------------


def test_reexport_identity_from_codingbuddy_hud():
    """Lock: codingbuddy-hud.format_rate_limits must be the same object."""
    hud_main = importlib.import_module("codingbuddy-hud")
    assert hud_main.format_rate_limits is hud_rate_limits.format_rate_limits


# --------------------------- internal helper exposure ----------------------


def test_severity_icon_helper_exposed():
    """_severity_icon is a documented internal helper."""
    assert hud_rate_limits._severity_icon(10) == _ICON_LOW
    assert hud_rate_limits._severity_icon(70) == _ICON_MID
    assert hud_rate_limits._severity_icon(90) == _ICON_HIGH
