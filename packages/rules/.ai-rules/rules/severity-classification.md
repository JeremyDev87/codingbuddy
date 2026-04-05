# Severity Classification (Canonical)

Canonical severity taxonomy used across the repo. Two distinct scales — **Code Review Severity** (Critical/High/Medium/Low) and **Production Incident Severity** (P1-P4) — serve different purposes and MUST NOT be conflated.

This file is the single source of truth. Other files (skills, adapters, task protocols) MUST reference this document instead of redefining severity levels.

## When to Use Which Scale

| Context | Use This Scale | Decides |
|---------|----------------|---------|
| PR review, code review, EVAL mode, AUTO exit criteria | **Code Review Severity** (Critical/High/Medium/Low) | Whether to approve / request changes |
| Production incident, on-call alert, SLO burn rate | **Production Incident Severity** (P1/P2/P3/P4) | Response time, pager, war room |

Code review and production incidents are **not** the same problem. A `critical` code review finding blocks a PR; a `P1` incident pages the on-call engineer. Do not map `critical` to `P1` on the PR side or vice versa — see [Mapping Table](#mapping-between-scales) below for the narrow cases where they correspond.

## Code Review Severity

Used in PR review cycles, EVAL mode, AUTO exit criteria, and worker review protocols.

### critical

**Meaning:** The change introduces a defect that blocks approval. A `critical` finding requires changes before merge — no exceptions.

**Criteria (ANY of these):**

- Hardcoded secrets / credentials in source
- SQL injection, XSS, CSRF, or other exploitable vulnerability
- Missing authentication on a protected route
- Missing authorization check on a resource access path
- Data loss, corruption, or irreversible state change risk
- Build or CI completely broken
- Runtime exception on happy path
- Production-breaking regression introduced

**Action:** Request changes. Block merge. Approval requires fix + re-review.

### high

**Meaning:** A defect that should be fixed before merge but does not block approval if the author has a documented reason to defer.

**Criteria (ANY of these):**

- Missing error handling on a code path that can realistically fail
- Missing test for new non-trivial logic
- Clear off-by-one, null dereference, or unhandled edge case
- `any` type used where a concrete type is available
- Layer boundary violation or dependency direction reversed
- Obvious performance pitfall (N+1 query, blocking the main thread)
- Significant code duplication that invites drift

**Action:** Request changes, or approve with an explicit follow-up ticket. Multiple `high` findings together should block merge.

### medium

**Meaning:** Quality concerns that are worth addressing but do not gate the merge.

**Criteria (ANY of these):**

- Complexity above the project's target (e.g., cyclomatic > 10, function > 20 lines)
- Inconsistent naming or minor API shape awkwardness
- Missing documentation on a public API
- Accessibility issue that does not block core interaction
- Non-critical test gap (e.g., edge case test missing for stable behavior)

**Action:** Approve with comments, or request changes if the author has time.

### low

**Meaning:** Style, polish, or future-facing suggestions with no correctness impact.

**Criteria (ANY of these):**

- Style nit beyond what lint enforces
- Suggested refactor for readability
- Minor comment wording
- Opportunistic cleanup that could be its own PR

**Action:** Leave as a `Noting` or `Suggesting` comment (per `skills/pr-review/SKILL.md` feedback tone spectrum). Do not block merge.

## Production Incident Severity

Used when a production incident is declared. Based on SLO burn rate and user impact, not code quality.

### P1 - Critical

**SLO Burn Rate:** >14.4x (consuming >2% error budget per hour)

**Impact Criteria (ANY of these):**

- Complete service outage
- `>50%` of users affected
- Critical business function unavailable
- Data loss or corruption risk
- Active security breach
- Revenue-generating flow completely blocked
- Compliance/regulatory violation in progress

**Response Expectations:**

| Metric | Target |
|--------|--------|
| Acknowledge | Within 5 minutes |
| First update | Within 15 minutes |
| War room formed | Within 15 minutes |
| Executive notification | Within 30 minutes |
| Customer communication | Within 1 hour |
| Update cadence | Every 15 minutes |

**Escalation:** Immediate page to on-call, all hands if needed.

### P2 - High

**SLO Burn Rate:** >6x (consuming >5% error budget per 6 hours)

**Impact Criteria (ANY of these):**

- Major feature unavailable
- 10-50% of users affected
- Significant performance degradation (>5x latency)
- Secondary business function blocked
- Partial data integrity issues
- Key integration failing

**Response Expectations:**

| Metric | Target |
|--------|--------|
| Acknowledge | Within 15 minutes |
| First update | Within 30 minutes |
| Status page update | Within 30 minutes |
| Stakeholder notification | Within 1 hour |
| Update cadence | Every 30 minutes |

**Escalation:** Page on-call during business hours, notify team lead.

### P3 - Medium

**SLO Burn Rate:** >3x (consuming >10% error budget per 24 hours)

**Impact Criteria (ANY of these):**

- Minor feature impacted
- `<10%` of users affected
- Workaround available
- Non-critical function degraded
- Cosmetic issues affecting usability
- Performance slightly degraded

**Response Expectations:**

| Metric | Target |
|--------|--------|
| Acknowledge | Within 1 hour |
| First update | Within 2 hours |
| Resolution target | Within 8 business hours |
| Update cadence | At milestones |

**Escalation:** Create ticket, notify team channel.

### P4 - Low

**SLO Burn Rate:** >1x (projected budget exhaustion within SLO window)

**Impact Criteria (ALL of these):**

- Minimal or no user impact
- Edge case or rare scenario
- Cosmetic only
- Performance within acceptable range
- Workaround trivial

**Response Expectations:**

| Metric | Target |
|--------|--------|
| Acknowledge | Within 1 business day |
| Resolution target | Next sprint/release |
| Update cadence | On resolution |

**Escalation:** Backlog item, routine prioritization.

### When Uncertain, Classify Higher

Between two levels, pick the more severe one. Over-response is cheaper than under-response; you can always downgrade. Communicate any severity change to stakeholders immediately.

### Incident-Specific Details

For SLO burn rate math, classification decision tree, and incident report templates, see `skills/incident-response/severity-classification.md`, which narrows this canonical scale to production-incident-specific operational guidance.

## Mapping Between Scales

The two scales answer different questions, but a handful of situations connect them. Use this table only when a PR review finding must influence — or be informed by — an incident.

| Code Review Severity | Rough Production Equivalent | When the Mapping Applies |
|----------------------|------------------------------|---------------------------|
| `critical` | P1-P2 | A `critical` PR finding that already shipped to production and is causing user impact becomes an incident at P1 or P2 (impact decides, not the code severity) |
| `high` | P2-P3 | A `high` PR finding that shipped can become an incident once user impact is observed |
| `medium` | P3-P4 | A `medium` finding rarely becomes an incident on its own; if it does, it is usually P3 or P4 |
| `low` | (not applicable) | `low` findings are stylistic and do not map to production incidents |

**Direction of the mapping matters:**

- **PR → Production:** A `critical` code review finding does not automatically imply a P1 incident. Incident severity is decided by real user impact and SLO burn rate, not by the code reviewer's judgement.
- **Production → PR:** After an incident, the PR(s) that introduced the regression should be reviewed using the Code Review Severity scale during the postmortem. The incident severity does not set the PR severity directly.

## Usage in Other Documents

- `rules/pr-review-cycle.md` — uses Code Review Severity for approval gates
- `skills/pr-review/SKILL.md` — uses Code Review Severity for priority dimensions and decision matrix
- `skills/incident-response/severity-classification.md` — narrows Production Incident Severity to operational detail (decision tree, burn rate math, report template)
- `adapters/claude-code.md` — references Code Review Severity for EVAL / AUTO exit criteria
- `rules/core.md` EVAL section — prioritizes improvements by Code Review Severity

When adding a new document that mentions severity, link to this file instead of redefining the levels.
