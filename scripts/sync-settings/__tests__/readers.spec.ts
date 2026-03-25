import { describe, it, expect } from 'vitest';
import { readAgents, readRules } from '../readers';
import path from 'node:path';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const AI_RULES_DIR = path.join(FIXTURES_DIR, '.ai-rules');

describe('readAgents', () => {
  it('reads agent JSON files and returns AgentInfo[]', async () => {
    const agents = await readAgents(path.join(AI_RULES_DIR, 'agents'));

    expect(agents).toHaveLength(2);
    expect(agents[0]).toEqual({
      name: 'backend-developer',
      displayName: 'Backend Developer',
      description: 'Backend development specialist',
      expertise: ['Node.js', 'REST APIs'],
    });
    expect(agents[1]).toEqual({
      name: 'frontend-developer',
      displayName: 'Frontend Developer',
      description: 'Frontend development specialist',
      expertise: ['React', 'TypeScript'],
    });
  });

  it('sorts agents alphabetically by name', async () => {
    const agents = await readAgents(path.join(AI_RULES_DIR, 'agents'));
    const names = agents.map(a => a.name);
    expect(names).toEqual([...names].sort());
  });

  it('skips non-JSON files', async () => {
    const agents = await readAgents(path.join(AI_RULES_DIR, 'agents'));
    // README.md in agents dir should be ignored
    expect(agents.every(a => !a.name.includes('README'))).toBe(true);
  });
});

describe('readRules', () => {
  it('reads rule markdown files and returns RuleInfo[]', async () => {
    const rules = await readRules(
      path.join(AI_RULES_DIR, 'rules'),
      'packages/rules/.ai-rules/rules',
    );

    expect(rules).toHaveLength(2);
    expect(rules[0]).toEqual({
      name: 'augmented-coding',
      relativePath: 'packages/rules/.ai-rules/rules/augmented-coding.md',
    });
    expect(rules[1]).toEqual({
      name: 'core',
      relativePath: 'packages/rules/.ai-rules/rules/core.md',
    });
  });

  it('sorts rules alphabetically by name', async () => {
    const rules = await readRules(
      path.join(AI_RULES_DIR, 'rules'),
      'packages/rules/.ai-rules/rules',
    );
    const names = rules.map(r => r.name);
    expect(names).toEqual([...names].sort());
  });
});
