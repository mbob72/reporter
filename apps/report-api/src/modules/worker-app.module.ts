import { Module } from '@nestjs/common';

import { ReportJobProcessor } from '../report-job.processor';
import { ReportPersistenceModule } from './report-persistence.module';
import { ReportRegistryModule } from './report-registry.module';
import { ReportWorkerRuntimeService } from './report-worker/services/report-worker-runtime.service';

@Module({
  imports: [ReportPersistenceModule, ReportRegistryModule],
  providers: [ReportJobProcessor, ReportWorkerRuntimeService],
  exports: [ReportWorkerRuntimeService],
})
export class WorkerAppModule {}
