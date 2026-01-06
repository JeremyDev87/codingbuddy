import { describe, it, expect, beforeEach } from 'vitest';
import { ChecklistService } from './checklist.service';
import type { GenerateChecklistInput } from './checklist.types';
import { NodeFileSystemService } from '../shared/node-filesystem.service';

describe('ChecklistService', () => {
  let service: ChecklistService;
  const fileSystem = new NodeFileSystemService();

  beforeEach(() => {
    service = new ChecklistService(fileSystem);
  });

  describe('generateChecklist', () => {
    describe('when files contain auth patterns', () => {
      it('returns security checklist items', async () => {
        const input: GenerateChecklistInput = {
          files: ['src/auth/login.ts'],
        };

        const result = await service.generateChecklist(input);

        expect(result.checklists).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              domain: 'security',
            }),
          ]),
        );
        expect(result.matchedTriggers).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              domain: 'security',
              reason: 'file_pattern',
            }),
          ]),
        );
      });
    });

    describe('when files contain component patterns', () => {
      it('returns accessibility checklist items', async () => {
        const input: GenerateChecklistInput = {
          files: ['src/components/Button.tsx'],
        };

        const result = await service.generateChecklist(input);

        expect(result.checklists).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              domain: 'accessibility',
            }),
          ]),
        );
      });
    });

    describe('when domains are explicitly specified', () => {
      it('returns only specified domain checklists', async () => {
        const input: GenerateChecklistInput = {
          domains: ['security', 'testing'],
        };

        const result = await service.generateChecklist(input);

        const domains = result.checklists.map(c => c.domain);
        expect(domains).toContain('security');
        expect(domains).toContain('testing');
        expect(domains).not.toContain('accessibility');
      });

      it('marks triggers as explicit', async () => {
        const input: GenerateChecklistInput = {
          domains: ['security'],
        };

        const result = await service.generateChecklist(input);

        expect(result.matchedTriggers).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              domain: 'security',
              reason: 'explicit',
            }),
          ]),
        );
      });
    });

    describe('summary calculation', () => {
      it('correctly counts items by priority', async () => {
        const input: GenerateChecklistInput = {
          domains: ['security'],
        };

        const result = await service.generateChecklist(input);

        expect(result.summary.total).toBeGreaterThan(0);
        expect(
          result.summary.critical +
            result.summary.high +
            result.summary.medium +
            result.summary.low,
        ).toBe(result.summary.total);
      });
    });

    describe('when no matching triggers', () => {
      it('returns empty checklists', async () => {
        const input: GenerateChecklistInput = {
          files: ['src/random/file.txt'],
        };

        const result = await service.generateChecklist(input);

        expect(result.checklists).toHaveLength(0);
        expect(result.summary.total).toBe(0);
      });
    });

    describe('when input is empty', () => {
      it('returns empty result', async () => {
        const input: GenerateChecklistInput = {};

        const result = await service.generateChecklist(input);

        expect(result.checklists).toHaveLength(0);
        expect(result.summary.total).toBe(0);
      });
    });
  });

  describe('getAvailableDomains', () => {
    it('returns all available checklist domains', () => {
      const domains = service.getAvailableDomains();

      expect(domains).toContain('security');
      expect(domains).toContain('accessibility');
      expect(domains).toContain('code-quality');
    });
  });
});
