"""Violation message renderer for Live AI Guardrails (#1439).

Renders clear, actionable violation messages with unicode box formatting,
rule references, and suggested fixes.
"""
from typing import List

from rule_checker import Violation


# Severity display
_SEVERITY_ICONS = {
    "high": "\u2718",     # ✘
    "medium": "\u26a0",   # ⚠
    "low": "\u2139",      # ℹ
}


class ViolationRenderer:
    """Renders violation messages for terminal and hook output."""

    def render(self, violations: List[Violation]) -> str:
        """Render violations as a formatted unicode box message.

        Args:
            violations: List of Violation objects.

        Returns:
            Formatted string with box-drawing characters, or empty string.
        """
        if not violations:
            return ""

        count = len(violations)
        header = f" CodingBuddy Guardrail \u2502 {count} violation(s) found "
        width = max(len(header) + 4, 60)

        lines: list[str] = []
        lines.append("\u250c" + "\u2500" * (width - 2) + "\u2510")
        lines.append("\u2502" + header.center(width - 2) + "\u2502")
        lines.append("\u251c" + "\u2500" * (width - 2) + "\u2524")

        for i, v in enumerate(violations):
            icon = _SEVERITY_ICONS.get(v.severity, "?")
            lines.append(
                "\u2502"
                + f"  {icon} [{v.severity.upper()}] {v.rule_id}: {v.message}".ljust(width - 2)
                + "\u2502"
            )
            # Truncate long line content
            content = v.line_content
            if len(content) > width - 12:
                content = content[: width - 15] + "..."
            lines.append(
                "\u2502"
                + f"    \u2514\u2500 {content}".ljust(width - 2)
                + "\u2502"
            )
            lines.append(
                "\u2502"
                + f"    \u21b3 Fix: {v.suggested_fix}".ljust(width - 2)
                + "\u2502"
            )
            if i < count - 1:
                lines.append(
                    "\u2502" + " " * (width - 2) + "\u2502"
                )

        lines.append("\u2514" + "\u2500" * (width - 2) + "\u2518")
        return "\n".join(lines)

    def render_for_hook(self, violations: List[Violation]) -> str:
        """Render violations as concise additionalContext for PreToolUse hook.

        Args:
            violations: List of Violation objects.

        Returns:
            Compact string for hook additionalContext, or empty string.
        """
        if not violations:
            return ""

        parts: list[str] = []
        parts.append(
            f"[CodingBuddy Guardrail] {len(violations)} violation(s) detected:"
        )
        for v in violations:
            parts.append(
                f"  - {v.rule_id} ({v.severity.upper()}): {v.message}. "
                f"Fix: {v.suggested_fix}"
            )
        return "\n".join(parts)
