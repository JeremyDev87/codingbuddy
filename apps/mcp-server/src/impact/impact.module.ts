import { Module } from '@nestjs/common';
import { ImpactEventService } from './impact-event.service';
import { ImpactReportService } from './impact-report.service';

@Module({
  providers: [ImpactEventService, ImpactReportService],
  exports: [ImpactEventService, ImpactReportService],
})
export class ImpactModule {}
