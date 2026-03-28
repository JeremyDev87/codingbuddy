import { Injectable } from '@nestjs/common';
import { ImpactEventService } from './impact-event.service';
import { ImpactEventType, ImpactSummary } from './impact.types';

@Injectable()
export class ImpactReportService {
  constructor(private readonly eventService: ImpactEventService) {}

  getSessionSummary(sessionId: string): ImpactSummary {
    const events = this.eventService.getSessionEvents(sessionId);

    const byType: Partial<Record<ImpactEventType, number>> = {};
    let issuesPrevented = 0;
    const issuesByDomain: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};
    let agentsDispatched = 0;
    const agentNamesSet = new Set<string>();
    let checklistsGenerated = 0;
    const checklistDomainsSet = new Set<string>();
    const modeTransitions: string[] = [];
    let contextDecisions = 0;

    for (const event of events) {
      byType[event.eventType] = (byType[event.eventType] ?? 0) + 1;

      switch (event.eventType) {
        case 'mode_activated':
          if (event.data.mode) {
            modeTransitions.push(event.data.mode);
          }
          break;

        case 'agent_dispatched':
          agentsDispatched++;
          if (event.data.agent) {
            agentNamesSet.add(event.data.agent);
          }
          break;

        case 'checklist_generated':
          checklistsGenerated++;
          if (event.data.domain) {
            checklistDomainsSet.add(event.data.domain);
          }
          break;

        case 'issue_found':
        case 'issue_prevented': {
          const count = event.data.count ?? 1;
          issuesPrevented += count;
          if (event.data.domain) {
            issuesByDomain[event.data.domain] = (issuesByDomain[event.data.domain] ?? 0) + count;
          }
          if (event.data.severity) {
            issuesBySeverity[event.data.severity] =
              (issuesBySeverity[event.data.severity] ?? 0) + count;
          }
          break;
        }

        case 'context_saved':
          contextDecisions += event.data.count ?? 0;
          break;
      }
    }

    return {
      sessionId,
      eventCount: events.length,
      byType,
      impact: {
        issuesPrevented,
        issuesByDomain,
        issuesBySeverity,
        agentsDispatched,
        agentNames: [...agentNamesSet],
        checklistsGenerated,
        checklistDomains: [...checklistDomainsSet],
        modeTransitions,
        contextDecisions,
      },
    };
  }
}
