"""Tests for HistoryDB — execution history SQLite database."""
import os
import stat
import sqlite3
import tempfile
import time
import threading

import pytest

from hooks.lib.history_db import HistoryDB


@pytest.fixture
def db_dir():
    """Create a temporary directory for test databases."""
    d = tempfile.mkdtemp()
    yield d
    # cleanup handled by OS


@pytest.fixture
def db_path(db_dir):
    return os.path.join(db_dir, "history.db")


@pytest.fixture
def db(db_path):
    """Create a HistoryDB instance with a temp path."""
    instance = HistoryDB(db_path=db_path)
    yield instance
    instance.close()


class TestDatabaseCreation:
    def test_create_database_creates_tables(self, db, db_path):
        """Verify both sessions and tool_calls tables exist."""
        conn = sqlite3.connect(db_path)
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
        assert "sessions" in tables
        assert "tool_calls" in tables

    def test_directory_permissions_0o700(self, db_dir):
        """Directory should have 0o700 permissions."""
        sub = os.path.join(db_dir, "secure")
        _db = HistoryDB(db_path=os.path.join(sub, "history.db"))
        mode = stat.S_IMODE(os.stat(sub).st_mode)
        _db.close()
        assert mode == 0o700

    def test_db_file_permissions_0o600(self, db_dir):
        """DB file should have 0o600 permissions."""
        path = os.path.join(db_dir, "secure", "history.db")
        _db = HistoryDB(db_path=path)
        mode = stat.S_IMODE(os.stat(path).st_mode)
        _db.close()
        assert mode == 0o600

    def test_wal_mode_enabled(self, db, db_path):
        """PRAGMA journal_mode should return 'wal'."""
        conn = sqlite3.connect(db_path)
        mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
        conn.close()
        assert mode == "wal"


class TestSessionOperations:
    def test_start_session(self, db):
        """start_session should insert a record that can be queried back."""
        db.start_session("sess-1", project="/my/project", model="opus")
        sessions = db.query_sessions(days=1)
        assert len(sessions) == 1
        assert sessions[0]["session_id"] == "sess-1"
        assert sessions[0]["project"] == "/my/project"
        assert sessions[0]["model"] == "opus"

    def test_end_session(self, db):
        """end_session should set ended_at."""
        db.start_session("sess-2", project="/proj")
        db.end_session("sess-2", outcome="success")
        sessions = db.query_sessions(days=1)
        assert sessions[0]["ended_at"] is not None
        assert sessions[0]["outcome"] == "success"


class TestToolCallOperations:
    def test_record_tool_call(self, db):
        """record_tool_call should insert record and increment tool_call_count."""
        db.start_session("sess-3", project="/proj")
        db.record_tool_call("sess-3", "Read", input_summary="file.py")
        db.record_tool_call("sess-3", "Write", input_summary="out.py")
        sessions = db.query_sessions(days=1)
        assert sessions[0]["tool_call_count"] == 2

    def test_record_tool_call_error(self, db):
        """success=False should increment error_count."""
        db.start_session("sess-4", project="/proj")
        db.record_tool_call("sess-4", "Bash", success=True)
        db.record_tool_call("sess-4", "Bash", success=False)
        db.record_tool_call("sess-4", "Bash", success=False)
        sessions = db.query_sessions(days=1)
        assert sessions[0]["tool_call_count"] == 3
        assert sessions[0]["error_count"] == 2


class TestQueryOperations:
    def test_query_sessions_by_date(self, db):
        """query_sessions should filter by days parameter."""
        db.start_session("recent", project="/proj")
        # Insert an old session directly
        import sqlite3 as _sq
        old_time = time.time() - (60 * 86400)  # 60 days ago
        db._conn.execute(
            "INSERT INTO sessions (session_id, started_at, project) VALUES (?, ?, ?)",
            ("old-sess", old_time, "/old"),
        )
        db._conn.commit()

        recent = db.query_sessions(days=7)
        assert len(recent) == 1
        assert recent[0]["session_id"] == "recent"

        all_sessions = db.query_sessions(days=90)
        assert len(all_sessions) == 2

    def test_query_tool_usage_stats(self, db):
        """query_tool_stats should return aggregate counts per tool."""
        db.start_session("sess-5", project="/proj")
        db.record_tool_call("sess-5", "Read")
        db.record_tool_call("sess-5", "Read")
        db.record_tool_call("sess-5", "Write")
        stats = db.query_tool_stats()
        assert stats["Read"] == 2
        assert stats["Write"] == 1


class TestCleanupAndConcurrency:
    def test_cleanup_old_records(self, db):
        """cleanup should remove records older than retention_days."""
        db.start_session("keep", project="/proj")
        old_time = time.time() - (100 * 86400)
        db._conn.execute(
            "INSERT INTO sessions (session_id, started_at, project) VALUES (?, ?, ?)",
            ("remove-me", old_time, "/old"),
        )
        db._conn.execute(
            "INSERT INTO tool_calls (session_id, timestamp, tool_name) VALUES (?, ?, ?)",
            ("remove-me", old_time, "Bash"),
        )
        db._conn.commit()

        db.cleanup(retention_days=90)
        sessions = db.query_sessions(days=365)
        assert len(sessions) == 1
        assert sessions[0]["session_id"] == "keep"
        # tool_calls for removed session should also be gone
        cursor = db._conn.execute(
            "SELECT COUNT(*) FROM tool_calls WHERE session_id = ?", ("remove-me",)
        )
        assert cursor.fetchone()[0] == 0

    def test_concurrent_access_with_wal(self, db_path):
        """Two connections with WAL should not deadlock."""
        db1 = HistoryDB(db_path=db_path)
        db2 = HistoryDB(db_path=db_path)

        errors = []

        def writer1():
            try:
                db1.start_session("concurrent-1", project="/proj1")
                for i in range(10):
                    db1.record_tool_call("concurrent-1", f"Tool{i}")
            except Exception as e:
                errors.append(e)

        def writer2():
            try:
                db2.start_session("concurrent-2", project="/proj2")
                for i in range(10):
                    db2.record_tool_call("concurrent-2", f"Tool{i}")
            except Exception as e:
                errors.append(e)

        t1 = threading.Thread(target=writer1)
        t2 = threading.Thread(target=writer2)
        t1.start()
        t2.start()
        t1.join(timeout=10)
        t2.join(timeout=10)

        db1.close()
        db2.close()

        assert len(errors) == 0, f"Concurrent access errors: {errors}"


class TestDefaultConstructor:
    """HistoryDB() with no args should use default path and not raise."""

    def test_default_constructor_does_not_raise(self, db_dir, monkeypatch):
        """HistoryDB() with no args must use self._db_path, not the original None."""
        default_path = os.path.join(db_dir, "default", "history.db")
        monkeypatch.setattr(
            "hooks.lib.history_db._default_db_path", lambda: default_path
        )
        db = HistoryDB()
        assert db._db_path == default_path
        assert os.path.isfile(default_path)
        db.start_session("default-test", project="/proj")
        sessions = db.query_sessions(days=1)
        assert len(sessions) == 1
        db.close()


class TestSingleton:
    """Tests for HistoryDB singleton pattern (#931)."""

    def test_get_instance_returns_same_object(self, db_path):
        """get_instance() should return the same HistoryDB across calls."""
        try:
            inst1 = HistoryDB.get_instance(db_path=db_path)
            inst2 = HistoryDB.get_instance(db_path=db_path)
            assert inst1 is inst2
        finally:
            HistoryDB.close_instance()

    def test_get_instance_reuses_connection(self, db_path):
        """Singleton should reuse the same SQLite connection."""
        try:
            inst1 = HistoryDB.get_instance(db_path=db_path)
            conn1 = inst1._conn
            inst2 = HistoryDB.get_instance(db_path=db_path)
            conn2 = inst2._conn
            assert conn1 is conn2
        finally:
            HistoryDB.close_instance()

    def test_close_instance_clears_singleton(self, db_path):
        """close_instance() should clear the singleton so next get_instance creates new."""
        try:
            inst1 = HistoryDB.get_instance(db_path=db_path)
            HistoryDB.close_instance()
            inst2 = HistoryDB.get_instance(db_path=db_path)
            assert inst1 is not inst2
        finally:
            HistoryDB.close_instance()

    def test_close_instance_noop_when_no_instance(self):
        """close_instance() should not raise when no instance exists."""
        HistoryDB.close_instance()  # Should not raise
