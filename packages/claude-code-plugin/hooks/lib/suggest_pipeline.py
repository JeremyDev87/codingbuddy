"""Pipeline wiring PatternDetector → RuleSuggester for self-evolving rules."""
import json
import logging
import os
import sys

# Ensure both hooks/lib (local) and plugin root (for hooks.lib.* imports) are on path
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_PLUGIN_ROOT = os.path.dirname(os.path.dirname(_THIS_DIR))
for _p in (_THIS_DIR, _PLUGIN_ROOT):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from history_db import HistoryDB
from pattern_detector import PatternDetector
from rule_suggester import RuleSuggester

logger = logging.getLogger(__name__)


class SuggestPipeline:
    """Connects pattern detection to rule suggestion generation.

    Usage:
        pipeline = SuggestPipeline(db)
        suggestions = pipeline.run(min_occurrences=3, days=30)
    """

    def __init__(self, db: HistoryDB):
        self._detector = PatternDetector(db)
        self._suggester = RuleSuggester()

    def run(self, min_occurrences: int = 3, days: int = 30) -> list:
        """Run the full pipeline: detect patterns → generate rule suggestions.

        Args:
            min_occurrences: Minimum failures to count as a pattern.
            days: How many days back to search.

        Returns:
            List of suggestion dicts with keys: title, description,
            rule_content, pattern.
        """
        try:
            patterns = self._detector.detect_patterns(
                min_occurrences=min_occurrences, days=days
            )
        except Exception as e:
            logger.error("Pattern detection failed: %s", e)
            return []

        return self._suggester.suggest_rules(patterns)

    @staticmethod
    def to_json(suggestions: list) -> str:
        """Serialize suggestions to JSON string."""
        return json.dumps(suggestions, default=str)


def main():
    """CLI entry point: outputs suggestions as JSON to stdout."""
    import argparse

    parser = argparse.ArgumentParser(description="Run suggest-rules pipeline")
    parser.add_argument("--db-path", help="Path to history.db")
    parser.add_argument(
        "--min-occurrences", type=int, default=3, help="Minimum failures"
    )
    parser.add_argument(
        "--days", type=int, default=30, help="Days to look back"
    )
    args = parser.parse_args()

    db = HistoryDB(db_path=args.db_path) if args.db_path else HistoryDB.get_instance()
    try:
        pipeline = SuggestPipeline(db)
        suggestions = pipeline.run(
            min_occurrences=args.min_occurrences, days=args.days
        )
        print(pipeline.to_json(suggestions))
    finally:
        if args.db_path:
            db.close()


if __name__ == "__main__":
    main()
