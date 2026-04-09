import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TeamsCapabilityService } from './teams-capability.service';
import type { ConfigService } from '../config/config.service';

function createMockConfigService(
  experimental?: { teamsCoordination?: boolean },
  clientName?: string,
): ConfigService {
  return {
    getSettings: vi.fn().mockResolvedValue({ experimental }),
    getClientName: vi.fn().mockReturnValue(clientName),
  } as unknown as ConfigService;
}

describe('TeamsCapabilityService', () => {
  let originalEnv: string | undefined;
  let originalClaudeCode: string | undefined;
  let originalClaudeEntrypoint: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.CODINGBUDDY_TEAMS_ENABLED;
    originalClaudeCode = process.env.CLAUDE_CODE;
    originalClaudeEntrypoint = process.env.CLAUDE_CODE_ENTRYPOINT;
    delete process.env.CODINGBUDDY_TEAMS_ENABLED;
    delete process.env.CLAUDE_CODE;
    delete process.env.CLAUDE_CODE_ENTRYPOINT;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CODINGBUDDY_TEAMS_ENABLED = originalEnv;
    } else {
      delete process.env.CODINGBUDDY_TEAMS_ENABLED;
    }
    if (originalClaudeCode !== undefined) {
      process.env.CLAUDE_CODE = originalClaudeCode;
    } else {
      delete process.env.CLAUDE_CODE;
    }
    if (originalClaudeEntrypoint !== undefined) {
      process.env.CLAUDE_CODE_ENTRYPOINT = originalClaudeEntrypoint;
    } else {
      delete process.env.CLAUDE_CODE_ENTRYPOINT;
    }
  });

  describe('getStatus', () => {
    describe('default (no config, no env)', () => {
      it('should be disabled by default', async () => {
        const service = new TeamsCapabilityService(createMockConfigService());
        const status = await service.getStatus();

        expect(status.available).toBe(false);
        expect(status.source).toBe('default');
        expect(status.reason).toContain('disabled by default');
      });
    });

    describe('config-based gating', () => {
      it('should enable when experimental.teamsCoordination is true', async () => {
        const service = new TeamsCapabilityService(
          createMockConfigService({ teamsCoordination: true }),
        );
        const status = await service.getStatus();

        expect(status.available).toBe(true);
        expect(status.source).toBe('config');
        expect(status.reason).toContain('Enabled via experimental.teamsCoordination');
      });

      it('should disable when experimental.teamsCoordination is false', async () => {
        const service = new TeamsCapabilityService(
          createMockConfigService({ teamsCoordination: false }),
        );
        const status = await service.getStatus();

        expect(status.available).toBe(false);
        expect(status.source).toBe('config');
        expect(status.reason).toContain('Disabled via experimental.teamsCoordination');
      });

      it('should fall through to default when experimental exists but teamsCoordination is undefined', async () => {
        const service = new TeamsCapabilityService(createMockConfigService({}));
        const status = await service.getStatus();

        expect(status.available).toBe(false);
        expect(status.source).toBe('default');
      });
    });

    describe('environment variable override', () => {
      it('should enable when CODINGBUDDY_TEAMS_ENABLED=true', async () => {
        process.env.CODINGBUDDY_TEAMS_ENABLED = 'true';
        const service = new TeamsCapabilityService(createMockConfigService());
        const status = await service.getStatus();

        expect(status.available).toBe(true);
        expect(status.source).toBe('environment');
        expect(status.reason).toContain('Enabled via CODINGBUDDY_TEAMS_ENABLED');
      });

      it('should enable when CODINGBUDDY_TEAMS_ENABLED=1', async () => {
        process.env.CODINGBUDDY_TEAMS_ENABLED = '1';
        const service = new TeamsCapabilityService(createMockConfigService());
        const status = await service.getStatus();

        expect(status.available).toBe(true);
        expect(status.source).toBe('environment');
      });

      it('should disable when CODINGBUDDY_TEAMS_ENABLED=false', async () => {
        process.env.CODINGBUDDY_TEAMS_ENABLED = 'false';
        const service = new TeamsCapabilityService(createMockConfigService());
        const status = await service.getStatus();

        expect(status.available).toBe(false);
        expect(status.source).toBe('environment');
        expect(status.reason).toContain('Disabled via CODINGBUDDY_TEAMS_ENABLED');
      });

      it('should take precedence over config when both are set', async () => {
        process.env.CODINGBUDDY_TEAMS_ENABLED = 'false';
        const service = new TeamsCapabilityService(
          createMockConfigService({ teamsCoordination: true }),
        );
        const status = await service.getStatus();

        expect(status.available).toBe(false);
        expect(status.source).toBe('environment');
      });
    });
  });

  describe('isAvailable', () => {
    it('should return true when enabled', async () => {
      const service = new TeamsCapabilityService(
        createMockConfigService({ teamsCoordination: true }),
      );
      expect(await service.isAvailable()).toBe(true);
    });

    it('should return false when disabled', async () => {
      const service = new TeamsCapabilityService(createMockConfigService());
      expect(await service.isAvailable()).toBe(false);
    });
  });

  describe('Claude Code auto-detection', () => {
    it('should auto-enable when CLAUDE_CODE=1 is set', async () => {
      process.env.CLAUDE_CODE = '1';
      const service = new TeamsCapabilityService(createMockConfigService());
      const status = await service.getStatus();

      expect(status.available).toBe(true);
      expect(status.source).toBe('claude-native');
      expect(status.reason).toContain('Claude Code');
    });

    it('should auto-enable when CLAUDE_CODE_ENTRYPOINT is set', async () => {
      process.env.CLAUDE_CODE_ENTRYPOINT = '/some/path';
      const service = new TeamsCapabilityService(createMockConfigService());
      const status = await service.getStatus();

      expect(status.available).toBe(true);
      expect(status.source).toBe('claude-native');
    });

    it('should auto-enable when clientName is claude-code', async () => {
      const service = new TeamsCapabilityService(createMockConfigService(undefined, 'claude-code'));
      const status = await service.getStatus();

      expect(status.available).toBe(true);
      expect(status.source).toBe('claude-native');
    });

    it('should not auto-enable for other clients', async () => {
      const service = new TeamsCapabilityService(createMockConfigService(undefined, 'cursor'));
      const status = await service.getStatus();

      expect(status.available).toBe(false);
      expect(status.source).toBe('default');
    });
  });

  describe('readEnvFlag', () => {
    it('should return undefined when env var is not set', () => {
      const service = new TeamsCapabilityService(createMockConfigService());
      expect(service.readEnvFlag()).toBeUndefined();
    });

    it('should return undefined when env var is empty string', () => {
      process.env.CODINGBUDDY_TEAMS_ENABLED = '';
      const service = new TeamsCapabilityService(createMockConfigService());
      expect(service.readEnvFlag()).toBeUndefined();
    });

    it('should return true for "true"', () => {
      process.env.CODINGBUDDY_TEAMS_ENABLED = 'true';
      const service = new TeamsCapabilityService(createMockConfigService());
      expect(service.readEnvFlag()).toBe(true);
    });

    it('should return true for "1"', () => {
      process.env.CODINGBUDDY_TEAMS_ENABLED = '1';
      const service = new TeamsCapabilityService(createMockConfigService());
      expect(service.readEnvFlag()).toBe(true);
    });

    it('should return false for any other value', () => {
      process.env.CODINGBUDDY_TEAMS_ENABLED = 'no';
      const service = new TeamsCapabilityService(createMockConfigService());
      expect(service.readEnvFlag()).toBe(false);
    });
  });

  describe('status object shape', () => {
    it('should have readonly-compatible properties', async () => {
      const service = new TeamsCapabilityService(createMockConfigService());
      const status = await service.getStatus();

      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('reason');
      expect(status).toHaveProperty('source');
      expect(typeof status.available).toBe('boolean');
      expect(typeof status.reason).toBe('string');
      expect(['config', 'environment', 'claude-native', 'default']).toContain(status.source);
    });
  });
});
