"""Tests for HookTimer — adaptive hook timeout tracking (#945)."""
import os
import sys
import time

import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from hook_timer import HookTimer


@pytest.fixture
def timer():
    return HookTimer()


class TestStartStop:
    """Test basic start/stop timing functionality."""

    def test_start_stop_returns_elapsed_ms(self, timer):
        """stop() should return elapsed time in milliseconds."""
        timer.start("my_hook")
        time.sleep(0.05)
        elapsed = timer.stop("my_hook")
        assert elapsed >= 40  # at least ~40ms (sleep 50ms with tolerance)
        assert elapsed < 200  # not unreasonably long

    def test_stop_without_start_raises(self, timer):
        """stop() without matching start() should raise ValueError."""
        with pytest.raises(ValueError, match="No active timer"):
            timer.stop("nonexistent_hook")

    def test_multiple_hooks_tracked_independently(self, timer):
        """Different hooks should track independently."""
        timer.start("hook_a")
        time.sleep(0.02)
        timer.start("hook_b")
        time.sleep(0.02)
        elapsed_a = timer.stop("hook_a")
        elapsed_b = timer.stop("hook_b")
        # hook_a ran longer than hook_b
        assert elapsed_a > elapsed_b

    def test_same_hook_multiple_times(self, timer):
        """Same hook can be started/stopped multiple times, recording each."""
        timer.start("hook_a")
        timer.stop("hook_a")
        timer.start("hook_a")
        timer.stop("hook_a")
        stats = timer.get_stats()
        assert stats["hook_a"]["count"] == 2


class TestGetStats:
    """Test statistics calculation."""

    def test_empty_stats(self, timer):
        """get_stats() on fresh timer returns empty dict."""
        assert timer.get_stats() == {}

    def test_stats_count_and_avg(self, timer):
        """get_stats() should compute count and avg_ms correctly."""
        # Inject known timings for deterministic tests
        timer._timings["hook_a"] = [100.0, 200.0, 300.0]
        stats = timer.get_stats()
        assert stats["hook_a"]["count"] == 3
        assert stats["hook_a"]["avg_ms"] == pytest.approx(200.0, abs=0.01)

    def test_stats_p95(self, timer):
        """get_stats() should compute p95_ms correctly."""
        # 20 values: 10, 20, ..., 200
        timer._timings["hook_a"] = [float(i * 10) for i in range(1, 21)]
        stats = timer.get_stats()
        # p95 of 20 items: index 19 (0.95*20=19) -> value 200
        assert stats["hook_a"]["p95_ms"] == pytest.approx(200.0, abs=0.01)

    def test_stats_max(self, timer):
        """get_stats() should compute max_ms correctly."""
        timer._timings["hook_a"] = [10.0, 50.0, 30.0, 999.0, 20.0]
        stats = timer.get_stats()
        assert stats["hook_a"]["max_ms"] == pytest.approx(999.0, abs=0.01)


class TestGetWarnings:
    """Test timeout warning detection."""

    def test_no_warnings_when_fast(self, timer):
        """Hooks well under timeout should produce no warnings."""
        timer._timings["fast_hook"] = [100.0, 200.0, 300.0]
        warnings = timer.get_warnings(timeout_ms=10000)
        assert warnings == []

    def test_warning_at_80_percent(self, timer):
        """Hook using >=80% of timeout should produce a warning."""
        # 80% of 10000 = 8000
        timer._timings["slow_hook"] = [8000.0]
        warnings = timer.get_warnings(timeout_ms=10000)
        assert len(warnings) == 1
        assert "slow_hook" in warnings[0]

    def test_warning_with_custom_timeout(self, timer):
        """get_warnings() should respect custom timeout_ms."""
        timer._timings["hook_a"] = [500.0]
        # 80% of 600 = 480, so 500 >= 480 -> warning
        warnings = timer.get_warnings(timeout_ms=600)
        assert len(warnings) == 1

    def test_no_warning_just_below_threshold(self, timer):
        """Hook just below 80% threshold should NOT warn."""
        timer._timings["hook_a"] = [7999.0]
        warnings = timer.get_warnings(timeout_ms=10000)
        assert warnings == []
