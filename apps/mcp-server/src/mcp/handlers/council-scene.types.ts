/**
 * Council Scene Types — first-response council-scene contract (#1366).
 *
 * When present in the parse_mode response, the consuming assistant should
 * open its first visible response with a Tiny Actor council scene followed
 * by structured consensus output (risks / disagreements / next step).
 */

/** A single cast member in the council scene */
export interface CouncilSceneCastMember {
  /** Agent identifier (kebab-case slug, e.g. "technical-planner") */
  name: string;
  /** Role in the council */
  role: 'primary' | 'specialist';
  /** ASCII face expression (e.g. "◇‿◇") */
  face: string;
}

/**
 * Opening council-scene contract for eligible workflow modes.
 *
 * Scoped to PLAN, EVAL, and AUTO modes. ACT mode and unrelated
 * prompts must NOT include this field.
 */
export interface CouncilScene {
  /** Whether the council scene should be rendered */
  enabled: boolean;
  /** Ordered list of council members (primary first) */
  cast: CouncilSceneCastMember[];
  /** Opening moderator line for the scene */
  moderatorCopy: string;
  /** Rendering format hint */
  format: 'tiny-actor-grid';
}
