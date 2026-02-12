import { Module } from '@nestjs/common';
import { TuiEventBus } from './event-bus';
import { TuiInterceptor } from './tui-interceptor';

@Module({
  providers: [TuiEventBus, TuiInterceptor],
  exports: [TuiEventBus, TuiInterceptor],
})
export class TuiEventsModule {}
