import { Module } from '@nestjs/common';

import { ReportRunsController } from './report-runs.controller';
import { ReportsController } from './reports.controller';
import { reportingProviders } from './reporting.providers';

@Module({
  controllers: [ReportsController, ReportRunsController],
  providers: [...reportingProviders],
})
export class AppModule {}
