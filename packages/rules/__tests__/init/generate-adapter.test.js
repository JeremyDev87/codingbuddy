const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { generateAdapterConfigs, ADAPTER_MAP } = require('../../lib/init/generate-adapter');

describe('generateAdapterConfigs', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-adapter-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates cursor adapter config', () => {
    const result = generateAdapterConfigs(tmpDir, ['cursor']);

    assert.equal(result.generated.length, 1);
    assert.equal(result.generated[0].tool, 'cursor');
    assert.equal(result.generated[0].action, 'created');

    const outputPath = path.join(tmpDir, '.cursor', 'rules', 'codingbuddy.mdc');
    assert.ok(fs.existsSync(outputPath));

    const content = fs.readFileSync(outputPath, 'utf-8');
    assert.ok(content.includes('Cursor'));
  });

  it('generates claude-code adapter config', () => {
    const result = generateAdapterConfigs(tmpDir, ['claude-code']);

    assert.equal(result.generated.length, 1);
    assert.equal(result.generated[0].tool, 'claude-code');
    assert.equal(result.generated[0].action, 'created');

    const outputPath = path.join(tmpDir, '.claude', 'CLAUDE.md');
    assert.ok(fs.existsSync(outputPath));

    const content = fs.readFileSync(outputPath, 'utf-8');
    assert.ok(content.includes('Claude'));
  });

  it('generates codex adapter config', () => {
    const result = generateAdapterConfigs(tmpDir, ['codex']);

    assert.equal(result.generated.length, 1);
    assert.equal(result.generated[0].tool, 'codex');
    assert.equal(result.generated[0].action, 'created');

    const outputPath = path.join(tmpDir, '.codex', 'instructions.md');
    assert.ok(fs.existsSync(outputPath));

    const content = fs.readFileSync(outputPath, 'utf-8');
    assert.ok(content.includes('Codex'));
  });

  it('generates antigravity adapter config', () => {
    const result = generateAdapterConfigs(tmpDir, ['antigravity']);

    assert.equal(result.generated.length, 1);
    assert.equal(result.generated[0].tool, 'antigravity');
    assert.equal(result.generated[0].action, 'created');

    const outputPath = path.join(tmpDir, '.antigravity', 'instructions.md');
    assert.ok(fs.existsSync(outputPath));

    const content = fs.readFileSync(outputPath, 'utf-8');
    assert.ok(content.includes('Antigravity'));
  });

  it('generates multiple adapter configs at once', () => {
    const tools = ['cursor', 'claude-code', 'codex', 'antigravity'];
    const result = generateAdapterConfigs(tmpDir, tools);

    assert.equal(result.generated.length, 4);
    assert.equal(result.skipped.length, 0);
    assert.equal(result.backedUp.length, 0);

    for (const entry of result.generated) {
      assert.ok(fs.existsSync(entry.path));
      assert.equal(entry.action, 'created');
    }
  });

  it('skips unknown tools', () => {
    const result = generateAdapterConfigs(tmpDir, ['unknown-tool']);

    assert.equal(result.generated.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].tool, 'unknown-tool');
    assert.equal(result.skipped[0].reason, 'unknown-tool');
  });

  it('backs up existing configs before overwriting', () => {
    const existingPath = path.join(tmpDir, '.codex', 'instructions.md');
    fs.mkdirSync(path.dirname(existingPath), { recursive: true });
    fs.writeFileSync(existingPath, 'existing content');

    const result = generateAdapterConfigs(tmpDir, ['codex']);

    assert.equal(result.generated.length, 1);
    assert.equal(result.generated[0].action, 'overwritten');
    assert.equal(result.backedUp.length, 1);
    assert.equal(result.backedUp[0].tool, 'codex');

    const backupPath = path.join(tmpDir, '.codingbuddy-backup', '.codex', 'instructions.md');
    assert.ok(fs.existsSync(backupPath));
    assert.equal(fs.readFileSync(backupPath, 'utf-8'), 'existing content');

    // Original file was overwritten with new content
    const newContent = fs.readFileSync(existingPath, 'utf-8');
    assert.notEqual(newContent, 'existing content');
  });

  it('skips backup in force mode', () => {
    const existingPath = path.join(tmpDir, '.codex', 'instructions.md');
    fs.mkdirSync(path.dirname(existingPath), { recursive: true });
    fs.writeFileSync(existingPath, 'existing content');

    const result = generateAdapterConfigs(tmpDir, ['codex'], { force: true });

    assert.equal(result.generated.length, 1);
    assert.equal(result.generated[0].action, 'overwritten');
    assert.equal(result.backedUp.length, 0);

    const backupDir = path.join(tmpDir, '.codingbuddy-backup');
    assert.ok(!fs.existsSync(backupDir));
  });

  it('dry-run mode returns what would be generated without writing', () => {
    const result = generateAdapterConfigs(tmpDir, ['cursor', 'codex'], { dryRun: true });

    assert.equal(result.generated.length, 2);
    assert.equal(result.generated[0].action, 'create');
    assert.equal(result.generated[1].action, 'create');

    assert.ok(!fs.existsSync(path.join(tmpDir, '.cursor', 'rules', 'codingbuddy.mdc')));
    assert.ok(!fs.existsSync(path.join(tmpDir, '.codex', 'instructions.md')));
  });

  it('dry-run mode detects existing files as overwrite', () => {
    const existingPath = path.join(tmpDir, '.codex', 'instructions.md');
    fs.mkdirSync(path.dirname(existingPath), { recursive: true });
    fs.writeFileSync(existingPath, 'existing content');

    const result = generateAdapterConfigs(tmpDir, ['codex'], { dryRun: true });

    assert.equal(result.generated.length, 1);
    assert.equal(result.generated[0].action, 'overwrite');

    // Original file unchanged
    assert.equal(fs.readFileSync(existingPath, 'utf-8'), 'existing content');
  });

  it('creates output directories if they do not exist', () => {
    generateAdapterConfigs(tmpDir, ['cursor']);

    const rulesDir = path.join(tmpDir, '.cursor', 'rules');
    assert.ok(fs.existsSync(rulesDir));
    assert.ok(fs.statSync(rulesDir).isDirectory());
  });

  it('returns empty results for empty detectedTools', () => {
    const result = generateAdapterConfigs(tmpDir, []);

    assert.equal(result.generated.length, 0);
    assert.equal(result.backedUp.length, 0);
    assert.equal(result.skipped.length, 0);
  });

  it('defaults options to dryRun=false and force=false', () => {
    const result = generateAdapterConfigs(tmpDir, ['codex']);

    assert.equal(result.generated.length, 1);
    assert.equal(result.generated[0].action, 'created');
    assert.ok(fs.existsSync(path.join(tmpDir, '.codex', 'instructions.md')));
  });

  it('ADAPTER_MAP contains all four supported tools', () => {
    const tools = Object.keys(ADAPTER_MAP);
    assert.ok(tools.includes('cursor'));
    assert.ok(tools.includes('claude-code'));
    assert.ok(tools.includes('codex'));
    assert.ok(tools.includes('antigravity'));
    assert.equal(tools.length, 4);
  });
});
