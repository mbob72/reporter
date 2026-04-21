import type { MockUser } from '@report-platform/auth';
import type {
  DownloadableFileResult,
  ReportInstanceStage,
  ReportInstanceStatus,
} from '@report-platform/contracts';

export type InternalReportInstanceRecord = {
  id: string;
  reportCode: string;
  status: ReportInstanceStatus;
  stage: ReportInstanceStage;
  progressPercent: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  result?: DownloadableFileResult;
  errorMessage?: string;
  artifactId?: string;
  fileName?: string;
  mimeType?: string;
  byteLength?: number;
};

export type WorkerProgressMessage = {
  type: 'progress';
  reportInstanceId: string;
  stage: 'preparing' | 'generating';
  progressPercent: number;
};

export type WorkerCompletedBuiltFileMessage = {
  type: 'completed-built-file';
  reportInstanceId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
};

export type WorkerFailedMessage = {
  type: 'failed';
  reportInstanceId: string;
  errorMessage: string;
};

export type WorkerToParentMessage =
  | WorkerProgressMessage
  | WorkerCompletedBuiltFileMessage
  | WorkerFailedMessage;

export type ParentStartMessage = {
  type: 'start';
  reportInstanceId: string;
  reportCode: string;
  currentUser: MockUser;
  params: unknown;
};

export type ParentToWorkerMessage = ParentStartMessage;
