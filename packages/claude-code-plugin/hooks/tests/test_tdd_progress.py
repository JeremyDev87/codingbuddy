"""Tests for tdd_progress module (#1035)."""
import os
import sys

import pytest

# Add lib to path
_hooks_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_lib_dir = os.path.join(_hooks_dir, "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from tdd_progress import build_tdd_indicator


class TestBuildTddIndicator:
    """Test build_tdd_indicator function."""

    def test_red_phase(self):
        result = build_tdd_indicator("RED")
        assert result == "[RED \u25cf GREEN \u25cb REFACTOR \u25cb]"

    def test_green_phase(self):
        result = build_tdd_indicator("GREEN")
        assert result == "[RED \u25cf GREEN \u25cf REFACTOR \u25cb]"

    def test_refactor_phase(self):
        result = build_tdd_indicator("REFACTOR")
        assert result == "[RED \u25cf GREEN \u25cf REFACTOR \u25cf]"

    def test_none_returns_none(self):
        assert build_tdd_indicator(None) is None

    def test_empty_string_returns_none(self):
        assert build_tdd_indicator("") is None

    def test_invalid_phase_returns_none(self):
        assert build_tdd_indicator("INVALID") is None

    def test_lowercase_phase(self):
        result = build_tdd_indicator("red")
        assert result == "[RED \u25cf GREEN \u25cb REFACTOR \u25cb]"

    def test_mixed_case_phase(self):
        result = build_tdd_indicator("Green")
        assert result == "[RED \u25cf GREEN \u25cf REFACTOR \u25cb]"

    def test_whitespace_trimmed(self):
        result = build_tdd_indicator("  RED  ")
        assert result == "[RED \u25cf GREEN \u25cb REFACTOR \u25cb]"


class TestBuildTddIndicatorFromEnv:
    """Test build_tdd_indicator reads from environment when no arg given."""

    def test_reads_env_var(self, monkeypatch):
        monkeypatch.setenv("CODINGBUDDY_TDD_PHASE", "GREEN")
        result = build_tdd_indicator()
        assert result == "[RED \u25cf GREEN \u25cf REFACTOR \u25cb]"

    def test_no_env_var_returns_none(self, monkeypatch):
        monkeypatch.delenv("CODINGBUDDY_TDD_PHASE", raising=False)
        assert build_tdd_indicator() is None

    def test_empty_env_var_returns_none(self, monkeypatch):
        monkeypatch.setenv("CODINGBUDDY_TDD_PHASE", "")
        assert build_tdd_indicator() is None


class TestBuildTddIndicatorWithCycleCount:
    """Test TDD indicator with cycle count display."""

    def test_red_with_cycle_count(self):
        result = build_tdd_indicator("RED", cycle_count=3)
        assert result == "[RED \u25cf GREEN \u25cb REFACTOR \u25cb] #3"

    def test_green_with_cycle_count(self):
        result = build_tdd_indicator("GREEN", cycle_count=1)
        assert result == "[RED \u25cf GREEN \u25cf REFACTOR \u25cb] #1"

    def test_zero_cycle_count_omitted(self):
        result = build_tdd_indicator("RED", cycle_count=0)
        assert result == "[RED \u25cf GREEN \u25cb REFACTOR \u25cb]"

    def test_none_cycle_count_omitted(self):
        result = build_tdd_indicator("RED", cycle_count=None)
        assert result == "[RED \u25cf GREEN \u25cb REFACTOR \u25cb]"
