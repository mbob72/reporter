import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { ReportRunsController } from './report-runs.controller';
import { ReportsController } from './reports.controller';
import { reportingProviders } from './reporting.providers';

@Module({
  controllers: [HealthController, ReportsController, ReportRunsController],
  providers: [...reportingProviders],
})
export class AppModule {}
