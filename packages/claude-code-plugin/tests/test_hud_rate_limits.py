"""Sanity + behavior test for the hud_rate_limits module (Wave 0 / #1463)."""
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


def test_module_has_public_api():
    assert hasattr(hud_rate_limits, "format_rate_limits")


def test_empty_returns_empty():
    assert hud_rate_limits.format_rate_limits({}) == ""


def test_no_rate_limits_key_returns_empty():
    assert hud_rate_limits.format_rate_limits({"cost": {}}) == ""


def test_five_hour_only():
    stdin = {"rate_limits": {"five_hour": {"used_percentage": 23.5}}}
    assert hud_rate_limits.format_rate_limits(stdin) == "RL:5h:24%"


def test_seven_day_only():
    stdin = {"rate_limits": {"seven_day": {"used_percentage": 80}}}
    assert hud_rate_limits.format_rate_limits(stdin) == "RL:7d:80%"


def test_both_limits():
    stdin = {
        "rate_limits": {
            "five_hour": {"used_percentage": 10},
            "seven_day": {"used_percentage": 40},
        }
    }
    result = hud_rate_limits.format_rate_limits(stdin)
    assert "5h:10%" in result
    assert "7d:40%" in result
    assert result.startswith("RL:")


def test_reexport_identity_from_codingbuddy_hud():
    """Lock: codingbuddy-hud.format_rate_limits must be the same function."""
    hud_main = importlib.import_module("codingbuddy-hud")
    assert hud_main.format_rate_limits is hud_rate_limits.format_rate_limits
