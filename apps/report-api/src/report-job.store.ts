import type { DownloadableFileResult } from '@report-platform/contracts';

import type { InternalReportJobRecord } from './report-job.types';

type UpdateRecord = Partial<InternalReportJobRecord>;

export class InMemoryReportJobStore {
  private readonly jobsById = new Map<string, InternalReportJobRecord>();

  createQueuedJob(params: {
    jobId: string;
    reportCode: string;
  }): InternalReportJobRecord {
    const now = new Date().toISOString();
    const record: InternalReportJobRecord = {
      jobId: params.jobId,
      reportCode: params.reportCode,
      status: 'queued',
      stage: 'queued',
      progressPercent: 0,
      createdAt: now,
    };

    this.jobsById.set(record.jobId, record);

    return record;
  }

  markRunning(jobId: string): InternalReportJobRecord | undefined {
    return this.update(jobId, (current) => ({
      status: 'running',
      startedAt: current.startedAt ?? new Date().toISOString(),
    }));
  }

  updateProgress(
    jobId: string,
    stage: InternalReportJobRecord['stage'],
    progressPercent: number,
  ): InternalReportJobRecord | undefined {
    const normalizedProgress = Math.max(0, Math.min(100, progressPercent));

    return this.update(jobId, {
      status: 'running',
      stage,
      progressPercent: normalizedProgress,
    });
  }

  markCompleted(
    jobId: string,
    result: DownloadableFileResult,
  ): InternalReportJobRecord | undefined {
    return this.update(jobId, (current) => ({
      status: 'completed',
      stage: 'done',
      progressPercent: 100,
      startedAt: current.startedAt ?? new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      result,
      errorMessage: undefined,
    }));
  }

  markFailed(
    jobId: string,
    errorMessage: string,
  ): InternalReportJobRecord | undefined {
    return this.update(jobId, (current) => ({
      status: 'failed',
      stage: 'failed',
      startedAt: current.startedAt ?? new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      errorMessage,
    }));
  }

  get(jobId: string): InternalReportJobRecord | undefined {
    return this.jobsById.get(jobId);
  }

  exists(jobId: string): boolean {
    return this.jobsById.has(jobId);
  }

  private update(
    jobId: string,
    update: UpdateRecord | ((current: InternalReportJobRecord) => UpdateRecord),
  ): InternalReportJobRecord | undefined {
    const current = this.jobsById.get(jobId);

    if (!current) {
      return undefined;
    }

    const patch = typeof update === 'function' ? update(current) : update;
    const nextRecord = {
      ...current,
      ...patch,
    };

    this.jobsById.set(jobId, nextRecord);

    return nextRecord;
  }
}
