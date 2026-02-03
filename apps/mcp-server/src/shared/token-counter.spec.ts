import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  measureResponse,
  calculateTotalTokens,
  type TokenMetrics,
} from './token-counter';

describe('token-counter', () => {
  describe('estimateTokens', () => {
    it('should return 0 for empty string', () => {
      expect(estimateTokens('')).toBe(0);
    });

    it('should estimate tokens for short English text', () => {
      // "Hello world" = 11 chars -> ~3 tokens (11/4 = 2.75 -> 3)
      expect(estimateTokens('Hello world')).toBe(3);
    });

    it('should estimate tokens for longer English text', () => {
      // 40 characters -> ~10 tokens
      const text = 'This is a test string for token count';
      expect(estimateTokens(text)).toBe(10); // 38 chars / 4 = 9.5 -> 10
    });

    it('should estimate tokens for Korean text', () => {
      // "안녕하세요" = 5 chars (CJK) -> ~3 tokens (5/2 = 2.5 -> 3)
      expect(estimateTokens('안녕하세요')).toBe(3);
    });

    it('should estimate tokens for Japanese text', () => {
      // "こんにちは" = 5 chars (CJK) -> ~3 tokens
      expect(estimateTokens('こんにちは')).toBe(3);
    });

    it('should estimate tokens for Chinese text', () => {
      // "你好世界" = 4 chars (CJK) -> ~2 tokens
      expect(estimateTokens('你好世界')).toBe(2);
    });

    it('should estimate tokens for mixed English and Korean', () => {
      // "Hello 안녕" = 5 ASCII + 2 CJK = ~3 tokens (5/4=2 + 2/2=1)
      expect(estimateTokens('Hello 안녕')).toBe(3);
    });

    it('should estimate tokens for mixed content with spaces', () => {
      // "Test 테스트" = 5 ASCII (including space) + 3 CJK
      // ASCII: 5/4 = 2, CJK: 3/2 = 2, Total: 4
      expect(estimateTokens('Test 테스트')).toBe(4);
    });

    it('should handle JSON-like strings', () => {
      const json = '{"key": "value", "count": 123}';
      // 30 chars -> ~8 tokens
      expect(estimateTokens(json)).toBe(8);
    });

    it('should handle whitespace correctly', () => {
      // "a b c" = 5 chars -> ~2 tokens
      expect(estimateTokens('a b c')).toBe(2);
    });

    it('should handle special characters', () => {
      // Special chars count as ASCII (4 chars per token)
      expect(estimateTokens('!@#$%^&*()')).toBe(3); // 10 chars / 4 = 2.5 -> 3
    });

    it('should handle very long text', () => {
      const longText = 'a'.repeat(1000);
      // 1000 chars / 4 = 250 tokens
      expect(estimateTokens(longText)).toBe(250);
    });
  });

  describe('measureResponse', () => {
    it('should measure simple string data', () => {
      const data = 'Hello world';
      const metrics = measureResponse('test-component', data);

      expect(metrics.componentName).toBe('test-component');
      expect(metrics.byteSize).toBeGreaterThan(0);
      expect(metrics.estimatedTokens).toBeGreaterThan(0);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should measure object data', () => {
      const data = { name: 'test', value: 123 };
      const metrics = measureResponse('test-object', data);

      expect(metrics.componentName).toBe('test-object');
      expect(metrics.byteSize).toBeGreaterThan(0);
      expect(metrics.estimatedTokens).toBeGreaterThan(0);
    });

    it('should measure array data', () => {
      const data = [1, 2, 3, 4, 5];
      const metrics = measureResponse('test-array', data);

      expect(metrics.componentName).toBe('test-array');
      expect(metrics.byteSize).toBeGreaterThan(0);
      expect(metrics.estimatedTokens).toBeGreaterThan(0);
    });

    it('should measure nested object correctly', () => {
      const data = {
        rules: [
          { name: 'rule1', content: 'Test content' },
          { name: 'rule2', content: 'More content' },
        ],
        metadata: { count: 2 },
      };
      const metrics = measureResponse('nested-object', data);

      expect(metrics.componentName).toBe('nested-object');
      expect(metrics.byteSize).toBeGreaterThan(50);
      expect(metrics.estimatedTokens).toBeGreaterThan(10);
    });

    it('should measure Korean content in object', () => {
      const data = { message: '안녕하세요, 세계!' };
      const metrics = measureResponse('korean-data', data);

      expect(metrics.componentName).toBe('korean-data');
      expect(metrics.estimatedTokens).toBeGreaterThan(0);
    });

    it('should create new timestamp for each measurement', () => {
      const data = 'test';
      const metrics1 = measureResponse('test', data);
      const metrics2 = measureResponse('test', data);

      // Timestamps should be different instances
      expect(metrics1.timestamp).not.toBe(metrics2.timestamp);
    });
  });

  describe('calculateTotalTokens', () => {
    it('should calculate total from empty array', () => {
      const result = calculateTotalTokens([]);

      expect(result.total).toBe(0);
      expect(result.breakdown).toEqual({});
    });

    it('should calculate total from single metric', () => {
      const metrics: TokenMetrics[] = [
        {
          componentName: 'component1',
          byteSize: 100,
          estimatedTokens: 25,
          timestamp: new Date(),
        },
      ];

      const result = calculateTotalTokens(metrics);

      expect(result.total).toBe(25);
      expect(result.breakdown.component1).toBe(25);
    });

    it('should calculate total from multiple metrics', () => {
      const metrics: TokenMetrics[] = [
        {
          componentName: 'rules',
          byteSize: 1000,
          estimatedTokens: 250,
          timestamp: new Date(),
        },
        {
          componentName: 'agents',
          byteSize: 500,
          estimatedTokens: 125,
          timestamp: new Date(),
        },
        {
          componentName: 'config',
          byteSize: 200,
          estimatedTokens: 50,
          timestamp: new Date(),
        },
      ];

      const result = calculateTotalTokens(metrics);

      expect(result.total).toBe(425); // 250 + 125 + 50
      expect(result.breakdown.rules).toBe(250);
      expect(result.breakdown.agents).toBe(125);
      expect(result.breakdown.config).toBe(50);
    });

    it('should handle duplicate component names by using last value', () => {
      const metrics: TokenMetrics[] = [
        {
          componentName: 'component1',
          byteSize: 100,
          estimatedTokens: 25,
          timestamp: new Date(),
        },
        {
          componentName: 'component1',
          byteSize: 200,
          estimatedTokens: 50,
          timestamp: new Date(),
        },
      ];

      const result = calculateTotalTokens(metrics);

      // Both metrics are added to total, breakdown shows last value
      expect(result.total).toBe(75); // 25 + 50
      expect(result.breakdown.component1).toBe(50); // Last value
    });

    it('should maintain correct breakdown with many components', () => {
      const metrics: TokenMetrics[] = Array.from({ length: 10 }, (_, i) => ({
        componentName: `component${i}`,
        byteSize: 100,
        estimatedTokens: 10,
        timestamp: new Date(),
      }));

      const result = calculateTotalTokens(metrics);

      expect(result.total).toBe(100); // 10 * 10
      expect(Object.keys(result.breakdown)).toHaveLength(10);
      expect(result.breakdown.component0).toBe(10);
      expect(result.breakdown.component9).toBe(10);
    });
  });

  describe('integration', () => {
    it('should work with full workflow: measure -> calculate', () => {
      // Simulate measuring multiple components
      const rulesData = {
        rules: ['rule1.md', 'rule2.md'],
        count: 2,
      };
      const agentsData = {
        agents: ['agent1', 'agent2', 'agent3'],
        count: 3,
      };

      const rulesMetrics = measureResponse('rules', rulesData);
      const agentsMetrics = measureResponse('agents', agentsData);

      const total = calculateTotalTokens([rulesMetrics, agentsMetrics]);

      expect(total.total).toBeGreaterThan(0);
      expect(total.breakdown.rules).toBe(rulesMetrics.estimatedTokens);
      expect(total.breakdown.agents).toBe(agentsMetrics.estimatedTokens);
      expect(total.total).toBe(
        rulesMetrics.estimatedTokens + agentsMetrics.estimatedTokens,
      );
    });
  });
});
