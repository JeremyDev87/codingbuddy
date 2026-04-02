import { Module } from '@nestjs/common';
import { ContextService } from './context.service';
import { ContextDocumentService } from './context-document.service';
import { ContextArchiveService } from './context-archive.service';
import { BriefingService } from './briefing.service';
import { BriefingLoaderService } from './briefing-loader.service';
import { ChecklistModule } from '../checklist/checklist.module';
import { CodingBuddyConfigModule } from '../config/config.module';

@Module({
  imports: [ChecklistModule, CodingBuddyConfigModule],
  providers: [
    ContextService,
    ContextDocumentService,
    ContextArchiveService,
    BriefingService,
    BriefingLoaderService,
  ],
  exports: [
    ContextService,
    ContextDocumentService,
    ContextArchiveService,
    BriefingService,
    BriefingLoaderService,
  ],
})
export class ContextModule {}
