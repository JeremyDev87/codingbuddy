"""Tests for checklist_verifier — pre-commit checklist domain detection (#1001)."""
import os
import sys
import unittest

sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "lib")
)

from checklist_verifier import ChecklistVerifier


class TestDomainDetection(unittest.TestCase):
    """Test file-pattern to checklist-domain mapping."""

    def setUp(self):
        self.verifier = ChecklistVerifier()

    # --- Security domain ---

    def test_auth_directory_triggers_security(self):
        domains = self.verifier.detect_domains(["src/auth/login.ts"])
        self.assertIn("security", domains)

    def test_login_file_triggers_security(self):
        domains = self.verifier.detect_domains(["src/features/login.tsx"])
        self.assertIn("security", domains)

    def test_password_file_triggers_security(self):
        domains = self.verifier.detect_domains(["src/utils/password-hash.ts"])
        self.assertIn("security", domains)

    def test_token_file_triggers_security(self):
        domains = self.verifier.detect_domains(["src/lib/jwt-token.ts"])
        self.assertIn("security", domains)

    def test_oauth_file_triggers_security(self):
        domains = self.verifier.detect_domains(["src/auth/oauth-callback.ts"])
        self.assertIn("security", domains)

    def test_session_file_triggers_security(self):
        domains = self.verifier.detect_domains(["src/middleware/session.ts"])
        self.assertIn("security", domains)

    # --- Accessibility domain ---

    def test_css_file_triggers_accessibility(self):
        domains = self.verifier.detect_domains(["src/styles/main.css"])
        self.assertIn("accessibility", domains)

    def test_scss_file_triggers_accessibility(self):
        domains = self.verifier.detect_domains(["src/styles/theme.scss"])
        self.assertIn("accessibility", domains)

    def test_tsx_with_aria_content_triggers_accessibility(self):
        domains = self.verifier.detect_domains(
            ["src/components/Button.tsx"],
            file_contents={"src/components/Button.tsx": "aria-label='submit'"},
        )
        self.assertIn("accessibility", domains)

    def test_tsx_without_aria_no_accessibility(self):
        """Plain .tsx without ARIA content should not trigger accessibility."""
        domains = self.verifier.detect_domains(["src/utils/helper.tsx"])
        self.assertNotIn("accessibility", domains)

    # --- Performance domain ---

    def test_api_route_triggers_performance(self):
        domains = self.verifier.detect_domains(["src/app/api/users/route.ts"])
        self.assertIn("performance", domains)

    def test_controller_triggers_performance(self):
        domains = self.verifier.detect_domains(["src/controllers/order.controller.ts"])
        self.assertIn("performance", domains)

    def test_endpoint_triggers_performance(self):
        domains = self.verifier.detect_domains(["src/endpoints/health.ts"])
        self.assertIn("performance", domains)

    # --- Multiple domains ---

    def test_multiple_domains_from_mixed_files(self):
        domains = self.verifier.detect_domains([
            "src/auth/login.ts",
            "src/app/api/users/route.ts",
            "src/styles/main.css",
        ])
        self.assertIn("security", domains)
        self.assertIn("performance", domains)
        self.assertIn("accessibility", domains)

    # --- No domain ---

    def test_unrelated_file_returns_empty(self):
        domains = self.verifier.detect_domains(["README.md"])
        self.assertEqual(domains, [])

    def test_test_file_returns_empty(self):
        domains = self.verifier.detect_domains(["src/auth/login.spec.ts"])
        self.assertEqual(domains, [])


class TestChecklistItems(unittest.TestCase):
    """Test checklist item retrieval per domain."""

    def setUp(self):
        self.verifier = ChecklistVerifier()

    def test_security_returns_3_to_5_items(self):
        items = self.verifier.get_checklist_items("security")
        self.assertGreaterEqual(len(items), 3)
        self.assertLessEqual(len(items), 5)

    def test_accessibility_returns_3_to_5_items(self):
        items = self.verifier.get_checklist_items("accessibility")
        self.assertGreaterEqual(len(items), 3)
        self.assertLessEqual(len(items), 5)

    def test_performance_returns_3_to_5_items(self):
        items = self.verifier.get_checklist_items("performance")
        self.assertGreaterEqual(len(items), 3)
        self.assertLessEqual(len(items), 5)

    def test_unknown_domain_returns_empty(self):
        items = self.verifier.get_checklist_items("unknown")
        self.assertEqual(items, [])


class TestFormatWarning(unittest.TestCase):
    """Test warning message formatting."""

    def setUp(self):
        self.verifier = ChecklistVerifier()

    def test_format_includes_domain_header(self):
        result = self.verifier.format_warning({"security": ["item1", "item2"]})
        self.assertIn("security", result.lower())

    def test_format_includes_all_items(self):
        items = {"security": ["Check input validation", "Verify auth tokens"]}
        result = self.verifier.format_warning(items)
        self.assertIn("Check input validation", result)
        self.assertIn("Verify auth tokens", result)

    def test_format_multiple_domains(self):
        items = {
            "security": ["item1"],
            "performance": ["item2"],
        }
        result = self.verifier.format_warning(items)
        self.assertIn("security", result.lower())
        self.assertIn("performance", result.lower())

    def test_format_empty_returns_empty(self):
        result = self.verifier.format_warning({})
        self.assertEqual(result, "")

    def test_format_is_non_blocking_warning(self):
        items = {"security": ["item1"]}
        result = self.verifier.format_warning(items)
        self.assertIn("non-blocking", result.lower())


class TestVerifyIntegration(unittest.TestCase):
    """Integration test for the full verify flow."""

    def setUp(self):
        self.verifier = ChecklistVerifier()

    def test_verify_returns_warning_for_security_files(self):
        result = self.verifier.verify(["src/auth/login.ts"])
        self.assertIsNotNone(result)
        self.assertIn("security", result.lower())

    def test_verify_returns_none_for_unrelated_files(self):
        result = self.verifier.verify(["README.md"])
        self.assertIsNone(result)

    def test_verify_with_empty_list_returns_none(self):
        result = self.verifier.verify([])
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
