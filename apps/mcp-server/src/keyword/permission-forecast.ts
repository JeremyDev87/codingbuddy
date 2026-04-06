/**
 * Permission forecasting and approval bundling for parse_mode responses.
 *
 * Analyzes the current mode and task prompt to predict which permission
 * classes will be needed during execution, and groups related actions
 * into logical approval bundles so users understand upcoming interruptions.
 *
 * All functions in this module are **pure** — no I/O, no side effects.
 */

import type { ApprovalBundle, Mode, PermissionClass, PermissionForecast } from './keyword.types';

// ─── Prompt‑signal patterns ────────────────────────────────────────

const SHIP_PATTERNS = /\b(ship|deploy|push|pr\b|pull\s*request|merge|release)\b/i;

const TEST_PATTERNS = /\b(tests?|lint|typecheck|format|check|verify|coverage)\b/i;

const INSTALL_PATTERNS = /\b(install|add\s+package|add\s+dependency|yarn\s+add|npm\s+install)\b/i;

const DELETE_PATTERNS = /\b(delete|remove|drop|reset|clean|destroy)\b/i;

const REVIEW_PATTERNS = /\b(review|comment|approve|feedback|pr\b|pull\s*request)\b/i;

// ─── Pre-defined bundles ───────────────────────────────────────────

const SHIP_BUNDLE: ApprovalBundle = {
  name: 'Ship changes',
  actions: ['git add', 'git commit', 'git push', 'gh pr create'],
  permissionClass: 'external',
  reason: 'Committing, pushing, and creating a PR requires repo-write and GitHub API access',
};

const TEST_BUNDLE: ApprovalBundle = {
  name: 'Run checks',
  actions: ['yarn test', 'yarn lint', 'yarn typecheck'],
  permissionClass: 'read-only',
  reason: 'Running tests and linters reads the codebase but does not modify it',
};

const INSTALL_BUNDLE: ApprovalBundle = {
  name: 'Install dependencies',
  actions: ['yarn install', 'yarn add'],
  permissionClass: 'network',
  reason: 'Package installation fetches from external registries',
};

const REVIEW_BUNDLE: ApprovalBundle = {
  name: 'Review PR',
  actions: ['gh pr review', 'gh pr comment'],
  permissionClass: 'external',
  reason: 'Reviewing or commenting on a PR uses the GitHub API',
};

// ─── Base permission classes per mode ──────────────────────────────

const MODE_BASE_CLASSES: Record<Mode, PermissionClass[]> = {
  PLAN: ['read-only'],
  ACT: ['read-only', 'repo-write'],
  EVAL: ['read-only'],
  AUTO: ['read-only', 'repo-write', 'external'],
};

// ─── Public API ────────────────────────────────────────────────────

/**
 * Generate a permission forecast for the given mode and prompt.
 *
 * Pure function — safe to call from any context.
 */
export function generatePermissionForecast(mode: Mode, prompt: string): PermissionForecast {
  const classes = new Set<PermissionClass>(MODE_BASE_CLASSES[mode]);
  const bundles: ApprovalBundle[] = [];

  // Prompt-signal enrichment
  if (SHIP_PATTERNS.test(prompt)) {
    classes.add('repo-write');
    classes.add('external');
    bundles.push(SHIP_BUNDLE);
  }

  if (TEST_PATTERNS.test(prompt)) {
    bundles.push(TEST_BUNDLE);
  }

  if (INSTALL_PATTERNS.test(prompt)) {
    classes.add('network');
    bundles.push(INSTALL_BUNDLE);
  }

  if (DELETE_PATTERNS.test(prompt)) {
    classes.add('destructive');
  }

  if (REVIEW_PATTERNS.test(prompt) && mode === 'EVAL') {
    classes.add('external');
    bundles.push(REVIEW_BUNDLE);
  }

  // ACT mode always includes a "code changes" implicit bundle when no
  // explicit bundles matched
  if (mode === 'ACT' && bundles.length === 0) {
    bundles.push({
      name: 'Code changes',
      actions: ['file edit', 'git add', 'git commit'],
      permissionClass: 'repo-write',
      reason: 'Implementation involves editing files and creating commits',
    });
  }

  const permissionClasses = sortPermissionClasses([...classes]);

  return {
    permissionClasses,
    approvalBundles: bundles,
    permissionSummary: buildSummary(mode, permissionClasses, bundles),
  };
}

// ─── Helpers ───────────────────────────────────────────────────────

const CLASS_ORDER: PermissionClass[] = [
  'read-only',
  'repo-write',
  'network',
  'destructive',
  'external',
];

function sortPermissionClasses(classes: PermissionClass[]): PermissionClass[] {
  return [...classes].sort((a, b) => CLASS_ORDER.indexOf(a) - CLASS_ORDER.indexOf(b));
}

function buildSummary(mode: Mode, classes: PermissionClass[], bundles: ApprovalBundle[]): string {
  const highest = classes[classes.length - 1];
  const bundleNames = bundles.map(b => b.name).join(', ');

  if (bundles.length === 0) {
    return `${mode} mode requires ${highest} permissions`;
  }

  return `${mode} mode requires ${highest} permissions — expected actions: ${bundleNames}`;
}
