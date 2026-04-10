const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { detectTools, AI_TOOLS } = require('../../lib/init/detect-tools');

describe('detectTools', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-detect-tools-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns all 6 tools', () => {
    const result = detectTools(tmpDir);
    assert.equal(result.length, 6);
    const names = result.map(t => t.name);
    assert.ok(names.includes('cursor'));
    assert.ok(names.includes('claude-code'));
    assert.ok(names.includes('codex'));
    assert.ok(names.includes('antigravity'));
    assert.ok(names.includes('amazon-q'));
    assert.ok(names.includes('kiro'));
  });

  it('reports exists=false for empty directory', () => {
    const result = detectTools(tmpDir);
    for (const tool of result) {
      assert.equal(tool.exists, false);
      assert.equal(tool.hasConfig, false);
    }
  });

  it('detects .cursor directory', () => {
    fs.mkdirSync(path.join(tmpDir, '.cursor'));
    const result = detectTools(tmpDir);
    const cursor = result.find(t => t.name === 'cursor');
    assert.equal(cursor.exists, true);
    assert.equal(cursor.hasConfig, false);
  });

  it('detects .cursor with rules indicator', () => {
    fs.mkdirSync(path.join(tmpDir, '.cursor', 'rules'), { recursive: true });
    const result = detectTools(tmpDir);
    const cursor = result.find(t => t.name === 'cursor');
    assert.equal(cursor.exists, true);
    assert.equal(cursor.hasConfig, true);
  });

  it('detects .claude directory', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    fs.writeFileSync(path.join(tmpDir, '.claude', 'settings.json'), '{}');
    const result = detectTools(tmpDir);
    const claude = result.find(t => t.name === 'claude-code');
    assert.equal(claude.exists, true);
    assert.equal(claude.hasConfig, true);
  });

  it('detects multiple tools simultaneously', () => {
    fs.mkdirSync(path.join(tmpDir, '.cursor'));
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    fs.mkdirSync(path.join(tmpDir, '.codex'));
    const result = detectTools(tmpDir);
    const detected = result.filter(t => t.exists);
    assert.equal(detected.length, 3);
  });

  it('AI_TOOLS has correct structure', () => {
    for (const tool of AI_TOOLS) {
      assert.ok(tool.name, 'tool should have name');
      assert.ok(tool.configDir, 'tool should have configDir');
      assert.ok(tool.configDir.startsWith('.'), 'configDir should be a dotdir');
      assert.ok(tool.indicator, 'tool should have indicator');
    }
  });
});
