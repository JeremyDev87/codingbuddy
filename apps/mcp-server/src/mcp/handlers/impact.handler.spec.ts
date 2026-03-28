import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImpactHandler } from './impact.handler';
import { ImpactReportService } from '../../impact/impact-report.service';
import type { ImpactSummary } from '../../impact/impact.types';

describe('ImpactHandler', () => {
  let handler: ImpactHandler;
  let mockReportService: ImpactReportService;

  const mockSummary: ImpactSummary = {
    sessionId: 'test-session',
    eventCount: 3,
    byType: { mode_activated: 1, agent_dispatched: 2 },
    impact: {
      issuesPrevented: 1,
      issuesByDomain: { security: 1 },
      issuesBySeverity: { high: 1 },
      agentsDispatched: 2,
      agentNames: ['security-specialist'],
      checklistsGenerated: 0,
      checklistDomains: [],
      modeTransitions: ['PLAN'],
      contextDecisions: 0,
    },
  };

  beforeEach(() => {
    mockReportService = {
      getSessionSummary: vi.fn().mockReturnValue(mockSummary),
    } as unknown as ImpactReportService;

    handler = new ImpactHandler(mockReportService);
  });

  describe('handle', () => {
    it('should return null for unhandled tools', async () => {
      const result = await handler.handle('unknown_tool', {});
      expect(result).toBeNull();
    });

    it('should return impact summary for given sessionId', async () => {
      const result = await handler.handle('get_session_impact', {
        sessionId: 'test-session',
      });

      expect(result?.isError).toBeFalsy();
      expect(mockReportService.getSessionSummary).toHaveBeenCalledWith('test-session');
      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.sessionId).toBe('test-session');
      expect(parsed.eventCount).toBe(3);
    });

    it('should use "current" as default sessionId when not provided', async () => {
      const result = await handler.handle('get_session_impact', {});

      expect(result?.isError).toBeFalsy();
      expect(mockReportService.getSessionSummary).toHaveBeenCalledWith('current');
    });

    it('should return empty summary for unknown sessionId', async () => {
      const emptySummary: ImpactSummary = {
        sessionId: 'unknown',
        eventCount: 0,
        byType: {},
        impact: {
          issuesPrevented: 0,
          issuesByDomain: {},
          issuesBySeverity: {},
          agentsDispatched: 0,
          agentNames: [],
          checklistsGenerated: 0,
          checklistDomains: [],
          modeTransitions: [],
          contextDecisions: 0,
        },
      };
      mockReportService.getSessionSummary = vi.fn().mockReturnValue(emptySummary);

      const result = await handler.handle('get_session_impact', {
        sessionId: 'unknown',
      });

      expect(result?.isError).toBeFalsy();
      const parsed = JSON.parse(result!.content[0].text);
      expect(parsed.eventCount).toBe(0);
    });
  });

  describe('getToolDefinitions', () => {
    it('should return tool definition for get_session_impact', () => {
      const definitions = handler.getToolDefinitions();

      expect(definitions).toHaveLength(1);
      expect(definitions[0].name).toBe('get_session_impact');
    });

    it('should have sessionId as optional parameter', () => {
      const definitions = handler.getToolDefinitions();
      const def = definitions[0];

      expect(def.inputSchema.properties).toHaveProperty('sessionId');
      expect(def.inputSchema.required).toBeUndefined();
    });
  });
});
