import { Module } from '@nestjs/common';
import { RulesService } from './rules.service';

@Module({
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
