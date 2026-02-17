# Changelog

All notable changes to the Multi-AI Coding Assistant Common Rules System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.1.0] - 2026-02-17

### Added

- **TUI Dashboard System**
  - Ink-based terminal UI with Header, AgentCard, AgentTree, AgentGrid, StatusBar, ProgressBar
  - EventEmitter2-based EventBus with `useEventBus` and `useAgentState` React hooks
  - Unix Domain Socket IPC for standalone TUI process
  - Compact single-line design for 24-line terminals
  - TuiInterceptor MCP tool dispatch layer
  - Agent Metadata Lookup Service

- **Landing Page**
  - Next.js 16 multilingual (5 languages) landing page
  - Widget Slot architecture (AgentsShowcase, CodeExample, QuickStart)
  - shadcn/ui, self-hosted fonts, next-intl i18n
  - Vercel deployment with analytics, JSON-LD structured data

- **MCP Server Enhancements**
  - Bearer token authentication for SSE endpoints (#416)
  - `dispatch_agents` tool and auto-dispatch in `parse_mode`
  - `recommendedActAgent` support in EVAL mode (#361)
  - `frontend-developer` and `devops-engineer` intent patterns

- **Skills**
  - `widget-slot-architecture` skill for Next.js App Router

### Changed

- Prettier `printWidth: 100` applied to entire codebase (#423)
- MCP Server: extracted shared `rules-core` and `keyword-core` modules (#415)

### Fixed

- Plugin `isPathSafe()` path normalization and case-insensitive matching (#419)
- MCP Server `appendContext` `findLastIndex` merge logic (#410)
- MCP Server unsafe type assertion runtime validation (#411)
- `validate-rules.sh` `.ai-rules` path reference (#422)
- Agent count mismatch across documentation (#421)

---

## [3.1.0] - 2026-01-22

### Added

- **Self-Hosted Plugin Marketplace**
  - Claude Code plugin marketplace with GitHub Pages deployment
  - `codingbuddy marketplace add` command for plugin discovery
  - Automatic GitHub Pages setup in CI workflow

- **SRP Complexity Classifier**
  - Multi-language support for keyword complexity analysis
  - Enhanced intent detection for PLAN mode agent selection

### Fixed

- Auto mode detection for PLAN/ACT/EVAL/AUTO keywords in hooks
- Language configuration now properly respected with diagnostic logging
- Marketplace add command GitHub repo format handling

### Changed

- **Documentation Improvements**
  - Multi-language plugin documentation (i18n)
  - Multi-agent philosophy introduction added to all language versions
  - Architecture diagram synchronized with current codebase

---

## [3.0.0] - 2026-01-17

### Added

- **Claude Code Plugin** (`codingbuddy-claude-plugin`)
  - Native skill invocation for Claude Code
  - PLAN/ACT/EVAL workflow integration
  - Specialist agents support
  - Install via `npm install codingbuddy-claude-plugin`

- **New Skills (6 skills)**
  - `performance-optimization`: Profiling-first optimization workflow
  - `database-migration`: Zero-downtime schema changes with expand-contract patterns
  - `dependency-management`: Systematic package updates, CVE response, license compliance
  - `incident-response`: Organizational incident handling with severity classification
  - `pr-review`: Systematic, evidence-based PR review with anti-sycophancy principles
  - `refactoring`: Tidy First structured refactoring workflow

- **New Domain Specialists (4 agents)**
  - `migration-specialist`: Strangler Fig, legacy modernization, zero-downtime migrations
  - `observability-specialist`: OpenTelemetry, distributed tracing, SLI/SLO frameworks
  - `event-architecture-specialist`: Message queues, Saga patterns, real-time communication
  - `integration-specialist`: External API integrations, retry strategies, circuit breakers

- **Context Document System**
  - Fixed file `docs/codingbuddy/context.md` persists PLAN → ACT → EVAL context
  - Survives context compaction in long conversations
  - `read_context` / `update_context` MCP tools
  - Automatic PLAN mode reset, ACT/EVAL mode append behavior

- **Session Document Feature**
  - `create_session` / `get_session` / `get_active_session` / `update_session` MCP tools
  - i18n support for session documents
  - Auto-session creation for PLAN/AUTO modes

- **MCP Server Improvements**
  - Auto-detect project root via `roots/list` MCP capability
  - Auto-update `.gitignore` during `codingbuddy init`
  - AUTO mode keyword recognition across all AI tools
  - Improved async utilities and slug generation

### Changed

- **Architecture Refactoring**
  - Strategy pattern for agent resolution (ADR-001)
  - Session module decomposition (ADR-002)
  - Context Document System design (ADR-003)
  - Extracted shared test utilities to common files
  - Keyword, session, and pattern strategy module extraction

- **Test Coverage Improvements**
  - CLI prompt test coverage: 60% → 90%
  - Comprehensive ContextDocumentService tests
  - Shared test utilities for reusability

- **Primary Agent Resolution**
  - Bug fixes for resolution priority
  - Agent language now follows project config

### Fixed

- Context loss after conversation compaction (Context Document System)
- `parse_mode` language configuration not applied
- AUTO mode keyword recognition bug
- Primary agent resolution priority bugs

### Breaking Changes

- **Context Document System**: Previous session-based context is replaced with fixed-file approach
- Requires `docs/codingbuddy/context.md` for cross-mode persistence

---

## [2.4.1] - 2026-01-15

### Fixed

- Canary deployment timestamp mismatch

---

## [2.4.0] - 2026-01-14

### Added

- Integration Specialist Agent pipeline activation
- Delegation rules for specialist agents

---

## [2.3.0] - 2026-01-12

### Added

- File-based state persistence (hybrid approach)
- Auto-session creation for PLAN/AUTO modes
- Session caching improvements

---

## [2.2.0] - 2026-01-10

### Added

- Session document feature for PLAN → ACT agent recommendation persistence
- i18n support for session documents

### Fixed

- `parse_mode` language configuration issues

---

## [2.1.0] - 2026-01-08

### Added

- AUTO mode keyword recognition across all AI tools
- Agent language follows project config setting

---

## [2.0.0] - 2026-01-06

### Added

- **PLAN Mode Primary Agents** with intent-based resolution
  - `solution-architect.json`: High-level system design and architecture planning
  - `technical-planner.json`: Low-level implementation planning with TDD and bite-sized tasks
  - Intent-based automatic selection between architects based on prompt analysis
  - Support for Korean and English intent patterns

- **AI Model Selection and Resolution**
  - CLI init prompt for model selection (Sonnet/Opus/Haiku)
  - `ai.defaultModel` configuration field in `codingbuddy.config.js`
  - Agent-level model preferences with priority resolution (agent > mode > system)
  - `resolvedModel` field in MCP tool responses

- **Parallel Agent Execution Support**
  - `get_agent_system_prompt` MCP tool for generating subagent prompts
  - `prepare_parallel_agents` MCP tool for batch agent preparation
  - `parallelAgentsRecommendation` in `parse_mode` response
  - Default specialist lists per mode (PLAN/ACT/EVAL)

- **Dynamic Language Configuration**
  - `LanguageService` supporting 10 languages (ko, en, ja, zh, es, de, fr, pt, ru, hi)
  - `languageInstruction` field in `parse_mode` response
  - Automatic language detection from project config

- **Agent Activation Transparency**
  - `ActivationMessageBuilder` for clear agent activation reporting
  - `activation_message` field showing active agents with tiers

### Changed

- **Primary Agent Resolution**
  - Extended `PrimaryAgentSource` type to include `intent`
  - Priority order: explicit > config > intent > context > default
  - Centralized Primary Agent constants with `_LIST` variants

- **Token Usage Optimization**
  - Mode-based `core.md` filtering to reduce token consumption
  - Shared `ResponseUtils` for consolidated response generation

### Fixed

- Canary deployment timestamp mismatch bug
- Type assertions replaced with proper typing in keyword service

---

## [1.0.0] - 2025-11-20

### Added
- **Common Rules Repository** (`.ai-rules/`)
  - `rules/core.md`: Workflow modes (PLAN/ACT/EVAL), agent activation, communication rules
  - `rules/project.md`: Tech stack, project structure, development rules, domain knowledge
  - `rules/augmented-coding.md`: TDD principles, code quality standards, commit discipline
- **Specialist Agents** (12 agents)
  - Frontend Developer, Code Reviewer
  - Architecture, Test Strategy, Performance, Security
  - Accessibility, SEO, Design System, Documentation
  - Code Quality, DevOps Engineer
- **AI Tool Integrations** (6 tools)
  - Cursor: `.cursor/rules/imports.mdc`
  - Claude Code: `.claude/rules/custom-instructions.md`
  - Antigravity: `.antigravity/rules/instructions.md`
  - GitHub Copilot: `.github/copilot-instructions.md`
  - Amazon Q: `.q/rules/customizations.md`
  - Kiro: `.kiro/rules/guidelines.md`
- **Integration Guides** (6 adapters)
  - Detailed guides for each AI tool in `.ai-rules/adapters/`
- **Validation System**
  - `scripts/validate-rules.sh`: Automated structure and file validation
- **Documentation**
  - `.ai-rules/README.md`: Comprehensive guide (11KB)
  - `implementation_plan.md`: Detailed implementation plan
  - `task.md`: Task checklist
  - `walkthrough.md`: Complete implementation walkthrough

### Changed
- Removed Cursor-specific paths from common rules
  - Changed `.cursor/agents/` → `.ai-rules/agents/` in `core.md` and `project.md`
  - Changed `.mdc` → `.md` references for consistency
- Transformed Cursor rules to AI-agnostic format
  - Removed frontmatter metadata (globs, alwaysApply) from common rules
  - Maintained tool-specific features in individual tool directories

### Fixed
- Cursor path dependencies in common rule files
- File extension references consistency

## [Unreleased]

### Planned
- Real-world usage testing across all 7 AI tools (including OpenCode)
- Performance metrics collection
- User feedback integration
- Advanced examples and use cases

---

## Version Numbering

- **Major version** (X.0.0): Breaking changes to common rules structure
- **Minor version** (0.X.0): New AI tool integrations, new specialist agents
- **Patch version** (0.0.X): Bug fixes, documentation updates, minor improvements

## Migration Guides

### Upgrading from Cursor-only to Multi-AI (1.0.0)

**Before (Cursor-only)**:
```
.cursor/rules/
├── core.mdc
├── project.mdc
└── augmented-coding.mdc
```

**After (Multi-AI 1.0.0)**:
```
.ai-rules/rules/          # Common rules (all tools)
├── core.md
├── project.md
└── augmented-coding.md

.cursor/rules/
├── imports.mdc           # References .ai-rules/
├── core.mdc              # Kept for compatibility
├── project.mdc
└── augmented-coding.mdc
```

**Action Required**: None - backwards compatible. Cursor continues to work with existing `.mdc` files while also referencing common rules via `imports.mdc`.

---

## Maintenance

When updating rules:
1. Update `.ai-rules/rules/*.md` for changes affecting all AI tools
2. Update this CHANGELOG with changes under `[Unreleased]`
3. When releasing, move `[Unreleased]` items to new version section
4. Tag the release: `git tag -a v1.0.0 -m "Release v1.0.0"`

## Links

- [Implementation Plan](../implementation_plan.md)
- [Walkthrough](../walkthrough.md)
- [README](.ai-rules/README.md)
