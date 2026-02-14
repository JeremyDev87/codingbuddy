/**
 * Safely parse JSON from an MCP CallToolResult response.
 *
 * MCP tool responses follow the shape:
 *   { content: [{ type: 'text', text: '{"key":"value"}' }] }
 *
 * This utility extracts and parses the first text content item.
 * Returns null for any malformed, missing, or non-JSON input.
 */
export function parseToolResponseJson(
  result: unknown,
): Record<string, unknown> | null {
  if (!result || typeof result !== 'object') return null;

  const content = (result as Record<string, unknown>).content;
  if (!Array.isArray(content) || content.length === 0) return null;

  const textItem = content.find(
    (c: unknown) =>
      c &&
      typeof c === 'object' &&
      (c as Record<string, unknown>).type === 'text',
  ) as Record<string, unknown> | undefined;

  const text = textItem?.text;
  if (typeof text !== 'string' || text === '') return null;

  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}
