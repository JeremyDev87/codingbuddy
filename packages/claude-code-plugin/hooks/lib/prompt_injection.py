"""System prompt injection module for CodingBuddy plugin (#828).

Injects codingbuddy rules into Claude's context at SessionStart.
Each section is toggleable via config. Hard 2000-char limit with truncation.
Sources only trusted local content (never external URLs).
"""
from typing import Any, Dict

from runtime_mode import is_mcp_available

CHAR_LIMIT = 2000

# --- Section builders (each returns a string or empty) ---

_BASE_RULES = (
    "[CodingBuddy] When user message starts with PLAN/ACT/EVAL/AUTO, "
    "you MUST call parse_mode FIRST before any other action. "
    "Follow TDD cycle: RED (failing test) -> GREEN (minimal code) -> REFACTOR."
)

_BASE_RULES_STANDALONE = (
    "[CodingBuddy] When user message starts with PLAN/ACT/EVAL/AUTO, "
    "follow the mode instructions provided by the mode detection hook. "
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

# --- Format guide templates (eco=true compact / eco=false full) ---

_FORMAT_GUIDE_ECO_COMPACT = (
    "[CodingBuddy Format Guide] "
    "Use each agent's visual character (eye + colorAnsi from agent JSON) "
    "to show collaboration compactly. "
    "Format — {tone_instruction}\n"
    "# Mode: {{MODE}}\n"
    "## {{colorEmoji}} {{eye}}_{{eye}} {{Agent Name}}\n"
    "\n"
    "━━ Agents: {{colorEmoji}} {{Name}}, {{colorEmoji}} {{Name}}, ...\n"
    "━━ Consensus: {{one-line summary of agreed approach}}"
)

_FORMAT_GUIDE_ECO_FULL = (
    "[CodingBuddy Format Guide] "
    "Use each agent's visual character (eye + colorAnsi from agent JSON) "
    "to show full discussion process. "
    "Format — {tone_instruction}\n"
    "{{colorEmoji}} {{eye}}_{{eye}} {{Agent Name}}\n"
    "│ \"{{agent's opinion or recommendation}}\"\n"
    "│\n"
    "{{colorEmoji}} {{eye}}_{{eye}} {{Another Agent}}\n"
    "│ \"{{response, critique, or agreement}}\"\n"
    "│\n"
    "(show full discussion dialogue between agents)"
)

_TONE_CASUAL = "Use a casual, friendly tone."
_TONE_FORMAL = "Use a formal, professional tone."


def _build_format_guide(config: Dict[str, Any]) -> str:
    """Build format guide section based on eco and tone settings.

    Args:
        config: Full codingbuddy config dict.

    Returns:
        Format guide string, or empty string if not applicable.
    """
    eco = config.get("eco", True)
    tone = config.get("tone", "casual")
    tone_instruction = _TONE_FORMAL if tone == "formal" else _TONE_CASUAL

    if eco:
        return _FORMAT_GUIDE_ECO_COMPACT.format(tone_instruction=tone_instruction)
    else:
        return _FORMAT_GUIDE_ECO_FULL.format(tone_instruction=tone_instruction)


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

        mcp_mode = is_mcp_available()

        parts: list[str] = []

        if sections_cfg.get("baseRules", True):
            parts.append(_BASE_RULES if mcp_mode else _BASE_RULES_STANDALONE)

        if mcp_mode and sections_cfg.get("dispatchEnforcement", True):
            parts.append(_DISPATCH_ENFORCEMENT)

        if sections_cfg.get("qualityGates", True):
            parts.append(_QUALITY_GATES)

        if sections_cfg.get("formatGuide", False):
            guide = _build_format_guide(config)
            if guide:
                parts.append(guide)

        if not parts:
            return ""

        prompt = "\n".join(parts)

        # Hard limit with truncation
        if len(prompt) > CHAR_LIMIT:
            prompt = prompt[: CHAR_LIMIT - 3] + "..."

        return prompt
