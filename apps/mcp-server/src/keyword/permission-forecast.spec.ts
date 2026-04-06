import { describe, it, expect } from 'vitest';
import { generatePermissionForecast } from './permission-forecast';
import type { PermissionClass } from './keyword.types';

describe('generatePermissionForecast', () => {
  // ── Mode base classes ──────────────────────────────────────────

  describe('mode base permission classes', () => {
    it('PLAN mode → read-only only', () => {
      const forecast = generatePermissionForecast('PLAN', 'design auth feature');
      expect(forecast.permissionClasses).toEqual(['read-only']);
    });

    it('ACT mode → read-only + repo-write', () => {
      const forecast = generatePermissionForecast('ACT', 'implement login');
      expect(forecast.permissionClasses).toContain('read-only');
      expect(forecast.permissionClasses).toContain('repo-write');
    });

    it('EVAL mode → read-only only (no prompt signals)', () => {
      const forecast = generatePermissionForecast('EVAL', 'check code quality');
      expect(forecast.permissionClasses).toEqual(['read-only']);
    });

    it('AUTO mode → read-only + repo-write + external', () => {
      const forecast = generatePermissionForecast('AUTO', 'add login feature');
      expect(forecast.permissionClasses).toContain('read-only');
      expect(forecast.permissionClasses).toContain('repo-write');
      expect(forecast.permissionClasses).toContain('external');
    });
  });

  // ── Prompt-signal enrichment ───────────────────────────────────

  describe('prompt-signal enrichment', () => {
    it('ship-related prompt adds repo-write + external and Ship bundle', () => {
      const forecast = generatePermissionForecast('ACT', 'ship the changes to GitHub');
      expect(forecast.permissionClasses).toContain('repo-write');
      expect(forecast.permissionClasses).toContain('external');
      const ship = forecast.approvalBundles.find(b => b.name === 'Ship changes');
      expect(ship).toBeDefined();
      expect(ship!.actions).toContain('git push');
      expect(ship!.actions).toContain('gh pr create');
    });

    it('test-related prompt adds Run checks bundle', () => {
      const forecast = generatePermissionForecast('ACT', 'run tests and lint');
      const checks = forecast.approvalBundles.find(b => b.name === 'Run checks');
      expect(checks).toBeDefined();
      expect(checks!.actions).toContain('yarn test');
    });

    it('install-related prompt adds network class and Install bundle', () => {
      const forecast = generatePermissionForecast('ACT', 'install lodash package');
      expect(forecast.permissionClasses).toContain('network');
      const install = forecast.approvalBundles.find(b => b.name === 'Install dependencies');
      expect(install).toBeDefined();
    });

    it('delete-related prompt adds destructive class', () => {
      const forecast = generatePermissionForecast('ACT', 'delete the old migration files');
      expect(forecast.permissionClasses).toContain('destructive');
    });

    it('review prompt in EVAL mode adds external class and Review bundle', () => {
      const forecast = generatePermissionForecast('EVAL', 'review PR 1234');
      expect(forecast.permissionClasses).toContain('external');
      const review = forecast.approvalBundles.find(b => b.name === 'Review PR');
      expect(review).toBeDefined();
      expect(review!.actions).toContain('gh pr review');
    });

    it('review prompt in ACT mode does NOT add Review bundle', () => {
      const forecast = generatePermissionForecast('ACT', 'review the code');
      const review = forecast.approvalBundles.find(b => b.name === 'Review PR');
      expect(review).toBeUndefined();
    });
  });

  // ── Implicit bundles ───────────────────────────────────────────

  describe('implicit bundles', () => {
    it('ACT mode with no signal patterns → Code changes bundle', () => {
      const forecast = generatePermissionForecast('ACT', 'implement user dashboard');
      const codeChanges = forecast.approvalBundles.find(b => b.name === 'Code changes');
      expect(codeChanges).toBeDefined();
      expect(codeChanges!.permissionClass).toBe('repo-write');
    });

    it('ACT mode with explicit ship signal → no Code changes bundle (has Ship instead)', () => {
      const forecast = generatePermissionForecast('ACT', 'ship the feature');
      const codeChanges = forecast.approvalBundles.find(b => b.name === 'Code changes');
      expect(codeChanges).toBeUndefined();
    });
  });

  // ── Permission summary ─────────────────────────────────────────

  describe('permissionSummary', () => {
    it('is a human-readable string', () => {
      const forecast = generatePermissionForecast('PLAN', 'design API');
      expect(typeof forecast.permissionSummary).toBe('string');
      expect(forecast.permissionSummary.length).toBeGreaterThan(0);
    });

    it('includes mode name', () => {
      const forecast = generatePermissionForecast('PLAN', 'design API');
      expect(forecast.permissionSummary).toContain('PLAN');
    });

    it('includes highest permission class', () => {
      const forecast = generatePermissionForecast('ACT', 'ship to GitHub');
      expect(forecast.permissionSummary).toContain('external');
    });

    it('includes bundle names when bundles present', () => {
      const forecast = generatePermissionForecast('ACT', 'ship and run tests');
      expect(forecast.permissionSummary).toContain('Ship changes');
      expect(forecast.permissionSummary).toContain('Run checks');
    });

    it('no bundle names when no bundles', () => {
      const forecast = generatePermissionForecast('PLAN', 'design API');
      expect(forecast.permissionSummary).not.toContain('—');
    });
  });

  // ── Permission class ordering ──────────────────────────────────

  describe('class ordering', () => {
    it('returns classes in canonical order: read-only < repo-write < network < destructive < external', () => {
      const forecast = generatePermissionForecast(
        'ACT',
        'delete files, install packages, and ship',
      );
      const expected: PermissionClass[] = [
        'read-only',
        'repo-write',
        'network',
        'destructive',
        'external',
      ];
      expect(forecast.permissionClasses).toEqual(expected);
    });
  });
});
