# Changelog

All notable changes to the Multi-AI Coding Assistant Common Rules System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
