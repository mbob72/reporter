import { Queue } from 'bullmq';

import { resolveReportQueueConfig } from './report-queue.config';
import type { ReportJobPayload } from './report-queue.types';

export class ReportJobQueue {
  private readonly queue: Queue<ReportJobPayload>;
  private readonly config = resolveReportQueueConfig();

  constructor() {
    this.queue = new Queue<ReportJobPayload>(this.config.queueName, {
      connection: {
        host: this.config.redisHost,
        port: this.config.redisPort,
        password: this.config.redisPassword,
        db: this.config.redisDb,
      },
      prefix: this.config.queuePrefix,
    });
  }

  async enqueue(payload: ReportJobPayload): Promise<void> {
    await this.queue.add('report-launch', payload, {
      jobId: payload.reportInstanceId,
      attempts: this.config.jobAttempts,
      backoff: {
        type: 'fixed',
        delay: this.config.jobBackoffMs,
      },
      removeOnComplete: this.config.jobRemoveOnComplete,
      removeOnFail: this.config.jobRemoveOnFail,
    });
  }

  async getJobCounts(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const counts = await this.queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    );

    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
    };
  }
}
