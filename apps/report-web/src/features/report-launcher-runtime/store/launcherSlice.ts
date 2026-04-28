import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type {
  SimpleSalesSummaryLaunchParams,
  SimpleSalesSummaryXlsxLaunchParams,
} from '@report-platform/contracts';
import {
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
} from '@report-platform/contracts';

export type LaunchSnapshot = {
  draft: ReportLaunchDraft;
  submittedAt: string;
};

export type ReportLaunchDraft =
  | {
      reportCode: typeof SIMPLE_SALES_SUMMARY_REPORT_CODE;
      params: SimpleSalesSummaryLaunchParams;
    }
  | {
      reportCode: typeof SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE;
      params: SimpleSalesSummaryXlsxLaunchParams;
    };

type LauncherState = {
  selectedReportCode: string;
  selectedTenantId: string;
  selectedOrganizationId: string;
  launchDraft: ReportLaunchDraft | null;
  launchSnapshot: LaunchSnapshot | null;
};

const initialState: LauncherState = {
  selectedReportCode: '',
  selectedTenantId: '',
  selectedOrganizationId: '',
  launchDraft: null,
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
    saveLaunchDraft(state, action: PayloadAction<ReportLaunchDraft>) {
      state.launchDraft = action.payload;
    },
    saveLaunchSnapshot(state, action: PayloadAction<LaunchSnapshot>) {
      state.launchSnapshot = action.payload;
    },
    resetLaunchDraft(state) {
      state.selectedTenantId = '';
      state.selectedOrganizationId = '';
      state.launchDraft = null;
      state.launchSnapshot = null;
    },
  },
});

export const {
  selectReport,
  setSelectedTenant,
  setSelectedOrganization,
  saveLaunchDraft,
  saveLaunchSnapshot,
  resetLaunchDraft,
} = launcherSlice.actions;
export const launcherReducer = launcherSlice.reducer;
