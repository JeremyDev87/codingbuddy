# Codingbuddy Session Documentation

A system for documenting PLAN/ACT/EVAL workflows in AI collaboration sessions.

## Purpose

- **Session Continuity**: Restore previous work context after context reset
- **Decision Tracking**: Record why designs/implementations were made
- **Knowledge Asset**: Accumulate AI collaboration history per project

---

## Quick Start

### Generate Documents via CLI

```bash
# Create PLAN document
./scripts/new-doc.sh plan my-feature

# Create ACT document
./scripts/new-doc.sh act my-feature

# Create EVAL document
./scripts/new-doc.sh eval my-feature

# Create ticket (auto-numbered)
./scripts/new-doc.sh ticket my-feature FEAT
./scripts/new-doc.sh ticket fix-login-bug BUG
```

### Output Examples

```bash
$ ./scripts/new-doc.sh plan user-auth
Created: /docs/codingbuddy/plan/user-auth-2026-01-08-1615.md

$ ./scripts/new-doc.sh ticket user-auth FEAT
Created: /docs/codingbuddy/tickets/FEAT-002-user-auth-2026-01-08-1615.md
Ticket ID: FEAT-002
```

---

## Directory Structure

```
docs/codingbuddy/
├── README.md              # This document
├── .templates/            # Document templates
│   ├── PLAN.md           # Unified template with {{key}} placeholders
│   ├── ACT.md
│   ├── EVAL.md
│   └── locales/          # Translation files (one JSON per language)
│       ├── en.json       # English translations
│       ├── ko.json       # Korean translations
│       └── ...           # Add more languages here
├── scripts/
│   └── new-doc.sh         # Document generation CLI
├── tickets/               # Ticket/issue documents
├── plan/                  # PLAN mode outputs
├── act/                   # ACT mode outputs
└── eval/                  # EVAL mode outputs
```

---

## File Naming Convention

### Tickets (tickets/)

**Format**: `{TYPE}-{NNN}-{slug}-YYYY-MM-DD-HHmm.md`

| Component | Description | Example |
|-----------|-------------|---------|
| `{TYPE}` | Ticket type | FEAT, BUG, REFACTOR |
| `{NNN}` | Sequence number (3 digits, auto) | 001, 002 |
| `{slug}` | Work summary (kebab-case) | session-documentation |
| `YYYY-MM-DD-HHmm` | Creation timestamp (auto) | 2026-01-08-1557 |

### Mode Documents (plan/, act/, eval/)

**Format**: `{slug}-YYYY-MM-DD-HHmm.md`

| Component | Description | Example |
|-----------|-------------|---------|
| `{slug}` | Work summary (kebab-case) | dynamic-version-reading |
| `YYYY-MM-DD-HHmm` | Creation timestamp (auto) | 2026-01-08-1545 |

---

## Workflow

### 1. Starting New Work

```bash
# 1. Create ticket (optional)
./scripts/new-doc.sh ticket my-feature FEAT

# 2. Create PLAN document
./scripts/new-doc.sh plan my-feature

# 3. Create ACT document
./scripts/new-doc.sh act my-feature

# 4. Create EVAL document (optional)
./scripts/new-doc.sh eval my-feature
```

### 2. Restoring Session

```bash
# Check recent documents
ls -lt plan/ | head -5
ls -lt act/ | head -5

# Find related tickets
ls tickets/ | grep "FEAT-001"
```

---

## Real Examples

### Tickets

- [FEAT-001: Session Documentation System](tickets/FEAT-001-session-documentation-2026-01-08-1557.md)
- [BUG-001: Hardcoded Version](tickets/BUG-001-hardcoded-version-2026-01-08-1616.md)

---

## Document Status

| Status | Meaning | Used In |
|--------|---------|---------|
| Draft | In progress | PLAN, Ticket |
| Approved | Approved | PLAN |
| In Progress | In progress | ACT |
| Completed | Completed | ACT |
| Blocked | Blocked | ACT |
| Reviewed | Review complete | EVAL |
| Action Required | Action needed | EVAL |
| Superseded | Replaced by new doc | All |

---

## Cross-References

Each document references related documents:

```markdown
## Related Documents

| Type | Link |
|------|------|
| Ticket | [FEAT-001-xxx](../tickets/FEAT-001-xxx-2026-01-08-1000.md) |
| PLAN | [xxx-2026-01-08-1000](../plan/xxx-2026-01-08-1000.md) |
| ACT | [xxx-2026-01-08-1030](../act/xxx-2026-01-08-1030.md) |
| EVAL | [xxx-2026-01-08-1100](../eval/xxx-2026-01-08-1100.md) |
```

---

## Tips

### Writing Slugs

- Use kebab-case: `my-feature-name`
- Keep concise: 3-5 words
- Use lowercase English only

### Script Location

Run from project root:

```bash
./docs/codingbuddy/scripts/new-doc.sh plan my-feature
```

Or from docs/codingbuddy directory:

```bash
cd docs/codingbuddy
./scripts/new-doc.sh plan my-feature
```

---

## Language Configuration (i18n)

The CLI script reads the `language` setting from `codingbuddy.config.js`:

```javascript
// codingbuddy.config.js
module.exports = {
  language: 'ko',  // 'en', 'ko', 'ja', 'zh', etc.
  // ...
};
```

### How i18n Works

1. **Single templates** with `{{key}}` placeholders (`.templates/*.md`)
2. **Locale JSON files** with translations (`.templates/locales/*.json`)
3. CLI replaces `{{key}}` with translated values at generation time

### Adding a New Language

1. Create `.templates/locales/{lang}.json` (copy from `en.json`)
2. Translate all values
3. Set `language: '{lang}'` in `codingbuddy.config.js`

Example: Adding Japanese support
```bash
cp .templates/locales/en.json .templates/locales/ja.json
# Edit ja.json with Japanese translations
```

### Benefits

| Metric | Old Approach | New Approach |
|--------|--------------|--------------|
| 10 languages | 30 template files | 3 templates + 10 JSON |
| Add language | Copy & translate 3 files | Add 1 JSON file |
| Template change | Update N×3 files | Update 1 file |
