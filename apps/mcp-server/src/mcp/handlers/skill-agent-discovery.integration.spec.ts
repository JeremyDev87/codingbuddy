import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs/promises';
import { listSkillSummaries, listAgentNames, loadAgentProfile } from '../../shared/rules-core';
import { parseSkill } from '../../rules/skill.schema';
import { SKILL_KEYWORDS } from '../../skill/i18n/keywords';

/**
 * Integration tests verifying all skills and agents on disk
 * are discoverable via MCP tool functions.
 *
 * Uses real filesystem — no mocks.
 * Prevents drift between filesystem and discovery system.
 */

const RULES_DIR =
  process.env.CODINGBUDDY_RULES_DIR ||
  path.resolve(__dirname, '../../../../../packages/rules/.ai-rules');

async function getValidDiskSkills(): Promise<string[]> {
  const skillsDir = path.join(RULES_DIR, 'skills');
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  const valid: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    try {
      const content = await fs.readFile(skillPath, 'utf-8');
      parseSkill(content, `skills/${entry.name}/SKILL.md`);
      valid.push(entry.name);
    } catch {
      // Skill dir with invalid/missing SKILL.md — legitimately skipped by discovery
    }
  }

  return valid.sort();
}

describe('Skill/Agent Discovery Completeness', () => {
  describe('list_skills', () => {
    it('should return all parseable skills on disk', async () => {
      const diskSkillNames = await getValidDiskSkills();

      const mcpSkills = await listSkillSummaries(RULES_DIR);
      const mcpNames = mcpSkills.map(s => s.name).sort();

      expect(mcpNames).toEqual(diskSkillNames);
    });

    it('should return name and description for every skill', async () => {
      const mcpSkills = await listSkillSummaries(RULES_DIR);

      expect(mcpSkills.length).toBeGreaterThan(0);
      for (const skill of mcpSkills) {
        expect(skill.name).toBeTruthy();
        expect(skill.description).toBeTruthy();
      }
    });
  });

  describe('get_agent_details', () => {
    it('should find all agents on disk', async () => {
      const agentsDir = path.join(RULES_DIR, 'agents');
      const files = await fs.readdir(agentsDir);
      const diskAgentNames = files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .sort();

      const mcpAgentNames = (await listAgentNames(RULES_DIR)).sort();

      expect(mcpAgentNames).toEqual(diskAgentNames);
    });

    it('should load valid profile for every agent on disk', async () => {
      const agentNames = await listAgentNames(RULES_DIR);

      expect(agentNames.length).toBeGreaterThan(0);
      for (const name of agentNames) {
        const profile = await loadAgentProfile(RULES_DIR, name);
        expect(profile).toBeTruthy();
        expect(profile.name).toBeTruthy();
      }
    });
  });

  describe('SKILL_KEYWORDS orphan check', () => {
    it('no orphaned keywords.ts entries — every skillName must exist on disk', async () => {
      const skillsDir = path.join(RULES_DIR, 'skills');
      const entries = await fs.readdir(skillsDir, { withFileTypes: true });
      const diskSkillDirs = new Set(entries.filter(e => e.isDirectory()).map(e => e.name));

      const orphaned: string[] = [];
      for (const kw of SKILL_KEYWORDS) {
        if (!diskSkillDirs.has(kw.skillName)) {
          orphaned.push(kw.skillName);
        }
      }

      expect(orphaned, `Orphaned SKILL_KEYWORDS entries: ${orphaned.join(', ')}`).toEqual([]);
    });
  });
});
