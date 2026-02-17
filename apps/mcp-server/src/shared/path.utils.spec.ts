import { describe, it, expect } from 'vitest';
import { pathContainsSegment } from './path.utils';

describe('path.utils', () => {
  describe('pathContainsSegment', () => {
    it('should find segment in middle of path', () => {
      expect(pathContainsSegment('src/components/Button.tsx', 'components')).toBe(true);
    });

    it('should find segment at start of path', () => {
      expect(pathContainsSegment('components/Button.tsx', 'components')).toBe(true);
    });

    it('should not match partial segment names', () => {
      expect(pathContainsSegment('src/mycomponents/Button.tsx', 'components')).toBe(false);
    });

    it('should not match segment in filename', () => {
      expect(pathContainsSegment('src/components.tsx', 'components')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(pathContainsSegment('src/Components/Button.tsx', 'components')).toBe(true);
      expect(pathContainsSegment('src/COMPONENTS/Button.tsx', 'components')).toBe(true);
    });

    it('should handle backslashes', () => {
      expect(pathContainsSegment('src\\components\\Button.tsx', 'components')).toBe(true);
    });

    it('should handle mixed slashes', () => {
      expect(pathContainsSegment('src\\components/Button.tsx', 'components')).toBe(true);
    });

    it('should return false for non-matching segment', () => {
      expect(pathContainsSegment('src/utils/helper.ts', 'components')).toBe(false);
    });

    it('should handle empty path', () => {
      expect(pathContainsSegment('', 'components')).toBe(false);
    });

    it('should handle nested paths', () => {
      expect(pathContainsSegment('src/features/auth/components/LoginForm.tsx', 'components')).toBe(
        true,
      );
    });
  });
});
