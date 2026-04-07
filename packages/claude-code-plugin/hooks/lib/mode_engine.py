"""
Self-contained Mode Engine for CodingBuddy plugin.

Provides PLAN/ACT/EVAL/AUTO mode instructions without requiring MCP server.
Reads .ai-rules/ files directly and outputs complete mode instructions.
"""

import json
import os
import re
from typing import Optional


# Hard limit for hook output
CHAR_LIMIT = 2000


# Council presets per eligible mode (mirrors MCP server CouncilPresetService)
COUNCIL_PRESETS = {
    "PLAN": {
        "primary": "technical-planner",
        "specialists": [
            "architecture-specialist",
            "test-strategy-specialist",
            "code-quality-specialist",
            "security-specialist",
        ],
    },
    "EVAL": {
        "primary": "code-reviewer",
        "specialists": [
            "security-specialist",
            "performance-specialist",
            "accessibility-specialist",
        ],
    },
    "AUTO": {
        "primary": "auto-mode",
        "specialists": [
            "architecture-specialist",
            "test-strategy-specialist",
            "security-specialist",
            "code-quality-specialist",
        ],
    },
}

# Mode-specific moderator opening lines (mirrors MCP server council-scene.builder)
MODERATOR_COPY = {
    "PLAN": "Council assembled — let us design this together.",
    "EVAL": "Review council convened — specialists are ready.",
    "AUTO": "Autonomous council activated — full cycle begins.",
}

# Default agents per mode
DEFAULT_AGENTS = {
    "PLAN": {"name": "technical-planner", "title": "Technical Planner"},
    "ACT": {"name": "software-engineer", "title": "Software Engineer"},
    "EVAL": {"name": "code-reviewer", "title": "Code Reviewer"},
    "AUTO": {"name": "auto-mode", "title": "Auto Mode Agent"},
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


# ---------------------------------------------------------------------------
# Standalone Clarification Gate (#1423)
# Mirrors MCP server clarification-gate.ts heuristics so standalone mode
# also asks before planning when the request is ambiguous.
# ---------------------------------------------------------------------------

MIN_PROMPT_LENGTH = 20

_OVERRIDE_PATTERNS = [
    re.compile(r"\bjust\s+do\s+it\b", re.I),
    re.compile(r"\buse\s+your\s+(?:judg(?:e)?ment|best\s+guess|discretion)\b", re.I),
    re.compile(r"\bgo\s+ahead\b", re.I),
    re.compile(r"\bmake\s+assumptions?\b", re.I),
    re.compile(r"\bassume\s+(?:whatever|defaults?|reasonable)\b", re.I),
    re.compile(r"알아서\s*(?:해|진행|처리)"),
    re.compile(r"그냥\s*(?:해|진행)"),
    re.compile(r"임의로\s*(?:해|진행)"),
]

_VAGUE_INTENT_PATTERNS = [
    re.compile(r"\bimprove\b", re.I),
    re.compile(r"\b(?:make\s+it\s+)?better\b", re.I),
    re.compile(r"\benhance\b", re.I),
    re.compile(r"\boptimi[sz]e\b", re.I),
    re.compile(r"\brefactor\b", re.I),
    re.compile(r"\bclean\s*up\b", re.I),
    re.compile(r"\btweak\b", re.I),
    re.compile(r"\bfix\s+(?:stuff|things|issues?)\b", re.I),
    re.compile(r"개선"),
    re.compile(r"향상"),
    re.compile(r"최적화"),
    re.compile(r"정리"),
    re.compile(r"개량"),
]

_TECH_REFERENCE_PATTERNS = [
    re.compile(
        r"\.(?:ts|tsx|js|jsx|py|go|rs|java|kt|swift|rb|php|c|cpp|cs|md"
        r"|json|ya?ml|toml|sql|sh)\b",
        re.I,
    ),
    re.compile(r"(?:^|[\s([`\"'])[\w.-]+/[\w.\-/]+"),
    re.compile(r"\b[a-zA-Z_][\w]*\("),
    re.compile(r"\b[A-Z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]+\b"),
    re.compile(r"\b[a-z][a-z0-9]+[A-Z][a-zA-Z0-9]+\b"),
    re.compile(r"\b[a-z]+_[a-z][a-z0-9_]*\b"),
    re.compile(r"`[^`]+`"),
]

_MODE_KEYWORD_RE = re.compile(
    r"^(PLAN|ACT|EVAL|AUTO|계획|실행|평가|자동|計画|実行|評価|自動"
    r"|计划|执行|评估|自动|PLANIFICAR|ACTUAR|EVALUAR|AUTOMÁTICO)\s*[:\s]*",
    re.I,
)


def evaluate_clarification_standalone(prompt: str) -> Optional[str]:
    """
    Standalone clarification gate (#1423).

    Returns a clarification-first directive string when the prompt is
    ambiguous, or ``None`` when the request is clear enough to plan.
    """
    trimmed = prompt.strip()
    if not trimmed:
        return None

    # Strip mode keyword prefix before evaluating content
    stripped = _MODE_KEYWORD_RE.sub("", trimmed).strip()
    if not stripped:
        return None

    if any(p.search(stripped) for p in _OVERRIDE_PATTERNS):
        return None

    if any(p.search(stripped) for p in _TECH_REFERENCE_PATTERNS):
        return None

    is_vague = any(p.search(stripped) for p in _VAGUE_INTENT_PATTERNS)
    is_short = 0 < len(stripped) < MIN_PROMPT_LENGTH

    if not is_vague and not is_short:
        return None

    if is_vague:
        question = (
            "What concrete change are you targeting — "
            "which behavior, file, or metric should differ after this task?"
        )
    else:
        question = (
            "Can you describe the goal, inputs, and expected outcome "
            "in a bit more detail?"
        )

    return (
        "🔴 CLARIFICATION REQUIRED — DO NOT PLAN.\n\n"
        "The request is ambiguous. You MUST:\n"
        "1. Ask EXACTLY the question below and STOP.\n"
        "2. Do NOT output any implementation plan, architecture, or code.\n"
        "3. Wait for the user's response before continuing.\n\n"
        f'❓ Ask this: "{question}"\n\n'
        "After the user answers, re-invoke the mode with the clarified prompt."
    )


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

        Finds the ``### {Mode} Mode`` header and collects lines until
        hitting another ``### `` header whose name does not contain the
        mode keyword (case-insensitive).

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
                content = f.read()
        except OSError:
            return None

        mode_upper = mode.upper()
        mode_headers = {
            "PLAN": "### Plan Mode",
            "ACT": "### Act Mode",
            "EVAL": "### Eval Mode",
            "AUTO": "### Auto Mode",
        }

        header = mode_headers.get(mode_upper)
        if not header:
            return None

        start = content.find(header)
        if start == -1:
            return None

        # Collect from header until the next ### header unrelated to this mode
        after_header = start + len(header)
        mode_word = mode_upper.lower()
        lines = content[after_header:].split("\n")
        collected: list[str] = [header]
        for line in lines:
            if re.match(r"^### ", line) and mode_word not in line.lower():
                break
            collected.append(line)

        return "\n".join(collected).strip() or None

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

    def _load_agent_details(self, agent_name: str) -> Optional[dict]:
        """
        Load agent profile from ``.ai-rules/agents/{agent_name}.json``.

        Args:
            agent_name: Agent file stem (e.g. ``technical-planner``).

        Returns:
            Dict with ``name``, ``description``, ``expertise`` keys,
            or None if the file is missing / unreadable.
        """
        if not self.rules_dir:
            return None

        agent_path = os.path.join(self.rules_dir, "agents", f"{agent_name}.json")
        if not os.path.isfile(agent_path):
            return None

        try:
            with open(agent_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return {
                "name": data.get("name", agent_name),
                "description": data.get("description", ""),
                "expertise": data.get("role", {}).get("expertise", []),
            }
        except (OSError, json.JSONDecodeError, ValueError):
            return None

    def build_council_scene(self, mode: str) -> Optional[dict]:
        """
        Build council scene contract for eligible modes.

        Mirrors the MCP server's ``buildCouncilScene`` output so that
        standalone mode produces an equivalent first-response contract.

        Args:
            mode: Mode name (PLAN, ACT, EVAL, AUTO)

        Returns:
            Dict matching the councilScene JSON schema, or None for ACT mode.
        """
        mode_upper = mode.upper()
        if mode_upper == "ACT":
            return None

        preset = COUNCIL_PRESETS.get(mode_upper)
        moderator = MODERATOR_COPY.get(mode_upper)
        if not preset or not moderator:
            return None

        cast = [
            {"name": preset["primary"], "role": "primary", "face": "●‿●"}
        ]
        for specialist in preset["specialists"]:
            cast.append(
                {"name": specialist, "role": "specialist", "face": "●‿●"}
            )

        return {
            "enabled": True,
            "cast": cast,
            "moderatorCopy": moderator,
            "format": "tiny-actor-grid",
        }

    def build_instructions(self, mode: str, prompt: Optional[str] = None) -> str:
        """
        Build complete mode instructions for hook output.

        Enriches the static template with actual ``.ai-rules/`` data when
        available and enforces the ``CHAR_LIMIT`` (2000) ceiling.  Falls
        back to the minimal template when ``.ai-rules/`` is absent.

        When *prompt* is provided for PLAN/AUTO modes the standalone
        Clarification Gate (#1423) is evaluated first.  If the request is
        ambiguous a clarification-first directive is returned instead of
        the normal planning instructions.

        Args:
            mode: Mode name (PLAN, ACT, EVAL, AUTO)
            prompt: Optional raw user prompt for clarification evaluation.

        Returns:
            Complete mode instructions string (≤ 2000 chars).
        """
        mode_upper = mode.upper()

        # Clarification gate for PLAN/AUTO modes (#1423)
        if prompt and mode_upper in ("PLAN", "AUTO"):
            directive = evaluate_clarification_standalone(prompt)
            if directive:
                return directive

        agent = self.get_default_agent(mode_upper)
        template = MODE_TEMPLATES.get(mode_upper, MODE_TEMPLATES["ACT"])

        instructions = template.format(agent_name=agent["name"])

        # Council scene contract for eligible modes (#1366)
        council = self.build_council_scene(mode_upper)
        if council:
            names = ", ".join(m["name"] for m in council["cast"])
            instructions += f"\n\nCouncil Scene: {council['moderatorCopy']}\nCast: {names}"

        # Enrich with .ai-rules data
        enrichment = self._build_rules_snippet(mode_upper, agent["name"])
        if enrichment:
            instructions += "\n\n" + enrichment

        # MCP enhancement hint (always last)
        mcp_hint = (
            "\n\nIf mcp__codingbuddy__parse_mode is available, "
            "call it for enhanced features (checklists, specialist agents, context tracking)."
        )

        result = instructions + mcp_hint

        # Enforce hard limit
        if len(result) > CHAR_LIMIT:
            result = result[: CHAR_LIMIT - 3] + "..."

        return result

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_rules_snippet(self, mode: str, agent_name: str) -> Optional[str]:
        """Compose an enrichment snippet from .ai-rules data."""
        parts: list[str] = []

        # Agent expertise
        details = self._load_agent_details(agent_name)
        if details and details.get("expertise"):
            expertise_str = ", ".join(details["expertise"][:5])
            parts.append(f"Agent expertise: {expertise_str}")

        # Mode rules — extract key bullet points
        rules_text = self.load_mode_rules(mode)
        if rules_text:
            key_lines: list[str] = []
            for line in rules_text.split("\n")[1:]:  # skip header
                stripped = line.strip()
                if stripped.startswith(("**", "- ")):
                    key_lines.append(stripped)
                if len(key_lines) >= 6:
                    break
            if key_lines:
                parts.append("From .ai-rules:\n" + "\n".join(key_lines))

        return "\n\n".join(parts) if parts else None
