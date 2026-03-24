"""Lazy mtime-based file watcher for detecting rule/config changes."""

import glob
import os
from typing import Dict, List, Optional


class FileWatcher:
    """Detects file changes between hook invocations using mtime comparison."""

    _default_patterns: List[str] = [
        "packages/rules/.ai-rules/**/*.md",
        "codingbuddy.config.json",
    ]

    def __init__(self, project_root: str) -> None:
        self._project_root = project_root
        self._last_snapshot: Dict[str, float] = {}

    def snapshot(self, patterns: Optional[List[str]] = None) -> Dict[str, float]:
        """Record current mtimes for files matching glob patterns.

        Args:
            patterns: Glob patterns relative to project root. Uses defaults if None.

        Returns:
            Dict mapping absolute file paths to their mtime values.
        """
        files = self._resolve_patterns(patterns)
        result: Dict[str, float] = {}
        for filepath in files:
            try:
                result[filepath] = os.stat(filepath).st_mtime
            except FileNotFoundError:
                continue
        self._last_snapshot = result
        return dict(result)

    def detect_changes(self) -> List[str]:
        """Compare current mtimes vs last snapshot.

        Returns:
            List of file paths that have been modified or deleted since last snapshot.
        """
        changed: List[str] = []
        for filepath, old_mtime in self._last_snapshot.items():
            try:
                current_mtime = os.stat(filepath).st_mtime
                if current_mtime != old_mtime:
                    changed.append(filepath)
            except FileNotFoundError:
                changed.append(filepath)
        return changed

    def _resolve_patterns(self, patterns: Optional[List[str]]) -> List[str]:
        """Expand glob patterns to actual file paths.

        Args:
            patterns: Glob patterns relative to project root. Uses defaults if None.

        Returns:
            List of absolute file paths matching the patterns.
        """
        if patterns is None:
            patterns = self._default_patterns

        resolved: List[str] = []
        for pattern in patterns:
            full_pattern = os.path.join(self._project_root, pattern)
            matched = glob.glob(full_pattern, recursive=True)
            resolved.extend(matched)
        return sorted(set(resolved))
