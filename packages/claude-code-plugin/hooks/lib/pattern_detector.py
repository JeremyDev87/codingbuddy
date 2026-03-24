"""Detect repeated error patterns from HistoryDB execution history."""
import logging
import time

from hooks.lib.history_db import HistoryDB

logger = logging.getLogger(__name__)


class PatternDetector:
    """Analyzes tool_calls in HistoryDB to find repeated failure patterns."""

    def __init__(self, db: HistoryDB):
        self._db = db

    def detect_patterns(
        self, min_occurrences: int = 3, days: int = 30
    ) -> list:
        """Detect repeated failure patterns from execution history.

        Args:
            min_occurrences: Minimum number of failures to count as a pattern.
            days: How many days back to search.

        Returns:
            List of pattern dicts with keys: tool_name, input_summary,
            failure_count, session_count, first_seen, last_seen.
        """
        cutoff = time.time() - (days * 86400)
        try:
            cursor = self._db._conn.execute(
                """
                SELECT
                    tool_name,
                    input_summary,
                    COUNT(*) AS failure_count,
                    COUNT(DISTINCT session_id) AS session_count,
                    MIN(timestamp) AS first_seen,
                    MAX(timestamp) AS last_seen
                FROM tool_calls
                WHERE success = 0 AND timestamp >= ?
                GROUP BY tool_name, input_summary
                HAVING COUNT(*) >= ?
                ORDER BY failure_count DESC
                """,
                (cutoff, min_occurrences),
            )
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
        except Exception as e:
            logger.error("Failed to detect patterns: %s", e)
            return []
