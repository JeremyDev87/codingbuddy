# Configuration Guide

## Settings

| Setting | Type | Required | Default | Description |
|---------|------|----------|---------|-------------|
| `defaultTargetBranch` | string | ✅ | - | PR target branch |
| `issueTracker` | enum | ✅ | - | `jira`, `github`, `linear`, `gitlab`, `custom` |
| `issuePattern` | regex | ✅ | - | Issue ID matching pattern |
| `issueUrlTemplate` | string | ❌ | - | Issue URL template (`{id}` placeholder) |
| `prLanguage` | enum | ✅ | `en` | `en`, `ko`, `bilingual` |
| `commitLanguage` | enum | ❌ | `en` | Commit message language |
| `conventionalCommits` | boolean | ❌ | `true` | Use Conventional Commits |
| `branchNaming.pattern` | string | ❌ | `{type}/{description}` | Branch name pattern |
| `branchNaming.types` | array | ❌ | `["feat","fix","chore","docs","refactor","test"]` | Allowed types |
| `draftByDefault` | boolean | ❌ | `true` | Create PR as draft |

## Interactive Setup Flow

The skill uses an interactive 4-step configuration flow:

```
┌─────────────────────────────────────────────┐
│   PR All-in-One Configuration Setup         │
└─────────────────────────────────────────────┘
       ⬇
  [1/4] PR Target Branch
  ┌──────────────────────────┐
  │ Select your default PR   │
  │ target branch            │
  │ [main] [master] [dev]    │
  └──────────────────────────┘
       ⬇
  [2/4] Issue Tracker
  ┌──────────────────────────┐
  │ Which issue tracker?     │
  │ [JIRA] [GitHub Issues]   │
  │ [Linear] [GitLab]        │
  │ [Custom]                 │
  └──────────────────────────┘
       ⬇
  [3/4] PR Language
  ┌──────────────────────────┐
  │ PR description language  │
  │ [English] [한국어]        │
  │ [Bilingual] (EN + KO)    │
  └──────────────────────────┘
       ⬇
  [4/4] Issue URL Template (Optional)
  ┌──────────────────────────┐
  │ Issue URL template for   │
  │ linking in PR body       │
  │ e.g.:                    │
  │ https://domain.net/{id}  │
  └──────────────────────────┘
       ⬇
  ✅ Configuration Complete
```

### Step Details

#### Step 1: PR Target Branch
Defines the default branch for pull requests. Common options:
- `main` - Modern default branch name
- `master` - Legacy default branch name
- `dev` - Development branch
- `develop` - Extended development branch

#### Step 2: Issue Tracker
Selects which issue tracking system is used:
- **JIRA**: Enterprise issue tracking
- **GitHub Issues**: GitHub's native issue system
- **Linear**: Modern issue tracking
- **GitLab**: GitLab's issue system
- **Custom**: For other trackers

#### Step 3: PR Language

Determines the language for PR descriptions:
- **English**: PRs written in English only
- **한국어**: PRs written in Korean only
- **Bilingual**: PRs include both English and Korean

##### Detailed Language Behavior

| Value | PR Title | PR Body | Use Case |
|-------|----------|---------|----------|
| `en` | English | English only | International teams, open source projects |
| `ko` | 한국어 | 한국어만 | Korean-only teams, internal projects |
| `bilingual` | English | English + Korean | Mixed teams, global + local collaboration |

##### Language Examples

**`en` (English)**:
- Title: `feat: add user authentication`
- Body: English-only description
- Best for: Open source, international collaboration

**`ko` (Korean)**:
- Title: `feat: 사용자 인증 추가`
- Body: 한국어만 사용한 설명
- Best for: 한국어 기반 팀, 내부 프로젝트

**`bilingual` (Both)**:
- Title: `feat: add user authentication` (English)
- Body: English description followed by Korean translation
- Best for: 글로벌 팀과 한국 팀이 함께 협업하는 프로젝트

#### Step 4: Issue URL Template
Optional template for auto-generating issue links in PR bodies. Use `{id}` placeholder for the issue ID.

## Configuration Examples

### JIRA Configuration

```json
{
  "defaultTargetBranch": "main",
  "issueTracker": "jira",
  "issuePattern": "[A-Z]+-[0-9]+",
  "issueUrlTemplate": "https://your-domain.atlassian.net/browse/{id}",
  "prLanguage": "bilingual",
  "commitLanguage": "en",
  "conventionalCommits": true,
  "branchNaming": {
    "pattern": "{type}/{description}",
    "types": ["feat", "fix", "chore", "docs", "refactor", "test"]
  },
  "draftByDefault": true
}
```

**Usage**: JIRA-101, PROJ-456

### GitHub Issues Configuration

```json
{
  "defaultTargetBranch": "main",
  "issueTracker": "github",
  "issuePattern": "#[0-9]+",
  "prLanguage": "en",
  "commitLanguage": "en",
  "conventionalCommits": true,
  "branchNaming": {
    "pattern": "{type}/{description}",
    "types": ["feat", "fix", "chore", "docs", "refactor", "test"]
  },
  "draftByDefault": true
}
```

**Usage**: #123, #456

### Linear Configuration

```json
{
  "defaultTargetBranch": "main",
  "issueTracker": "linear",
  "issuePattern": "[A-Z]+-[0-9]+",
  "issueUrlTemplate": "https://linear.app/your-team/issue/{id}",
  "prLanguage": "en",
  "commitLanguage": "en",
  "conventionalCommits": true,
  "branchNaming": {
    "pattern": "{type}/{description}",
    "types": ["feat", "fix", "chore", "docs", "refactor", "test"]
  },
  "draftByDefault": false
}
```

**Usage**: ENG-123, PROJ-456

### GitLab Configuration

```json
{
  "defaultTargetBranch": "master",
  "issueTracker": "gitlab",
  "issuePattern": "#[0-9]+",
  "prLanguage": "en",
  "commitLanguage": "en",
  "conventionalCommits": true,
  "branchNaming": {
    "pattern": "{type}/{description}",
    "types": ["feat", "fix", "chore", "docs", "refactor", "test"]
  },
  "draftByDefault": false
}
```

**Usage**: #123, #456

### Custom Issue Tracker Configuration

```json
{
  "defaultTargetBranch": "develop",
  "issueTracker": "custom",
  "issuePattern": "CUSTOM-[0-9]{4,}",
  "issueUrlTemplate": "https://internal.company.com/issues/{id}",
  "prLanguage": "bilingual",
  "commitLanguage": "ko",
  "conventionalCommits": true,
  "branchNaming": {
    "pattern": "{type}/{description}",
    "types": ["feat", "fix", "chore", "docs", "refactor", "test", "style", "perf"]
  },
  "draftByDefault": true
}
```

**Usage**: CUSTOM-0001, CUSTOM-1234

## Configuration File Location

Configuration is stored at project root:
```
.claude/pr-config.json
```

Example configuration file: `.claude/pr-config.example.json`

## Updating Configuration

To update an existing configuration:
1. Edit `.claude/pr-config.json` directly, or
2. Delete the file and run `/pr-all-in-one` to restart interactive setup

## Issue Pattern Reference

### Common Issue Patterns

| Tracker | Pattern | Example |
|---------|---------|---------|
| JIRA | `[A-Z]+-[0-9]+` | `PROJ-123`, `ENG-456` |
| GitHub | `#[0-9]+` | `#123`, `#456` |
| Linear | `[A-Z]+-[0-9]+` | `ENG-123`, `DES-456` |
| GitLab | `#[0-9]+` or `GL-[0-9]+` | `#123`, `GL-456` |
| Azure DevOps | `#[0-9]+` | `#123`, `#456` |
| YouTrack | `[A-Z]+-[0-9]+` | `PROJ-123`, `SUP-456` |

## Conventional Commits Format

When `conventionalCommits` is enabled, commit messages follow this format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `chore`: Changes that don't modify code or test files
- `docs`: Documentation changes
- `refactor`: Code changes that don't fix bugs or add features
- `test`: Adding or updating tests
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `perf`: Performance improvements

### Examples

```
feat(auth): add oauth2 provider integration

fix: prevent race condition in session handler

docs: update API documentation

refactor(core): simplify request handling logic
```

## Branch Naming Convention

The default branch naming pattern is: `{type}/{description}`

### Examples

```
feat/add-user-authentication
fix/resolve-memory-leak
chore/update-dependencies
docs/api-documentation
refactor/simplify-request-handler
test/add-integration-tests
```

### Pattern with Issue ID

You can include the issue ID in branch names using the `{issue}` placeholder:

**Pattern**: `{type}/{issue}-{description}`

**Examples**:
```
feat/PROJ-123-add-user-authentication
fix/BUG-456-resolve-memory-leak
chore/TASK-789-update-dependencies
```

**Note**: The `{issue}` placeholder is extracted from the issue ID argument or auto-detected from branch context.

## Notes

- All configuration is validated before being saved
- Issue patterns are compiled as regex patterns for matching
- URL templates support `{id}` placeholder for issue ID substitution
- Bilingual mode generates both English and Korean PR descriptions
- Draft PRs can be automatically marked as ready for review
