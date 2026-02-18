/**
 * Extracts semantic TUI events from MCP tool responses.
 *
 * The TuiInterceptor calls this after execute() to derive
 * mode:changed, skill:recommended, parallel:started, agent:activated,
 * agent:relationship, and task:synced events from the tool response payload.
 */
import {
  TUI_EVENTS,
  type ModeChangedEvent,
  type SkillRecommendedEvent,
  type ParallelStartedEvent,
  type AgentActivatedEvent,
  type AgentRelationshipEvent,
  type TaskSyncedEvent,
  type ObjectiveSetEvent,
  type ContextUpdatedEvent,
} from './types';
import { parseToolResponseJson } from './parse-tool-response';
import type { Mode } from '../types';

const VALID_MODES: ReadonlySet<string> = new Set<Mode>(['PLAN', 'ACT', 'EVAL', 'AUTO']);
const UNKNOWN_AGENT_ID = 'unknown-agent';

export type ExtractedEvent =
  | { event: typeof TUI_EVENTS.MODE_CHANGED; payload: ModeChangedEvent }
  | {
      event: typeof TUI_EVENTS.SKILL_RECOMMENDED;
      payload: SkillRecommendedEvent;
    }
  | {
      event: typeof TUI_EVENTS.PARALLEL_STARTED;
      payload: ParallelStartedEvent;
    }
  | {
      event: typeof TUI_EVENTS.AGENT_ACTIVATED;
      payload: AgentActivatedEvent;
    }
  | {
      event: typeof TUI_EVENTS.AGENT_RELATIONSHIP;
      payload: AgentRelationshipEvent;
    }
  | {
      event: typeof TUI_EVENTS.TASK_SYNCED;
      payload: TaskSyncedEvent;
    }
  | {
      event: typeof TUI_EVENTS.OBJECTIVE_SET;
      payload: ObjectiveSetEvent;
    }
  | {
      event: typeof TUI_EVENTS.CONTEXT_UPDATED;
      payload: ContextUpdatedEvent;
    };

/**
 * Extract semantic events from a tool response.
 *
 * Inspects the JSON response from specific tools to derive events
 * that the interceptor cannot infer from tool name/args alone.
 */
export function extractEventsFromResponse(toolName: string, result: unknown): ExtractedEvent[] {
  const json = parseToolResponseJson(result);
  if (!json) return [];

  if (toolName === 'parse_mode') {
    return extractFromParseMode(json);
  }

  if (toolName === 'prepare_parallel_agents') {
    return extractFromPrepareParallelAgents(json);
  }

  if (toolName === 'dispatch_agents') {
    return extractFromDispatchAgents(json);
  }

  if (toolName === 'update_context') {
    return extractFromUpdateContext(json);
  }

  return [];
}

function extractFromParseMode(json: Record<string, unknown>): ExtractedEvent[] {
  const events: ExtractedEvent[] = [];
  const delegateName = typeof json.delegates_to === 'string' ? json.delegates_to : null;

  // mode:changed (validate against known Mode values)
  if (typeof json.mode === 'string' && VALID_MODES.has(json.mode)) {
    events.push({
      event: TUI_EVENTS.MODE_CHANGED,
      payload: { from: null, to: json.mode as Mode },
    });
  }

  // skill:recommended + task:synced initial checklist (single pass over included_skills)
  if (Array.isArray(json.included_skills)) {
    const initialTasks: Array<{ id: string; subject: string; completed: boolean }> = [];
    for (const [i, skill] of json.included_skills.entries()) {
      if (!skill || typeof skill !== 'object') continue;
      const s = skill as Record<string, unknown>;
      if (typeof s.name !== 'string') continue;
      events.push({
        event: TUI_EVENTS.SKILL_RECOMMENDED,
        payload: {
          skillName: s.name,
          reason: typeof s.reason === 'string' ? s.reason : '',
        },
      });
      initialTasks.push({ id: `skill-${i}`, subject: `Apply ${s.name}`, completed: false });
    }
    if (initialTasks.length > 0) {
      const agentId = delegateName ? `primary:${delegateName}` : UNKNOWN_AGENT_ID;
      events.push({ event: TUI_EVENTS.TASK_SYNCED, payload: { agentId, tasks: initialTasks } });
    }
  }

  // agent:activated (primary agent from delegates_to)
  if (delegateName) {
    events.push({
      event: TUI_EVENTS.AGENT_ACTIVATED,
      payload: {
        agentId: `primary:${delegateName}`,
        name: delegateName,
        role: 'primary',
        isPrimary: true,
      },
    });
  }

  // agent:relationship (recommended_act_agent → next-phase recommendation)
  const recAgent = json.recommended_act_agent;
  if (recAgent && typeof recAgent === 'object') {
    const rec = recAgent as Record<string, unknown>;
    if (typeof rec.agentName === 'string' && delegateName) {
      events.push({
        event: TUI_EVENTS.AGENT_RELATIONSHIP,
        payload: {
          from: `primary:${delegateName}`,
          to: `recommended:${rec.agentName}`,
          label: 'recommends',
          type: 'recommendation',
        },
      });
    }
  }

  // parallel:started (parallelAgentsRecommendation → pre-register specialists)
  const parRec = json.parallelAgentsRecommendation;
  if (parRec && typeof parRec === 'object') {
    const par = parRec as Record<string, unknown>;
    if (Array.isArray(par.specialists) && par.specialists.length > 0) {
      const specialists = par.specialists.filter((s): s is string => typeof s === 'string');
      if (specialists.length > 0) {
        const parallelMode =
          typeof json.mode === 'string' && VALID_MODES.has(json.mode)
            ? (json.mode as Mode)
            : 'PLAN';
        events.push({
          event: TUI_EVENTS.PARALLEL_STARTED,
          payload: { specialists, mode: parallelMode },
        });
        // Primary → Specialist 관계 엣지
        if (delegateName) {
          for (const name of specialists) {
            events.push({
              event: TUI_EVENTS.AGENT_RELATIONSHIP,
              payload: {
                from: `primary:${delegateName}`,
                to: `specialist:${name}`,
                label: 'parallel',
                type: 'delegation',
              },
            });
          }
        }
      }
    }
  }

  // objective:set
  if (typeof json.originalPrompt === 'string' && json.originalPrompt.trim()) {
    events.push({
      event: TUI_EVENTS.OBJECTIVE_SET,
      payload: { objective: json.originalPrompt.trim() },
    });
  }

  return events;
}

function extractFromPrepareParallelAgents(json: Record<string, unknown>): ExtractedEvent[] {
  const agents = json.agents;
  if (!Array.isArray(agents) || agents.length === 0) return [];

  const specialists = agents
    .map((a: unknown) => {
      if (!a || typeof a !== 'object') return null;
      const agent = a as Record<string, unknown>;
      if (typeof agent.agentName === 'string') return agent.agentName;
      if (typeof agent.name === 'string') return agent.name;
      return null;
    })
    .filter((name): name is string => name !== null);

  if (specialists.length === 0) return [];

  const mode: Mode =
    typeof json.mode === 'string' && VALID_MODES.has(json.mode) ? (json.mode as Mode) : 'PLAN';

  const primaryAgentId = typeof json.primaryAgentId === 'string' ? json.primaryAgentId : null;

  const events: ExtractedEvent[] = [
    {
      event: TUI_EVENTS.PARALLEL_STARTED,
      payload: { specialists, mode },
    },
  ];

  // Primary → Specialist AGENT_RELATIONSHIP 엣지 emit
  if (primaryAgentId) {
    for (const name of specialists) {
      events.push({
        event: TUI_EVENTS.AGENT_RELATIONSHIP,
        payload: {
          from: primaryAgentId,
          to: `specialist:${name}`,
          label: 'parallel',
          type: 'delegation',
        },
      });
    }
  }

  return events;
}

/**
 * Extract delegation relationships from dispatch_agents response.
 */
function extractFromDispatchAgents(json: Record<string, unknown>): ExtractedEvent[] {
  const events: ExtractedEvent[] = [];

  // Extract primary agent name
  const primary = json.primaryAgent;
  const primaryName =
    primary && typeof primary === 'object' ? (primary as Record<string, unknown>).name : null;

  // Extract specialist agents and create delegation relationships
  const specialists = json.specialists ?? json.parallelAgents;
  if (Array.isArray(specialists) && typeof primaryName === 'string') {
    for (const spec of specialists) {
      if (!spec || typeof spec !== 'object') continue;
      const s = spec as Record<string, unknown>;
      const specName =
        typeof s.name === 'string' ? s.name : typeof s.agentName === 'string' ? s.agentName : null;
      if (!specName) continue;

      events.push({
        event: TUI_EVENTS.AGENT_RELATIONSHIP,
        payload: {
          from: `primary:${primaryName}`,
          to: `specialist:${specName}`,
          label: 'delegates',
          type: 'delegation',
        },
      });
    }
  }

  return events;
}

/**
 * Build task list from all section fields with source-aware completion status.
 * - decisions: always completed (decided = done)
 * - progress: completed based on section status
 * - findings: always completed (observed = done)
 * - notes: always incomplete (informational)
 */
function buildTasksFromSection(
  section: Record<string, unknown>,
): Array<{ id: string; subject: string; completed: boolean }> {
  const tasks: Array<{ id: string; subject: string; completed: boolean }> = [];
  const sectionCompleted = section.status === 'completed';

  // decisions: 결정된 사항은 항상 완료
  if (Array.isArray(section.decisions)) {
    section.decisions.forEach((d, i) => {
      if (typeof d === 'string') tasks.push({ id: `ctx-d-${i}`, subject: d, completed: true });
    });
  }

  // progress: 섹션 완료 상태에 의존
  if (Array.isArray(section.progress)) {
    section.progress.forEach((p, i) => {
      if (typeof p === 'string')
        tasks.push({ id: `ctx-p-${i}`, subject: p, completed: sectionCompleted });
    });
  }

  // findings: 관찰된 사항은 항상 완료
  if (Array.isArray(section.findings)) {
    section.findings.forEach((f, i) => {
      if (typeof f === 'string') tasks.push({ id: `ctx-f-${i}`, subject: f, completed: true });
    });
  }

  // notes: 참고 사항은 항상 미완료
  if (Array.isArray(section.notes)) {
    section.notes.forEach((n, i) => {
      if (typeof n === 'string') tasks.push({ id: `ctx-n-${i}`, subject: n, completed: false });
    });
  }

  return tasks;
}

/**
 * Extract task sync events and context updated events from update_context response.
 */
function extractFromUpdateContext(json: Record<string, unknown>): ExtractedEvent[] {
  const doc = json.document;
  if (!doc || typeof doc !== 'object') return [];

  const document = doc as Record<string, unknown>;
  const sections = document.sections;
  if (!Array.isArray(sections) || sections.length === 0) return [];

  const lastSection = sections[sections.length - 1] as Record<string, unknown>;
  const events: ExtractedEvent[] = [];

  // task:synced — existing behavior
  const tasks = buildTasksFromSection(lastSection);
  if (tasks.length > 0) {
    const agentId =
      typeof lastSection.primaryAgent === 'string' ? lastSection.primaryAgent : UNKNOWN_AGENT_ID;
    events.push({ event: TUI_EVENTS.TASK_SYNCED, payload: { agentId, tasks } });
  }

  // context:updated — emit when decisions or notes present
  const decisions = Array.isArray(lastSection.decisions)
    ? lastSection.decisions.filter((d): d is string => typeof d === 'string')
    : [];
  const notes = Array.isArray(lastSection.notes)
    ? lastSection.notes.filter((n): n is string => typeof n === 'string')
    : [];

  if (decisions.length > 0 || notes.length > 0) {
    events.push({
      event: TUI_EVENTS.CONTEXT_UPDATED,
      payload: {
        decisions,
        notes,
        mode: typeof lastSection.mode === 'string' ? lastSection.mode : null,
        status: typeof lastSection.status === 'string' ? lastSection.status : null,
      },
    });
  }

  return events;
}
