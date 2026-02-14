import { describe, it, expect } from 'vitest';
import {
  TREE_CHARS,
  buildCompactTree,
} from './agent-tree.pure';

describe('tui/components/agent-tree.pure', () => {
  describe('TREE_CHARS', () => {
    it('should export box drawing character constants', () => {
      expect(TREE_CHARS.VERTICAL).toBe('│');
      expect(TREE_CHARS.HORIZONTAL).toBe('─');
      expect(TREE_CHARS.TOP_LEFT).toBe('┌');
      expect(TREE_CHARS.BOTTOM_LEFT).toBe('└');
      expect(TREE_CHARS.TEE_RIGHT).toBe('├');
    });
  });

  describe('buildCompactTree', () => {
    it('should return primary-only lines when no parallel agents', () => {
      const result = buildCompactTree(
        {
          icon: '\ud83e\udd16',
          name: 'architect',
          progress: 50,
          statusLabel: 'Running',
        },
        [],
      );
      expect(result.length).toBe(2);
      expect(result[0].key).toBe('primary-header');
      expect(result[0].content).toBe('\u250c Primary');
      expect(result[1].key).toBe('primary-card');
      expect(result[1].content).toContain('\u2514 ');
      expect(result[1].content).toContain('\ud83e\udd16');
      expect(result[1].content).toContain('architect');
      expect(result[1].content).toContain('50%');
      expect(result[1].content).toContain('Running');
    });

    it('should build tree with parallel agents', () => {
      const result = buildCompactTree(
        {
          icon: '\ud83e\udd16',
          name: 'architect',
          progress: 50,
          statusLabel: 'Running',
        },
        [
          {
            icon: '\ud83e\uddea',
            name: 'test-strategy',
            progress: 20,
            statusLabel: 'Running',
          },
          {
            icon: '\ud83d\udd12',
            name: 'security',
            progress: 10,
            statusLabel: 'Running',
          },
        ],
      );
      expect(result[0].content).toBe('\u250c Primary');
      expect(result[1].content).toContain('\ud83e\udd16 architect');
      expect(result[2].content).toBe('\u251c\u2500 Parallel');
      expect(result[3].key).toBe('parallel-test-strategy');
      expect(result[3].content).toContain('\ud83e\uddea test-strategy');
      expect(result[4].key).toBe('parallel-security');
      expect(result[4].content).toContain('\ud83d\udd12 security');
      expect(result[5].key).toBe('footer');
      expect(result[5].content).toBe('\u2514');
    });

    it('should prefix primary card line with vertical bar when parallel agents exist', () => {
      const result = buildCompactTree(
        {
          icon: '\ud83e\udd16',
          name: 'arch',
          progress: 30,
          statusLabel: 'Running',
        },
        [
          {
            icon: '\ud83e\uddea',
            name: 'test',
            progress: 10,
            statusLabel: 'Running',
          },
        ],
      );
      // Primary card line starts with '│ '
      expect(result[1].content.startsWith('\u2502 ')).toBe(true);
      // Parallel card line starts with '│  '
      expect(result[3].content.startsWith('\u2502  ')).toBe(true);
    });
  });
});
