const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { runTeam } = require('../../lib/init/team');

describe('runTeam', () => {
  let tmpDir;
  let originalLog;
  let logs;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-team-'));
    // Capture console.log output
    logs = [];
    originalLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));
  });

  afterEach(() => {
    console.log = originalLog;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns zero counts when no tools detected', async () => {
    const result = await runTeam(tmpDir);
    assert.equal(result.detected, 0);
    assert.equal(result.generated, 0);
    assert.ok(logs.some(l => l.includes('No AI tools detected')));
  });

  it('detects tools and generates configs', async () => {
    // Create .cursor dir and .ai-rules/adapters/cursor.md
    fs.mkdirSync(path.join(tmpDir, '.cursor'));
    const adaptersDir = path.join(tmpDir, '.ai-rules', 'adapters');
    fs.mkdirSync(adaptersDir, { recursive: true });
    fs.writeFileSync(path.join(adaptersDir, 'cursor.md'), '# Cursor rules');

    const result = await runTeam(tmpDir);
    assert.equal(result.detected, 1);
    assert.equal(result.generated, 1);
    assert.ok(logs.some(l => l.includes('cursor')));
    assert.ok(logs.some(l => l.includes('created')));
  });

  it('dry-run does not write files', async () => {
    fs.mkdirSync(path.join(tmpDir, '.cursor'));
    const adaptersDir = path.join(tmpDir, '.ai-rules', 'adapters');
    fs.mkdirSync(adaptersDir, { recursive: true });
    fs.writeFileSync(path.join(adaptersDir, 'cursor.md'), '# Cursor rules');

    const result = await runTeam(tmpDir, { dryRun: true });
    assert.equal(result.generated, 1);
    assert.ok(logs.some(l => l.includes('would create')));
    // File should NOT exist
    assert.ok(!fs.existsSync(path.join(tmpDir, '.cursor', 'rules', 'codingbuddy.mdc')));
  });

  it('shows overwrite warning for tools with existing config', async () => {
    fs.mkdirSync(path.join(tmpDir, '.cursor', 'rules'), { recursive: true });
    const adaptersDir = path.join(tmpDir, '.ai-rules', 'adapters');
    fs.mkdirSync(adaptersDir, { recursive: true });
    fs.writeFileSync(path.join(adaptersDir, 'cursor.md'), '# Cursor rules');

    await runTeam(tmpDir);
    assert.ok(logs.some(l => l.includes('will overwrite')));
  });

  it('handles multiple tools', async () => {
    fs.mkdirSync(path.join(tmpDir, '.cursor'));
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    const adaptersDir = path.join(tmpDir, '.ai-rules', 'adapters');
    fs.mkdirSync(adaptersDir, { recursive: true });
    fs.writeFileSync(path.join(adaptersDir, 'cursor.md'), '# Cursor');
    fs.writeFileSync(path.join(adaptersDir, 'claude-code.md'), '# Claude');

    const result = await runTeam(tmpDir);
    assert.equal(result.detected, 2);
    assert.equal(result.generated, 2);
  });
});
