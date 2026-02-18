import { describe, it, expect } from 'vitest';
import {
  formatContextDecisions,
  formatContextNotes,
  formatContextSection,
} from './context-section.pure';

describe('context-section.pure', () => {
  describe('formatContextDecisions', () => {
    it('formats decisions as numbered list', () => {
      const result = formatContextDecisions(['Use JWT', 'Add rate limiting']);
      expect(result).toBe('  1. Use JWT\n  2. Add rate limiting');
    });

    it('returns null for empty decisions', () => {
      expect(formatContextDecisions([])).toBeNull();
    });

    it('truncates at maxItems with overflow indicator', () => {
      const decisions = ['A', 'B', 'C', 'D', 'E', 'F'];
      const result = formatContextDecisions(decisions, 3);
      expect(result).toBe('  1. A\n  2. B\n  3. C\n  ⋯ (+3 more)');
    });

    it('shows all items when count equals maxItems', () => {
      const result = formatContextDecisions(['A', 'B', 'C'], 3);
      expect(result).toBe('  1. A\n  2. B\n  3. C');
    });

    it('formats single decision', () => {
      expect(formatContextDecisions(['Only one'])).toBe('  1. Only one');
    });
  });

  describe('formatContextNotes', () => {
    it('formats notes with bullet prefix', () => {
      const result = formatContextNotes(['Review codebase', 'Check deps']);
      expect(result).toBe('  › Review codebase\n  › Check deps');
    });

    it('returns null for empty notes', () => {
      expect(formatContextNotes([])).toBeNull();
    });

    it('truncates at maxItems', () => {
      const notes = ['A', 'B', 'C', 'D'];
      const result = formatContextNotes(notes, 2);
      expect(result).toBe('  › A\n  › B\n  ⋯ (+2 more)');
    });

    it('shows all items when count equals maxItems', () => {
      const result = formatContextNotes(['A', 'B'], 2);
      expect(result).toBe('  › A\n  › B');
    });

    it('formats single note', () => {
      expect(formatContextNotes(['Just one note'])).toBe('  › Just one note');
    });
  });

  describe('formatContextSection', () => {
    it('returns null when both decisions and notes are empty', () => {
      expect(formatContextSection([], [])).toBeNull();
    });

    it('returns formatted string with decisions only', () => {
      const result = formatContextSection(['Use JWT'], []);
      expect(result).not.toBeNull();
      expect(result).toContain('1. Use JWT');
    });

    it('returns formatted string with notes only', () => {
      const result = formatContextSection([], ['Consider caching']);
      expect(result).not.toBeNull();
      expect(result).toContain('› Consider caching');
    });

    it('returns formatted string with both decisions and notes', () => {
      const result = formatContextSection(['Decision A'], ['Note B']);
      expect(result).not.toBeNull();
      expect(result).toContain('Decision A');
      expect(result).toContain('Note B');
    });

    it('separates decisions and notes with newline', () => {
      const result = formatContextSection(['D1'], ['N1']);
      expect(result).toBe('  1. D1\n  › N1');
    });
  });
});
