import { describe, it, expect } from 'vitest';
import { filterCoreRulesByMode, filterRulesByMode } from './rule-filter';
import type { RuleContent } from './keyword.types';

// Sample core.md content for testing
const SAMPLE_CORE_MD = `## Core Rules

### Work Modes

You have four modes of operation:
1. Plan mode
2. Act mode
3. Eval mode
4. Auto mode

### Plan Mode

**Important:**
- PLAN mode is the default starting mode
- PLAN mode creates actionable implementation plans

Plan-specific content here.
More plan content.

### Act Mode

**Important:**
- ACT mode executes the plan
- Follow TDD cycle

Act-specific content here.
More act content.

### Eval Mode

**Important:**
- EVAL mode analyzes results
- Propose improvements

Eval-specific content here.
More eval content.

### Auto Mode

**Important:**
- AUTO mode cycles through PLAN → ACT → EVAL automatically
- Autonomous execution until quality targets met

Auto-specific content here.
More auto content.

### Communication Rules

- Respond in the appropriate language
- Always refresh code state
`;

describe('rule-filter', () => {
  describe('filterCoreRulesByMode', () => {
    it('should extract PLAN mode section with common header', () => {
      const result = filterCoreRulesByMode(SAMPLE_CORE_MD, 'PLAN');

      expect(result).toContain('## Core Rules');
      expect(result).toContain('### Work Modes');
      expect(result).toContain('### Plan Mode');
      expect(result).toContain('Plan-specific content');
      expect(result).not.toContain('### Act Mode');
      expect(result).not.toContain('Act-specific content');
      expect(result).not.toContain('### Eval Mode');
    });

    it('should extract ACT mode section with common header', () => {
      const result = filterCoreRulesByMode(SAMPLE_CORE_MD, 'ACT');

      expect(result).toContain('## Core Rules');
      expect(result).toContain('### Work Modes');
      expect(result).toContain('### Act Mode');
      expect(result).toContain('Act-specific content');
      expect(result).not.toContain('Plan-specific content');
      expect(result).not.toContain('### Eval Mode');
    });

    it('should extract EVAL mode section with common header', () => {
      const result = filterCoreRulesByMode(SAMPLE_CORE_MD, 'EVAL');

      expect(result).toContain('## Core Rules');
      expect(result).toContain('### Work Modes');
      expect(result).toContain('### Eval Mode');
      expect(result).toContain('Eval-specific content');
      expect(result).not.toContain('Plan-specific content');
      expect(result).not.toContain('Act-specific content');
    });

    it('should return full content for AUTO mode (no filtering)', () => {
      const result = filterCoreRulesByMode(SAMPLE_CORE_MD, 'AUTO');

      // AUTO mode should return full content since it cycles through all modes
      expect(result).toContain('## Core Rules');
      expect(result).toContain('### Work Modes');
      expect(result).toContain('### Plan Mode');
      expect(result).toContain('Plan-specific content');
      expect(result).toContain('### Act Mode');
      expect(result).toContain('Act-specific content');
      expect(result).toContain('### Eval Mode');
      expect(result).toContain('Eval-specific content');
      expect(result).toContain('### Auto Mode');
      expect(result).toContain('Auto-specific content');
      expect(result).toContain('### Communication Rules');
    });

    it('should not add filtered view note for AUTO mode', () => {
      const result = filterCoreRulesByMode(SAMPLE_CORE_MD, 'AUTO');

      // AUTO mode returns original content, no filter note
      expect(result).not.toContain('filtered view');
    });

    it('should add a note about filtered content', () => {
      const result = filterCoreRulesByMode(SAMPLE_CORE_MD, 'PLAN');

      expect(result).toContain('filtered view for PLAN mode');
    });

    it('should significantly reduce content length for PLAN/ACT/EVAL modes', () => {
      const planResult = filterCoreRulesByMode(SAMPLE_CORE_MD, 'PLAN');
      const actResult = filterCoreRulesByMode(SAMPLE_CORE_MD, 'ACT');
      const evalResult = filterCoreRulesByMode(SAMPLE_CORE_MD, 'EVAL');

      // Each filtered result should be smaller than the original
      expect(planResult.length).toBeLessThan(SAMPLE_CORE_MD.length);
      expect(actResult.length).toBeLessThan(SAMPLE_CORE_MD.length);
      expect(evalResult.length).toBeLessThan(SAMPLE_CORE_MD.length);
    });

    it('should preserve full content length for AUTO mode', () => {
      const autoResult = filterCoreRulesByMode(SAMPLE_CORE_MD, 'AUTO');

      // AUTO mode returns original content, so length should be equal
      expect(autoResult.length).toBe(SAMPLE_CORE_MD.length);
    });

    it('should include content until end of file when end marker is missing', () => {
      // Content without Communication Rules section (EVAL end marker missing)
      const contentWithoutEndMarker = `## Core Rules

### Work Modes

Work modes description.

### Eval Mode

Eval content here.
More eval content without end marker.`;

      const result = filterCoreRulesByMode(contentWithoutEndMarker, 'EVAL');

      // Should include all content after start marker
      expect(result).toContain('### Eval Mode');
      expect(result).toContain('Eval content here');
      expect(result).toContain('More eval content without end marker');
    });

    it('should return original content when start marker is not found', () => {
      const contentWithoutStartMarker = `# Some Other Rules

This is not core.md format.`;

      const result = filterCoreRulesByMode(contentWithoutStartMarker, 'PLAN');

      // Common section extraction returns empty, mode section returns empty
      // Result is just the note comment
      expect(result).toContain('filtered view for PLAN mode');
    });

    it('should handle empty content', () => {
      const result = filterCoreRulesByMode('', 'PLAN');

      expect(result).toContain('filtered view for PLAN mode');
    });
  });

  describe('filterRulesByMode', () => {
    it('should only filter core.md, not other rules', () => {
      const rules: RuleContent[] = [
        { name: 'rules/core.md', content: SAMPLE_CORE_MD },
        {
          name: 'rules/augmented-coding.md',
          content: 'Augmented coding content',
        },
      ];

      const result = filterRulesByMode(rules, 'PLAN');

      // core.md should be filtered
      const coreRule = result.find(r => r.name === 'rules/core.md');
      expect(coreRule?.content).toContain('### Plan Mode');
      expect(coreRule?.content).not.toContain('### Act Mode');

      // augmented-coding.md should be unchanged
      const augmentedRule = result.find(
        r => r.name === 'rules/augmented-coding.md',
      );
      expect(augmentedRule?.content).toBe('Augmented coding content');
    });

    it('should preserve rule order', () => {
      const rules: RuleContent[] = [
        { name: 'rules/core.md', content: SAMPLE_CORE_MD },
        { name: 'rules/project.md', content: 'Project content' },
        { name: 'rules/augmented-coding.md', content: 'Augmented content' },
      ];

      const result = filterRulesByMode(rules, 'ACT');

      expect(result[0].name).toBe('rules/core.md');
      expect(result[1].name).toBe('rules/project.md');
      expect(result[2].name).toBe('rules/augmented-coding.md');
    });

    it('should handle empty rules array', () => {
      const result = filterRulesByMode([], 'PLAN');

      expect(result).toEqual([]);
    });

    it('should handle rules without core.md', () => {
      const rules: RuleContent[] = [
        { name: 'rules/project.md', content: 'Project content' },
      ];

      const result = filterRulesByMode(rules, 'EVAL');

      expect(result).toEqual(rules);
    });
  });
});
