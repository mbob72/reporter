import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { ReportJobQueue } from '../../../report-job.queue';
import { REPORT_JOB_QUEUE_TOKEN } from '../../../reporting.tokens';
import { WorkerPoolStateService } from './worker-pool-state.service';

type AutoscalingConfig = {
  minWorkers: number;
  midWorkers: number;
  maxWorkers: number;
  upToMidWaitingThreshold: number;
  upToMaxWaitingThreshold: number;
  downToMidWaitingThreshold: number;
  downToMinWaitingThreshold: number;
  cooldownMs: number;
  evaluationIntervalMs: number;
};

function parseNumber(raw: string | undefined, fallback: number): number {
  const value = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(value) ? value : fallback;
}

function resolveAutoscalingConfig(): AutoscalingConfig {
  const minWorkers = Math.max(1, parseNumber(process.env.WORKER_POOL_MIN, 5));
  const midWorkers = Math.max(minWorkers, parseNumber(process.env.WORKER_POOL_MID, 10));
  const maxWorkers = Math.max(midWorkers, parseNumber(process.env.WORKER_POOL_MAX, 15));

  return {
    minWorkers,
    midWorkers,
    maxWorkers,
    upToMidWaitingThreshold: Math.max(
      0,
      parseNumber(process.env.WORKER_SCALE_UP_TO_MID_WAITING_THRESHOLD, 5),
    ),
    upToMaxWaitingThreshold: Math.max(
      0,
      parseNumber(process.env.WORKER_SCALE_UP_TO_MAX_WAITING_THRESHOLD, 20),
    ),
    downToMidWaitingThreshold: Math.max(
      0,
      parseNumber(process.env.WORKER_SCALE_DOWN_TO_MID_WAITING_THRESHOLD, 10),
    ),
    downToMinWaitingThreshold: Math.max(
      0,
      parseNumber(process.env.WORKER_SCALE_DOWN_TO_MIN_WAITING_THRESHOLD, 2),
    ),
    cooldownMs: Math.max(0, parseNumber(process.env.WORKER_SCALE_COOLDOWN_MS, 30_000)),
    evaluationIntervalMs: Math.max(
      1_000,
      parseNumber(process.env.WORKER_SCALE_EVALUATION_INTERVAL_MS, 5_000),
    ),
  };
}

@Injectable()
export class WorkerAutoscalingPolicyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerAutoscalingPolicyService.name);
  private readonly config = resolveAutoscalingConfig();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @Inject(REPORT_JOB_QUEUE_TOKEN)
    private readonly reportJobQueue: ReportJobQueue,
    @Inject(WorkerPoolStateService)
    private readonly stateService: WorkerPoolStateService,
  ) {}

  onModuleInit(): void {
    this.stateService.initialize({ minWorkers: this.config.minWorkers });

    this.timer = setInterval(() => {
      void this.evaluate().catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown autoscaling evaluation error';
        this.logger.error(`autoscaling evaluation failed: ${message}`);
      });
    }, this.config.evaluationIntervalMs);

    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  private async evaluate(): Promise<void> {
    const counts = await this.reportJobQueue.getJobCounts();
    const nowMs = Date.now();
    const snapshot = this.stateService.getSnapshot(nowMs);

    const cooldownActive = snapshot.cooldownUntilMs !== null && snapshot.cooldownUntilMs > nowMs;

    if (!cooldownActive) {
      const nextTarget = this.resolveNextTarget(snapshot.targetWorkers, counts.waiting);

      if (nextTarget !== snapshot.targetWorkers) {
        this.stateService.applyScaleDecision({
          nextTargetWorkers: nextTarget,
          nowMs,
          cooldownMs: this.config.cooldownMs,
        });
      }
    }

    this.stateService.reconcileActualWorkers();
  }

  private resolveNextTarget(currentTarget: number, waiting: number): number {
    if (waiting >= this.config.upToMaxWaitingThreshold) {
      return this.config.maxWorkers;
    }

    if (waiting >= this.config.upToMidWaitingThreshold) {
      return this.config.midWorkers;
    }

    if (
      currentTarget === this.config.maxWorkers &&
      waiting <= this.config.downToMidWaitingThreshold
    ) {
      return this.config.midWorkers;
    }

    if (
      currentTarget > this.config.minWorkers &&
      waiting <= this.config.downToMinWaitingThreshold
    ) {
      return this.config.minWorkers;
    }

    return currentTarget;
  }
}
