/**
 * Minimum planning behavior contract that must survive standard verbosity.
 * These rules define the core question-first planning workflow.
 */
export const PLANNING_CONTRACT: readonly string[] = [
  'Ask one clarifying question at a time — do not batch questions.',
  'Wait for user confirmation before advancing to the next planning stage.',
  'Use the recommended skill for the current stage (brainstorming for discover, writing-plans for plan).',
  'Present 2-3 alternative approaches with trade-offs before settling on a direction.',
  'Break implementation into bite-sized tasks (2-5 minutes each).',
];

/** Agent IDs that qualify for the planning contract. */
const PLANNING_AGENT_IDS = new Set([
  'technical-planner',
  'solution-architect',
  'plan-mode',
  'auto-mode',
]);

/** Modes that qualify for the planning contract. */
const PLANNING_MODES = new Set(['PLAN', 'AUTO']);

/**
 * Determine whether the planning contract should be included.
 * Returns the contract array if applicable, undefined otherwise.
 */
export function resolvePlanningContract(
  mode: string,
  agentId?: string,
): readonly string[] | undefined {
  if (!PLANNING_MODES.has(mode.toUpperCase())) {
    return undefined;
  }
  if (agentId && PLANNING_AGENT_IDS.has(agentId)) {
    return PLANNING_CONTRACT;
  }
  return undefined;
}
