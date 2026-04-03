"""
Self-contained Mode Engine for CodingBuddy plugin.

Provides PLAN/ACT/EVAL/AUTO mode instructions without requiring MCP server.
Reads .ai-rules/ files directly and outputs complete mode instructions.
"""

import os
from typing import Optional


# Default agents per mode
DEFAULT_AGENTS = {
    "PLAN": {"name": "technical-planner", "title": "Technical Planner"},
    "ACT": {"name": "software-engineer", "title": "Software Engineer"},
    "EVAL": {"name": "code-reviewer", "title": "Code Reviewer"},
    "AUTO": {"name": "auto-mode-agent", "title": "Auto Mode Agent"},
}

# Mode instruction templates (compact, within ~2000 char hook limit)
MODE_TEMPLATES = {
    "PLAN": """# Mode: PLAN
## Agent: {agent_name}

You are in PLAN mode. Design the implementation approach.

Rules:
- Define test cases first (TDD perspective)
- Review architecture before implementation
- Output full plan in every response
- Do NOT auto-proceed to ACT — wait for user
- Consider alternatives for non-trivial decisions

Checklist:
- [ ] Problem decomposed into sub-problems
- [ ] File paths identified
- [ ] TDD strategy defined
- [ ] Alternatives considered""",
    "ACT": """# Mode: ACT
## Agent: {agent_name}

You are in ACT mode. Execute the plan.

Rules:
- Red -> Green -> Refactor cycle
- Implement minimally first
- Run tests after each change
- Proceed autonomously until blocked
- Only stop for errors or blockers""",
    "EVAL": """# Mode: EVAL
## Agent: {agent_name}

You are in EVAL mode. Review and improve.

Rules:
- Check code quality (SOLID, DRY, complexity)
- Verify test coverage
- Security scan (OWASP top 10)
- Performance review
- Propose concrete improvements""",
    "AUTO": """# Mode: AUTO
Autonomous PLAN -> ACT -> EVAL cycle.
Continue until: Critical=0, High=0.
Report progress at each cycle iteration.""",
}


def _resolve_rules_dir(cwd: Optional[str] = None) -> Optional[str]:
    """
    Resolve path to .ai-rules/ directory.

    Resolution order:
    1. CODINGBUDDY_RULES_DIR env var
    2. Project local: {cwd}/.ai-rules/
    3. Plugin bundled: {plugin_root}/../rules/.ai-rules/ (dev mode)
    4. Installed package: find via codingbuddy-rules npm

    Returns:
        Path to .ai-rules/ directory, or None if not found.
    """
    # 1. Environment variable
    env_dir = os.environ.get("CODINGBUDDY_RULES_DIR")
    if env_dir and os.path.isdir(env_dir):
        return env_dir

    # 2. Project local
    working_dir = cwd or os.getcwd()
    local_dir = os.path.join(working_dir, ".ai-rules")
    if os.path.isdir(local_dir):
        return local_dir

    # 3. Plugin bundled (dev mode)
    plugin_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    bundled_dir = os.path.join(plugin_root, "..", "rules", ".ai-rules")
    bundled_dir = os.path.normpath(bundled_dir)
    if os.path.isdir(bundled_dir):
        return bundled_dir

    return None


class ModeEngine:
    """Self-contained mode engine that works without MCP server."""

    def __init__(self, rules_dir: Optional[str] = None, cwd: Optional[str] = None):
        """
        Initialize with path to .ai-rules/ directory.

        Args:
            rules_dir: Explicit path to .ai-rules/ directory.
                       If None, auto-resolved via _resolve_rules_dir.
            cwd: Working directory for resolution. Defaults to os.getcwd().
        """
        self.rules_dir = rules_dir or _resolve_rules_dir(cwd)

    def load_mode_rules(self, mode: str) -> Optional[str]:
        """
        Read core.md and extract mode-specific section.

        Args:
            mode: Mode name (PLAN, ACT, EVAL, AUTO)

        Returns:
            Extracted mode rules text, or None if not found.
        """
        if not self.rules_dir:
            return None

        core_path = os.path.join(self.rules_dir, "rules", "core.md")
        if not os.path.isfile(core_path):
            return None

        try:
            with open(core_path, "r", encoding="utf-8") as f:
                return f.read()
        except OSError:
            return None

    def get_default_agent(self, mode: str) -> dict:
        """
        Return default agent for the given mode.

        Args:
            mode: Mode name (PLAN, ACT, EVAL, AUTO)

        Returns:
            Dict with 'name' and 'title' keys.
        """
        mode_upper = mode.upper()
        return DEFAULT_AGENTS.get(mode_upper, DEFAULT_AGENTS["ACT"])

    def build_instructions(self, mode: str) -> str:
        """
        Build complete mode instructions for hook output.

        Output is kept within ~2000 char limit for UserPromptSubmit hooks.
        Falls back to minimal template if .ai-rules/ is not found.

        Args:
            mode: Mode name (PLAN, ACT, EVAL, AUTO)

        Returns:
            Complete mode instructions string.
        """
        mode_upper = mode.upper()
        agent = self.get_default_agent(mode_upper)
        template = MODE_TEMPLATES.get(mode_upper, MODE_TEMPLATES["ACT"])

        instructions = template.format(agent_name=agent["name"])

        # Add MCP enhancement hint
        mcp_hint = (
            "\n\nIf mcp__codingbuddy__parse_mode is available, "
            "call it for enhanced features (checklists, specialist agents, context tracking)."
        )

        return instructions + mcp_hint
