import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [RulesModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
