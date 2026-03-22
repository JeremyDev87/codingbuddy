import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { RulesModule } from '../rules/rules.module';
import { CustomModule } from '../custom';
import { CodingBuddyConfigModule } from '../config/config.module';

@Module({
  imports: [RulesModule, CustomModule, CodingBuddyConfigModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
