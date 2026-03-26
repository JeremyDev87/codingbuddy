"""Smart test runner — maps changed files to related test files."""

import os
from typing import List

# Extensions recognized as testable source code
_TESTABLE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py"}


class SmartTestRunner:
    """Identifies test files related to changed source files."""

    def find_related_tests(self, changed_files: List[str]) -> List[str]:
        """Return deduplicated list of potential test file paths for changed files.

        Mapping rules:
        - src/foo.ts  → src/foo.spec.ts, src/foo.test.ts,
                         tests/foo.spec.ts, tests/foo.test.ts
        - hooks/lib/bar.py → tests/test_bar.py
        - src/components/Baz.tsx → src/components/Baz.spec.tsx,
                                    src/components/__tests__/Baz.test.tsx
        """
        seen: set = set()
        result: List[str] = []

        for filepath in changed_files:
            for candidate in self._candidates_for(filepath):
                if candidate not in seen:
                    seen.add(candidate)
                    result.append(candidate)

        return result

    def format_suggestion(self, test_files: List[str]) -> str:
        """Format a human-readable test run suggestion.

        Returns empty string if no test files.
        """
        if not test_files:
            return ""

        files_str = " ".join(test_files)
        return f"Consider running: {files_str}"

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _candidates_for(self, filepath: str) -> List[str]:
        """Generate candidate test paths for a single file."""
        ext = os.path.splitext(filepath)[1]
        if ext not in _TESTABLE_EXTENSIONS:
            return []

        if ext == ".py":
            return self._python_candidates(filepath)

        return self._js_ts_candidates(filepath)

    def _python_candidates(self, filepath: str) -> List[str]:
        """Python: hooks/lib/bar.py → tests/test_bar.py."""
        basename = os.path.basename(filepath)
        name_no_ext = os.path.splitext(basename)[0]
        return [f"tests/test_{name_no_ext}.py"]

    def _js_ts_candidates(self, filepath: str) -> List[str]:
        """JS/TS/JSX/TSX mapping rules."""
        dirpath = os.path.dirname(filepath)
        basename = os.path.basename(filepath)
        name_no_ext, ext = os.path.splitext(basename)

        candidates: List[str] = []

        # Same directory: foo.spec.ext, foo.test.ext
        candidates.append(os.path.join(dirpath, f"{name_no_ext}.spec{ext}"))
        candidates.append(os.path.join(dirpath, f"{name_no_ext}.test{ext}"))

        # __tests__ sibling directory
        candidates.append(
            os.path.join(dirpath, "__tests__", f"{name_no_ext}.test{ext}")
        )

        # Mirror under tests/ directory — strip leading src/ if present
        rel = filepath
        if rel.startswith("src/") or rel.startswith("src\\"):
            rel = rel[4:]
        rel_dir = os.path.dirname(rel)
        rel_name = os.path.splitext(os.path.basename(rel))[0]

        candidates.append(os.path.join("tests", rel_dir, f"{rel_name}.spec{ext}"))
        candidates.append(os.path.join("tests", rel_dir, f"{rel_name}.test{ext}"))

        # Normalize path separators and remove leading ./
        return [os.path.normpath(c).replace("\\", "/") for c in candidates]
