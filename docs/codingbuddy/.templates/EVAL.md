# EVAL: {title}

**{{created}}**: YYYY-MM-DD HH:mm
**{{author}}**: Claude + {user}
**{{status}}**: {{status_reviewed}}

---

## {{related_docs}}

| {{type}} | {{link}} |
|----------|----------|
| {{ticket}} | [TICKET-ID](../tickets/TICKET-ID.md) |
| PLAN | [plan-link](../plan/xxx.md) |
| ACT | [act-link](../act/xxx.md) |

---

## {{evaluation_target}}

<!-- {{evaluation_target_hint}} -->

---

## {{quality_summary}}

| {{severity}} | {{count}} | {{status}} |
|--------------|-----------|------------|
| Critical | 0 | |
| High | 0 | |
| Medium | 0 | |
| Low | 0 | |

**{{quality_target}}**: Critical=0, High=0 → ✅ / ❌

---

## {{findings}}

### Critical

| {{item}} | {{location}} | {{status}} |
|----------|--------------|------------|
| - | - | - |

### High

| {{item}} | {{location}} | {{status}} |
|----------|--------------|------------|
| - | - | - |

### Medium

| {{item}} | {{location}} | {{recommended_action}} |
|----------|--------------|------------------------|
| | | |

### Low

| {{item}} | {{location}} | {{recommended_action}} |
|----------|--------------|------------------------|
| | | |

---

## {{specialist_analysis}}

### {{code_quality}}

<!-- {{code_quality_hint}} -->

### {{security}}

<!-- {{security_hint}} -->

### {{performance}}

<!-- {{performance_hint}} -->

### {{test_strategy}}

<!-- {{test_strategy_hint}} -->

---

## {{metrics}}

| {{metric}} | {{value}} | {{target}} | {{status}} |
|------------|-----------|------------|------------|
| {{test_coverage}} | XX% | 90%+ | ✅/❌ |
| {{cyclomatic_complexity}} | X | <10 | ✅/❌ |
| {{function_size}} | X {{lines}} | <30 | ✅/❌ |

---

## {{devils_advocate}}

| {{challenge}} | {{assessment}} |
|---------------|----------------|
| {{da_overkill}} | |
| {{da_simpler}} | |
| {{da_maintainable}} | |

---

## {{improvement_suggestions}}

### {{immediate_actions}}

1. [ ] {{suggestion}} 1

### {{future_considerations}}

1. [ ] {{suggestion}} 1

---

## {{conclusion}}

<!-- {{conclusion_hint}} -->

**{{conclusion_action}}**:
- [ ] {{ready_to_commit}}
- [ ] {{commit_after_fixes}}
- [ ] {{additional_act_required}}
