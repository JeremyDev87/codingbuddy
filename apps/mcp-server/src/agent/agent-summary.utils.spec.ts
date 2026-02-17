import {
  createAgentSummary,
  MAX_SUMMARY_EXPERTISE_ITEMS,
  MAX_PRIMARY_FOCUS_LENGTH,
} from './agent-summary.utils';

describe('AgentSummaryUtils', () => {
  describe('createAgentSummary', () => {
    it('should limit expertise to 5 items', () => {
      const profile = {
        name: 'architecture',
        displayName: 'Architecture Specialist',
        expertise: [
          'Design Patterns',
          'System Architecture',
          'SOLID',
          'DDD',
          'Clean Architecture',
          'Microservices',
          'Event Sourcing',
        ],
        systemPrompt: 'You are an architecture specialist.',
      };

      const summary = createAgentSummary(profile);

      expect(summary.expertise).toHaveLength(MAX_SUMMARY_EXPERTISE_ITEMS);
      expect(summary.expertise).toEqual([
        'Design Patterns',
        'System Architecture',
        'SOLID',
        'DDD',
        'Clean Architecture',
      ]);
    });

    it('should truncate primaryFocus to 100 characters', () => {
      const longPrompt =
        'You are an architecture specialist with extensive knowledge in system design, microservices, domain-driven design, and clean architecture principles. Your role is to guide developers.';

      const profile = {
        name: 'architecture',
        systemPrompt: longPrompt,
      };

      const summary = createAgentSummary(profile);

      expect(summary.primaryFocus.length).toBeLessThanOrEqual(MAX_PRIMARY_FOCUS_LENGTH);
      expect(summary.primaryFocus).toMatch(/\.\.\.$/); // Ends with ellipsis
    });

    it('should extract first sentence when shorter than 100 chars', () => {
      const profile = {
        name: 'test-agent',
        systemPrompt: 'You are a test specialist. This is more detail that should not appear.',
      };

      const summary = createAgentSummary(profile);

      expect(summary.primaryFocus).toBe('You are a test specialist');
    });

    it('should use name as displayName when displayName is missing', () => {
      const profile = {
        name: 'code-quality',
        systemPrompt: 'Review code quality.',
      };

      const summary = createAgentSummary(profile);

      expect(summary.displayName).toBe('code-quality');
    });

    it('should prefer displayName over name when both provided', () => {
      const profile = {
        name: 'code-quality',
        displayName: 'Code Quality Specialist',
        systemPrompt: 'Review code quality.',
      };

      const summary = createAgentSummary(profile);

      expect(summary.displayName).toBe('Code Quality Specialist');
    });

    it('should always set fullPromptAvailable to true', () => {
      const profile = {
        name: 'test-agent',
        systemPrompt: 'Test prompt.',
      };

      const summary = createAgentSummary(profile);

      expect(summary.fullPromptAvailable).toBe(true);
    });

    it('should handle empty expertise array', () => {
      const profile = {
        name: 'test-agent',
        expertise: [],
        systemPrompt: 'Test prompt.',
      };

      const summary = createAgentSummary(profile);

      expect(summary.expertise).toEqual([]);
    });

    it('should handle missing expertise field', () => {
      const profile = {
        name: 'test-agent',
        systemPrompt: 'Test prompt.',
      };

      const summary = createAgentSummary(profile);

      expect(summary.expertise).toEqual([]);
    });

    it('should handle empty systemPrompt', () => {
      const profile = {
        name: 'test-agent',
        systemPrompt: '',
      };

      const summary = createAgentSummary(profile);

      expect(summary.primaryFocus).toBe('');
    });

    it('should handle missing systemPrompt', () => {
      const profile = {
        name: 'test-agent',
      };

      const summary = createAgentSummary(profile);

      expect(summary.primaryFocus).toBe('');
    });

    it('should preserve exact primaryFocus when under 100 chars', () => {
      const shortPrompt = 'Brief description of the agent role.';

      const profile = {
        name: 'test-agent',
        systemPrompt: shortPrompt,
      };

      const summary = createAgentSummary(profile);

      expect(summary.primaryFocus).toBe(shortPrompt);
      expect(summary.primaryFocus).not.toMatch(/\.\.\.$/);
    });

    it('should handle prompt with exactly 100 characters', () => {
      const exactPrompt = 'a'.repeat(100);

      const profile = {
        name: 'test-agent',
        systemPrompt: exactPrompt,
      };

      const summary = createAgentSummary(profile);

      expect(summary.primaryFocus).toBe(exactPrompt);
      expect(summary.primaryFocus.length).toBe(100);
    });

    it('should handle prompt with 101 characters', () => {
      const slightlyLongPrompt = 'a'.repeat(101);

      const profile = {
        name: 'test-agent',
        systemPrompt: slightlyLongPrompt,
      };

      const summary = createAgentSummary(profile);

      expect(summary.primaryFocus).toBe('a'.repeat(97) + '...');
      expect(summary.primaryFocus.length).toBe(100);
    });

    it('should handle expertise with exactly 5 items', () => {
      const profile = {
        name: 'test-agent',
        expertise: ['Item1', 'Item2', 'Item3', 'Item4', 'Item5'],
        systemPrompt: 'Test.',
      };

      const summary = createAgentSummary(profile);

      expect(summary.expertise).toHaveLength(5);
      expect(summary.expertise).toEqual(['Item1', 'Item2', 'Item3', 'Item4', 'Item5']);
    });

    it('should handle expertise with less than 5 items', () => {
      const profile = {
        name: 'test-agent',
        expertise: ['Item1', 'Item2', 'Item3'],
        systemPrompt: 'Test.',
      };

      const summary = createAgentSummary(profile);

      expect(summary.expertise).toEqual(['Item1', 'Item2', 'Item3']);
    });
  });
});
