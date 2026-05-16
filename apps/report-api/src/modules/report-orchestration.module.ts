import { Module } from '@nestjs/common';

import type { SimpleSalesSummaryXlsxDatasetRotation } from '@report-definitions/simple-sales-summary-xlsx';

import { ReportInstanceRunner } from '../report-instance.runner';
import { ReportJobQueue } from '../report-job.queue';
import { FileSystemReportInstanceStore } from '../report-instance.store';
import {
  REPORT_JOB_QUEUE_TOKEN,
  REPORT_INSTANCE_RUNNER_TOKEN,
  REPORT_INSTANCE_STORE_TOKEN,
  SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN,
} from '../reporting.tokens';
import { ReportPersistenceModule } from './report-persistence.module';
import { ReportQueueModule } from './report-queue.module';
import { ReportRegistryModule } from './report-registry.module';

@Module({
  imports: [ReportPersistenceModule, ReportRegistryModule, ReportQueueModule],
  providers: [
    {
      provide: REPORT_INSTANCE_RUNNER_TOKEN,
      inject: [
        REPORT_INSTANCE_STORE_TOKEN,
        SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN,
        REPORT_JOB_QUEUE_TOKEN,
      ],
      useFactory: (
        reportInstanceStore: FileSystemReportInstanceStore,
        datasetRotation: SimpleSalesSummaryXlsxDatasetRotation,
        reportJobQueue: ReportJobQueue,
      ) => new ReportInstanceRunner(reportInstanceStore, datasetRotation, reportJobQueue),
    },
  ],
  exports: [REPORT_INSTANCE_RUNNER_TOKEN],
})
export class ReportOrchestrationModule {}
