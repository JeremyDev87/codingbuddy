"""Tests for PatternDetector — detects repeated error patterns from HistoryDB."""
import os
import tempfile
import time

import pytest

from hooks.lib.history_db import HistoryDB
from hooks.lib.pattern_detector import PatternDetector


@pytest.fixture
def db_dir():
    """Create a temporary directory for test databases."""
    d = tempfile.mkdtemp()
    yield d


@pytest.fixture
def db_path(db_dir):
    return os.path.join(db_dir, "history.db")


@pytest.fixture
def db(db_path):
    """Create a HistoryDB instance with a temp path."""
    instance = HistoryDB(db_path=db_path)
    yield instance
    instance.close()


@pytest.fixture
def detector(db):
    """Create a PatternDetector wrapping the test DB."""
    return PatternDetector(db)


class TestEmptyDatabase:
    def test_returns_empty_list_when_no_data(self, detector):
        """Empty DB should return no patterns."""
        patterns = detector.detect_patterns()
        assert patterns == []

    def test_returns_empty_list_when_no_failures(self, detector, db):
        """DB with only successful calls should return no patterns."""
        db.start_session("s1", project="/proj")
        db.record_tool_call("s1", "Read", input_summary="file.py", success=True)
        db.record_tool_call("s1", "Write", input_summary="out.py", success=True)
        patterns = detector.detect_patterns()
        assert patterns == []


class TestPatternDetection:
    def test_detects_repeated_failure_pattern(self, detector, db):
        """Same tool+input failing 3+ times across sessions = pattern."""
        for i in range(3):
            sid = f"sess-{i}"
            db.start_session(sid, project="/proj")
            db.record_tool_call(sid, "Bash", input_summary="npm test", success=False)

        patterns = detector.detect_patterns()
        assert len(patterns) == 1
        assert patterns[0]["tool_name"] == "Bash"
        assert patterns[0]["input_summary"] == "npm test"
        assert patterns[0]["failure_count"] >= 3

    def test_does_not_detect_below_threshold(self, detector, db):
        """2 failures should NOT trigger a pattern (threshold=3)."""
        for i in range(2):
            sid = f"sess-{i}"
            db.start_session(sid, project="/proj")
            db.record_tool_call(sid, "Bash", input_summary="npm test", success=False)

        patterns = detector.detect_patterns()
        assert patterns == []

    def test_custom_threshold(self, detector, db):
        """Custom threshold should be respected."""
        for i in range(5):
            sid = f"sess-{i}"
            db.start_session(sid, project="/proj")
            db.record_tool_call(sid, "Bash", input_summary="npm test", success=False)

        patterns_high = detector.detect_patterns(min_occurrences=6)
        assert patterns_high == []

        patterns_low = detector.detect_patterns(min_occurrences=4)
        assert len(patterns_low) == 1

    def test_multiple_distinct_patterns(self, detector, db):
        """Different tool+input combos should produce separate patterns."""
        for i in range(3):
            sid = f"sess-{i}"
            db.start_session(sid, project="/proj")
            db.record_tool_call(sid, "Bash", input_summary="npm test", success=False)
            db.record_tool_call(sid, "Read", input_summary="/etc/config", success=False)

        patterns = detector.detect_patterns()
        assert len(patterns) == 2
        tool_names = {p["tool_name"] for p in patterns}
        assert tool_names == {"Bash", "Read"}

    def test_same_session_failures_counted(self, detector, db):
        """Multiple failures in one session should count toward threshold."""
        db.start_session("s1", project="/proj")
        for _ in range(3):
            db.record_tool_call("s1", "Bash", input_summary="npm test", success=False)

        patterns = detector.detect_patterns()
        assert len(patterns) == 1

    def test_mixed_success_failure_only_counts_failures(self, detector, db):
        """Only failures are counted, not successes."""
        for i in range(5):
            sid = f"sess-{i}"
            db.start_session(sid, project="/proj")
            db.record_tool_call(sid, "Bash", input_summary="npm test", success=True)

        # Only 2 failures
        db.record_tool_call("sess-0", "Bash", input_summary="npm test", success=False)
        db.record_tool_call("sess-1", "Bash", input_summary="npm test", success=False)

        patterns = detector.detect_patterns()
        assert patterns == []


class TestPatternMetadata:
    def test_pattern_includes_session_count(self, detector, db):
        """Pattern should report how many distinct sessions had the failure."""
        for i in range(4):
            sid = f"sess-{i}"
            db.start_session(sid, project="/proj")
            db.record_tool_call(sid, "Bash", input_summary="npm test", success=False)

        patterns = detector.detect_patterns()
        assert len(patterns) == 1
        assert patterns[0]["session_count"] >= 3

    def test_pattern_includes_first_and_last_seen(self, detector, db):
        """Pattern should include timestamps for first and last occurrence."""
        for i in range(3):
            sid = f"sess-{i}"
            db.start_session(sid, project="/proj")
            db.record_tool_call(sid, "Bash", input_summary="npm test", success=False)

        patterns = detector.detect_patterns()
        assert "first_seen" in patterns[0]
        assert "last_seen" in patterns[0]
        assert patterns[0]["first_seen"] <= patterns[0]["last_seen"]

    def test_days_filter_limits_scope(self, detector, db):
        """days parameter should limit how far back we look."""
        db.start_session("recent", project="/proj")
        db.record_tool_call("recent", "Bash", input_summary="npm test", success=False)

        # Insert old failures directly
        old_time = time.time() - (60 * 86400)
        for i in range(3):
            db._conn.execute(
                "INSERT INTO tool_calls (session_id, timestamp, tool_name, input_summary, success) "
                "VALUES (?, ?, ?, ?, ?)",
                (f"old-{i}", old_time, "Bash", "npm test", 0),
            )
        db._conn.commit()

        patterns_recent = detector.detect_patterns(days=30)
        assert patterns_recent == []

        patterns_all = detector.detect_patterns(days=90)
        assert len(patterns_all) == 1
