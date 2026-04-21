import * as crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { fork } from 'node:child_process';
import { resolve } from 'node:path';

import { Logger } from '@nestjs/common';
import type { MockUser } from '@report-platform/auth';
import {
  DownloadableFileResultSchema,
  ReportLaunchAcceptedSchema,
  type ApiError,
  type ReportLaunchAccepted,
} from '@report-platform/contracts';
import {
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
  type SimpleSalesSummaryXlsxDatasetRotation,
} from '@report-definitions/simple-sales-summary-xlsx';

import { FileSystemReportInstanceStore } from './report-instance.store';
import type {
  ParentStartMessage,
  WorkerCompletedBuiltFileMessage,
  WorkerFailedMessage,
  WorkerProgressMessage,
} from './report-instance.types';

type StartReportInstanceArgs = {
  reportCode: string;
  currentUser: MockUser;
  params: Record<string, unknown>;
};

type InstanceLifecycleState = 'active' | 'finalizing' | 'finalized';

function generateReportInstanceId(): string {
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

  return 'Unexpected report instance error.';
}

function resolveWorkerLaunchConfig(): {
  workerPath: string;
  execArgv: string[];
} {
  const tsWorkerPath = resolve(__dirname, 'report-instance.worker.ts');

  if (existsSync(tsWorkerPath)) {
    return {
      workerPath: tsWorkerPath,
      execArgv: process.execArgv.length > 0 ? process.execArgv : ['--loader', 'tsx'],
    };
  }

  return {
    workerPath: resolve(__dirname, 'report-instance.worker.js'),
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
    typeof value.reportInstanceId === 'string' &&
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
    typeof value.reportInstanceId === 'string' &&
    typeof value.fileName === 'string' &&
    typeof value.mimeType === 'string' &&
    value.bytes !== undefined
  );
}

function isFailedMessage(value: unknown): value is WorkerFailedMessage {
  return (
    isRecord(value) &&
    value.type === 'failed' &&
    typeof value.reportInstanceId === 'string' &&
    typeof value.errorMessage === 'string'
  );
}

export class ReportInstanceRunner {
  private readonly logger = new Logger(ReportInstanceRunner.name);

  constructor(
    private readonly reportInstanceStore: FileSystemReportInstanceStore,
    private readonly datasetRotation: SimpleSalesSummaryXlsxDatasetRotation,
  ) {}

  async start(args: StartReportInstanceArgs): Promise<ReportLaunchAccepted> {
    const reportInstanceId = generateReportInstanceId();
    const workerStartMessage: ParentStartMessage = {
      type: 'start',
      reportInstanceId,
      reportCode: args.reportCode,
      currentUser: args.currentUser,
      params: this.buildInternalParams(args.reportCode, args.params),
    };

    await this.reportInstanceStore.createQueuedInstance({
      reportInstanceId,
      reportCode: args.reportCode,
    });

    try {
      this.startWorker(reportInstanceId, workerStartMessage);
    } catch (error) {
      await this.reportInstanceStore.markFailed(reportInstanceId, toErrorMessage(error));
      this.logger.error(
        `failed to start report instance id=${reportInstanceId} error=${toErrorMessage(error)}`,
      );
    }

    const acceptedPayload = ReportLaunchAcceptedSchema.parse({
      reportInstanceId,
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

  private startWorker(
    reportInstanceId: string,
    startMessage: ParentStartMessage,
  ): void {
    const { workerPath, execArgv } = resolveWorkerLaunchConfig();
    const child = fork(workerPath, [], {
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      execArgv,
      serialization: 'advanced',
    });
    let lifecycleState: InstanceLifecycleState = 'active';

    const setFailed = async (errorMessage: string) => {
      if (lifecycleState === 'finalized') {
        return;
      }

      lifecycleState = 'finalized';
      await this.reportInstanceStore.markFailed(reportInstanceId, errorMessage);
      this.logger.error(`report instance failed id=${reportInstanceId} error=${errorMessage}`);
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

        await this.reportInstanceStore.markRunning(reportInstanceId);
        await this.reportInstanceStore.updateProgress(
          reportInstanceId,
          'storing-result',
          90,
        );

        const artifact = await this.reportInstanceStore.saveArtifact({
          reportInstanceId,
          fileName: message.fileName,
          mimeType: message.mimeType,
          bytes,
        });
        const downloadableResult = {
          kind: 'downloadable-file',
          fileName: message.fileName,
          byteLength: bytes.byteLength,
          downloadUrl: `/generated-files/${artifact.artifactId}`,
        };
        const parsedResult = DownloadableFileResultSchema.safeParse(downloadableResult);

        if (!parsedResult.success) {
          throw new Error('Invalid downloadable file result.');
        }

        await this.reportInstanceStore.markCompleted(
          reportInstanceId,
          parsedResult.data,
          artifact,
        );
        this.logger.log(`report instance completed id=${reportInstanceId} stage=done`);
        lifecycleState = 'finalized';
        removeListeners();
      } catch (error) {
        await setFailed(toErrorMessage(error));
      }
    };

    const handleWorkerMessage = (message: unknown) => {
      if (lifecycleState !== 'active' && lifecycleState !== 'finalizing') {
        return;
      }

      if (isProgressMessage(message)) {
        if (message.reportInstanceId !== reportInstanceId || lifecycleState !== 'active') {
          return;
        }

        void this.reportInstanceStore.markRunning(reportInstanceId).catch((error) => {
          this.logger.error(
            `failed to mark running id=${reportInstanceId} error=${toErrorMessage(error)}`,
          );
        });
        void this.reportInstanceStore
          .updateProgress(reportInstanceId, message.stage, message.progressPercent)
          .catch((error) => {
            this.logger.error(
              `failed to update progress id=${reportInstanceId} error=${toErrorMessage(error)}`,
            );
          });
        return;
      }

      if (isCompletedMessage(message)) {
        if (message.reportInstanceId !== reportInstanceId) {
          return;
        }

        void setCompletedWithFile(message);
        return;
      }

      if (isFailedMessage(message)) {
        if (message.reportInstanceId !== reportInstanceId) {
          return;
        }

        void setFailed(message.errorMessage);
      }
    };

    const handleWorkerError = (error: Error) => {
      void setFailed(toErrorMessage(error));
    };

    const handleWorkerExit = (code: number | null, signal: NodeJS.Signals | null) => {
      if (lifecycleState !== 'active') {
        return;
      }

      void setFailed(
        `Worker exited before completion. code=${code ?? 'null'} signal=${signal ?? 'null'}`,
      );
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
      if (!error) {
        return;
      }

      void setFailed(toErrorMessage(error));
    });
  }
}
