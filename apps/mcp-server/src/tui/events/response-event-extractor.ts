/**
 * Extracts semantic TUI events from MCP tool responses.
 *
 * The TuiInterceptor calls this after execute() to derive
 * mode:changed, skill:recommended, and parallel:started events
 * from the tool response payload.
 */
import {
  TUI_EVENTS,
  type ModeChangedEvent,
  type SkillRecommendedEvent,
  type ParallelStartedEvent,
} from './types';
import { parseToolResponseJson } from './parse-tool-response';
import type { Mode } from '../../keyword/keyword.types';

const VALID_MODES: ReadonlySet<string> = new Set<Mode>(['PLAN', 'ACT', 'EVAL', 'AUTO']);

export type ExtractedEvent =
  | { event: typeof TUI_EVENTS.MODE_CHANGED; payload: ModeChangedEvent }
  | {
      event: typeof TUI_EVENTS.SKILL_RECOMMENDED;
      payload: SkillRecommendedEvent;
    }
  | {
      event: typeof TUI_EVENTS.PARALLEL_STARTED;
      payload: ParallelStartedEvent;
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

  return [];
}

function extractFromParseMode(json: Record<string, unknown>): ExtractedEvent[] {
  const events: ExtractedEvent[] = [];

  // mode:changed (validate against known Mode values)
  if (typeof json.mode === 'string' && VALID_MODES.has(json.mode)) {
    events.push({
      event: TUI_EVENTS.MODE_CHANGED,
      payload: { from: null, to: json.mode as Mode },
    });
  }

  // skill:recommended
  if (Array.isArray(json.included_skills)) {
    for (const skill of json.included_skills) {
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
    }
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

  return [
    {
      event: TUI_EVENTS.PARALLEL_STARTED,
      payload: { specialists, mode },
    },
  ];
}
