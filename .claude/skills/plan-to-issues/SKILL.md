---
name: plan-to-issues
description: >-
  Convert a PLAN into GitHub issues with native sub-issue hierarchy.
  Use when a plan is ready to be registered as deployable,
  independent work items. Creates self-contained issues where
  each sub-issue can be independently branched, PRed, and merged.
disable-model-invocation: true
argument-hint: [plan-file-or-description]
allowed-tools: Bash, Read, Grep, Glob
user-invocable: true
---

# Plan to Issues

Convert a completed PLAN into GitHub parent + sub-issues using native sub-issue API.

Follow every step in order. Stop and report if any step fails.

## Three Principles

1. **Independent** — Each sub-issue is self-contained. A new session with zero context can start work from the issue alone.
2. **Deployable** — Each sub-issue can be independently branched, PRed, and merged without breaking existing functionality.
3. **Structured** — Issue body has essentials only. Technical details and background go into comments.

## Step 1: Determine Plan Source

Check if `$ARGUMENTS` is provided:

- **With file** (`/plan-to-issues docs/plans/my-plan.md`):
  Verify the file exists (`test -f "$ARGUMENTS"`), then read it.

- **With text** (`/plan-to-issues "Add caching layer"`):
  If `$ARGUMENTS` is not a valid file path, use it as plan description.

- **Without arguments** (`/plan-to-issues`):
  Read `docs/codingbuddy/context.md` and extract the most recent PLAN section's decisions and notes.

If no plan source is found, stop and ask the user to run PLAN first.

## Step 2: Check GitHub Environment

```bash
REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
gh label list --json name --jq '.[].name'
```

Search for existing issues with similar titles to prevent duplicates:
```bash
gh issue list --state open --search "<plan-title-keywords>" --json number,title --jq '.[] | "#\(.number) \(.title)"'
```

If duplicates found, inform the user and ask whether to continue or update existing issues.

## Step 3: Decompose into Deployable Units

Extract work units from the plan. For each candidate unit, verify:

```
For each unit:
  Can this be merged independently without breaking existing features?
  ├── YES → Keep as separate sub-issue
  └── NO  → Merge with related unit(s) into one sub-issue

  Does this modify the same files as another unit?
  ├── YES → Consider merging or enforce ordering
  └── NO  → Safe for parallel work
```

Classify dependencies:
- **Parallel** — No shared files, no ordering needed
- **Sequential** — Must complete A before B (note in comment, but both are independently deployable)

## Step 3b: Determine Labels

### Parent issue labels

Infer type from plan content:
- New functionality → `feat`
- Improving existing code → `refactor` or `chore`
- Fixing a problem → `fix`
- Documentation only → `documentation`

### Sub-issue labels

- Inherit the type label from parent
- Add priority based on plan ordering and dependencies:
  - No dependencies, foundational work → `priority:must`
  - Depends on other sub-issues → `priority:should`
  - Nice-to-have, can be deferred → `priority:could`
- Use only labels that already exist in the repository (from Step 2)
- Do NOT create new labels

## Step 4: Draft Issue Content

### Parent issue body (overview only)

```markdown
## Overview
[1-2 sentences: what and why]

## Background
[2-3 sentences: context and motivation]

## Sub-issues
Linked via GitHub native sub-issues (see Sub-issues section below).

| # | Title | Deployable | Depends on |
|---|-------|-----------|------------|
| 1 | ... | Yes | — |
| 2 | ... | Yes | — |
| 3 | ... | Yes | #1 recommended |
```

### Issue content rules

- **Titles**: Always in English, under 70 characters
- **Body/comments**: Follow the project's configured language (check codingbuddy config or recent issues)
- **Labels**: Use only existing labels from Step 2, do NOT create new labels

### Sub-issue body (essentials only)

```markdown
## Purpose
[1-2 sentences: why this work item exists]

## Changes
- `path/to/file.ts` — what changes
- `path/to/other.ts` — what changes

## Acceptance Criteria
- [ ] Specific, verifiable criterion 1
- [ ] Specific, verifiable criterion 2
- [ ] Existing tests pass
- [ ] Can be merged independently
```

### Sub-issue comments (details and background)

**Comment 1 — Technical Details:**
```markdown
## Technical Details

### Exact Changes
[Precise code/config/YAML changes to make]

### Steps
1. [Concrete step]
2. [Concrete step]
```

**Comment 2 — Background & References** (if needed):
```markdown
## Background
[Why this approach was chosen]

## References
- [Link 1](url)
- [Link 2](url)

## Dependencies
- Precedes: #NNN depends on this
- Follows: Recommended after #NNN (but independently deployable)
```

## Step 5: Confirm with User

Present a summary before creating anything:

```
Plan: "<title>"

Parent: "<parent title>" (labels: <detected labels>)
  Sub-1: "<title>" — <files> (deploy: independent)
  Sub-2: "<title>" — <files> (deploy: independent)
  Sub-3: "<title>" — <files> (deploy: independent, after Sub-1 recommended)

Total: <N> sub-issues, all independently deployable

Proceed?
```

Wait for user approval. Apply any requested changes.

## Step 6: Create Issues on GitHub

### 6a. Create parent issue

```bash
PARENT_URL=$(gh issue create \
  --title "<title>" \
  --label "<labels>" \
  --body "$(cat <<'EOF'
<parent body from Step 4>
EOF
)")
PARENT_NUM=$(echo "$PARENT_URL" | grep -o '[0-9]*$')
```

### 6b. Create sub-issues (in parallel if independent)

For each sub-issue:
```bash
SUB_URL=$(gh issue create \
  --title "<title>" \
  --label "<labels>" \
  --body "$(cat <<'EOF'
<sub-issue body from Step 4>
EOF
)")
SUB_NUM=$(echo "$SUB_URL" | grep -o '[0-9]*$')
```

### 6c. Add comments to each sub-issue

```bash
gh issue comment $SUB_NUM --body "$(cat <<'EOF'
<Comment 1: Technical Details>
EOF
)"

# Only if background/references exist:
gh issue comment $SUB_NUM --body "$(cat <<'EOF'
<Comment 2: Background & References>
EOF
)"
```

### 6d. Link sub-issues to parent via GitHub native API

```bash
# Get the internal ID (not node_id) for the sub-issue
SUB_ID=$(gh api /repos/$REPO/issues/$SUB_NUM --jq .id)

# Create native sub-issue relationship
gh api /repos/$REPO/issues/$PARENT_NUM/sub_issues \
  -X POST -F sub_issue_id=$SUB_ID --jq '.id'
```

Repeat for every sub-issue.

**If the sub-issue API fails** (HTTP 500, 422, or 404):

1. Add `sub-issue` label to the sub-issue (if the label exists)
2. Add a comment on the parent issue listing the sub-issue: `Sub-issue: #NNN — <title>`
3. Add a comment on the sub-issue: `Parent: #PARENT_NUM`
4. Inform the user: "Native sub-issue linking failed. Linked via labels and comments instead. You can manually link at github.com."
5. Continue with remaining sub-issues — do NOT stop the entire process

### 6e. Update parent body with sub-issue numbers

Edit the parent issue body to include actual sub-issue numbers in the table.

```bash
gh issue edit $PARENT_NUM --body "$(cat <<'EOF'
<updated body with #NNN references>
EOF
)"
```

## Step 7: Report Result

```
Registered <N> issues:

Parent: #<num> — "<title>"
  Sub: #<num> — "<title>" (deploy: independent)
  Sub: #<num> — "<title>" (deploy: independent)
  Sub: #<num> — "<title>" (deploy: independent, after #<num> recommended)

Comments: Technical details added to each sub-issue
Hierarchy: GitHub native sub-issues linked
```

Print all issue URLs.

## Step 7b: Update Context Document

Record the created issues in `docs/codingbuddy/context.md` for cross-session continuity.

Collect all sub-issue numbers from Step 6 into a space-separated variable `SUB_NUMS`.

```bash
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
mkdir -p docs/codingbuddy

cat >> docs/codingbuddy/context.md <<EOF

## Plan-to-Issues Result (${TIMESTAMP})

- **Parent Issue**: #${PARENT_NUM}
- **Sub-issues**: $(for n in $SUB_NUMS; do printf "#%s " "$n"; done)
- **Created At**: ${TIMESTAMP}
- **Total**: $(echo $SUB_NUMS | wc -w | tr -d ' ') sub-issues
EOF
```

If the `codingbuddy` MCP server is available, prefer calling `update_context` instead:

```
update_context({
  mode: <current_mode>,
  progress: ["Plan-to-Issues: parent #PARENT_NUM, sub-issues #N1 #N2 ..."],
  notes: ["Issues created at TIMESTAMP via plan-to-issues skill"]
})
```
