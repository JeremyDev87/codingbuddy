const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { detectStack } = require('../../lib/init/detect-stack');

describe('detectStack', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects Node.js project from package.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'my-app', dependencies: { express: '^4.0.0' } }),
    );
    const result = detectStack(tmpDir);
    assert.equal(result.runtime, 'node');
    assert.ok(result.frameworks.includes('express'));
  });

  it('detects React project', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' } }),
    );
    const result = detectStack(tmpDir);
    assert.equal(result.runtime, 'node');
    assert.ok(result.frameworks.includes('react'));
    assert.equal(result.category, 'frontend');
  });

  it('detects Next.js project', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { next: '^14.0.0', react: '^18.0.0' } }),
    );
    const result = detectStack(tmpDir);
    assert.ok(result.frameworks.includes('next'));
    assert.equal(result.category, 'fullstack');
  });

  it('detects NestJS backend project', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { '@nestjs/core': '^10.0.0' } }),
    );
    const result = detectStack(tmpDir);
    assert.ok(result.frameworks.includes('nestjs'));
    assert.equal(result.category, 'backend');
  });

  it('detects Python project from pyproject.toml', () => {
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "myapp"\n');
    const result = detectStack(tmpDir);
    assert.equal(result.runtime, 'python');
    assert.equal(result.category, 'backend');
  });

  it('detects Django in pyproject.toml', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'pyproject.toml'),
      '[project]\ndependencies = ["django>=4.0"]\n',
    );
    const result = detectStack(tmpDir);
    assert.equal(result.runtime, 'python');
    assert.ok(result.frameworks.includes('django'));
  });

  it('detects Go project from go.mod', () => {
    fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module example.com/myapp\n\ngo 1.21\n');
    const result = detectStack(tmpDir);
    assert.equal(result.runtime, 'go');
    assert.equal(result.category, 'backend');
  });

  it('detects Rust project from Cargo.toml', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'Cargo.toml'),
      '[package]\nname = "myapp"\nversion = "0.1.0"\n',
    );
    const result = detectStack(tmpDir);
    assert.equal(result.runtime, 'rust');
    assert.equal(result.category, 'backend');
  });

  it('returns unknown for empty directory', () => {
    const result = detectStack(tmpDir);
    assert.equal(result.runtime, 'unknown');
    assert.deepEqual(result.frameworks, []);
    assert.equal(result.category, 'unknown');
  });

  it('detects TypeScript usage', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ devDependencies: { typescript: '^5.0.0' } }),
    );
    const result = detectStack(tmpDir);
    assert.equal(result.language, 'typescript');
  });

  it('detects Vue.js frontend project', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ dependencies: { vue: '^3.0.0' } }),
    );
    const result = detectStack(tmpDir);
    assert.ok(result.frameworks.includes('vue'));
    assert.equal(result.category, 'frontend');
  });
});
