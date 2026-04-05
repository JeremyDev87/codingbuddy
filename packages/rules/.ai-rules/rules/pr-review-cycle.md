# PR Review Cycle (Canonical)

Canonical protocol for the PR review cycle in conductor/worker parallel workflows and solo workflows. This file is the single source of truth — local skills, adapter docs, and custom instructions MUST reference this document instead of duplicating the protocol.

Scope: the review loop that runs **after** a worker (or solo developer) has created a PR, until the PR is approved or explicitly failed.

## Quick Reference

| Step | Who | Output |
|------|-----|--------|
| 1. PR created | Worker (or solo dev) | `status: "success"` + PR URL |
| 2. CI gate | Reviewer | Pass/fail decision (BLOCKING) |
| 3. Review | Conductor or review agent | Structured comment on PR |
| 4. Response | Worker | Fixes pushed OR dispute posted |
| 5. Re-review | Reviewer | Approve or request more changes |
| 6. Approve | Reviewer | `status: "approved"` |

Approval criteria and severity definitions: see [`severity-classification.md`](./severity-classification.md). Commit hygiene during review fixes: see [Commit Hygiene](#commit-hygiene) below.

## Trigger

The review cycle begins when a PR is created. In conductor/worker workflows this is detected through `.taskmaestro/wt-N/RESULT.json`:

| RESULT.json `status` | Meaning | Reviewer Action |
|----------------------|---------|-----------------|
| `success` | Worker finished, PR created | Start review cycle |
| `failure` / `error` | Worker could not finish | Report to user, do not enter review |
| `review_pending` | Reviewer has posted comments, waiting on worker | Wait |
| `review_addressed` | Worker has pushed fixes | Re-review |
| `approved` | Final approval | Cycle complete ✅ |

In solo workflows the trigger is the developer opening the PR; the remaining steps are identical but run in a single session.

## Review Routing

Two review strategies exist. Conductor Review is the **default and primary** method.

### Conductor Review (default)

The conductor runs the review directly. Use this whenever a dedicated review pane is not configured.

**Rationale:** the conductor already holds the PLAN context for the task, so its review is grounded in the original requirements. Worker-level reviewers do not carry that context.

### Review Agent (optional, `--review-pane`)

A dedicated review pane takes over the review. Only used when the orchestrator was started with `--review-pane` explicitly and at least three panes are available (conductor + worker + reviewer).

The review agent follows the **same protocol** as the conductor (CI gate, code quality scan, spec compliance, test coverage, structured comment). The only differences are where the result is written and how approval is propagated back to the worker — see [Review Agent Result Handling](#review-agent-result-handling).

## The Review Protocol

Every reviewer — conductor or review agent — MUST perform these steps **in this order**.

### 1. CI Gate (BLOCKING)

```bash
gh pr checks <PR_NUMBER>
```

- ALL checks must pass before proceeding to code review.
- If ANY check fails → STOP. Report the failing job and log URL. **Do NOT approve.** **Do NOT start code review.** Return the PR to the worker as a failure.

### 2. Local Verification

Check out the PR branch and run the same lint / type / test commands CI runs. This catches issues local to the reviewer's environment and flaky CI blind spots.

```bash
git fetch origin
git checkout <branch>
yarn lint
yarn type-check
```

Any local error becomes a `critical` or `high` finding — not a CI retry.

### 3. Read the Diff

```bash
gh pr diff <PR_NUMBER>
```

Optionally call the `generate_checklist` MCP tool with the list of changed files to produce a domain-specific checklist (security, accessibility, performance, etc.) before reading the diff.

### 4. Code Quality Scan

Against the diff, look for:

- Unused imports / variables
- `any` types
- Missing error handling
- Dead code
- Layer boundary violations
- Obvious performance pitfalls

Use the Code Review Severity scale from [`severity-classification.md`](./severity-classification.md) to rate findings (`critical` / `high` / `medium` / `low`).

### 5. Spec Compliance

```bash
gh issue view <ISSUE_NUMBER>
```

Compare the issue's acceptance criteria with the implementation. List every gap as a finding.

### 6. Test Coverage

- Does new non-trivial logic have tests?
- Are edge cases and error paths covered?
- Do tests actually verify behavior, not implementation?

Missing tests on new logic is at least `high`.

### 7. Write the Review

```bash
gh pr review <PR_NUMBER> --comment --body "<structured review>"
```

Review body format:

```markdown
## Review: [APPROVE | CHANGES_REQUESTED]
### CI Status: [PASS | FAIL]
### Issues Found:
- [critical]: <description> — <file:line>
- [high]: <description> — <file:line>
- [medium]: <description> — <file:line>
### Recommendation: [APPROVE | REQUEST_CHANGES]
```

Follow the anti-sycophancy rules in `skills/pr-review/SKILL.md`: every finding must include a location (`file:line`) and an impact statement. No empty praise.

## Worker Response (Review Fix)

When the reviewer has posted a review with changes requested, the worker MUST:

1. Read the comments: `gh pr view <PR_NUMBER> --comments`
2. For each comment:
   - **Accept** → fix the code.
   - **Reject** → post a rebuttal comment on the PR with reasoning. Do not silently ignore.
   - Reply with `Resolved: <what you did>` so the reviewer can verify.
3. Run the full local check battery **before pushing** (see [Commit Hygiene](#commit-hygiene)).
4. Push the fixes (see [Commit Hygiene](#commit-hygiene) for the amend + force-with-lease rule).
5. Update `RESULT.json`:

    ```json
    {
      "status": "review_addressed",
      "review_cycle": <current cycle number>
    }
    ```

Only after `RESULT.json` is updated does the conductor's watch cycle re-trigger a review.

## Re-Review

On `status: "review_addressed"`, the reviewer repeats the protocol from step 1 (CI gate) on the new commit. If the comments are resolved and no new `critical`/`high` findings appear, proceed to approval.

## Approval

Approval is gated on the criteria in [`severity-classification.md`](./severity-classification.md#code-review-severity). Summarized here:

- CI fully green.
- Zero `critical` findings.
- Zero `high` findings that were not explicitly accepted as deferred.
- New code has adequate tests.
- Existing tests still pass.
- Code style consistent with the codebase.

Issue the approval:

```bash
# When the reviewer is not the PR author
gh pr review <PR_NUMBER> --approve --body "LGTM - all review comments addressed"

# When the reviewer IS the PR author (GitHub forbids self-approve)
gh pr review <PR_NUMBER> --comment --body "✅ Review complete - all comments addressed"
```

Then update `RESULT.json` to `status: "approved"`. Only `approved` counts as *done*. `success` means "PR exists"; `approved` means "PR is mergeable".

## Max Review Cycles

Hard cap of **three** review cycles per PR to prevent infinite loops.

When the third cycle still does not reach approval:

```
⚠️ Pane N: unresolved issues after 3 review cycles.
PR: #<PR_NUMBER>
Unresolved: [list]
User decision required.
```

The conductor stops reviewing that pane and waits for user instruction. Do not silently approve to exit the loop.

## Review Agent Result Handling

When the `--review-pane` strategy is used, the review agent writes its own `RESULT.json` in its worktree:

```json
{
  "status": "success",
  "review_result": "approve | changes_requested",
  "issues_found": 3,
  "critical_count": 0,
  "high_count": 1
}
```

The conductor reads the review agent's `RESULT.json` and:

1. **`review_result: "approve"`** → update the worker's `RESULT.json` to `approved`, post the final approval comment on the PR, report to user.
2. **`review_result: "changes_requested"`** → update the worker's `RESULT.json` to `review_pending`, increment `review_cycle`, dispatch the review-fix task to the worker.
3. **Always** → delete the review agent's `RESULT.json` so the next review can trigger.

## Commit Hygiene

**Rule:** During the review fix cycle, do not pile up additional fix commits on top of the original worker commit. Amend the existing commit and force-push with lease.

```bash
git add <changed files>
git commit --amend --no-edit
git push --force-with-lease
```

**Why:** A single clean commit per PR keeps `git log` reviewable, avoids "fix review 1 / fix review 2 / fix typo" noise, and makes the PR easier to rebase. `--force-with-lease` protects against accidental overwrite if the remote has moved.

**Exception:** When the review explicitly requests splitting the change into multiple commits (e.g., "please move this refactor to its own commit"), follow the review's direction. That is a *deliberate* split, not commit noise. Document the exception in the review reply so future reviewers understand why the PR has multiple commits.

**Pre-push check battery (MANDATORY before every push, including amends):**

```bash
yarn prettier --write .
yarn lint --fix
yarn type-check
yarn test
```

All four MUST pass. A failed pre-push check is not a reason to push anyway.

## State Representation

In multi-pane orchestration, each pane's state file carries the review cycle as structured fields:

```json
{
  "index": 1,
  "role": "worker",
  "status": "review_pending",
  "review_cycle": 1,
  "pr_number": 42
}
```

Valid `status` values during the review cycle:

| Status | Meaning |
|--------|---------|
| `working` | Worker is implementing |
| `reviewing` | Review agent is running (review-pane only) |
| `review_pending` | Review comments posted, awaiting worker response |
| `review_addressed` | Worker has pushed fixes, awaiting re-review |
| `approved` | Final approval — cycle complete |
| `done` | Completed without a review cycle (e.g., failure or error) |

## Related

- [`severity-classification.md`](./severity-classification.md) — canonical severity taxonomy used for approval gates
- `skills/pr-review/SKILL.md` — manual PR review dimensions, anti-sycophancy guidance, feedback tone spectrum
- `.claude/skills/taskmaestro/SKILL.md` — conductor/worker orchestration that consumes this protocol
- `adapters/claude-code.md` — Claude Code execution model for parallel review
