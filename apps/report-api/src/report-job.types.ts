import type { MockUser } from '@report-platform/auth';
import type {
  DownloadableFileResult,
  ReportJobStage,
  ReportJobStatus,
} from '@report-platform/contracts';

export type InternalReportJobRecord = {
  jobId: string;
  reportCode: string;
  status: ReportJobStatus;
  stage: ReportJobStage;
  progressPercent: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  result?: DownloadableFileResult;
  errorMessage?: string;
};

export type WorkerProgressMessage = {
  type: 'progress';
  jobId: string;
  stage: 'preparing' | 'generating';
  progressPercent: number;
};

export type WorkerCompletedBuiltFileMessage = {
  type: 'completed-built-file';
  jobId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type WorkerFailedMessage = {
  type: 'failed';
  jobId: string;
  errorMessage: string;
};

export type WorkerToParentMessage =
  | WorkerProgressMessage
  | WorkerCompletedBuiltFileMessage
  | WorkerFailedMessage;

export type ParentStartMessage = {
  type: 'start';
  jobId: string;
  reportCode: string;
  currentUser: MockUser;
  params: unknown;
};

export type ParentToWorkerMessage = ParentStartMessage;
