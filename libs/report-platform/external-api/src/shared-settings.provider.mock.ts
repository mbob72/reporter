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
  username: string;
  password: string;
};

const mockSharedSettings: MockSharedSettingRecord[] = [
  {
    id: 'tenant-1-broker-default',
    label: 'Tenant 1 Broker Default',
    serviceKey: 'brokerApi',
    tenantId: 'tenant-1',
    allowedReportCodes: ['broker-portfolio-summary'],
    username: 'tenant1-broker-user',
    password: 'tenant1-broker-pass',
  },
  {
    id: 'tenant-1-broker-backup',
    label: 'Tenant 1 Broker Backup',
    serviceKey: 'brokerApi',
    tenantId: 'tenant-1',
    allowedReportCodes: ['broker-portfolio-summary'],
    username: 'tenant1-backup-user',
    password: 'tenant1-backup-pass',
  },
  {
    id: 'tenant-2-broker-default',
    label: 'Tenant 2 Broker Default',
    serviceKey: 'brokerApi',
    tenantId: 'tenant-2',
    allowedReportCodes: ['broker-portfolio-summary'],
    username: 'tenant2-broker-user',
    password: 'tenant2-broker-pass',
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
      username: setting.username,
      password: setting.password,
    };
  }
}
