#!/usr/bin/env python3
"""
CodingBuddy Mode Detection Hook

Detects PLAN/ACT/EVAL/AUTO keywords at the start of user prompts
and injects context to trigger parse_mode MCP call.

Supported languages:
- English: PLAN, ACT, EVAL, AUTO
- Korean: 계획, 실행, 평가, 자동
- Japanese: 計画, 実行, 評価, 自動
- Chinese: 计划, 执行, 评估, 自动
- Spanish: PLANIFICAR, ACTUAR, EVALUAR, AUTOMÁTICO
"""

import json
import os
import sys
import re
from typing import Optional

# Pattern definitions (multilingual support)
MODE_PATTERNS = {
    "PLAN": r"^(PLAN|계획|計画|计划|PLANIFICAR)\s*[:\s]",
    "ACT": r"^(ACT|실행|実行|执行|ACTUAR)\s*[:\s]",
    "EVAL": r"^(EVAL|평가|評価|评估|EVALUAR)\s*[:\s]",
    "AUTO": r"^(AUTO|자동|自動|自动|AUTOMÁTICO)\s*[:\s]",
}

# Context template for mode detection output
CONTEXT_TEMPLATE = """<codingbuddy-mode-detected>
MODE_KEYWORD_DETECTED: {mode}
MANDATORY_ACTION: You MUST call mcp__codingbuddy__parse_mode with the user's prompt IMMEDIATELY.
DO NOT respond to the user before calling parse_mode.
DO NOT skip this step or rationalize why it's not needed.
This is a BLOCKING requirement from the CodingBuddy hook.
The parse_mode tool will provide mode-specific instructions, checklists, and agent recommendations.
</codingbuddy-mode-detected>"""


def detect_mode(prompt: str) -> Optional[str]:
    """
    Detect mode keyword at the start of the prompt.

    Args:
        prompt: User's input prompt

    Returns:
        Detected mode name (PLAN, ACT, EVAL, AUTO) or None
    """
    prompt_stripped = prompt.strip()
    for mode, pattern in MODE_PATTERNS.items():
        if re.match(pattern, prompt_stripped, re.IGNORECASE):
            return mode
    return None


def main():
    """Main entry point for the hook."""
    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)
        prompt = input_data.get("prompt", "")

        # Detect mode keyword
        detected_mode = detect_mode(prompt)

        if detected_mode:
            # Output mandatory context for Claude
            print(CONTEXT_TEMPLATE.format(mode=detected_mode))

            # Update HUD state with detected mode (#1090)
            try:
                _hooks_dir = os.path.dirname(os.path.abspath(__file__))
                _lib_dir = os.path.join(_hooks_dir, "lib")
                if _lib_dir not in sys.path:
                    sys.path.insert(0, _lib_dir)
                from hud_state import update_hud_state
                state_file = os.environ.get("CODINGBUDDY_HUD_STATE_FILE")
                if state_file:
                    update_hud_state(state_file=state_file, currentMode=detected_mode)
                else:
                    update_hud_state(currentMode=detected_mode)
            except Exception:
                pass

        # Exit successfully (exit code 0 = success, output added as context)
        sys.exit(0)

    except json.JSONDecodeError:
        # Invalid JSON input - silently ignore
        sys.exit(0)
    except Exception as e:
        # Log error to stderr but don't block
        print(f"CodingBuddy hook error: {e}", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
