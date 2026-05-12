import { Module } from '@nestjs/common';

import { HealthModule } from './modules/health.module';
import { ReportRunsModule } from './modules/report-runs.module';
import { ReportsModule } from './modules/reports.module';

@Module({
  imports: [HealthModule, ReportsModule, ReportRunsModule],
})
export class AppModule {}
