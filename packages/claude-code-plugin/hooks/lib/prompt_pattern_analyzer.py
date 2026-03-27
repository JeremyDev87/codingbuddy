"""User prompt pattern analysis for personalized shortcut suggestions.

Analyzes prompt patterns locally to suggest matching shortcuts/skills.
Privacy-first: stores only category counts, never raw prompts.
Opt-in via ``promptPatternAnalysis.enabled`` in codingbuddy.config.json.
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

PATTERNS_FILE = "patterns.json"

# Keyword-to-category mapping for prompt classification.
# Order matters: first match wins.
CATEGORY_KEYWORDS: Dict[str, List[str]] = {
    "test": [
        "test",
        "테스트",
        "pytest",
        "jest",
        "spec",
        "coverage",
        "assertion",
    ],
    "debug": [
        "fix",
        "bug",
        "error",
        "debug",
        "디버그",
        "수정",
        "오류",
        "issue",
        "broken",
        "crash",
        "fail",
    ],
    "refactor": [
        "refactor",
        "리팩토링",
        "리팩터",
        "clean",
        "restructure",
        "simplify",
        "extract",
    ],
    "build": [
        "build",
        "compile",
        "빌드",
        "bundle",
        "webpack",
        "vite",
        "esbuild",
    ],
    "deploy": [
        "deploy",
        "배포",
        "release",
        "ship",
        "publish",
        "production",
    ],
    "review": [
        "review",
        "리뷰",
        "pr",
        "pull request",
        "코드 리뷰",
        "check",
    ],
    "docs": [
        "doc",
        "문서",
        "readme",
        "comment",
        "documentation",
        "jsdoc",
    ],
    "create": [
        "create",
        "생성",
        "new",
        "add",
        "만들",
        "component",
        "feature",
        "implement",
    ],
    "git": [
        "commit",
        "push",
        "merge",
        "branch",
        "rebase",
        "cherry-pick",
        "stash",
    ],
    "security": [
        "security",
        "보안",
        "vulnerab",
        "auth",
        "permission",
        "xss",
        "injection",
        "csrf",
    ],
    "performance": [
        "performance",
        "성능",
        "optimi",
        "slow",
        "fast",
        "latency",
        "memory",
        "cache",
    ],
}

# Shortcut/skill suggestions per category.
_SHORTCUT_MAP: Dict[str, Dict[str, str]] = {
    "test": {
        "shortcut": "/tdd",
        "skill": "superpowers:test-driven-development",
        "description": "Run TDD workflow for test-first development",
    },
    "debug": {
        "shortcut": "/debug",
        "skill": "superpowers:systematic-debugging",
        "description": "Systematic debugging with root cause analysis",
    },
    "refactor": {
        "shortcut": "/simplify",
        "skill": "simplify",
        "description": "Review and simplify code for quality",
    },
    "build": {
        "shortcut": "/build-fix",
        "skill": "oh-my-claudecode:build-fix",
        "description": "Fix build and compilation errors",
    },
    "deploy": {
        "shortcut": "/ship",
        "skill": "ship",
        "description": "Run CI checks and ship changes",
    },
    "review": {
        "shortcut": "/code-review",
        "skill": "oh-my-claudecode:code-review",
        "description": "Run comprehensive code review",
    },
    "docs": {
        "shortcut": "/plan",
        "skill": "oh-my-claudecode:plan",
        "description": "Plan documentation structure",
    },
    "create": {
        "shortcut": "/brainstorm",
        "skill": "superpowers:brainstorming",
        "description": "Brainstorm before creating new features",
    },
    "git": {
        "shortcut": "/git-master",
        "skill": "oh-my-claudecode:git-master",
        "description": "Git expert for commits and history management",
    },
    "security": {
        "shortcut": "/security-review",
        "skill": "oh-my-claudecode:security-review",
        "description": "Run comprehensive security review",
    },
    "performance": {
        "shortcut": "/analyze",
        "skill": "oh-my-claudecode:analyze",
        "description": "Deep analysis and investigation",
    },
}


def classify_prompt(prompt: str) -> str:
    """Classify a prompt into a category using keyword matching.

    Privacy: only returns a category string, never stores the prompt.

    Args:
        prompt: Raw user prompt text.

    Returns:
        Category string (e.g. "test", "debug") or "other".
    """
    if not prompt:
        return "other"
    lower = prompt.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                return category
    return "other"


class PromptPatternAnalyzer:
    """Analyzes user prompt patterns and suggests personalized shortcuts.

    Stores only category frequency counts locally. Never stores raw prompts.
    Must be explicitly enabled via config (opt-in).
    """

    def __init__(self, data_dir: str, enabled: bool = False) -> None:
        self._data_dir = data_dir
        self._enabled = enabled
        self._categories: Dict[str, int] = {}
        self._total: int = 0

        if self._enabled:
            os.makedirs(self._data_dir, exist_ok=True)
            self._load()

    @property
    def enabled(self) -> bool:
        return self._enabled

    @classmethod
    def from_config(
        cls,
        config: Dict[str, Any],
        data_dir: str,
    ) -> "PromptPatternAnalyzer":
        """Create an analyzer from codingbuddy config.

        Args:
            config: Parsed codingbuddy.config.json dict.
            data_dir: Default data directory path.

        Returns:
            Configured PromptPatternAnalyzer instance.
        """
        ppa_config = config.get("promptPatternAnalysis", {})
        enabled = ppa_config.get("enabled", False)
        custom_dir = ppa_config.get("dataDir", None)
        return cls(
            data_dir=custom_dir or data_dir,
            enabled=bool(enabled),
        )

    def record_prompt(self, prompt: str) -> None:
        """Record a prompt by classifying and incrementing the category count.

        Args:
            prompt: Raw user prompt text (not stored).
        """
        if not self._enabled:
            return

        category = classify_prompt(prompt)
        self._categories[category] = self._categories.get(category, 0) + 1
        self._total += 1
        self._save()

    def analyze_patterns(self, top_n: int = 10) -> List[Dict[str, Any]]:
        """Return top N most frequent prompt categories.

        Args:
            top_n: Maximum number of patterns to return.

        Returns:
            List of dicts with keys: category, count, percentage.
            Sorted by count descending.
        """
        if not self._enabled or not self._categories:
            return []

        sorted_cats = sorted(
            self._categories.items(), key=lambda x: x[1], reverse=True
        )[:top_n]

        total = self._total if self._total > 0 else 1
        return [
            {
                "category": cat,
                "count": count,
                "percentage": round((count / total) * 100, 1),
            }
            for cat, count in sorted_cats
        ]

    def suggest_shortcuts(
        self, min_count: int = 3
    ) -> List[Dict[str, Any]]:
        """Suggest shortcuts/skills based on frequent patterns.

        Args:
            min_count: Minimum category count to trigger a suggestion.

        Returns:
            List of suggestion dicts with keys:
            category, count, shortcut, skill, description.
        """
        if not self._enabled:
            return []

        suggestions = []
        for cat, count in sorted(
            self._categories.items(), key=lambda x: x[1], reverse=True
        ):
            if count < min_count:
                continue
            mapping = _SHORTCUT_MAP.get(cat)
            if mapping is None:
                continue
            suggestions.append(
                {
                    "category": cat,
                    "count": count,
                    **mapping,
                }
            )
        return suggestions

    def _load(self) -> None:
        """Load pattern data from disk."""
        path = os.path.join(self._data_dir, PATTERNS_FILE)
        if not os.path.isfile(path):
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._categories = data.get("categories", {})
            self._total = data.get("total", 0)
        except (json.JSONDecodeError, OSError) as e:
            logger.warning("Failed to load pattern data: %s", e)

    def _save(self) -> None:
        """Persist pattern data to disk."""
        path = os.path.join(self._data_dir, PATTERNS_FILE)
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(
                    {"categories": self._categories, "total": self._total},
                    f,
                    indent=2,
                )
        except OSError as e:
            logger.warning("Failed to save pattern data: %s", e)
