import { Module } from '@nestjs/common';
import { SkillRecommendationService } from './skill-recommendation.service';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [RulesModule],
  providers: [SkillRecommendationService],
  exports: [SkillRecommendationService],
})
export class SkillModule {}
