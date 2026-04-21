import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from 'react-redux';
import { createMemoryRouter } from 'react-router-dom';

import { type MockUserId } from '@report-platform/auth';

import { App } from './App';
import { appRoutes } from './app/router/router';
import type { AppStore } from './app/store';
import {
  resetLaunchDraft,
  selectReport,
  setCredentialMode,
  setSelectedOrganization,
  setSelectedSharedSetting,
  setSelectedTenant,
} from './features/report-launcher-runtime/store/launcherSlice';
import { selectMockUser } from './features/report-launcher-runtime/store/sessionSlice';

type RuntimeBootstrapState = {
  selectedMockUserId?: MockUserId;
  selectedReportCode?: string;
  selectedTenantId?: string;
  selectedOrganizationId?: string;
  credentialMode?: 'manual' | 'shared_setting';
  selectedSharedSettingId?: string;
};

type AppStoryProps = {
  initialPath: string;
  bootstrapState?: RuntimeBootstrapState;
};

const reportListPayload = [
  {
    code: 'simple-sales-summary',
    title: 'Simple Sales Summary XLSX',
    description:
      'Template-based XLSX with tenant, organization, current sales, and current air temperature.',
    minRoleToLaunch: 'TenantAdmin',
  },
  {
    code: 'simple-sales-summary-xlsx',
    title: 'Pelmeni Product × Channel Matrix XLSX',
    description:
      'Template-based XLSX report built from products and channel scenarios with recalculated formulas.',
    minRoleToLaunch: 'TenantAdmin',
  },
] as const;

const reportMetadataPayloadByCode: Record<string, unknown> = {
  'simple-sales-summary': {
    code: 'simple-sales-summary',
    title: 'Simple Sales Summary XLSX',
    description:
      'Template-based XLSX with tenant, organization, current sales, and current air temperature.',
    minRoleToLaunch: 'TenantAdmin',
    fields: [],
    externalDependencies: [
      {
        serviceKey: 'openWeather',
        authMode: 'api_key',
        minRoleToUse: 'TenantAdmin',
      },
    ],
  },
  'simple-sales-summary-xlsx': {
    code: 'simple-sales-summary-xlsx',
    title: 'Pelmeni Product × Channel Matrix XLSX',
    description:
      'Template-based XLSX report built from products and channel scenarios with recalculated formulas.',
    minRoleToLaunch: 'TenantAdmin',
    fields: [],
    externalDependencies: [],
  },
};

const tenantsPayload = [
  {
    id: 'tenant-1',
    name: 'Tenant 1',
  },
];

const organizationsPayloadByTenant: Record<string, unknown> = {
  'tenant-1': [
    {
      id: 'org-1',
      name: 'Organization 1',
      tenantId: 'tenant-1',
    },
  ],
};

const sharedSettingsPayloadByContext: Record<string, unknown> = {
  'simple-sales-summary:openWeather': [
    {
      id: 'tenant-1-weather-default',
      label: 'Tenant 1 Weather Default',
      serviceKey: 'openWeather',
    },
    {
      id: 'tenant-1-weather-backup',
      label: 'Tenant 1 Weather Backup',
      serviceKey: 'openWeather',
    },
  ],
};

const reportInstancesPayloadById: Record<string, unknown> = {
  'instance-running-1': {
    id: 'instance-running-1',
    reportCode: 'simple-sales-summary',
    status: 'running',
    stage: 'generating',
    progressPercent: 72,
    createdAt: '2026-04-20T09:00:00.000Z',
    startedAt: '2026-04-20T09:00:03.000Z',
  },
  'instance-completed-1': {
    id: 'instance-completed-1',
    reportCode: 'simple-sales-summary',
    status: 'completed',
    stage: 'done',
    progressPercent: 100,
    createdAt: '2026-04-20T08:30:00.000Z',
    startedAt: '2026-04-20T08:30:02.000Z',
    finishedAt: '2026-04-20T08:30:20.000Z',
    result: {
      kind: 'downloadable-file',
      fileName: 'simple-sales-summary-tenant-1.xlsx',
      byteLength: 48124,
      downloadUrl: '/generated-files/instance-completed-1',
    },
    artifactId: 'instance-completed-1',
    fileName: 'simple-sales-summary-tenant-1.xlsx',
    byteLength: 48124,
  },
};

const reportInstancesByReportCodePayload: Record<string, unknown> = {
  'simple-sales-summary': [
    {
      id: 'instance-completed-1',
      reportCode: 'simple-sales-summary',
      status: 'completed',
      createdAt: '2026-04-20T08:30:00.000Z',
      finishedAt: '2026-04-20T08:30:20.000Z',
      fileName: 'simple-sales-summary-tenant-1.xlsx',
      byteLength: 48124,
      downloadUrl: '/generated-files/instance-completed-1',
    },
    {
      id: 'instance-completed-0',
      reportCode: 'simple-sales-summary',
      status: 'completed',
      createdAt: '2026-04-20T07:40:00.000Z',
      finishedAt: '2026-04-20T07:40:17.000Z',
      fileName: 'simple-sales-summary-tenant-1-older.xlsx',
      byteLength: 47210,
      downloadUrl: '/generated-files/instance-completed-0',
    },
  ],
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function installMockApiFetch(): () => void {
  const originalFetch = globalThis.fetch;
  const mockedFetch: typeof fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url, window.location.origin);
    const pathname = url.pathname;
    const method = request.method.toUpperCase();
    const pathParts = pathname.split('/').filter(Boolean);

    if (
      pathParts.length === 0 ||
      (pathParts[0] !== 'reports' &&
        pathParts[0] !== 'tenants' &&
        pathParts[0] !== 'report-runs')
    ) {
      return originalFetch(input, init);
    }

    if (method === 'GET' && pathParts.length === 1 && pathParts[0] === 'reports') {
      return jsonResponse(reportListPayload);
    }

    if (
      method === 'GET' &&
      pathParts.length === 3 &&
      pathParts[0] === 'reports' &&
      pathParts[2] === 'metadata'
    ) {
      const reportCode = decodeURIComponent(pathParts[1]);
      const metadata = reportMetadataPayloadByCode[reportCode];

      if (!metadata) {
        return jsonResponse({ message: 'Unknown report.' }, 404);
      }

      return jsonResponse(metadata);
    }

    if (
      method === 'GET' &&
      pathParts.length === 5 &&
      pathParts[0] === 'reports' &&
      pathParts[2] === 'external-services' &&
      pathParts[4] === 'shared-settings'
    ) {
      const reportCode = decodeURIComponent(pathParts[1]);
      const serviceKey = decodeURIComponent(pathParts[3]);
      const payload = sharedSettingsPayloadByContext[`${reportCode}:${serviceKey}`] ?? [];

      return jsonResponse(payload);
    }

    if (
      method === 'GET' &&
      pathParts.length === 3 &&
      pathParts[0] === 'reports' &&
      pathParts[2] === 'instances'
    ) {
      const reportCode = decodeURIComponent(pathParts[1]);
      const payload = reportInstancesByReportCodePayload[reportCode] ?? [];

      return jsonResponse(payload);
    }

    if (
      method === 'POST' &&
      pathParts.length === 3 &&
      pathParts[0] === 'reports' &&
      pathParts[2] === 'launch'
    ) {
      return jsonResponse({
        reportInstanceId: 'instance-from-story-launch',
        status: 'queued',
      });
    }

    if (method === 'GET' && pathParts.length === 1 && pathParts[0] === 'tenants') {
      return jsonResponse(tenantsPayload);
    }

    if (
      method === 'GET' &&
      pathParts.length === 3 &&
      pathParts[0] === 'tenants' &&
      pathParts[2] === 'organizations'
    ) {
      const tenantId = decodeURIComponent(pathParts[1]);
      const payload = organizationsPayloadByTenant[tenantId] ?? [];

      return jsonResponse(payload);
    }

    if (method === 'GET' && pathParts.length === 2 && pathParts[0] === 'report-runs') {
      const reportInstanceId = decodeURIComponent(pathParts[1]);
      const instancePayload = reportInstancesPayloadById[reportInstanceId];

      if (!instancePayload) {
        return jsonResponse({ message: 'Unknown report instance.' }, 404);
      }

      return jsonResponse(instancePayload);
    }

    return jsonResponse({ message: 'Unhandled mocked API endpoint.' }, 404);
  };

  globalThis.fetch = mockedFetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

function bootstrapStore(store: AppStore, bootstrapState: RuntimeBootstrapState | undefined) {
  store.dispatch(resetLaunchDraft());
  store.dispatch(selectMockUser(bootstrapState?.selectedMockUserId ?? 'tenant-admin-1'));

  if (bootstrapState?.selectedReportCode) {
    store.dispatch(selectReport(bootstrapState.selectedReportCode));
  }

  if (bootstrapState?.selectedTenantId) {
    store.dispatch(setSelectedTenant(bootstrapState.selectedTenantId));
  }

  if (bootstrapState?.selectedOrganizationId) {
    store.dispatch(setSelectedOrganization(bootstrapState.selectedOrganizationId));
  }

  if (bootstrapState?.credentialMode) {
    store.dispatch(setCredentialMode(bootstrapState.credentialMode));
  }

  if (bootstrapState?.selectedSharedSettingId) {
    store.dispatch(setSelectedSharedSetting(bootstrapState.selectedSharedSettingId));
  }
}

function AppStoryRuntime({ initialPath, bootstrapState }: AppStoryProps) {
  const store = useStore() as AppStore;
  const [isReady, setIsReady] = useState(false);
  const router = useMemo(
    () => createMemoryRouter(appRoutes, { initialEntries: [initialPath] }),
    [initialPath],
  );

  useEffect(() => {
    const restoreFetch = installMockApiFetch();
    bootstrapStore(store, bootstrapState);
    setIsReady(true);

    return () => {
      restoreFetch();
      setIsReady(false);
    };
  }, [bootstrapState, store]);

  if (!isReady) {
    return null;
  }

  return <App router={router} />;
}

const meta = {
  title: 'Report Launcher Runtime/App',
  component: AppStoryRuntime,
  tags: ['autodocs'],
  parameters: {
    withRouter: false,
  },
} satisfies Meta<typeof AppStoryRuntime>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Step1SelectionRoute: Story = {
  args: {
    initialPath: '/report-launch',
    bootstrapState: {
      selectedMockUserId: 'tenant-admin-1',
    },
  },
};

export const Step2ConfigureRoute: Story = {
  args: {
    initialPath: '/report-launch/configure',
    bootstrapState: {
      selectedMockUserId: 'tenant-admin-1',
      selectedReportCode: 'simple-sales-summary',
      selectedTenantId: 'tenant-1',
      selectedOrganizationId: 'org-1',
      credentialMode: 'shared_setting',
      selectedSharedSettingId: 'tenant-1-weather-default',
    },
  },
};

export const Step3ProgressRoute: Story = {
  args: {
    initialPath: '/report-runs/instance-running-1',
    bootstrapState: {
      selectedMockUserId: 'tenant-admin-1',
    },
  },
};

export const Step4ResultRoute: Story = {
  args: {
    initialPath: '/report-runs/instance-completed-1/result',
    bootstrapState: {
      selectedMockUserId: 'tenant-admin-1',
    },
  },
};
