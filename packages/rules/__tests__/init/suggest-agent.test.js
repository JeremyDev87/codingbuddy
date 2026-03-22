const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { suggestAgent } = require('../../lib/init/suggest-agent');

describe('suggestAgent', () => {
  it('suggests frontend-developer for React projects', () => {
    const result = suggestAgent({ runtime: 'node', category: 'frontend', frameworks: ['react'] });
    assert.equal(result, 'frontend-developer');
  });

  it('suggests frontend-developer for Vue projects', () => {
    const result = suggestAgent({ runtime: 'node', category: 'frontend', frameworks: ['vue'] });
    assert.equal(result, 'frontend-developer');
  });

  it('suggests software-engineer for Next.js fullstack', () => {
    const result = suggestAgent({ runtime: 'node', category: 'fullstack', frameworks: ['next', 'react'] });
    assert.equal(result, 'software-engineer');
  });

  it('suggests backend-developer for NestJS', () => {
    const result = suggestAgent({ runtime: 'node', category: 'backend', frameworks: ['nestjs'] });
    assert.equal(result, 'backend-developer');
  });

  it('suggests backend-developer for Python', () => {
    const result = suggestAgent({ runtime: 'python', category: 'backend', frameworks: ['django'] });
    assert.equal(result, 'backend-developer');
  });

  it('suggests backend-developer for Go', () => {
    const result = suggestAgent({ runtime: 'go', category: 'backend', frameworks: [] });
    assert.equal(result, 'backend-developer');
  });

  it('suggests systems-developer for Rust', () => {
    const result = suggestAgent({ runtime: 'rust', category: 'backend', frameworks: [] });
    assert.equal(result, 'systems-developer');
  });

  it('suggests mobile-developer for React Native', () => {
    const result = suggestAgent({ runtime: 'node', category: 'mobile', frameworks: ['react-native'] });
    assert.equal(result, 'mobile-developer');
  });

  it('suggests software-engineer for unknown stack', () => {
    const result = suggestAgent({ runtime: 'unknown', category: 'unknown', frameworks: [] });
    assert.equal(result, 'software-engineer');
  });

  it('suggests data-scientist for Python with jupyter/pandas', () => {
    const result = suggestAgent({ runtime: 'python', category: 'backend', frameworks: ['pandas'] });
    assert.equal(result, 'data-scientist');
  });
});
