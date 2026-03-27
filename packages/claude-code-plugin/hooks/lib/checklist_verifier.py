"""Pre-commit checklist verifier — maps changed files to quality checklists.

Analyzes staged files and auto-selects relevant checklist domains:
- auth/, login, password, token, session, oauth, jwt → security
- .css, .scss, .tsx + ARIA content → accessibility
- api/, controllers/, endpoints/, routes/ → performance

Shows top 3-5 items as a non-blocking warning.
See: https://github.com/JeremyDev87/codingbuddy/issues/1001
"""
import os
import re
from typing import Dict, List, Optional

# Test file patterns to exclude from domain detection
_TEST_FILE_RE = re.compile(r"\.(spec|test)\.")

# --- Domain detection rules ---

_SECURITY_PATH_PATTERNS = [
    re.compile(r"(?:^|/)auth/", re.IGNORECASE),
    re.compile(r"(?:^|/)login", re.IGNORECASE),
    re.compile(r"(?:^|/)password", re.IGNORECASE),
    re.compile(r"(?:^|/)token", re.IGNORECASE),
    re.compile(r"(?:^|/)session", re.IGNORECASE),
    re.compile(r"(?:^|/)oauth", re.IGNORECASE),
    re.compile(r"(?:^|/)jwt", re.IGNORECASE),
]

_ACCESSIBILITY_EXTENSIONS = {".css", ".scss"}

_PERFORMANCE_PATH_PATTERNS = [
    re.compile(r"(?:^|/)api/", re.IGNORECASE),
    re.compile(r"(?:^|/)controllers?/", re.IGNORECASE),
    re.compile(r"(?:^|/)endpoints?/", re.IGNORECASE),
    re.compile(r"(?:^|/)routes?/", re.IGNORECASE),
    re.compile(r"\.controller\.", re.IGNORECASE),
]

# --- Checklist items per domain (top 3-5 high-impact items) ---

_CHECKLIST_ITEMS: Dict[str, List[str]] = {
    "security": [
        "Validate and sanitize all user inputs",
        "Ensure authentication tokens are not exposed in logs",
        "Check for proper authorization on protected routes",
        "Verify secrets are not hardcoded in source code",
        "Review for injection vulnerabilities (SQL, XSS, command)",
    ],
    "accessibility": [
        "Ensure all interactive elements have accessible labels (aria-label/aria-labelledby)",
        "Verify color contrast meets WCAG 2.1 AA (4.5:1 for text)",
        "Check keyboard navigation works for all interactive elements",
        "Ensure focus indicators are visible and not removed",
    ],
    "performance": [
        "Check for N+1 query patterns in data fetching",
        "Verify proper pagination for list endpoints",
        "Ensure appropriate caching headers are set",
        "Review payload size — avoid returning unnecessary fields",
    ],
}


class ChecklistVerifier:
    """Maps changed files to relevant quality checklist domains."""

    def detect_domains(
        self,
        changed_files: List[str],
        file_contents: Optional[Dict[str, str]] = None,
    ) -> List[str]:
        """Detect relevant checklist domains from changed file paths.

        Args:
            changed_files: List of changed file paths.
            file_contents: Optional map of filepath → content for content-based
                detection (e.g., ARIA attributes in .tsx files).

        Returns:
            Deduplicated list of domain names.
        """
        if not changed_files:
            return []

        domains: set = set()
        file_contents = file_contents or {}

        for filepath in changed_files:
            # Skip test files
            if _TEST_FILE_RE.search(filepath):
                continue

            ext = os.path.splitext(filepath)[1].lower()

            # Security domain
            for pattern in _SECURITY_PATH_PATTERNS:
                if pattern.search(filepath):
                    domains.add("security")
                    break

            # Accessibility domain
            if ext in _ACCESSIBILITY_EXTENSIONS:
                domains.add("accessibility")
            elif ext == ".tsx":
                content = file_contents.get(filepath, "")
                if content and re.search(r"aria-", content):
                    domains.add("accessibility")

            # Performance domain
            for pattern in _PERFORMANCE_PATH_PATTERNS:
                if pattern.search(filepath):
                    domains.add("performance")
                    break

        return sorted(domains)

    def get_checklist_items(self, domain: str) -> List[str]:
        """Return checklist items for a given domain.

        Args:
            domain: One of 'security', 'accessibility', 'performance'.

        Returns:
            List of checklist item strings, empty for unknown domains.
        """
        return list(_CHECKLIST_ITEMS.get(domain, []))

    def format_warning(self, domain_items: Dict[str, List[str]]) -> str:
        """Format checklist items as a non-blocking warning message.

        Args:
            domain_items: Map of domain → checklist items.

        Returns:
            Formatted warning string, empty if no items.
        """
        if not domain_items:
            return ""

        lines = ["[CodingBuddy Checklist] Pre-commit review (non-blocking):"]
        for domain, items in domain_items.items():
            lines.append(f"  [{domain.upper()}]")
            for item in items:
                lines.append(f"    - {item}")
        return "\n".join(lines)

    def verify(
        self,
        changed_files: List[str],
        file_contents: Optional[Dict[str, str]] = None,
    ) -> Optional[str]:
        """Full verification flow: detect domains → get items → format warning.

        Args:
            changed_files: List of staged file paths.
            file_contents: Optional file content map for content-based checks.

        Returns:
            Warning string or None if no relevant checklists.
        """
        if not changed_files:
            return None

        domains = self.detect_domains(changed_files, file_contents)
        if not domains:
            return None

        domain_items: Dict[str, List[str]] = {}
        for domain in domains:
            items = self.get_checklist_items(domain)
            if items:
                domain_items[domain] = items

        if not domain_items:
            return None

        return self.format_warning(domain_items)
