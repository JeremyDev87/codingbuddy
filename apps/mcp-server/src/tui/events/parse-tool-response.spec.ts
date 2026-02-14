import { describe, it, expect } from 'vitest';
import { parseToolResponseJson } from './parse-tool-response';

describe('parseToolResponseJson', () => {
  it('should parse valid JSON from text content', () => {
    const result = parseToolResponseJson({
      content: [{ type: 'text', text: '{"mode":"PLAN","agent":"test"}' }],
    });
    expect(result).toEqual({ mode: 'PLAN', agent: 'test' });
  });

  it('should return null for undefined result', () => {
    expect(parseToolResponseJson(undefined)).toBeNull();
  });

  it('should return null for null result', () => {
    expect(parseToolResponseJson(null)).toBeNull();
  });

  it('should return null for missing content array', () => {
    expect(parseToolResponseJson({})).toBeNull();
  });

  it('should return null for empty content array', () => {
    expect(parseToolResponseJson({ content: [] })).toBeNull();
  });

  it('should return null when no text type content exists', () => {
    expect(
      parseToolResponseJson({
        content: [{ type: 'image', text: '{}' }],
      }),
    ).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    expect(
      parseToolResponseJson({
        content: [{ type: 'text', text: 'not json' }],
      }),
    ).toBeNull();
  });

  it('should return null when text is empty string', () => {
    expect(
      parseToolResponseJson({
        content: [{ type: 'text', text: '' }],
      }),
    ).toBeNull();
  });

  it('should return null when text is undefined', () => {
    expect(
      parseToolResponseJson({
        content: [{ type: 'text' }],
      }),
    ).toBeNull();
  });

  it('should return null for JSON array response', () => {
    expect(
      parseToolResponseJson({
        content: [{ type: 'text', text: '[1,2,3]' }],
      }),
    ).toBeNull();
  });

  it('should return null for JSON primitive response', () => {
    expect(
      parseToolResponseJson({
        content: [{ type: 'text', text: '"hello"' }],
      }),
    ).toBeNull();
    expect(
      parseToolResponseJson({
        content: [{ type: 'text', text: '42' }],
      }),
    ).toBeNull();
  });

  it('should pick the first text content item', () => {
    const result = parseToolResponseJson({
      content: [
        { type: 'text', text: '{"first":true}' },
        { type: 'text', text: '{"second":true}' },
      ],
    });
    expect(result).toEqual({ first: true });
  });
});
