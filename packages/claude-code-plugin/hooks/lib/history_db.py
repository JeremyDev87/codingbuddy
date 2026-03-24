"""Execution history database for tracking sessions and tool calls."""
import logging
import os
import sqlite3
import stat
import time

logger = logging.getLogger(__name__)

DEFAULT_DB_PATH = os.path.expanduser("~/.codingbuddy/history.db")


class HistoryDB:
    """Persistent SQLite database for execution history."""

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self._db_path = db_path
        self._ensure_directory()
        self._conn = sqlite3.connect(db_path, timeout=10)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._set_file_permissions()
        self._create_tables()

    def _ensure_directory(self):
        """Create parent directory with 0o700 permissions."""
        dir_path = os.path.dirname(self._db_path)
        if not os.path.exists(dir_path):
            os.makedirs(dir_path, mode=0o700)
        else:
            os.chmod(dir_path, 0o700)

    def _set_file_permissions(self):
        """Set DB file permissions to 0o600."""
        if os.path.exists(self._db_path):
            os.chmod(self._db_path, 0o600)

    def _create_tables(self):
        """Create sessions and tool_calls tables."""
        try:
            self._conn.executescript("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY,
                    session_id TEXT UNIQUE NOT NULL,
                    started_at REAL NOT NULL,
                    ended_at REAL,
                    project TEXT,
                    model TEXT,
                    tool_call_count INTEGER DEFAULT 0,
                    error_count INTEGER DEFAULT 0,
                    outcome TEXT
                );
                CREATE TABLE IF NOT EXISTS tool_calls (
                    id INTEGER PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    tool_name TEXT NOT NULL,
                    input_summary TEXT,
                    success INTEGER DEFAULT 1,
                    FOREIGN KEY (session_id) REFERENCES sessions(session_id)
                );
                CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id);
                CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
            """)
        except sqlite3.Error as e:
            logger.error("Failed to create tables: %s", e)

    def start_session(self, session_id: str, project: str, model: str = None):
        """Record a new session."""
        try:
            self._conn.execute(
                "INSERT INTO sessions (session_id, started_at, project, model) VALUES (?, ?, ?, ?)",
                (session_id, time.time(), project, model),
            )
            self._conn.commit()
        except sqlite3.Error as e:
            logger.error("Failed to start session: %s", e)

    def record_tool_call(
        self,
        session_id: str,
        tool_name: str,
        input_summary: str = None,
        success: bool = True,
    ):
        """Record a tool call and update session counters."""
        try:
            self._conn.execute(
                "INSERT INTO tool_calls (session_id, timestamp, tool_name, input_summary, success) "
                "VALUES (?, ?, ?, ?, ?)",
                (session_id, time.time(), tool_name, input_summary, 1 if success else 0),
            )
            self._conn.execute(
                "UPDATE sessions SET tool_call_count = tool_call_count + 1 WHERE session_id = ?",
                (session_id,),
            )
            if not success:
                self._conn.execute(
                    "UPDATE sessions SET error_count = error_count + 1 WHERE session_id = ?",
                    (session_id,),
                )
            self._conn.commit()
        except sqlite3.Error as e:
            logger.error("Failed to record tool call: %s", e)

    def end_session(self, session_id: str, outcome: str = None):
        """Mark a session as ended."""
        try:
            self._conn.execute(
                "UPDATE sessions SET ended_at = ?, outcome = ? WHERE session_id = ?",
                (time.time(), outcome, session_id),
            )
            self._conn.commit()
        except sqlite3.Error as e:
            logger.error("Failed to end session: %s", e)

    def query_sessions(self, days: int = 30) -> list:
        """Query sessions from the last N days."""
        try:
            cutoff = time.time() - (days * 86400)
            cursor = self._conn.execute(
                "SELECT session_id, started_at, ended_at, project, model, "
                "tool_call_count, error_count, outcome "
                "FROM sessions WHERE started_at >= ? ORDER BY started_at DESC",
                (cutoff,),
            )
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
        except sqlite3.Error as e:
            logger.error("Failed to query sessions: %s", e)
            return []

    def query_tool_stats(self) -> dict:
        """Get aggregate tool usage counts."""
        try:
            cursor = self._conn.execute(
                "SELECT tool_name, COUNT(*) as count FROM tool_calls GROUP BY tool_name"
            )
            return {row[0]: row[1] for row in cursor.fetchall()}
        except sqlite3.Error as e:
            logger.error("Failed to query tool stats: %s", e)
            return {}

    def cleanup(self, retention_days: int = 90):
        """Delete records older than retention_days."""
        try:
            cutoff = time.time() - (retention_days * 86400)
            self._conn.execute(
                "DELETE FROM tool_calls WHERE session_id IN "
                "(SELECT session_id FROM sessions WHERE started_at < ?)",
                (cutoff,),
            )
            self._conn.execute(
                "DELETE FROM sessions WHERE started_at < ?", (cutoff,)
            )
            self._conn.commit()
        except sqlite3.Error as e:
            logger.error("Failed to cleanup old records: %s", e)

    def close(self):
        """Close the database connection."""
        try:
            self._conn.close()
        except sqlite3.Error as e:
            logger.error("Failed to close database: %s", e)
