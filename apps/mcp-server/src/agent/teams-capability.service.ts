import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import type { TeamsCapabilityStatus } from './teams-capability.types';

/**
 * Single source of truth for Teams coordination capability.
 *
 * Resolution order:
 *   1. Environment variable `CODINGBUDDY_TEAMS_ENABLED` (explicit override)
 *   2. Config flag `experimental.teamsCoordination` in codingbuddy.config.json
 *   3. Default: disabled
 */
@Injectable()
export class TeamsCapabilityService {
  private readonly logger = new Logger(TeamsCapabilityService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Check whether Teams coordination is available at runtime.
   * Returns a status object suitable for debugging and handler decisions.
   */
  async getStatus(): Promise<TeamsCapabilityStatus> {
    // 1. Environment variable override (highest priority)
    const envValue = this.readEnvFlag();
    if (envValue !== undefined) {
      const status: TeamsCapabilityStatus = {
        available: envValue,
        reason: envValue
          ? 'Enabled via CODINGBUDDY_TEAMS_ENABLED environment variable'
          : 'Disabled via CODINGBUDDY_TEAMS_ENABLED environment variable',
        source: 'environment',
      };
      this.logger.debug(`Teams capability: ${status.reason}`);
      return status;
    }

    // 2. Config flag
    const configValue = await this.readConfigFlag();
    if (configValue !== undefined) {
      const status: TeamsCapabilityStatus = {
        available: configValue,
        reason: configValue
          ? 'Enabled via experimental.teamsCoordination config'
          : 'Disabled via experimental.teamsCoordination config',
        source: 'config',
      };
      this.logger.debug(`Teams capability: ${status.reason}`);
      return status;
    }

    // 3. Default: disabled
    const status: TeamsCapabilityStatus = {
      available: false,
      reason: 'Teams coordination is experimental and disabled by default',
      source: 'default',
    };
    this.logger.debug(`Teams capability: ${status.reason}`);
    return status;
  }

  /**
   * Convenience: returns true when Teams coordination is available.
   */
  async isAvailable(): Promise<boolean> {
    const status = await this.getStatus();
    return status.available;
  }

  /**
   * Read the CODINGBUDDY_TEAMS_ENABLED environment variable.
   * Returns undefined when not set, boolean when explicitly set.
   */
  readEnvFlag(): boolean | undefined {
    const raw = process.env.CODINGBUDDY_TEAMS_ENABLED;
    if (raw === undefined || raw === '') return undefined;
    return raw === 'true' || raw === '1';
  }

  /**
   * Read the experimental.teamsCoordination config flag.
   * Returns undefined when not set, boolean when explicitly set.
   */
  private async readConfigFlag(): Promise<boolean | undefined> {
    const settings = await this.configService.getSettings();
    return settings.experimental?.teamsCoordination ?? undefined;
  }
}
