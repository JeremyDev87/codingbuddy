export type ClientType = 'claude-code' | 'cursor' | 'opencode' | 'unknown';

/**
 * Mapping table from keyword substring to ClientType.
 * Order matters: first match wins. Add new clients here.
 */
export const CLIENT_TYPE_MATCHERS: ReadonlyArray<{ keyword: string; clientType: ClientType }> = [
  { keyword: 'cursor', clientType: 'cursor' },
  { keyword: 'opencode', clientType: 'opencode' },
  { keyword: 'crush', clientType: 'opencode' },
  { keyword: 'claude', clientType: 'claude-code' },
];

/**
 * Resolve MCP client type from the clientInfo.name provided during initialization.
 *
 * @param clientName - The name field from MCP InitializeRequest clientInfo
 * @returns Resolved client type
 */
export function resolveClientType(clientName?: string): ClientType {
  if (!clientName) return 'unknown';
  const lower = clientName.toLowerCase();
  for (const { keyword, clientType } of CLIENT_TYPE_MATCHERS) {
    if (lower.includes(keyword)) return clientType;
  }
  return 'unknown';
}
