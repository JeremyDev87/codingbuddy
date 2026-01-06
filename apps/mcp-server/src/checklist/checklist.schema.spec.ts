import { describe, it, expect } from 'vitest';
import {
  validateChecklistSchema,
  parseAndValidateChecklist,
  isValidChecklistItem,
  isValidChecklistCategory,
  ChecklistSchemaError,
} from './checklist.schema';

describe('validateChecklistSchema', () => {
  const validChecklist = {
    domain: 'security',
    icon: '🔒',
    description: 'Security checklist',
    categories: [
      {
        name: 'authentication',
        triggers: {
          files: ['**/auth/**', '**/login/**'],
        },
        items: [
          {
            id: 'sec-auth-1',
            text: 'Check for secure password storage',
            priority: 'critical',
          },
        ],
      },
    ],
  };

  describe('valid checklists', () => {
    it('accepts valid checklist', () => {
      const result = validateChecklistSchema(validChecklist);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts checklist with optional item fields', () => {
      const checklist = {
        ...validChecklist,
        categories: [
          {
            ...validChecklist.categories[0],
            items: [
              {
                id: 'sec-1',
                text: 'Check item',
                priority: 'high',
                reason: 'Security best practice',
                reference: 'https://owasp.org',
              },
            ],
          },
        ],
      };
      const result = validateChecklistSchema(checklist);
      expect(result.valid).toBe(true);
    });

    it('accepts checklist with optional trigger fields', () => {
      const checklist = {
        ...validChecklist,
        categories: [
          {
            ...validChecklist.categories[0],
            triggers: {
              files: ['**/*.ts'],
              imports: ['bcrypt', 'argon2'],
              patterns: ['password', 'secret'],
            },
          },
        ],
      };
      const result = validateChecklistSchema(checklist);
      expect(result.valid).toBe(true);
    });

    it('accepts all valid domains', () => {
      const domains = [
        'security',
        'accessibility',
        'performance',
        'testing',
        'code-quality',
        'seo',
      ];
      for (const domain of domains) {
        const result = validateChecklistSchema({ ...validChecklist, domain });
        expect(result.valid).toBe(true);
      }
    });

    it('accepts all valid priorities', () => {
      const priorities = ['critical', 'high', 'medium', 'low'];
      for (const priority of priorities) {
        const checklist = {
          ...validChecklist,
          categories: [
            {
              ...validChecklist.categories[0],
              items: [{ id: 'test', text: 'Test', priority }],
            },
          ],
        };
        const result = validateChecklistSchema(checklist);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('invalid root structure', () => {
    it('rejects null', () => {
      const result = validateChecklistSchema(null);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Expected object');
    });

    it('rejects array', () => {
      const result = validateChecklistSchema([]);
      expect(result.valid).toBe(false);
    });

    it('rejects primitive', () => {
      const result = validateChecklistSchema('string');
      expect(result.valid).toBe(false);
    });
  });

  describe('invalid domain', () => {
    it('rejects missing domain', () => {
      const { domain: _domain, ...rest } = validChecklist;
      const result = validateChecklistSchema(rest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('domain'));
    });

    it('rejects invalid domain value', () => {
      const result = validateChecklistSchema({
        ...validChecklist,
        domain: 'invalid-domain',
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid value');
    });
  });

  describe('invalid categories', () => {
    it('rejects missing categories', () => {
      const { categories: _categories, ...rest } = validChecklist;
      const result = validateChecklistSchema(rest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('categories'),
      );
    });

    it('rejects empty categories array', () => {
      const result = validateChecklistSchema({
        ...validChecklist,
        categories: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('at least one'),
      );
    });

    it('rejects category without name', () => {
      const result = validateChecklistSchema({
        ...validChecklist,
        categories: [
          {
            triggers: { files: [] },
            items: [validChecklist.categories[0].items[0]],
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('categories[0].name'),
      );
    });

    it('rejects category without triggers', () => {
      const result = validateChecklistSchema({
        ...validChecklist,
        categories: [
          { name: 'test', items: [validChecklist.categories[0].items[0]] },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('triggers'));
    });

    it('rejects category with empty items', () => {
      const result = validateChecklistSchema({
        ...validChecklist,
        categories: [{ name: 'test', triggers: { files: [] }, items: [] }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('at least one item'),
      );
    });
  });

  describe('invalid items', () => {
    it('rejects item without id', () => {
      const result = validateChecklistSchema({
        ...validChecklist,
        categories: [
          {
            ...validChecklist.categories[0],
            items: [{ text: 'Test', priority: 'high' }],
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('.id'));
    });

    it('rejects item with empty id', () => {
      const result = validateChecklistSchema({
        ...validChecklist,
        categories: [
          {
            ...validChecklist.categories[0],
            items: [{ id: '  ', text: 'Test', priority: 'high' }],
          },
        ],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects item without text', () => {
      const result = validateChecklistSchema({
        ...validChecklist,
        categories: [
          {
            ...validChecklist.categories[0],
            items: [{ id: 'test', priority: 'high' }],
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('.text'));
    });

    it('rejects item with invalid priority', () => {
      const result = validateChecklistSchema({
        ...validChecklist,
        categories: [
          {
            ...validChecklist.categories[0],
            items: [{ id: 'test', text: 'Test', priority: 'urgent' }],
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Invalid value'),
      );
    });
  });

  describe('invalid triggers', () => {
    it('rejects triggers without files array', () => {
      const result = validateChecklistSchema({
        ...validChecklist,
        categories: [
          {
            ...validChecklist.categories[0],
            triggers: { imports: ['test'] },
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('triggers.files'),
      );
    });

    it('rejects non-string file patterns', () => {
      const result = validateChecklistSchema({
        ...validChecklist,
        categories: [
          {
            ...validChecklist.categories[0],
            triggers: { files: [123, 'valid'] },
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('files[0]'));
    });
  });
});

describe('parseAndValidateChecklist', () => {
  const validJson = JSON.stringify({
    domain: 'security',
    icon: '🔒',
    description: 'Security checklist',
    categories: [
      {
        name: 'auth',
        triggers: { files: ['**/*.ts'] },
        items: [{ id: 'sec-1', text: 'Check auth', priority: 'high' }],
      },
    ],
  });

  it('parses and returns valid checklist', () => {
    const result = parseAndValidateChecklist(validJson);
    expect(result.domain).toBe('security');
    expect(result.categories).toHaveLength(1);
  });

  it('throws ChecklistSchemaError for invalid JSON', () => {
    expect(() => parseAndValidateChecklist('not json')).toThrow(
      ChecklistSchemaError,
    );
  });

  it('throws ChecklistSchemaError for invalid schema', () => {
    expect(() => parseAndValidateChecklist('{}')).toThrow(ChecklistSchemaError);
  });

  it('includes error details in exception', () => {
    try {
      parseAndValidateChecklist('{}');
    } catch (error) {
      expect(error).toBeInstanceOf(ChecklistSchemaError);
      expect((error as ChecklistSchemaError).path).toBe('root');
    }
  });
});

describe('isValidChecklistItem', () => {
  it('returns true for valid item', () => {
    expect(
      isValidChecklistItem({ id: 'test', text: 'Test', priority: 'high' }),
    ).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidChecklistItem(null)).toBe(false);
  });

  it('returns false for missing id', () => {
    expect(isValidChecklistItem({ text: 'Test', priority: 'high' })).toBe(
      false,
    );
  });

  it('returns false for invalid priority', () => {
    expect(
      isValidChecklistItem({ id: 'test', text: 'Test', priority: 'urgent' }),
    ).toBe(false);
  });
});

describe('isValidChecklistCategory', () => {
  const validCategory = {
    name: 'auth',
    triggers: { files: ['*.ts'] },
    items: [{ id: 'test', text: 'Test', priority: 'high' }],
  };

  it('returns true for valid category', () => {
    expect(isValidChecklistCategory(validCategory)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidChecklistCategory(null)).toBe(false);
  });

  it('returns false for missing name', () => {
    const { name: _name, ...rest } = validCategory;
    expect(isValidChecklistCategory(rest)).toBe(false);
  });

  it('returns false for missing triggers', () => {
    const { triggers: _triggers, ...rest } = validCategory;
    expect(isValidChecklistCategory(rest)).toBe(false);
  });

  it('returns false for invalid items', () => {
    expect(
      isValidChecklistCategory({
        ...validCategory,
        items: [{ id: 'test', text: 'Test', priority: 'invalid' }],
      }),
    ).toBe(false);
  });
});
