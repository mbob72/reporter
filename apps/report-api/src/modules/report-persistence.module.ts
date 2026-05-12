import { Module } from '@nestjs/common';

import { FileSystemReportInstanceStore } from '../report-instance.store';
import { REPORT_INSTANCE_STORE_TOKEN } from '../reporting.tokens';

@Module({
  providers: [
    {
      provide: REPORT_INSTANCE_STORE_TOKEN,
      useFactory: () => new FileSystemReportInstanceStore(),
    },
  ],
  exports: [REPORT_INSTANCE_STORE_TOKEN],
})
export class ReportPersistenceModule {}
