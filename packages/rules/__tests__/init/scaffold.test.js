const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { scaffold } = require('../../lib/init/scaffold');

describe('scaffold', () => {
  let tmpDir;
  const rulesSource = path.resolve(__dirname, '../../.ai-rules');

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-scaffold-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates .ai-rules directory in target', () => {
    scaffold(tmpDir, { source: rulesSource });
    assert.ok(fs.existsSync(path.join(tmpDir, '.ai-rules')));
  });

  it('copies rules/ directory', () => {
    scaffold(tmpDir, { source: rulesSource });
    assert.ok(fs.existsSync(path.join(tmpDir, '.ai-rules', 'rules')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.ai-rules', 'rules', 'core.md')));
  });

  it('copies agents/ directory', () => {
    scaffold(tmpDir, { source: rulesSource });
    assert.ok(fs.existsSync(path.join(tmpDir, '.ai-rules', 'agents')));
  });

  it('copies README.md', () => {
    scaffold(tmpDir, { source: rulesSource });
    assert.ok(fs.existsSync(path.join(tmpDir, '.ai-rules', 'README.md')));
  });

  it('does not overwrite existing .ai-rules', () => {
    const existingDir = path.join(tmpDir, '.ai-rules');
    fs.mkdirSync(existingDir);
    fs.writeFileSync(path.join(existingDir, 'custom.md'), 'my rules');

    const result = scaffold(tmpDir, { source: rulesSource });
    assert.equal(result.skipped, true);
    assert.ok(fs.existsSync(path.join(existingDir, 'custom.md')));
  });

  it('returns list of copied directories', () => {
    const result = scaffold(tmpDir, { source: rulesSource });
    assert.equal(result.skipped, false);
    assert.ok(result.dirs.length > 0);
    assert.ok(result.dirs.includes('rules'));
    assert.ok(result.dirs.includes('agents'));
  });

  it('does not copy .omc directories', () => {
    // Create a temporary source with .omc inside agents/
    const customSource = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-src-'));
    const agentsDir = path.join(customSource, 'agents');
    const omcDir = path.join(agentsDir, '.omc', 'state');
    fs.mkdirSync(omcDir, { recursive: true });
    fs.writeFileSync(path.join(omcDir, 'hud-state.json'), '{}');
    // Also add a normal agent file
    fs.writeFileSync(path.join(agentsDir, 'test-agent.json'), '{}');
    // Add rules dir
    const rulesDir = path.join(customSource, 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.writeFileSync(path.join(rulesDir, 'core.md'), '# Core');

    scaffold(tmpDir, { source: customSource });

    // .omc should NOT exist in scaffolded output
    assert.ok(
      !fs.existsSync(path.join(tmpDir, '.ai-rules', 'agents', '.omc')),
      '.omc directory should not be copied during scaffold',
    );
    // Normal agent file should exist
    assert.ok(fs.existsSync(path.join(tmpDir, '.ai-rules', 'agents', 'test-agent.json')));

    fs.rmSync(customSource, { recursive: true, force: true });
  });
});
