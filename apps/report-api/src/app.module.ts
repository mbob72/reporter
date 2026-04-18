import { Module } from '@nestjs/common';

import { ReportJobsController } from './report-jobs.controller';
import { ReportsController } from './reports.controller';
import { reportingProviders } from './reporting.providers';

@Module({
  controllers: [ReportsController, ReportJobsController],
  providers: [...reportingProviders],
})
export class AppModule {}
