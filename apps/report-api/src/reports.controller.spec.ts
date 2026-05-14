import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { CurrentUser, Role } from '@report-platform/contracts';
import type { SharedSettingsProvider } from '@report-platform/external-api';
import type { ReportDefinition, ReportRegistry } from '@report-platform/registry';

import { ReportInstanceRunner } from './report-instance.runner';
import { FileSystemReportInstanceStore } from './report-instance.store';
import type { InternalReportInstanceRecord } from './report-instance.types';
import { GeneratedFilesService } from './modules/reports/services/generated-files.service';
import { ReportsLaunchService } from './modules/reports/services/reports-launch.service';
import { ReportsQueryService } from './modules/reports/services/reports-query.service';
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

const adminUser: CurrentUser = {
  userId: 'admin-user',
  role: 'Admin',
  tenantId: null,
  organizationId: null,
};

const tenantAdminUser: CurrentUser = {
  userId: 'tenant-admin-1',
  role: 'TenantAdmin',
  tenantId: 'tenant-1',
  organizationId: 'org-1',
};

const memberUser: CurrentUser = {
  userId: 'member-1',
  role: 'Member',
  tenantId: 'tenant-1',
  organizationId: 'org-1',
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
    new ReportsQueryService(
      registryMock as unknown as ReportRegistry,
      sharedSettingsProviderMock as unknown as SharedSettingsProvider,
      storeMock as unknown as FileSystemReportInstanceStore,
    ),
    new ReportsLaunchService(
      registryMock as unknown as ReportRegistry,
      runnerMock as unknown as ReportInstanceRunner,
    ),
    new GeneratedFilesService(storeMock as unknown as FileSystemReportInstanceStore),
  );

  return {
    controller,
    registryMock,
    sharedSettingsProviderMock,
    storeMock,
    runnerMock,
  };
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

    const payload = await controller.listReports();

    expect(payload).toEqual([
      {
        code: 'simple-sales-summary',
        title: 'Simple Sales Summary',
        description: 'Summary',
        minRoleToLaunch: 'TenantAdmin',
      },
    ]);
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

    const payload = await controller.getReportMetadata('simple-sales-summary', tenantAdminUser);

    expect(payload.code).toBe('simple-sales-summary');
    expect(registryMock.getReportMetadata).toHaveBeenCalledWith(
      'simple-sales-summary',
      tenantAdminUser,
    );
  });

  it('GET shared settings returns 400 when report does not declare requested service', async () => {
    const { controller, registryMock } = createController();

    registryMock.getReport.mockReturnValue(
      createReportDefinition({ externalServiceKeys: ['another-service'] }),
    );

    await expect(
      controller.listSharedSettings('simple-sales-summary', 'openWeather', tenantAdminUser),
    ).rejects.toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Report does not declare external service: openWeather',
    });
  });

  it('GET /tenants returns all tenants for admin', async () => {
    const { controller } = createController();

    const payload = await controller.listTenants(adminUser);

    expect(payload.some((tenant) => tenant.id === 'tenant-1')).toBe(true);
    expect(payload.some((tenant) => tenant.id === 'tenant-2')).toBe(true);
  });

  it('GET /tenants returns only own tenant for tenant admin', async () => {
    const { controller } = createController();

    const payload = await controller.listTenants(tenantAdminUser);

    expect(payload).toEqual([
      {
        id: 'tenant-1',
        name: 'Acme Tenant',
      },
    ]);
  });

  it('GET /tenants returns empty list for member', async () => {
    const { controller } = createController();

    const payload = await controller.listTenants(memberUser);

    expect(payload).toEqual([]);
  });

  it('GET /tenants/:tenantId/organizations returns 403 for restricted tenant', async () => {
    const { controller } = createController();

    expect(() => controller.listOrganizationsByTenant('tenant-2', tenantAdminUser)).toThrow(
      'You do not have access to this tenant.',
    );
  });

  it('POST /reports/:reportCode/launch queues launch and returns accepted payload', async () => {
    const { controller, registryMock, runnerMock } = createController();

    registryMock.getReport.mockReturnValue(
      createReportDefinition({ minRoleToLaunch: 'TenantAdmin' }),
    );
    runnerMock.start.mockResolvedValue({
      reportInstanceId: 'instance-1',
      status: 'queued',
    });

    const payload = await controller.launchReport(
      'simple-sales-summary',
      {
        params: {
          city: 'Moscow',
        },
      },
      tenantAdminUser,
    );

    expect(payload).toEqual({
      reportInstanceId: 'instance-1',
      status: 'queued',
    });
    expect(runnerMock.start).toHaveBeenCalledTimes(1);
  });

  it('POST /reports/:reportCode/launch returns forbidden for insufficient role', async () => {
    const { controller, registryMock } = createController();

    registryMock.getReport.mockReturnValue(
      createReportDefinition({ minRoleToLaunch: 'TenantAdmin' }),
    );

    await expect(
      controller.launchReport(
        'simple-sales-summary',
        {
          params: {},
        },
        memberUser,
      ),
    ).rejects.toEqual({
      code: 'FORBIDDEN',
      message: 'You do not have access to launch this report.',
    });
  });

  it('GET /reports/:reportCode/instances maps completed records to downloadable urls', async () => {
    const { controller, registryMock, storeMock } = createController();

    registryMock.getReport.mockReturnValue(createReportDefinition());
    storeMock.listByReportCode.mockResolvedValue([
      createValidInstanceRecord({
        status: 'completed',
        stage: 'done',
        finishedAt: '2026-04-22T10:02:00.000Z',
        artifactId: 'artifact-1',
        fileName: 'sales.xlsx',
        byteLength: 1024,
      }),
      createValidInstanceRecord({
        id: 'instance-2',
        status: 'running',
        stage: 'generating',
      }),
    ]);

    const payload = await controller.listReportInstancesByReportCode('simple-sales-summary');

    expect(payload).toEqual([
      {
        id: 'instance-1',
        reportCode: 'simple-sales-summary',
        status: 'completed',
        createdAt: '2026-04-22T10:00:00.000Z',
        finishedAt: '2026-04-22T10:02:00.000Z',
        fileName: 'sales.xlsx',
        byteLength: 1024,
        downloadUrl: '/generated-files/artifact-1',
      },
      {
        id: 'instance-2',
        reportCode: 'simple-sales-summary',
        status: 'running',
        createdAt: '2026-04-22T10:00:00.000Z',
      },
    ]);
  });
});
