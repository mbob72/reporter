import { Module } from '@nestjs/common';

import { ReportJobQueue } from '../report-job.queue';
import { REPORT_JOB_QUEUE_TOKEN } from '../reporting.tokens';

@Module({
  providers: [
    {
      provide: REPORT_JOB_QUEUE_TOKEN,
      useFactory: () => new ReportJobQueue(),
    },
  ],
  exports: [REPORT_JOB_QUEUE_TOKEN],
})
export class ReportQueueModule {}
