/**
 * Council Scene Builder — constructs the opening council-scene contract (#1366).
 *
 * Pure function: no I/O, no side-effects. Depends only on data already
 * resolved by the handler (councilPreset, visual data, agent IDs).
 */

import type { CouncilScene, CouncilSceneCastMember } from './council-scene.types';
import type { CouncilPreset } from '../../agent/council-preset.types';
import type { Mode, VisualData, AgentVisualInfo } from '../../keyword/keyword.types';

/** Default face when no visual data is available */
const DEFAULT_FACE = '●‿●';

/** Mode-specific moderator opening lines (deterministic, testable) */
const MODERATOR_COPY: Partial<Record<Mode, string>> = {
  PLAN: 'Council assembled — let us design this together.',
  EVAL: 'Review council convened — specialists are ready.',
  AUTO: 'Autonomous council activated — full cycle begins.',
};

/** Optional agent ID fallback for modes without a council preset */
export interface CouncilSceneFallback {
  /** Primary agent ID (e.g. "agent-architect") */
  delegatesTo?: string;
  /** Specialist agent IDs (e.g. ["security-specialist", ...]) */
  specialists?: string[];
}

/**
 * Build first-response rendering instructions for the council scene.
 * Returns instruction text to append to the mode instructions, or undefined if no scene.
 */
export function buildCouncilSceneInstructions(councilScene?: CouncilScene): string | undefined {
  if (!councilScene?.enabled || !councilScene.cast?.length) {
    return undefined;
  }

  const castLines = councilScene.cast.map(m => `${m.face} ${m.name} [${m.role}]`).join('\n');

  return (
    `\n\n📋 COUNCIL SCENE — Render this at the start of your first response, ` +
    `right after the mode header:\n\n` +
    `${councilScene.moderatorCopy}\n${castLines}\n\n` +
    `Then proceed with your normal ${councilScene.format || 'standard'} mode response.`
  );
}

/**
 * Build a CouncilScene for the given mode, or return undefined for ACT mode.
 *
 * Resolution strategy:
 * - PLAN/EVAL → uses councilPreset (primary + specialists), faces from visual
 * - AUTO → visual.agents first, then agent ID fallback
 * - ACT → undefined (no council scene)
 */
export function buildCouncilScene(
  mode: Mode,
  councilPreset: CouncilPreset | undefined,
  visual: VisualData | undefined,
  fallback?: CouncilSceneFallback,
): CouncilScene | undefined {
  if (mode === 'ACT') {
    return undefined;
  }

  const moderatorCopy = MODERATOR_COPY[mode];
  if (!moderatorCopy) {
    return undefined;
  }

  const cast = buildCast(councilPreset, visual, fallback);
  if (cast.length === 0) {
    return undefined;
  }

  return {
    enabled: true,
    cast,
    moderatorCopy,
    format: 'tiny-actor-grid',
  };
}

/**
 * Build the cast list for the council scene.
 */
function buildCast(
  councilPreset: CouncilPreset | undefined,
  visual: VisualData | undefined,
  fallback?: CouncilSceneFallback,
): CouncilSceneCastMember[] {
  // Build a face lookup from visual agents (keyed by display name and slug)
  const faceLookup = new Map<string, string>();
  if (visual?.agents) {
    for (const agent of visual.agents) {
      faceLookup.set(agent.name, agent.face);
      const slug = agent.name.toLowerCase().replace(/\s+/g, '-');
      faceLookup.set(slug, agent.face);
    }
  }

  // Priority 1: councilPreset (PLAN/EVAL)
  if (councilPreset) {
    return buildCastFromPreset(councilPreset, faceLookup);
  }

  // Priority 2: visual agents (when loaded)
  if (visual?.agents?.length) {
    return buildCastFromVisual(visual.agents);
  }

  // Priority 3: agent ID fallback (AUTO mode when visual loading fails)
  if (fallback?.delegatesTo) {
    return buildCastFromFallback(fallback, faceLookup);
  }

  return [];
}

/**
 * Build cast from a council preset, cross-referencing faces from visual data.
 */
function buildCastFromPreset(
  preset: CouncilPreset,
  faceLookup: Map<string, string>,
): CouncilSceneCastMember[] {
  const cast: CouncilSceneCastMember[] = [];

  cast.push({
    name: preset.primary,
    role: 'primary',
    face: faceLookup.get(preset.primary) ?? DEFAULT_FACE,
  });

  for (const specialist of preset.specialists) {
    cast.push({
      name: specialist,
      role: 'specialist',
      face: faceLookup.get(specialist) ?? DEFAULT_FACE,
    });
  }

  return cast;
}

/**
 * Build cast from visual agent info.
 * First agent is tagged as primary, rest as specialists.
 */
function buildCastFromVisual(agents: AgentVisualInfo[]): CouncilSceneCastMember[] {
  const [first, ...rest] = agents;
  const cast: CouncilSceneCastMember[] = [];

  if (first) {
    cast.push({
      name: first.name,
      role: 'primary',
      face: first.face || DEFAULT_FACE,
    });
  }

  for (const agent of rest) {
    cast.push({
      name: agent.name,
      role: 'specialist',
      face: agent.face || DEFAULT_FACE,
    });
  }

  return cast;
}

/**
 * Build cast from agent ID fallback (when visual data is unavailable).
 */
function buildCastFromFallback(
  fallback: CouncilSceneFallback,
  faceLookup: Map<string, string>,
): CouncilSceneCastMember[] {
  const cast: CouncilSceneCastMember[] = [];

  if (fallback.delegatesTo) {
    cast.push({
      name: fallback.delegatesTo,
      role: 'primary',
      face: faceLookup.get(fallback.delegatesTo) ?? DEFAULT_FACE,
    });
  }

  if (fallback.specialists) {
    for (const specialist of fallback.specialists) {
      cast.push({
        name: specialist,
        role: 'specialist',
        face: faceLookup.get(specialist) ?? DEFAULT_FACE,
      });
    }
  }

  return cast;
}
