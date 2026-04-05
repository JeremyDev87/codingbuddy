# Severity Classification (Incident Operations)

> **Canonical source:** P1/P2/P3/P4 severity level **definitions**, impact criteria, and response expectations live in [`packages/rules/.ai-rules/rules/severity-classification.md`](../../rules/severity-classification.md) under *Production Incident Severity*.
>
> This file narrows that canonical scale to **operational guidance** for incident response: how to classify in practice, the math behind burn rates, the decision tree, and what to include in an incident report.

## The Classification Rule

**Classify severity BEFORE taking any action.** Severity determines:

- Response time expectations
- Who gets notified
- Resource allocation priority
- Communication cadence

See the canonical severity matrix for P1-P4 definitions, impact criteria, and response expectations. This file does **not** redefine those levels — refer to the canonical document whenever you need the authoritative criteria.

## Error Budget Integration

### Understanding Burn Rate

```
Burn Rate = (Error Rate) / (Allowed Error Rate)

Example: 99.9% SLO = 0.1% allowed errors
If current error rate = 1.44%
Burn Rate = 1.44 / 0.1 = 14.4x (P1!)
```

### Budget Consumption Thresholds

| Severity | Burn Rate | Budget Impact | Alert Type |
|----------|-----------|--------------|------------|
| P1 | >14.4x | >2% in 1 hour | Page immediately |
| P2 | >6x | >5% in 6 hours | Page business hours |
| P3 | >3x | >10% in 24 hours | Create ticket |
| P4 | >1x | Projected exhaustion | Add to backlog |

### SLO Tier Mapping

| Service Tier | SLO Target | Monthly Budget | Equivalent Downtime |
|--------------|-----------|----------------|---------------------|
| Tier 1 (Critical) | 99.99% | 0.01% | 4.38 minutes |
| Tier 2 (Important) | 99.9% | 0.1% | 43.8 minutes |
| Tier 3 (Standard) | 99.5% | 0.5% | 3.65 hours |

## Classification Decision Tree

Use this when an incident is detected and you need to assign severity quickly.

```
Is the service completely unavailable?
├── Yes → P1
└── No → Continue

Are >50% of users affected?
├── Yes → P1
└── No → Continue

Is a critical business function blocked?
├── Yes → P1
└── No → Continue

Are 10-50% of users affected?
├── Yes → P2
└── No → Continue

Is a major feature unavailable?
├── Yes → P2
└── No → Continue

Is the burn rate >6x?
├── Yes → P2
└── No → Continue

Are <10% of users affected with workaround?
├── Yes → P3
└── No → Continue

Is impact minimal/cosmetic only?
├── Yes → P4
└── No → Default to P3 (when uncertain)
```

## When Uncertain, Classify Higher

**Rule:** If you're unsure between two severity levels, classify higher.

- Unsure between P1 and P2? → Classify as P1
- Unsure between P2 and P3? → Classify as P2
- Unsure between P3 and P4? → Classify as P3

**Rationale:** Over-response is better than under-response. You can always downgrade. This rule is also stated in the canonical document; it is repeated here because during an incident you must be able to act without following links.

## Severity Changes During Incident

Severity can change as you learn more:

**Upgrade when:**

- Impact wider than initially assessed
- More users affected than thought
- Business impact greater than estimated
- Mitigation not working

**Downgrade when:**

- Successful mitigation reduced impact
- Fewer users affected than thought
- Workaround discovered
- Root cause isolated to non-critical path

**Always communicate severity changes** to all stakeholders immediately.

## Include in Incident Reports

When documenting severity, always include:

```
Severity: P[1-4]
Burn Rate: [X]x SLO budget
Users Affected: [Count/Percentage]
Impact: [Brief description]
SLO Status: [Which SLO breaching]
Error Budget Remaining: [Percentage]
```

## Relationship to Code Review Severity

Code review uses a **different** severity scale (`critical`/`high`/`medium`/`low`) for PR approval gating. The two scales are not interchangeable — see [`rules/severity-classification.md`](../../rules/severity-classification.md#mapping-between-scales) for the narrow cases where they correspond (e.g., when a `critical` code review finding that shipped becomes an incident).

Do **not** mix the two scales in incident documents. Use P1-P4 here.
