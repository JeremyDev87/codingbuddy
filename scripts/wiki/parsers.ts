/**
 * Wiki generation parsers — pure functions for extracting
 * architecture, API, and decision data from source files.
 */

export interface ToolInfo {
  name: string;
  description: string;
}

export interface DecisionEntry {
  mode: string;
  timestamp: string;
  decision: string;
}

/**
 * Extract relative import paths from TypeScript source code.
 * Ignores external package imports (non-relative paths).
 */
export function parseImports(source: string): string[] {
  const results: string[] = [];
  // Match static imports: import ... from './...' or import ... from '../...'
  const staticImportRe = /import\s+.*?\s+from\s+['"](\.[^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = staticImportRe.exec(source)) !== null) {
    results.push(match[1]);
  }
  // Match dynamic imports: import('./...')
  const dynamicImportRe = /import\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  while ((match = dynamicImportRe.exec(source)) !== null) {
    results.push(match[1]);
  }
  return results;
}

/**
 * Extract tool name and description from MCP handler source code.
 */
export function parseToolDefinitions(source: string): ToolInfo[] {
  const results: ToolInfo[] = [];

  // Find getToolDefinitions return block
  const toolDefsMatch = source.match(
    /getToolDefinitions\(\)[^{]*\{[\s\S]*?return\s*\[([\s\S]*?)\];/,
  );
  if (!toolDefsMatch) return results;

  const block = toolDefsMatch[1];

  // Match name immediately followed by description (single or template literal)
  const pairRe = /name:\s*['"]([^'"]+)['"],\s*\n\s*description:\s*(?:['"]([^'"]+)['"]|`([^`]*)`)/g;
  let m: RegExpExecArray | null;
  while ((m = pairRe.exec(block)) !== null) {
    const desc = (m[2] ?? m[3] ?? '')
      .replace(/\$\{[^}]+\}/g, '') // strip unresolved template variables
      .split('\n')[0]
      .trim();
    results.push({ name: m[1], description: desc });
  }
  return results;
}

/**
 * Extract decisions from context.md markdown content.
 */
export function parseContextDecisions(content: string): DecisionEntry[] {
  const results: DecisionEntry[] = [];

  // Split into sections by ## headers like "## PLAN — 00:10"
  const sectionRe = /##\s+(PLAN|ACT|EVAL|AUTO)\s+.*?(\d{2}:\d{2})/g;
  const sections: Array<{ mode: string; timestamp: string; startIndex: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = sectionRe.exec(content)) !== null) {
    sections.push({
      mode: match[1],
      timestamp: match[2],
      startIndex: match.index,
    });
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextStart = i + 1 < sections.length ? sections[i + 1].startIndex : content.length;
    const sectionContent = content.slice(section.startIndex, nextStart);

    // Find **Decisions:** block and extract list items
    const decisionsMatch = sectionContent.match(
      /\*\*Decisions:\*\*\s*\n((?:\s*-\s+.+\n?)*)/,
    );
    if (decisionsMatch) {
      const items = decisionsMatch[1].match(/^\s*-\s+(.+)$/gm);
      if (items) {
        for (const item of items) {
          const text = item.replace(/^\s*-\s+/, '').trim();
          results.push({
            mode: section.mode,
            timestamp: section.timestamp,
            decision: text,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Build module-level dependency map from per-file import data.
 * Key: module name (top-level directory), Value: array of dependent module names.
 */
export function buildModuleDependencyMap(
  fileImports: Record<string, string[]>,
): Record<string, string[]> {
  const deps: Record<string, Set<string>> = {};

  for (const [filePath, imports] of Object.entries(fileImports)) {
    // Skip root-level files (not inside a module directory)
    if (!filePath.includes('/')) continue;
    const sourceModule = filePath.split('/')[0];
    if (!deps[sourceModule]) {
      deps[sourceModule] = new Set();
    }

    for (const imp of imports) {
      // Resolve the import path relative to the file's directory
      const fileDir = filePath.split('/').slice(0, -1).join('/');
      const parts = imp.split('/');
      const dirParts = fileDir.split('/');

      // Walk up with ../
      const resolved = [...dirParts];
      for (const part of parts) {
        if (part === '..') {
          resolved.pop();
        } else if (part !== '.') {
          resolved.push(part);
        }
      }

      const targetModule = resolved[0];
      if (targetModule && targetModule !== sourceModule) {
        deps[sourceModule].add(targetModule);
      }
    }
  }

  const result: Record<string, string[]> = {};
  for (const [mod, depSet] of Object.entries(deps)) {
    result[mod] = [...depSet].sort();
  }
  return result;
}
