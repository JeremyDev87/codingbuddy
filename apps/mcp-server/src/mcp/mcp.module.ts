import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';
import { RulesModule } from '../rules/rules.module';
import { KeywordModule } from '../keyword/keyword.module';
import { CodingBuddyConfigModule } from '../config/config.module';
import { AnalyzerModule } from '../analyzer/analyzer.module';
import { AgentModule } from '../agent/agent.module';
import { ChecklistModule } from '../checklist/checklist.module';
import { ContextModule } from '../context/context.module';
import { SessionModule } from '../session/session.module';
import { StateModule } from '../state/state.module';
import { SkillRecommendationService } from '../skill/skill-recommendation.service';
import { LanguageService } from '../shared/language.service';
import { ModelResolverService } from '../model';

// Tool Handlers
import {
  TOOL_HANDLERS,
  RulesHandler,
  ConfigHandler,
  SkillHandler,
  AgentHandler,
  ModeHandler,
  ChecklistContextHandler,
  ConventionsHandler,
  SessionHandler,
} from './handlers';

const handlers = [
  RulesHandler,
  ConfigHandler,
  SkillHandler,
  AgentHandler,
  ModeHandler,
  ChecklistContextHandler,
  ConventionsHandler,
  SessionHandler,
];

@Module({
  imports: [
    RulesModule,
    KeywordModule,
    CodingBuddyConfigModule,
    AnalyzerModule,
    AgentModule,
    ChecklistModule,
    ContextModule,
    SessionModule,
    StateModule,
  ],
  controllers: [McpController],
  providers: [
    McpService,
    SkillRecommendationService,
    LanguageService,
    ModelResolverService,
    ...handlers,
    {
      provide: TOOL_HANDLERS,
      useFactory: (
        ...handlerInstances: InstanceType<(typeof handlers)[number]>[]
      ) => handlerInstances,
      inject: handlers,
    },
  ],
  exports: [McpService],
})
export class McpModule {}
