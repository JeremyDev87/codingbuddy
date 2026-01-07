import { Logger, Module } from '@nestjs/common';
import { CodingBuddyConfigModule as AppConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { RulesModule } from '../rules/rules.module';
import { RulesService } from '../rules/rules.service';
import { normalizeAgentName } from '../shared/agent.utils';
import { KeywordService } from './keyword.service';
import { PrimaryAgentResolver } from './primary-agent-resolver';
import type { KeywordModesConfig } from './keyword.types';

export const KEYWORD_SERVICE = 'KEYWORD_SERVICE';

@Module({
  imports: [RulesModule, AppConfigModule],
  providers: [
    {
      provide: KEYWORD_SERVICE,
      useFactory: (
        rulesService: RulesService,
        configService: ConfigService,
      ) => {
        const logger = new Logger('KeywordModule');

        const loadConfig = async (): Promise<KeywordModesConfig> => {
          const content =
            await rulesService.getRuleContent('keyword-modes.json');
          return JSON.parse(content) as KeywordModesConfig;
        };

        const loadRule = async (path: string): Promise<string> => {
          return rulesService.getRuleContent(path);
        };

        const loadAgent = async (agentName: string): Promise<unknown> => {
          return rulesService.getAgent(agentName);
        };

        // Get primaryAgent from project config
        const getProjectConfig = async () => {
          try {
            const settings = await configService.getSettings();
            if (settings.ai?.primaryAgent) {
              return { primaryAgent: settings.ai.primaryAgent };
            }
            return null;
          } catch (error) {
            logger.debug(
              `Failed to load project config: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            return null;
          }
        };

        const listPrimaryAgents = async (): Promise<string[]> => {
          const agentNames = await rulesService.listAgents();
          const primaryAgents: string[] = [];

          for (const name of agentNames) {
            try {
              const agent = await rulesService.getAgent(name);
              const role = agent.role as { type?: string } | undefined;
              if (role?.type === 'primary') {
                primaryAgents.push(normalizeAgentName(agent.name));
              }
            } catch {
              // Skip agents that fail to load
            }
          }

          return primaryAgents;
        };

        const primaryAgentResolver = new PrimaryAgentResolver(
          getProjectConfig,
          listPrimaryAgents,
        );

        const loadAutoConfig = async () => {
          try {
            const settings = await configService.getSettings();
            return settings.auto ?? null;
          } catch (error) {
            logger.debug(
              `Failed to load AUTO config: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            return null;
          }
        };

        return new KeywordService(
          loadConfig,
          loadRule,
          loadAgent,
          primaryAgentResolver,
          loadAutoConfig,
        );
      },
      inject: [RulesService, ConfigService],
    },
  ],
  exports: [KEYWORD_SERVICE],
})
export class KeywordModule {}
