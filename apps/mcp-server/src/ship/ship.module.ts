import { Module } from '@nestjs/common';
import { QualityReportService } from './quality-report.service';

@Module({
  providers: [QualityReportService],
  exports: [QualityReportService],
})
export class ShipModule {}
