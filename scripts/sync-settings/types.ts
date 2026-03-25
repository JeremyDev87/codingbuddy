/**
 * Sync-settings types — shared interfaces for reading .ai-rules
 * and generating tool-specific configuration files.
 */

/** Minimal agent metadata extracted from an agent JSON file. */
export interface AgentInfo {
  /** File-stem name, e.g. "frontend-developer" */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** One-line description */
  description: string;
  /** Expertise tags */
  expertise: string[];
}

/** Metadata for a single rule markdown file. */
export interface RuleInfo {
  /** File-stem name, e.g. "core" */
  name: string;
  /** Relative path from project root, e.g. "packages/rules/.ai-rules/rules/core.md" */
  relativePath: string;
}

/** Aggregated data read from .ai-rules — the input to every generator. */
export interface SourceData {
  agents: AgentInfo[];
  rules: RuleInfo[];
}

/** A single file to be written by the sync orchestrator. */
export interface GeneratedFile {
  /** Relative path from project root, e.g. ".cursor/rules/auto-agent.mdc" */
  relativePath: string;
  /** Full file content */
  content: string;
}

/** Supported tool identifiers. */
export type ToolName = 'cursor' | 'claude' | 'antigravity' | 'codex' | 'q' | 'kiro';
