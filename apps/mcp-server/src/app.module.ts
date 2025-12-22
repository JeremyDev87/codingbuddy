import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RulesModule } from './rules/rules.module';
import { McpModule } from './mcp/mcp.module';
import { KeywordModule } from './keyword/keyword.module';

@Module({
  imports: [ConfigModule.forRoot(), RulesModule, McpModule, KeywordModule],
})
export class AppModule {}
