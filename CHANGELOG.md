# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
