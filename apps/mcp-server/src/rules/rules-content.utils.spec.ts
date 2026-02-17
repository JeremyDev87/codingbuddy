import { truncateRuleContent, shouldIncludeContent } from './rules-content.utils';

describe('rules-content.utils', () => {
  describe('shouldIncludeContent', () => {
    it('should return false for minimal verbosity', () => {
      expect(shouldIncludeContent('minimal')).toBe(false);
    });

    it('should return true for standard verbosity', () => {
      expect(shouldIncludeContent('standard')).toBe(true);
    });

    it('should return true for full verbosity', () => {
      expect(shouldIncludeContent('full')).toBe(true);
    });
  });

  describe('truncateRuleContent', () => {
    describe('minimal verbosity', () => {
      it('should return empty string', () => {
        const content = 'Some content';
        expect(truncateRuleContent(content, 'minimal')).toBe('');
      });

      it('should return empty string for long content', () => {
        const content = 'x'.repeat(10000);
        expect(truncateRuleContent(content, 'minimal')).toBe('');
      });
    });

    describe('full verbosity', () => {
      it('should return original content unchanged', () => {
        const content = 'Some content';
        expect(truncateRuleContent(content, 'full')).toBe(content);
      });

      it('should return long content unchanged', () => {
        const content = 'x'.repeat(10000);
        expect(truncateRuleContent(content, 'full')).toBe(content);
      });
    });

    describe('standard verbosity', () => {
      it('should return short content unchanged', () => {
        const content = 'Short content';
        expect(truncateRuleContent(content, 'standard')).toBe(content);
      });

      it('should return content under limit unchanged', () => {
        const content = 'x'.repeat(1999);
        expect(truncateRuleContent(content, 'standard')).toBe(content);
      });

      it('should truncate long content at limit', () => {
        const content = 'x'.repeat(5000);
        const result = truncateRuleContent(content, 'standard');

        expect(result.length).toBeLessThan(content.length);
        expect(result.length).toBeGreaterThan(1900); // Should be close to 2000
        expect(result).toContain('[Content truncated');
      });

      it('should preserve markdown structure when truncating at heading', () => {
        const content = `# Title

Some content here.

## Section 1

${'x'.repeat(1800)}

## Section 2

${'y'.repeat(1800)}`;

        const result = truncateRuleContent(content, 'standard');

        // Should truncate before Section 2
        expect(result).toContain('## Section 1');
        expect(result).not.toContain('## Section 2');
        expect(result).toContain('[Content truncated');
      });

      it('should break at paragraph boundary when no heading available', () => {
        const content = `First paragraph.

${'x'.repeat(1900)}

Second paragraph.

${'y'.repeat(1900)}`;

        const result = truncateRuleContent(content, 'standard');

        expect(result.length).toBeGreaterThan(1900);
        expect(result.length).toBeLessThan(2100);
        expect(result).toContain('[Content truncated');
      });

      it('should break at line boundary as fallback', () => {
        const content = 'x'.repeat(1950) + '\n' + 'y'.repeat(1950);
        const result = truncateRuleContent(content, 'standard');

        expect(result.length).toBeGreaterThan(1900);
        expect(result.length).toBeLessThan(2100);
        expect(result).toContain('[Content truncated');
      });

      it('should handle content without good break points', () => {
        // Single long line
        const content = 'x'.repeat(5000);
        const result = truncateRuleContent(content, 'standard');

        expect(result.length).toBeGreaterThan(1900);
        expect(result.length).toBeLessThan(2100);
        expect(result).toContain('[Content truncated');
      });

      it('should trim whitespace after truncation', () => {
        const content = 'x'.repeat(1950) + '   \n\n  ' + 'y'.repeat(1950);
        const result = truncateRuleContent(content, 'standard');

        // Should not end with whitespace before truncation notice
        const withoutNotice = result.replace(/\n\n_\[Content truncated.*\]_$/, '');
        expect(withoutNotice).not.toMatch(/\s$/);
      });

      it('should include character count in truncation notice', () => {
        const content = 'x'.repeat(5000);
        const result = truncateRuleContent(content, 'standard');

        expect(result).toMatch(/\[Content truncated at \d+ characters/);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        expect(truncateRuleContent('', 'minimal')).toBe('');
        expect(truncateRuleContent('', 'standard')).toBe('');
        expect(truncateRuleContent('', 'full')).toBe('');
      });

      it('should handle content exactly at limit', () => {
        const content = 'x'.repeat(2000);
        const result = truncateRuleContent(content, 'standard');
        expect(result).toBe(content);
      });

      it('should handle content one char over limit', () => {
        const content = 'x'.repeat(2001);
        const result = truncateRuleContent(content, 'standard');
        // Result may be longer due to truncation notice, but truncation occurred
        expect(result).toContain('[Content truncated');
        // Original content should not be fully present
        expect(result).not.toContain('x'.repeat(2001));
      });
    });
  });
});
