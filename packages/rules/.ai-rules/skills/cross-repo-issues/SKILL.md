---
name: cross-repo-issues
description: Use when a bug or feature request belongs in an upstream, parent, or dependency repository rather than the current one. Guides detection, mapping, and safe cross-repo issue creation with user confirmation.
---

# Cross-Repo Issue Creation

## Overview

Not every issue belongs in the repository where it was discovered. Bugs in forked code belong upstream. Problems in a monorepo dependency belong in that dependency's repo. Filing issues in the wrong place wastes maintainer time and delays fixes.

**Core principle:** ALWAYS confirm the target repository with the user before creating an issue elsewhere. Never auto-create issues in repositories you don't own.

**Iron Law:**

```
NO CROSS-REPO ISSUE CREATION WITHOUT EXPLICIT USER CONFIRMATION
```

## When to Use

- Bug discovered in forked code that should be reported upstream
- Issue in a monorepo sub-package that belongs in the package's source repo
- Bug in a third-party dependency that should be filed in the library's repo
- Feature request that affects an upstream project
- Security vulnerability that needs to be reported to the upstream maintainer

**Use this ESPECIALLY when:**
- Working in a fork and the bug exists in the original repo
- A monorepo package wraps an external library and the bug is in the library
- You need to coordinate fixes across multiple repositories

## When NOT to Use

- Issue is local to the current repository (use normal issue workflow)
- You don't have access to the target repository
- The upstream project is archived or unmaintained
- Simple configuration issues that are project-specific

## Configuration

Add `upstreamRepos` to your `codingbuddy.config.json`:

```json
{
  "upstreamRepos": {
    ".": "original-owner/original-repo",
    "packages/ui": "design-system/ui-kit",
    "dep:react": "facebook/react"
  }
}
```

### Key Conventions

| Key Pattern | Meaning | Example |
|-------------|---------|---------|
| `"."` | Current repo is a fork of this upstream | `"original-owner/repo"` |
| `"packages/..."` | Monorepo package maps to external repo | `"org/package-repo"` |
| `"dep:<name>"` | npm/pip dependency maps to its source repo | `"facebook/react"` |

### Minimal Configuration

For a simple fork, only one entry is needed:

```json
{
  "upstreamRepos": {
    ".": "upstream-owner/upstream-repo"
  }
}
```

## The Three Phases

### Phase 1: Detect — Identify Where the Issue Belongs

**Determine if the issue should go to another repository:**

1. **Check the code origin**
   - Is the buggy code from an upstream repo? (`git log --follow <file>`)
   - Is it in a vendored or forked dependency?
   - Does `git remote -v` show an upstream remote?

2. **Check the config mapping**
   - Read `upstreamRepos` from `codingbuddy.config.json`
   - Match the affected file path or package name to a mapping key
   - If no mapping exists, ask the user for the target repo

3. **Verify the issue doesn't already exist upstream**
   - Search upstream issues: `gh issue list -R <upstream> --search "<keywords>"`
   - Check for duplicates before creating

**Decision matrix:**

| Scenario | Target Repo | Key |
|----------|-------------|-----|
| Bug in forked code | Upstream repo | `"."` |
| Bug in monorepo sub-package's upstream | Package source repo | `"packages/<name>"` |
| Bug in third-party dependency | Library repo | `"dep:<package>"` |
| Bug in your own code | Current repo (stop here) | N/A |

**Completion criteria:**
- [ ] Target repository identified
- [ ] Duplicate check completed
- [ ] Issue is confirmed to belong upstream

### Phase 2: Confirm — Get User Approval

**MANDATORY: Never skip this phase.**

Present the following to the user before proceeding:

```
Cross-Repo Issue Detected:
  Source:  <current-repo> (<file-or-package>)
  Target:  <upstream-repo>
  Reason:  <why this belongs upstream>
  Title:   <proposed issue title>

Proceed with creating issue in <upstream-repo>? (y/n)
```

**Include in the confirmation:**
- The exact target repository (`owner/repo`)
- Why the issue belongs there (not here)
- Proposed issue title and summary
- Whether user has write access to the target repo

**If user declines:**
- Offer to create the issue in the current repo instead
- Add a label like `upstream` or `external-dependency` for tracking

**Completion criteria:**
- [ ] User explicitly confirmed target repo
- [ ] User approved issue title and content

### Phase 3: Create — File the Issue

**Create the issue in the confirmed target repository:**

1. **Format the issue body**

```markdown
## Description

<Clear description of the issue>

## Reproduction

- Repository: <your-repo> (discovered while working on <context>)
- File/Package: <affected file or package>
- Steps to reproduce: <steps>

## Expected Behavior

<what should happen>

## Actual Behavior

<what actually happens>

## Environment

- Version: <upstream version in use>
- OS: <if relevant>

## Additional Context

Discovered in downstream repo: <your-repo-url>
```

2. **Create the issue**

```bash
gh issue create -R <owner/repo> \
  --title "<title>" \
  --body "<body>"
```

3. **Link back to current repo (optional)**
   - Create a tracking issue in current repo referencing the upstream issue
   - Add label: `blocked-upstream` or `waiting-upstream`

```bash
gh issue create \
  --title "Tracking: <upstream-owner/repo>#<number>" \
  --body "Upstream issue: <url>\nBlocked until upstream fix is available." \
  --label "blocked-upstream"
```

**Completion criteria:**
- [ ] Issue created in target repository
- [ ] Issue URL shared with user
- [ ] (Optional) Tracking issue created in current repo

## Quick Reference

| Phase | Action | Verification |
|-------|--------|-------------|
| **1. Detect** | Identify target repo from config or code origin | Target repo confirmed |
| **2. Confirm** | Present plan to user, get explicit approval | User said yes |
| **3. Create** | File issue via `gh`, link back if needed | Issue URL available |

## Safety Checklist

Before creating any cross-repo issue:

- [ ] Target repo is correct (double-check `owner/repo`)
- [ ] Issue doesn't already exist upstream (searched)
- [ ] User explicitly approved the creation
- [ ] Issue body is professional and includes reproduction steps
- [ ] No sensitive/proprietary information in the issue body
- [ ] You have access to create issues in the target repo

## Red Flags — STOP

| Thought | Reality |
|---------|---------|
| "I'll just create it, the user won't mind" | STOP. Always confirm. Cross-repo actions are visible to external maintainers. |
| "It's obviously an upstream bug" | Maybe. But confirm the target repo with the user first. |
| "I'll skip the duplicate check" | Duplicate issues waste maintainer time and hurt your credibility. |
| "The config mapping is enough confirmation" | Config maps repos, but the user must confirm each issue creation. |
| "I'll include our internal details for context" | STOP. Review for sensitive information before posting to external repos. |
| "No config? I'll guess the upstream repo" | Ask the user. Wrong repo = noise for unrelated maintainers. |

## Examples

### Fork → Upstream

```
Config: { "upstreamRepos": { ".": "expressjs/express" } }

Detected: Bug in request parsing (inherited from upstream)
Target:   expressjs/express
Action:   Confirm with user → Create issue in expressjs/express
```

### Monorepo Package → Source Repo

```
Config: { "upstreamRepos": { "packages/icons": "design-org/icon-library" } }

Detected: Missing icon in packages/icons (sourced from design-org/icon-library)
Target:   design-org/icon-library
Action:   Confirm with user → Create issue in design-org/icon-library
```

### Dependency → Library Repo

```
Config: { "upstreamRepos": { "dep:zod": "colinhacks/zod" } }

Detected: Validation bug in zod usage
Target:   colinhacks/zod
Action:   Confirm with user → Search existing issues → Create if new
```
