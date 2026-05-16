import { describe, expect, it, vi } from 'vitest';

import type { MockUser } from '@report-platform/auth';
import {
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
  type SimpleSalesSummaryXlsxDatasetRotation,
} from '@report-definitions/simple-sales-summary-xlsx';

import { ReportJobQueue } from './report-job.queue';
import { ReportInstanceRunner } from './report-instance.runner';
import { FileSystemReportInstanceStore } from './report-instance.store';

type StoreMock = {
  createQueuedInstance: ReturnType<typeof vi.fn>;
};

function createStoreMock(): StoreMock {
  return {
    createQueuedInstance: vi.fn().mockResolvedValue(undefined),
  };
}

function createDatasetRotationMock(): SimpleSalesSummaryXlsxDatasetRotation {
  return {
    nextDatasetKey: vi.fn(() => 'winter_base'),
  };
}

function createQueueMock(): Pick<ReportJobQueue, 'enqueue'> {
  return {
    enqueue: vi.fn().mockResolvedValue(undefined),
  };
}

function createRunner(params: {
  storeMock: StoreMock;
  datasetRotation: SimpleSalesSummaryXlsxDatasetRotation;
  queueMock: Pick<ReportJobQueue, 'enqueue'>;
}): ReportInstanceRunner {
  return new ReportInstanceRunner(
    params.storeMock as unknown as FileSystemReportInstanceStore,
    params.datasetRotation,
    params.queueMock as ReportJobQueue,
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

describe('ReportInstanceRunner', () => {
  it('creates queued instance and enqueues job', async () => {
    const storeMock = createStoreMock();
    const queueMock = createQueueMock();
    const runner = createRunner({
      storeMock,
      datasetRotation: createDatasetRotationMock(),
      queueMock,
    });

    const result = await runner.start({
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params: { tenantId: 'tenant-1' },
    });

    expect(storeMock.createQueuedInstance).toHaveBeenCalledWith({
      reportInstanceId: result.reportInstanceId,
      reportCode: 'simple-sales-summary',
    });
    expect(queueMock.enqueue).toHaveBeenCalledWith({
      reportInstanceId: result.reportInstanceId,
      reportCode: 'simple-sales-summary',
      currentUser: createCurrentUser(),
      params: { tenantId: 'tenant-1' },
    });
    expect(result.status).toBe('queued');
  });

  it('adds auto-rotated datasetKey when missing for xlsx report', async () => {
    const storeMock = createStoreMock();
    const queueMock = createQueueMock();
    const datasetRotation = createDatasetRotationMock();
    const runner = createRunner({ storeMock, datasetRotation, queueMock });

    await runner.start({
      reportCode: SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
      currentUser: createCurrentUser(),
      params: { foo: 'bar' },
    });

    expect(queueMock.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          foo: 'bar',
          datasetKey: 'winter_base',
        },
      }),
    );
    expect(datasetRotation.nextDatasetKey).toHaveBeenCalledTimes(1);
  });
});
