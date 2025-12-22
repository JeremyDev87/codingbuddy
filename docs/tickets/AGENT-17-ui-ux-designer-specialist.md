# AGENT-17: Add UI/UX Designer Specialist Agent

## Summary

Remove the Design System Specialist Agent and add a new UI/UX Designer Specialist Agent that focuses on creative design principles rather than being dependent on specific design systems.

## Type

- **Type**: Feature
- **Priority**: High
- **Labels**: `agent`, `design`, `ui-ux`, `breaking-change`

## Background

### Current State

- The existing `design-system-specialist.json` is tightly coupled to a specific design system (Tailwind CSS, twJoin/twMerge, w- prefix tokens, etc.)
- Limited portability across projects with different design system structures
- Focused on design system validation rather than creative design and UX improvement guidance

### Rationale for Change

- Codingbuddy is a universal AI Rules system used across various projects
- Need an agent based on **design principles and UX best practices** rather than specific design system dependencies
- Support for **aesthetics** and **user experience (UX)** decision-making in PLAN mode

## Scope

### In Scope

1. **Deletion Target**
   - Remove `packages/rules/.ai-rules/agents/design-system-specialist.json` file

2. **New Addition**
   - Create `packages/rules/.ai-rules/agents/ui-ux-designer.json` file

3. **Core Responsibilities of New Agent**
   - Design principle-based UI design guidance
   - UX best practices application
   - User flow optimization
   - Visual hierarchy design
   - Interaction pattern design
   - Responsive design strategy

### Out of Scope

- Implementation details of specific design systems (Tailwind, Material UI, etc.)
- Project-specific design token definitions
- CSS framework-specific class naming conventions

## Acceptance Criteria

### Functional Requirements

- [ ] `design-system-specialist.json` file is deleted
- [ ] `ui-ux-designer.json` file is created
- [ ] New agent supports 3 modes (Planning, Implementation, Evaluation)

### Agent Structure Requirements

- [ ] **Planning Mode**: Design principle-based decision guidance for UI/UX design
- [ ] **Implementation Mode**: UX pattern application verification during design implementation
- [ ] **Evaluation Mode**: UX improvement analysis for existing designs

### Design Principles Requirements

- [ ] Visual Hierarchy principles
- [ ] CRAP principles (Contrast, Repetition, Alignment, Proximity)
- [ ] Gestalt Principles
- [ ] Fitts's Law
- [ ] Hick's Law
- [ ] Jakob's Law

### UX Guide Requirements

- [ ] User flow optimization
- [ ] Interaction feedback patterns
- [ ] Loading/error state handling
- [ ] Accessibility considerations (collaboration with Accessibility Specialist)
- [ ] Micro-interaction guidelines

## Technical Details

### File Changes

```
packages/rules/.ai-rules/agents/
├── design-system-specialist.json  (delete)
├── ui-ux-designer.json            (new)
└── README.md                      (update required)
```

### Agent JSON Structure (Expected)

```json
{
  "name": "UI/UX Designer",
  "version": "1.0.0",
  "description": "UI/UX design specialist based on design principles and UX best practices",
  "role": {
    "title": "UI/UX Design Specialist",
    "expertise": [
      "Visual Design Principles",
      "User Experience Patterns",
      "Interaction Design",
      "Information Architecture",
      "Responsive Design Strategy"
    ]
  },
  "modes": {
    "planning": { ... },
    "implementation": { ... },
    "evaluation": { ... }
  }
}
```

### Related Agents

- `accessibility-specialist.json`: Collaboration on accessibility
- `frontend-developer.json`: Collaboration during UI implementation
- `performance-specialist.json`: Performance impact considerations

## Migration Guide

### Breaking Changes

- If there are configurations referencing the existing `design-system-specialist` agent, change them to `ui-ux-designer`
- Project-specific design system rules should be defined separately in the project's `packages/rules/.ai-rules/rules/project.md`

### Upgrade Steps

1. Update Codingbuddy
2. Change existing `design-system-specialist` references to `ui-ux-designer`
3. Move project-specific design system rules to `project.md`

## References

- [Design Principles - Nielsen Norman Group](https://www.nngroup.com/articles/)
- [Laws of UX](https://lawsofux.com/)
- [Gestalt Principles](https://www.interaction-design.org/literature/topics/gestalt-principles)
- [Material Design Guidelines](https://material.io/design)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines)

## Timeline

- **Created**: 2025-12-18
- **Branch**: `feat/17`

---

## Subtasks

- [x] AGENT-17-1: Delete `design-system-specialist.json`
- [x] AGENT-17-2: Create new `ui-ux-designer.json`
- [x] AGENT-17-3: Update `agents/README.md`
- [x] AGENT-17-4: Update related documentation (adapters, rules, etc.)
