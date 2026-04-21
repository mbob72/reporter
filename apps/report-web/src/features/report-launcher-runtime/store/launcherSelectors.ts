import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '../../../app/store';
import { reportApi } from '../api/reportApi';

export const selectSelectedReportCode = (state: RootState) =>
  state.launcher.selectedReportCode;

const selectReportListQueryResult = reportApi.endpoints.listReports.select();

export const selectReportList = createSelector(
  selectReportListQueryResult,
  (reportListQueryResult) => reportListQueryResult.data ?? [],
);

export const selectSelectedReport = createSelector(
  selectReportList,
  selectSelectedReportCode,
  (reportList, selectedReportCode) =>
    reportList.find((report) => report.code === selectedReportCode),
);
