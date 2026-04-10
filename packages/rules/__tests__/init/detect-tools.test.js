const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { detectTools, AI_TOOLS } = require('../../lib/init/detect-tools');

describe('detectTools', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-test-tools-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns all 6 tools for empty directory', () => {
    const results = detectTools(tmpDir);
    assert.equal(results.length, 6);
    for (const tool of results) {
      assert.equal(tool.exists, false);
      assert.equal(tool.hasRules, false);
      assert.deepEqual(tool.configFiles, []);
    }
  });

  it('detects Cursor from .cursor/ directory', () => {
    fs.mkdirSync(path.join(tmpDir, '.cursor'));
    fs.writeFileSync(path.join(tmpDir, '.cursor', 'settings.json'), '{}');

    const results = detectTools(tmpDir);
    const cursor = results.find(t => t.name === 'Cursor');
    assert.equal(cursor.exists, true);
    assert.ok(cursor.configFiles.includes('settings.json'));
    assert.equal(cursor.indicator, 'AI rules config');
  });

  it('detects Cursor from .cursorrules file', () => {
    fs.writeFileSync(path.join(tmpDir, '.cursorrules'), 'rules content');

    const results = detectTools(tmpDir);
    const cursor = results.find(t => t.name === 'Cursor');
    assert.equal(cursor.exists, true);
    assert.equal(cursor.hasRules, true);
    assert.ok(cursor.configFiles.includes('.cursorrules'));
  });

  it('detects Claude Code from .claude/ directory', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    fs.writeFileSync(path.join(tmpDir, '.claude', 'settings.json'), '{}');

    const results = detectTools(tmpDir);
    const claude = results.find(t => t.name === 'Claude Code');
    assert.equal(claude.exists, true);
    assert.equal(claude.hasRules, false);
    assert.ok(claude.configFiles.includes('settings.json'));
  });

  it('detects Claude Code hasRules when rules/ exists', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude', 'rules'), { recursive: true });

    const results = detectTools(tmpDir);
    const claude = results.find(t => t.name === 'Claude Code');
    assert.equal(claude.exists, true);
    assert.equal(claude.hasRules, true);
  });

  it('detects Codex from .codex/ directory', () => {
    fs.mkdirSync(path.join(tmpDir, '.codex'));
    fs.writeFileSync(path.join(tmpDir, '.codex', 'instructions.md'), '# Instructions');

    const results = detectTools(tmpDir);
    const codex = results.find(t => t.name === 'Codex');
    assert.equal(codex.exists, true);
    assert.equal(codex.hasRules, true);
  });

  it('detects Antigravity from .antigravity/ directory', () => {
    fs.mkdirSync(path.join(tmpDir, '.antigravity'));
    fs.writeFileSync(path.join(tmpDir, '.antigravity', 'config.json'), '{}');

    const results = detectTools(tmpDir);
    const ag = results.find(t => t.name === 'Antigravity');
    assert.equal(ag.exists, true);
    assert.ok(ag.configFiles.includes('config.json'));
  });

  it('detects Amazon Q from .q/ directory', () => {
    fs.mkdirSync(path.join(tmpDir, '.q'));

    const results = detectTools(tmpDir);
    const q = results.find(t => t.name === 'Amazon Q');
    assert.equal(q.exists, true);
    assert.equal(q.hasRules, false);
  });

  it('detects Kiro from .kiro/ directory', () => {
    fs.mkdirSync(path.join(tmpDir, '.kiro'));
    fs.writeFileSync(path.join(tmpDir, '.kiro', 'config.json'), '{}');

    const results = detectTools(tmpDir);
    const kiro = results.find(t => t.name === 'Kiro');
    assert.equal(kiro.exists, true);
    assert.ok(kiro.configFiles.includes('config.json'));
  });

  it('detects multiple tools simultaneously', () => {
    fs.mkdirSync(path.join(tmpDir, '.cursor'));
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    fs.mkdirSync(path.join(tmpDir, '.codex'));

    const results = detectTools(tmpDir);
    const detected = results.filter(t => t.exists);
    assert.equal(detected.length, 3);

    const names = detected.map(t => t.name);
    assert.ok(names.includes('Cursor'));
    assert.ok(names.includes('Claude Code'));
    assert.ok(names.includes('Codex'));
  });

  it('returns correct structure for each tool', () => {
    const results = detectTools(tmpDir);
    for (const tool of results) {
      assert.ok(typeof tool.name === 'string');
      assert.ok(typeof tool.configDir === 'string');
      assert.ok(typeof tool.exists === 'boolean');
      assert.ok(typeof tool.hasRules === 'boolean');
      assert.ok(Array.isArray(tool.configFiles));
      assert.ok(typeof tool.indicator === 'string');
    }
  });

  it('lists config files in detected tool directory', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    fs.writeFileSync(path.join(tmpDir, '.claude', 'settings.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, '.claude', 'CLAUDE.md'), '# Claude');

    const results = detectTools(tmpDir);
    const claude = results.find(t => t.name === 'Claude Code');
    assert.ok(claude.configFiles.includes('settings.json'));
    assert.ok(claude.configFiles.includes('CLAUDE.md'));
    assert.equal(claude.configFiles.length, 2);
  });
});
