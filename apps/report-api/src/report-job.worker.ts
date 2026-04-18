import { ApiErrorSchema } from '@report-platform/contracts';

import { executeReportLaunchInWorker } from './report-launch.executor';
import { createReportRegistryWithoutNest } from './report-registry.factory';
import type {
  ParentToWorkerMessage,
  WorkerToParentMessage,
} from './report-job.types';

function toErrorMessage(error: unknown): string {
  const parsedError = ApiErrorSchema.safeParse(error);

  if (parsedError.success) {
    return parsedError.data.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Unexpected worker error.';
}

function sendMessage(message: WorkerToParentMessage): Promise<void> {
  return new Promise((resolve) => {
    if (typeof process.send !== 'function') {
      resolve();
      return;
    }

    process.send(message, () => {
      resolve();
    });
  });
}

async function run(message: ParentToWorkerMessage): Promise<void> {
  if (message.type !== 'start') {
    process.exit(1);
    return;
  }

  const registry = createReportRegistryWithoutNest();
  let progressQueue = Promise.resolve();

  try {
    const builtFile = await executeReportLaunchInWorker({
      reportCode: message.reportCode,
      currentUser: message.currentUser,
      params: message.params,
      registry,
      onProgress(event) {
        progressQueue = progressQueue.then(() =>
          sendMessage({
            type: 'progress',
            jobId: message.jobId,
            stage: event.stage,
            progressPercent: event.progressPercent,
          }),
        );
      },
    });

    await progressQueue;
    await sendMessage({
      type: 'completed-built-file',
      jobId: message.jobId,
      fileName: builtFile.fileName,
      mimeType: builtFile.mimeType,
      bytes: builtFile.bytes,
    });
    process.exit(0);
  } catch (error) {
    await progressQueue;
    await sendMessage({
      type: 'failed',
      jobId: message.jobId,
      errorMessage: toErrorMessage(error),
    });
    process.exit(1);
  }
}

let started = false;

process.on('message', (message: unknown) => {
  if (started) {
    return;
  }

  if (!message || typeof message !== 'object') {
    process.exit(1);
    return;
  }

  started = true;
  void run(message as ParentToWorkerMessage);
});
