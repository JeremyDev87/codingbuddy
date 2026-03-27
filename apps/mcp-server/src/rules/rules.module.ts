import { Module } from '@nestjs/common';
import { RulesService } from './rules.service';
import { RuleInsightsService } from './rule-insights.service';
import { CustomModule } from '../custom';
import { CodingBuddyConfigModule } from '../config/config.module';

@Module({
  imports: [CustomModule, CodingBuddyConfigModule],
  providers: [RulesService, RuleInsightsService],
  exports: [RulesService, RuleInsightsService],
})
export class RulesModule {}
