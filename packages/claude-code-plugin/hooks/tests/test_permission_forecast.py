"""Tests for permission_forecast prompt-aware analysis (#1418)."""

import sys
import os
import unittest

# Ensure hooks/lib is importable
sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), os.pardir, "lib")
)

from permission_forecast import generate_standalone_forecast


class TestStandaloneNoPrompt(unittest.TestCase):
    """Backward compatibility: mode-only forecast without prompt."""

    def test_plan_returns_empty(self):
        self.assertEqual(generate_standalone_forecast("PLAN"), "")

    def test_act_default_bundle(self):
        result = generate_standalone_forecast("ACT")
        self.assertIn("repo-write", result)
        self.assertIn("Code changes", result)

    def test_eval_returns_empty(self):
        self.assertEqual(generate_standalone_forecast("EVAL"), "")


class TestPromptAwareForecast(unittest.TestCase):
    """Prompt-signal enrichment mirrors MCP permission-forecast.ts."""

    def test_install_adds_network(self):
        result = generate_standalone_forecast("ACT", prompt="install react-query")
        self.assertIn("network", result)
        self.assertIn("Install dependencies", result)

    def test_test_adds_run_checks(self):
        result = generate_standalone_forecast("ACT", prompt="run tests")
        self.assertIn("Run checks", result)

    def test_ship_adds_external(self):
        result = generate_standalone_forecast("ACT", prompt="ship the changes")
        self.assertIn("external", result)
        self.assertIn("Ship changes", result)

    def test_delete_adds_destructive_bundle(self):
        result = generate_standalone_forecast("ACT", prompt="delete old files")
        self.assertIn("destructive", result)
        self.assertIn("Delete files", result)

    def test_review_in_eval_adds_external(self):
        result = generate_standalone_forecast("EVAL", prompt="review PR 42")
        self.assertIn("external", result)
        self.assertIn("Review PR", result)

    def test_review_in_act_no_review_bundle(self):
        result = generate_standalone_forecast("ACT", prompt="review the code")
        self.assertNotIn("Review PR", result)

    def test_install_and_test_combined(self):
        result = generate_standalone_forecast(
            "ACT", prompt="install react-query and run tests"
        )
        self.assertIn("network", result)
        self.assertIn("Install dependencies", result)
        self.assertIn("Run checks", result)

    def test_plan_with_prompt_still_empty(self):
        # PLAN mode is read-only even with prompt signals
        result = generate_standalone_forecast("PLAN", prompt="install stuff")
        # network is added but no bundles → still shows something
        self.assertIn("network", result)


if __name__ == "__main__":
    unittest.main()
