---
name: buddy
description: Show project status, recommended agents, and next actions — your coding buddy at a glance
user-invocable: true
---

# /buddy — On-Demand Buddy Interaction

## Purpose

Instant project overview with agent recommendations and next-action guidance.
Makes CodingBuddy feel like a living assistant you can check in with anytime.

## Instructions

When the user invokes `/buddy`, perform the following steps in order:

### Step 1: Show Buddy Banner

Display the CodingBuddy character greeting:

```
╭━━━╮
┃ ◕‿◕ ┃  Hey! I'm your CodingBuddy!
╰━┳━╯
```

### Step 2: Project Scan

Use the `get_project_config` MCP tool to retrieve the current project configuration.

Display a compact status summary:

```
## 📊 Project Status

| Item | Value |
|------|-------|
| Tech Stack | [detected from config] |
| Language | [from config language setting] |
| Architecture | [from config] |
```

### Step 3: Recent Activity

Check recent git activity to understand current work context:

```bash
git log --oneline -5
git status --short
git branch --show-current
```

Display:

```
## 📝 Recent Activity

Branch: [current branch]
Recent commits:
- [commit 1]
- [commit 2]
- [commit 3]

Working tree: [clean / N files modified]
```

### Step 4: Agent Recommendations

Based on the project scan and recent activity, use the `analyze_task` MCP tool with a summary of the current context to get agent recommendations.

Display:

```
## 🤖 Recommended Agents

Based on your current work:
| Agent | Why |
|-------|-----|
| [Agent Name] | [Brief reason based on context] |
| [Agent Name] | [Brief reason based on context] |
| [Agent Name] | [Brief reason based on context] |
```

### Step 5: Suggested Next Actions

Based on the project state, suggest 2-3 concrete next actions:

```
## 🎯 What's Next?

1. **[Action]** — [Brief description]
2. **[Action]** — [Brief description]
3. **[Action]** — [Brief description]

💡 Tip: Type `PLAN [task]` to start planning, or `AUTO [task]` for autonomous execution.
```

### Step 6: Quick Actions Menu

```
## ⚡ Quick Actions

- `/plan` — Start planning a new task
- `/act` — Execute current plan
- `/eval` — Evaluate recent implementation
- `/auto` — Autonomous development cycle
- `/checklist [domain]` — Generate quality checklist
- `/buddy` — Show this status again
```

## MCP Integration

This command uses the following MCP tools when available:

- `get_project_config` — Retrieve tech stack and project settings
- `analyze_task` — Get agent recommendations for current context
- `recommend_skills` — Suggest relevant skills based on recent activity

## Notes

- This command is read-only and makes no changes to the codebase
- Output adapts to the project's configured language setting
- If MCP tools are unavailable, fall back to git-based context analysis
