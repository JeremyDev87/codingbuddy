import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';
import { RulesModule } from '../rules/rules.module';
import { KeywordModule } from '../keyword/keyword.module';
import { CodingBuddyConfigModule } from '../config/config.module';
import { AnalyzerModule } from '../analyzer/analyzer.module';
import { AgentModule } from '../agent/agent.module';
import { SkillRecommendationService } from '../skill/skill-recommendation.service';
import { LanguageService } from '../shared/language.service';

@Module({
  imports: [
    RulesModule,
    KeywordModule,
    CodingBuddyConfigModule,
    AnalyzerModule,
    AgentModule,
  ],
  controllers: [McpController],
  providers: [McpService, SkillRecommendationService, LanguageService],
  exports: [McpService],
})
export class McpModule {}
