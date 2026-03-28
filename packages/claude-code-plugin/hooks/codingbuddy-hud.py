#!/usr/bin/env python3
"""CodingBuddy statusLine script (#1088).

Claude Code invokes this via settings.json statusLine.command.
Reads session data from stdin JSON, outputs formatted status to stdout.
"""
import json
import os
import sys
from datetime import datetime, timezone

BUDDY_FACE = "\u25d5\u203f\u25d5"  # ◕‿◕

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


def format_status_line(
    stdin_data: dict,
    hud_state: dict,
    active_agent: str = "",
) -> str:
    """Format the statusLine output."""
    version = hud_state.get("version", "")
    mode = hud_state.get("currentMode")
    mode_label = mode if mode else "Ready"

    ctx_window = stdin_data.get("context_window", {})
    ctx_pct = ctx_window.get("used_percentage", 0) or 0
    health = get_health(ctx_pct)

    start_ts = hud_state.get("sessionStartTimestamp", "")
    duration = format_duration(start_ts) if start_ts else "0m"

    model_id = ""
    model_info = stdin_data.get("model", {})
    if model_info:
        model_id = model_info.get("id", "")

    cost = estimate_cost(model_id, ctx_window)
    cache = compute_cache_hit_rate(ctx_window)

    ver_str = f" v{version}" if version else ""
    line1 = (
        f"{BUDDY_FACE} CB{ver_str} | {mode_label} {health} | "
        f"{duration} | ~${cost:.2f} | Cache:{cache:.0f}% | Ctx:{ctx_pct:.0f}%"
    )

    if not active_agent:
        return line1

    return f"{line1}\n\U0001f916 {active_agent}"


def main():
    """Entry point. Always outputs something, never crashes."""
    try:
        stdin_data = parse_stdin()

        state_file = os.environ.get("CODINGBUDDY_HUD_STATE_FILE", DEFAULT_STATE_FILE)
        hud_state = read_state(state_file)

        active_agent = os.environ.get("CODINGBUDDY_ACTIVE_AGENT", "")

        output = format_status_line(stdin_data, hud_state, active_agent)
        print(output)
    except Exception:
        print(f"{BUDDY_FACE} CodingBuddy")


if __name__ == "__main__":
    main()
