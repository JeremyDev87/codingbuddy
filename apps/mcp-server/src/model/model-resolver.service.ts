import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';
import { RulesService } from '../rules/rules.service';
import { resolveModel } from './model.resolver';
import { isModelConfig } from './model.types';
import type { ModelConfig, ResolvedModel } from './model.types';

/**
 * Service for resolving AI models based on context.
 * Encapsulates the loading of model configurations from various sources
 * and delegates to the resolveModel pure function for priority resolution.
 */
@Injectable()
export class ModelResolverService {
  private readonly logger = new Logger(ModelResolverService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly rulesService: RulesService,
  ) {}

  /**
   * Resolve AI model for a given mode agent.
   * Uses 4-level priority: agent > mode > global > system
   *
   * @param modeAgentName - Optional mode agent name to load model config from
   * @returns Resolved model with source information
   */
  async resolveForMode(modeAgentName?: string): Promise<ResolvedModel> {
    const globalDefaultModel = await this.loadGlobalDefaultModel();
    const modeModel = await this.loadModeModel(modeAgentName);
    return resolveModel({ modeModel, globalDefaultModel });
  }

  /**
   * Resolve AI model for a specific agent.
   * Uses 4-level priority: agent > mode > global > system
   *
   * @param agentModel - Optional agent model configuration
   * @returns Resolved model with source information
   */
  async resolveForAgent(agentModel?: ModelConfig): Promise<ResolvedModel> {
    const globalDefaultModel = await this.loadGlobalDefaultModel();
    return resolveModel({ agentModel, globalDefaultModel });
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

  /**
   * Load mode-specific model from agent configuration.
   */
  private async loadModeModel(
    agentName?: string,
  ): Promise<ModelConfig | undefined> {
    if (!agentName) return undefined;

    try {
      const modeAgent = await this.rulesService.getAgent(agentName);
      return isModelConfig(modeAgent.model) ? modeAgent.model : undefined;
    } catch (error) {
      this.logger.warn(
        `Failed to load mode agent '${agentName}' for model resolution: ${error instanceof Error ? error.message : 'Unknown error'}. Using fallback.`,
      );
      return undefined;
    }
  }
}
