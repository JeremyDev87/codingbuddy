import { describe, it, expect } from 'vitest';
import { createJsonResponse, createErrorResponse, type ToolResponse } from './response.utils';

describe('response.utils', () => {
  describe('createJsonResponse', () => {
    it('should return ToolResponse with JSON-serialized content', () => {
      const data = { key: 'value' };
      const result = createJsonResponse(data);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('{"key":"value"}');
    });

    it('should use compact JSON format (no pretty-print)', () => {
      const data = { nested: { key: 'value' } };
      const result = createJsonResponse(data);

      // Should not contain newlines or indentation
      expect(result.content[0].text).not.toContain('\n');
      expect(result.content[0].text).not.toContain('  ');
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      const result = createJsonResponse(data);

      expect(result.content[0].text).toBe('[1,2,3]');
    });

    it('should handle null', () => {
      const result = createJsonResponse(null);

      expect(result.content[0].text).toBe('null');
    });

    it('should handle complex nested objects', () => {
      const data = {
        mode: 'PLAN',
        rules: [{ name: 'rule1', content: 'content1' }],
        nested: { deep: { value: true } },
      };
      const result = createJsonResponse(data);

      // Parse back to verify it's valid JSON
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(data);
    });

    it('should match ToolResponse interface', () => {
      const result: ToolResponse = createJsonResponse({ test: true });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeUndefined();
    });

    it('should handle Korean characters correctly', () => {
      const data = { message: '한글 테스트' };
      const result = createJsonResponse(data);

      expect(result.content[0].text).toBe('{"message":"한글 테스트"}');
    });
  });

  describe('createErrorResponse', () => {
    it('should return ToolResponse with isError flag', () => {
      const result = createErrorResponse('Something went wrong');

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Something went wrong');
    });

    it('should match ToolResponse interface', () => {
      const result: ToolResponse = createErrorResponse('Error');

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError');
    });

    it('should handle empty message', () => {
      const result = createErrorResponse('');

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('');
    });

    it('should handle Korean error messages', () => {
      const result = createErrorResponse('에러가 발생했습니다');

      expect(result.content[0].text).toBe('에러가 발생했습니다');
    });
  });
});
