import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';

import { ReportJobProcessor } from '../../../report-job.processor';
import { resolveReportQueueConfig } from '../../../report-queue.config';
import type { ReportJobPayload } from '../../../report-queue.types';

@Injectable()
export class ReportWorkerRuntimeService implements OnModuleDestroy {
  private readonly logger = new Logger(ReportWorkerRuntimeService.name);
  private readonly config = resolveReportQueueConfig();
  private worker: Worker<ReportJobPayload> | null = null;

  start(): void {
    if (this.worker) {
      return;
    }

    this.worker = new Worker<ReportJobPayload>(
      this.config.queueName,
      async (job) => {
        await this.reportJobProcessor.process(job);
      },
      {
        connection: {
          host: this.config.redisHost,
          port: this.config.redisPort,
          password: this.config.redisPassword,
          db: this.config.redisDb,
        },
        prefix: this.config.queuePrefix,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`job completed id=${job.id}`);
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`job failed id=${job?.id ?? 'unknown'} error=${error.message}`);
    });

    this.logger.log(
      `report worker started queue=${this.config.queueName} redis=${this.config.redisHost}:${this.config.redisPort}`,
    );
  }

  constructor(
    @Inject(ReportJobProcessor)
    private readonly reportJobProcessor: ReportJobProcessor,
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (!this.worker) {
      return;
    }

    this.logger.log('report worker shutting down');
    await this.worker.close();
    this.worker = null;
  }
}
