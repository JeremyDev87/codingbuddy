"""Live AI Guardrails — real-time rule violation detection (#1439).

Intercepts Edit/Write tool calls and checks content against known
security violation patterns (SQL injection, XSS, hardcoded secrets, etc.).
Configurable via CODINGBUDDY_GUARDRAIL_LEVEL env var: strict/normal/off.
"""
import os
import re
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class Violation:
    """A single rule violation found in code content."""

    rule_id: str
    severity: str
    message: str
    line_content: str
    suggested_fix: str


# --- Comment detection ---

_COMMENT_RE = re.compile(r"^\s*(?:#|//|/\*|\*|<!--)")

_VALID_LEVELS = {"strict", "normal", "off"}


def _is_comment(line: str) -> bool:
    """Check if a line is a comment."""
    return bool(_COMMENT_RE.match(line))


# --- Placeholder / false-positive filters for secrets ---

_PLACEHOLDER_RE = re.compile(
    r"(?:your[-_]|example|placeholder|changeme|xxx|test|dummy|fake|sample|TODO)",
    re.IGNORECASE,
)

_ENV_REF_RE = re.compile(
    r"(?:os\.environ|process\.env|getenv|ENV\[|config\.|settings\.)",
    re.IGNORECASE,
)


# --- Pattern definitions ---
# Each pattern: (compiled_regex, rule_id, severity, message, suggested_fix)
# Patterns are applied per-line after filtering out comments.

_SQL_KEYWORDS = r"(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|MERGE|REPLACE)\b"

# SQL injection: f-string, %-format, or concatenation with SQL keywords
_SQL_FSTRING_RE = re.compile(
    rf'f["\'].*{_SQL_KEYWORDS}.*\{{',
    re.IGNORECASE,
)
_SQL_PERCENT_RE = re.compile(
    rf'["\'].*{_SQL_KEYWORDS}.*%\s*(?:s|d|r)["\'].*%\s*\w',
    re.IGNORECASE,
)
_SQL_CONCAT_RE = re.compile(
    rf'["\'].*{_SQL_KEYWORDS}.*["\']\s*\+\s*\w',
    re.IGNORECASE,
)

_NORMAL_PATTERNS = [
    # SEC-001: SQL Injection
    (
        _SQL_FSTRING_RE,
        "SEC-001",
        "high",
        "SQL injection detected — dynamic SQL via string interpolation",
        "Use parameterized queries (e.g., cursor.execute('SELECT ... WHERE id = ?', (id,)))",
    ),
    (
        _SQL_PERCENT_RE,
        "SEC-001",
        "high",
        "SQL injection detected — dynamic SQL via %-formatting",
        "Use parameterized queries instead of string formatting",
    ),
    (
        _SQL_CONCAT_RE,
        "SEC-001",
        "high",
        "SQL injection detected — dynamic SQL via string concatenation",
        "Use parameterized queries instead of string concatenation",
    ),
    # SEC-002: XSS
    (
        re.compile(r"\.\s*innerHTML\s*=", re.IGNORECASE),
        "SEC-002",
        "high",
        "XSS risk — direct innerHTML assignment",
        "Use textContent for plain text, or sanitize with DOMPurify before assigning innerHTML",
    ),
    (
        re.compile(r"document\.write\s*\("),
        "SEC-002",
        "high",
        "XSS risk — document.write with potentially unsafe content",
        "Use DOM APIs (createElement/textContent) instead of document.write",
    ),
    (
        re.compile(r"dangerouslySetInnerHTML"),
        "SEC-002",
        "high",
        "XSS risk — dangerouslySetInnerHTML bypasses React's XSS protection",
        "Sanitize content with DOMPurify before using dangerouslySetInnerHTML",
    ),
    # SEC-004: Dangerous eval/exec
    (
        re.compile(r"\beval\s*\("),
        "SEC-004",
        "high",
        "Dangerous eval() call — arbitrary code execution risk",
        "Avoid eval(). Use JSON.parse() for data, or ast.literal_eval() for Python literals",
    ),
    (
        re.compile(r"\bexec\s*\("),
        "SEC-004",
        "high",
        "Dangerous exec() call — arbitrary code execution risk",
        "Avoid exec(). Use safer alternatives like importlib or specific parsers",
    ),
]

# SEC-003: Hardcoded secrets — handled separately with extra false-positive filtering
_SECRET_KEY_RE = re.compile(
    r"""(?:api[_-]?key|secret(?:[_-]?key)?|password|passwd|token|auth[_-]?token|private[_-]?key|access[_-]?key)"""
    r"""\s*=\s*["']([^"']{8,})["']""",
    re.IGNORECASE,
)

# AWS access key pattern
_AWS_KEY_RE = re.compile(
    r"""(?:aws[_-]?access[_-]?key(?:[_-]?id)?|aws[_-]?secret)\s*=\s*["']([A-Za-z0-9/+=]{16,})["']""",
    re.IGNORECASE,
)

# Generic variable names containing "secret" but not caught above
_GENERIC_SECRET_RE = re.compile(
    r"""(?:secret|credential|private_key)\s*=\s*["']([^"']{8,})["']""",
    re.IGNORECASE,
)

# Strict-only patterns
_STRICT_PATTERNS = [
    # SEC-005: Shell injection
    (
        re.compile(r"subprocess\.\w+\(.*shell\s*=\s*True", re.DOTALL),
        "SEC-005",
        "medium",
        "Shell injection risk — subprocess with shell=True",
        "Use subprocess.run(cmd_list) without shell=True, passing args as a list",
    ),
    (
        re.compile(r"os\.system\s*\("),
        "SEC-005",
        "medium",
        "Shell injection risk — os.system allows arbitrary command execution",
        "Use subprocess.run(cmd_list) instead of os.system()",
    ),
]


class RuleChecker:
    """Checks code content against known security violation patterns."""

    def __init__(self) -> None:
        raw = os.environ.get("CODINGBUDDY_GUARDRAIL_LEVEL", "normal").lower()
        self.level: str = raw if raw in _VALID_LEVELS else "normal"

    def check(self, content: str) -> List[Violation]:
        """Check code content for violations.

        Args:
            content: Code content string (possibly multiline).

        Returns:
            List of Violation objects found. Empty if level is 'off'.
        """
        if self.level == "off":
            return []

        violations: List[Violation] = []
        lines = content.split("\n")

        for line in lines:
            stripped = line.strip()
            if not stripped or _is_comment(stripped):
                continue

            # Normal patterns (always active)
            for regex, rule_id, severity, message, fix in _NORMAL_PATTERNS:
                if regex.search(stripped):
                    violations.append(
                        Violation(rule_id, severity, message, stripped, fix)
                    )

            # SEC-003: Hardcoded secrets (special handling)
            self._check_secrets(stripped, violations)

            # Strict-only patterns
            if self.level == "strict":
                for regex, rule_id, severity, message, fix in _STRICT_PATTERNS:
                    if regex.search(stripped):
                        violations.append(
                            Violation(rule_id, severity, message, stripped, fix)
                        )

        return violations

    def _check_secrets(self, line: str, violations: List[Violation]) -> None:
        """Check a line for hardcoded secrets with false-positive filtering."""
        # Skip if line references env vars
        if _ENV_REF_RE.search(line):
            return

        # AWS access key IDs (AKIA prefix) — always flag, skip placeholder filter
        aws_match = _AWS_KEY_RE.search(line)
        if aws_match:
            value = aws_match.group(1)
            if len(value) >= 16:
                violations.append(
                    Violation(
                        rule_id="SEC-003",
                        severity="high",
                        message="Hardcoded AWS credential detected — must not be in source code",
                        line_content=line,
                        suggested_fix="Use environment variables (AWS_ACCESS_KEY_ID) or AWS credentials file",
                    )
                )
                return

        for regex in (_SECRET_KEY_RE, _GENERIC_SECRET_RE):
            match = regex.search(line)
            if match:
                value = match.group(1)
                # Skip empty, very short, or placeholder values
                if len(value) < 8:
                    continue
                if _PLACEHOLDER_RE.search(value):
                    continue
                violations.append(
                    Violation(
                        rule_id="SEC-003",
                        severity="high",
                        message="Hardcoded secret detected — credentials should not be in source code",
                        line_content=line,
                        suggested_fix="Use environment variables (os.environ / process.env) or a secrets manager",
                    )
                )
                return  # One match per line is enough

    def check_tool_input(
        self, tool_name: str, tool_input: dict
    ) -> List[Violation]:
        """Check a PreToolUse tool_input for violations.

        Only checks Edit and Write tool calls.

        Args:
            tool_name: Name of the tool being called.
            tool_input: The tool_input dict from the hook.

        Returns:
            List of violations found in the content.
        """
        if tool_name not in ("Edit", "Write"):
            return []

        content: Optional[str] = None
        if tool_name == "Edit":
            content = tool_input.get("new_string", "")
        elif tool_name == "Write":
            content = tool_input.get("content", "")

        if not content:
            return []

        return self.check(content)
