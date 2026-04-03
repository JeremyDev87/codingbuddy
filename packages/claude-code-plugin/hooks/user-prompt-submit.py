#!/usr/bin/env python3
"""
CodingBuddy Mode Detection Hook (Self-Contained)

Detects PLAN/ACT/EVAL/AUTO keywords at the start of user prompts
and outputs complete mode instructions without requiring MCP server.

Falls back to built-in templates if .ai-rules/ is not found.
Optionally suggests parse_mode MCP call for enhanced features.

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
            # Ensure lib/ is importable
            _hooks_dir = os.path.dirname(os.path.abspath(__file__))
            _lib_dir = os.path.join(_hooks_dir, "lib")
            if _lib_dir not in sys.path:
                sys.path.insert(0, _lib_dir)

            try:
                from runtime_mode import is_mcp_available
                from mode_engine import ModeEngine

                if is_mcp_available(project_dir=os.getcwd()):
                    # MCP mode: minimal output, parse_mode handles the rest
                    print(f"# Mode: {detected_mode}")
                    print(
                        "If mcp__codingbuddy__parse_mode is available, "
                        "call it for enhanced features."
                    )
                else:
                    # Standalone mode: full enriched instructions
                    engine = ModeEngine()
                    instructions = engine.build_instructions(detected_mode)
                    print(instructions)
            except Exception:
                # Fallback: minimal instruction if imports fail
                print(f"# Mode: {detected_mode}")
                print(
                    "If mcp__codingbuddy__parse_mode is available, "
                    "call it for enhanced features."
                )

            # Update HUD state with detected mode (#1090)
            try:
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
