import type { FormEvent } from 'react';

import {
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
  SimpleSalesSummaryXlsxLaunchParamsSchema,
} from '@report-platform/contracts';

import { Step2LaunchConfigurationCard } from '../../../../report-launcher-story/components/Step2LaunchConfigurationCard';
import type { ReportStep2ComponentProps, SimpleSalesSummaryXlsxStep2Configuration } from '../types';

export function SimpleSalesSummaryXlsxStep2({
  configuration,
  isLaunching,
  onBackToReports,
  onLaunchDraft,
}: ReportStep2ComponentProps<SimpleSalesSummaryXlsxStep2Configuration>) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = SimpleSalesSummaryXlsxLaunchParamsSchema.safeParse(configuration.initialValues);

    if (!parsed.success) {
      return;
    }

    void onLaunchDraft({
      reportCode: SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
      params: parsed.data,
    });
  };

  return (
    <Step2LaunchConfigurationCard
      configuration={configuration}
      onSubmit={handleSubmit}
      onBackToReports={onBackToReports}
      isLaunching={isLaunching}
    />
  );
}
