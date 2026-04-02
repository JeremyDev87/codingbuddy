import { Module } from '@nestjs/common';
import { RulesService } from './rules.service';
import { RuleInsightsService } from './rule-insights.service';
import { RuleEventCollector } from './rule-event-collector';
import { RuleStatsWriter } from './rule-stats-writer';
import { CustomModule } from '../custom';
import { CodingBuddyConfigModule } from '../config/config.module';

@Module({
  imports: [CustomModule, CodingBuddyConfigModule],
  providers: [RulesService, RuleInsightsService, RuleEventCollector, RuleStatsWriter],
  exports: [RulesService, RuleInsightsService, RuleEventCollector, RuleStatsWriter],
})
export class RulesModule {}
