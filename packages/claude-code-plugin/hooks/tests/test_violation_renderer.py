"""Tests for violation_renderer — clear violation message formatting (#1439)."""
import os
import sys
import unittest

sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "lib")
)

from rule_checker import Violation
from violation_renderer import ViolationRenderer


class TestViolationRenderer(unittest.TestCase):
    """Test violation message rendering."""

    def setUp(self):
        self.renderer = ViolationRenderer()

    def test_render_single_violation(self):
        violations = [
            Violation(
                rule_id="SEC-001",
                severity="high",
                message="SQL injection detected",
                line_content='query = f"SELECT * FROM users WHERE id = {uid}"',
                suggested_fix="Use parameterized queries",
            ),
        ]
        result = self.renderer.render(violations)
        self.assertIn("SEC-001", result)
        self.assertIn("SQL injection", result)
        self.assertIn("parameterized", result)

    def test_render_multiple_violations(self):
        violations = [
            Violation(
                rule_id="SEC-001",
                severity="high",
                message="SQL injection detected",
                line_content='query = f"SELECT * FROM users WHERE id = {uid}"',
                suggested_fix="Use parameterized queries",
            ),
            Violation(
                rule_id="SEC-003",
                severity="high",
                message="Hardcoded secret detected",
                line_content='API_KEY = "sk-1234567890abcdef"',
                suggested_fix="Use environment variables",
            ),
        ]
        result = self.renderer.render(violations)
        self.assertIn("SEC-001", result)
        self.assertIn("SEC-003", result)

    def test_render_empty_returns_empty(self):
        result = self.renderer.render([])
        self.assertEqual(result, "")

    def test_render_includes_severity(self):
        violations = [
            Violation(
                rule_id="SEC-001",
                severity="high",
                message="SQL injection",
                line_content="x",
                suggested_fix="fix",
            ),
        ]
        result = self.renderer.render(violations)
        self.assertIn("HIGH", result.upper())

    def test_render_includes_header(self):
        violations = [
            Violation(
                rule_id="SEC-001",
                severity="high",
                message="SQL injection",
                line_content="x",
                suggested_fix="fix",
            ),
        ]
        result = self.renderer.render(violations)
        self.assertIn("CodingBuddy", result)
        self.assertIn("Guardrail", result)

    def test_render_includes_line_content(self):
        violations = [
            Violation(
                rule_id="SEC-004",
                severity="high",
                message="Dangerous eval",
                line_content="eval(user_input)",
                suggested_fix="Avoid eval",
            ),
        ]
        result = self.renderer.render(violations)
        self.assertIn("eval(user_input)", result)

    def test_render_includes_suggested_fix(self):
        violations = [
            Violation(
                rule_id="SEC-002",
                severity="high",
                message="XSS risk",
                line_content="innerHTML = x",
                suggested_fix="Use textContent or sanitize input",
            ),
        ]
        result = self.renderer.render(violations)
        self.assertIn("textContent", result)

    def test_render_uses_unicode_box(self):
        """Output should use unicode box-drawing characters."""
        violations = [
            Violation(
                rule_id="SEC-001",
                severity="high",
                message="SQL injection",
                line_content="x",
                suggested_fix="fix",
            ),
        ]
        result = self.renderer.render(violations)
        # Should contain box-drawing characters
        self.assertTrue(
            any(c in result for c in "━┃┏┓┗┛╋├┤┬┴│─╭╮╰╯"),
            "Expected unicode box-drawing characters in output",
        )

    def test_render_shows_violation_count(self):
        violations = [
            Violation("SEC-001", "high", "A", "x", "fix"),
            Violation("SEC-002", "high", "B", "y", "fix"),
            Violation("SEC-003", "high", "C", "z", "fix"),
        ]
        result = self.renderer.render(violations)
        self.assertIn("3", result)


class TestRenderForHook(unittest.TestCase):
    """Test rendering formatted for hook additionalContext."""

    def setUp(self):
        self.renderer = ViolationRenderer()

    def test_render_for_hook_context(self):
        violations = [
            Violation(
                rule_id="SEC-001",
                severity="high",
                message="SQL injection detected",
                line_content='query = f"SELECT * FROM users WHERE id = {uid}"',
                suggested_fix="Use parameterized queries",
            ),
        ]
        result = self.renderer.render_for_hook(violations)
        # Should be a concise single-line or few-line format for additionalContext
        self.assertIn("SEC-001", result)
        self.assertIn("SQL injection", result)

    def test_render_for_hook_empty(self):
        result = self.renderer.render_for_hook([])
        self.assertEqual(result, "")


if __name__ == "__main__":
    unittest.main()
