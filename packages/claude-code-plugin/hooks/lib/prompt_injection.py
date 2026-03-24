"""System prompt injection module for CodingBuddy plugin (#828).

Injects codingbuddy rules into Claude's context at SessionStart.
Each section is toggleable via config. Hard 2000-char limit with truncation.
Sources only trusted local content (never external URLs).
"""
from typing import Any, Dict

CHAR_LIMIT = 2000

# --- Section builders (each returns a string or empty) ---

_BASE_RULES = (
    "[CodingBuddy] When user message starts with PLAN/ACT/EVAL/AUTO, "
    "you MUST call parse_mode FIRST before any other action. "
    "Follow TDD cycle: RED (failing test) -> GREEN (minimal code) -> REFACTOR."
)

_DISPATCH_ENFORCEMENT = (
    "[CodingBuddy] When parse_mode returns dispatch=\"auto\", "
    "you MUST dispatch ALL recommended specialist agents. "
    "Skipping any specialist is a protocol violation."
)

_QUALITY_GATES = (
    "[CodingBuddy] Before committing: ensure all lint checks pass, "
    "all tests pass, and changes are self-reviewed."
)


class PromptInjector:
    """Builds a system prompt string from config-driven sections."""

    def build_system_prompt(self, config: Dict[str, Any], cwd: str) -> str:
        """Build system prompt from config.

        Args:
            config: Parsed codingbuddy.config.json dict.
            cwd: Current working directory (reserved for future use).

        Returns:
            Prompt string (<= 2000 chars), or empty string when disabled.
        """
        pi_config = config.get("promptInjection")
        if not pi_config or not isinstance(pi_config, dict):
            return ""

        if not pi_config.get("enabled", False):
            return ""

        sections_cfg = pi_config.get("sections", {})
        if not isinstance(sections_cfg, dict):
            sections_cfg = {}

        parts: list[str] = []

        if sections_cfg.get("baseRules", True):
            parts.append(_BASE_RULES)

        if sections_cfg.get("dispatchEnforcement", True):
            parts.append(_DISPATCH_ENFORCEMENT)

        if sections_cfg.get("qualityGates", True):
            parts.append(_QUALITY_GATES)

        if not parts:
            return ""

        prompt = "\n".join(parts)

        # Hard limit with truncation
        if len(prompt) > CHAR_LIMIT:
            prompt = prompt[: CHAR_LIMIT - 3] + "..."

        return prompt
