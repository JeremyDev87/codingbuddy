"""Tests for SuggestPipeline — wires PatternDetector → RuleSuggester."""
import json
import sqlite3
import tempfile
import time

import pytest

from history_db import HistoryDB
from suggest_pipeline import SuggestPipeline


@pytest.fixture
def tmp_db(tmp_path):
    """Create a temporary HistoryDB with test data."""
    db_path = str(tmp_path / "test_history.db")
    db = HistoryDB(db_path=db_path)
    return db


@pytest.fixture
def db_with_patterns(tmp_db):
    """HistoryDB populated with repeated failure patterns."""
    session_ids = ["sess-1", "sess-2", "sess-3"]
    for sid in session_ids:
        tmp_db.start_session(sid, project="/test/project")

    # Create a repeated failure pattern: Bash tool fails 5 times across 3 sessions
    for sid in session_ids:
        tmp_db.record_tool_call(sid, "Bash", "rm -rf /bad/path", success=False)
    tmp_db.record_tool_call("sess-1", "Bash", "rm -rf /bad/path", success=False)
    tmp_db.record_tool_call("sess-2", "Bash", "rm -rf /bad/path", success=False)

    # Create another pattern: Read tool fails 3 times
    for sid in session_ids:
        tmp_db.record_tool_call(sid, "Read", "/nonexistent/file.ts", success=False)

    # Successful calls should not appear as patterns
    for sid in session_ids:
        tmp_db.record_tool_call(sid, "Write", "output.txt", success=True)

    return tmp_db


@pytest.fixture
def db_no_patterns(tmp_db):
    """HistoryDB with no failure patterns (below threshold)."""
    tmp_db.start_session("sess-1", project="/test/project")
    tmp_db.record_tool_call("sess-1", "Bash", "echo hello", success=False)
    return tmp_db


class TestSuggestPipeline:
    def test_run_returns_suggestions_for_detected_patterns(self, db_with_patterns):
        pipeline = SuggestPipeline(db_with_patterns)
        result = pipeline.run()

        assert len(result) >= 2
        titles = [s["title"] for s in result]
        assert any("Bash" in t for t in titles)
        assert any("Read" in t for t in titles)

    def test_run_returns_empty_when_no_patterns(self, db_no_patterns):
        pipeline = SuggestPipeline(db_no_patterns)
        result = pipeline.run()

        assert result == []

    def test_run_passes_parameters_to_detector(self, db_with_patterns):
        pipeline = SuggestPipeline(db_with_patterns)

        # With high min_occurrences, only the Bash pattern qualifies (5 failures)
        result = pipeline.run(min_occurrences=4)
        assert len(result) == 1
        assert "Bash" in result[0]["title"]

    def test_suggestions_contain_required_fields(self, db_with_patterns):
        pipeline = SuggestPipeline(db_with_patterns)
        result = pipeline.run()

        for suggestion in result:
            assert "title" in suggestion
            assert "description" in suggestion
            assert "rule_content" in suggestion
            assert "pattern" in suggestion

    def test_suggestions_contain_pattern_metadata(self, db_with_patterns):
        pipeline = SuggestPipeline(db_with_patterns)
        result = pipeline.run()

        bash_suggestion = next(s for s in result if "Bash" in s["title"])
        assert bash_suggestion["pattern"]["failure_count"] >= 5
        assert bash_suggestion["pattern"]["session_count"] >= 2

    def test_to_json_returns_valid_json(self, db_with_patterns):
        pipeline = SuggestPipeline(db_with_patterns)
        result = pipeline.run()
        json_str = pipeline.to_json(result)

        parsed = json.loads(json_str)
        assert isinstance(parsed, list)
        assert len(parsed) >= 2

    def test_run_with_empty_db(self, tmp_db):
        pipeline = SuggestPipeline(tmp_db)
        result = pipeline.run()

        assert result == []

    def test_run_handles_db_error_gracefully(self, tmp_db):
        # Close the DB to simulate an error
        tmp_db.close()
        pipeline = SuggestPipeline(tmp_db)
        result = pipeline.run()

        assert result == []
