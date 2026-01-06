import { Module } from '@nestjs/common';
import { ChecklistService } from './checklist.service';
import { FILE_SYSTEM } from '../shared/filesystem.interface';
import { NodeFileSystemService } from '../shared/node-filesystem.service';

@Module({
  providers: [
    ChecklistService,
    {
      provide: FILE_SYSTEM,
      useClass: NodeFileSystemService,
    },
  ],
  exports: [ChecklistService],
})
export class ChecklistModule {}
