# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
