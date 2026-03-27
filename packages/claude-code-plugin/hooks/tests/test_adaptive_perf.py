"""Tests for adaptive_perf module (#1002)."""
import os
import sys
import unittest

# Ensure hooks/lib is on sys.path
_hooks_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_lib_dir = os.path.join(_hooks_dir, "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from adaptive_perf import (
    AdaptivePerformanceMonitor,
    HEAVY_OPERATIONS,
    CORE_OPERATIONS,
    DEFAULT_TIMEOUT_MS,
    format_lightweight_notice,
    format_normal_notice,
    get_monitor,
)


class TestAdaptivePerformanceMonitor(unittest.TestCase):
    """Tests for AdaptivePerformanceMonitor."""

    def setUp(self):
        AdaptivePerformanceMonitor.reset_instance()
        self.monitor = AdaptivePerformanceMonitor(timeout_ms=1000)

    def tearDown(self):
        AdaptivePerformanceMonitor.reset_instance()

    def test_initial_state_is_normal_mode(self):
        self.assertFalse(self.monitor.is_lightweight)
        self.assertEqual(self.monitor.switch_count, 0)

    def test_default_timeout(self):
        m = AdaptivePerformanceMonitor()
        self.assertEqual(m.timeout_ms, DEFAULT_TIMEOUT_MS)

    def test_custom_timeout(self):
        self.assertEqual(self.monitor.timeout_ms, 1000)

    def test_record_timing_below_threshold_stays_normal(self):
        for _ in range(5):
            self.monitor.record_timing("hook_a", 500)
        self.assertFalse(self.monitor.is_lightweight)

    def test_record_timing_above_threshold_switches_to_lightweight(self):
        for _ in range(5):
            self.monitor.record_timing("hook_a", 1500)
        self.assertTrue(self.monitor.is_lightweight)
        self.assertEqual(self.monitor.switch_count, 1)

    def test_recovery_back_to_normal(self):
        # Trigger lightweight mode
        for _ in range(5):
            self.monitor.record_timing("hook_a", 1500)
        self.assertTrue(self.monitor.is_lightweight)

        # Recover: all under 60% of threshold (600ms)
        for _ in range(5):
            self.monitor.record_timing("hook_a", 400)
        self.assertFalse(self.monitor.is_lightweight)
        self.assertEqual(self.monitor.switch_count, 2)

    def test_should_skip_heavy_in_lightweight_mode(self):
        # Force lightweight
        for _ in range(5):
            self.monitor.record_timing("hook_a", 2000)
        self.assertTrue(self.monitor.is_lightweight)

        for op in HEAVY_OPERATIONS:
            self.assertTrue(self.monitor.should_skip(op), f"{op} should be skipped")

    def test_should_not_skip_core_in_lightweight_mode(self):
        # Force lightweight
        for _ in range(5):
            self.monitor.record_timing("hook_a", 2000)
        self.assertTrue(self.monitor.is_lightweight)

        for op in CORE_OPERATIONS:
            self.assertFalse(self.monitor.should_skip(op), f"{op} should NOT be skipped")

    def test_should_not_skip_anything_in_normal_mode(self):
        for op in HEAVY_OPERATIONS | CORE_OPERATIONS:
            self.assertFalse(self.monitor.should_skip(op))

    def test_start_stop_timing(self):
        self.monitor.start_timing("hook_x")
        elapsed = self.monitor.stop_timing("hook_x")
        self.assertGreaterEqual(elapsed, 0)

    def test_stop_without_start_raises(self):
        with self.assertRaises(ValueError):
            self.monitor.stop_timing("nonexistent")

    def test_sliding_window_limits_timings(self):
        for i in range(20):
            self.monitor.record_timing("hook_a", 100 + i)
        status = self.monitor.get_status()
        self.assertEqual(status["timings"]["hook_a"]["count"], 5)

    def test_get_status(self):
        self.monitor.record_timing("hook_a", 500)
        self.monitor.record_timing("hook_a", 600)
        status = self.monitor.get_status()

        self.assertFalse(status["lightweight_mode"])
        self.assertEqual(status["timeout_ms"], 1000)
        self.assertEqual(status["switch_count"], 0)
        self.assertIn("hook_a", status["timings"])
        self.assertEqual(status["timings"]["hook_a"]["count"], 2)
        self.assertEqual(status["timings"]["hook_a"]["avg_ms"], 550.0)
        self.assertEqual(status["timings"]["hook_a"]["max_ms"], 600.0)


class TestSingleton(unittest.TestCase):
    """Tests for singleton behavior."""

    def setUp(self):
        AdaptivePerformanceMonitor.reset_instance()

    def tearDown(self):
        AdaptivePerformanceMonitor.reset_instance()

    def test_get_instance_returns_same_object(self):
        m1 = AdaptivePerformanceMonitor.get_instance()
        m2 = AdaptivePerformanceMonitor.get_instance()
        self.assertIs(m1, m2)

    def test_get_instance_reads_config_timeout(self):
        config = {"hooks": {"timeoutMs": 5000}}
        m = AdaptivePerformanceMonitor.get_instance(config)
        self.assertEqual(m.timeout_ms, 5000)

    def test_get_instance_default_without_config(self):
        m = AdaptivePerformanceMonitor.get_instance()
        self.assertEqual(m.timeout_ms, DEFAULT_TIMEOUT_MS)

    def test_get_monitor_convenience(self):
        m = get_monitor({"hooks": {"timeoutMs": 3000}})
        self.assertEqual(m.timeout_ms, 3000)
        self.assertIs(m, get_monitor())

    def test_reset_instance(self):
        m1 = AdaptivePerformanceMonitor.get_instance()
        AdaptivePerformanceMonitor.reset_instance()
        m2 = AdaptivePerformanceMonitor.get_instance()
        self.assertIsNot(m1, m2)


class TestNoticeFormatting(unittest.TestCase):
    """Tests for notification messages."""

    def test_lightweight_notice_english(self):
        notice = format_lightweight_notice("en")
        self.assertIn("lightweight mode", notice)
        self.assertIn("CodingBuddy", notice)

    def test_lightweight_notice_korean(self):
        notice = format_lightweight_notice("ko")
        self.assertIn("경량 모드", notice)

    def test_lightweight_notice_unknown_lang_falls_back(self):
        notice = format_lightweight_notice("xx")
        self.assertIn("lightweight mode", notice)

    def test_normal_notice_english(self):
        notice = format_normal_notice("en")
        self.assertIn("normal mode", notice)

    def test_normal_notice_korean(self):
        notice = format_normal_notice("ko")
        self.assertIn("일반 모드", notice)

    def test_all_supported_languages(self):
        for lang in ("en", "ko", "ja", "zh", "es"):
            lw = format_lightweight_notice(lang)
            nm = format_normal_notice(lang)
            self.assertTrue(len(lw) > 0, f"Empty lightweight notice for {lang}")
            self.assertTrue(len(nm) > 0, f"Empty normal notice for {lang}")


class TestOperationSets(unittest.TestCase):
    """Tests for operation classification."""

    def test_heavy_and_core_are_disjoint(self):
        overlap = HEAVY_OPERATIONS & CORE_OPERATIONS
        self.assertEqual(len(overlap), 0, f"Overlap: {overlap}")

    def test_expected_heavy_operations(self):
        self.assertIn("conflict_prediction", HEAVY_OPERATIONS)
        self.assertIn("full_project_scan", HEAVY_OPERATIONS)
        self.assertIn("agent_recommendations", HEAVY_OPERATIONS)
        self.assertIn("file_watcher", HEAVY_OPERATIONS)

    def test_expected_core_operations(self):
        self.assertIn("mode_detection", CORE_OPERATIONS)
        self.assertIn("basic_validation", CORE_OPERATIONS)


if __name__ == "__main__":
    unittest.main()
