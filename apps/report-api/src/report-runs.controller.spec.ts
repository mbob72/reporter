import { HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

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
      storeMock as unknown as FileSystemReportInstanceStore,
    );

    storeMock.get.mockResolvedValue({
      id: 'instance-1',
      reportCode: 'simple-sales-summary',
      status: 'running',
      stage: 'generating',
      progressPercent: 50,
      createdAt: '2026-04-22T10:00:00.000Z',
    });

    const payload = await controller.getReportInstance('  instance-1 ');

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

  it('GET /report-runs/:reportInstanceId returns 404 for unknown instance', async () => {
    const storeMock = createStoreMock();
    const controller = new ReportRunsController(
      storeMock as unknown as FileSystemReportInstanceStore,
    );

    storeMock.get.mockResolvedValue(undefined);

    let captured: unknown;
    try {
      await controller.getReportInstance('missing-id');
    } catch (error) {
      captured = error;
    }

    expect(captured).toBeInstanceOf(HttpException);
    const exception = captured as HttpException;
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.getResponse()).toEqual({
      code: 'NOT_FOUND',
      message: 'Unknown report instance: missing-id',
    });
  });

  it('GET /report-runs/:reportInstanceId returns 500 for invalid payload from store', async () => {
    const storeMock = createStoreMock();
    const controller = new ReportRunsController(
      storeMock as unknown as FileSystemReportInstanceStore,
    );

    storeMock.get.mockResolvedValue({
      id: 'instance-1',
      reportCode: 'simple-sales-summary',
      status: 'running',
      stage: 'generating',
      progressPercent: 500,
      createdAt: '2026-04-22T10:00:00.000Z',
    });

    let captured: unknown;
    try {
      await controller.getReportInstance('instance-1');
    } catch (error) {
      captured = error;
    }

    expect(captured).toBeInstanceOf(HttpException);
    const exception = captured as HttpException;
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(exception.getResponse()).toEqual({
      message: 'Unexpected server error.',
    });
  });
});
