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
});
