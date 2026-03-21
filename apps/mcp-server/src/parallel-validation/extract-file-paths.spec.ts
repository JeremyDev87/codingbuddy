import { describe, it, expect } from 'vitest';
import { extractFilePaths } from './extract-file-paths';

describe('extractFilePaths', () => {
  it('should return empty array for empty string', () => {
    expect(extractFilePaths('')).toEqual([]);
  });

  it('should extract paths from markdown code blocks', () => {
    const body = `
## Changes
\`\`\`yaml
apps/mcp-server/src/config/config.schema.ts
packages/rules/.ai-rules/agents/README.md
\`\`\`
    `;
    const result = extractFilePaths(body);
    expect(result).toContain('apps/mcp-server/src/config/config.schema.ts');
    expect(result).toContain('packages/rules/.ai-rules/agents/README.md');
  });

  it('should extract paths with common prefixes (packages/, src/, apps/, .claude/)', () => {
    const body = `
This issue modifies packages/rules/index.ts and src/main.ts.
Also touches .claude/settings.json and apps/mcp-server/src/mcp/mcp.module.ts.
    `;
    const result = extractFilePaths(body);
    expect(result).toContain('packages/rules/index.ts');
    expect(result).toContain('src/main.ts');
    expect(result).toContain('.claude/settings.json');
    expect(result).toContain('apps/mcp-server/src/mcp/mcp.module.ts');
  });

  it('should extract paths from "대상 파일" section', () => {
    const body = `
## 대상 파일
- apps/mcp-server/src/mcp/handlers/mode.handler.ts
- apps/mcp-server/src/keyword/keyword.service.ts
    `;
    const result = extractFilePaths(body);
    expect(result).toContain('apps/mcp-server/src/mcp/handlers/mode.handler.ts');
    expect(result).toContain('apps/mcp-server/src/keyword/keyword.service.ts');
  });

  it('should extract paths from "Target Files" section', () => {
    const body = `
## Target Files
- packages/rules/.ai-rules/rules/core.md
- .cursor/rules/custom-instructions.md
    `;
    const result = extractFilePaths(body);
    expect(result).toContain('packages/rules/.ai-rules/rules/core.md');
    expect(result).toContain('.cursor/rules/custom-instructions.md');
  });

  it('should deduplicate paths', () => {
    const body = `
Modify packages/rules/index.ts for the feature.
Also see packages/rules/index.ts for reference.
    `;
    const result = extractFilePaths(body);
    const count = result.filter(p => p === 'packages/rules/index.ts').length;
    expect(count).toBe(1);
  });

  it('should ignore URLs and non-file paths', () => {
    const body = `
See https://github.com/example/repo/blob/main/src/index.ts
and http://example.com/packages/foo for reference.
    `;
    const result = extractFilePaths(body);
    expect(result).toEqual([]);
  });

  it('should extract inline code paths', () => {
    const body = 'Modify `apps/mcp-server/src/main.ts` and `packages/rules/index.ts`';
    const result = extractFilePaths(body);
    expect(result).toContain('apps/mcp-server/src/main.ts');
    expect(result).toContain('packages/rules/index.ts');
  });

  it('should handle paths with various extensions', () => {
    const body = `
- apps/mcp-server/src/config.yaml
- packages/rules/.ai-rules/agents/architect.json
- .kiro/settings.toml
    `;
    const result = extractFilePaths(body);
    expect(result).toContain('apps/mcp-server/src/config.yaml');
    expect(result).toContain('packages/rules/.ai-rules/agents/architect.json');
    expect(result).toContain('.kiro/settings.toml');
  });
});
