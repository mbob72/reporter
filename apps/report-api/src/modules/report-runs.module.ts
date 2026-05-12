import { Module } from '@nestjs/common';

import { ReportRunsQueryService } from './report-runs/services/report-runs-query.service';
import { ReportRunsController } from '../report-runs.controller';
import { ReportPersistenceModule } from './report-persistence.module';

@Module({
  imports: [ReportPersistenceModule],
  providers: [ReportRunsQueryService],
  controllers: [ReportRunsController],
})
export class ReportRunsModule {}
