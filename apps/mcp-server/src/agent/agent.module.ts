import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentStackService } from './agent-stack.service';
import { CouncilPresetService } from './council-preset.service';
import { TeamsCapabilityService } from './teams-capability.service';
import { RulesModule } from '../rules/rules.module';
import { CustomModule } from '../custom';
import { CodingBuddyConfigModule } from '../config/config.module';

@Module({
  imports: [RulesModule, CustomModule, CodingBuddyConfigModule],
  providers: [AgentService, AgentStackService, CouncilPresetService, TeamsCapabilityService],
  exports: [AgentService, AgentStackService, CouncilPresetService, TeamsCapabilityService],
})
export class AgentModule {}
