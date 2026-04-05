#!/usr/bin/env python3
"""CodingBuddy statusLine script (#1088, #1325).

Claude Code invokes this via settings.json statusLine.command.
Reads session data from stdin JSON, outputs formatted status to stdout.

Telemetry fallback order per field:
  cost     → stdin cost.total_cost_usd  > estimate_cost()
  duration → stdin cost.total_duration_ms > hud-state sessionStartTimestamp
  agent    → stdin agent.name > hud_state.activeAgent > CODINGBUDDY_ACTIVE_AGENT env
  model    → stdin model.display_name > model.id
"""
import json
import os
import sys
from datetime import datetime, timezone

BUDDY_FACE = "\u25d5\u203f\u25d5"  # ◕‿◕

# Agent eye glyphs from .ai-rules agent definitions.
AGENT_GLYPHS = {
    "act-mode": "\u25c6",            # ◆
    "plan-mode": "\u25c7",           # ◇
    "eval-mode": "\u25c8",           # ◈
    "auto-mode": "\u25ca",           # ◊
    "technical-planner": "\u2394",   # ⎔
    "security-specialist": "\u25ee", # ◮
    "security-engineer": "\u25b2",   # ▲
    "test-strategy-specialist": "\u2299",  # ⊙
    "test-engineer": "\u25c9",       # ◉
    "frontend-developer": "\u2605",  # ★
    "backend-developer": "\u25d0",   # ◐
    "architecture-specialist": "\u2b21",  # ⬡
    "solution-architect": "\u2b22",  # ⬢
    "code-quality-specialist": "\u25cf",  # ●
    "code-reviewer": "\u229b",       # ⊛
    "performance-specialist": "\u2297",   # ⊗
    "accessibility-specialist": "\u2726", # ✦
    "seo-specialist": "\u2727",      # ✧
    "documentation-specialist": "\u2295", # ⊕
    "i18n-specialist": "\u25ce",     # ◎
    "devops-engineer": "\u25bc",     # ▼
    "platform-engineer": "\u25b3",   # △
    "observability-specialist": "\u25cc", # ◌
    "integration-specialist": "\u25cb",   # ○
    "event-architecture-specialist": "\u2756",  # ❖
    "migration-specialist": "\u2731",     # ✱
    "data-engineer": "\u25d1",       # ◑
    "data-scientist": "\u25d2",      # ◒
    "software-engineer": "\u25c8",   # ◈
    "systems-developer": "\u229e",   # ⊞
    "mobile-developer": "\u2736",    # ✶
    "ai-ml-engineer": "\u2734",      # ✴
    "tooling-engineer": "\u22a0",    # ⊠
    "agent-architect": "\u2b23",     # ⬣
    "ui-ux-designer": "\u2606",      # ☆
    "parallel-orchestrator": "\u25a3",    # ▣
    "plan-reviewer": "\u25c6",       # ◆
}

# Suffixes stripped when abbreviating agent names to 4-char labels.
_ROLE_SUFFIXES = frozenset({
    "specialist", "developer", "engineer", "architect", "designer",
    "reviewer", "orchestrator", "scientist", "agent", "mode",
})

MODEL_PRICING = {
    "haiku": (0.80, 4.00),
    "sonnet": (3.00, 15.00),
    "opus": (15.00, 75.00),
}

OUTPUT_RATIOS = {"haiku": 0.30, "sonnet": 0.40, "opus": 0.50}

DEFAULT_STATE_FILE = os.path.join(
    os.environ.get(
        "CLAUDE_PLUGIN_DATA",
        os.path.join(os.path.expanduser("~"), ".codingbuddy"),
    ),
    "hud-state.json",
)


def parse_stdin(raw: str = "") -> dict:
    """Parse stdin JSON. Returns {} on any error."""
    if not raw:
        try:
            if not sys.stdin.isatty():
                raw = sys.stdin.read()
        except Exception:
            return {}
    if not raw or not raw.strip():
        return {}
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return {}


def get_model_pricing(model_id: str) -> tuple:
    """Return (input_per_million, output_per_million) for model."""
    model_lower = model_id.lower()
    for key, prices in MODEL_PRICING.items():
        if key in model_lower:
            return prices
    return MODEL_PRICING["sonnet"]


def estimate_cost(model_id: str, context_window: dict) -> float:
    """Estimate session cost from token usage."""
    usage = context_window.get("current_usage", {})
    if not usage:
        return 0.0

    input_tokens = usage.get("input_tokens", 0)
    cache_write = usage.get("cache_creation_input_tokens", 0)
    cache_read = usage.get("cache_read_input_tokens", 0)

    inp_price, out_price = get_model_pricing(model_id)

    model_lower = model_id.lower()
    ratio = next((r for k, r in OUTPUT_RATIOS.items() if k in model_lower), 0.40)
    total_input = input_tokens + cache_write + cache_read
    est_output = total_input * ratio

    input_cost = (input_tokens / 1_000_000) * inp_price
    cache_write_cost = (cache_write / 1_000_000) * inp_price * 1.25
    cache_read_cost = (cache_read / 1_000_000) * inp_price * 0.10
    output_cost = (est_output / 1_000_000) * out_price

    return input_cost + cache_write_cost + cache_read_cost + output_cost


def compute_cache_hit_rate(context_window: dict) -> float:
    """Compute cache hit rate as percentage (0-100)."""
    usage = context_window.get("current_usage", {})
    if not usage:
        return 0.0

    input_tokens = usage.get("input_tokens", 0)
    cache_write = usage.get("cache_creation_input_tokens", 0)
    cache_read = usage.get("cache_read_input_tokens", 0)
    total = input_tokens + cache_write + cache_read

    if total == 0:
        return 0.0
    return (cache_read / total) * 100


def get_health(ctx_pct: float) -> str:
    """Return health emoji based on context usage percentage."""
    if ctx_pct > 85:
        return "\U0001f534"  # 🔴
    if ctx_pct > 60:
        return "\U0001f7e1"  # 🟡
    return "\U0001f7e2"  # 🟢


def format_duration_ms(ms) -> str:
    """Format milliseconds to duration like '12m' or '1h23m'."""
    total_minutes = int(ms / 60_000)
    if total_minutes < 60:
        return f"{total_minutes}m"
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours}h{minutes:02d}m"


def format_duration(start_timestamp: str) -> str:
    """Format ISO timestamp to duration like '12m' or '1h23m'."""
    try:
        start = datetime.fromisoformat(start_timestamp)
        now = datetime.now(timezone.utc)
        delta = now - start
        total_minutes = int(delta.total_seconds() / 60)

        if total_minutes < 60:
            return f"{total_minutes}m"

        hours = total_minutes // 60
        minutes = total_minutes % 60
        return f"{hours}h{minutes:02d}m"
    except (ValueError, TypeError):
        return "0m"


def read_state(state_file: str = DEFAULT_STATE_FILE) -> dict:
    """Read HUD state from JSON file with shared lock. Returns {} on error."""
    try:
        import fcntl
        with open(state_file, "r", encoding="utf-8") as f:
            fcntl.flock(f.fileno(), fcntl.LOCK_SH)
            return json.load(f)
    except ImportError:
        try:
            with open(state_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            return {}
    except (json.JSONDecodeError, OSError):
        return {}


def resolve_cost(stdin_data: dict, model_id: str, ctx_window: dict) -> tuple:
    """Resolve cost: stdin exact > estimate. Returns (cost, is_exact)."""
    exact = (stdin_data.get("cost") or {}).get("total_cost_usd")
    if exact is not None:
        return (float(exact), True)
    return (estimate_cost(model_id, ctx_window), False)


def resolve_duration(stdin_data: dict, hud_state: dict) -> str:
    """Resolve duration: stdin exact > hud-state timestamp > '0m'."""
    exact_ms = (stdin_data.get("cost") or {}).get("total_duration_ms")
    if exact_ms is not None:
        return format_duration_ms(exact_ms)
    start_ts = hud_state.get("sessionStartTimestamp", "")
    if start_ts:
        return format_duration(start_ts)
    return "0m"


def resolve_agent(stdin_data: dict, hud_state=None, env_agent: str = "") -> str:
    """Resolve agent: stdin > hud_state.activeAgent > env var."""
    stdin_agent = (stdin_data.get("agent") or {}).get("name", "")
    if stdin_agent:
        return stdin_agent
    hud_agent = (hud_state or {}).get("activeAgent", "")
    return hud_agent or env_agent


def resolve_model_label(stdin_data: dict) -> tuple:
    """Resolve model info. Returns (model_id, display_label)."""
    model_info = stdin_data.get("model") or {}
    model_id = model_info.get("id", "")
    display_name = model_info.get("display_name", "")
    return (model_id, display_name)


def format_rate_limits(stdin_data: dict) -> str:
    """Format rate-limit info if present. Returns '' when absent."""
    rl = stdin_data.get("rate_limits")
    if not rl:
        return ""
    parts = []
    five = rl.get("five_hour")
    if five:
        pct = five.get("used_percentage", 0)
        parts.append(f"5h:{pct:.0f}%")
    seven = rl.get("seven_day")
    if seven:
        pct = seven.get("used_percentage", 0)
        parts.append(f"7d:{pct:.0f}%")
    if not parts:
        return ""
    return "RL:" + ",".join(parts)


def format_worktree(stdin_data: dict) -> str:
    """Format worktree name if present. Returns '' when absent."""
    wt = stdin_data.get("worktree")
    if not wt:
        return ""
    name = wt.get("name", "")
    return f"WT:{name}" if name else ""


def abbreviate_agent(name: str) -> str:
    """Create a 4-char label from an agent name.

    Strips known role suffixes, then takes the first remaining
    word truncated to 4 characters.  e.g.
      "security-specialist" → "secu"
      "test-strategy-specialist" → "test"
      "plan-mode" → "plan"
    """
    if not name:
        return ""
    parts = name.split("-")
    core = [p for p in parts if p not in _ROLE_SUFFIXES]
    if not core:
        core = parts[:1]
    return core[0][:4]


def format_actor_badge(agent: str) -> str:
    """Format actor badge: ``[◮ secu]`` or ``[🤖 agen]`` (fallback glyph)."""
    if not agent:
        return ""
    glyph = AGENT_GLYPHS.get(agent, "\U0001f916")  # 🤖 fallback
    label = abbreviate_agent(agent)
    return f"[{glyph} {label}]"


def format_focus_badge(focus: str) -> str:
    """Format focus badge: ``[auth flow]``.  Empty string when *focus* is falsy."""
    if not focus:
        return ""
    return f"[{focus}]"


def format_state_badge(blocker_count) -> str:
    """Format state badge: ``[⚠2]`` when blockers > 0, else ``[✓]``."""
    try:
        count = int(blocker_count)
    except (TypeError, ValueError):
        count = 0
    if count > 0:
        return f"[\u26a0{count}]"  # ⚠N
    return "[\u2713]"  # ✓


def format_badge_line(agent: str, focus: str, blocker_count) -> str:
    """Compose the badge-based second line.

    Returns an empty string when there is nothing to display
    (no agent and no focus).
    """
    if not agent and not focus:
        return ""
    badges: list = []
    actor = format_actor_badge(agent)
    if actor:
        badges.append(actor)
    fb = format_focus_badge(focus)
    if fb:
        badges.append(fb)
    badges.append(format_state_badge(blocker_count))
    return " ".join(badges)


def _get_fresh_version(hud_state: dict, *, plugins_file: str = "") -> str:
    """Return the most current plugin version.

    Prefers installed_plugins.json (authoritative after updates)
    over the hud-state snapshot written at session start.
    Pass *plugins_file* explicitly for testing.
    """
    try:
        lib_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib")
        if lib_dir not in sys.path:
            sys.path.insert(0, lib_dir)
        from hud_helpers import read_installed_version

        kwargs = {"plugins_file": plugins_file} if plugins_file else {}
        fresh = read_installed_version(**kwargs)
        if fresh:
            return fresh
    except Exception:
        pass
    return hud_state.get("version", "")


def format_status_line(
    stdin_data: dict,
    hud_state: dict,
    active_agent: str = "",
    *,
    plugins_file: str = "",
) -> str:
    """Format the statusLine output.

    Fallback order per field:
      version  → installed_plugins.json > hud-state.version
      cost     → stdin cost.total_cost_usd  > estimate_cost()
      duration → stdin cost.total_duration_ms > hud-state sessionStartTimestamp
      agent    → stdin agent.name > hud_state.activeAgent > active_agent param
      model    → stdin model.display_name > model.id
    """
    version = _get_fresh_version(hud_state, plugins_file=plugins_file)
    mode = hud_state.get("currentMode")
    mode_label = mode if mode else "Ready"

    ctx_window = stdin_data.get("context_window") or {}
    ctx_pct = ctx_window.get("used_percentage", 0) or 0
    health = get_health(ctx_pct)

    model_id, display_name = resolve_model_label(stdin_data)
    cost, is_exact = resolve_cost(stdin_data, model_id, ctx_window)
    duration = resolve_duration(stdin_data, hud_state)
    cache = compute_cache_hit_rate(ctx_window)
    agent = resolve_agent(stdin_data, hud_state, active_agent)

    cost_prefix = "$" if is_exact else "~$"

    ver_str = f" v{version}" if version else ""

    segments = [
        f"{BUDDY_FACE} CB{ver_str}",
        f"{mode_label} {health}",
        duration,
        f"{cost_prefix}{cost:.2f}",
        f"Cache:{cache:.0f}%",
        f"Ctx:{ctx_pct:.0f}%",
    ]

    rl = format_rate_limits(stdin_data)
    if rl:
        segments.append(rl)

    wt = format_worktree(stdin_data)
    if wt:
        segments.append(wt)

    if display_name:
        segments.append(display_name)

    line1 = " | ".join(segments)

    focus = hud_state.get("focus") or ""
    blocker_count = hud_state.get("blockerCount", 0) or 0

    line2 = format_badge_line(agent, focus, blocker_count)
    if not line2:
        return line1

    return f"{line1}\n{line2}"


def main():
    """Entry point. Always outputs something, never crashes."""
    try:
        stdin_data = parse_stdin()

        state_file = os.environ.get("CODINGBUDDY_HUD_STATE_FILE", DEFAULT_STATE_FILE)
        hud_state = read_state(state_file)

        env_agent = os.environ.get("CODINGBUDDY_ACTIVE_AGENT", "")

        output = format_status_line(stdin_data, hud_state, env_agent)
        print(output)
    except Exception:
        print(f"{BUDDY_FACE} CodingBuddy")


if __name__ == "__main__":
    main()
