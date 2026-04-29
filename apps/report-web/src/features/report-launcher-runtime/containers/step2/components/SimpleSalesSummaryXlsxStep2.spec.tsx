import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS,
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
} from '@report-platform/contracts';

import { SimpleSalesSummaryXlsxStep2 } from './SimpleSalesSummaryXlsxStep2';
import type { SimpleSalesSummaryXlsxStep2Configuration } from '../types';

describe('SimpleSalesSummaryXlsxStep2', () => {
  const baseConfiguration: SimpleSalesSummaryXlsxStep2Configuration = {
    reportCode: SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
    reportTitle: 'Simple Sales Summary XLSX',
    reportDescription: 'Report description',
    contextSummary: 'Context',
    constraints: [],
    canLaunch: true,
    initialValues: {
      name: 'Pavel',
      job: 'Engineer',
      email: 'pavel@example.com',
      favoriteColor: '#abc',
      age: 30,
      website: 'https://example.com',
      role: 'developer',
      datasetKey: SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS[0],
    },
  };

  it('submits launch draft and handles back button click', async () => {
    const onLaunchDraft = vi.fn();
    const onBackToReports = vi.fn();

    render(
      <MantineProvider>
        <SimpleSalesSummaryXlsxStep2
          configuration={baseConfiguration}
          isLaunching={false}
          onBackToReports={onBackToReports}
          onLaunchDraft={onLaunchDraft}
        />
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Launch' }));

    await waitFor(() => {
      expect(onLaunchDraft).toHaveBeenCalledWith({
        reportCode: SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
        params: {
          name: 'Pavel',
          job: 'Engineer',
          email: 'pavel@example.com',
          favoriteColor: '#abc',
          age: 30,
          website: 'https://example.com',
          role: 'developer',
          datasetKey: SIMPLE_SALES_SUMMARY_XLSX_DATASET_KEYS[0],
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to reports' }));
    expect(onBackToReports).toHaveBeenCalledTimes(1);
  });
});
