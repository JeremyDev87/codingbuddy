import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ImpactReportService } from './impact-report.service';
import { ImpactEventService } from './impact-event.service';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    appendFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn().mockReturnValue(true),
  };
});

describe('ImpactReportService', () => {
  let service: ImpactReportService;
  let eventService: ImpactEventService;

  beforeEach(() => {
    eventService = new ImpactEventService();
    service = new ImpactReportService(eventService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSessionSummary', () => {
    it('should return empty summary for session with no events', () => {
      const summary = service.getSessionSummary('empty');
      expect(summary.sessionId).toBe('empty');
      expect(summary.eventCount).toBe(0);
      expect(summary.impact.issuesPrevented).toBe(0);
      expect(summary.impact.agentsDispatched).toBe(0);
    });

    it('should count issues prevented from issue_found events', () => {
      eventService.logEvent('s1', 'issue_found', {
        domain: 'security',
        severity: 'high',
        count: 2,
      });
      eventService.logEvent('s1', 'issue_found', {
        domain: 'code-quality',
        severity: 'medium',
        count: 1,
      });

      const summary = service.getSessionSummary('s1');
      expect(summary.impact.issuesPrevented).toBe(3);
      expect(summary.impact.issuesByDomain).toEqual({ security: 2, 'code-quality': 1 });
      expect(summary.impact.issuesBySeverity).toEqual({ high: 2, medium: 1 });
    });

    it('should track dispatched agents', () => {
      eventService.logEvent('s1', 'agent_dispatched', { agent: 'security-specialist' });
      eventService.logEvent('s1', 'agent_dispatched', { agent: 'code-quality-specialist' });
      eventService.logEvent('s1', 'agent_dispatched', { agent: 'security-specialist' }); // duplicate

      const summary = service.getSessionSummary('s1');
      expect(summary.impact.agentsDispatched).toBe(3);
      expect(summary.impact.agentNames).toEqual(['security-specialist', 'code-quality-specialist']);
    });

    it('should track checklist domains', () => {
      eventService.logEvent('s1', 'checklist_generated', { domain: 'security', count: 5 });
      eventService.logEvent('s1', 'checklist_generated', { domain: 'performance', count: 3 });

      const summary = service.getSessionSummary('s1');
      expect(summary.impact.checklistsGenerated).toBe(2);
      expect(summary.impact.checklistDomains).toEqual(['security', 'performance']);
    });

    it('should track mode transitions in order', () => {
      eventService.logEvent('s1', 'mode_activated', { mode: 'PLAN' });
      eventService.logEvent('s1', 'mode_activated', { mode: 'ACT' });
      eventService.logEvent('s1', 'mode_activated', { mode: 'EVAL' });

      const summary = service.getSessionSummary('s1');
      expect(summary.impact.modeTransitions).toEqual(['PLAN', 'ACT', 'EVAL']);
    });

    it('should count context decisions', () => {
      eventService.logEvent('s1', 'context_saved', { count: 3 });
      eventService.logEvent('s1', 'context_saved', { count: 2 });

      const summary = service.getSessionSummary('s1');
      expect(summary.impact.contextDecisions).toBe(5);
    });

    it('should aggregate byType counts', () => {
      eventService.logEvent('s1', 'mode_activated', { mode: 'PLAN' });
      eventService.logEvent('s1', 'mode_activated', { mode: 'ACT' });
      eventService.logEvent('s1', 'agent_dispatched', { agent: 'test' });

      const summary = service.getSessionSummary('s1');
      expect(summary.byType).toEqual({
        mode_activated: 2,
        agent_dispatched: 1,
      });
    });
  });
});
