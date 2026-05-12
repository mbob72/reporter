import { Module } from '@nestjs/common';

import { GeneratedFilesService } from './reports/services/generated-files.service';
import { ReportsLaunchService } from './reports/services/reports-launch.service';
import { ReportsQueryService } from './reports/services/reports-query.service';
import { ReportsController } from '../reports.controller';
import { DataAccessModule } from './data-access.module';
import { ExternalServicesModule } from './external-services.module';
import { ReportOrchestrationModule } from './report-orchestration.module';
import { ReportPersistenceModule } from './report-persistence.module';
import { ReportRegistryModule } from './report-registry.module';

@Module({
  imports: [
    ReportOrchestrationModule,
    ReportPersistenceModule,
    ReportRegistryModule,
    ExternalServicesModule,
    DataAccessModule,
  ],
  providers: [ReportsQueryService, ReportsLaunchService, GeneratedFilesService],
  controllers: [ReportsController],
})
export class ReportsModule {}
