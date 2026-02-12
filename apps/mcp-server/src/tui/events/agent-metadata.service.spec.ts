import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentMetadataService } from './agent-metadata.service';

function createMockRulesService() {
  return {
    listAgents: vi
      .fn()
      .mockResolvedValue([
        'plan-mode',
        'act-mode',
        'eval-mode',
        'frontend-developer',
        'security-specialist',
      ]),
    getAgent: vi.fn().mockImplementation((name: string) => {
      const agents: Record<string, unknown> = {
        'plan-mode': {
          name: 'Plan Mode Agent',
          description: 'PLAN mode agent',
          role: { title: 'Plan Mode Agent', expertise: ['Work planning'] },
        },
        'act-mode': {
          name: 'Act Mode Agent',
          description: 'ACT mode agent',
          role: { title: 'Act Mode Agent', expertise: ['TDD'] },
        },
        'eval-mode': {
          name: 'Eval Mode Agent',
          description: 'EVAL mode agent',
          role: { title: 'Eval Mode Agent', expertise: ['Review'] },
        },
        'frontend-developer': {
          name: 'Frontend Developer',
          description: 'React specialist',
          role: {
            title: 'Senior Frontend Developer',
            expertise: ['React', 'TypeScript'],
          },
        },
        'security-specialist': {
          name: 'Security Specialist',
          description: 'Security expert',
          role: {
            title: 'Security Specialist',
            expertise: ['OWASP', 'Pen Testing'],
          },
        },
      };
      return Promise.resolve(agents[name]);
    }),
  };
}

describe('AgentMetadataService', () => {
  let service: AgentMetadataService;
  let mockRulesService: ReturnType<typeof createMockRulesService>;

  beforeEach(() => {
    mockRulesService = createMockRulesService();
    service = new AgentMetadataService(
      mockRulesService as unknown as ConstructorParameters<
        typeof AgentMetadataService
      >[0],
    );
  });

  describe('initialize', () => {
    it('should load all agent metadata into cache', async () => {
      await service.initialize();
      expect(mockRulesService.listAgents).toHaveBeenCalledOnce();
      expect(mockRulesService.getAgent).toHaveBeenCalledTimes(5);
    });

    it('should not reload if already initialized', async () => {
      await service.initialize();
      await service.initialize();
      expect(mockRulesService.listAgents).toHaveBeenCalledOnce();
    });
  });

  describe('getMetadata', () => {
    it('should return metadata for a known agent', async () => {
      await service.initialize();
      const metadata = service.getMetadata('frontend-developer');
      expect(metadata).toEqual({
        id: 'frontend-developer',
        name: 'Frontend Developer',
        description: 'React specialist',
        category: 'Frontend',
        icon: '🎨',
        expertise: ['React', 'TypeScript'],
      });
    });

    it('should return correct category and icon for mode agent', async () => {
      await service.initialize();
      const metadata = service.getMetadata('plan-mode');
      expect(metadata).toEqual({
        id: 'plan-mode',
        name: 'Plan Mode Agent',
        description: 'PLAN mode agent',
        category: 'Mode',
        icon: '🔀',
        expertise: ['Work planning'],
      });
    });

    it('should return null for unknown agent', async () => {
      await service.initialize();
      expect(service.getMetadata('unknown-agent')).toBeNull();
    });
  });

  describe('getMetadataAsync', () => {
    it('should auto-initialize on first call', async () => {
      const metadata = await service.getMetadataAsync('frontend-developer');
      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBe('Frontend Developer');
      expect(mockRulesService.listAgents).toHaveBeenCalledOnce();
    });
  });

  describe('getAllMetadata', () => {
    it('should return all cached metadata', async () => {
      await service.initialize();
      const all = service.getAllMetadata();
      expect(all).toHaveLength(5);
    });

    it('should return empty array before initialization', () => {
      const all = service.getAllMetadata();
      expect(all).toHaveLength(0);
    });
  });

  describe('graceful degradation', () => {
    it('should handle individual agent load failure gracefully', async () => {
      mockRulesService.getAgent.mockRejectedValueOnce(new Error('parse error'));
      await service.initialize();
      const all = service.getAllMetadata();
      expect(all.length).toBe(4);
    });

    it('should handle listAgents failure gracefully', async () => {
      mockRulesService.listAgents.mockRejectedValueOnce(
        new Error('filesystem error'),
      );
      await service.initialize();
      const all = service.getAllMetadata();
      expect(all).toHaveLength(0);
    });
  });
});
