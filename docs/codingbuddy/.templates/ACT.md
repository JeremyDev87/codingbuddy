# ACT: {title}

**{{created}}**: YYYY-MM-DD HH:mm
**{{author}}**: Claude + {user}
**{{status}}**: {{status_in_progress}}

---

## {{related_docs}}

| {{type}} | {{link}} |
|----------|----------|
| {{ticket}} | [TICKET-ID](../tickets/TICKET-ID.md) |
| PLAN | [plan-link](../plan/xxx.md) |
| EVAL | TBD |

---

## {{summary}}

<!-- {{act_summary_hint}} -->

---

## {{changes}}

### {{new_files}}

| {{file}} | {{purpose}} | {{lines}} |
|----------|-------------|-----------|
| | | |

### {{modified_files}}

| {{file}} | {{changes}} |
|----------|-------------|
| | |

### {{deleted_files}}

| {{file}} | {{reason}} |
|----------|------------|
| | |

---

## {{implementation_details}}

### {feature-1}

```
{{implementation_desc}}
```

### {feature-2}

```
{{implementation_desc}}
```

---

## {{test_results}}

| {{item}} | {{result}} |
|----------|------------|
| {{unit_tests}} | X {{passed}} / Y {{failed}} |
| {{integration_tests}} | X {{passed}} / Y {{failed}} |
| {{coverage}} | XX% |

### {{test_command}}

```bash
yarn test
```

---

## {{issues_encountered}}

| {{issue}} | {{cause}} | {{resolution}} |
|-----------|-----------|----------------|
| | | |

---

## {{deviations_from_plan}}

<!-- {{deviations_hint}} -->

| {{item}} | PLAN | {{actual}} | {{reason}} |
|----------|------|------------|------------|
| | | | |

---

## {{remaining_tasks}}

- [ ] {{task}} 1
- [ ] {{task}} 2

---

## {{next_steps}}

- [ ] {{decide_eval}}
- [ ] {{create_commit_pr}}
