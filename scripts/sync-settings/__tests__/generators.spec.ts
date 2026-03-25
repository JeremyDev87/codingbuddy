import { describe, it, expect } from 'vitest';
import { generateAll, generateForTool } from '../generators';
import type { SourceData } from '../types';

const FIXTURE_DATA: SourceData = {
  agents: [
    {
      name: 'backend-developer',
      displayName: 'Backend Developer',
      description: 'Backend development specialist',
      expertise: ['Node.js', 'REST APIs'],
    },
    {
      name: 'frontend-developer',
      displayName: 'Frontend Developer',
      description: 'Frontend development specialist',
      expertise: ['React', 'TypeScript'],
    },
    {
      name: 'security-specialist',
      displayName: 'Security Specialist',
      description: 'Security audit and hardening',
      expertise: ['OWASP', 'JWT'],
    },
  ],
  rules: [
    {
      name: 'augmented-coding',
      relativePath: 'packages/rules/.ai-rules/rules/augmented-coding.md',
    },
    { name: 'core', relativePath: 'packages/rules/.ai-rules/rules/core.md' },
    { name: 'project', relativePath: 'packages/rules/.ai-rules/rules/project.md' },
  ],
};

describe('generateForTool', () => {
  describe('cursor', () => {
    it('generates .mdc file with YAML frontmatter', () => {
      const files = generateForTool('cursor', FIXTURE_DATA);
      const autoAgent = files.find(f => f.relativePath === '.cursor/rules/auto-agent.mdc');
      expect(autoAgent).toBeDefined();
      expect(autoAgent!.content).toMatch(/^---\n/);
      expect(autoAgent!.content).toContain('alwaysApply:');
    });

    it('includes agent mapping table', () => {
      const files = generateForTool('cursor', FIXTURE_DATA);
      const autoAgent = files.find(f => f.relativePath === '.cursor/rules/auto-agent.mdc')!;
      expect(autoAgent.content).toContain('frontend-developer');
      expect(autoAgent.content).toContain('backend-developer');
    });

    it('generates imports.mdc', () => {
      const files = generateForTool('cursor', FIXTURE_DATA);
      const imports = files.find(f => f.relativePath === '.cursor/rules/imports.mdc');
      expect(imports).toBeDefined();
      expect(imports!.content).toContain('parse_mode');
    });
  });

  describe('claude', () => {
    it('generates custom-instructions.md', () => {
      const files = generateForTool('claude', FIXTURE_DATA);
      const ci = files.find(f => f.relativePath === '.claude/rules/custom-instructions.md');
      expect(ci).toBeDefined();
      expect(ci!.content).toContain('# Custom Instructions for Claude Code');
    });

    it('includes agent list', () => {
      const files = generateForTool('claude', FIXTURE_DATA);
      const ci = files.find(f => f.relativePath === '.claude/rules/custom-instructions.md')!;
      expect(ci.content).toContain('Frontend Developer');
      expect(ci.content).toContain('Security Specialist');
    });

    it('includes CODINGBUDDY_CRITICAL_RULE', () => {
      const files = generateForTool('claude', FIXTURE_DATA);
      const ci = files.find(f => f.relativePath === '.claude/rules/custom-instructions.md')!;
      expect(ci.content).toContain('CODINGBUDDY_CRITICAL_RULE');
    });

    it('references source rule files', () => {
      const files = generateForTool('claude', FIXTURE_DATA);
      const ci = files.find(f => f.relativePath === '.claude/rules/custom-instructions.md')!;
      expect(ci.content).toContain('packages/rules/.ai-rules/rules/core.md');
      expect(ci.content).toContain('packages/rules/.ai-rules/rules/augmented-coding.md');
    });
  });

  describe('antigravity', () => {
    it('generates instructions.md', () => {
      const files = generateForTool('antigravity', FIXTURE_DATA);
      const instr = files.find(f => f.relativePath === '.antigravity/rules/instructions.md');
      expect(instr).toBeDefined();
      expect(instr!.content).toContain('# Antigravity Instructions');
    });

    it('includes agent list', () => {
      const files = generateForTool('antigravity', FIXTURE_DATA);
      const instr = files.find(f => f.relativePath === '.antigravity/rules/instructions.md')!;
      expect(instr.content).toContain('Backend Developer');
    });
  });

  describe('codex', () => {
    it('generates system-prompt.md', () => {
      const files = generateForTool('codex', FIXTURE_DATA);
      const sp = files.find(f => f.relativePath === '.codex/rules/system-prompt.md');
      expect(sp).toBeDefined();
      expect(sp!.content).toContain('# Codex System Prompt');
    });
  });

  describe('q', () => {
    it('generates customizations.md', () => {
      const files = generateForTool('q', FIXTURE_DATA);
      const cust = files.find(f => f.relativePath === '.q/rules/customizations.md');
      expect(cust).toBeDefined();
      expect(cust!.content).toContain('# Amazon Q Customizations');
    });
  });

  describe('kiro', () => {
    it('generates guidelines.md', () => {
      const files = generateForTool('kiro', FIXTURE_DATA);
      const gl = files.find(f => f.relativePath === '.kiro/rules/guidelines.md');
      expect(gl).toBeDefined();
      expect(gl!.content).toContain('# Kiro Guidelines');
    });
  });
});

describe('generateAll', () => {
  it('generates files for all 6 tools', () => {
    const files = generateAll(FIXTURE_DATA);
    const paths = files.map(f => f.relativePath);

    expect(paths).toContain('.cursor/rules/auto-agent.mdc');
    expect(paths).toContain('.cursor/rules/imports.mdc');
    expect(paths).toContain('.claude/rules/custom-instructions.md');
    expect(paths).toContain('.antigravity/rules/instructions.md');
    expect(paths).toContain('.codex/rules/system-prompt.md');
    expect(paths).toContain('.q/rules/customizations.md');
    expect(paths).toContain('.kiro/rules/guidelines.md');
  });

  it('is idempotent — same input produces identical output', () => {
    const first = generateAll(FIXTURE_DATA);
    const second = generateAll(FIXTURE_DATA);
    expect(first).toEqual(second);
  });
});
