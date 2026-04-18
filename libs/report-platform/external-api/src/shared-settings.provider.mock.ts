import type { ApiError, CurrentUser } from '@report-platform/contracts';

import type {
  ResolvedSharedSettingCredentials,
  SharedSettingOption,
  SharedSettingsProvider,
} from './shared-settings.provider';

type MockSharedSettingRecord = {
  id: string;
  label: string;
  serviceKey: string;
  tenantId: string;
  allowedReportCodes: string[];
  apiKey: string;
};

const mockSharedSettings: MockSharedSettingRecord[] = [
  // TEMPORARY FOR LOCAL SPEED ONLY:
  // Hardcoded API keys must not live in source code.
  // Move these values to a secure secret store / environment-backed configuration.
  {
    id: 'tenant-1-weather-default',
    label: 'Tenant 1 Weather Default',
    serviceKey: 'openWeather',
    tenantId: 'tenant-1',
    allowedReportCodes: ['simple-sales-summary'],
    apiKey: 'c93680e6b9eca47e5cebf5bf34a9b473',
  },
  {
    id: 'tenant-1-weather-backup',
    label: 'Tenant 1 Weather Backup',
    serviceKey: 'openWeather',
    tenantId: 'tenant-1',
    allowedReportCodes: ['simple-sales-summary'],
    apiKey: 'd97d7fa23de6885660ccbb616107bb18',
  },
  {
    id: 'tenant-2-weather-default',
    label: 'Tenant 2 Weather Default',
    serviceKey: 'openWeather',
    tenantId: 'tenant-2',
    allowedReportCodes: ['simple-sales-summary'],
    apiKey: 'd97d7fa23de6885660ccbb616107bb18',
  },
];

function throwForbidden(): never {
  throw {
    code: 'FORBIDDEN',
    message: 'Current user cannot use shared settings.',
  } satisfies ApiError;
}

function throwNotFound(): never {
  throw {
    code: 'NOT_FOUND',
    message: 'Shared setting not found for this report context.',
  } satisfies ApiError;
}

function canReadSharedSettings(role: CurrentUser['role']): boolean {
  return role === 'Admin' || role === 'TenantAdmin';
}

function isVisibleToUser(
  setting: MockSharedSettingRecord,
  currentUser: CurrentUser,
): boolean {
  if (currentUser.role === 'Admin') {
    return true;
  }

  if (currentUser.role === 'TenantAdmin') {
    return currentUser.tenantId === setting.tenantId;
  }

  return false;
}

function matchesReportContext(
  setting: MockSharedSettingRecord,
  reportCode: string,
  serviceKey: string,
): boolean {
  return (
    setting.serviceKey === serviceKey &&
    setting.allowedReportCodes.includes(reportCode)
  );
}

export class MockSharedSettingsProvider implements SharedSettingsProvider {
  async listOptions(params: {
    currentUser: CurrentUser;
    reportCode: string;
    serviceKey: string;
  }): Promise<SharedSettingOption[]> {
    if (!canReadSharedSettings(params.currentUser.role)) {
      return [];
    }

    return mockSharedSettings
      .filter((setting) =>
        matchesReportContext(setting, params.reportCode, params.serviceKey),
      )
      .filter((setting) => isVisibleToUser(setting, params.currentUser))
      .map((setting) => ({
        id: setting.id,
        label: setting.label,
        serviceKey: setting.serviceKey,
      }));
  }

  async resolveCredentials(params: {
    currentUser: CurrentUser;
    reportCode: string;
    serviceKey: string;
    sharedSettingId: string;
  }): Promise<ResolvedSharedSettingCredentials> {
    if (!canReadSharedSettings(params.currentUser.role)) {
      throwForbidden();
    }

    const setting = mockSharedSettings.find(
      (candidate) => candidate.id === params.sharedSettingId,
    );

    if (!setting) {
      throwNotFound();
    }

    if (!isVisibleToUser(setting, params.currentUser)) {
      throwForbidden();
    }

    if (!matchesReportContext(setting, params.reportCode, params.serviceKey)) {
      throwNotFound();
    }

    return {
      id: setting.id,
      serviceKey: setting.serviceKey,
      apiKey: setting.apiKey,
    };
  }
}
