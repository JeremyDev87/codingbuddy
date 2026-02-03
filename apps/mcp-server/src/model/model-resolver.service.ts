import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { resolveModel } from './model.resolver';
import type { ResolvedModel } from './model.types';

/**
 * Service for resolving AI models based on global configuration.
 * Uses 2-level priority: global config > system default.
 *
 * @since v4.0.0 - Agent/Mode model configs are no longer supported.
 *                 Use codingbuddy.config.js ai.defaultModel instead.
 */
@Injectable()
export class ModelResolverService {
  private readonly logger = new Logger(ModelResolverService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Resolve AI model from global configuration.
   * Uses 2-level priority: global config > system default.
   *
   * @returns Resolved model with source information
   */
  async resolve(): Promise<ResolvedModel> {
    const globalDefaultModel = await this.loadGlobalDefaultModel();
    return resolveModel({ globalDefaultModel });
  }

  /**
   * Load global default model from project configuration.
   */
  private async loadGlobalDefaultModel(): Promise<string | undefined> {
    try {
      const globalConfig = await this.configService.getSettings();
      return globalConfig?.ai?.defaultModel;
    } catch (error) {
      this.logger.warn(
        `Failed to load global config for model resolution: ${error instanceof Error ? error.message : 'Unknown error'}. Using system default.`,
      );
      return undefined;
    }
  }
}
