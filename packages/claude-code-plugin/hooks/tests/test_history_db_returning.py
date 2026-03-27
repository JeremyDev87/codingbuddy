"""Tests for HistoryDB.get_previous_session — returning session context (#975)."""
import os
import shutil
import sqlite3
import tempfile
import time
import unittest

# Ensure lib is importable
import sys

sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "lib")
)

from history_db import HistoryDB


class TestGetPreviousSession(unittest.TestCase):
    """Test HistoryDB.get_previous_session for returning session detection."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.tmpdir, "test_history.db")
        self.db = HistoryDB(db_path=self.db_path)

    def tearDown(self):
        self.db.close()
        HistoryDB._instance = None
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def test_no_previous_session_returns_none(self):
        """First visit — no previous session exists."""
        self.db.start_session("sess-1", "/my/project", "claude-3")
        result = self.db.get_previous_session("sess-1", "/my/project")
        self.assertIsNone(result)

    def test_returns_previous_session_same_project(self):
        """Returning visit — previous session exists for same project."""
        # Session 1 (completed)
        self.db.start_session("sess-1", "/my/project", "claude-3")
        self.db.record_tool_call("sess-1", "Read", "file.py", True)
        self.db.record_tool_call("sess-1", "Edit", "file.py", True)
        self.db.end_session("sess-1", "completed")

        # Session 2 (current)
        self.db.start_session("sess-2", "/my/project", "claude-3")

        result = self.db.get_previous_session("sess-2", "/my/project")
        self.assertIsNotNone(result)
        self.assertEqual(result["session_id"], "sess-1")
        self.assertEqual(result["tool_call_count"], 2)
        self.assertEqual(result["outcome"], "completed")
        self.assertIn("started_at", result)
        self.assertIn("ended_at", result)

    def test_ignores_different_project(self):
        """Previous session from different project is not returned."""
        self.db.start_session("sess-1", "/other/project", "claude-3")
        self.db.end_session("sess-1", "completed")

        self.db.start_session("sess-2", "/my/project", "claude-3")
        result = self.db.get_previous_session("sess-2", "/my/project")
        self.assertIsNone(result)

    def test_excludes_current_session(self):
        """Current session ID is excluded from results."""
        self.db.start_session("sess-1", "/my/project", "claude-3")
        result = self.db.get_previous_session("sess-1", "/my/project")
        self.assertIsNone(result)

    def test_returns_most_recent_session(self):
        """When multiple previous sessions exist, returns the most recent."""
        self.db.start_session("sess-1", "/my/project", "claude-3")
        self.db.end_session("sess-1", "completed")

        self.db.start_session("sess-2", "/my/project", "claude-3")
        self.db.record_tool_call("sess-2", "Read", "newer.py", True)
        self.db.end_session("sess-2", "completed")

        self.db.start_session("sess-3", "/my/project", "claude-3")
        result = self.db.get_previous_session("sess-3", "/my/project")
        self.assertIsNotNone(result)
        self.assertEqual(result["session_id"], "sess-2")
        self.assertEqual(result["tool_call_count"], 1)

    def test_includes_error_count(self):
        """Error count is included in the result."""
        self.db.start_session("sess-1", "/my/project", "claude-3")
        self.db.record_tool_call("sess-1", "Bash", "cmd", False)
        self.db.end_session("sess-1", "completed")

        self.db.start_session("sess-2", "/my/project", "claude-3")
        result = self.db.get_previous_session("sess-2", "/my/project")
        self.assertIsNotNone(result)
        self.assertEqual(result["error_count"], 1)


if __name__ == "__main__":
    unittest.main()
