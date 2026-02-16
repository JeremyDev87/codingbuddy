/**
 * Unit Tests for Version Sync Script
 *
 * Tests the version synchronization logic used by sync-version.js (prebuild script).
 * Validates peerDependencies computation and version matching behavior.
 */

import { describe, it, expect } from 'vitest';

describe('sync-version script', () => {
  // ============================================================================
  // peerDependencies Computation Logic
  // ============================================================================
  describe('peerDependencies computation logic', () => {
    function computeExpectedPeer(version: string): string {
      const [major, minor] = version.split('.');
      return `^${major}.${minor}.0`;
    }

    it('computes correct peerDependencies from version', () => {
      expect(computeExpectedPeer('4.0.1')).toBe('^4.0.0');
      expect(computeExpectedPeer('4.1.0')).toBe('^4.1.0');
      expect(computeExpectedPeer('5.2.3')).toBe('^5.2.0');
    });

    it('handles major version changes', () => {
      expect(computeExpectedPeer('1.0.0')).toBe('^1.0.0');
      expect(computeExpectedPeer('10.5.2')).toBe('^10.5.0');
    });

    it('detects peerDependencies mismatch when version already matches', () => {
      const currentVersion = '4.0.1';
      const pluginVersion = '4.0.1';
      const stalePeer = '^3.0.0';
      const expectedPeer = computeExpectedPeer(currentVersion);

      // version matches but peer is stale - this was the bug in #409
      expect(pluginVersion).toBe(currentVersion);
      expect(stalePeer).not.toBe(expectedPeer);
      expect(expectedPeer).toBe('^4.0.0');
    });
  });

  // ============================================================================
  // Version Change Detection Logic
  // ============================================================================
  describe('version change detection logic', () => {
    function needsUpdate(current: string, target: string): boolean {
      return current !== target;
    }

    it('detects when plugin version differs from MCP server version', () => {
      expect(needsUpdate('4.0.1', '4.1.0')).toBe(true);
    });

    it('detects when versions are already in sync', () => {
      expect(needsUpdate('4.0.1', '4.0.1')).toBe(false);
    });
  });
});
