/**
 * Diff Analyzer
 *
 * Analyzes git diff file lists to provide secondary agent recommendation signals.
 * File extension/path patterns map to agent score adjustments.
 *
 * This is a SECONDARY signal — intent patterns from user prompts remain primary.
 * Diff analysis helps when the prompt alone doesn't reveal the work domain.
 *
 * @example
 * // Staged changes include .test.ts files → test-engineer boost
 * const files = await getDiffFiles();
 * const analysis = analyzeDiffFiles(files);
 * // analysis.topAgent?.agent === 'test-engineer'
 */

import { execFile } from 'child_process';
import { Logger } from '@nestjs/common';

const logger = new Logger('DiffAnalyzer');

/**
 * A file pattern that maps to an agent with a weight.
 */
export interface DiffFilePattern {
  readonly pattern: RegExp;
  readonly agent: string;
  readonly weight: number;
}

/**
 * Score for a specific agent based on diff file analysis.
 */
export interface DiffAgentScore {
  agent: string;
  score: number;
  matchedFiles: string[];
  reason: string;
}

/**
 * Result of analyzing diff files for agent recommendation.
 */
export interface DiffAnalysisResult {
  files: string[];
  scores: DiffAgentScore[];
  topAgent: DiffAgentScore | null;
}

/**
 * File patterns mapped to agent recommendations.
 *
 * Patterns are checked against each changed file path.
 * Weight determines how strongly the pattern influences the score (0-1).
 * Higher weights for more specific patterns (e.g., .prisma → data-engineer).
 *
 * NOTE: Order does not matter — all patterns are checked for every file.
 * The agent with the highest cumulative score wins.
 */
export const DIFF_FILE_PATTERNS: ReadonlyArray<DiffFilePattern> = [
  // Test files → test-engineer
  { pattern: /\.(test|spec)\.(ts|tsx|js|jsx)$/i, agent: 'test-engineer', weight: 0.8 },
  { pattern: /__tests__\//i, agent: 'test-engineer', weight: 0.7 },
  { pattern: /\.test\.(py|rb|go|java)$/i, agent: 'test-engineer', weight: 0.8 },

  // DevOps / CI files → devops-engineer
  { pattern: /Dockerfile/i, agent: 'devops-engineer', weight: 0.9 },
  { pattern: /docker-compose/i, agent: 'devops-engineer', weight: 0.9 },
  { pattern: /\.github\//i, agent: 'devops-engineer', weight: 0.85 },
  { pattern: /\.gitlab-ci/i, agent: 'devops-engineer', weight: 0.85 },
  { pattern: /Jenkinsfile/i, agent: 'devops-engineer', weight: 0.85 },
  { pattern: /\.circleci\//i, agent: 'devops-engineer', weight: 0.85 },

  // Frontend files → frontend-developer
  { pattern: /\.css$/i, agent: 'frontend-developer', weight: 0.8 },
  { pattern: /\.scss$/i, agent: 'frontend-developer', weight: 0.8 },
  { pattern: /\.less$/i, agent: 'frontend-developer', weight: 0.8 },
  { pattern: /\.tsx$/i, agent: 'frontend-developer', weight: 0.6 },
  { pattern: /\.jsx$/i, agent: 'frontend-developer', weight: 0.6 },
  { pattern: /\.vue$/i, agent: 'frontend-developer', weight: 0.8 },
  { pattern: /\.svelte$/i, agent: 'frontend-developer', weight: 0.8 },

  // Backend / Python files → backend-developer
  { pattern: /\.py$/i, agent: 'backend-developer', weight: 0.6 },
  { pattern: /\.go$/i, agent: 'backend-developer', weight: 0.7 },
  { pattern: /\.java$/i, agent: 'backend-developer', weight: 0.7 },
  { pattern: /\.rb$/i, agent: 'backend-developer', weight: 0.7 },

  // Platform / IaC files → platform-engineer
  { pattern: /\.tf$/i, agent: 'platform-engineer', weight: 0.9 },
  { pattern: /\.tfvars$/i, agent: 'platform-engineer', weight: 0.9 },
  { pattern: /Chart\.yaml$/i, agent: 'platform-engineer', weight: 0.9 },
  { pattern: /kustomization\.ya?ml$/i, agent: 'platform-engineer', weight: 0.9 },
  { pattern: /Pulumi\.ya?ml$/i, agent: 'platform-engineer', weight: 0.9 },

  // Data files → data-engineer
  { pattern: /\.sql$/i, agent: 'data-engineer', weight: 0.85 },
  { pattern: /schema\.prisma$/i, agent: 'data-engineer', weight: 0.9 },
  { pattern: /migrations?\//i, agent: 'data-engineer', weight: 0.8 },
  { pattern: /\.entity\.ts$/i, agent: 'data-engineer', weight: 0.8 },

  // Agent files → agent-architect
  { pattern: /agents?\/.*\.json$/i, agent: 'agent-architect', weight: 0.85 },
  { pattern: /\.ai-rules\//i, agent: 'agent-architect', weight: 0.7 },

  // Systems files → systems-developer
  { pattern: /\.rs$/i, agent: 'systems-developer', weight: 0.9 },
  { pattern: /\.c$/i, agent: 'systems-developer', weight: 0.8 },
  { pattern: /\.cpp$/i, agent: 'systems-developer', weight: 0.8 },
  { pattern: /\.h$/i, agent: 'systems-developer', weight: 0.7 },
  { pattern: /Cargo\.toml$/i, agent: 'systems-developer', weight: 0.9 },

  // Mobile files → mobile-developer
  { pattern: /\.swift$/i, agent: 'mobile-developer', weight: 0.9 },
  { pattern: /\.kt$/i, agent: 'mobile-developer', weight: 0.85 },
  { pattern: /\.dart$/i, agent: 'mobile-developer', weight: 0.9 },
  { pattern: /Podfile$/i, agent: 'mobile-developer', weight: 0.85 },
  { pattern: /AndroidManifest\.xml$/i, agent: 'mobile-developer', weight: 0.9 },

  // Security files → security-engineer
  { pattern: /\.pem$/i, agent: 'security-engineer', weight: 0.8 },
  { pattern: /auth\//i, agent: 'security-engineer', weight: 0.6 },
  { pattern: /security\//i, agent: 'security-engineer', weight: 0.7 },

  // Tooling files → tooling-engineer
  { pattern: /webpack\.config/i, agent: 'tooling-engineer', weight: 0.9 },
  { pattern: /vite\.config/i, agent: 'tooling-engineer', weight: 0.9 },
  { pattern: /\.eslintrc/i, agent: 'tooling-engineer', weight: 0.85 },
  { pattern: /tsconfig/i, agent: 'tooling-engineer', weight: 0.8 },
  { pattern: /rollup\.config/i, agent: 'tooling-engineer', weight: 0.9 },
];

/**
 * Analyze a list of changed file paths and produce agent scores.
 *
 * Each file is matched against all patterns. Matching weights are accumulated
 * per agent, then normalized by total file count to produce a 0-1 score.
 * The agent with the highest score becomes `topAgent`.
 *
 * @param files - List of changed file paths (from git diff)
 * @returns Analysis result with scores sorted descending and topAgent
 */
export function analyzeDiffFiles(files: string[]): DiffAnalysisResult {
  if (files.length === 0) {
    return { files: [], scores: [], topAgent: null };
  }

  // Accumulate scores per agent
  const agentAccumulator = new Map<
    string,
    { totalWeight: number; matchedFiles: string[] }
  >();

  for (const file of files) {
    for (const { pattern, agent, weight } of DIFF_FILE_PATTERNS) {
      if (pattern.test(file)) {
        const existing = agentAccumulator.get(agent) ?? {
          totalWeight: 0,
          matchedFiles: [],
        };
        existing.totalWeight += weight;
        if (!existing.matchedFiles.includes(file)) {
          existing.matchedFiles.push(file);
        }
        agentAccumulator.set(agent, existing);
      }
    }
  }

  // Convert to scores (normalized by file count)
  const scores: DiffAgentScore[] = [];
  for (const [agent, data] of agentAccumulator) {
    const score = data.totalWeight / files.length;
    const fileCount = data.matchedFiles.length;
    scores.push({
      agent,
      score: Math.min(score, 1), // Cap at 1.0
      matchedFiles: data.matchedFiles,
      reason: `${fileCount} changed file${fileCount > 1 ? 's' : ''} match ${agent} patterns`,
    });
  }

  // Sort descending by score
  scores.sort((a, b) => b.score - a.score);

  return {
    files,
    scores,
    topAgent: scores.length > 0 ? scores[0] : null,
  };
}

/**
 * Get changed file paths from git diff.
 *
 * Checks staged files first (--cached). If none, falls back to unstaged changes.
 * Returns empty array on any error (no git, no repo, etc.).
 *
 * @param cwd - Working directory (defaults to process.cwd())
 * @returns Array of changed file paths
 */
export async function getDiffFiles(cwd?: string): Promise<string[]> {
  const workDir = cwd ?? process.cwd();

  try {
    // Try staged files first
    const staged = await execGitDiff(['diff', '--cached', '--name-only'], workDir);
    if (staged.length > 0) {
      return staged;
    }

    // Fall back to unstaged changes
    return await execGitDiff(['diff', '--name-only'], workDir);
  } catch (error) {
    logger.debug(
      `Failed to get diff files: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return [];
  }
}

/**
 * Execute git command and parse output into file list.
 */
function execGitDiff(args: string[], cwd: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, timeout: 5000 }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const files = stdout
        .trim()
        .split('\n')
        .filter((line) => line.length > 0);
      resolve(files);
    });
  });
}
