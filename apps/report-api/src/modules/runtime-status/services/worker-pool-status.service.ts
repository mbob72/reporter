import { Inject, Injectable } from '@nestjs/common';

import { WorkerPoolStatusSchema } from '@report-platform/contracts';

import { ReportJobQueue } from '../../../report-job.queue';
import { REPORT_JOB_QUEUE_TOKEN } from '../../../reporting.tokens';
import { WorkerPoolStateService } from './worker-pool-state.service';

@Injectable()
export class WorkerPoolStatusService {
  constructor(
    @Inject(REPORT_JOB_QUEUE_TOKEN)
    private readonly reportJobQueue: ReportJobQueue,
    @Inject(WorkerPoolStateService)
    private readonly stateService: WorkerPoolStateService,
  ) {}

  async getStatus() {
    const queueCounters = await this.reportJobQueue.getJobCounts();
    const snapshot = this.stateService.getSnapshot(Date.now());
    const busyWorkers = Math.min(snapshot.actualWorkers, queueCounters.active);
    const idleWorkers = Math.max(0, snapshot.actualWorkers - busyWorkers);
    const cooldownRemainingMs = snapshot.cooldownUntilMs
      ? Math.max(0, snapshot.cooldownUntilMs - Date.now())
      : 0;

    return WorkerPoolStatusSchema.parse({
      queueCounters,
      pool: {
        targetWorkers: snapshot.targetWorkers,
        actualWorkers: snapshot.actualWorkers,
        idleWorkers,
        busyWorkers,
        drainingWorkers: 0,
      },
      autoscaling: {
        scalingState: snapshot.scalingState,
        lastScaleAt: snapshot.lastScaleAt,
        cooldownRemainingMs,
      },
    });
  }
}
