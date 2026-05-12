import { Module } from '@nestjs/common';

import type { SimpleSalesSummaryXlsxDatasetRotation } from '@report-definitions/simple-sales-summary-xlsx';

import { ReportInstanceRunner } from '../report-instance.runner';
import { FileSystemReportInstanceStore } from '../report-instance.store';
import {
  REPORT_INSTANCE_RUNNER_TOKEN,
  REPORT_INSTANCE_STORE_TOKEN,
  SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN,
} from '../reporting.tokens';
import { ReportPersistenceModule } from './report-persistence.module';
import { ReportRegistryModule } from './report-registry.module';

@Module({
  imports: [ReportPersistenceModule, ReportRegistryModule],
  providers: [
    {
      provide: REPORT_INSTANCE_RUNNER_TOKEN,
      inject: [REPORT_INSTANCE_STORE_TOKEN, SIMPLE_SALES_SUMMARY_XLSX_DATASET_ROTATION_TOKEN],
      useFactory: (
        reportInstanceStore: FileSystemReportInstanceStore,
        datasetRotation: SimpleSalesSummaryXlsxDatasetRotation,
      ) => new ReportInstanceRunner(reportInstanceStore, datasetRotation),
    },
  ],
  exports: [REPORT_INSTANCE_RUNNER_TOKEN],
})
export class ReportOrchestrationModule {}
