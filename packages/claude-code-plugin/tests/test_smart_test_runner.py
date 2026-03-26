"""Tests for hooks/lib/smart_test_runner.py — SmartTestRunner."""
import os
import sys

import pytest

# Add hooks/lib to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "hooks", "lib"))

from smart_test_runner import SmartTestRunner


class TestFindRelatedTestsTypeScript:
    """TypeScript file → .spec.ts / .test.ts mapping."""

    def test_ts_file_maps_to_spec_and_test(self):
        """src/foo.ts → src/foo.spec.ts, src/foo.test.ts, tests/foo.spec.ts, tests/foo.test.ts"""
        runner = SmartTestRunner()
        result = runner.find_related_tests(["src/foo.ts"])
        assert "src/foo.spec.ts" in result
        assert "src/foo.test.ts" in result
        assert "tests/foo.spec.ts" in result
        assert "tests/foo.test.ts" in result

    def test_nested_ts_file(self):
        """src/utils/helper.ts → includes tests/utils/helper.spec.ts"""
        runner = SmartTestRunner()
        result = runner.find_related_tests(["src/utils/helper.ts"])
        assert "src/utils/helper.spec.ts" in result
        assert "tests/utils/helper.spec.ts" in result


class TestFindRelatedTestsPython:
    """Python file → test_*.py mapping."""

    def test_python_hooks_lib_file(self):
        """hooks/lib/bar.py → tests/test_bar.py"""
        runner = SmartTestRunner()
        result = runner.find_related_tests(["hooks/lib/bar.py"])
        assert "tests/test_bar.py" in result

    def test_python_nested_file(self):
        """src/utils/parser.py → tests/test_parser.py"""
        runner = SmartTestRunner()
        result = runner.find_related_tests(["src/utils/parser.py"])
        assert "tests/test_parser.py" in result


class TestFindRelatedTestsTSX:
    """TSX component → __tests__/ directory mapping."""

    def test_tsx_component_maps_to_tests_dir(self):
        """src/components/Baz.tsx → includes __tests__/Baz.test.tsx"""
        runner = SmartTestRunner()
        result = runner.find_related_tests(["src/components/Baz.tsx"])
        assert "src/components/Baz.spec.tsx" in result
        assert "src/components/__tests__/Baz.test.tsx" in result

    def test_tsx_nested_component(self):
        """src/features/auth/Login.tsx → includes __tests__/Login.test.tsx"""
        runner = SmartTestRunner()
        result = runner.find_related_tests(["src/features/auth/Login.tsx"])
        assert "src/features/auth/__tests__/Login.test.tsx" in result


class TestFindRelatedTestsEdgeCases:
    """Edge cases and empty results."""

    def test_no_related_tests_for_config_file(self):
        """Non-code files like .json should return empty list."""
        runner = SmartTestRunner()
        result = runner.find_related_tests(["package.json"])
        assert result == []

    def test_empty_input_returns_empty(self):
        """Empty changed_files list returns empty."""
        runner = SmartTestRunner()
        result = runner.find_related_tests([])
        assert result == []

    def test_multiple_files_combines_results(self):
        """Multiple changed files should combine all related tests."""
        runner = SmartTestRunner()
        result = runner.find_related_tests(["src/foo.ts", "hooks/lib/bar.py"])
        assert "src/foo.spec.ts" in result
        assert "tests/test_bar.py" in result

    def test_no_duplicates(self):
        """Same file twice should not produce duplicate test paths."""
        runner = SmartTestRunner()
        result = runner.find_related_tests(["src/foo.ts", "src/foo.ts"])
        assert len(result) == len(set(result))


class TestFormatSuggestion:
    """format_suggestion output."""

    def test_format_with_test_files(self):
        """Should produce a runnable command suggestion."""
        runner = SmartTestRunner()
        result = runner.format_suggestion(["src/foo.spec.ts", "tests/test_bar.py"])
        assert "src/foo.spec.ts" in result
        assert "tests/test_bar.py" in result
        assert "Consider running" in result

    def test_format_empty_returns_empty_string(self):
        """No test files → empty string (no suggestion)."""
        runner = SmartTestRunner()
        result = runner.format_suggestion([])
        assert result == ""
