import { Module } from '@nestjs/common';

import { RuntimeStatusController } from '../runtime-status.controller';
import { ReportQueueModule } from './report-queue.module';
import { RuntimeMetricsService } from './runtime-status/services/runtime-metrics.service';
import { WorkerAutoscalingPolicyService } from './runtime-status/services/worker-autoscaling-policy.service';
import { WorkerPoolStateService } from './runtime-status/services/worker-pool-state.service';
import { WorkerPoolStatusService } from './runtime-status/services/worker-pool-status.service';

@Module({
  imports: [ReportQueueModule],
  providers: [
    WorkerPoolStateService,
    WorkerAutoscalingPolicyService,
    WorkerPoolStatusService,
    RuntimeMetricsService,
  ],
  controllers: [RuntimeStatusController],
})
export class RuntimeStatusModule {}
