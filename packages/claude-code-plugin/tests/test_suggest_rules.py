"""Tests for suggest_rules — end-to-end integration of pattern detection + rule suggestion."""
import os
import tempfile

import pytest

from hooks.lib.history_db import HistoryDB
from hooks.lib.suggest_rules import suggest_rules


@pytest.fixture
def db_dir():
    d = tempfile.mkdtemp()
    yield d


@pytest.fixture
def db_path(db_dir):
    return os.path.join(db_dir, "history.db")


@pytest.fixture
def db(db_path):
    instance = HistoryDB(db_path=db_path)
    yield instance
    instance.close()


class TestSuggestRulesIntegration:
    def test_empty_db_returns_empty(self, db):
        """Empty database should return no suggestions."""
        result = suggest_rules(db)
        assert result == []

    def test_end_to_end_pattern_to_rule(self, db):
        """Failures meeting threshold should produce rule suggestions."""
        for i in range(4):
            sid = f"sess-{i}"
            db.start_session(sid, project="/proj")
            db.record_tool_call(sid, "Bash", input_summary="yarn build", success=False)

        result = suggest_rules(db)
        assert len(result) == 1
        assert "Bash" in result[0]["title"]
        assert "yarn build" in result[0]["rule_content"]
        assert result[0]["rule_content"].startswith("#")

    def test_below_threshold_returns_empty(self, db):
        """Failures below threshold should not generate suggestions."""
        db.start_session("s1", project="/proj")
        db.record_tool_call("s1", "Bash", input_summary="yarn build", success=False)
        db.start_session("s2", project="/proj")
        db.record_tool_call("s2", "Bash", input_summary="yarn build", success=False)

        result = suggest_rules(db)
        assert result == []

    def test_custom_params_forwarded(self, db):
        """min_occurrences and days should be forwarded to detector."""
        for i in range(5):
            sid = f"sess-{i}"
            db.start_session(sid, project="/proj")
            db.record_tool_call(sid, "Read", input_summary="missing.py", success=False)

        result = suggest_rules(db, min_occurrences=6)
        assert result == []

        result = suggest_rules(db, min_occurrences=4)
        assert len(result) == 1

    def test_multiple_patterns_produce_multiple_rules(self, db):
        """Multiple distinct failure patterns should each get a rule."""
        for i in range(3):
            sid = f"sess-{i}"
            db.start_session(sid, project="/proj")
            db.record_tool_call(sid, "Bash", input_summary="npm test", success=False)
            db.record_tool_call(sid, "Read", input_summary="/no/such/file", success=False)

        result = suggest_rules(db)
        assert len(result) == 2


class TestSuggestRulesWithDbPath:
    def test_accepts_db_path_string(self, db_path):
        """suggest_rules should accept a string path and open DB internally."""
        db = HistoryDB(db_path=db_path)
        for i in range(3):
            sid = f"sess-{i}"
            db.start_session(sid, project="/proj")
            db.record_tool_call(sid, "Bash", input_summary="make", success=False)
        db.close()

        result = suggest_rules(db_path)
        assert len(result) == 1

    def test_nonexistent_db_path_returns_empty(self, db_dir):
        """Non-existent DB path should create empty DB and return no suggestions."""
        path = os.path.join(db_dir, "nonexistent", "history.db")
        result = suggest_rules(path)
        assert result == []
