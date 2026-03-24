"""Entry point for auto-learning: detect patterns and suggest rules."""
import logging

from hooks.lib.history_db import HistoryDB
from hooks.lib.pattern_detector import PatternDetector
from hooks.lib.rule_suggester import RuleSuggester

logger = logging.getLogger(__name__)


def suggest_rules(
    db_or_path, min_occurrences: int = 3, days: int = 30
) -> list:
    """Detect repeated failure patterns and generate rule suggestions.

    Args:
        db_or_path: A HistoryDB instance or a string path to the SQLite database.
        min_occurrences: Minimum failures to count as a pattern.
        days: How many days back to search.

    Returns:
        List of suggestion dicts with keys: title, description, rule_content, pattern.
    """
    owns_db = False
    if isinstance(db_or_path, str):
        db = HistoryDB(db_path=db_or_path)
        owns_db = True
    else:
        db = db_or_path

    try:
        detector = PatternDetector(db)
        patterns = detector.detect_patterns(
            min_occurrences=min_occurrences, days=days
        )

        suggester = RuleSuggester()
        return suggester.suggest_rules(patterns)
    except Exception as e:
        logger.error("Failed to suggest rules: %s", e)
        return []
    finally:
        if owns_db:
            db.close()
