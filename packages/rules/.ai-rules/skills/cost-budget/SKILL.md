---
name: cost-budget
description: >-
  Use when managing AI session costs, setting budget limits, or preventing
  cost overruns in autonomous workflows like taskMaestro, autopilot, ralph
  loops, and parallel agent execution. Defines cost tracking protocol,
  threshold alerts, and auto-pause mechanism.
---

# Cost Budget Management

## Overview

Autonomous AI workflows can consume unbounded resources without guardrails. A single runaway loop — autopilot, ralph, or a multi-wave taskMaestro session — can burn through API credits before anyone notices.

**Core principle:** Every autonomous workflow must have a cost ceiling. No budget means unlimited spend.

**Iron Law:**
```
NO AUTONOMOUS EXECUTION WITHOUT A DECLARED BUDGET
If no budget is set, warn before starting. If budget is exceeded, pause and require override.
```

## When to Use

- Starting any autonomous workflow (autopilot, ralph, ultrawork, taskMaestro)
- Running parallel agents across multiple panes or worktrees
- Multi-session tasks expected to exceed a few dollars
- Any workflow where cost visibility matters to the user
- Setting up per-project or per-team cost guardrails

## When NOT to Use

- Single interactive conversations (cost is negligible)
- Quick one-off questions or file reads
- Workflows where the user explicitly opts out of budget tracking

---

## Cost Tracking Protocol

### Data Collection Points

Cost data is collected at three levels:

| Level | Scope | Data Source | Granularity |
|-------|-------|-------------|-------------|
| **Session** | Single Claude Code session | Token usage from API responses | Per-request |
| **Wave** | One taskMaestro wave (N parallel panes) | Aggregated session costs per pane | Per-wave |
| **Project** | All sessions in a project directory | Cumulative across sessions | Running total |

### Cost Estimation

```
Cost = (input_tokens × input_price) + (output_tokens × output_price)

Model pricing (per 1M tokens):
  opus:   input=$15.00  output=$75.00
  sonnet: input=$3.00   output=$15.00
  haiku:  input=$0.25   output=$1.25
```

**Note:** Prices are approximate and should be updated when model pricing changes. The skill defines the protocol, not hardcoded prices.

### Collection Methods

1. **Environment variables** (preferred):
   ```bash
   export COST_BUDGET_USD=10.00          # Total budget in USD
   export COST_BUDGET_TOKENS=5000000     # Alternative: token-based budget
   export COST_BUDGET_SCOPE=project      # session | wave | project
   ```

2. **Configuration file** (`codingbuddy.config.json`):
   ```json
   {
     "costBudget": {
       "limit": 10.00,
       "currency": "USD",
       "scope": "project",
       "thresholds": {
         "info": 0.50,
         "warn": 0.80,
         "critical": 1.00
       }
     }
   }
   ```

3. **MCP state** (runtime tracking):
   ```
   state_write(mode: "cost-budget", state: {
     "spent": "4.52",
     "budget": "10.00",
     "tokens_used": "2340000"
   })
   ```

### Token Counting

Track tokens per request and accumulate:

```
Per request:
  input_tokens  → from API response headers or usage field
  output_tokens → from API response headers or usage field
  cost_usd      → calculated from model pricing

Accumulated:
  session_total  = sum(all request costs in session)
  wave_total     = sum(all session costs in wave)
  project_total  = sum(all wave/session costs in project)
```

---

## Budget Configuration

### Threshold Levels

Three threshold levels trigger different actions:

| Level | Default | Trigger | Action |
|-------|---------|---------|--------|
| **INFO** | 50% of budget | Informational milestone | Log to terminal, continue |
| **WARN** | 80% of budget | Approaching limit | Terminal alert + optional webhook, continue |
| **CRITICAL** | 100% of budget | Budget exhausted | Terminal alert + webhook + **auto-pause** |

### Budget Scopes

| Scope | Description | Use Case |
|-------|-------------|----------|
| `session` | Single CLI session | Quick tasks, one-off work |
| `wave` | One taskMaestro wave | Per-wave cost control in parallel execution |
| `project` | Cumulative across all sessions | Long-running projects with total budget |

### Budget Override

When the CRITICAL threshold is reached, the workflow pauses. To continue:

```bash
# Explicit override for current session
export COST_BUDGET_OVERRIDE=true

# Or increase the budget
export COST_BUDGET_USD=20.00
```

**Override rules:**
- Override must be explicit — never auto-continue past 100%
- Override resets the threshold to the new budget
- Log every override event for audit trail
- Override does not disable future threshold checks

---

## Alert Channels

### Terminal Notification (Default)

Always active. Alerts appear inline in the terminal:

```
┌─────────────────────────────────────────────┐
│ 💰 COST ALERT [INFO]                        │
│ Budget: $5.00 / $10.00 (50%)               │
│ Tokens: 1.2M used                           │
│ Status: Continuing                           │
└─────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────┐
│ ⚠️  COST ALERT [WARN]                       │
│ Budget: $8.00 / $10.00 (80%)               │
│ Tokens: 3.8M used                           │
│ Status: Approaching limit — review spend    │
└─────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────┐
│ 🛑 COST ALERT [CRITICAL]                    │
│ Budget: $10.00 / $10.00 (100%)             │
│ Tokens: 5.0M used                           │
│ Status: PAUSED — override required          │
│                                             │
│ To continue:                                │
│   export COST_BUDGET_OVERRIDE=true          │
│   # or increase: export COST_BUDGET_USD=20  │
└─────────────────────────────────────────────┘
```

### Webhook (Optional)

For remote notifications (Slack, Discord, PagerDuty, custom endpoints):

```bash
export COST_ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
export COST_ALERT_WEBHOOK_EVENTS=warn,critical  # which levels trigger webhook
```

**Webhook payload:**
```json
{
  "event": "cost_alert",
  "level": "warn",
  "budget_usd": 10.00,
  "spent_usd": 8.00,
  "percent": 80,
  "tokens_used": 3800000,
  "scope": "project",
  "project": "codingbuddy",
  "session_id": "abc-123",
  "timestamp": "2026-03-22T14:00:00Z"
}
```

**Webhook rules:**
- Webhook failures must not block the workflow
- Retry once on failure, then log and continue
- Include project name and session ID for traceability

---

## Auto-Pause Mechanism

### Pause Behavior

When the CRITICAL threshold (100%) is reached:

1. **Stop** — Halt the current autonomous loop iteration
2. **Alert** — Display terminal notification + fire webhook
3. **Save state** — Persist current progress to context document
4. **Wait** — Do not proceed until explicit override or budget increase
5. **Log** — Record the pause event with timestamp and spend data

### Pause Points by Workflow

| Workflow | Pause Point | What Happens |
|----------|-------------|--------------|
| **autopilot** | Between iterations | Current iteration completes, next blocked |
| **ralph** | Between architect reviews | Current cycle completes, next blocked |
| **ultrawork** | Between task assignments | Current task completes, next blocked |
| **taskMaestro** | Between waves | Current wave completes, next wave blocked |
| **parallel agents** | At agent completion | Running agents finish, no new agents spawn |

**Key:** Never interrupt mid-operation. Always complete the current atomic unit, then pause.

### Override Protocol

```
1. User sees CRITICAL alert
2. User reviews spend breakdown
3. User decides:
   a. Stop entirely → no action needed, workflow stays paused
   b. Continue with new budget → export COST_BUDGET_USD=<new_amount>
   c. Continue without limit → export COST_BUDGET_OVERRIDE=true
4. Workflow resumes from saved state
```

---

## TaskMaestro Integration

### Per-Wave Budget Allocation

When running taskMaestro with a project budget, allocate per-wave:

```
Total budget: $20.00
Estimated waves: 4
Per-wave allocation: $5.00 per wave

Wave 1: $5.00 budget → actual: $3.20 → remaining pool: $16.80
Wave 2: $5.60 budget (redistributed) → actual: $4.10 → remaining pool: $12.70
Wave 3: $6.35 budget (redistributed) → ...
```

**Redistribution rule:** Unspent budget from completed waves rolls into remaining waves equally.

### Cross-Pane Aggregation

Each tmux pane in a taskMaestro wave runs an independent session. Aggregation:

```
Wave cost = sum(pane_1_cost + pane_2_cost + ... + pane_N_cost)

Tracking via shared state:
  state_write(mode: "cost-budget", state: {
    "wave_id": "wave-2",
    "pane_id": "pane-3",
    "pane_cost": "1.25",
    "wave_budget": "5.60"
  })
```

### Wave-Level Threshold Checks

After each pane completes, check the wave aggregate:

```
1. Pane completes → reports cost to shared state
2. Orchestrator reads all pane costs for current wave
3. Calculate: wave_spent = sum(all pane costs)
4. Check: wave_spent vs wave_budget
5. If WARN → alert, continue remaining panes
6. If CRITICAL → let running panes finish, block next wave
```

---

## Verification Checklist

Before starting an autonomous workflow:

- [ ] Budget is declared (`COST_BUDGET_USD` or config)
- [ ] Scope is appropriate (`session` / `wave` / `project`)
- [ ] Thresholds are configured (default: 50/80/100%)
- [ ] Alert channels are set up (terminal is automatic)
- [ ] Webhook URL is valid (if using webhook alerts)
- [ ] Override protocol is understood by the operator

During execution:

- [ ] Cost is tracked per request
- [ ] Thresholds trigger correct alert level
- [ ] WARN alerts appear in terminal
- [ ] CRITICAL threshold pauses the workflow
- [ ] State is saved before pause
- [ ] Override resumes workflow correctly

After completion:

- [ ] Total cost is logged
- [ ] Cost breakdown is available (per-session, per-wave)
- [ ] Budget vs actual comparison is recorded

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "It's just a quick autopilot run, no budget needed" | Quick runs become long runs. Set a budget. |
| "I'll check the cost later" | Later is after the money is spent. Track now. |
| "The budget is too small, I'll just override" | If you're always overriding, your budget is wrong. Increase it properly. |
| "Token counting is too much overhead" | API responses include token counts. No extra cost to read them. |
| "I'll skip the webhook, terminal alerts are enough" | You won't see terminal alerts if you walk away. Set up webhooks for unattended runs. |
| "One pane won't affect the total budget much" | Parallel panes multiply cost linearly. 8 panes = 8x the cost rate. |
