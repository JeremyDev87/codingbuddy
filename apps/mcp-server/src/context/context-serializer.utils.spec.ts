import { describe, it, expect } from 'vitest';
import {
  serializeContextDocument,
  serializeMetadata,
  serializeSection,
  createNewContextDocument,
  createPlanSection,
  mergeArraysUnique,
  mergeSection,
  generateTimestamp,
  summarizeSection,
  estimateDocumentSize,
  cleanupContextDocument,
} from './context-serializer.utils';
import type { ContextDocument, ContextSection } from './context-document.types';

describe('context-serializer.utils', () => {
  describe('serializeMetadata', () => {
    it('serializes all metadata fields', () => {
      const metadata = {
        title: 'Test Task',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastUpdatedAt: '2024-01-01T01:00:00.000Z',
        currentMode: 'PLAN' as const,
        status: 'active' as const,
      };

      const lines = serializeMetadata(metadata);

      expect(lines).toContain('# Context: Test Task');
      expect(lines).toContain('**Created**: 2024-01-01T00:00:00.000Z');
      expect(lines).toContain('**Updated**: 2024-01-01T01:00:00.000Z');
      expect(lines).toContain('**Current Mode**: PLAN');
      expect(lines).toContain('**Status**: active');
      expect(lines).toContain('---');
    });
  });

  describe('serializeSection', () => {
    it('serializes basic section', () => {
      const section: ContextSection = {
        mode: 'PLAN',
        timestamp: '10:00',
        task: 'Plan the feature',
      };

      const lines = serializeSection(section);
      const content = lines.join('\n');

      expect(content).toContain('## PLAN (10:00)');
      expect(content).toContain('### Task');
      expect(content).toContain('Plan the feature');
    });

    it('serializes section with agent info', () => {
      const section: ContextSection = {
        mode: 'PLAN',
        timestamp: '10:00',
        primaryAgent: 'technical-planner',
        recommendedActAgent: 'frontend-developer',
        recommendedActAgentConfidence: 0.9,
      };

      const lines = serializeSection(section);
      const content = lines.join('\n');

      expect(content).toContain('**Primary Agent**: technical-planner');
      expect(content).toContain(
        '**Recommended ACT Agent**: frontend-developer (confidence: 0.9)',
      );
    });

    it('serializes section with decisions and notes', () => {
      const section: ContextSection = {
        mode: 'PLAN',
        timestamp: '10:00',
        decisions: ['Decision 1', 'Decision 2'],
        notes: ['Note 1'],
      };

      const lines = serializeSection(section);
      const content = lines.join('\n');

      expect(content).toContain('### Decisions');
      expect(content).toContain('- Decision 1');
      expect(content).toContain('- Decision 2');
      expect(content).toContain('### Notes');
      expect(content).toContain('- Note 1');
    });

    it('serializes ACT section with progress', () => {
      const section: ContextSection = {
        mode: 'ACT',
        timestamp: '11:00',
        progress: ['Created types', 'Added service'],
      };

      const lines = serializeSection(section);
      const content = lines.join('\n');

      expect(content).toContain('## ACT (11:00)');
      expect(content).toContain('### Progress');
      expect(content).toContain('- Created types');
      expect(content).toContain('- Added service');
    });

    it('serializes EVAL section with findings and recommendations', () => {
      const section: ContextSection = {
        mode: 'EVAL',
        timestamp: '12:00',
        findings: ['Finding 1'],
        recommendations: ['Recommendation 1'],
      };

      const lines = serializeSection(section);
      const content = lines.join('\n');

      expect(content).toContain('## EVAL (12:00)');
      expect(content).toContain('### Findings');
      expect(content).toContain('- Finding 1');
      expect(content).toContain('### Recommendations');
      expect(content).toContain('- Recommendation 1');
    });
  });

  describe('serializeContextDocument', () => {
    it('serializes complete document', () => {
      const doc: ContextDocument = {
        metadata: {
          title: 'Test Task',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastUpdatedAt: '2024-01-01T02:00:00.000Z',
          currentMode: 'ACT',
          status: 'active',
        },
        sections: [
          {
            mode: 'PLAN',
            timestamp: '10:00',
            task: 'Plan',
            decisions: ['Decision 1'],
          },
          {
            mode: 'ACT',
            timestamp: '11:00',
            task: 'Implement',
          },
        ],
      };

      const content = serializeContextDocument(doc);

      expect(content).toContain('# Context: Test Task');
      expect(content).toContain('## PLAN (10:00)');
      expect(content).toContain('## ACT (11:00)');
      expect(content).toContain('- Decision 1');
    });
  });

  describe('createNewContextDocument', () => {
    it('creates document with metadata and section', () => {
      const planSection: ContextSection = {
        mode: 'PLAN',
        timestamp: '10:00',
        task: 'Test task',
      };

      const isoTimestamp = '2024-01-15T10:00:00.000Z';
      const doc = createNewContextDocument(
        'Test Title',
        planSection,
        isoTimestamp,
      );

      expect(doc.metadata.title).toBe('Test Title');
      expect(doc.metadata.createdAt).toBe(isoTimestamp);
      expect(doc.metadata.lastUpdatedAt).toBe(isoTimestamp);
      expect(doc.metadata.currentMode).toBe('PLAN');
      expect(doc.metadata.status).toBe('active');
      expect(doc.sections).toHaveLength(1);
      expect(doc.sections[0]).toEqual(planSection);
    });
  });

  describe('createPlanSection', () => {
    it('creates PLAN section with all fields', () => {
      const section = createPlanSection(
        {
          task: 'Plan task',
          primaryAgent: 'planner',
          recommendedActAgent: 'developer',
          recommendedActAgentConfidence: 0.8,
          decisions: ['D1'],
          notes: ['N1'],
        },
        '10:00',
      );

      expect(section.mode).toBe('PLAN');
      expect(section.timestamp).toBe('10:00');
      expect(section.task).toBe('Plan task');
      expect(section.primaryAgent).toBe('planner');
      expect(section.recommendedActAgent).toBe('developer');
      expect(section.recommendedActAgentConfidence).toBe(0.8);
      expect(section.decisions).toEqual(['D1']);
      expect(section.notes).toEqual(['N1']);
      expect(section.status).toBe('in_progress');
    });
  });

  describe('mergeArraysUnique', () => {
    it('merges arrays without duplicates', () => {
      const existing = ['A', 'B'];
      const newItems = ['B', 'C'];

      const result = mergeArraysUnique(existing, newItems);

      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('handles undefined existing array', () => {
      const result = mergeArraysUnique(undefined, ['A', 'B']);

      expect(result).toEqual(['A', 'B']);
    });

    it('handles undefined new items', () => {
      const result = mergeArraysUnique(['A', 'B'], undefined);

      expect(result).toEqual(['A', 'B']);
    });

    it('handles both undefined', () => {
      const result = mergeArraysUnique(undefined, undefined);

      expect(result).toEqual([]);
    });
  });

  describe('mergeSection', () => {
    it('merges section data with accumulation', () => {
      const existing: ContextSection = {
        mode: 'ACT',
        timestamp: '10:00',
        task: 'Original task',
        decisions: ['D1'],
        notes: ['N1'],
      };

      const newData: Partial<ContextSection> = {
        decisions: ['D2'],
        notes: ['N2'],
        progress: ['P1'],
      };

      const result = mergeSection(existing, newData, '11:00');

      expect(result.mode).toBe('ACT');
      expect(result.timestamp).toBe('11:00');
      expect(result.task).toBe('Original task');
      expect(result.decisions).toEqual(['D1', 'D2']);
      expect(result.notes).toEqual(['N1', 'N2']);
      expect(result.progress).toEqual(['P1']);
    });

    it('overwrites task when provided', () => {
      const existing: ContextSection = {
        mode: 'ACT',
        timestamp: '10:00',
        task: 'Original',
      };

      const result = mergeSection(existing, { task: 'Updated' }, '11:00');

      expect(result.task).toBe('Updated');
    });
  });

  describe('generateTimestamp', () => {
    it('generates HH:MM format', () => {
      const date = new Date('2024-01-01T14:30:00');

      const result = generateTimestamp(date);

      // Format depends on locale, but should contain hour and minute
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('uses current date when not provided', () => {
      const result = generateTimestamp();

      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('summarizeSection', () => {
    it('keeps only the most recent N items in arrays', () => {
      const section: ContextSection = {
        mode: 'PLAN',
        timestamp: '10:00',
        decisions: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'],
        notes: ['N1', 'N2', 'N3', 'N4', 'N5'],
      };

      const summarized = summarizeSection(section, 3);

      expect(summarized.decisions).toEqual(['D6', 'D7', 'D8']);
      expect(summarized.notes).toEqual(['N3', 'N4', 'N5']);
      expect(summarized.summarized).toBe(true);
      expect(summarized.originalCounts).toEqual({
        decisions: 8,
        notes: 5,
        progress: undefined,
        findings: undefined,
        recommendations: undefined,
      });
    });

    it('handles all array types', () => {
      const section: ContextSection = {
        mode: 'EVAL',
        timestamp: '10:00',
        progress: ['P1', 'P2', 'P3', 'P4'],
        findings: ['F1', 'F2', 'F3'],
        recommendations: ['R1', 'R2', 'R3', 'R4', 'R5'],
      };

      const summarized = summarizeSection(section, 2);

      expect(summarized.progress).toEqual(['P3', 'P4']);
      expect(summarized.findings).toEqual(['F2', 'F3']);
      expect(summarized.recommendations).toEqual(['R4', 'R5']);
    });

    it('keeps arrays shorter than limit unchanged', () => {
      const section: ContextSection = {
        mode: 'PLAN',
        timestamp: '10:00',
        decisions: ['D1', 'D2'],
      };

      const summarized = summarizeSection(section, 5);

      expect(summarized.decisions).toEqual(['D1', 'D2']);
      expect(summarized.summarized).toBe(true);
      expect(summarized.originalCounts?.decisions).toBe(2);
    });

    it('handles undefined arrays', () => {
      const section: ContextSection = {
        mode: 'PLAN',
        timestamp: '10:00',
      };

      const summarized = summarizeSection(section, 3);

      expect(summarized.decisions).toBeUndefined();
      expect(summarized.notes).toBeUndefined();
      expect(summarized.summarized).toBe(true);
    });

    it('uses default keepRecentItems when not specified', () => {
      const section: ContextSection = {
        mode: 'PLAN',
        timestamp: '10:00',
        decisions: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'],
      };

      const summarized = summarizeSection(section);

      expect(summarized.decisions).toHaveLength(5); // default is 5
      expect(summarized.decisions).toEqual(['D4', 'D5', 'D6', 'D7', 'D8']);
    });
  });

  describe('estimateDocumentSize', () => {
    it('returns character count of serialized document', () => {
      const doc: ContextDocument = {
        metadata: {
          title: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastUpdatedAt: '2024-01-01T01:00:00.000Z',
          currentMode: 'PLAN',
          status: 'active',
        },
        sections: [
          {
            mode: 'PLAN',
            timestamp: '10:00',
            task: 'Test task',
          },
        ],
      };

      const size = estimateDocumentSize(doc);

      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });

    it('returns larger size for documents with more content', () => {
      const smallDoc: ContextDocument = {
        metadata: {
          title: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastUpdatedAt: '2024-01-01T01:00:00.000Z',
          currentMode: 'PLAN',
          status: 'active',
        },
        sections: [
          {
            mode: 'PLAN',
            timestamp: '10:00',
          },
        ],
      };

      const largeDoc: ContextDocument = {
        ...smallDoc,
        sections: [
          {
            mode: 'PLAN',
            timestamp: '10:00',
            decisions: Array.from({ length: 100 }, (_, i) => `Decision ${i}`),
          },
        ],
      };

      const smallSize = estimateDocumentSize(smallDoc);
      const largeSize = estimateDocumentSize(largeDoc);

      expect(largeSize).toBeGreaterThan(smallSize);
    });
  });

  describe('cleanupContextDocument', () => {
    it('summarizes older sections and keeps recent ones full', () => {
      const doc: ContextDocument = {
        metadata: {
          title: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastUpdatedAt: '2024-01-01T03:00:00.000Z',
          currentMode: 'EVAL',
          status: 'active',
        },
        sections: [
          {
            mode: 'PLAN',
            timestamp: '10:00',
            decisions: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'],
          },
          {
            mode: 'ACT',
            timestamp: '11:00',
            progress: ['P1', 'P2', 'P3', 'P4'],
          },
          {
            mode: 'EVAL',
            timestamp: '12:00',
            findings: ['F1', 'F2'],
          },
        ],
      };

      const result = cleanupContextDocument(doc, 2, 3);

      // PLAN section (oldest) should be summarized
      const planSection = result.document.sections.find(s => s.mode === 'PLAN');
      expect(planSection?.summarized).toBe(true);
      expect(planSection?.decisions).toEqual(['D4', 'D5', 'D6']);
      expect(planSection?.originalCounts?.decisions).toBe(6);

      // ACT and EVAL sections (recent 2) should remain full
      const actSection = result.document.sections.find(s => s.mode === 'ACT');
      expect(actSection?.summarized).toBeUndefined();
      expect(actSection?.progress).toHaveLength(4);

      const evalSection = result.document.sections.find(s => s.mode === 'EVAL');
      expect(evalSection?.summarized).toBeUndefined();
      expect(evalSection?.findings).toHaveLength(2);
    });

    it('reports size reduction', () => {
      const doc: ContextDocument = {
        metadata: {
          title: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastUpdatedAt: '2024-01-01T02:00:00.000Z',
          currentMode: 'ACT',
          status: 'active',
        },
        sections: [
          {
            mode: 'PLAN',
            timestamp: '10:00',
            decisions: Array.from(
              { length: 50 },
              (_, i) => `Decision ${i}: ${'x'.repeat(100)}`,
            ),
          },
          {
            mode: 'ACT',
            timestamp: '11:00',
            progress: ['Progress 1', 'Progress 2'],
          },
        ],
      };

      // Keep 1 recent section full, so PLAN (older) will be summarized
      const result = cleanupContextDocument(doc, 1, 5);

      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.newSize).toBeGreaterThan(0);
      expect(result.newSize).toBeLessThan(result.originalSize);
    });

    it('does not summarize already summarized sections', () => {
      const doc: ContextDocument = {
        metadata: {
          title: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastUpdatedAt: '2024-01-01T02:00:00.000Z',
          currentMode: 'ACT',
          status: 'active',
        },
        sections: [
          {
            mode: 'PLAN',
            timestamp: '10:00',
            decisions: ['D1', 'D2'],
            summarized: true,
            originalCounts: { decisions: 10 },
          },
          {
            mode: 'ACT',
            timestamp: '11:00',
            progress: ['P1', 'P2', 'P3'],
          },
        ],
      };

      const result = cleanupContextDocument(doc, 1, 1);

      // PLAN section should remain unchanged (already summarized)
      const planSection = result.document.sections.find(s => s.mode === 'PLAN');
      expect(planSection?.decisions).toEqual(['D1', 'D2']);
      expect(planSection?.summarized).toBe(true);
      expect(planSection?.originalCounts?.decisions).toBe(10);

      // ACT section (recent) should remain full
      const actSection = result.document.sections.find(s => s.mode === 'ACT');
      expect(actSection?.progress).toEqual(['P1', 'P2', 'P3']);
      expect(actSection?.summarized).toBeUndefined();
    });

    it('handles empty sections', () => {
      const doc: ContextDocument = {
        metadata: {
          title: 'Test',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastUpdatedAt: '2024-01-01T01:00:00.000Z',
          currentMode: 'PLAN',
          status: 'active',
        },
        sections: [
          {
            mode: 'PLAN',
            timestamp: '10:00',
          },
        ],
      };

      const result = cleanupContextDocument(doc, 1, 3);

      expect(result.document.sections).toHaveLength(1);
      expect(result.newSize).toBeLessThanOrEqual(result.originalSize);
    });
  });
});
