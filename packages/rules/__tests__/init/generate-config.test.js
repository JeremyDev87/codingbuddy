const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { generateConfig } = require('../../lib/init/generate-config');

describe('generateConfig', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-cfg-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates codingbuddy.config.json with defaults', () => {
    const options = {
      language: 'en',
      primaryAgent: 'software-engineer',
      techStack: {
        runtime: 'node',
        language: 'typescript',
        frameworks: ['next'],
        category: 'fullstack',
      },
    };
    generateConfig(tmpDir, options);

    const configPath = path.join(tmpDir, 'codingbuddy.config.json');
    assert.ok(fs.existsSync(configPath));

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.equal(config.language, 'en');
    assert.equal(config.primaryAgent, 'software-engineer');
    assert.equal(config.techStack.runtime, 'node');
  });

  it('includes all required fields', () => {
    generateConfig(tmpDir, {
      language: 'ko',
      primaryAgent: 'backend-developer',
      techStack: {
        runtime: 'python',
        language: 'python',
        frameworks: ['django'],
        category: 'backend',
      },
    });

    const config = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'codingbuddy.config.json'), 'utf-8'),
    );
    assert.ok('language' in config);
    assert.ok('primaryAgent' in config);
    assert.ok('techStack' in config);
    assert.ok('version' in config);
  });

  it('does not overwrite existing config', () => {
    const configPath = path.join(tmpDir, 'codingbuddy.config.json');
    fs.writeFileSync(configPath, JSON.stringify({ language: 'ja', custom: true }));

    const result = generateConfig(tmpDir, {
      language: 'en',
      primaryAgent: 'software-engineer',
      techStack: { runtime: 'node', language: 'javascript', frameworks: [], category: 'backend' },
    });

    assert.equal(result.skipped, true);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    assert.equal(config.language, 'ja');
    assert.equal(config.custom, true);
  });

  it('writes formatted JSON', () => {
    generateConfig(tmpDir, {
      language: 'en',
      primaryAgent: 'frontend-developer',
      techStack: {
        runtime: 'node',
        language: 'typescript',
        frameworks: ['react'],
        category: 'frontend',
      },
    });

    const raw = fs.readFileSync(path.join(tmpDir, 'codingbuddy.config.json'), 'utf-8');
    assert.ok(raw.includes('\n'), 'should be formatted with newlines');
  });
});
