import { describe, it, expect } from 'vitest';
import { parseSkill, SkillSchemaError } from './skill.schema';

describe('parseSkill', () => {
  describe('valid skills', () => {
    it('should parse valid SKILL.md with frontmatter', () => {
      const content = `---
name: test-skill
description: A test skill description
---

# Test Skill

This is the skill content.
`;
      const result = parseSkill(content, 'skills/test-skill/SKILL.md');

      expect(result.name).toBe('test-skill');
      expect(result.description).toBe('A test skill description');
      expect(result.content).toContain('# Test Skill');
      expect(result.path).toBe('skills/test-skill/SKILL.md');
      expect(result.triggers).toBeUndefined();
    });

    it('should parse valid SKILL.md with triggers', () => {
      const content = `---
name: widget-skill
description: Widget architecture skill
triggers:
  - pattern: "widget.*(slot|architecture)"
    confidence: high
  - pattern: "(parallel route|layout)"
    confidence: medium
---

# Widget Skill

Content here.
`;
      const result = parseSkill(content, 'skills/widget-skill/SKILL.md');

      expect(result.name).toBe('widget-skill');
      expect(result.triggers).toBeDefined();
      expect(result.triggers).toHaveLength(2);
      expect(result.triggers![0]).toEqual({
        pattern: 'widget.*(slot|architecture)',
        confidence: 'high',
      });
      expect(result.triggers![1]).toEqual({
        pattern: '(parallel route|layout)',
        confidence: 'medium',
      });
    });

    it('should parse skill with empty triggers array', () => {
      const content = `---
name: no-triggers
description: Skill with empty triggers
triggers: []
---

Content.
`;
      const result = parseSkill(content, 'path');

      expect(result.triggers).toEqual([]);
    });

    it('should handle multiline description', () => {
      const content = `---
name: multi-desc
description: "This is a longer description that spans the full allowed length"
---

Content here.
`;
      const result = parseSkill(content, 'skills/multi-desc/SKILL.md');

      expect(result.description).toContain('longer description');
    });

    it('should preserve content formatting', () => {
      const content = `---
name: formatted
description: Formatted skill
---

## Section 1

- Item 1
- Item 2

\`\`\`typescript
const x = 1;
\`\`\`
`;
      const result = parseSkill(content, 'path');

      expect(result.content).toContain('## Section 1');
      expect(result.content).toContain('- Item 1');
      expect(result.content).toContain('const x = 1;');
    });
  });

  describe('invalid skills', () => {
    it('should reject missing name', () => {
      const content = `---
description: No name field
---

Content.
`;
      expect(() => parseSkill(content, 'path')).toThrow(SkillSchemaError);
    });

    it('should reject missing description', () => {
      const content = `---
name: no-desc
---

Content.
`;
      expect(() => parseSkill(content, 'path')).toThrow(SkillSchemaError);
    });

    it('should reject invalid name format (uppercase)', () => {
      const content = `---
name: InvalidName
description: Has uppercase
---

Content.
`;
      expect(() => parseSkill(content, 'path')).toThrow(SkillSchemaError);
    });

    it('should reject invalid name format (spaces)', () => {
      const content = `---
name: invalid name
description: Has spaces
---

Content.
`;
      expect(() => parseSkill(content, 'path')).toThrow(SkillSchemaError);
    });

    it('should reject empty content after frontmatter', () => {
      const content = `---
name: empty-content
description: No content
---
`;
      expect(() => parseSkill(content, 'path')).toThrow(SkillSchemaError);
    });

    it('should reject missing frontmatter', () => {
      const content = `# No Frontmatter

Just content.
`;
      expect(() => parseSkill(content, 'path')).toThrow(SkillSchemaError);
    });

    it('should reject malformed frontmatter', () => {
      const content = `---
name: test
description: [invalid yaml array as description]
---

Content.
`;
      expect(() => parseSkill(content, 'path')).toThrow(SkillSchemaError);
    });

    it('should reject trigger with invalid confidence value', () => {
      const content = `---
name: bad-trigger
description: Bad trigger confidence
triggers:
  - pattern: "test"
    confidence: "invalid"
---

Content.
`;
      expect(() => parseSkill(content, 'path')).toThrow(SkillSchemaError);
    });

    it('should reject trigger missing pattern field', () => {
      const content = `---
name: bad-trigger
description: Missing pattern
triggers:
  - confidence: high
---

Content.
`;
      expect(() => parseSkill(content, 'path')).toThrow(SkillSchemaError);
    });

    it('should reject trigger with empty pattern string', () => {
      const content = `---
name: bad-trigger
description: Empty pattern
triggers:
  - pattern: ""
    confidence: high
---

Content.
`;
      expect(() => parseSkill(content, 'path')).toThrow(SkillSchemaError);
    });
  });

  describe('security - prototype pollution prevention', () => {
    it('should reject __proto__ key in frontmatter', () => {
      const content = `---
name: malicious
description: Test
__proto__:
  isAdmin: true
---

Content.
`;
      expect(() => parseSkill(content, 'path')).toThrow(SkillSchemaError);
    });

    it('should reject constructor key', () => {
      const content = `---
name: malicious
description: Test
constructor:
  prototype:
    isAdmin: true
---

Content.
`;
      expect(() => parseSkill(content, 'path')).toThrow(SkillSchemaError);
    });
  });
});

describe('SkillSchemaError', () => {
  it('should have correct error name', () => {
    const error = new SkillSchemaError('test message');
    expect(error.name).toBe('SkillSchemaError');
  });
});
