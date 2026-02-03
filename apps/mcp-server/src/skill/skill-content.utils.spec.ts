import {
  truncateSkillContent,
  isSkillContentTruncated,
  MAX_SKILL_CONTENT_LENGTH,
} from './skill-content.utils';

describe('skill-content.utils', () => {
  describe('truncateSkillContent', () => {
    it('should return short content unchanged', () => {
      const shortContent = 'Brief skill description';
      expect(truncateSkillContent(shortContent)).toBe(shortContent);
    });

    it('should return content at exactly max length unchanged', () => {
      const exactContent = 'a'.repeat(MAX_SKILL_CONTENT_LENGTH);
      expect(truncateSkillContent(exactContent)).toBe(exactContent);
    });

    it('should truncate long content and add notice', () => {
      const longContent = 'a'.repeat(MAX_SKILL_CONTENT_LENGTH + 500);
      const result = truncateSkillContent(longContent);

      expect(result.length).toBeLessThanOrEqual(
        MAX_SKILL_CONTENT_LENGTH + 100, // Allow for truncation notice
      );
      expect(result).toContain(
        '[Content truncated. Use `get_skill` tool for full content]',
      );
    });

    it('should cut at last newline within 80% of limit when available', () => {
      // Create content with strategic newlines
      const beforeNewline = 'a'.repeat(
        Math.floor(MAX_SKILL_CONTENT_LENGTH * 0.85),
      );
      const afterNewline = 'b'.repeat(500);
      const content = beforeNewline + '\n' + afterNewline;

      const result = truncateSkillContent(content);

      // Should cut at the newline, not include the 'b' section
      expect(result).toContain('a');
      expect(result).not.toContain('b'.repeat(100));
      expect(result).toContain(
        '[Content truncated. Use `get_skill` tool for full content]',
      );
    });

    it('should use hard cutoff when no newline within 80% threshold', () => {
      // Content with no newlines near the end
      const content = 'x'.repeat(MAX_SKILL_CONTENT_LENGTH + 500);
      const result = truncateSkillContent(content);

      expect(result.length).toBeLessThanOrEqual(
        MAX_SKILL_CONTENT_LENGTH + 100, // Allow for notice
      );
      expect(result).toContain(
        '[Content truncated. Use `get_skill` tool for full content]',
      );
    });

    it('should handle content with multiple newlines', () => {
      const section1 = 'a'.repeat(1000);
      const section2 = 'b'.repeat(1000);
      const section3 = 'c'.repeat(1000);
      const section4 = 'd'.repeat(500);
      const content = [section1, section2, section3, section4].join('\n');

      const result = truncateSkillContent(content);

      expect(result).toContain(
        '[Content truncated. Use `get_skill` tool for full content]',
      );
      // Should preserve some of the early sections
      expect(result).toContain('a');
      expect(result).toContain('b');
    });

    it('should preserve markdown structure when possible', () => {
      const header = '# Skill Title\n\n';
      const paragraph1 = 'First paragraph with content.\n\n';
      const paragraph2 = 'a'.repeat(2000) + '\n\n';
      const paragraph3 = 'Last paragraph ' + 'z'.repeat(1000);
      const content = header + paragraph1 + paragraph2 + paragraph3;

      const result = truncateSkillContent(content);

      // Should include header and some paragraphs
      expect(result).toContain('# Skill Title');
      expect(result).toContain('First paragraph');
      expect(result).toContain(
        '[Content truncated. Use `get_skill` tool for full content]',
      );
    });

    it('should handle empty content', () => {
      expect(truncateSkillContent('')).toBe('');
    });

    it('should handle content with only whitespace', () => {
      const whitespace = '   \n\n   \t   ';
      expect(truncateSkillContent(whitespace)).toBe(whitespace);
    });
  });

  describe('isSkillContentTruncated', () => {
    it('should return false for short content', () => {
      const shortContent = 'Brief content';
      expect(isSkillContentTruncated(shortContent)).toBe(false);
    });

    it('should return false for non-truncated long content', () => {
      const longContent = 'a'.repeat(2000);
      expect(isSkillContentTruncated(longContent)).toBe(false);
    });

    it('should return true for truncated content', () => {
      const longContent = 'a'.repeat(MAX_SKILL_CONTENT_LENGTH + 500);
      const truncated = truncateSkillContent(longContent);
      expect(isSkillContentTruncated(truncated)).toBe(true);
    });

    it('should return false for content that coincidentally ends with similar text', () => {
      const content = 'Some content [Different truncation message]';
      expect(isSkillContentTruncated(content)).toBe(false);
    });

    it('should return true only for exact truncation notice', () => {
      const exactNotice =
        'Content\n\n---\n[Content truncated. Use `get_skill` tool for full content]';
      expect(isSkillContentTruncated(exactNotice)).toBe(true);

      const similarNotice =
        'Content\n\n---\n[Content truncated. Use get_skill tool for full content]';
      expect(isSkillContentTruncated(similarNotice)).toBe(false);
    });

    it('should handle empty content', () => {
      expect(isSkillContentTruncated('')).toBe(false);
    });
  });

  describe('integration: truncate and check', () => {
    it('should correctly identify truncated content after truncation', () => {
      const originalContent = 'x'.repeat(MAX_SKILL_CONTENT_LENGTH + 1000);

      // Not truncated before
      expect(isSkillContentTruncated(originalContent)).toBe(false);

      // Truncate
      const truncated = truncateSkillContent(originalContent);

      // Now truncated
      expect(isSkillContentTruncated(truncated)).toBe(true);
    });

    it('should not double-truncate already truncated content', () => {
      const longContent = 'y'.repeat(MAX_SKILL_CONTENT_LENGTH + 500);
      const firstTruncate = truncateSkillContent(longContent);
      const secondTruncate = truncateSkillContent(firstTruncate);

      // Should be idempotent
      expect(firstTruncate).toBe(secondTruncate);
      expect(isSkillContentTruncated(firstTruncate)).toBe(true);
      expect(isSkillContentTruncated(secondTruncate)).toBe(true);
    });
  });
});
