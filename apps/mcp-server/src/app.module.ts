import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RulesModule } from './rules/rules.module';
import { McpModule } from './mcp/mcp.module';
import { KeywordModule } from './keyword/keyword.module';
import { AgentModule } from './agent/agent.module';
import { ChecklistModule } from './checklist/checklist.module';
import { ContextModule } from './context/context.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RulesModule,
    McpModule,
    KeywordModule,
    AgentModule,
    ChecklistModule,
    ContextModule,
  ],
})
export class AppModule {}
