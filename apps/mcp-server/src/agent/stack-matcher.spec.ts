import { describe, it, expect } from 'vitest';
import { matchStack, type StackMatchInput } from './stack-matcher';

const STACKS: StackMatchInput[] = [
  {
    name: 'api-development',
    category: 'backend',
    tags: ['api', 'backend', 'rest', 'graphql'],
  },
  {
    name: 'security-audit',
    category: 'security',
    tags: ['security', 'audit', 'vulnerability', 'compliance'],
  },
  {
    name: 'frontend-polish',
    category: 'frontend',
    tags: ['ui', 'ux', 'accessibility', 'frontend', 'seo'],
  },
  {
    name: 'data-pipeline',
    category: 'data',
    tags: ['data', 'pipeline', 'etl', 'analytics'],
  },
  {
    name: 'ml-infrastructure',
    category: 'ml',
    tags: ['ml', 'ai', 'model', 'inference', 'training'],
  },
  {
    name: 'full-stack',
    category: 'development',
    tags: ['web', 'fullstack', 'frontend', 'backend'],
  },
];

describe('matchStack', () => {
  describe('API context → api-development stack', () => {
    it('matches REST API prompt to api-development', () => {
      const result = matchStack('Build a new REST API for user registration', STACKS);
      expect(result).not.toBeNull();
      expect(result!.stackName).toBe('api-development');
    });

    it('matches GraphQL prompt to api-development', () => {
      const result = matchStack('Implement GraphQL resolvers for the order service', STACKS);
      expect(result).not.toBeNull();
      expect(result!.stackName).toBe('api-development');
    });

    it('matches backend service prompt to api-development', () => {
      const result = matchStack('Refactor the backend payment service', STACKS);
      expect(result).not.toBeNull();
      expect(result!.stackName).toBe('api-development');
    });
  });

  describe('security context → security-audit stack', () => {
    it('matches security audit prompt', () => {
      const result = matchStack('Perform a security audit on authentication flow', STACKS);
      expect(result).not.toBeNull();
      expect(result!.stackName).toBe('security-audit');
    });

    it('matches vulnerability assessment prompt', () => {
      const result = matchStack('Fix vulnerability in JWT token handling', STACKS);
      expect(result).not.toBeNull();
      expect(result!.stackName).toBe('security-audit');
    });

    it('matches compliance prompt', () => {
      const result = matchStack('Ensure OAuth compliance and fix security issues', STACKS);
      expect(result).not.toBeNull();
      expect(result!.stackName).toBe('security-audit');
    });
  });

  describe('frontend context → frontend-polish stack', () => {
    it('matches UI polish prompt', () => {
      const result = matchStack(
        'Improve the UI accessibility and SEO for the landing page',
        STACKS,
      );
      expect(result).not.toBeNull();
      expect(result!.stackName).toBe('frontend-polish');
    });

    it('matches UX improvement prompt', () => {
      const result = matchStack(
        'Redesign the UX for the checkout flow with better accessibility',
        STACKS,
      );
      expect(result).not.toBeNull();
      expect(result!.stackName).toBe('frontend-polish');
    });
  });

  describe('data context → data-pipeline stack', () => {
    it('matches data pipeline prompt', () => {
      const result = matchStack('Build an ETL pipeline for analytics data', STACKS);
      expect(result).not.toBeNull();
      expect(result!.stackName).toBe('data-pipeline');
    });
  });

  describe('ML context → ml-infrastructure stack', () => {
    it('matches ML model prompt', () => {
      const result = matchStack('Set up model training infrastructure for inference', STACKS);
      expect(result).not.toBeNull();
      expect(result!.stackName).toBe('ml-infrastructure');
    });
  });

  describe('generic prompt → no match', () => {
    it('returns null for generic implementation prompt', () => {
      const result = matchStack('Fix the bug in the user profile component', STACKS);
      expect(result).toBeNull();
    });

    it('returns null for empty prompt', () => {
      const result = matchStack('', STACKS);
      expect(result).toBeNull();
    });

    it('returns null for ambiguous prompt with low confidence', () => {
      const result = matchStack('Implement the feature', STACKS);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('returns null when stacks list is empty', () => {
      const result = matchStack('Build a REST API', []);
      expect(result).toBeNull();
    });

    it('includes matchedTags in result', () => {
      const result = matchStack('Build a REST API with GraphQL support', STACKS);
      expect(result).not.toBeNull();
      expect(result!.matchedTags.length).toBeGreaterThan(0);
    });

    it('has confidence between 0 and 1', () => {
      const result = matchStack('Build a REST API for the backend service', STACKS);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThan(0);
      expect(result!.confidence).toBeLessThanOrEqual(1);
    });

    it('stackBased is always true in result', () => {
      const result = matchStack('Build a REST API', STACKS);
      expect(result).not.toBeNull();
      expect(result!.stackBased).toBe(true);
    });
  });

  describe('Korean prompt support', () => {
    it('matches API-related Korean prompt', () => {
      const result = matchStack('REST API 사용자 등록 엔드포인트 구현', STACKS);
      expect(result).not.toBeNull();
      expect(result!.stackName).toBe('api-development');
    });

    it('matches security-related Korean prompt', () => {
      const result = matchStack('보안 감사 및 취약점 분석 수행', STACKS);
      expect(result).not.toBeNull();
      expect(result!.stackName).toBe('security-audit');
    });
  });
});
