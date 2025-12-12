import { Module } from '@nestjs/common';
import { McpService } from './mcp.service';
import { McpController } from './mcp.controller';
import { RulesModule } from '../rules/rules.module';

@Module({
    imports: [RulesModule],
    controllers: [McpController],
    providers: [McpService],
    exports: [McpService],
})
export class McpModule { }
