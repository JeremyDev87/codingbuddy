import { Module } from '@nestjs/common';
import { StateService } from './state.service';
import { CodingBuddyConfigModule } from '../config/config.module';

@Module({
  imports: [CodingBuddyConfigModule],
  providers: [StateService],
  exports: [StateService],
})
export class StateModule {}
