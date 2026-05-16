import { Inject, Injectable } from '@nestjs/common';

import { WorkerPoolStatusSchema } from '@report-platform/contracts';

import { ReportJobQueue } from '../../../report-job.queue';
import { REPORT_JOB_QUEUE_TOKEN } from '../../../reporting.tokens';

function parseNumber(raw: string | undefined, fallback: number): number {
  const value = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(value) ? value : fallback;
}

function parseCooldownMs(raw: string | undefined): number {
  return Math.max(0, parseNumber(raw, 0));
}

@Injectable()
export class WorkerPoolStatusService {
  constructor(
    @Inject(REPORT_JOB_QUEUE_TOKEN)
    private readonly reportJobQueue: ReportJobQueue,
  ) {}

  async getStatus() {
    const queueCounters = await this.reportJobQueue.getJobCounts();

    const targetWorkers = Math.max(1, parseNumber(process.env.WORKER_POOL_MIN, 1));
    const actualWorkers = targetWorkers;
    const busyWorkers = Math.min(actualWorkers, queueCounters.active);
    const idleWorkers = Math.max(0, actualWorkers - busyWorkers);
    const cooldownRemainingMs = parseCooldownMs(process.env.WORKER_SCALE_COOLDOWN_MS);

    return WorkerPoolStatusSchema.parse({
      queueCounters,
      pool: {
        targetWorkers,
        actualWorkers,
        idleWorkers,
        busyWorkers,
        drainingWorkers: 0,
      },
      autoscaling: {
        scalingState: cooldownRemainingMs > 0 ? 'cooldown' : 'stable',
        lastScaleAt: null,
        cooldownRemainingMs,
      },
    });
  }
}
