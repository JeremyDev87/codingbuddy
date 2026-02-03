# Issue Patterns Reference

## Supported Issue Trackers

| Tracker | Pattern | Example | URL Template |
|---------|---------|---------|--------------|
| **JIRA** | `[A-Z]+-[0-9]+` | `PROJ-12345`, `STUDIO-456` | `https://{domain}.atlassian.net/browse/{id}` |
| **GitHub Issues** | `#[0-9]+` | `#123`, `#4567` | `https://github.com/{owner}/{repo}/issues/{id}` |
| **Linear** | `[A-Z]+-[0-9]+` | `ENG-123`, `PROD-456` | `https://linear.app/{team}/issue/{id}` |
| **GitLab** | `#[0-9]+` | `#123` | `https://gitlab.com/{group}/{project}/-/issues/{id}` |
| **Azure DevOps** | `#[0-9]+` | `#12345` | `https://dev.azure.com/{org}/{project}/_workitems/edit/{id}` |
| **Shortcut** | `sc-[0-9]+` | `sc-12345` | `https://app.shortcut.com/{org}/story/{id}` |

## Extracting Issue ID from Branch Name

| Branch Name | Extracted ID | Tracker |
|-------------|--------------|---------|
| `feat/PROJ-123-add-login` | `PROJ-123` | JIRA |
| `fix/123-bug-fix` | `#123` | GitHub |
| `feature/ENG-456-new-feature` | `ENG-456` | Linear |
| `bugfix/STUDIO-789-fix-issue` | `STUDIO-789` | JIRA |
| `chore/sc-12345-cleanup` | `sc-12345` | Shortcut |

## Resolution Priority

1. **Explicit argument**: `/pr-all-in-one main PROJ-123`
2. **Branch name extraction**: Uses configured `issuePattern`
3. **N/A**: If not found, no issue linking

## Custom Patterns

For custom issue trackers, define in `pr-config.json`:

```json
{
  "issueTracker": "custom",
  "issuePattern": "CUSTOM-[0-9]+",
  "issueUrlTemplate": "https://tracker.example.com/issues/{id}"
}
```
