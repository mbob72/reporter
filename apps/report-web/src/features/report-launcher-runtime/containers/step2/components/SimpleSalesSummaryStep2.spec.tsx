import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SIMPLE_SALES_SUMMARY_REPORT_CODE } from '@report-platform/contracts';

import { SimpleSalesSummaryStep2 } from './SimpleSalesSummaryStep2';
import type { SimpleSalesSummaryStep2Configuration } from '../types';

describe('SimpleSalesSummaryStep2', () => {
  const baseConfiguration: SimpleSalesSummaryStep2Configuration = {
    reportCode: SIMPLE_SALES_SUMMARY_REPORT_CODE,
    reportTitle: 'Simple Sales Summary',
    reportDescription: 'Report description',
    contextSummary: 'Context',
    constraints: [],
    canLaunch: true,
    initialValues: {
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      credentials: {
        mode: 'manual' as const,
        apiKey: '',
      },
    },
    sharedSettings: [
      {
        id: 'setting-1',
        label: 'Setting 1',
        description: 'Shared setting 1',
      },
      {
        id: 'setting-2',
        label: 'Setting 2',
        description: 'Shared setting 2',
      },
    ],
    sharedSettingsLoading: false,
    sharedSettingsEmptyReason: undefined,
  };

  it('submits shared setting draft and handles back button click', async () => {
    const onLaunchDraft = vi.fn();
    const onBackToReports = vi.fn();

    render(
      <MantineProvider>
        <SimpleSalesSummaryStep2
          configuration={baseConfiguration}
          isLaunching={false}
          onBackToReports={onBackToReports}
          onLaunchDraft={onLaunchDraft}
        />
      </MantineProvider>,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Shared setting' }));
    fireEvent.click(screen.getByRole('button', { name: 'Launch' }));

    await waitFor(() => {
      expect(onLaunchDraft).toHaveBeenCalledWith({
        reportCode: SIMPLE_SALES_SUMMARY_REPORT_CODE,
        params: {
          tenantId: 'tenant-1',
          organizationId: 'org-1',
          credentials: {
            mode: 'shared_setting',
            sharedSettingId: 'setting-1',
          },
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to reports' }));
    expect(onBackToReports).toHaveBeenCalledTimes(1);
  });
});
