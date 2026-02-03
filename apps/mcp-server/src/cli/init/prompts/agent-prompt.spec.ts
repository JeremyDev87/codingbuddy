import { describe, it, expect, vi } from 'vitest';
import {
  getPrimaryAgentChoices,
  DEFAULT_PRIMARY_AGENT,
  promptPrimaryAgentSelection,
} from './agent-prompt';
import { ACT_PRIMARY_AGENTS } from '../../../keyword/keyword.types';

// Mock @inquirer/prompts
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

describe('agent-prompt', () => {
  describe('DEFAULT_PRIMARY_AGENT', () => {
    it('should be frontend-developer', () => {
      expect(DEFAULT_PRIMARY_AGENT).toBe('frontend-developer');
    });
  });

  describe('getPrimaryAgentChoices', () => {
    it('should return an array of agent choices', () => {
      const choices = getPrimaryAgentChoices();
      expect(Array.isArray(choices)).toBe(true);
      expect(choices.length).toBeGreaterThan(0);
    });

    it('should include all ACT primary agents', () => {
      const choices = getPrimaryAgentChoices();
      const values = choices.map(c => c.value);

      for (const agent of ACT_PRIMARY_AGENTS) {
        expect(values).toContain(agent);
      }
    });

    it('should have name and value for each choice', () => {
      const choices = getPrimaryAgentChoices();
      for (const choice of choices) {
        expect(choice.name).toBeDefined();
        expect(choice.value).toBeDefined();
        expect(typeof choice.name).toBe('string');
        expect(typeof choice.value).toBe('string');
      }
    });

    it('should include frontend-developer with recommended label', () => {
      const choices = getPrimaryAgentChoices();
      const frontend = choices.find(c => c.value === 'frontend-developer');
      expect(frontend).toBeDefined();
      expect(frontend?.name).toContain('Recommended');
    });

    it('should include descriptions for agents', () => {
      const choices = getPrimaryAgentChoices();
      const withDescriptions = choices.filter(c => c.description);
      expect(withDescriptions.length).toBeGreaterThan(0);
    });

    it('should include new primary agents (data-engineer, mobile-developer)', () => {
      const choices = getPrimaryAgentChoices();
      const values = choices.map(c => c.value);

      expect(values).toContain('data-engineer');
      expect(values).toContain('mobile-developer');
    });
  });

  describe('promptPrimaryAgentSelection', () => {
    it('should call select with default message and choices', async () => {
      const { select } = await import('@inquirer/prompts');
      const selectMock = select as ReturnType<typeof vi.fn>;
      selectMock.mockResolvedValue('frontend-developer');

      const result = await promptPrimaryAgentSelection();

      expect(selectMock).toHaveBeenCalledWith({
        message: 'Select your primary development agent:',
        choices: expect.arrayContaining([
          expect.objectContaining({
            value: 'frontend-developer',
            name: expect.stringContaining('Recommended'),
          }),
        ]),
        default: DEFAULT_PRIMARY_AGENT,
      });
      expect(result).toBe('frontend-developer');
    });

    it('should call select with custom message', async () => {
      const { select } = await import('@inquirer/prompts');
      const selectMock = select as ReturnType<typeof vi.fn>;
      selectMock.mockResolvedValue('backend-developer');

      const customMessage = 'Choose an agent:';
      const result = await promptPrimaryAgentSelection(customMessage);

      expect(selectMock).toHaveBeenCalledWith({
        message: customMessage,
        choices: expect.any(Array),
        default: DEFAULT_PRIMARY_AGENT,
      });
      expect(result).toBe('backend-developer');
    });

    it('should return the selected agent', async () => {
      const { select } = await import('@inquirer/prompts');
      const selectMock = select as ReturnType<typeof vi.fn>;
      selectMock.mockResolvedValue('data-engineer');

      const result = await promptPrimaryAgentSelection();

      expect(result).toBe('data-engineer');
    });
  });
});
