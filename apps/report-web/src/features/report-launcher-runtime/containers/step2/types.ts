import type {
  SimpleSalesSummaryLaunchParams,
  SimpleSalesSummaryXlsxLaunchParams,
} from '@report-platform/contracts';
import {
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
} from '@report-platform/contracts';

import type { LaunchConfigurationModel } from '../../../report-launcher-story/types';
import type { ReportLaunchDraft } from '../../store/launcherSlice';

export type SharedSettingViewOption = {
  id: string;
  label: string;
  description: string;
};

export type SimpleSalesSummaryStep2Configuration =
  LaunchConfigurationModel<SimpleSalesSummaryLaunchParams> & {
    reportCode: typeof SIMPLE_SALES_SUMMARY_REPORT_CODE;
    sharedSettings: SharedSettingViewOption[];
    sharedSettingsLoading: boolean;
    sharedSettingsEmptyReason?: string;
  };

export type SimpleSalesSummaryXlsxStep2Configuration =
  LaunchConfigurationModel<SimpleSalesSummaryXlsxLaunchParams> & {
    reportCode: typeof SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE;
  };

export type ReportStep2Configuration =
  | SimpleSalesSummaryStep2Configuration
  | SimpleSalesSummaryXlsxStep2Configuration;

export type ReportStep2ComponentProps<TConfiguration extends ReportStep2Configuration> = {
  configuration: TConfiguration;
  isLaunching: boolean;
  onBackToReports?: () => void;
  onLaunchDraft: (draft: ReportLaunchDraft) => void | Promise<void>;
};
