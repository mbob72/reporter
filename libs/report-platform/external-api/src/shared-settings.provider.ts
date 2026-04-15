import type { CurrentUser } from '@report-platform/contracts';

export type SharedSettingOption = {
  id: string;
  label: string;
  serviceKey: string;
};

export type ResolvedSharedSettingCredentials = {
  id: string;
  serviceKey: string;
  username: string;
  password: string;
};

export interface SharedSettingsProvider {
  listOptions(params: {
    currentUser: CurrentUser;
    reportCode: string;
    serviceKey: string;
  }): Promise<SharedSettingOption[]>;

  resolveCredentials(params: {
    currentUser: CurrentUser;
    reportCode: string;
    serviceKey: string;
    sharedSettingId: string;
  }): Promise<ResolvedSharedSettingCredentials>;
}
