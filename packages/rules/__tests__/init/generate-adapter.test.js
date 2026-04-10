const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { generateAdapterConfigs, ADAPTER_MAP } = require('../../lib/init/generate-adapter');

describe('generateAdapterConfigs', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-gen-adapter-'));
    // Create a minimal .ai-rules/adapters/ with a fake adapter
    const adaptersDir = path.join(tmpDir, '.ai-rules', 'adapters');
    fs.mkdirSync(adaptersDir, { recursive: true });
    fs.writeFileSync(path.join(adaptersDir, 'cursor.md'), '# Cursor Adapter\nRules here.');
    fs.writeFileSync(path.join(adaptersDir, 'claude-code.md'), '# Claude Code Adapter');
    fs.writeFileSync(path.join(adaptersDir, 'codex.md'), '# Codex Adapter');
    fs.writeFileSync(path.join(adaptersDir, 'antigravity.md'), '# Antigravity Adapter');
    fs.writeFileSync(path.join(adaptersDir, 'q.md'), '# Q Adapter');
    fs.writeFileSync(path.join(adaptersDir, 'kiro.md'), '# Kiro Adapter');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates config for a detected tool', () => {
    const tools = [{ name: 'cursor' }];
    const result = generateAdapterConfigs(tmpDir, tools);
    assert.equal(result.generated.length, 1);
    assert.equal(result.generated[0].tool, 'cursor');
    assert.equal(result.generated[0].action, 'created');
    // File should exist
    const targetPath = path.join(tmpDir, ADAPTER_MAP.cursor.target);
    assert.ok(fs.existsSync(targetPath));
    assert.ok(fs.readFileSync(targetPath, 'utf-8').includes('Cursor Adapter'));
  });

  it('generates configs for multiple tools', () => {
    const tools = [{ name: 'cursor' }, { name: 'claude-code' }, { name: 'codex' }];
    const result = generateAdapterConfigs(tmpDir, tools);
    assert.equal(result.generated.length, 3);
  });

  it('skips unknown tools', () => {
    const tools = [{ name: 'unknown-tool' }];
    const result = generateAdapterConfigs(tmpDir, tools);
    assert.equal(result.generated.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].reason, 'no adapter mapping');
  });

  it('backs up existing config before overwriting', () => {
    // Create existing config
    const targetDir = path.join(tmpDir, '.cursor', 'rules');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'codingbuddy.mdc'), 'old content');

    const tools = [{ name: 'cursor' }];
    const result = generateAdapterConfigs(tmpDir, tools);
    assert.equal(result.backedUp.length, 1);
    assert.equal(result.backedUp[0].tool, 'cursor');
    // Backup dir should exist
    assert.ok(fs.existsSync(path.join(tmpDir, '.codingbuddy-backup')));
  });

  it('skips backup with force option', () => {
    const targetDir = path.join(tmpDir, '.cursor', 'rules');
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'codingbuddy.mdc'), 'old content');

    const tools = [{ name: 'cursor' }];
    const result = generateAdapterConfigs(tmpDir, tools, { force: true });
    assert.equal(result.backedUp.length, 0);
    assert.equal(result.generated.length, 1);
  });

  it('dry run does not write files', () => {
    const tools = [{ name: 'cursor' }];
    const result = generateAdapterConfigs(tmpDir, tools, { dryRun: true });
    assert.equal(result.generated.length, 1);
    assert.equal(result.generated[0].action, 'would-create');
    // File should NOT exist
    const targetPath = path.join(tmpDir, ADAPTER_MAP.cursor.target);
    assert.ok(!fs.existsSync(targetPath));
  });

  it('skips when adapter template not found', () => {
    // Remove the adapter file
    fs.unlinkSync(path.join(tmpDir, '.ai-rules', 'adapters', 'cursor.md'));
    const tools = [{ name: 'cursor' }];
    const result = generateAdapterConfigs(tmpDir, tools);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].reason, 'adapter template not found');
  });

  it('ADAPTER_MAP covers all expected tools', () => {
    const expectedTools = ['cursor', 'claude-code', 'codex', 'antigravity', 'amazon-q', 'kiro'];
    for (const tool of expectedTools) {
      assert.ok(ADAPTER_MAP[tool], `${tool} should have adapter mapping`);
      assert.ok(ADAPTER_MAP[tool].adapter, `${tool} should have adapter file`);
      assert.ok(ADAPTER_MAP[tool].target, `${tool} should have target path`);
    }
  });
});
