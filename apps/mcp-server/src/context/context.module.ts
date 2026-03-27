import { Module } from '@nestjs/common';
import { ContextService } from './context.service';
import { ContextDocumentService } from './context-document.service';
import { ContextArchiveService } from './context-archive.service';
import { ChecklistModule } from '../checklist/checklist.module';
import { CodingBuddyConfigModule } from '../config/config.module';

@Module({
  imports: [ChecklistModule, CodingBuddyConfigModule],
  providers: [ContextService, ContextDocumentService, ContextArchiveService],
  exports: [ContextService, ContextDocumentService, ContextArchiveService],
})
export class ContextModule {}
