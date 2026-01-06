import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RulesModule } from './rules/rules.module';
import { McpModule } from './mcp/mcp.module';
import { KeywordModule } from './keyword/keyword.module';
import { AgentModule } from './agent/agent.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RulesModule,
    McpModule,
    KeywordModule,
    AgentModule,
  ],
})
export class AppModule {}
