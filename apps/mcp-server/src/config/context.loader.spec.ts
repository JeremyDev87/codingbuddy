import { describe, it, expect } from 'vitest';
import {
  getContextFileType,
  isLoadableFile,
  formatContextForAI,
  type ContextFile,
} from './context.loader';

describe('context.loader', () => {
  describe('getContextFileType', () => {
    it('should identify context files', () => {
      expect(getContextFileType('context/architecture.md')).toBe('context');
      expect(getContextFileType('context/deep/nested/file.md')).toBe('context');
    });

    it('should identify prompt files', () => {
      expect(getContextFileType('prompts/review.md')).toBe('prompt');
      expect(getContextFileType('prompts/custom/helper.md')).toBe('prompt');
    });

    it('should identify agent files', () => {
      expect(getContextFileType('agents/reviewer.json')).toBe('agent');
      expect(getContextFileType('agents/custom/specialist.json')).toBe('agent');
    });

    it('should identify other files', () => {
      expect(getContextFileType('readme.md')).toBe('other');
      expect(getContextFileType('config.json')).toBe('other');
      expect(getContextFileType('unknown/file.txt')).toBe('other');
    });
  });

  describe('isLoadableFile', () => {
    it('should accept markdown files', () => {
      expect(isLoadableFile('file.md')).toBe(true);
      expect(isLoadableFile('path/to/file.md')).toBe(true);
    });

    it('should accept text files', () => {
      expect(isLoadableFile('file.txt')).toBe(true);
    });

    it('should accept json and yaml files', () => {
      expect(isLoadableFile('config.json')).toBe(true);
      expect(isLoadableFile('config.yaml')).toBe(true);
      expect(isLoadableFile('config.yml')).toBe(true);
    });

    it('should accept code files', () => {
      expect(isLoadableFile('file.js')).toBe(true);
      expect(isLoadableFile('file.ts')).toBe(true);
      expect(isLoadableFile('file.jsx')).toBe(true);
      expect(isLoadableFile('file.tsx')).toBe(true);
    });

    it('should reject binary and unknown files', () => {
      expect(isLoadableFile('image.png')).toBe(false);
      expect(isLoadableFile('doc.pdf')).toBe(false);
      expect(isLoadableFile('archive.zip')).toBe(false);
      expect(isLoadableFile('noextension')).toBe(false);
    });
  });

  describe('formatContextForAI', () => {
    it('should format context files correctly', () => {
      const files: ContextFile[] = [
        {
          path: 'context/arch.md',
          content: 'Architecture docs',
          type: 'context',
          extension: '.md',
        },
      ];

      const result = formatContextForAI(files);

      expect(result).toContain('## Project Context');
      expect(result).toContain('### context/arch.md');
      expect(result).toContain('Architecture docs');
    });

    it('should group files by type', () => {
      const files: ContextFile[] = [
        {
          path: 'context/arch.md',
          content: 'arch',
          type: 'context',
          extension: '.md',
        },
        {
          path: 'prompts/review.md',
          content: 'review',
          type: 'prompt',
          extension: '.md',
        },
        {
          path: 'agents/dev.json',
          content: '{}',
          type: 'agent',
          extension: '.json',
        },
        {
          path: 'readme.md',
          content: 'readme',
          type: 'other',
          extension: '.md',
        },
      ];

      const result = formatContextForAI(files);

      expect(result).toContain('## Project Context');
      expect(result).toContain('## Custom Prompts');
      expect(result).toContain('## Custom Agents');
      expect(result).toContain('## Additional Files');
    });

    it('should return empty string for no files', () => {
      const result = formatContextForAI([]);
      expect(result).toBe('');
    });

    it('should only include sections with files', () => {
      const files: ContextFile[] = [
        {
          path: 'context/arch.md',
          content: 'arch',
          type: 'context',
          extension: '.md',
        },
      ];

      const result = formatContextForAI(files);

      expect(result).toContain('## Project Context');
      expect(result).not.toContain('## Custom Prompts');
      expect(result).not.toContain('## Custom Agents');
      expect(result).not.toContain('## Additional Files');
    });
  });
});
