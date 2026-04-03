import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockConsoleUtils = {
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    step: vi.fn(),
  },
};

vi.mock('../utils/console', () => ({
  createConsoleUtils: () => mockConsoleUtils,
}));

vi.mock('child_process', () => ({
  execSync: vi.fn(() => 'Test Author'),
}));

import {
  runCreatePlugin,
  validatePluginName,
  generateMinimalTemplate,
  generateFullTemplate,
} from './create-plugin.command';

describe('create-plugin.command', () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-plugin-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // =========================================================================
  // Name validation
  // =========================================================================
  describe('validatePluginName', () => {
    it('should accept valid lowercase-dash names', () => {
      expect(validatePluginName('my-plugin')).toBe(true);
      expect(validatePluginName('plugin123')).toBe(true);
      expect(validatePluginName('a')).toBe(true);
      expect(validatePluginName('next-js-router')).toBe(true);
    });

    it('should reject names starting with a number', () => {
      expect(validatePluginName('123plugin')).toBe(false);
    });

    it('should reject names with uppercase letters', () => {
      expect(validatePluginName('MyPlugin')).toBe(false);
    });

    it('should reject names with special characters', () => {
      expect(validatePluginName('my_plugin')).toBe(false);
      expect(validatePluginName('my.plugin')).toBe(false);
      expect(validatePluginName('my plugin')).toBe(false);
    });

    it('should reject empty names', () => {
      expect(validatePluginName('')).toBe(false);
    });
  });

  // =========================================================================
  // Minimal template generation
  // =========================================================================
  describe('generateMinimalTemplate', () => {
    it('should return plugin.json, README.md, and .gitignore', () => {
      const files = generateMinimalTemplate({
        name: 'my-plugin',
        description: 'A test plugin',
        author: 'Test Author',
      });

      expect(files).toHaveProperty('plugin.json');
      expect(files).toHaveProperty('README.md');
      expect(files).toHaveProperty('.gitignore');
    });

    it('should generate valid plugin.json with correct fields', () => {
      const files = generateMinimalTemplate({
        name: 'my-plugin',
        description: 'A test plugin',
        author: 'Test Author',
      });

      const manifest = JSON.parse(files['plugin.json']);
      expect(manifest.name).toBe('my-plugin');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.description).toBe('A test plugin');
      expect(manifest.author).toBe('Test Author');
      expect(manifest.provides).toBeDefined();
    });

    it('should generate README with plugin name', () => {
      const files = generateMinimalTemplate({
        name: 'my-plugin',
        description: 'A test plugin',
        author: 'Test Author',
      });

      expect(files['README.md']).toContain('my-plugin');
      expect(files['README.md']).toContain('A test plugin');
    });
  });

  // =========================================================================
  // Full template generation
  // =========================================================================
  describe('generateFullTemplate', () => {
    it('should include all minimal files plus example directories', () => {
      const files = generateFullTemplate({
        name: 'my-plugin',
        description: 'A test plugin',
        author: 'Test Author',
      });

      expect(files).toHaveProperty('plugin.json');
      expect(files).toHaveProperty('README.md');
      expect(files).toHaveProperty('.gitignore');
      expect(files).toHaveProperty('agents/example-agent.json');
      expect(files).toHaveProperty('skills/example-skill.md');
      expect(files).toHaveProperty('rules/example-rule.md');
      expect(files).toHaveProperty('checklists/example-checklist.json');
    });

    it('should generate valid example agent JSON', () => {
      const files = generateFullTemplate({
        name: 'my-plugin',
        description: 'A test plugin',
        author: 'Test Author',
      });

      const agent = JSON.parse(files['agents/example-agent.json']);
      expect(agent.name).toBeDefined();
      expect(agent.role).toBeDefined();
    });

    it('should generate valid example checklist JSON', () => {
      const files = generateFullTemplate({
        name: 'my-plugin',
        description: 'A test plugin',
        author: 'Test Author',
      });

      const checklist = JSON.parse(files['checklists/example-checklist.json']);
      expect(checklist.name).toBeDefined();
      expect(checklist.items).toBeDefined();
      expect(Array.isArray(checklist.items)).toBe(true);
    });

    it('should list provided files in plugin.json', () => {
      const files = generateFullTemplate({
        name: 'my-plugin',
        description: 'A test plugin',
        author: 'Test Author',
      });

      const manifest = JSON.parse(files['plugin.json']);
      expect(manifest.provides.agents).toContain('agents/example-agent.json');
      expect(manifest.provides.skills).toContain('skills/example-skill.md');
      expect(manifest.provides.rules).toContain('rules/example-rule.md');
      expect(manifest.provides.checklists).toContain('checklists/example-checklist.json');
    });
  });

  // =========================================================================
  // runCreatePlugin (integration)
  // =========================================================================
  describe('runCreatePlugin', () => {
    it('should create minimal template files on disk', async () => {
      const result = await runCreatePlugin({
        name: 'test-plugin',
        outputDir: tmpDir,
        template: 'minimal',
      });

      expect(result.success).toBe(true);
      const pluginDir = path.join(tmpDir, 'test-plugin');
      expect(fs.existsSync(path.join(pluginDir, 'plugin.json'))).toBe(true);
      expect(fs.existsSync(path.join(pluginDir, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(pluginDir, '.gitignore'))).toBe(true);
    });

    it('should create full template files on disk', async () => {
      const result = await runCreatePlugin({
        name: 'test-plugin',
        outputDir: tmpDir,
        template: 'full',
      });

      expect(result.success).toBe(true);
      const pluginDir = path.join(tmpDir, 'test-plugin');
      expect(fs.existsSync(path.join(pluginDir, 'agents/example-agent.json'))).toBe(true);
      expect(fs.existsSync(path.join(pluginDir, 'skills/example-skill.md'))).toBe(true);
      expect(fs.existsSync(path.join(pluginDir, 'rules/example-rule.md'))).toBe(true);
      expect(fs.existsSync(path.join(pluginDir, 'checklists/example-checklist.json'))).toBe(true);
    });

    it('should fail if plugin name is invalid', async () => {
      const result = await runCreatePlugin({
        name: 'Invalid-Name',
        outputDir: tmpDir,
        template: 'minimal',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid plugin name');
      expect(mockConsoleUtils.log.error).toHaveBeenCalled();
    });

    it('should fail if target directory already exists', async () => {
      fs.mkdirSync(path.join(tmpDir, 'existing-plugin'));

      const result = await runCreatePlugin({
        name: 'existing-plugin',
        outputDir: tmpDir,
        template: 'minimal',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
      expect(mockConsoleUtils.log.error).toHaveBeenCalled();
    });

    it('should use git config author as default', async () => {
      const result = await runCreatePlugin({
        name: 'test-plugin',
        outputDir: tmpDir,
        template: 'minimal',
      });

      expect(result.success).toBe(true);
      const pluginDir = path.join(tmpDir, 'test-plugin');
      const manifest = JSON.parse(fs.readFileSync(path.join(pluginDir, 'plugin.json'), 'utf-8'));
      expect(manifest.author).toBe('Test Author');
    });

    it('should use provided description', async () => {
      const result = await runCreatePlugin({
        name: 'test-plugin',
        outputDir: tmpDir,
        template: 'minimal',
        description: 'My custom description',
      });

      expect(result.success).toBe(true);
      const pluginDir = path.join(tmpDir, 'test-plugin');
      const manifest = JSON.parse(fs.readFileSync(path.join(pluginDir, 'plugin.json'), 'utf-8'));
      expect(manifest.description).toBe('My custom description');
    });

    it('should log success with created path', async () => {
      await runCreatePlugin({
        name: 'test-plugin',
        outputDir: tmpDir,
        template: 'minimal',
      });

      expect(mockConsoleUtils.log.success).toHaveBeenCalledWith(
        expect.stringContaining('test-plugin'),
      );
    });
  });
});
