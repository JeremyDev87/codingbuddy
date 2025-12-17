# Remove Project-Specific Information from .ai-rules/

## Background

`.ai-rules/` was designed as a **universal AI rules template that can be shared across multiple projects**. However, it currently contains hardcoded domain, structure, and configuration information from a specific project, making it **unusable in other projects**.

## Problem

### 1. Not Reusable

When copying `.ai-rules/` to another project:
- References **non-existent domain directories** like `magazine/`, `article/`, `newsletter/`
- Guides to use **undefined scripts** like `yarn test:unit`, `yarn e2e:open`
- References **non-existent files** like `styles.mdc`

When AI follows these rules, it causes **incorrect code generation** and **confusion**.

### 2. Maintenance Difficulty

When project-specific information exists in `.ai-rules/`:
- Structure changes require **updating two places** (project + .ai-rules) simultaneously
- **Unclear distinction** between "universal" and "project-specific" information

### 3. Design Principle Violation

Original `.ai-rules/` design:
```
.ai-rules/          → Universal rules (Single Source of Truth)
.cursor/, .claude/  → Tool-specific references + Project customizations
```

The current state violates this principle.

---

## Goal

Make `.ai-rules/` a **universal template instantly applicable to any project**.

### Expected Benefits

| Before | After |
|--------|-------|
| Works only in specific project | Reusable across all projects |
| Requires extensive modifications after copying | Ready to use immediately after copying |
| Project info managed in multiple places | Project info managed only in the project |

---

## Scope

### To Remove: Project-Specific Information

| Type | Examples | Reason |
|------|----------|--------|
| **Specific domains** | `magazine/`, `article/`, `newsletter/`, `author/`, `collection/` | Domains differ per project |
| **Specific scripts** | `yarn test:unit`, `yarn e2e:open` | Should be defined in package.json |
| **Specific versions** | `Next.js@15`, `React@19` | Versions differ per project |
| **Non-existent files** | `styles.mdc` | References files that don't exist |
| **Wrong extensions** | `core.mdc`, `project.mdc` | Actual files use `.md` |

### To Keep: Universal Principles

| Type | Examples | Reason |
|------|----------|--------|
| **Architecture patterns** | Layered architecture, dependency direction | Project-agnostic principles |
| **Development methodology** | TDD, SOLID, DRY | Universal development principles |
| **Quality standards** | 90% coverage, TypeScript strict | Quality goals are shareable |
| **Workflows** | PLAN/ACT/EVAL modes | Universal working methods |

---

## Files to Modify

| File | Problem | Solution |
|------|---------|----------|
| `rules/project.md` | Specific domain structure, scripts, styles.mdc reference | Replace with placeholders and generic guides |
| `rules/augmented-coding.md` | Specific directory paths, /newsletter/ API example, wrong file references | Replace with generic examples, fix filenames |
| `rules/core.md` | Specific framework versions | Remove version references |

---

## Acceptance Criteria

### Required

- [ ] No `magazine`, `newsletter`, `article`, `author`, `collection` keywords in `.ai-rules/`
- [ ] No specific version references like `Next.js@15`, `React@19`
- [ ] No `styles.mdc` references
- [ ] All `.mdc` extension references corrected to `.md`

### Verification

```bash
# Commands below should return no results
grep -r "magazine\|newsletter\|article\|author\|collection" .ai-rules/
grep -r "Next.js@\|React@" .ai-rules/
grep -r "styles.mdc" .ai-rules/
grep -r "\.mdc" .ai-rules/
```

---

## Notes

### Principle: Generalize, Don't Delete

Simply deleting project-specific information reduces the usefulness of guidelines. Instead:

- **Specific examples** → **Placeholders** (e.g., `article/` → `{domain}/`)
- **Specific commands** → **"Refer to project's package.json"**
- **Specific versions** → **"Latest stable version"**

### Related Documents

- `.ai-rules/README.md` - Overall system documentation
- `.ai-rules/adapters/*.md` - Tool-specific integration guides
