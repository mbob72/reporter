import * as crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { fork } from 'node:child_process';
import { resolve } from 'node:path';

import { Logger } from '@nestjs/common';
import type { MockUser } from '@report-platform/auth';
import {
  DownloadableFileResultSchema,
  ReportJobAcceptedSchema,
  type ApiError,
  type ReportJobAccepted,
} from '@report-platform/contracts';
import type { GeneratedFileStore } from '@report-platform/file-store';
import {
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
  type SimpleSalesSummaryXlsxDatasetRotation,
} from '@report-definitions/simple-sales-summary-xlsx';

import { InMemoryReportJobStore } from './report-job.store';
import type {
  ParentStartMessage,
  WorkerCompletedBuiltFileMessage,
  WorkerFailedMessage,
  WorkerProgressMessage,
} from './report-job.types';

type StartReportJobArgs = {
  reportCode: string;
  currentUser: MockUser;
  params: Record<string, unknown>;
};

type JobLifecycleState = 'active' | 'finalizing' | 'finalized';

function generateJobId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const candidate = error as Partial<ApiError>;

    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unexpected report job error.';
}

function resolveWorkerLaunchConfig(): {
  workerPath: string;
  execArgv: string[];
} {
  const tsWorkerPath = resolve(__dirname, 'report-job.worker.ts');

  if (existsSync(tsWorkerPath)) {
    return {
      workerPath: tsWorkerPath,
      execArgv: process.execArgv.length > 0 ? process.execArgv : ['--loader', 'tsx'],
    };
  }

  return {
    workerPath: resolve(__dirname, 'report-job.worker.js'),
    execArgv: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toBytes(value: unknown): Uint8Array | undefined {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return new Uint8Array(value);
  }

  if (
    isRecord(value) &&
    value.type === 'Buffer' &&
    Array.isArray(value.data) &&
    value.data.every((item) => typeof item === 'number')
  ) {
    return Uint8Array.from(value.data);
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
    return Uint8Array.from(value);
  }

  return undefined;
}

function isProgressMessage(value: unknown): value is WorkerProgressMessage {
  return (
    isRecord(value) &&
    value.type === 'progress' &&
    typeof value.jobId === 'string' &&
    (value.stage === 'preparing' || value.stage === 'generating') &&
    typeof value.progressPercent === 'number'
  );
}

function isCompletedMessage(
  value: unknown,
): value is WorkerCompletedBuiltFileMessage {
  return (
    isRecord(value) &&
    value.type === 'completed-built-file' &&
    typeof value.jobId === 'string' &&
    typeof value.fileName === 'string' &&
    typeof value.mimeType === 'string' &&
    value.bytes !== undefined
  );
}

function isFailedMessage(value: unknown): value is WorkerFailedMessage {
  return (
    isRecord(value) &&
    value.type === 'failed' &&
    typeof value.jobId === 'string' &&
    typeof value.errorMessage === 'string'
  );
}

export class ReportJobRunner {
  private readonly logger = new Logger(ReportJobRunner.name);

  constructor(
    private readonly jobStore: InMemoryReportJobStore,
    private readonly generatedFileStore: GeneratedFileStore,
    private readonly datasetRotation: SimpleSalesSummaryXlsxDatasetRotation,
  ) {}

  start(args: StartReportJobArgs): ReportJobAccepted {
    const jobId = generateJobId();
    const workerStartMessage: ParentStartMessage = {
      type: 'start',
      jobId,
      reportCode: args.reportCode,
      currentUser: args.currentUser,
      params: this.buildInternalParams(args.reportCode, args.params),
    };

    this.jobStore.createQueuedJob({
      jobId,
      reportCode: args.reportCode,
    });

    try {
      this.startWorker(jobId, workerStartMessage);
    } catch (error) {
      this.jobStore.markFailed(jobId, toErrorMessage(error));
      this.logger.error(
        `failed to start report worker id=${jobId} error=${toErrorMessage(error)}`,
      );
    }

    const acceptedPayload = ReportJobAcceptedSchema.parse({
      jobId,
      status: 'queued',
    });

    return acceptedPayload;
  }

  private buildInternalParams(
    reportCode: string,
    params: Record<string, unknown>,
  ): Record<string, unknown> {
    if (reportCode !== SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE) {
      return params;
    }

    const datasetKey = this.datasetRotation.nextDatasetKey();

    return {
      ...params,
      datasetKey,
    };
  }

  private startWorker(jobId: string, startMessage: ParentStartMessage): void {
    const { workerPath, execArgv } = resolveWorkerLaunchConfig();
    const child = fork(workerPath, [], {
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      execArgv,
      serialization: 'advanced',
    });
    let lifecycleState: JobLifecycleState = 'active';

    const setFailed = (errorMessage: string) => {
      if (lifecycleState === 'finalized') {
        return;
      }

      lifecycleState = 'finalized';
      this.jobStore.markFailed(jobId, errorMessage);
      this.logger.error(`report job failed id=${jobId} error=${errorMessage}`);
      removeListeners();
    };

    const setCompletedWithFile = async (message: WorkerCompletedBuiltFileMessage) => {
      if (lifecycleState !== 'active') {
        return;
      }

      lifecycleState = 'finalizing';

      try {
        const bytes = toBytes(message.bytes);

        if (!bytes) {
          throw new Error('Worker returned invalid file bytes.');
        }

        this.jobStore.markRunning(jobId);
        this.jobStore.updateProgress(jobId, 'storing-result', 90);

        const { fileId } = await this.generatedFileStore.save({
          fileName: message.fileName,
          mimeType: message.mimeType,
          bytes,
        });
        const downloadableResult = {
          kind: 'downloadable-file',
          fileName: message.fileName,
          byteLength: bytes.byteLength,
          downloadUrl: `/generated-files/${fileId}`,
        };
        const parsedResult =
          DownloadableFileResultSchema.safeParse(downloadableResult);

        if (!parsedResult.success) {
          throw new Error('Invalid downloadable file result.');
        }

        this.jobStore.markCompleted(jobId, parsedResult.data);
        this.logger.log(`report job completed id=${jobId} stage=done`);
        lifecycleState = 'finalized';
        removeListeners();
      } catch (error) {
        setFailed(toErrorMessage(error));
      }
    };

    const handleWorkerMessage = (message: unknown) => {
      if (lifecycleState !== 'active' && lifecycleState !== 'finalizing') {
        return;
      }

      if (isProgressMessage(message)) {
        if (message.jobId !== jobId || lifecycleState !== 'active') {
          return;
        }

        this.jobStore.markRunning(jobId);
        this.jobStore.updateProgress(
          jobId,
          message.stage,
          message.progressPercent,
        );
        return;
      }

      if (isCompletedMessage(message)) {
        if (message.jobId !== jobId) {
          return;
        }

        void setCompletedWithFile(message);
        return;
      }

      if (isFailedMessage(message)) {
        if (message.jobId !== jobId) {
          return;
        }

        setFailed(message.errorMessage);
      }
    };

    const handleWorkerError = (error: Error) => {
      setFailed(toErrorMessage(error));
    };

    const handleWorkerExit = (code: number | null, signal: NodeJS.Signals | null) => {
      if (lifecycleState !== 'active') {
        return;
      }

      const detail =
        code !== null
          ? `code=${code}`
          : signal
            ? `signal=${signal}`
            : 'unknown';

      setFailed(`Report worker exited before completion (${detail}).`);
    };

    const removeListeners = () => {
      child.off('message', handleWorkerMessage);
      child.off('error', handleWorkerError);
      child.off('exit', handleWorkerExit);
    };

    child.on('message', handleWorkerMessage);
    child.on('error', handleWorkerError);
    child.on('exit', handleWorkerExit);
    child.send(startMessage, (error) => {
      if (error) {
        setFailed(toErrorMessage(error));
      }
    });
  }
}
