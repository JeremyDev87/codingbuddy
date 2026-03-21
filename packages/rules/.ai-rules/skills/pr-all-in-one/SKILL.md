---
name: pr-all-in-one
description: Unified commit and PR workflow. Auto-commits changes, creates/updates PRs with smart issue linking and multi-language support.
disable-model-invocation: true
---

# PR All-in-One

## Overview

Streamlines commit-to-PR workflow with auto-commit, smart issue linking, and multi-language support. Handles the complete flow from uncommitted changes to published PR with intelligent branch management, logical commit grouping, and context-aware PR descriptions.

## When to Use

- Any situation requiring PR creation
- When uncommitted changes exist
- When an existing PR needs updating
- When you want to handle branch creation and PR in one step
- When you want to auto-link Issue IDs to the PR

## Usage

```
/pr-all-in-one [target-branch] [issue-id]
```

**Examples:**
- `/pr-all-in-one` - PR to default branch, issue ID from branch name
- `/pr-all-in-one develop` - PR to develop, issue ID from branch name
- `/pr-all-in-one main ISSUE-12345` - PR to main with issue ID
- `/pr-all-in-one ISSUE-12345` - PR to default branch with issue ID

**Argument Parsing:**
- `target-branch`: Branch name (main, develop, master, etc.)
- `issue-id`: Matches configured issue pattern (JIRA-123, #456, ENG-789, etc.)
- Arguments can be in any order
- If only one argument provided, checks if it's an issue pattern first

## Configuration

**Location:** `.claude/pr-config.json`

First-time run: Interactive setup flow guides you through configuration.

See `configuration-guide.md` for:
- All configuration options
- Setup wizard walkthrough
- Example configurations

## Workflow (9 Steps)

```
┌─────────────────────────────────────────────────┐
│              Workflow Execution                 │
└─────────────────────────────────────────────────┘

Step 1: Parse arguments
├── Issue pattern → issue ID
├── Branch name → target branch
└── Defaults from config

Step 2: Check git status & branch
├── git status (uncommitted changes)
└── git branch --show-current

Step 3: Handle main branch case
├── If on target branch with changes
│   ├── Analyze changes for branch name
│   ├── Create new branch: git checkout -b <type>/<description>
│   └── Proceed to Step 4
└── If on target branch without changes → Exit

Step 4: Auto-commit changes
├── Analyze with git diff
├── Group by feature/purpose
└── For each group:
    ├── git add <related-files>
    ├── Conventional commit message (English)
    └── NO AI signature/Co-Authored-By

Step 5: Push to remote
└── git push -u origin <branch> (if needed)

Step 6: Check existing PR
└── gh pr view --json url,title,body

Step 7: Update existing PR (if exists)
├── Analyze all commits: git log <target>..HEAD
├── Read prLanguage from .claude/pr-config.json
├── Select template based on prLanguage:
│   ├── "en" → English Template
│   ├── "ko" → Korean Template
│   └── "bilingual" → Bilingual Template
├── Generate title:
│   ├── "en"/"bilingual" → English title
│   └── "ko" → 한국어 title
├── Generate body with selected template
├── Merge with .github/pull_request_template.md (if exists)
├── NO AI signature
└── gh pr edit --title --body

Step 8: Create new PR (if not exists)
├── Analyze all commits
├── Read prLanguage from .claude/pr-config.json
├── Select template based on prLanguage:
│   ├── "en" → English Template
│   ├── "ko" → Korean Template
│   └── "bilingual" → Bilingual Template
├── Generate title:
│   ├── "en"/"bilingual" → English (e.g., "feat: add auth")
│   └── "ko" → 한국어 (e.g., "feat: 인증 추가")
├── Generate body with selected template + commit analysis
├── Merge with project template if exists
├── NO AI signature
└── gh pr create --draft --base <target>

Step 9: Return PR URL
└── If UI changes detected → suggest screenshots
```

### Workflow Diagram

```
                    ┌─────────────────┐
                    │  Check Config   │
                    │ pr-config.json  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     ┌────────────────┐           ┌─────────────────┐
     │  Config Exists │           │  No Config      │
     └───────┬────────┘           └────────┬────────┘
             │                             │
             │                             ▼
             │                    ┌─────────────────┐
             │                    │ Interactive     │
             │                    │ Setup (1st run) │
             │                    └────────┬────────┘
             │                             │
             └──────────────┬──────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │ Check Git      │
                   │ - branch       │
                   │ - uncommitted  │
                   └───────┬────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌──────────┐     ┌───────────┐     ┌───────────┐
   │ On main  │     │ Has       │     │ No        │
   │ branch   │     │ Changes   │     │ Changes   │
   └────┬─────┘     └─────┬─────┘     └─────┬─────┘
        │                 │                 │
        ▼                 ▼                 │
   ┌──────────┐     ┌───────────┐           │
   │ Create   │     │ Logical   │           │
   │ Branch   │     │ Group &   │           │
   └────┬─────┘     │ Commit    │           │
        │           └─────┬─────┘           │
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
                 ┌────────────────┐
                 │  Remote Push   │
                 │  (if needed)   │
                 └───────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ Check PR        │
                │ gh pr view      │
                └────────┬────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
    ┌─────────────┐            ┌─────────────┐
    │  PR Exists  │            │  No PR      │
    │  → Update   │            │  → Create   │
    └──────┬──────┘            └──────┬──────┘
           │                          │
           └────────────┬─────────────┘
                        │
                        ▼
               ┌────────────────┐
               │  Return URL    │
               │  + Screenshot  │
               │  suggestion    │
               └────────────────┘
```

## Auto-Commit Logic

Changes are automatically grouped and committed with semantic messages:

**Grouping Strategy:**
- Analyze git diff to understand logical changes
- Group related files by feature/purpose
- Create separate commits for distinct changes
- Use Conventional Commits format by default

**Commit Message Format:**
```
<type>(<scope>): <description>

[optional body]
```

**Types:** feat, fix, chore, docs, refactor, test, style, perf

**Important:**
- All commit messages in English (configurable via `commitLanguage`)
- NO AI signature (no `Co-Authored-By: Claude` etc.)
- Focus on what changed and why, not implementation details

## PR Description Format

PR descriptions are generated in the configured language and follow project templates when available.

### Output Examples by Language

#### When `prLanguage: "en"`

**Title**: `feat: add user authentication`

**Body**:
```markdown
## Context

**Related Links:**
- Issue: [AUTH-123](https://jira.example.com/browse/AUTH-123)

**Description Details:**

Added JWT-based authentication with refresh token support.

## Screenshots or Videos

N/A (no UI changes)
```

#### When `prLanguage: "ko"`

**Title**: `feat: 사용자 인증 추가`

**Body**:
```markdown
## 컨텍스트

**관련 링크:**
- 이슈: [AUTH-123](https://jira.example.com/browse/AUTH-123)

**상세 설명:**

JWT 기반 인증과 리프레시 토큰 지원을 추가했습니다.

## 스크린샷 또는 비디오

N/A (UI 변경 없음)
```

#### When `prLanguage: "bilingual"`

**Title**: `feat: add user authentication`

**Body**:
```markdown
## Context

**Related Links:**
- Issue: [AUTH-123](https://jira.example.com/browse/AUTH-123)

**Description Details:**

Added JWT-based authentication with refresh token support.

---

**상세 설명:**

JWT 기반 인증과 리프레시 토큰 지원을 추가했습니다.

## Screenshots or Videos

N/A (no UI changes / UI 변경 없음)
```

### Template Definitions

For detailed template definitions, see `pr-templates.md`.

### Project Template Integration

If `.github/pull_request_template.md` exists:
- Use project template as base structure
- Fill in placeholders automatically
- Respect template sections and formatting
- Preserve required sections

## Issue ID Resolution

Issue ID is resolved with the following priority:

1. **Explicit argument** - `/pr-all-in-one ISSUE-123`
2. **Branch name extraction** - `feat/ISSUE-123-description` → `ISSUE-123`
3. **Not available** - No issue linking in PR

**Branch Name Patterns:**
- `feat/PROJ-123-add-login` → `PROJ-123`
- `fix/123-bug-fix` → `#123` (GitHub)
- `feature/ENG-456-new-feature` → `ENG-456`
- `chore/update-deps` → N/A (no issue)

See `issue-patterns.md` for comprehensive pattern reference.

## Screenshot Guidance

When UI changes are detected in the diff:
- Suggest adding screenshots to PR description
- Provide clear instructions on how to add them
- Do NOT attempt to auto-capture screenshots
- Include placeholder in PR template

**UI Change Detection:**
- Modified files in component/UI directories
- Changes to styling files (CSS, SCSS, styled-components)
- New UI component files
- Modified template/JSX/Vue files

## Notes

**AI Signature Exclusion:**
- Commit messages: NO `Co-Authored-By: Claude` or similar
- PR descriptions: NO AI signature or generation attribution
- Focus on content, not authorship attribution

**Conventional Commits:**
- Enabled by default
- Configurable via `conventionalCommits` setting
- Improves changelog generation and semantic versioning

**Draft PR by Default:**
- PRs created as draft by default
- Allows review before marking ready
- Configurable via `draftByDefault` setting
- Author can mark ready when complete

**Branch Naming:**
- Auto-generated branches follow `branchNaming.pattern`
- Default: `{type}/{description}`
- Customizable with `{type}`, `{issue}`, `{description}` placeholders
- Types restricted to `branchNaming.types` list

## Related Documentation

- **Configuration Guide:** `configuration-guide.md`
- **Issue Patterns Reference:** `issue-patterns.md`
- **PR Templates:** `pr-templates.md`
- **Adapter Integration:** See respective adapter files
