import { describe, expect, it, vi } from 'vitest';

import { ReportRunsQueryService } from './modules/report-runs/services/report-runs-query.service';
import { ReportRunsController } from './report-runs.controller';
import { FileSystemReportInstanceStore } from './report-instance.store';

function createStoreMock() {
  return {
    get: vi.fn(),
  };
}

describe('ReportRunsController', () => {
  it('GET /report-runs/:reportInstanceId returns report instance on success', async () => {
    const storeMock = createStoreMock();
    const controller = new ReportRunsController(
      new ReportRunsQueryService(storeMock as unknown as FileSystemReportInstanceStore),
    );

    storeMock.get.mockResolvedValue({
      id: 'instance-1',
      reportCode: 'simple-sales-summary',
      status: 'running',
      stage: 'generating',
      progressPercent: 50,
      createdAt: '2026-04-22T10:00:00.000Z',
    });

    const payload = await controller.getReportInstance('instance-1');

    expect(storeMock.get).toHaveBeenCalledWith('instance-1');
    expect(payload).toEqual({
      id: 'instance-1',
      reportCode: 'simple-sales-summary',
      status: 'running',
      stage: 'generating',
      progressPercent: 50,
      createdAt: '2026-04-22T10:00:00.000Z',
    });
  });

  it('GET /report-runs/:reportInstanceId returns not-found domain error for unknown instance', async () => {
    const storeMock = createStoreMock();
    const controller = new ReportRunsController(
      new ReportRunsQueryService(storeMock as unknown as FileSystemReportInstanceStore),
    );

    storeMock.get.mockResolvedValue(undefined);

    await expect(controller.getReportInstance('missing-id')).rejects.toEqual({
      code: 'NOT_FOUND',
      message: 'Unknown report instance: missing-id',
    });
  });
});
