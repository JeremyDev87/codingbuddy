export interface AgentIconEntry {
  readonly nerdFont: string;
  readonly fallback: string;
}

export function isNerdFontEnabled(): boolean {
  const value = process.env.TERM_NERD_FONT;
  return value === '1' || value === 'true';
}

const DEFAULT_ICON: AgentIconEntry = { nerdFont: '\u{F06A9}', fallback: '[?]' };

export const AGENT_ICONS: Readonly<Record<string, AgentIconEntry>> =
  Object.freeze({
    // Specialist agents
    'accessibility-specialist': { nerdFont: '\u{F0001}', fallback: '[Ac]' },
    'architecture-specialist': { nerdFont: '\u{F03D7}', fallback: '[Ar]' },
    'code-quality-specialist': { nerdFont: '\u{F00E2}', fallback: '[CQ]' },
    'code-reviewer': { nerdFont: '\u{F022E}', fallback: '[CR]' },
    'documentation-specialist': { nerdFont: '\u{F0219}', fallback: '[Do]' },
    'event-architecture-specialist': {
      nerdFont: '\u{F0C0B}',
      fallback: '[Ev]',
    },
    'integration-specialist': { nerdFont: '\u{F0318}', fallback: '[In]' },
    'migration-specialist': { nerdFont: '\u{F006F}', fallback: '[Mi]' },
    'observability-specialist': { nerdFont: '\u{F00AE}', fallback: '[Ob]' },
    'performance-specialist': { nerdFont: '\u{F04C5}', fallback: '[Pf]' },
    'security-specialist': { nerdFont: '\u{F0483}', fallback: '[Se]' },
    'seo-specialist': { nerdFont: '\u{F02AF}', fallback: '[SO]' },
    'test-strategy-specialist': { nerdFont: '\u{F0668}', fallback: '[Ts]' },
    'i18n-specialist': { nerdFont: '\u{F05CA}', fallback: '[i8]' },
    // Developer roles
    'frontend-developer': { nerdFont: '\u{F059F}', fallback: '[Fe]' },
    'backend-developer': { nerdFont: '\u{F048B}', fallback: '[Be]' },
    'mobile-developer': { nerdFont: '\u{F011C}', fallback: '[Mo]' },
    'data-engineer': { nerdFont: '\u{F01BC}', fallback: '[Da]' },
    'ai-ml-engineer': { nerdFont: '\u{F09D1}', fallback: '[AI]' },
    'platform-engineer': { nerdFont: '\u{F08C0}', fallback: '[Pl]' },
    'tooling-engineer': { nerdFont: '\u{F05B7}', fallback: '[To]' },
    'devops-engineer': { nerdFont: '\u{F0142}', fallback: '[Dv]' },
    'ui-ux-designer': { nerdFont: '\u{F027C}', fallback: '[Ux]' },
    'solution-architect': { nerdFont: '\u{F0B32}', fallback: '[SA]' },
    'agent-architect': { nerdFont: '\u{F06E1}', fallback: '[AA]' },
    // Mode agents
    'plan-mode': { nerdFont: '\u{F0645}', fallback: '[PM]' },
    'act-mode': { nerdFont: '\u{F040A}', fallback: '[AM]' },
    'eval-mode': { nerdFont: '\u{F0463}', fallback: '[EM]' },
    // Planner
    'technical-planner': { nerdFont: '\u{F051A}', fallback: '[TP]' },
  });

export function getAgentIcon(agentName: string): string {
  const entry = AGENT_ICONS[agentName] ?? DEFAULT_ICON;
  return isNerdFontEnabled() ? entry.nerdFont : entry.fallback;
}
