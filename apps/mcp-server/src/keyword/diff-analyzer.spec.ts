import { analyzeDiffFiles, getDiffFiles, DIFF_FILE_PATTERNS } from './diff-analyzer';

describe('diff-analyzer', () => {
  describe('DIFF_FILE_PATTERNS', () => {
    it('should export patterns array', () => {
      expect(DIFF_FILE_PATTERNS).toBeDefined();
      expect(Array.isArray(DIFF_FILE_PATTERNS)).toBe(true);
      expect(DIFF_FILE_PATTERNS.length).toBeGreaterThan(0);
    });

    it('each pattern should have pattern, agent, and weight', () => {
      for (const entry of DIFF_FILE_PATTERNS) {
        expect(entry.pattern).toBeInstanceOf(RegExp);
        expect(typeof entry.agent).toBe('string');
        expect(typeof entry.weight).toBe('number');
        expect(entry.weight).toBeGreaterThan(0);
        expect(entry.weight).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('analyzeDiffFiles', () => {
    it('should return empty result for empty file list', () => {
      const result = analyzeDiffFiles([]);
      expect(result.files).toEqual([]);
      expect(result.scores).toEqual([]);
      expect(result.topAgent).toBeNull();
    });

    it('should boost test-engineer for .test.ts files', () => {
      const result = analyzeDiffFiles(['src/auth/login.test.ts', 'src/auth/login.spec.ts']);
      expect(result.topAgent).not.toBeNull();
      expect(result.topAgent!.agent).toBe('test-engineer');
      expect(result.topAgent!.matchedFiles.length).toBe(2);
    });

    it('should boost devops-engineer for Dockerfile and .github/ files', () => {
      const result = analyzeDiffFiles(['Dockerfile', '.github/workflows/ci.yml']);
      expect(result.topAgent).not.toBeNull();
      expect(result.topAgent!.agent).toBe('devops-engineer');
    });

    it('should boost frontend-developer for .css and .tsx files', () => {
      const result = analyzeDiffFiles([
        'src/components/Button.tsx',
        'src/styles/global.css',
        'src/components/Header.tsx',
      ]);
      expect(result.topAgent).not.toBeNull();
      expect(result.topAgent!.agent).toBe('frontend-developer');
    });

    it('should boost backend-developer for .py files', () => {
      const result = analyzeDiffFiles(['hooks/pre-commit.py', 'scripts/deploy.py']);
      expect(result.topAgent).not.toBeNull();
      expect(result.topAgent!.agent).toBe('backend-developer');
    });

    it('should boost platform-engineer for .tf files', () => {
      const result = analyzeDiffFiles(['infra/main.tf', 'infra/variables.tf']);
      expect(result.topAgent).not.toBeNull();
      expect(result.topAgent!.agent).toBe('platform-engineer');
    });

    it('should boost data-engineer for .sql and migration files', () => {
      const result = analyzeDiffFiles(['migrations/001_create_users.sql', 'schema.prisma']);
      expect(result.topAgent).not.toBeNull();
      expect(result.topAgent!.agent).toBe('data-engineer');
    });

    it('should boost agent-architect for agent JSON files', () => {
      const result = analyzeDiffFiles([
        'packages/rules/.ai-rules/agents/backend-developer.json',
        'packages/rules/.ai-rules/agents/frontend-developer.json',
      ]);
      expect(result.topAgent).not.toBeNull();
      expect(result.topAgent!.agent).toBe('agent-architect');
    });

    it('should boost systems-developer for .rs files', () => {
      const result = analyzeDiffFiles(['src/main.rs', 'src/lib.rs']);
      expect(result.topAgent).not.toBeNull();
      expect(result.topAgent!.agent).toBe('systems-developer');
    });

    it('should boost mobile-developer for .swift and .kt files', () => {
      const result = analyzeDiffFiles([
        'ios/App/ViewController.swift',
        'android/app/MainActivity.kt',
      ]);
      expect(result.topAgent).not.toBeNull();
      expect(result.topAgent!.agent).toBe('mobile-developer');
    });

    it('should return sorted scores with highest first', () => {
      const result = analyzeDiffFiles([
        'src/components/Button.tsx',
        'src/styles/global.css',
        'src/auth/login.test.ts',
      ]);
      expect(result.scores.length).toBeGreaterThan(0);
      for (let i = 1; i < result.scores.length; i++) {
        expect(result.scores[i - 1].score).toBeGreaterThanOrEqual(result.scores[i].score);
      }
    });

    it('should handle mixed file types and pick dominant agent', () => {
      // 3 frontend files vs 1 test file → frontend wins
      const result = analyzeDiffFiles([
        'src/components/Button.tsx',
        'src/components/Header.tsx',
        'src/styles/global.css',
        'src/auth/login.test.ts',
      ]);
      expect(result.topAgent).not.toBeNull();
      expect(result.topAgent!.agent).toBe('frontend-developer');
    });

    it('should include reason in top agent score', () => {
      const result = analyzeDiffFiles(['src/auth/login.test.ts']);
      expect(result.topAgent).not.toBeNull();
      expect(result.topAgent!.reason).toBeTruthy();
      expect(typeof result.topAgent!.reason).toBe('string');
    });

    it('should track matched files per agent', () => {
      const result = analyzeDiffFiles([
        'src/components/Button.tsx',
        'src/components/Header.tsx',
        'README.md', // no match
      ]);
      const frontendScore = result.scores.find(s => s.agent === 'frontend-developer');
      expect(frontendScore).toBeDefined();
      expect(frontendScore!.matchedFiles).toContain('src/components/Button.tsx');
      expect(frontendScore!.matchedFiles).toContain('src/components/Header.tsx');
      expect(frontendScore!.matchedFiles).not.toContain('README.md');
    });
  });

  describe('getDiffFiles', () => {
    it('should return an array (may be empty if no changes)', async () => {
      const result = await getDiffFiles();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array when git is not available', async () => {
      // getDiffFiles handles errors gracefully
      const result = await getDiffFiles('/nonexistent/path');
      expect(result).toEqual([]);
    });
  });
});
