"""Generate rule suggestions from detected error patterns."""
import datetime
import logging

logger = logging.getLogger(__name__)

# Map tool names to actionable guidance templates
_ACTION_TEMPLATES = {
    "Bash": "Consider verifying the command or its prerequisites before running `{input_summary}`.",
    "Read": "Ensure the file `{input_summary}` exists and is accessible before reading.",
    "Write": "Check that the target path for `{input_summary}` is valid and writable before writing.",
    "Edit": "Verify the target content exists in the file before attempting to edit `{input_summary}`.",
}

_DEFAULT_ACTION = "Consider adding a pre-check or guard to avoid repeated failures with `{input_summary}`."


class RuleSuggester:
    """Generates draft rules in .ai-rules markdown format from detected patterns."""

    def suggest_rules(self, patterns: list) -> list:
        """Generate rule suggestions from detected patterns.

        Args:
            patterns: List of pattern dicts from PatternDetector.detect_patterns().

        Returns:
            List of suggestion dicts with keys: title, description, rule_content, pattern.
        """
        if not patterns:
            return []

        suggestions = []
        for pattern in patterns:
            tool_name = pattern["tool_name"]
            input_summary = pattern.get("input_summary") or "unknown"
            failure_count = pattern["failure_count"]
            session_count = pattern["session_count"]

            title = f"Repeated {tool_name} failure: {input_summary}"
            description = (
                f"The `{tool_name}` tool failed {failure_count} times "
                f"across {session_count} sessions with input `{input_summary}`."
            )

            rule_content = self._generate_rule_content(
                tool_name=tool_name,
                input_summary=input_summary,
                failure_count=failure_count,
                session_count=session_count,
            )

            suggestions.append(
                {
                    "title": title,
                    "description": description,
                    "rule_content": rule_content,
                    "pattern": pattern,
                }
            )

        return suggestions

    def _generate_rule_content(
        self,
        tool_name: str,
        input_summary: str,
        failure_count: int,
        session_count: int,
    ) -> str:
        """Generate markdown rule content for a single pattern."""
        template = _ACTION_TEMPLATES.get(tool_name, _DEFAULT_ACTION)
        action = template.format(input_summary=input_summary)
        now = datetime.datetime.utcnow().strftime("%Y-%m-%d")

        return (
            f"# Repeated {tool_name} failure: {input_summary}\n"
            f"\n"
            f"> Auto-detected rule — {now}\n"
            f"\n"
            f"## Context\n"
            f"\n"
            f"The `{tool_name}` tool with input `{input_summary}` has failed "
            f"{failure_count} times across {session_count} sessions.\n"
            f"\n"
            f"## Guideline\n"
            f"\n"
            f"{action}\n"
        )
