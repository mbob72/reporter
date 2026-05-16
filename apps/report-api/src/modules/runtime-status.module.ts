import { Module } from '@nestjs/common';

import { RuntimeStatusController } from '../runtime-status.controller';
import { ReportQueueModule } from './report-queue.module';
import { WorkerPoolStatusService } from './runtime-status/services/worker-pool-status.service';

@Module({
  imports: [ReportQueueModule],
  providers: [WorkerPoolStatusService],
  controllers: [RuntimeStatusController],
})
export class RuntimeStatusModule {}
