import { Module } from '@nestjs/common';
import { ChecklistModule } from '../checklist/checklist.module';
import { QualityReportService } from './quality-report.service';
import { ReviewPrService } from './review-pr.service';

@Module({
  imports: [ChecklistModule],
  providers: [QualityReportService, ReviewPrService],
  exports: [QualityReportService, ReviewPrService],
})
export class ShipModule {}
