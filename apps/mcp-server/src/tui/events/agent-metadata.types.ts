export type AgentCategory =
  | 'Architecture'
  | 'Testing'
  | 'Security'
  | 'Frontend'
  | 'Backend'
  | 'CodeQuality'
  | 'Performance'
  | 'DevOps'
  | 'Accessibility'
  | 'SEO'
  | 'Documentation'
  | 'Data'
  | 'Mobile'
  | 'AI/ML'
  | 'i18n'
  | 'Observability'
  | 'EventArchitecture'
  | 'Integration'
  | 'Migration'
  | 'Planning'
  | 'Mode';

export interface AgentMetadata {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  icon: string;
  expertise: string[];
}

export const AGENT_CATEGORY_MAP: Record<string, AgentCategory> = {
  // Architecture
  'solution-architect': 'Architecture',
  'architecture-specialist': 'Architecture',
  'agent-architect': 'Architecture',
  // Testing
  'test-strategy-specialist': 'Testing',
  // Security
  'security-specialist': 'Security',
  // Frontend
  'frontend-developer': 'Frontend',
  'ui-ux-designer': 'Frontend',
  // Backend
  'backend-developer': 'Backend',
  // Code Quality
  'code-quality-specialist': 'CodeQuality',
  'code-reviewer': 'CodeQuality',
  // Performance
  'performance-specialist': 'Performance',
  // DevOps
  'devops-engineer': 'DevOps',
  'platform-engineer': 'DevOps',
  'tooling-engineer': 'DevOps',
  // Accessibility
  'accessibility-specialist': 'Accessibility',
  // SEO
  'seo-specialist': 'SEO',
  // Documentation
  'documentation-specialist': 'Documentation',
  // Data
  'data-engineer': 'Data',
  // Mobile
  'mobile-developer': 'Mobile',
  // AI/ML
  'ai-ml-engineer': 'AI/ML',
  // i18n
  'i18n-specialist': 'i18n',
  // Observability
  'observability-specialist': 'Observability',
  // Event Architecture
  'event-architecture-specialist': 'EventArchitecture',
  // Integration
  'integration-specialist': 'Integration',
  // Migration
  'migration-specialist': 'Migration',
  // Planning
  'technical-planner': 'Planning',
  // Mode
  'plan-mode': 'Mode',
  'act-mode': 'Mode',
  'eval-mode': 'Mode',
  'auto-mode': 'Mode',
};

export const AGENT_ICONS: Record<AgentCategory, string> = {
  Architecture: '🏛️',
  Testing: '🧪',
  Security: '🔒',
  Frontend: '🎨',
  Backend: '⚙️',
  CodeQuality: '📏',
  Performance: '⚡',
  DevOps: '🔧',
  Accessibility: '♿',
  SEO: '🔍',
  Documentation: '📝',
  Data: '💾',
  Mobile: '📱',
  'AI/ML': '🤖',
  i18n: '🌐',
  Observability: '📊',
  EventArchitecture: '📨',
  Integration: '🔗',
  Migration: '🔄',
  Planning: '📋',
  Mode: '🔀',
};
