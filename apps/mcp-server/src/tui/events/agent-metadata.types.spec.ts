import { describe, it, expect } from 'vitest';
import { type AgentCategory, AGENT_CATEGORY_MAP, AGENT_ICONS } from './agent-metadata.types';

describe('AGENT_CATEGORY_MAP', () => {
  it('should have category for all known agents', () => {
    const knownAgents = [
      'solution-architect',
      'architecture-specialist',
      'agent-architect',
      'test-strategy-specialist',
      'security-specialist',
      'frontend-developer',
      'ui-ux-designer',
      'backend-developer',
      'code-quality-specialist',
      'code-reviewer',
      'performance-specialist',
      'devops-engineer',
      'platform-engineer',
      'tooling-engineer',
      'accessibility-specialist',
      'seo-specialist',
      'documentation-specialist',
      'data-engineer',
      'mobile-developer',
      'ai-ml-engineer',
      'i18n-specialist',
      'observability-specialist',
      'event-architecture-specialist',
      'integration-specialist',
      'migration-specialist',
      'technical-planner',
      'plan-mode',
      'act-mode',
      'eval-mode',
    ];
    for (const agent of knownAgents) {
      expect(AGENT_CATEGORY_MAP[agent], `Missing category for agent: ${agent}`).toBeDefined();
    }
  });

  it('should return valid AgentCategory values', () => {
    const validCategories: AgentCategory[] = [
      'Architecture',
      'Testing',
      'Security',
      'Frontend',
      'Backend',
      'CodeQuality',
      'Performance',
      'DevOps',
      'Accessibility',
      'SEO',
      'Documentation',
      'Data',
      'Mobile',
      'AI/ML',
      'i18n',
      'Observability',
      'EventArchitecture',
      'Integration',
      'Migration',
      'Planning',
      'Mode',
    ];
    for (const category of Object.values(AGENT_CATEGORY_MAP)) {
      expect(validCategories).toContain(category);
    }
  });
});

describe('AGENT_ICONS', () => {
  it('should have icon for every category', () => {
    const categories: AgentCategory[] = [
      'Architecture',
      'Testing',
      'Security',
      'Frontend',
      'Backend',
      'CodeQuality',
      'Performance',
      'DevOps',
      'Accessibility',
      'SEO',
      'Documentation',
      'Data',
      'Mobile',
      'AI/ML',
      'i18n',
      'Observability',
      'EventArchitecture',
      'Integration',
      'Migration',
      'Planning',
      'Mode',
    ];
    for (const cat of categories) {
      expect(AGENT_ICONS[cat], `Missing icon for category: ${cat}`).toBeDefined();
    }
  });

  it('should return non-empty string icons', () => {
    for (const [category, icon] of Object.entries(AGENT_ICONS)) {
      expect(icon.length, `Empty icon for category: ${category}`).toBeGreaterThan(0);
    }
  });
});
