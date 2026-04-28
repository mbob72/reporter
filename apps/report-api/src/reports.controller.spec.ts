import { HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { MOCK_USER_HEADER } from '@report-platform/auth';
import type { Role } from '@report-platform/contracts';
import type { SharedSettingsProvider } from '@report-platform/external-api';
import type { ReportDefinition, ReportRegistry } from '@report-platform/registry';

import { ReportInstanceRunner } from './report-instance.runner';
import { FileSystemReportInstanceStore } from './report-instance.store';
import type { InternalReportInstanceRecord } from './report-instance.types';
import { ReportsController } from './reports.controller';

type RegistryMock = {
  listReports: ReturnType<typeof vi.fn>;
  getReportMetadata: ReturnType<typeof vi.fn>;
  getReport: ReturnType<typeof vi.fn>;
};

type SharedSettingsProviderMock = {
  listOptions: ReturnType<typeof vi.fn>;
};

type StoreMock = {
  listByReportCode: ReturnType<typeof vi.fn>;
  getArtifact: ReturnType<typeof vi.fn>;
};

type RunnerMock = {
  start: ReturnType<typeof vi.fn>;
};

function createRegistryMock(): RegistryMock {
  return {
    listReports: vi.fn(),
    getReportMetadata: vi.fn(),
    getReport: vi.fn(),
  };
}

function createSharedSettingsProviderMock(): SharedSettingsProviderMock {
  return {
    listOptions: vi.fn(),
  };
}

function createStoreMock(): StoreMock {
  return {
    listByReportCode: vi.fn(),
    getArtifact: vi.fn(),
  };
}

function createRunnerMock(): RunnerMock {
  return {
    start: vi.fn(),
  };
}

function createController(args?: {
  registryMock?: RegistryMock;
  sharedSettingsProviderMock?: SharedSettingsProviderMock;
  storeMock?: StoreMock;
  runnerMock?: RunnerMock;
}): {
  controller: ReportsController;
  registryMock: RegistryMock;
  sharedSettingsProviderMock: SharedSettingsProviderMock;
  storeMock: StoreMock;
  runnerMock: RunnerMock;
} {
  const registryMock = args?.registryMock ?? createRegistryMock();
  const sharedSettingsProviderMock =
    args?.sharedSettingsProviderMock ?? createSharedSettingsProviderMock();
  const storeMock = args?.storeMock ?? createStoreMock();
  const runnerMock = args?.runnerMock ?? createRunnerMock();

  const controller = new ReportsController(
    registryMock as unknown as ReportRegistry,
    sharedSettingsProviderMock as unknown as SharedSettingsProvider,
    storeMock as unknown as FileSystemReportInstanceStore,
    runnerMock as unknown as ReportInstanceRunner,
  );

  return {
    controller,
    registryMock,
    sharedSettingsProviderMock,
    storeMock,
    runnerMock,
  };
}

function createRequest(mockUserId?: string): { headers: Record<string, string> } {
  return mockUserId ? { headers: { [MOCK_USER_HEADER]: mockUserId } } : { headers: {} };
}

function createReportDefinition(options?: {
  minRoleToLaunch?: Role;
  externalServiceKeys?: string[];
  launchParamsSchema?: z.ZodTypeAny;
}): ReportDefinition {
  const externalDependencies = (options?.externalServiceKeys ?? []).map((serviceKey) => ({
    serviceKey,
    authMode: 'api_key' as const,
    minRoleToUse: 'TenantAdmin' as const,
  }));

  return {
    code: 'simple-sales-summary',
    title: 'Simple Sales Summary',
    description: 'Testing definition',
    launchParamsSchema: options?.launchParamsSchema ?? z.object({}).passthrough(),
    getMetadata: vi.fn(() => ({
      code: 'simple-sales-summary',
      title: 'Simple Sales Summary',
      description: 'Testing definition',
      minRoleToLaunch: options?.minRoleToLaunch ?? 'TenantAdmin',
      externalDependencies,
    })),
    launch: vi.fn(async () => ({
      fileName: 'ignored.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      bytes: new Uint8Array([1]),
    })),
  };
}

function createValidInstanceRecord(
  overrides: Partial<InternalReportInstanceRecord>,
): InternalReportInstanceRecord {
  return {
    id: 'instance-1',
    reportCode: 'simple-sales-summary',
    status: 'queued',
    stage: 'queued',
    progressPercent: 0,
    createdAt: '2026-04-22T10:00:00.000Z',
    ...overrides,
  };
}

async function expectHttpException(
  promise: Promise<unknown>,
  status: HttpStatus,
  response?: unknown,
): Promise<void> {
  let captured: unknown;

  try {
    await promise;
  } catch (error) {
    captured = error;
  }

  expect(captured).toBeInstanceOf(HttpException);
  const exception = captured as HttpException;
  expect(exception.getStatus()).toBe(status);

  if (response !== undefined) {
    expect(exception.getResponse()).toEqual(response);
  }
}

describe('ReportsController', () => {
  it('GET /reports returns parsed report list', async () => {
    const { controller, registryMock } = createController();

    registryMock.listReports.mockReturnValue([
      {
        code: 'simple-sales-summary',
        title: 'Simple Sales Summary',
        description: 'Summary',
        minRoleToLaunch: 'TenantAdmin',
      },
    ]);

    const payload = await controller.listReports(createRequest('admin'));

    expect(payload).toEqual([
      {
        code: 'simple-sales-summary',
        title: 'Simple Sales Summary',
        description: 'Summary',
        minRoleToLaunch: 'TenantAdmin',
      },
    ]);
  });

  it('GET /reports returns 500 for invalid report list payload', async () => {
    const { controller, registryMock } = createController();

    registryMock.listReports.mockReturnValue([
      {
        code: '',
        title: 'Broken',
        description: 'Broken',
        minRoleToLaunch: 'TenantAdmin',
      },
    ]);

    await expectHttpException(
      controller.listReports(createRequest('admin')),
      HttpStatus.INTERNAL_SERVER_ERROR,
      { message: 'Unexpected server error.' },
    );
  });

  it('GET /reports/:code/metadata returns metadata on success', async () => {
    const { controller, registryMock } = createController();

    registryMock.getReportMetadata.mockReturnValue({
      code: 'simple-sales-summary',
      title: 'Simple Sales Summary',
      description: 'Summary',
      minRoleToLaunch: 'TenantAdmin',
      externalDependencies: [],
    });

    const payload = await controller.getReportMetadata(
      'simple-sales-summary',
      createRequest('tenant-admin-1'),
    );

    expect(payload.code).toBe('simple-sales-summary');
  });

  it('GET /reports/:code/metadata returns 404 for unknown report', async () => {
    const { controller, registryMock } = createController();

    registryMock.getReportMetadata.mockReturnValue(undefined);

    await expectHttpException(
      controller.getReportMetadata('unknown', createRequest('tenant-admin-1')),
      HttpStatus.NOT_FOUND,
      { code: 'NOT_FOUND', message: 'Unknown report: unknown' },
    );
  });

  it('GET /reports/:reportCode/external-services/:serviceKey/shared-settings returns settings on success', async () => {
    const { controller, registryMock, sharedSettingsProviderMock } = createController();

    registryMock.getReport.mockReturnValue(
      createReportDefinition({ externalServiceKeys: ['openWeather'] }),
    );
    sharedSettingsProviderMock.listOptions.mockResolvedValue([
      {
        id: 'tenant-1-weather-default',
        label: 'Tenant 1 Weather Default',
        serviceKey: 'openWeather',
      },
    ]);

    const payload = await controller.listSharedSettings(
      'simple-sales-summary',
      'openWeather',
      createRequest('tenant-admin-1'),
    );

    expect(payload).toEqual([
      {
        id: 'tenant-1-weather-default',
        label: 'Tenant 1 Weather Default',
        serviceKey: 'openWeather',
      },
    ]);
  });

  it('GET shared settings returns 404 for unknown report', async () => {
    const { controller, registryMock } = createController();

    registryMock.getReport.mockReturnValue(undefined);

    await expectHttpException(
      controller.listSharedSettings(
        'unknown-report',
        'openWeather',
        createRequest('tenant-admin-1'),
      ),
      HttpStatus.NOT_FOUND,
      { code: 'NOT_FOUND', message: 'Unknown report: unknown-report' },
    );
  });

  it('GET shared settings returns 400 when report does not declare requested service', async () => {
    const { controller, registryMock } = createController();

    registryMock.getReport.mockReturnValue(
      createReportDefinition({ externalServiceKeys: ['another-service'] }),
    );

    await expectHttpException(
      controller.listSharedSettings(
        'simple-sales-summary',
        'openWeather',
        createRequest('tenant-admin-1'),
      ),
      HttpStatus.BAD_REQUEST,
      {
        code: 'VALIDATION_ERROR',
        message: 'Report does not declare external service: openWeather',
      },
    );
  });

  it('GET shared settings returns 500 for invalid shared settings payload', async () => {
    const { controller, registryMock, sharedSettingsProviderMock } = createController();

    registryMock.getReport.mockReturnValue(
      createReportDefinition({ externalServiceKeys: ['openWeather'] }),
    );
    sharedSettingsProviderMock.listOptions.mockResolvedValue([
      {
        id: '',
        label: 'Broken option',
        serviceKey: 'openWeather',
      },
    ]);

    await expectHttpException(
      controller.listSharedSettings(
        'simple-sales-summary',
        'openWeather',
        createRequest('tenant-admin-1'),
      ),
      HttpStatus.INTERNAL_SERVER_ERROR,
      { message: 'Unexpected server error.' },
    );
  });

  it('GET /tenants returns all tenants for Admin', async () => {
    const { controller } = createController();

    const payload = await controller.listTenants(createRequest('admin'));
    expect(payload.map((tenant) => tenant.id)).toEqual(['tenant-1', 'tenant-2']);
  });

  it('GET /tenants returns only current tenant for TenantAdmin', async () => {
    const { controller } = createController();

    const payload = await controller.listTenants(createRequest('tenant-admin-1'));
    expect(payload).toEqual([{ id: 'tenant-1', name: 'Acme Tenant' }]);
  });

  it.each(['member-1', 'auditor-1'])('GET /tenants returns empty list for %s', async (mockUser) => {
    const { controller } = createController();

    const payload = await controller.listTenants(createRequest(mockUser));
    expect(payload).toEqual([]);
  });

  it('GET /tenants/:tenantId/organizations allows valid tenant access', async () => {
    const { controller } = createController();

    const payload = await controller.listOrganizationsByTenant(
      'tenant-1',
      createRequest('tenant-admin-1'),
    );

    expect(payload.map((organization) => organization.id)).toEqual(['org-1', 'org-2']);
  });

  it('GET /tenants/:tenantId/organizations returns 403 for forbidden tenant access', async () => {
    const { controller } = createController();

    await expectHttpException(
      controller.listOrganizationsByTenant('tenant-2', createRequest('tenant-admin-1')),
      HttpStatus.FORBIDDEN,
      { code: 'FORBIDDEN', message: 'You do not have access to this tenant.' },
    );
  });

  it('POST /reports/:reportCode/launch returns 400 for invalid body', async () => {
    const { controller } = createController();

    await expectHttpException(
      controller.launchReport('simple-sales-summary', {}, createRequest('tenant-admin-1')),
      HttpStatus.BAD_REQUEST,
      { code: 'VALIDATION_ERROR', message: 'Invalid request payload.' },
    );
  });

  it('POST /reports/:reportCode/launch returns 400 for invalid params schema', async () => {
    const { controller, registryMock } = createController();

    registryMock.getReport.mockReturnValue(
      createReportDefinition({
        launchParamsSchema: z.object({
          tenantId: z.string().trim().min(1),
        }),
      }),
    );

    await expectHttpException(
      controller.launchReport(
        'simple-sales-summary',
        { params: { organizationId: 'org-1' } },
        createRequest('tenant-admin-1'),
      ),
      HttpStatus.BAD_REQUEST,
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid launch params for selected report.',
      },
    );
  });

  it('POST /reports/:reportCode/launch returns 404 for unknown report', async () => {
    const { controller, registryMock } = createController();

    registryMock.getReport.mockReturnValue(undefined);

    await expectHttpException(
      controller.launchReport('unknown-report', { params: {} }, createRequest('tenant-admin-1')),
      HttpStatus.NOT_FOUND,
      { code: 'NOT_FOUND', message: 'Unknown report: unknown-report' },
    );
  });

  it('POST /reports/:reportCode/launch returns 403 for insufficient role', async () => {
    const { controller, registryMock } = createController();

    registryMock.getReport.mockReturnValue(createReportDefinition({ minRoleToLaunch: 'Admin' }));

    await expectHttpException(
      controller.launchReport('simple-sales-summary', { params: {} }, createRequest('member-1')),
      HttpStatus.FORBIDDEN,
      {
        code: 'FORBIDDEN',
        message: 'You do not have access to launch this report.',
      },
    );
  });

  it('POST /reports/:reportCode/launch returns accepted payload from runner', async () => {
    const { controller, registryMock, runnerMock } = createController();

    registryMock.getReport.mockReturnValue(createReportDefinition());
    runnerMock.start.mockResolvedValue({
      reportInstanceId: 'instance-accepted',
      status: 'queued',
    });

    const payload = await controller.launchReport(
      'simple-sales-summary',
      { params: { foo: 'bar' } },
      createRequest('tenant-admin-1'),
    );

    expect(runnerMock.start).toHaveBeenCalledWith({
      reportCode: 'simple-sales-summary',
      currentUser: {
        userId: 'tenant-admin-1',
        role: 'TenantAdmin',
        tenantId: 'tenant-1',
        organizationId: null,
      },
      params: { foo: 'bar' },
    });
    expect(payload).toEqual({
      reportInstanceId: 'instance-accepted',
      status: 'queued',
    });
  });

  it('GET /reports/:reportCode/instances returns list on success', async () => {
    const { controller, registryMock, storeMock } = createController();

    registryMock.getReport.mockReturnValue(createReportDefinition());
    storeMock.listByReportCode.mockResolvedValue([
      createValidInstanceRecord({
        id: 'instance-done',
        status: 'completed',
        stage: 'done',
        finishedAt: '2026-04-22T10:01:00.000Z',
        artifactId: 'instance-done',
        fileName: 'report.xlsx',
        byteLength: 1024,
      }),
      createValidInstanceRecord({
        id: 'instance-running',
        status: 'running',
        stage: 'generating',
        progressPercent: 40,
      }),
    ]);

    const payload = await controller.listReportInstancesByReportCode('simple-sales-summary');

    expect(payload).toEqual([
      {
        id: 'instance-done',
        reportCode: 'simple-sales-summary',
        status: 'completed',
        createdAt: '2026-04-22T10:00:00.000Z',
        finishedAt: '2026-04-22T10:01:00.000Z',
        fileName: 'report.xlsx',
        byteLength: 1024,
        downloadUrl: '/generated-files/instance-done',
      },
      {
        id: 'instance-running',
        reportCode: 'simple-sales-summary',
        status: 'running',
        createdAt: '2026-04-22T10:00:00.000Z',
        finishedAt: undefined,
        fileName: undefined,
        byteLength: undefined,
        downloadUrl: undefined,
      },
    ]);
  });

  it('GET /reports/:reportCode/instances returns 404 for unknown report', async () => {
    const { controller, registryMock } = createController();

    registryMock.getReport.mockReturnValue(undefined);

    await expectHttpException(
      controller.listReportInstancesByReportCode('unknown-report'),
      HttpStatus.NOT_FOUND,
      { code: 'NOT_FOUND', message: 'Unknown report: unknown-report' },
    );
  });

  it('GET /reports/:reportCode/instances returns 500 for invalid payload', async () => {
    const { controller, registryMock, storeMock } = createController();

    registryMock.getReport.mockReturnValue(createReportDefinition());
    storeMock.listByReportCode.mockResolvedValue([
      createValidInstanceRecord({
        id: '',
        status: 'completed',
        stage: 'done',
        artifactId: 'artifact-id',
      }),
    ]);

    await expectHttpException(
      controller.listReportInstancesByReportCode('simple-sales-summary'),
      HttpStatus.INTERNAL_SERVER_ERROR,
      { message: 'Unexpected server error.' },
    );
  });

  it('GET /generated-files/:fileId streams file on success', async () => {
    const { controller, storeMock } = createController();
    const setHeader = vi.fn();
    const send = vi.fn();
    const response = { setHeader, send };

    storeMock.getArtifact.mockResolvedValue({
      id: 'file-1',
      fileName: 'report.xlsx',
      mimeType: 'application/octet-stream',
      bytes: new Uint8Array([1, 2, 3]),
      createdAt: '2026-04-22T10:00:00.000Z',
    });

    await controller.downloadGeneratedFile('file-1', response);

    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="report.xlsx"',
    );
    expect(setHeader).toHaveBeenCalledWith('Content-Length', '3');
    expect(send).toHaveBeenCalledWith(Buffer.from([1, 2, 3]));
  });

  it('GET /generated-files/:fileId returns 404 when file is missing', async () => {
    const { controller, storeMock } = createController();
    const response = { setHeader: vi.fn(), send: vi.fn() };

    storeMock.getArtifact.mockResolvedValue(undefined);

    await expectHttpException(
      controller.downloadGeneratedFile('missing-file', response),
      HttpStatus.NOT_FOUND,
      { code: 'NOT_FOUND', message: 'Generated file not found.' },
    );
  });
});
