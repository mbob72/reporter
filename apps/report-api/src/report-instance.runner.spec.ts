import type { ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';

import { describe, expect, it, beforeEach, vi } from 'vitest';

import type { MockUser } from '@report-platform/auth';
import {
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
  type SimpleSalesSummaryXlsxDatasetRotation,
} from '@report-definitions/simple-sales-summary-xlsx';

import { ReportInstanceRunner } from './report-instance.runner';
import { FileSystemReportInstanceStore } from './report-instance.store';
import type { ParentStartMessage } from './report-instance.types';

const { forkMock } = vi.hoisted(() => ({
  forkMock: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  fork: forkMock,
}));

type StoreMock = {
  createQueuedInstance: ReturnType<typeof vi.fn>;
  markRunning: ReturnType<typeof vi.fn>;
  updateProgress: ReturnType<typeof vi.fn>;
  markCompleted: ReturnType<typeof vi.fn>;
  markFailed: ReturnType<typeof vi.fn>;
  saveArtifact: ReturnType<typeof vi.fn>;
};

class FakeChildProcess extends EventEmitter {
  sendError: Error | null = null;
  readonly sentMessages: unknown[] = [];

  send(message: unknown, callback?: (error: Error | null) => void): boolean {
    this.sentMessages.push(message);
    callback?.(this.sendError);
    return true;
  }
}

function createStoreMock(): StoreMock {
  return {
    createQueuedInstance: vi.fn().mockResolvedValue({
      id: 'instance-id',
      reportCode: 'simple-sales-summary',
      status: 'queued',
      stage: 'queued',
      progressPercent: 0,
      createdAt: '2026-04-22T10:00:00.000Z',
    }),
    markRunning: vi.fn().mockResolvedValue(undefined),
    updateProgress: vi.fn().mockResolvedValue(undefined),
    markCompleted: vi.fn().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    saveArtifact: vi.fn().mockResolvedValue({
      artifactId: 'artifact-1',
      fileName: 'report.xlsx',
      mimeType: 'application/octet-stream',
      byteLength: 3,
    }),
  };
}

function createDatasetRotationMock(): SimpleSalesSummaryXlsxDatasetRotation {
  return {
    nextDatasetKey: vi.fn(() => 'winter_base'),
  };
}

function createRunner(
  storeMock: StoreMock,
  datasetRotation: SimpleSalesSummaryXlsxDatasetRotation,
): ReportInstanceRunner {
  return new ReportInstanceRunner(
    storeMock as unknown as FileSystemReportInstanceStore,
    datasetRotation,
  );
}

function createCurrentUser(): MockUser {
  return {
    userId: 'tenant-admin-1',
    role: 'TenantAdmin',
    tenantId: 'tenant-1',
    organizationId: null,
  };
}

function getSentStartMessage(child: FakeChildProcess): ParentStartMessage {
  const message = child.sentMessages[0];
  return message as ParentStartMessage;
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('ReportInstanceRunner', () => {
  beforeEach(() => {
    forkMock.mockReset();
  });

  it('start creates queued instance and returns accepted payload', async () => {
    const child = new FakeChildProcess();
    const storeMock = createStoreMock();
    const runner = createRunner(storeMock, createDatasetRotationMock());

    forkMock.mockReturnValue(child as unknown as ChildProcess);

    const result = await runner.start({
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params: { tenantId: 'tenant-1' },
    });

    expect(storeMock.createQueuedInstance).toHaveBeenCalledWith({
      reportInstanceId: result.reportInstanceId,
      reportCode: 'simple-sales-summary',
    });
    expect(result).toEqual({
      reportInstanceId: result.reportInstanceId,
      status: 'queued',
    });
  });

  it('adds auto-rotated datasetKey for simple-sales-summary-xlsx when datasetKey is missing', async () => {
    const child = new FakeChildProcess();
    const storeMock = createStoreMock();
    const datasetRotation = createDatasetRotationMock();
    const runner = createRunner(storeMock, datasetRotation);

    forkMock.mockReturnValue(child as unknown as ChildProcess);

    await runner.start({
      reportCode: SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
      currentUser: createCurrentUser(),
      params: { foo: 'bar' },
    });

    const startMessage = getSentStartMessage(child);
    expect(startMessage.params).toEqual({
      foo: 'bar',
      datasetKey: 'winter_base',
    });
    expect(datasetRotation.nextDatasetKey).toHaveBeenCalledTimes(1);
  });

  it('keeps provided datasetKey for simple-sales-summary-xlsx report', async () => {
    const child = new FakeChildProcess();
    const storeMock = createStoreMock();
    const datasetRotation = createDatasetRotationMock();
    const runner = createRunner(storeMock, datasetRotation);

    forkMock.mockReturnValue(child as unknown as ChildProcess);

    await runner.start({
      reportCode: SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
      currentUser: createCurrentUser(),
      params: { datasetKey: 'winter_base' },
    });

    const startMessage = getSentStartMessage(child);
    expect(startMessage.params).toEqual({
      datasetKey: 'winter_base',
    });
    expect(datasetRotation.nextDatasetKey).not.toHaveBeenCalled();
  });

  it('does not modify params for other report codes', async () => {
    const child = new FakeChildProcess();
    const storeMock = createStoreMock();
    const datasetRotation = createDatasetRotationMock();
    const runner = createRunner(storeMock, datasetRotation);
    const params = { foo: 'bar' };

    forkMock.mockReturnValue(child as unknown as ChildProcess);

    await runner.start({
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params,
    });

    const startMessage = getSentStartMessage(child);
    expect(startMessage.params).toBe(params);
    expect(datasetRotation.nextDatasetKey).not.toHaveBeenCalled();
  });

  it('marks instance as failed when worker startup throws synchronously', async () => {
    const storeMock = createStoreMock();
    const runner = createRunner(storeMock, createDatasetRotationMock());

    forkMock.mockImplementation(() => {
      throw new Error('fork failed');
    });

    const result = await runner.start({
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params: {},
    });

    expect(result).toEqual({
      reportInstanceId: result.reportInstanceId,
      status: 'queued',
    });
    expect(storeMock.markFailed).toHaveBeenCalledWith(result.reportInstanceId, 'fork failed');
  });

  it('handles progress message by marking running and updating progress', async () => {
    const child = new FakeChildProcess();
    const storeMock = createStoreMock();
    const runner = createRunner(storeMock, createDatasetRotationMock());

    forkMock.mockReturnValue(child as unknown as ChildProcess);

    const accepted = await runner.start({
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params: {},
    });

    child.emit('message', {
      type: 'progress',
      reportInstanceId: accepted.reportInstanceId,
      stage: 'preparing',
      progressPercent: 20,
    });
    await flushAsyncWork();

    expect(storeMock.markRunning).toHaveBeenCalledWith(accepted.reportInstanceId);
    expect(storeMock.updateProgress).toHaveBeenCalledWith(
      accepted.reportInstanceId,
      'preparing',
      20,
    );
  });

  it('handles completed-built-file message by storing artifact and marking completed', async () => {
    const child = new FakeChildProcess();
    const storeMock = createStoreMock();
    const runner = createRunner(storeMock, createDatasetRotationMock());

    forkMock.mockReturnValue(child as unknown as ChildProcess);

    const accepted = await runner.start({
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params: {},
    });

    child.emit('message', {
      type: 'completed-built-file',
      reportInstanceId: accepted.reportInstanceId,
      fileName: 'report.xlsx',
      mimeType: 'application/octet-stream',
      bytes: new Uint8Array([9, 8, 7]),
    });
    await flushAsyncWork();

    expect(storeMock.markRunning).toHaveBeenCalledWith(accepted.reportInstanceId);
    expect(storeMock.updateProgress).toHaveBeenCalledWith(
      accepted.reportInstanceId,
      'storing-result',
      90,
    );
    expect(storeMock.saveArtifact).toHaveBeenCalledWith({
      reportInstanceId: accepted.reportInstanceId,
      fileName: 'report.xlsx',
      mimeType: 'application/octet-stream',
      bytes: new Uint8Array([9, 8, 7]),
    });
    expect(storeMock.markCompleted).toHaveBeenCalledWith(
      accepted.reportInstanceId,
      {
        kind: 'downloadable-file',
        fileName: 'report.xlsx',
        byteLength: 3,
        downloadUrl: '/generated-files/artifact-1',
      },
      {
        artifactId: 'artifact-1',
        fileName: 'report.xlsx',
        mimeType: 'application/octet-stream',
        byteLength: 3,
      },
    );
  });

  it('handles failed message by marking failed', async () => {
    const child = new FakeChildProcess();
    const storeMock = createStoreMock();
    const runner = createRunner(storeMock, createDatasetRotationMock());

    forkMock.mockReturnValue(child as unknown as ChildProcess);

    const accepted = await runner.start({
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params: {},
    });

    child.emit('message', {
      type: 'failed',
      reportInstanceId: accepted.reportInstanceId,
      errorMessage: 'worker failed',
    });
    await flushAsyncWork();

    expect(storeMock.markFailed).toHaveBeenCalledWith(accepted.reportInstanceId, 'worker failed');
  });

  it('ignores messages from another report instance id', async () => {
    const child = new FakeChildProcess();
    const storeMock = createStoreMock();
    const runner = createRunner(storeMock, createDatasetRotationMock());

    forkMock.mockReturnValue(child as unknown as ChildProcess);

    await runner.start({
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params: {},
    });

    child.emit('message', {
      type: 'progress',
      reportInstanceId: 'other-id',
      stage: 'preparing',
      progressPercent: 10,
    });
    child.emit('message', {
      type: 'completed-built-file',
      reportInstanceId: 'other-id',
      fileName: 'wrong.xlsx',
      mimeType: 'application/octet-stream',
      bytes: new Uint8Array([1]),
    });
    child.emit('message', {
      type: 'failed',
      reportInstanceId: 'other-id',
      errorMessage: 'wrong',
    });
    await flushAsyncWork();

    expect(storeMock.markRunning).not.toHaveBeenCalled();
    expect(storeMock.updateProgress).not.toHaveBeenCalled();
    expect(storeMock.saveArtifact).not.toHaveBeenCalled();
    expect(storeMock.markCompleted).not.toHaveBeenCalled();
    expect(storeMock.markFailed).not.toHaveBeenCalled();
  });

  it('ignores repeat messages after terminal state', async () => {
    const child = new FakeChildProcess();
    const storeMock = createStoreMock();
    const runner = createRunner(storeMock, createDatasetRotationMock());

    forkMock.mockReturnValue(child as unknown as ChildProcess);

    const accepted = await runner.start({
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params: {},
    });

    child.emit('message', {
      type: 'failed',
      reportInstanceId: accepted.reportInstanceId,
      errorMessage: 'first failure',
    });
    await flushAsyncWork();

    child.emit('message', {
      type: 'failed',
      reportInstanceId: accepted.reportInstanceId,
      errorMessage: 'second failure',
    });
    child.emit('message', {
      type: 'completed-built-file',
      reportInstanceId: accepted.reportInstanceId,
      fileName: 'late.xlsx',
      mimeType: 'application/octet-stream',
      bytes: new Uint8Array([1]),
    });
    await flushAsyncWork();

    expect(storeMock.markFailed).toHaveBeenCalledTimes(1);
    expect(storeMock.markFailed).toHaveBeenCalledWith(accepted.reportInstanceId, 'first failure');
    expect(storeMock.markCompleted).not.toHaveBeenCalled();
    expect(storeMock.saveArtifact).not.toHaveBeenCalled();
  });

  it('marks failed when child.send callback returns an error', async () => {
    const child = new FakeChildProcess();
    child.sendError = new Error('ipc send failed');
    const storeMock = createStoreMock();
    const runner = createRunner(storeMock, createDatasetRotationMock());

    forkMock.mockReturnValue(child as unknown as ChildProcess);

    const accepted = await runner.start({
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params: {},
    });
    await flushAsyncWork();

    expect(storeMock.markFailed).toHaveBeenCalledWith(accepted.reportInstanceId, 'ipc send failed');
  });

  it('marks failed on premature worker exit', async () => {
    const child = new FakeChildProcess();
    const storeMock = createStoreMock();
    const runner = createRunner(storeMock, createDatasetRotationMock());

    forkMock.mockReturnValue(child as unknown as ChildProcess);

    const accepted = await runner.start({
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params: {},
    });

    child.emit('exit', 1, null);
    await flushAsyncWork();

    expect(storeMock.markFailed).toHaveBeenCalledWith(
      accepted.reportInstanceId,
      'Worker exited before completion. code=1 signal=null',
    );
  });

  it('marks failed on worker error', async () => {
    const child = new FakeChildProcess();
    const storeMock = createStoreMock();
    const runner = createRunner(storeMock, createDatasetRotationMock());

    forkMock.mockReturnValue(child as unknown as ChildProcess);

    const accepted = await runner.start({
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params: {},
    });

    child.emit('error', new Error('worker crashed'));
    await flushAsyncWork();

    expect(storeMock.markFailed).toHaveBeenCalledWith(accepted.reportInstanceId, 'worker crashed');
  });
});
