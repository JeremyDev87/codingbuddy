export type ImpactEventType =
  | 'mode_activated'
  | 'agent_dispatched'
  | 'checklist_generated'
  | 'issue_found'
  | 'issue_prevented'
  | 'context_saved'
  | 'rule_matched';

export interface ImpactEventData {
  mode?: string;
  agent?: string;
  domain?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  count?: number;
  detail?: string;
}

export interface ImpactEvent {
  timestamp: string;
  sessionId: string;
  eventType: ImpactEventType;
  data: ImpactEventData;
}

export interface ImpactSummary {
  sessionId: string;
  eventCount: number;
  byType: Partial<Record<ImpactEventType, number>>;
  impact: {
    issuesPrevented: number;
    issuesByDomain: Record<string, number>;
    issuesBySeverity: Record<string, number>;
    agentsDispatched: number;
    agentNames: string[];
    checklistsGenerated: number;
    checklistDomains: string[];
    modeTransitions: string[];
    contextDecisions: number;
  };
}

export const IMPACT_EVENTS_FILE = 'docs/codingbuddy/impact-events.jsonl';
