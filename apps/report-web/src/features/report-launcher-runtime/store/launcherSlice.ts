import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { CredentialsMode } from '../../report-launcher-story/types';

export type LaunchSnapshot = {
  reportCode: string;
  selectedTenantId: string;
  selectedOrganizationId: string;
  credentialMode: CredentialsMode;
  selectedSharedSettingId: string;
  manualApiKey: string;
  parameters: Record<string, string>;
  submittedAt: string;
};

type LauncherState = {
  selectedReportCode: string;
  selectedTenantId: string;
  selectedOrganizationId: string;
  credentialMode: CredentialsMode;
  selectedSharedSettingId: string;
  manualApiKey: string;
  parameterValues: Record<string, string>;
  launchSnapshot: LaunchSnapshot | null;
};

const initialState: LauncherState = {
  selectedReportCode: '',
  selectedTenantId: '',
  selectedOrganizationId: '',
  credentialMode: 'manual',
  selectedSharedSettingId: '',
  manualApiKey: '',
  parameterValues: {},
  launchSnapshot: null,
};

const launcherSlice = createSlice({
  name: 'launcher',
  initialState,
  reducers: {
    selectReport(state, action: PayloadAction<string>) {
      state.selectedReportCode = action.payload;
    },
    setSelectedTenant(state, action: PayloadAction<string>) {
      state.selectedTenantId = action.payload;
    },
    setSelectedOrganization(state, action: PayloadAction<string>) {
      state.selectedOrganizationId = action.payload;
    },
    setCredentialMode(state, action: PayloadAction<CredentialsMode>) {
      state.credentialMode = action.payload;
    },
    setSelectedSharedSetting(state, action: PayloadAction<string>) {
      state.selectedSharedSettingId = action.payload;
    },
    setManualApiKey(state, action: PayloadAction<string>) {
      state.manualApiKey = action.payload;
    },
    setParameterValue(
      state,
      action: PayloadAction<{ key: string; value: string }>,
    ) {
      state.parameterValues[action.payload.key] = action.payload.value;
    },
    setParameterValues(state, action: PayloadAction<Record<string, string>>) {
      state.parameterValues = {
        ...state.parameterValues,
        ...action.payload,
      };
    },
    saveLaunchDraft(
      state,
      action: PayloadAction<{
        selectedTenantId?: string;
        selectedOrganizationId?: string;
        credentialMode?: CredentialsMode;
        selectedSharedSettingId?: string;
        manualApiKey?: string;
        parameterValues?: Record<string, string>;
      }>,
    ) {
      if (typeof action.payload.selectedTenantId === 'string') {
        state.selectedTenantId = action.payload.selectedTenantId;
      }

      if (typeof action.payload.selectedOrganizationId === 'string') {
        state.selectedOrganizationId = action.payload.selectedOrganizationId;
      }

      if (typeof action.payload.credentialMode === 'string') {
        state.credentialMode = action.payload.credentialMode;
      }

      if (typeof action.payload.selectedSharedSettingId === 'string') {
        state.selectedSharedSettingId = action.payload.selectedSharedSettingId;
      }

      if (typeof action.payload.manualApiKey === 'string') {
        state.manualApiKey = action.payload.manualApiKey;
      }

      if (action.payload.parameterValues) {
        state.parameterValues = {
          ...state.parameterValues,
          ...action.payload.parameterValues,
        };
      }
    },
    saveLaunchSnapshot(state, action: PayloadAction<LaunchSnapshot>) {
      state.launchSnapshot = action.payload;
    },
    resetLaunchDraft(state) {
      state.selectedTenantId = '';
      state.selectedOrganizationId = '';
      state.credentialMode = 'manual';
      state.selectedSharedSettingId = '';
      state.manualApiKey = '';
      state.parameterValues = {};
      state.launchSnapshot = null;
    },
  },
});

export const {
  selectReport,
  setSelectedTenant,
  setSelectedOrganization,
  setCredentialMode,
  setSelectedSharedSetting,
  setManualApiKey,
  setParameterValue,
  setParameterValues,
  saveLaunchDraft,
  saveLaunchSnapshot,
  resetLaunchDraft,
} = launcherSlice.actions;
export const launcherReducer = launcherSlice.reducer;
