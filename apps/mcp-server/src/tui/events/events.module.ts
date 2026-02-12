import { Module } from '@nestjs/common';
import { TuiEventBus } from './event-bus';

@Module({
  providers: [TuiEventBus],
  exports: [TuiEventBus],
})
export class TuiEventsModule {}
