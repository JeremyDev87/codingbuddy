import { Module } from '@nestjs/common';
import { ContextService } from './context.service';
import { ChecklistModule } from '../checklist/checklist.module';

@Module({
  imports: [ChecklistModule],
  providers: [ContextService],
  exports: [ContextService],
})
export class ContextModule {}
