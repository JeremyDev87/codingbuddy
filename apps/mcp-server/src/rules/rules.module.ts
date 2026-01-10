import { Module } from '@nestjs/common';
import { RulesService } from './rules.service';
import { CustomModule } from '../custom';
import { CodingBuddyConfigModule } from '../config/config.module';

@Module({
  imports: [CustomModule, CodingBuddyConfigModule],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
