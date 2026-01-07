/**
 * Basic Prompt Tests
 *
 * Tests for project name and description prompts
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROJECT_NAME,
  DEFAULT_DESCRIPTION,
  validateProjectName,
  validateDescription,
  type BasicSettings,
} from './basic-prompt';

describe('basic-prompt', () => {
  describe('DEFAULT_PROJECT_NAME', () => {
    it('should be "my-project"', () => {
      expect(DEFAULT_PROJECT_NAME).toBe('my-project');
    });
  });

  describe('DEFAULT_DESCRIPTION', () => {
    it('should be empty string', () => {
      expect(DEFAULT_DESCRIPTION).toBe('');
    });
  });

  describe('BasicSettings type', () => {
    it('should have projectName and description fields', () => {
      const settings: BasicSettings = {
        projectName: 'test-project',
        description: 'A test project',
      };

      expect(settings.projectName).toBe('test-project');
      expect(settings.description).toBe('A test project');
    });
  });

  describe('validateProjectName', () => {
    it('should accept valid project names', () => {
      expect(validateProjectName('my-project')).toBe(true);
      expect(validateProjectName('project123')).toBe(true);
      expect(validateProjectName('my_project')).toBe(true);
      expect(validateProjectName('myproject')).toBe(true);
    });

    it('should accept scoped package names', () => {
      expect(validateProjectName('@scope/package')).toBe(true);
      expect(validateProjectName('@my-org/my-package')).toBe(true);
    });

    it('should reject empty names', () => {
      const result = validateProjectName('');
      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
    });

    it('should reject names with invalid characters', () => {
      const result = validateProjectName("project's name");
      expect(result).not.toBe(true);
    });

    it('should reject names starting with dot or underscore', () => {
      expect(validateProjectName('.hidden')).not.toBe(true);
      expect(validateProjectName('_private')).not.toBe(true);
    });

    it('should reject names with spaces', () => {
      const result = validateProjectName('my project');
      expect(result).not.toBe(true);
    });

    it('should reject names with uppercase letters', () => {
      const result = validateProjectName('MyProject');
      expect(result).not.toBe(true);
    });

    it('should include format example in error message for invalid names', () => {
      const result = validateProjectName('Invalid Name!');
      expect(typeof result).toBe('string');
      expect(result).toContain('my-project');
    });

    it('should reject names longer than 214 characters', () => {
      const longName = 'a'.repeat(215);
      const result = validateProjectName(longName);
      expect(result).not.toBe(true);
    });
  });

  describe('validateDescription', () => {
    it('should accept valid descriptions', () => {
      expect(validateDescription('A simple project')).toBe(true);
      expect(validateDescription('My awesome CLI tool')).toBe(true);
      expect(validateDescription('')).toBe(true); // Empty is allowed
    });

    it('should accept descriptions with special characters', () => {
      expect(validateDescription("It's a great project!")).toBe(true);
      expect(validateDescription('Version 2.0 - improved')).toBe(true);
    });

    it('should reject descriptions with control characters', () => {
      const withNewline = 'Line 1\nLine 2';
      expect(validateDescription(withNewline)).not.toBe(true);

      const withTab = 'Column1\tColumn2';
      expect(validateDescription(withTab)).not.toBe(true);
    });

    it('should reject descriptions longer than 250 characters', () => {
      const longDesc = 'a'.repeat(251);
      const result = validateDescription(longDesc);
      expect(result).not.toBe(true);
    });
  });
});
