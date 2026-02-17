import { Logger, Module } from '@nestjs/common';
import { CodingBuddyConfigModule as AppConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { RulesModule } from '../rules/rules.module';
import { RulesService } from '../rules/rules.service';
import { SkillModule } from '../skill/skill.module';
import { SkillRecommendationService } from '../skill/skill-recommendation.service';
import { AgentModule } from '../agent/agent.module';
import { AgentService } from '../agent/agent.service';
import { normalizeAgentName } from '../shared/agent.utils';
import {
  KeywordService,
  type KeywordServiceOptions,
  type SkillRecommendationInfo,
  type SkillContentInfo,
  type AgentSystemPromptInfo,
} from './keyword.service';
import { PrimaryAgentResolver } from './primary-agent-resolver';
import type { KeywordModesConfig, Mode } from './keyword.types';

export const KEYWORD_SERVICE = 'KEYWORD_SERVICE';

@Module({
  imports: [RulesModule, AppConfigModule, SkillModule, AgentModule],
  providers: [
    {
      provide: KEYWORD_SERVICE,
      useFactory: (
        rulesService: RulesService,
        configService: ConfigService,
        skillRecommendationService: SkillRecommendationService,
        agentService: AgentService,
      ) => {
        const logger = new Logger('KeywordModule');

        const loadConfig = async (): Promise<KeywordModesConfig> => {
          const content = await rulesService.getRuleContent('keyword-modes.json');
          return JSON.parse(content) as KeywordModesConfig;
        };

        const loadRule = async (path: string): Promise<string> => {
          return rulesService.getRuleContent(path);
        };

        const loadAgent = async (agentName: string): Promise<unknown> => {
          return rulesService.getAgent(agentName);
        };

        // Get primaryAgent and excludeAgents from project config
        const getProjectConfig = async () => {
          try {
            const settings = await configService.getSettings();
            if (settings.ai?.primaryAgent || settings.ai?.excludeAgents) {
              return {
                primaryAgent: settings.ai.primaryAgent,
                excludeAgents: settings.ai.excludeAgents,
              };
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

        const primaryAgentResolver = new PrimaryAgentResolver(getProjectConfig, listPrimaryAgents);

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

        // NEW: Skill recommendation function for auto-inclusion
        const getSkillRecommendations = (prompt: string): SkillRecommendationInfo[] => {
          try {
            const result = skillRecommendationService.recommendSkills(prompt);
            return result.recommendations.map(rec => ({
              skillName: rec.skillName,
              confidence: rec.confidence,
              matchedPatterns: rec.matchedPatterns,
              description: rec.description,
            }));
          } catch (error) {
            logger.debug(
              `Failed to get skill recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            return [];
          }
        };

        // NEW: Skill content loading function for auto-inclusion
        const loadSkillContent = async (skillName: string): Promise<SkillContentInfo | null> => {
          try {
            const skill = await rulesService.getSkill(skillName);
            return {
              name: skill.name,
              description: skill.description,
              content: skill.content,
            };
          } catch (error) {
            logger.debug(
              `Failed to load skill content for '${skillName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            return null;
          }
        };

        // NEW: Agent system prompt loading function for auto-inclusion
        const loadAgentSystemPrompt = async (
          agentName: string,
          mode: Mode,
        ): Promise<AgentSystemPromptInfo | null> => {
          try {
            const result = await agentService.getAgentSystemPrompt(agentName, {
              mode,
            });
            return {
              agentName: result.agentName,
              displayName: result.displayName,
              systemPrompt: result.systemPrompt,
              description: result.description,
            };
          } catch (error) {
            logger.debug(
              `Failed to load agent system prompt for '${agentName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            return null;
          }
        };

        // NEW: Get max included skills from config
        const getMaxIncludedSkills = async (): Promise<number | null> => {
          try {
            const settings = await configService.getSettings();
            return settings.ai?.maxIncludedSkills ?? null;
          } catch (error) {
            logger.debug(
              `Failed to load maxIncludedSkills: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
            return null;
          }
        };

        // Group optional dependencies in options object
        const options: KeywordServiceOptions = {
          primaryAgentResolver,
          loadAutoConfigFn: loadAutoConfig,
          getSkillRecommendationsFn: getSkillRecommendations,
          loadSkillContentFn: loadSkillContent,
          loadAgentSystemPromptFn: loadAgentSystemPrompt,
          getMaxIncludedSkillsFn: getMaxIncludedSkills,
        };

        return new KeywordService(loadConfig, loadRule, loadAgent, options);
      },
      inject: [RulesService, ConfigService, SkillRecommendationService, AgentService],
    },
  ],
  exports: [KEYWORD_SERVICE],
})
export class KeywordModule {}
