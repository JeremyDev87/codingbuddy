# Wave 2: StatusLine Script + Mode Detect Update

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create codingbuddy statusLine script (#1088) and update mode-detect hook to write HUD state (#1090). These two issues are independent and can be shipped as separate PRs.

**Architecture:** StatusLine is a standalone Python script invoked by Claude Code via stdin/stdout. Mode detect update is a 5-line addition to an existing hook.

**Tech Stack:** Python 3, json, sys, os, datetime

**Issues:** #1088, #1090

## Alternatives

### Decision: StatusLine — Single file vs Module

| Criteria | Single file (standalone) | Module (import from lib/) |
|---|---|---|
| Deployment | Copy one file to ~/.claude/hud/ | Need to copy file + ensure lib/ path |
| Testability | Must mock sys.stdin | Same |
| Maintenance | All logic in one place | Split across files |

**Decision:** Single file — The script is copied to `~/.claude/hud/` by session-start. It must work standalone without lib/ imports at runtime. For `hud_state`, we inline the read function (3 lines) rather than importing.

---

## Part A: #1090 — Mode Detect HUD Update (5 min)

### Step A1: Write failing test

**File:** `packages/claude-code-plugin/tests/test_mode_detect_hud.py`

```python
"""Test that mode detection updates HUD state (#1090)."""

def test_mode_detect_updates_hud_state(tmp_path, monkeypatch):
    """When a mode is detected, hud-state.json should be updated."""
    import json, subprocess, sys

    # Create initial hud-state.json
    state_file = tmp_path / "hud-state.json"
    state_file.write_text(json.dumps({
        "sessionId": "test", "version": "5.1.1",
        "currentMode": None, "updatedAt": "2026-01-01T00:00:00"
    }))

    # Run user-prompt-submit.py with PLAN prompt
    hook_path = os.path.join(os.path.dirname(__file__), "..", "hooks", "user-prompt-submit.py")
    env = {**os.environ, "CODINGBUDDY_HUD_STATE_FILE": str(state_file)}
    result = subprocess.run(
        [sys.executable, hook_path],
        input=json.dumps({"prompt": "PLAN: design auth"}),
        capture_output=True, text=True, env=env
    )
    assert result.returncode == 0

    data = json.loads(state_file.read_text())
    assert data["currentMode"] == "PLAN"
```

### Step A2: Modify `user-prompt-submit.py`

After line 69 (`print(CONTEXT_TEMPLATE.format(mode=detected_mode))`), add:

```python
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
```

Also add `import os` at the top (already has `import sys`).

### Step A3: Run test + commit

---

## Part B: #1088 — StatusLine Script

### Step B1: Write failing test — parse_stdin

**File:** `packages/claude-code-plugin/tests/test_hud.py`

```python
"""Tests for codingbuddy statusLine script (#1088)."""

class TestParseStdin:
    def test_valid_json(self):
        from codingbuddy_hud import parse_stdin
        data = parse_stdin('{"model":{"id":"opus"},"cwd":"/tmp"}')
        assert data["model"]["id"] == "opus"

    def test_empty_input(self):
        from codingbuddy_hud import parse_stdin
        assert parse_stdin("") == {}

    def test_invalid_json(self):
        from codingbuddy_hud import parse_stdin
        assert parse_stdin("{bad") == {}
```

### Step B2: Create `codingbuddy-hud.py` — parse_stdin

**File:** `packages/claude-code-plugin/hooks/codingbuddy-hud.py`

```python
#!/usr/bin/env python3
"""CodingBuddy statusLine script (#1088).

Claude Code invokes this via settings.json statusLine.command.
Reads session data from stdin JSON, outputs formatted status to stdout.
"""
import json
import os
import sys
from datetime import datetime, timezone

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
```

### Step B3: Write test — get_model_pricing + estimate_cost

```python
class TestModelPricing:
    def test_haiku(self):
        from codingbuddy_hud import get_model_pricing
        inp, out = get_model_pricing("claude-haiku-4-5-20251001")
        assert inp == 0.80
        assert out == 4.00

    def test_sonnet(self):
        inp, out = get_model_pricing("claude-sonnet-4-5-20250929")
        assert inp == 3.00

    def test_opus(self):
        inp, out = get_model_pricing("claude-opus-4-6-20260205")
        assert inp == 15.00

    def test_unknown_defaults_to_sonnet(self):
        inp, out = get_model_pricing("unknown-model")
        assert inp == 3.00

class TestEstimateCost:
    def test_basic_cost(self):
        from codingbuddy_hud import estimate_cost
        ctx = {"current_usage": {
            "input_tokens": 10000,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 0,
        }}
        cost = estimate_cost("claude-sonnet-4-5", ctx)
        # input: 10000 * 3/1M = 0.03, output est: 4000 * 15/1M = 0.06
        assert 0.05 < cost < 0.15

    def test_zero_tokens(self):
        cost = estimate_cost("claude-sonnet-4-5", {})
        assert cost == 0.0
```

### Step B4: Implement pricing + cost

```python
MODEL_PRICING = {
    "haiku": (0.80, 4.00),
    "sonnet": (3.00, 15.00),
    "opus": (15.00, 75.00),
}

def get_model_pricing(model_id: str) -> tuple:
    """Return (input_per_million, output_per_million) for model."""
    model_lower = model_id.lower()
    for key, prices in MODEL_PRICING.items():
        if key in model_lower:
            return prices
    return MODEL_PRICING["sonnet"]  # default

OUTPUT_RATIOS = {"haiku": 0.30, "sonnet": 0.40, "opus": 0.50}

def estimate_cost(model_id: str, context_window: dict) -> float:
    """Estimate session cost from token usage."""
    usage = context_window.get("current_usage", {})
    if not usage:
        return 0.0
    input_tokens = usage.get("input_tokens", 0)
    cache_write = usage.get("cache_creation_input_tokens", 0)
    cache_read = usage.get("cache_read_input_tokens", 0)
    inp_price, out_price = get_model_pricing(model_id)
    # Output estimation
    model_lower = model_id.lower()
    ratio = next((r for k, r in OUTPUT_RATIOS.items() if k in model_lower), 0.40)
    est_output = input_tokens * ratio
    # Cost
    input_cost = (input_tokens / 1_000_000) * inp_price
    cache_write_cost = (cache_write / 1_000_000) * inp_price * 1.25
    cache_read_cost = (cache_read / 1_000_000) * inp_price * 0.10
    output_cost = (est_output / 1_000_000) * out_price
    return input_cost + cache_write_cost + cache_read_cost + output_cost
```

### Step B5: Write test — cache_hit_rate, health, duration

```python
class TestCacheHitRate:
    def test_no_cache(self):
        from codingbuddy_hud import compute_cache_hit_rate
        assert compute_cache_hit_rate({}) == 0.0

    def test_partial_cache(self):
        ctx = {"current_usage": {
            "input_tokens": 500,
            "cache_creation_input_tokens": 200,
            "cache_read_input_tokens": 800,
        }}
        rate = compute_cache_hit_rate(ctx)
        # 800 / (500 + 200 + 800) = 53.3%
        assert 53 < rate < 54

class TestHealth:
    def test_green(self):
        from codingbuddy_hud import get_health
        assert "🟢" in get_health(45)

    def test_yellow(self):
        assert "🟡" in get_health(70)

    def test_red(self):
        assert "🔴" in get_health(90)

class TestFormatDuration:
    def test_minutes(self):
        from codingbuddy_hud import format_duration
        from datetime import datetime, timezone, timedelta
        ts = (datetime.now(timezone.utc) - timedelta(minutes=12)).isoformat()
        result = format_duration(ts)
        assert "12m" in result or "11m" in result

    def test_hours(self):
        ts = (datetime.now(timezone.utc) - timedelta(hours=1, minutes=23)).isoformat()
        result = format_duration(ts)
        assert "1h" in result
```

### Step B6: Implement cache, health, duration

### Step B7: Write test — format_status_line (integration)

```python
class TestFormatStatusLine:
    def test_full_output_with_mode(self):
        from codingbuddy_hud import format_status_line
        stdin = {
            "model": {"id": "claude-opus-4-6", "display_name": "Opus"},
            "context_window": {
                "context_window_size": 200000,
                "used_percentage": 45,
                "current_usage": {
                    "input_tokens": 1000,
                    "cache_creation_input_tokens": 500,
                    "cache_read_input_tokens": 2000,
                }
            }
        }
        hud_state = {
            "version": "5.1.1",
            "sessionStartTimestamp": datetime.now(timezone.utc).isoformat(),
            "currentMode": "PLAN",
        }
        result = format_status_line(stdin, hud_state)
        assert "◕‿◕" in result
        assert "PLAN" in result
        assert "🟢" in result
        assert "5.1.1" in result

    def test_no_mode_shows_ready(self):
        result = format_status_line({}, {"version": "5.1.1"})
        assert "Ready" in result

    def test_agent_line(self):
        result = format_status_line({}, {
            "version": "5.1.1",
            "currentMode": "ACT",
        }, active_agent="architect")
        lines = result.strip().split("\n")
        assert len(lines) == 2
        assert "architect" in lines[1]
```

### Step B8: Implement format_status_line + main

### Step B9: Full integration test — pipe stdin

```bash
echo '{"transcript_path":"/tmp/t","cwd":"/tmp","model":{"id":"claude-opus-4-6","display_name":"Opus"},"context_window":{"context_window_size":200000,"used_percentage":45,"current_usage":{"input_tokens":1000,"cache_creation_input_tokens":500,"cache_read_input_tokens":2000}}}' | python3 packages/claude-code-plugin/hooks/codingbuddy-hud.py
```

### Step B10: Run all tests + commit

---

## Execution Order

```
#1090 (3 steps, ~5 min) → ship PR
#1088 (10 steps, ~20 min) → ship PR
```

Both can be on separate branches from master.

## Verification

1. `python3 -m pytest tests/test_mode_detect_hud.py -v`
2. `python3 -m pytest tests/test_hud.py -v`
3. `python3 -m pytest tests/ -q` (full regression)
4. Manual: `echo '{...}' | python3 hooks/codingbuddy-hud.py`
