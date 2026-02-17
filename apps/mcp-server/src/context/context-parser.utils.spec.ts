import { describe, it, expect } from 'vitest';
import { parseContextDocument } from './context-parser.utils';

describe('context-parser.utils', () => {
  describe('parseContextDocument', () => {
    it('parses empty content with defaults', () => {
      const result = parseContextDocument('');

      expect(result.metadata.title).toBe('Untitled');
      expect(result.metadata.status).toBe('active');
      expect(result.sections).toHaveLength(0);
    });

    it('parses metadata header', () => {
      const content = `# Context: Test Task

**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: PLAN
**Status**: active

---`;

      const result = parseContextDocument(content);

      expect(result.metadata.title).toBe('Test Task');
      expect(result.metadata.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(result.metadata.lastUpdatedAt).toBe('2024-01-01T01:00:00.000Z');
      expect(result.metadata.currentMode).toBe('PLAN');
      expect(result.metadata.status).toBe('active');
    });

    it('parses PLAN section with all fields', () => {
      const content = `# Context: Test Task

**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T01:00:00.000Z
**Current Mode**: PLAN
**Status**: active

---

## PLAN (10:00)

**Primary Agent**: technical-planner
**Recommended ACT Agent**: frontend-developer (confidence: 0.9)
**Status**: in_progress

### Task
Implement user authentication

### Decisions
- Use JWT for auth tokens
- Store tokens in httpOnly cookies

### Notes
- Consider refresh token strategy
- Add rate limiting

---`;

      const result = parseContextDocument(content);

      expect(result.sections).toHaveLength(1);

      const planSection = result.sections[0];
      expect(planSection.mode).toBe('PLAN');
      expect(planSection.timestamp).toBe('10:00');
      expect(planSection.primaryAgent).toBe('technical-planner');
      expect(planSection.recommendedActAgent).toBe('frontend-developer');
      expect(planSection.recommendedActAgentConfidence).toBe(0.9);
      expect(planSection.status).toBe('in_progress');
      expect(planSection.task).toBe('Implement user authentication');
      expect(planSection.decisions).toEqual([
        'Use JWT for auth tokens',
        'Store tokens in httpOnly cookies',
      ]);
      expect(planSection.notes).toEqual(['Consider refresh token strategy', 'Add rate limiting']);
    });

    it('parses multiple sections', () => {
      const content = `# Context: Test Task

**Created**: 2024-01-01T00:00:00.000Z
**Updated**: 2024-01-01T02:00:00.000Z
**Current Mode**: ACT
**Status**: active

---

## PLAN (10:00)

### Task
Plan the feature

---

## ACT (11:00)

### Task
Implement the feature

### Progress
- Created types
- Added service

---`;

      const result = parseContextDocument(content);

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].mode).toBe('PLAN');
      expect(result.sections[0].task).toBe('Plan the feature');
      expect(result.sections[1].mode).toBe('ACT');
      expect(result.sections[1].task).toBe('Implement the feature');
      expect(result.sections[1].progress).toEqual(['Created types', 'Added service']);
    });

    it('parses EVAL section with findings and recommendations', () => {
      const content = `# Context: Test Task

---

## EVAL (12:00)

### Task
Review implementation

### Findings
- Missing error handling
- No input validation

### Recommendations
- Add try-catch blocks
- Validate user input

---`;

      const result = parseContextDocument(content);

      expect(result.sections).toHaveLength(1);

      const evalSection = result.sections[0];
      expect(evalSection.mode).toBe('EVAL');
      expect(evalSection.findings).toEqual(['Missing error handling', 'No input validation']);
      expect(evalSection.recommendations).toEqual(['Add try-catch blocks', 'Validate user input']);
    });

    it('handles recommended ACT agent without confidence', () => {
      const content = `# Context: Test

---

## PLAN (10:00)

**Recommended ACT Agent**: frontend-developer

---`;

      const result = parseContextDocument(content);

      expect(result.sections[0].recommendedActAgent).toBe('frontend-developer');
      expect(result.sections[0].recommendedActAgentConfidence).toBeUndefined();
    });
  });
});
