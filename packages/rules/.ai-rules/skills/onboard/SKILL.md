---
name: onboard
description: "Guided onboarding for new projects - scans tech stack, generates codingbuddy.config.json, sets up adapters, and installs .ai-rules with interactive Q&A."
---

# Onboard: New Project Setup

## Overview

Guide users through setting up codingbuddy in a new project via interactive, step-by-step onboarding. Detect the tech stack automatically, generate configuration, and create adapter files for their AI tools.

## Step 1: Project Scanning

Scan the project root to detect:

**Package managers & languages:**
- `package.json` → Node.js/TypeScript (check for `typescript` dep)
- `requirements.txt` / `pyproject.toml` / `setup.py` → Python
- `go.mod` → Go
- `Cargo.toml` → Rust
- `pom.xml` / `build.gradle` → Java/Kotlin
- `Gemfile` → Ruby
- `composer.json` → PHP

**Frameworks** (from dependency files):
- React, Next.js, Vue, Angular, Svelte, Express, NestJS, Django, Flask, FastAPI, Spring Boot, Rails, Laravel, Gin, Echo, etc.

**Test setup:**
- Jest, Vitest, Mocha, Pytest, Go test, JUnit, RSpec, PHPUnit, etc.

**Monorepo indicators:**
- `workspaces` in package.json, `lerna.json`, `pnpm-workspace.yaml`, `nx.json`, `turbo.json`

**AI tools already present:**
- `.cursor/` → Cursor
- `.claude/` → Claude Code
- `.antigravity/` → Antigravity (Gemini)
- `.codex/` → Codex
- `.q/` → Amazon Q
- `.kiro/` → Kiro
- `.github/copilot/` → GitHub Copilot

After scanning, present findings to the user:

```
Detected:
- Language: TypeScript
- Framework: Next.js 14, React 18
- Test: Vitest
- Monorepo: Yarn workspaces
- AI tools: .claude/ (existing)
```

Ask: "Does this look correct? Anything to add or change?" (use AskUserQuestion)

## Step 2: Generate codingbuddy.config.json

Based on detected info, generate a draft config:

```json
{
  "language": "en",
  "techStack": {
    "languages": ["typescript"],
    "frameworks": ["nextjs", "react"],
    "testing": ["vitest"],
    "packageManager": "yarn"
  },
  "architecture": {
    "pattern": "layered",
    "monorepo": true
  },
  "agents": {
    "primary": "software-engineer",
    "specialists": ["frontend-developer", "test-engineer"]
  }
}
```

Ask the user to confirm or adjust:
- Communication language (en, ko, ja, zh, es, etc.)
- Primary agent selection (show top 3 recommendations based on tech stack)
- Architecture pattern (layered, clean, hexagonal, or custom)

Write `codingbuddy.config.json` to project root after confirmation.

## Step 3: Adapter Setup

Based on detected AI tools (or ask which tools the user wants to set up):

| Tool | Config Path | What to Create |
|------|------------|----------------|
| Cursor | `.cursor/rules/codingbuddy.mdc` | Rules include pointing to .ai-rules |
| Claude Code | `.claude/settings.json` + `CLAUDE.md` | MCP server config + instructions |
| Antigravity | `.antigravity/rules/codingbuddy.md` | Gemini rules file |
| Codex | `.codex/AGENTS.md` | Codex agent instructions |
| Amazon Q | `.q/rules/codingbuddy.md` | Q rules file |
| Kiro | `.kiro/rules/codingbuddy.md` | Kiro rules file |

For each selected tool:
1. Create the config directory if it does not exist
2. Generate a starter config file referencing the shared `.ai-rules/` rules
3. Show the user what was created

Ask: "Which AI tools do you want to configure?" (use AskUserQuestion with multiSelect)

## Step 4: Optional .ai-rules Setup

Present two options:

**Option A: Copy rules locally** (recommended for customization)
- Copy `packages/rules/.ai-rules/` into the project as `.ai-rules/`
- User can customize rules for their project

**Option B: Install via npm package**
- `npm install codingbuddy-rules` / `yarn add codingbuddy-rules`
- Reference rules from `node_modules/codingbuddy-rules/.ai-rules/`
- Stays in sync with upstream updates

Ask: "How would you like to set up the AI rules?" (use AskUserQuestion)

If Option A: copy the rules directory and confirm.
If Option B: run the install command and update adapter configs to point to node_modules path.

## Step 5: Summary

Present a summary of everything that was created:

```
Onboarding complete!

Created files:
  - codingbuddy.config.json (project configuration)
  - .claude/settings.json (Claude Code MCP config)
  - .ai-rules/ (shared AI coding rules)

Next steps:
  1. Review codingbuddy.config.json and adjust settings
  2. Start with: PLAN <your first task>
  3. Use AUTO mode for autonomous development cycles
  4. Run /help to see available commands
```

## Key Principles

- **Interactive** — Ask one question at a time using AskUserQuestion, never assume
- **Non-destructive** — Never overwrite existing config files; ask before modifying
- **Detect first** — Auto-detect as much as possible, then confirm with user
- **Minimal setup** — Only create what the user needs; skip unnecessary adapters
- **Clear output** — Show exactly what files were created and what to do next
