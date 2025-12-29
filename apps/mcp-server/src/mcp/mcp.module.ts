import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';
import { RulesModule } from '../rules/rules.module';
import { KeywordModule } from '../keyword/keyword.module';
import { CodingBuddyConfigModule } from '../config/config.module';
import { AnalyzerModule } from '../analyzer/analyzer.module';
import { SkillRecommendationService } from '../skill/skill-recommendation.service';

@Module({
  imports: [
    RulesModule,
    KeywordModule,
    CodingBuddyConfigModule,
    AnalyzerModule,
  ],
  controllers: [McpController],
  providers: [McpService, SkillRecommendationService],
  exports: [McpService],
})
export class McpModule {}
