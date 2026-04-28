import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { MockUser } from '@report-platform/auth';
import type { ReportDefinition } from '@report-platform/registry';
import { ReportRegistry } from '@report-platform/registry';
import type { BuiltFile } from '@report-platform/xlsx';

import { executeReportLaunchInWorker } from './report-launch.executor';

const currentUser: MockUser = {
  userId: 'tenant-admin-1',
  role: 'TenantAdmin',
  tenantId: 'tenant-1',
  organizationId: null,
};

function createBuiltFile(): BuiltFile {
  return {
    fileName: 'report.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    bytes: new Uint8Array([1, 2, 3]),
  };
}

function createReportDefinition(
  launch: ReportDefinition<unknown, BuiltFile>['launch'],
): ReportDefinition<unknown, BuiltFile> {
  return {
    code: 'report-a',
    title: 'Report A',
    description: 'Testing report',
    launchParamsSchema: z.object({}).passthrough(),
    getMetadata() {
      return {
        code: 'report-a',
        title: 'Report A',
        description: 'Testing report',
        minRoleToLaunch: 'TenantAdmin',
        externalDependencies: [],
      };
    },
    launch,
  };
}

describe('executeReportLaunchInWorker', () => {
  it('throws NOT_FOUND for unknown report', async () => {
    await expect(
      executeReportLaunchInWorker({
        reportCode: 'unknown-report',
        currentUser,
        params: {},
        registry: new ReportRegistry([]),
        onProgress: vi.fn(),
      }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Unknown report: unknown-report',
    });
  });

  it('emits base progress events and forwards downstream progress from report definition', async () => {
    const registry = new ReportRegistry([
      createReportDefinition(async (_user, _params, options) => {
        options?.onProgress?.(55);
        options?.onProgress?.(80);
        return createBuiltFile();
      }),
    ]);
    const events: Array<{ stage: 'preparing' | 'generating'; progressPercent: number }> = [];

    const builtFile = await executeReportLaunchInWorker({
      reportCode: 'report-a',
      currentUser,
      params: { foo: 'bar' },
      registry,
      onProgress(event) {
        events.push(event);
      },
    });

    expect(events).toEqual([
      { stage: 'preparing', progressPercent: 10 },
      { stage: 'generating', progressPercent: 30 },
      { stage: 'generating', progressPercent: 55 },
      { stage: 'generating', progressPercent: 80 },
    ]);
    expect(builtFile).toEqual(createBuiltFile());
  });

  it('throws when report definition returns non-BuiltFile result', async () => {
    const registry = new ReportRegistry([
      createReportDefinition(async () => {
        return {
          fileName: 'wrong.xlsx',
          mimeType: 'application/octet-stream',
          bytes: [1, 2, 3],
        } as unknown as BuiltFile;
      }),
    ]);

    await expect(
      executeReportLaunchInWorker({
        reportCode: 'report-a',
        currentUser,
        params: {},
        registry,
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow('Current async prototype supports only file-based report results');
  });

  it('rethrows launch errors from report definition', async () => {
    const launchError = new Error('launch failed');
    const registry = new ReportRegistry([
      createReportDefinition(async () => {
        throw launchError;
      }),
    ]);

    await expect(
      executeReportLaunchInWorker({
        reportCode: 'report-a',
        currentUser,
        params: {},
        registry,
        onProgress: vi.fn(),
      }),
    ).rejects.toThrow('launch failed');
  });
});
