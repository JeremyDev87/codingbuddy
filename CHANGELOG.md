# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.1.2] - 2026-03-29

### Added
- **StatusLine HUD**: Real-time session metrics in Claude Code UI (mode, cost, cache rate, context usage)
- **tmux sidebar**: Auto-setup TUI dashboard as sidebar pane when running in tmux
- **`validate_plugin_manifest` tool**: Validate Claude Code plugin.json against known schema with fix suggestions
- **`pre_release_check` tool**: Pre-release validation with ecosystem auto-detection (Node.js, Python, Go, Rust, Java)
- **Release checklist domain**: 10 items across version consistency, lockfile sync, manifest validation, CI quality gate
- **Release config schema**: `release` section in codingbuddy.config.json for version files, lockfile, coverage threshold
- **EVAL release detection**: Auto-include release checklist when version-related keywords detected in EVAL/AUTO mode
- **CI schema validation**: plugin.json and marketplace.json JSON Schema validation in dev workflow
- **HUD state module**: Cross-hook state management for statusLine and mode detection

### Fixed
- `bump-version.sh` now runs `yarn install` to prevent lockfile drift after peerDependencies changes

### Changed
- `CODINGBUDDY_AUTO_TUI` defaults to `0` — tmux sidebar replaces standalone TUI for Claude Code users

## [5.1.0] - 2026-03-28

### Added
- **Impact Telemetry**: Session impact report on stop hook — track issues prevented, agents dispatched, checklists applied
- **Impact Module**: ImpactEventService + ImpactReportService with JSONL persistence
- **get_session_impact MCP tool**: Query session telemetry data
- **Event logging**: 5 MCP handlers now emit impact events (parse_mode, dispatch_agents, generate_checklist, update_context, search_rules)
- **Buddy experience**: Typing animation, agent handoff animation, mini bar chart, session summary
- **First-run onboarding tour**: Interactive walkthrough for new users
- **Achievement system**: Badges for coding habits
- **ASCII fallback mode**: Buddy character rendering without Unicode
- **Adaptive performance mode**: Auto-adjust hook processing based on system load
- **taskMaestro review agent**: Dedicated review pane with CI-first checklist
- **taskMaestro conductor review cycle**: Automated PR review before completion
- **/ship skill**: Built-in local CI checks and PR creation
- **/onboard skill**: New project setup wizard
- **/retrospective skill**: Session review and insights
- **/plan-to-issues skill**: Convert plans to GitHub issues
- **Context history archive**: Cross-session decision tracking
- **Diff-based agent recommendation**: Smarter agent selection based on changed files
- **Rule effectiveness insights**: Track which rules catch issues
- **i18n expansion**: PT-BR, DE, FR (now 8 languages total)
- **Windsurf and Aider adapters**: 8 AI tools now supported
- **Adapter auto-sync**: `yarn sync-rules` mechanism
- **E2E test pipeline**: Plugin hooks integration testing
- **Marketplace workflow self-trigger**: CI deploys on workflow changes

### Fixed
- Security checks now run for all workspaces regardless of affected paths
- HOOK_COMMAND path quoting for home directories with spaces
- Backward-compatible hook detection using substring matching
- Session ID fallback when env var missing
- Batch achievement notifications to prevent text wall
- Reduced PreToolUse information overload with priority-based display
- Removed automatic TUI launch (memory optimization for multi-session)

### Changed
- README revamped with marketing focus and Impact Telemetry showcase

## [5.0.0] - 2026-03-26

### ⚠️ Paradigm Shift: Library → Framework

Codingbuddy v5.0 transitions from an MCP-only rules library to a **full AI coding framework** with Claude Code Plugin as the primary delivery mechanism, harness engineering via hooks, and autonomous execution loops.

**What changed:**
- **Primary entry point** is now the Claude Code Plugin (MCP server remains for other AI tools)
- **Harness engineering**: PreToolUse/PostToolUse hooks enforce quality gates automatically
- **Autonomous loops**: Ralph Loop, Autopilot, and Ultrawork for self-correcting execution
- **Agent collaboration**: Discussion engine with opinion protocol for multi-agent debates
- **Observability**: Web dashboard, execution history DB, and Slack/Discord/Telegram notifications

### Added

- **Plugin System**: PreToolUse and PostToolUse hook lifecycle with crash-safe decorator (#824)
- **Plugin System**: hooks.json registration format with mtime-cached config loader (#824)
- **Plugin System**: Quality gate enforcement via PreToolUse hook (#824)
- **Plugin System**: Auto-learning pattern detection engine (#816)
- **Plugin System**: Per-agent persistent memory across sessions (#947)
- **Plugin System**: Conflict predictor for git history collision analysis (#946)
- **Plugin System**: Adaptive hook timeout tracking (#945)
- **Plugin System**: Smart pre-commit test runner for related test suggestions
- **Plugin System**: Health check diagnostic module
- **Plugin System**: System prompt injection module (#828)
- **Plugin System**: Event-driven notification service for Slack, Discord, Telegram (#829)
- **Harness**: Wire auto-learning pattern detector into stop hook (#929)
- **Harness**: File-based event bridge for Plugin→MCP communication
- **Harness**: Lazy mtime-based file watcher module (#826)
- **Harness**: SQLite execution history database (#827)
- **Harness**: Operational statistics tracker (#825)
- **Harness**: Rule effectiveness tracking with MCP tool (#948)
- **Dashboard**: Web dashboard for execution history and cost tracking (#822)
- **TUI**: Agent collaboration visualization with debates and consensus (#831)
- **TUI**: Collaboration data flow pipeline (EVAL → TUI)
- **MCP Server**: Unified agent registry in `dispatch_agents`
- **MCP Server**: AgentOpinion protocol and discussion engine
- **MCP Server**: Plan-reviewer as automatic gate after PLAN completion
- **MCP Server**: Real-time specialist execution visibility via Teams messaging
- **MCP Server**: Session issue tracking in `update_context`
- **MCP Server**: Deep thinking instructions in `parse_mode` PLAN response
- **MCP Server**: Teams execution strategy in `dispatch_agents`
- **MCP Server**: Dispatch strength for specialist recommendations
- **MCP Server**: `validate_parallel_issues` tool for file-overlap detection
- **Pipeline**: Sequential task pipeline engine with data passing (#814)
- **CLI**: `codingbuddy init` project setup wizard
- **CLI**: npx codingbuddy CLI entry point
- **Agents**: Plan-reviewer agent and plan-and-review skill
- **Agents**: Parallel-orchestrator agent definition
- **Agents**: Unique color identifiers for all 35 agent definitions
- **Skills**: 40+ new and enhanced skills including taskmaestro, deepsearch, git-master, build-fix, finishing-a-development-branch, verification-before-completion, requesting-code-review, receiving-code-review, using-git-worktrees, writing-plans, skill-creator, parallel-issues, plan-to-issues, test-coverage-gate, cross-repo-issues, retro, tmux-master, agent-discussion-panel, cost-budget-management
- **Skills**: Argument hints, allowed-tools, and context fork fields for skill metadata
- **Sync**: Multi-tool settings sync automation (#821)
- **Wiki**: Auto-generated project wiki with architecture map, API inventory, and decision log
- **Rules**: Parallel execution guidelines
- **Rules**: Continuous execution directive for parallel workers
- **Rules**: Auto-dispatch enforcement rule for specialists
- **Rules**: Operational safety rules
- **Rules**: Permission presets for parallel-execution and development workflows
- **Keyword**: Pattern-based primary agent resolution via `explicit_patterns`

### Changed

- **Architecture**: Primary delivery shifted from MCP-only to Claude Code Plugin + MCP
- **Agent Discussion**: Wired agent discussion config into EVAL mode

### Fixed

- **Dashboard**: Add PRAGMA busy_timeout and schema integration tests
- **MCP Server**: Remove yarn prefix from scripts to prevent state file crash
- **Landing Page**: Make #agents-all anchor link functional
- **Rules**: Fix markdownlint ordered list prefix in writing-plans SKILL.md (#913)
- **Skills**: Prevent stale RESULT.json/TASK.md pollution in worktrees
- **Build**: Remove stale RESULT.json/TASK.md from master and add to gitignore

### Performance

- **Plugin**: Reduce PostToolUse hook per-call I/O with singleton and batching

### Docs

- **Rules**: Translate all Korean text to English in .ai-rules
- **Rules**: Enforce API documentation verification in PLAN phase (#913)
- **Rules**: Add Output Language rule for English-only artifacts
- **Skills**: Batch update taskMaestro process improvements (#901–#916)

---

## [4.5.0] - 2026-03-12

### Added

- **MCP**: TaskMaestro dispatch strategy in `dispatch_agents` tool
- **MCP**: `executionStrategy` parameter for agent dispatch
- **MCP**: TaskMaestro installation detection and `availableStrategies` in `parse_mode`
- **TUI**: `useTick` heartbeat timer hook (#670)
- **TUI**: 7 pure live display functions (#669)
- **TUI**: ActivitySample with rawTimestamp and activityHistory (#671)
- **TUI**: Sparkline + throughput in StageHealthBar (#675)
- **TUI**: Animated spinner + live clock in HeaderBar (#673)
- **TUI**: Pulse icons + elapsed labels in FlowMap (#676)
- **TUI**: Elapsed timer + relative timestamps in FocusedAgentPanel (#674)
- **Rules**: Path Safety rules for monorepo (#690)
- **Rules**: Error Recovery policy with recoverable/unrecoverable distinction (#689)
- **Landing Page**: TUI Dashboard section in README

### Changed

- **TUI**: Deprecate `useClock`, wire `useTick` exports (#672)

### Fixed

- **TUI**: Correct `computeThroughput` timestamp unit from ms to seconds
- **TUI**: Stabilize `now` via useMemo to prevent non-deterministic re-renders
- **TUI**: Remove duplicate tick/now props in FocusedAgentPanelProps
- **TUI**: Mock useTick in integration tests to prevent CI timing issues
- **MCP**: Replace `require()` with ESM import in sse-auth guard test
- **MCP**: Improve SseAuthGuard timing-safe token comparison
- **Landing Page**: Migrate CSP from unsafe-inline to nonce-based
- **Release**: Add .mcp.json to bump-version and verify-release scripts

### Tests

- TUI coverage for useTick, FlowMap, FocusedAgentPanel

---

## [4.4.0] - 2026-03-04

### Added

- **Model**: Add multi-provider model support with provider-level prefixes
- **MCP**: Add client-type detection for opencode/crush and cursor with platform-specific parallel agent hints
- **MCP**: Add `get_skill` chaining hint to `recommend_skills` tool
- **MCP**: Add opencode-specific sequential specialist dispatch hint
- **MCP**: Add `projectRootWarning` diagnostic to `parse_mode`
- **Config**: Track project root resolution source
- **Skills**: Add 12 new skill definitions (security-audit, documentation-generation, code-explanation, tech-debt, agent-design, rule-authoring, mcp-builder, context-management, deployment-checklist, error-analysis, legacy-modernization, prompt-engineering)
- **Skills**: Add i18n keyword triggers for 12 skills (KO/JA/ZH/ES)

### Fixed

- **Skills**: Align agent-design skill JSON examples with `agent.schema.json`

### Tests

- Add client-type detection and hint branching tests
- Add `recommend_skills` nextAction and chaining hint tests
- Add keyword trigger tests for 12 skills

### Docs

- Audit and enhance adapter documentation for Codex, Antigravity, Kiro, OpenCode, and Cursor
- Add MCP configuration and project root detection docs across all adapters
- Add specialist agents execution patterns across all adapters
- Reorganize skill catalog with categorized tables

## [4.3.0] - 2026-02-20

### Added

- **TUI FlowMap**: Replace U-curve arrows with tree connectors for cleaner agent hierarchy visualization (#574)
- **TUI FlowMap**: Wire `activeStage` and add per-stage agent statistics (#571)
- **TUI FlowMap**: Add `isParallel` flag and execution mode display for agent nodes (#550)
- **TUI FlowMap**: Extend `renderAgentTree` to support multi-level agent subtree rendering (#557)
- **TUI ActivityVisualizer**: Redesign Activity and Live panels for improved clarity (#551)
- **TUI Footer**: Track and display Agent, Skill, and Tool invocation counts
- **TUI ChecklistPanel**: Split `ChecklistPanel` from `FocusedAgentPanel` for independent display (#548)
- **TUI Agent Visibility**: Replace tool-centric display with real agent visibility (#549)
- **TUI Restart**: Implement TUI restart capability via MCP tool and CLI flag (#545)
- **Agents**: Add `software-engineer` as default ACT agent (#568)
- **Agents**: Add `data-scientist` as ACT primary agent (#566)
- **Agents**: Add `systems-developer` as ACT primary agent (#565)
- **Agents**: Add `security-engineer` as ACT primary agent
- **Agents**: Add `test-engineer` as ACT primary agent (#563)
- **Keyword Patterns**: Add refactoring and type definition patterns to backend keyword detection (#567)

### Fixed

- **TUI FlowMap**: Show intermediate progress values in progress bars (#572)
- **TUI FlowMap**: Remove stale agents from FlowMap after completion (#570)
- **TUI HeaderBar**: Fix header bar overflow, workspace path display, and remove `sess:` prefix (#547)
- **Keyword Types**: Add `ai-ml-engineer` to `ACT_PRIMARY_AGENTS` (#562)
- **Mode Handler**: Auto-inherit `recommendedActAgent` from context in ACT mode (#561)

## [4.2.0] - 2026-02-18

### Added

- **TUI Multi-Session**: Multi-session support and auto-open TUI on MCP connection (#485)
- **TUI Auto-Launch**: Enable auto-launch via `--tui` CLI flag (#522)
- **TUI ActivityVisualizer**: Replace MonitorPanel with ActivityVisualizer panel (#482)
- **TUI FlowMap**: Enhanced with visual hierarchy, pipeline header, and progress bars (#468)
- **TUI MonitorPanel**: Event log, agent timeline, and task progress display
- **TUI Objectives**: Wire up objectives from `parse_mode` response (#473)
- **TUI Events**: SKILL_RECOMMENDED event in dashboard state (#474)
- **TUI Events**: Pre-register specialists on PARALLEL_STARTED event (#475)
- **TUI Events**: Sync running agent stage on MODE_CHANGED (#476)
- **TUI Events**: Extract `recommended_act_agent` and `parallelAgentsRecommendation` from `parse_mode` (#477)
- **TUI Progress**: Progress estimation via TOOL_INVOKED count (#472)
- **TUI Layout**: Double FocusedAgent panel width (#466)
- **TUI Layout**: Precise grid layout system (#458)
- **TUI Layout**: Fixed-width right-aligned FocusedAgent with responsive FlowMap (#462)
- **TUI StageHealthBar**: Live tool invocation count replaces hardcoded tokenCount (#490)
- **TUI Checklist**: Populate initial checklist from `parse_mode` and improve task completion tracking (#504)
- **TUI FocusedAgent**: Avatar, sparkline, and improved progress bar (#505)
- **TUI Theme**: Unified panel border colors via centralized BORDER_COLORS constant (#494)
- **TUI Context**: Display decisions/notes from context:updated in FocusedAgentPanel (#515)
- **TUI Session**: Reset dashboard state on `/clear` command via SESSION_RESET event (#499)
- **Config**: Tool-priority rules establishing codingbuddy MCP priority over OMC (#516, #512)
- **MCP Server**: TDD execution continuity rules to prevent RED phase halt (#463)
- **GitHub**: Copilot Code Review with custom instructions (#460)
- **Docs**: TUI troubleshooting guide for auto-launch startup issues (#520)

### Changed

- **TUI Activity**: Replace Activity heatmap with horizontal bar chart (#517)
- **TUI Layout**: Reduce FocusedAgent panel width by ~10% and expand Activity/FlowMap panels (#501)
- **TUI Tasks**: Consolidate task:synced into single pass and fix event ordering (#504)

### Fixed

- **TUI HeaderBar**: AUTO mode displayed incorrectly as sequential step in process flow (#488)
- **TUI Tasks**: Tasks panel shows no data in PLAN/EVAL modes — `extractFromUpdateContext` now reads decisions/findings/notes (#492)
- **TUI Live**: Live panel shows almost no data — replaced time-windowed bubbles with `renderLiveContext` (#502)
- **TUI Progress**: Progress percentage stuck at 0% due to agentId mismatch between TOOL_INVOKED and primary agent (#503)
- **TUI AutoLauncher**: Resolve absolute binary path for TuiAutoLauncher (#519)
- **Build**: Include TUI bundle in main build script to prevent stale exports
- **Config**: Exclude `.next` and build artifacts from prettier and tsconfig (#496)

### Removed

- **MCP Server**: Unused code and dead exports (#486)
- **TUI**: Deprecated text-formatter functions from pure components

## [4.1.0] - 2026-02-17

### Added

- **TUI Dashboard**: Ink-based terminal UI with Header, AgentCard, AgentTree, AgentGrid, StatusBar, and ProgressBar components
- **TUI EventBus**: EventEmitter2-based event system with `useEventBus` and `useAgentState` React hooks
- **TUI IPC**: Standalone TUI process with Unix Domain Socket inter-process communication
- **TUI Compact Design**: Single-line layout optimized for 24-line terminals
- **TUI Interceptor**: MCP tool dispatch layer for real-time UI updates
- **Landing Page**: Next.js 16 multilingual (5 languages) landing page with production-ready setup
  - Widget Slot architecture (AgentsShowcase, CodeExample, QuickStart widgets)
  - shadcn/ui component library with theming and cookie consent
  - Self-hosted fonts via `next/font`
  - next-intl i18n configuration with parallel routes and locale slot layout
  - Static sections: Hero, Problem, Solution, FAQ
  - Header with language selector and theme toggle, Footer with accessibility improvements
  - Vercel deployment configuration with analytics integration
  - JSON-LD structured data for SEO (#424)
  - WCAG 2.1 AA accessibility statement
- **MCP Server**: Bearer token authentication for SSE endpoints (#416)
- **Agent System**: `dispatch_agents` tool and auto-dispatch in `parse_mode` response (#328)
- **Intent Patterns**: Added `frontend-developer` and `devops-engineer` intent patterns for recommendation
- **EVAL Mode**: `recommendedActAgent` support in EVAL mode (#361)

### Changed

- **Prettier**: Reformatted entire codebase with `printWidth: 100` (#423)
- **MCP Server**: Extracted shared `rules-core` and `keyword-core` modules (#415)
- **Plugin**: Removed duplicate `syncVersion` from build script (#418)

### Fixed

- Plugin `isPathSafe()` path normalization and case-insensitive matching (#419)
- MCP server `appendContext` `findLastIndex` merge logic (#410)
- MCP server `bootstrap()` unhandled Promise rejection handler
- MCP server unsafe type assertion runtime validation (#411)
- Landing page `html lang` attribute set from locale at server render time (#412)
- Landing page removed radix-ui meta-package, using `@radix-ui/react-dialog` directly (#413)
- `validate-rules.sh` updated to reference correct `.ai-rules` path (#422)
- Keyword intent-based resolution skips project config in recommendation mode
- Plugin typo `codebuddy` corrected to `codingbuddy` in dev path patterns
- CI release-drafter pinned to SHA and aligned setup action versions

### Documentation

- TUI user guide, architecture, and troubleshooting documentation
- Landing page README with deployment guide and project structure
- Fixed agent count mismatch across documentation (#421)
- MCP_SSE_TOKEN environment variable documentation (#416)
- JSON-LD implementation plan (#424)

### Tests

- Context-document handler tests (#417)
- TUI EventBus-UI, App root, and transport integration tests
- TUI performance and stability verification tests
- Landing page root layout and CSP headers tests
- Landing page async server component tests

---

## [4.0.1] - 2026-02-04

### Added

- Automated version consistency verification for release process to prevent package.json/git tag mismatches (#305)
- New verification script (`scripts/verify-release-versions.sh`) with clear error messages and fix instructions

### Changed

- Updated release workflow with fail-fast verification step
- Simplified claude-code-plugin README documentation

## [4.0.0] - 2026-02-03

### ⚠️ Breaking Changes

#### Model Resolution Priority Changed

**Before (v3.x)**:
1. Agent JSON → `model.preferred`
2. Mode Agent → `model.preferred`
3. Global Config → `ai.defaultModel`
4. System Default

**After (v4.0.0)**:
1. Global Config → `ai.defaultModel` (highest priority)
2. System Default

#### Config File Format Changed to JSON-only

**Before (v3.x)**: Both `codingbuddy.config.js` and `codingbuddy.config.json` supported

**After (v4.0.0)**: Only `codingbuddy.config.json` supported

**Why**: JavaScript config files cannot be loaded in ESM projects (`'type': 'module'`), causing the MCP server to fail finding the language setting. JSON format is module-system independent.

**Migration**: Convert existing `codingbuddy.config.js` to `.json` format:
- Remove `module.exports` wrapper
- Use double quotes for keys and strings
- Remove trailing commas

**Before**:
```javascript
module.exports = {
  language: 'en',
}
```

**After**:
```json
{
  "language": "en"
}
```

#### Removed CLI Options

- `--format` option removed from `codingbuddy init` command (JSON is now the only format)

#### Migration Guide

1. **No action required if using global config**: If you already set `ai.defaultModel` in `codingbuddy.config.json`, your configuration will continue to work.

2. **Agent JSON model fields are now ignored**: If you customized agent model preferences in `packages/rules/.ai-rules/agents/*.json`, those settings no longer apply. Use `codingbuddy.config.json` instead:

**codingbuddy.config.json**:
```json
{
  "ai": {
    "defaultModel": "claude-opus-4-20250514"
  }
}
```

#### Removed APIs

- `ModelResolverService.resolveForMode()` → Use `resolve()` instead
- `ModelResolverService.resolveForAgent()` → Use `resolve()` instead
- `ModelSource` type: `'agent'` and `'mode'` variants removed
- `ResolveModelParams`: `agentModel` and `modeModel` parameters removed

### Added

- **Verbosity System**: Token-optimized response formatting with configurable verbosity levels (`minimal`, `compact`, `standard`, `detailed`)
- **PR All-in-One Skill**: Unified pull request workflow combining review, approval, and merge operations
- **SRP Complexity Classifier**: Multi-language support for Single Responsibility Principle analysis

### Changed

- Deprecated session module removed and references cleaned up
- Migrated from Dependabot to Renovate for dependency management
- All dependencies pinned to exact versions for reproducibility

---

## [3.1.1] - 2026-01-27

### Added

- Auto-include skills and agents in parse_mode response

### Fixed

- CI workflow now ensures Dependabot PRs include yarn.lock updates

---

## [3.1.0] - 2026-01-20

### Added

- SRP complexity classifier with multi-language support
- Plugin guide documentation for all supported languages
