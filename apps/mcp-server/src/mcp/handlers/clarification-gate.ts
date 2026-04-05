/**
 * Clarification Gate — runtime contract for PLAN ambiguity detection (#1371).
 *
 * Makes clarification a first-class step in the PLAN flow. Instead of optional
 * prompt-style guidance, the gate returns structured metadata that forces the
 * AI client to ask before solutioning when a request is materially ambiguous.
 *
 * Responsibility:
 * - Detect ambiguous PLAN requests via conservative, tunable heuristics.
 * - Emit a single highest-value next question + topic list when unclear.
 * - Honor explicit user overrides ("just do it", "알아서") — never force questions.
 * - Enforce a decrementing question budget so the loop cannot run forever.
 *
 * This module is intentionally pure and free of NestJS dependencies so it can
 * be unit tested in isolation.
 */

/**
 * Default number of clarification rounds allowed before the gate falls back to
 * planning with explicit assumptions. Callers may override via options.
 */
export const DEFAULT_QUESTION_BUDGET = 3;

/**
 * Minimum character length below which a PLAN prompt is treated as too short
 * to contain enough context for planning.
 */
export const MIN_PROMPT_LENGTH = 20;

/**
 * Options accepted by `evaluateClarification`. Callers pass the remaining
 * questionBudget from a prior round; the gate decrements it on each ambiguous
 * round.
 */
export interface ClarificationOptions {
  /** Remaining questions allowed in this session. Defaults to DEFAULT_QUESTION_BUDGET. */
  questionBudget?: number;
}

/**
 * Clarification metadata emitted by the gate and included in the PLAN
 * parse_mode response. Backward-compatible — all fields are additive.
 */
export interface ClarificationMetadata {
  /** True when the request is materially ambiguous and the client should ask before planning. */
  clarificationNeeded: boolean;
  /** True when the gate permits the client to proceed to planning. Mutually exclusive with clarificationNeeded. */
  planReady: boolean;
  /** Questions remaining after this round (may be 0 when the budget is exhausted). */
  questionBudget?: number;
  /** Single highest-value question the client should ask next. Present only when clarificationNeeded=true. */
  nextQuestion?: string;
  /** Ordered list of ambiguity topics ranked by priority. Present only when clarificationNeeded=true. */
  clarificationTopics?: string[];
  /** Human-readable assumption statement emitted when the budget is exhausted. */
  assumptionNote?: string;
}

// ---------------------------------------------------------------------------
// Heuristic primitives — exported for unit testing.
// ---------------------------------------------------------------------------

/**
 * Explicit user-override phrases. When present the gate returns planReady=true
 * immediately, regardless of other ambiguity signals.
 */
const OVERRIDE_PHRASE_PATTERNS: readonly RegExp[] = [
  /\bjust\s+do\s+it\b/i,
  /\buse\s+your\s+(?:judg(?:e)?ment|best\s+guess|discretion)\b/i,
  /\bgo\s+ahead\b/i,
  /\bmake\s+assumptions?\b/i,
  /\bassume\s+(?:whatever|defaults?|reasonable)\b/i,
  /알아서\s*(?:해|진행|처리)/,
  /그냥\s*(?:해|진행)/,
  /임의로\s*(?:해|진행)/,
];

/**
 * Vague intent verbs that describe a desired direction without concrete scope.
 * A prompt containing these without a specific target is likely ambiguous.
 */
const VAGUE_INTENT_PATTERNS: readonly RegExp[] = [
  /\bimprove\b/i,
  /\b(?:make\s+it\s+)?better\b/i,
  /\benhance\b/i,
  /\boptimi[sz]e\b/i,
  /\brefactor\b/i,
  /\bclean\s*up\b/i,
  /\btweak\b/i,
  /\bfix\s+(?:stuff|things|issues?)\b/i,
  /개선/,
  /향상/,
  /최적화/,
  /정리/,
  /개량/,
];

/**
 * Patterns that indicate a concrete technical reference (file path, function
 * call, class name, code identifier). Presence of any of these anchors the
 * request enough to proceed to planning.
 */
const TECHNICAL_REFERENCE_PATTERNS: readonly RegExp[] = [
  // File extensions covering common languages/configs
  /\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt|swift|rb|php|c|cpp|h|hpp|cs|md|mdx|json|ya?ml|toml|sql|sh|bash|zsh|vue|svelte|html|css|scss|sass|less)\b/i,
  // Relative or absolute path with at least one slash between word parts
  /(?:^|[\s([`"'])[\w.-]+\/[\w.\-/]+/,
  // Function or method invocation: identifier followed by parenthesis
  /\b[a-zA-Z_][\w]*\(/,
  // PascalCase / CamelCase identifier with at least two capital segments (e.g., ModeHandler, useFooBar)
  /\b[A-Z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]+\b/,
  // camelCase identifier starting lowercase with at least one later capital (e.g., parseMode)
  /\b[a-z][a-z0-9]+[A-Z][a-zA-Z0-9]+\b/,
  // snake_case identifier (at least one underscore between letters)
  /\b[a-z]+_[a-z][a-z0-9_]*\b/,
  // Backtick-quoted code spans are an explicit "this exact thing" signal
  /`[^`]+`/,
];

/**
 * True when the prompt contains an explicit override phrase such as
 * "just do it" or "알아서 해".
 */
export function hasOverridePhrase(prompt: string): boolean {
  return OVERRIDE_PHRASE_PATTERNS.some(pattern => pattern.test(prompt));
}

/**
 * True when the prompt contains a vague intent verb (improve, enhance,
 * refactor, 개선, …) that describes direction without concrete scope.
 */
export function hasVagueIntent(prompt: string): boolean {
  return VAGUE_INTENT_PATTERNS.some(pattern => pattern.test(prompt));
}

/**
 * True when the prompt references a concrete technical artifact — a file
 * path, function call, class name, or code identifier. This is the strongest
 * "not ambiguous" signal in the heuristic set.
 */
export function hasTechnicalReference(prompt: string): boolean {
  return TECHNICAL_REFERENCE_PATTERNS.some(pattern => pattern.test(prompt));
}

// ---------------------------------------------------------------------------
// Topic ordering + next-question builder
// ---------------------------------------------------------------------------

/** Ambiguity topic identifiers in priority order (highest first). */
export const CLARIFICATION_TOPICS = {
  VAGUE_INTENT: 'vague-intent',
  TARGET_ARTIFACT: 'target-artifact',
  REQUEST_SCOPE: 'request-scope',
} as const;

const TOPIC_PRIORITY: readonly string[] = [
  CLARIFICATION_TOPICS.VAGUE_INTENT,
  CLARIFICATION_TOPICS.TARGET_ARTIFACT,
  CLARIFICATION_TOPICS.REQUEST_SCOPE,
];

/**
 * Map a prioritized topic list into a single highest-value question. The
 * question is phrased to elicit the most blocking piece of missing context.
 */
function buildNextQuestion(topics: readonly string[]): string {
  if (topics.includes(CLARIFICATION_TOPICS.VAGUE_INTENT)) {
    return 'What concrete change are you targeting — which behavior, file, or metric should differ after this task?';
  }
  if (topics.includes(CLARIFICATION_TOPICS.TARGET_ARTIFACT)) {
    return 'Which file, function, module, or component should this change apply to?';
  }
  if (topics.includes(CLARIFICATION_TOPICS.REQUEST_SCOPE)) {
    return 'Can you describe the goal, inputs, and expected outcome in a bit more detail?';
  }
  return 'Can you clarify the scope and success criteria of this request?';
}

/**
 * Order a set of detected topics according to the canonical priority list so
 * the highest-value concern is always first.
 */
function sortTopicsByPriority(topics: Set<string>): string[] {
  return TOPIC_PRIORITY.filter(topic => topics.has(topic));
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Evaluate whether a PLAN request is materially ambiguous and produce the
 * Clarification Gate metadata used by the parse_mode response.
 *
 * Heuristics (conservative — do not over-trigger on well-specified requests):
 * 1. Budget exhausted → planReady=true with an assumption note
 * 2. Explicit override phrase → planReady=true immediately
 * 3. Concrete technical reference (file path, function, identifier) → planReady=true
 * 4. Vague intent verb without scope → clarificationNeeded=true
 * 5. Prompt shorter than `MIN_PROMPT_LENGTH` without tech reference → clarificationNeeded=true
 * 6. Otherwise → planReady=true
 */
export function evaluateClarification(
  prompt: string,
  options: ClarificationOptions = {},
): ClarificationMetadata {
  const budget = options.questionBudget ?? DEFAULT_QUESTION_BUDGET;
  const trimmed = (prompt ?? '').trim();

  // 1. Budget exhausted — proceed with explicit assumptions.
  if (budget <= 0) {
    return {
      clarificationNeeded: false,
      planReady: true,
      questionBudget: 0,
      assumptionNote:
        'Clarification budget exhausted. Proceeding with explicit assumptions — state each assumption clearly in the plan using "assuming …" language so the user can correct course.',
    };
  }

  // 2. User explicitly overrode the gate.
  if (hasOverridePhrase(trimmed)) {
    return {
      clarificationNeeded: false,
      planReady: true,
      questionBudget: budget,
    };
  }

  // 3. Concrete technical reference — strong planReady signal.
  const hasTech = hasTechnicalReference(trimmed);
  if (hasTech) {
    return {
      clarificationNeeded: false,
      planReady: true,
      questionBudget: budget,
    };
  }

  // 4-5. Collect ambiguity topics when no technical anchor is present.
  const topics = new Set<string>();
  if (hasVagueIntent(trimmed)) {
    topics.add(CLARIFICATION_TOPICS.VAGUE_INTENT);
    topics.add(CLARIFICATION_TOPICS.TARGET_ARTIFACT);
  }
  if (trimmed.length > 0 && trimmed.length < MIN_PROMPT_LENGTH) {
    topics.add(CLARIFICATION_TOPICS.REQUEST_SCOPE);
    topics.add(CLARIFICATION_TOPICS.TARGET_ARTIFACT);
  }

  // 6. Nothing triggered — request is clear enough to plan.
  if (topics.size === 0) {
    return {
      clarificationNeeded: false,
      planReady: true,
      questionBudget: budget,
    };
  }

  const orderedTopics = sortTopicsByPriority(topics);
  return {
    clarificationNeeded: true,
    planReady: false,
    questionBudget: budget - 1,
    nextQuestion: buildNextQuestion(orderedTopics),
    clarificationTopics: orderedTopics,
  };
}
