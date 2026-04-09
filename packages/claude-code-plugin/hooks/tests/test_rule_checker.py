"""Tests for rule_checker — live AI guardrails for PreToolUse (#1439)."""
import os
import sys
import unittest

sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "lib")
)

from rule_checker import RuleChecker, Violation


class TestViolationDataclass(unittest.TestCase):
    """Test Violation structure."""

    def test_violation_has_required_fields(self):
        v = Violation(
            rule_id="SEC-001",
            severity="high",
            message="SQL injection detected",
            line_content="query = f\"SELECT * FROM users WHERE id = {user_id}\"",
            suggested_fix="Use parameterized queries instead of string interpolation",
        )
        self.assertEqual(v.rule_id, "SEC-001")
        self.assertEqual(v.severity, "high")
        self.assertEqual(v.message, "SQL injection detected")
        self.assertIn("SELECT", v.line_content)
        self.assertIn("parameterized", v.suggested_fix)


class TestGuardrailLevel(unittest.TestCase):
    """Test CODINGBUDDY_GUARDRAIL_LEVEL configuration."""

    def test_default_level_is_normal(self):
        checker = RuleChecker()
        self.assertEqual(checker.level, "normal")

    def test_level_from_env(self):
        os.environ["CODINGBUDDY_GUARDRAIL_LEVEL"] = "strict"
        try:
            checker = RuleChecker()
            self.assertEqual(checker.level, "strict")
        finally:
            del os.environ["CODINGBUDDY_GUARDRAIL_LEVEL"]

    def test_level_off_disables_checking(self):
        os.environ["CODINGBUDDY_GUARDRAIL_LEVEL"] = "off"
        try:
            checker = RuleChecker()
            result = checker.check("query = f\"SELECT * FROM users WHERE id = {uid}\"")
            self.assertEqual(result, [])
        finally:
            del os.environ["CODINGBUDDY_GUARDRAIL_LEVEL"]

    def test_invalid_level_defaults_to_normal(self):
        os.environ["CODINGBUDDY_GUARDRAIL_LEVEL"] = "invalid"
        try:
            checker = RuleChecker()
            self.assertEqual(checker.level, "normal")
        finally:
            del os.environ["CODINGBUDDY_GUARDRAIL_LEVEL"]


class TestSQLInjectionDetection(unittest.TestCase):
    """Test SQL injection pattern detection."""

    def setUp(self):
        self.checker = RuleChecker()

    def test_fstring_sql_injection(self):
        code = 'query = f"SELECT * FROM users WHERE id = {user_id}"'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-001" for v in violations))

    def test_format_sql_injection(self):
        code = 'query = "SELECT * FROM users WHERE id = %s" % user_id'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-001" for v in violations))

    def test_concat_sql_injection(self):
        code = 'query = "SELECT * FROM users WHERE id = " + user_id'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-001" for v in violations))

    def test_parameterized_query_no_violation(self):
        code = 'cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))'
        violations = self.checker.check(code)
        self.assertFalse(any(v.rule_id == "SEC-001" for v in violations))

    def test_sql_keyword_in_comment_no_violation(self):
        code = '# SELECT * FROM users WHERE id = {user_id}'
        violations = self.checker.check(code)
        self.assertFalse(any(v.rule_id == "SEC-001" for v in violations))

    def test_sql_in_string_constant_no_violation(self):
        """Static SQL without interpolation should not trigger."""
        code = 'QUERY = "SELECT * FROM users WHERE active = true"'
        violations = self.checker.check(code)
        self.assertFalse(any(v.rule_id == "SEC-001" for v in violations))


class TestXSSDetection(unittest.TestCase):
    """Test XSS pattern detection."""

    def setUp(self):
        self.checker = RuleChecker()

    def test_innerhtml_assignment(self):
        code = 'element.innerHTML = userInput'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-002" for v in violations))

    def test_document_write(self):
        code = 'document.write(userContent)'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-002" for v in violations))

    def test_dangerouslysetinnerhtml(self):
        code = '<div dangerouslySetInnerHTML={{__html: userInput}} />'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-002" for v in violations))

    def test_innerhtml_in_comment_no_violation(self):
        code = '// element.innerHTML = sanitized'
        violations = self.checker.check(code)
        self.assertFalse(any(v.rule_id == "SEC-002" for v in violations))


class TestHardcodedSecretsDetection(unittest.TestCase):
    """Test hardcoded secrets pattern detection."""

    def setUp(self):
        self.checker = RuleChecker()

    def test_api_key_assignment(self):
        code = 'API_KEY = "sk-1234567890abcdef1234567890abcdef"'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-003" for v in violations))

    def test_password_assignment(self):
        code = 'password = "my_super_secret_password"'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-003" for v in violations))

    def test_secret_assignment(self):
        code = 'SECRET_KEY = "abcdef1234567890"'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-003" for v in violations))

    def test_aws_key_pattern(self):
        code = 'aws_access_key = "AKIAIOSFODNN7EXAMPLE"'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-003" for v in violations))

    def test_env_var_reference_no_violation(self):
        code = 'API_KEY = os.environ["API_KEY"]'
        violations = self.checker.check(code)
        self.assertFalse(any(v.rule_id == "SEC-003" for v in violations))

    def test_placeholder_no_violation(self):
        code = 'API_KEY = "your-api-key-here"'
        violations = self.checker.check(code)
        self.assertFalse(any(v.rule_id == "SEC-003" for v in violations))

    def test_empty_string_no_violation(self):
        code = 'password = ""'
        violations = self.checker.check(code)
        self.assertFalse(any(v.rule_id == "SEC-003" for v in violations))

    def test_secret_in_comment_no_violation(self):
        code = '# SECRET_KEY = "abcdef1234567890"'
        violations = self.checker.check(code)
        self.assertFalse(any(v.rule_id == "SEC-003" for v in violations))


class TestEvalDetection(unittest.TestCase):
    """Test dangerous eval/exec detection."""

    def setUp(self):
        self.checker = RuleChecker()

    def test_eval_call(self):
        code = 'result = eval(user_input)'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-004" for v in violations))

    def test_exec_call(self):
        code = 'exec(user_code)'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-004" for v in violations))

    def test_eval_in_comment_no_violation(self):
        code = '# eval(something)'
        violations = self.checker.check(code)
        self.assertFalse(any(v.rule_id == "SEC-004" for v in violations))


class TestStrictMode(unittest.TestCase):
    """Test strict mode catches additional patterns."""

    def setUp(self):
        os.environ["CODINGBUDDY_GUARDRAIL_LEVEL"] = "strict"
        self.checker = RuleChecker()

    def tearDown(self):
        del os.environ["CODINGBUDDY_GUARDRAIL_LEVEL"]

    def test_subprocess_shell_true(self):
        code = 'subprocess.run(cmd, shell=True)'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-005" for v in violations))

    def test_os_system_call(self):
        code = 'os.system(user_command)'
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-005" for v in violations))

    def test_subprocess_shell_true_not_in_normal(self):
        """Normal mode should not flag shell=True."""
        os.environ["CODINGBUDDY_GUARDRAIL_LEVEL"] = "normal"
        checker = RuleChecker()
        code = 'subprocess.run(cmd, shell=True)'
        violations = checker.check(code)
        self.assertFalse(any(v.rule_id == "SEC-005" for v in violations))


class TestToolInputExtraction(unittest.TestCase):
    """Test extracting content from Edit/Write tool_input."""

    def setUp(self):
        self.checker = RuleChecker()

    def test_check_tool_input_edit(self):
        tool_input = {
            "file_path": "/src/db.py",
            "new_string": 'query = f"DELETE FROM users WHERE id = {uid}"',
            "old_string": "pass",
        }
        violations = self.checker.check_tool_input("Edit", tool_input)
        self.assertTrue(any(v.rule_id == "SEC-001" for v in violations))

    def test_check_tool_input_write(self):
        tool_input = {
            "file_path": "/src/app.py",
            "content": 'SECRET = "hardcoded_secret_value_12345678"',
        }
        violations = self.checker.check_tool_input("Write", tool_input)
        self.assertTrue(any(v.rule_id == "SEC-003" for v in violations))

    def test_check_tool_input_ignores_other_tools(self):
        tool_input = {"command": 'echo "SELECT * FROM users"'}
        violations = self.checker.check_tool_input("Bash", tool_input)
        self.assertEqual(violations, [])

    def test_check_tool_input_empty(self):
        violations = self.checker.check_tool_input("Edit", {})
        self.assertEqual(violations, [])


class TestMultilineContent(unittest.TestCase):
    """Test detection across multiline content."""

    def setUp(self):
        self.checker = RuleChecker()

    def test_violation_in_multiline(self):
        code = '''
import os

def get_user(uid):
    query = f"SELECT * FROM users WHERE id = {uid}"
    return db.execute(query)
'''
        violations = self.checker.check(code)
        self.assertTrue(any(v.rule_id == "SEC-001" for v in violations))

    def test_multiple_violations_in_one_content(self):
        code = '''
API_KEY = "sk-proj-real-secret-key-1234567890ab"
result = eval(user_input)
'''
        violations = self.checker.check(code)
        rule_ids = {v.rule_id for v in violations}
        self.assertIn("SEC-003", rule_ids)
        self.assertIn("SEC-004", rule_ids)

    def test_no_duplicate_violations(self):
        """Same pattern on different lines should create separate violations."""
        code = '''
q1 = f"SELECT * FROM a WHERE id = {x}"
q2 = f"SELECT * FROM b WHERE id = {y}"
'''
        violations = self.checker.check(code)
        sec001 = [v for v in violations if v.rule_id == "SEC-001"]
        self.assertEqual(len(sec001), 2)


class TestSeverityLevels(unittest.TestCase):
    """Test that violations have correct severity."""

    def setUp(self):
        self.checker = RuleChecker()

    def test_sql_injection_is_high(self):
        code = 'query = f"SELECT * FROM users WHERE id = {uid}"'
        violations = self.checker.check(code)
        sql_v = [v for v in violations if v.rule_id == "SEC-001"]
        self.assertTrue(all(v.severity == "high" for v in sql_v))

    def test_hardcoded_secret_is_high(self):
        code = 'API_KEY = "sk-1234567890abcdef1234567890abcdef"'
        violations = self.checker.check(code)
        sec_v = [v for v in violations if v.rule_id == "SEC-003"]
        self.assertTrue(all(v.severity == "high" for v in sec_v))

    def test_eval_is_high(self):
        code = 'eval(user_input)'
        violations = self.checker.check(code)
        eval_v = [v for v in violations if v.rule_id == "SEC-004"]
        self.assertTrue(all(v.severity == "high" for v in eval_v))


if __name__ == "__main__":
    unittest.main()
