import { validatePluginManifest, PluginManifestSchemaError } from './plugin-manifest.schema';
import type { PluginManifest } from './plugin.types';

describe('PluginManifestSchema', () => {
  const validManifest = {
    name: 'my-cool-plugin',
    version: '1.0.0',
    description: 'A cool plugin for codingbuddy',
    author: 'test-author',
    provides: {
      agents: ['security-specialist'],
      rules: ['my-rule'],
    },
  };

  describe('valid manifests', () => {
    it('should accept a valid manifest with all fields', () => {
      const result = validatePluginManifest(validManifest);

      expect(result).toEqual(validManifest);
    });

    it('should accept manifest with empty provides object', () => {
      const manifest = { ...validManifest, provides: {} };
      const result = validatePluginManifest(manifest);

      expect(result.provides).toEqual({});
    });

    it('should accept manifest with optional tags', () => {
      const manifest = { ...validManifest, tags: ['security', 'testing'] };
      const result = validatePluginManifest(manifest);

      expect(result.tags).toEqual(['security', 'testing']);
    });

    it('should accept manifest with optional compatibility', () => {
      const manifest = { ...validManifest, compatibility: '>=5.0.0' };
      const result = validatePluginManifest(manifest);

      expect(result.compatibility).toBe('>=5.0.0');
    });

    it('should accept manifest with all provides arrays', () => {
      const manifest = {
        ...validManifest,
        provides: {
          agents: ['agent-a'],
          rules: ['rule-a'],
          skills: ['skill-a'],
          checklists: ['checklist-a'],
        },
      };
      const result = validatePluginManifest(manifest);

      expect(result.provides.agents).toEqual(['agent-a']);
      expect(result.provides.rules).toEqual(['rule-a']);
      expect(result.provides.skills).toEqual(['skill-a']);
      expect(result.provides.checklists).toEqual(['checklist-a']);
    });

    it('should strip extra unknown fields', () => {
      const manifest = {
        ...validManifest,
        unknownField: 'should be removed',
        anotherExtra: 42,
      };
      const result = validatePluginManifest(manifest);

      expect(result).not.toHaveProperty('unknownField');
      expect(result).not.toHaveProperty('anotherExtra');
    });
  });

  describe('missing required fields', () => {
    it('should reject manifest without name', () => {
      const { name: _, ...manifest } = validManifest;

      expect(() => validatePluginManifest(manifest)).toThrow(PluginManifestSchemaError);
    });

    it('should reject manifest without version', () => {
      const { version: _, ...manifest } = validManifest;

      expect(() => validatePluginManifest(manifest)).toThrow(PluginManifestSchemaError);
    });

    it('should reject manifest without description', () => {
      const { description: _, ...manifest } = validManifest;

      expect(() => validatePluginManifest(manifest)).toThrow(PluginManifestSchemaError);
    });

    it('should reject manifest without author', () => {
      const { author: _, ...manifest } = validManifest;

      expect(() => validatePluginManifest(manifest)).toThrow(PluginManifestSchemaError);
    });

    it('should reject manifest without provides', () => {
      const { provides: _, ...manifest } = validManifest;

      expect(() => validatePluginManifest(manifest)).toThrow(PluginManifestSchemaError);
    });
  });

  describe('invalid name format', () => {
    it('should reject uppercase letters in name', () => {
      const manifest = { ...validManifest, name: 'MyPlugin' };

      expect(() => validatePluginManifest(manifest)).toThrow(PluginManifestSchemaError);
    });

    it('should reject spaces in name', () => {
      const manifest = { ...validManifest, name: 'my plugin' };

      expect(() => validatePluginManifest(manifest)).toThrow(PluginManifestSchemaError);
    });

    it('should reject special characters in name', () => {
      const manifest = { ...validManifest, name: 'my_plugin!' };

      expect(() => validatePluginManifest(manifest)).toThrow(PluginManifestSchemaError);
    });

    it('should reject empty name', () => {
      const manifest = { ...validManifest, name: '' };

      expect(() => validatePluginManifest(manifest)).toThrow(PluginManifestSchemaError);
    });
  });

  describe('invalid version format', () => {
    it('should reject non-semver version', () => {
      const manifest = { ...validManifest, version: '1.0' };

      expect(() => validatePluginManifest(manifest)).toThrow(PluginManifestSchemaError);
    });

    it('should reject version with prefix', () => {
      const manifest = { ...validManifest, version: 'v1.0.0' };

      expect(() => validatePluginManifest(manifest)).toThrow(PluginManifestSchemaError);
    });

    it('should reject non-numeric version segments', () => {
      const manifest = { ...validManifest, version: 'a.b.c' };

      expect(() => validatePluginManifest(manifest)).toThrow(PluginManifestSchemaError);
    });
  });

  describe('error messages', () => {
    it('should include field path in error message', () => {
      const manifest = { ...validManifest, name: 'INVALID' };

      try {
        validatePluginManifest(manifest);
        fail('Expected PluginManifestSchemaError');
      } catch (error) {
        expect(error).toBeInstanceOf(PluginManifestSchemaError);
        expect((error as PluginManifestSchemaError).message).toContain('name');
      }
    });

    it('should provide actionable error for missing fields', () => {
      try {
        validatePluginManifest({});
        fail('Expected PluginManifestSchemaError');
      } catch (error) {
        expect(error).toBeInstanceOf(PluginManifestSchemaError);
        expect((error as PluginManifestSchemaError).message).toContain('Invalid plugin manifest');
      }
    });
  });

  describe('type safety', () => {
    it('should return typed PluginManifest', () => {
      const result: PluginManifest = validatePluginManifest(validManifest);

      expect(result.name).toBe('my-cool-plugin');
      expect(result.version).toBe('1.0.0');
      expect(result.description).toBe('A cool plugin for codingbuddy');
      expect(result.author).toBe('test-author');
      expect(result.provides.agents).toEqual(['security-specialist']);
    });
  });
});
