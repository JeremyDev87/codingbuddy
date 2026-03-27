import type {
  AgentVisualRaw,
  AgentVisualInfo,
  CollaborationConfig,
  VisualData,
} from './keyword.types';

/** ANSI color name to display color mapping */
const COLOR_MAP: Record<string, string> = {
  bright: 'magenta',
  blue: 'blue',
  green: 'green',
  yellow: 'yellow',
  red: 'red',
  cyan: 'cyan',
  white: 'white',
};

/** Default eye symbol when visual data is missing */
const DEFAULT_EYE = '●';

/** Default color when colorAnsi is missing */
const DEFAULT_COLOR = 'white';

/**
 * Build face expression from eye symbol.
 * Combines eye symbol with a smile to create a character face.
 *
 * @example buildFace('◇') => '◇‿◇'
 */
export function buildFace(eye: string): string {
  return `${eye}‿${eye}`;
}

/**
 * Map ANSI color name to display color.
 * Falls back to input value if no mapping exists.
 */
export function mapColor(colorAnsi: string | undefined): string {
  if (!colorAnsi) return DEFAULT_COLOR;
  return COLOR_MAP[colorAnsi] ?? colorAnsi;
}

/**
 * Build ASCII art banner for the current mode.
 * Uses the mode agent's eye symbol to create a character face in the banner.
 */
export function buildBanner(modeEye: string, modeName: string): string {
  const face = buildFace(modeEye);
  return `╭━━━━━╮\n┃ ${face} ┃ ${modeName} mode!\n╰━━┳━━╯`;
}

/**
 * Build collaboration config based on eco setting.
 * eco=true  → "minimal" (core consensus only)
 * eco=false → "discussion" (full agent discussion)
 */
export function buildCollaboration(eco: boolean): CollaborationConfig {
  return {
    format: eco ? 'minimal' : 'discussion',
    renderHint: 'Display agent collaboration in character format',
  };
}

/** Input for building agent visual info */
export interface AgentVisualInput {
  name: string;
  visual?: AgentVisualRaw;
}

/**
 * Build complete visual data for parse_mode response.
 *
 * @param modeName - Current mode name (e.g., "PLAN", "ACT")
 * @param modeVisual - Visual data from the mode agent JSON
 * @param primaryAgent - Primary agent with optional visual data
 * @param specialists - Specialist agents with optional visual data
 * @param eco - Whether eco mode is enabled (affects collaboration format)
 */
export function buildVisualData(
  modeName: string,
  modeVisual: AgentVisualRaw | undefined,
  primaryAgent: AgentVisualInput | undefined,
  specialists: AgentVisualInput[],
  eco: boolean,
): VisualData {
  const modeEye = modeVisual?.eye ?? DEFAULT_EYE;

  const agents: AgentVisualInfo[] = [];

  // Add primary agent as "analyzing"
  if (primaryAgent) {
    agents.push({
      name: primaryAgent.name,
      face: buildFace(primaryAgent.visual?.eye ?? DEFAULT_EYE),
      color: mapColor(primaryAgent.visual?.colorAnsi),
      status: 'analyzing',
    });
  }

  // Add specialists as "waiting"
  for (const specialist of specialists) {
    agents.push({
      name: specialist.name,
      face: buildFace(specialist.visual?.eye ?? DEFAULT_EYE),
      color: mapColor(specialist.visual?.colorAnsi),
      status: 'waiting',
    });
  }

  return {
    banner: buildBanner(modeEye, modeName),
    agents,
    collaboration: buildCollaboration(eco),
  };
}
