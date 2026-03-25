"""Tests for SessionStats — operational statistics tracker (#825)."""
import json
import os
import sys
import time
import pytest

# Ensure hooks/lib is on path
_tests_dir = os.path.dirname(os.path.abspath(__file__))
_lib_dir = os.path.join(os.path.dirname(_tests_dir), "hooks", "lib")
if _lib_dir not in sys.path:
    sys.path.insert(0, _lib_dir)

from stats import SessionStats


@pytest.fixture
def data_dir(tmp_path):
    """Temp directory for stats files."""
    d = tmp_path / "stats"
    d.mkdir()
    return str(d)


@pytest.fixture
def stats(data_dir):
    return SessionStats(session_id="test-session", data_dir=data_dir)


class TestInit:
    def test_creates_data_dir_with_correct_permissions(self, tmp_path):
        d = str(tmp_path / "new_stats_dir")
        s = SessionStats(session_id="s1", data_dir=d)
        assert os.path.isdir(d)
        mode = os.stat(d).st_mode & 0o777
        assert mode == 0o700

    def test_creates_stats_file(self, stats, data_dir):
        expected = os.path.join(data_dir, "test-session.json")
        assert os.path.isfile(expected)

    def test_uses_env_data_dir(self, tmp_path, monkeypatch):
        d = str(tmp_path / "env_dir")
        monkeypatch.setenv("CLAUDE_PLUGIN_DATA", d)
        s = SessionStats(session_id="env-test")
        assert os.path.isdir(d)

    def test_default_data_dir(self, monkeypatch):
        monkeypatch.delenv("CLAUDE_PLUGIN_DATA", raising=False)
        s = SessionStats(session_id="default-test")
        expected_dir = os.path.join(os.path.expanduser("~"), ".codingbuddy")
        assert os.path.isdir(expected_dir)


class TestRecordToolCall:
    def test_increments_count(self, stats):
        stats.record_tool_call("Bash")
        stats.record_tool_call("Edit")
        result = stats.finalize()
        assert result["tool_count"] == 2

    def test_tracks_tool_names(self, stats):
        stats.record_tool_call("Bash")
        stats.record_tool_call("Bash")
        stats.record_tool_call("Edit")
        result = stats.finalize()
        assert result["tool_names"]["Bash"] == 2
        assert result["tool_names"]["Edit"] == 1

    def test_tracks_errors(self, stats):
        stats.record_tool_call("Bash", success=True)
        stats.record_tool_call("Bash", success=False)
        stats.record_tool_call("Edit", success=False)
        result = stats.finalize()
        assert result["error_count"] == 2

    def test_success_does_not_increment_errors(self, stats):
        stats.record_tool_call("Bash", success=True)
        result = stats.finalize()
        assert result["error_count"] == 0


class TestDuration:
    def test_tracks_session_duration(self, stats):
        time.sleep(0.05)
        result = stats.finalize()
        assert result["duration_seconds"] >= 0.04


class TestFormatSummary:
    def test_format_summary_structure(self, stats):
        stats.record_tool_call("Bash")
        stats.record_tool_call("Bash")
        stats.record_tool_call("Edit")
        summary = stats.format_summary()
        assert summary.startswith("[CB]")
        assert "3 tools" in summary
        assert "0 errors" in summary
        assert "Bash:2" in summary
        assert "Edit:1" in summary

    def test_format_summary_with_errors(self, stats):
        stats.record_tool_call("Bash", success=False)
        summary = stats.format_summary()
        assert "1 error" in summary


class TestRoundtrip:
    def test_data_persists_across_instances(self, data_dir):
        s1 = SessionStats(session_id="rt-test", data_dir=data_dir)
        s1.record_tool_call("Bash")
        s1.record_tool_call("Edit")
        s1.flush()  # Flush to disk before new instance reads

        # New instance same session
        s2 = SessionStats(session_id="rt-test", data_dir=data_dir)
        s2.record_tool_call("Read")
        result = s2.finalize()
        assert result["tool_count"] == 3
        assert result["tool_names"]["Bash"] == 1
        assert result["tool_names"]["Read"] == 1


class TestLocking:
    def test_concurrent_writes_dont_corrupt(self, data_dir):
        """Multiple rapid writes should not corrupt the file."""
        s = SessionStats(session_id="lock-test", data_dir=data_dir)
        for i in range(50):
            s.record_tool_call(f"Tool{i % 5}")
        result = s.finalize()
        assert result["tool_count"] == 50


class TestInMemoryAccumulation:
    """Tests for in-memory accumulation with periodic flush (#931)."""

    def test_record_does_not_write_immediately(self, data_dir):
        """record_tool_call should NOT write to disk on every call."""
        s = SessionStats(session_id="lazy-test", data_dir=data_dir, flush_interval=10)
        # Read initial file content
        with open(s.stats_file, "r") as f:
            initial = json.load(f)
        initial_count = initial.get("tool_count", 0)

        s.record_tool_call("Bash")
        # File should still have initial count (not flushed yet)
        with open(s.stats_file, "r") as f:
            on_disk = json.load(f)
        assert on_disk["tool_count"] == initial_count

    def test_flush_writes_accumulated_data(self, data_dir):
        """flush() should persist all accumulated stats to disk."""
        s = SessionStats(session_id="flush-test", data_dir=data_dir, flush_interval=100)
        s.record_tool_call("Bash")
        s.record_tool_call("Edit")
        s.record_tool_call("Read")
        s.flush()

        with open(s.stats_file, "r") as f:
            on_disk = json.load(f)
        assert on_disk["tool_count"] == 3
        assert on_disk["tool_names"]["Bash"] == 1
        assert on_disk["tool_names"]["Edit"] == 1

    def test_auto_flush_at_interval(self, data_dir):
        """Should auto-flush when flush_interval calls are reached."""
        s = SessionStats(session_id="auto-flush", data_dir=data_dir, flush_interval=3)
        s.record_tool_call("Bash")
        s.record_tool_call("Edit")
        # Not yet flushed (2 < 3)
        with open(s.stats_file, "r") as f:
            on_disk = json.load(f)
        assert on_disk["tool_count"] == 0

        s.record_tool_call("Read")  # 3rd call -> auto-flush
        with open(s.stats_file, "r") as f:
            on_disk = json.load(f)
        assert on_disk["tool_count"] == 3

    def test_finalize_flushes_pending(self, data_dir):
        """finalize() should flush pending stats before returning."""
        s = SessionStats(session_id="fin-flush", data_dir=data_dir, flush_interval=100)
        s.record_tool_call("Bash")
        s.record_tool_call("Edit")
        result = s.finalize()
        assert result["tool_count"] == 2

    def test_format_summary_uses_memory_data(self, data_dir):
        """format_summary() should reflect in-memory state, not just disk."""
        s = SessionStats(session_id="mem-summary", data_dir=data_dir, flush_interval=100)
        s.record_tool_call("Bash")
        s.record_tool_call("Bash")
        summary = s.format_summary()
        assert "2 tools" in summary
        assert "Bash:2" in summary


class TestCleanup:
    def test_cleanup_stale_removes_old_files(self, data_dir):
        # Create a stale file
        stale_file = os.path.join(data_dir, "old-session.json")
        with open(stale_file, "w") as f:
            json.dump({"started_at": time.time() - 100000}, f)

        # Create a fresh file
        fresh = SessionStats(session_id="fresh", data_dir=data_dir)

        SessionStats.cleanup_stale(data_dir, max_age_hours=1)

        assert not os.path.exists(stale_file)
        assert os.path.exists(os.path.join(data_dir, "fresh.json"))

    def test_cleanup_stale_keeps_recent(self, data_dir):
        s = SessionStats(session_id="recent", data_dir=data_dir)
        SessionStats.cleanup_stale(data_dir, max_age_hours=24)
        assert os.path.exists(os.path.join(data_dir, "recent.json"))

    def test_finalize_cleans_up_file(self, stats, data_dir):
        stats.record_tool_call("Bash")
        stats.finalize()
        stats_file = os.path.join(data_dir, "test-session.json")
        assert not os.path.exists(stats_file)
