import { Module } from '@nestjs/common';
import { RulesModule } from '../../rules/rules.module';
import { TuiEventBus } from './event-bus';
import { TuiInterceptor } from './tui-interceptor';
import { AgentMetadataService } from './agent-metadata.service';

@Module({
  imports: [RulesModule],
  providers: [TuiEventBus, TuiInterceptor, AgentMetadataService],
  exports: [TuiEventBus, TuiInterceptor, AgentMetadataService],
})
export class TuiEventsModule {}
