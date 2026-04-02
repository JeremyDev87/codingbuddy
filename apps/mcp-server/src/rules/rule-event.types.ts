export const RULE_EVENT_TYPES = [
  'mode_activated',
  'checklist_generated',
  'specialist_dispatched',
  'violation_caught',
] as const;

export type RuleEventType = (typeof RULE_EVENT_TYPES)[number];

export interface RuleEvent {
  type: RuleEventType;
  timestamp: string;
  domain?: string;
  rule?: string;
  details?: Record<string, unknown>;
}
