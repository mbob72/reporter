import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LauncherUser, ReportSelectionItem } from '../types';
import { Step1ReportSelectionCard } from './Step1ReportSelectionCard';

const users: LauncherUser[] = [
  {
    id: 'tenant-admin-1',
    name: 'Tenant Admin',
    role: 'TenantAdmin',
    tenantScope: ['tenant-1'],
    organizationScope: [],
  },
];

const reports: ReportSelectionItem[] = [
  {
    code: 'weather-anomaly-export',
    name: 'Weather Anomaly Export',
    description: 'External dependency report.',
    minRoleToLaunch: 'TenantAdmin',
    availability: 'available',
  },
];

function renderComponent(
  readyInstances: Parameters<typeof Step1ReportSelectionCard>[0]['readyInstances'],
) {
  render(
    <MantineProvider>
      <Step1ReportSelectionCard
        users={users}
        reports={reports}
        selectedUserId="tenant-admin-1"
        selectedReportCode="weather-anomaly-export"
        readyInstances={readyInstances}
      />
    </MantineProvider>,
  );
}

describe('Step1ReportSelectionCard', () => {
  it('renders live links for ready instances when access is allowed', () => {
    renderComponent({
      count: 2,
      canOpenLinks: true,
      items: [
        {
          id: 'instance-1',
          label: 'weather-anomaly-export-1.xlsx',
          downloadHref: '/generated-files/instance-1',
          createdAtLabel: '2026-04-21 10:00',
          finishedAtLabel: '2026-04-21 10:01',
          sizeLabel: '1.2 MB',
        },
        {
          id: 'instance-2',
          label: 'weather-anomaly-export-2.xlsx',
          downloadHref: '/generated-files/instance-2',
          createdAtLabel: '2026-04-21 11:00',
          finishedAtLabel: '2026-04-21 11:01',
          sizeLabel: '1.3 MB',
        },
      ],
    });

    expect(screen.getByText('Ready Instances (2)')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Download' }).length).toBe(2);

    expect(screen.getByText('Selected instance')).toBeTruthy();
    expect(screen.getByText('id: instance-1')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'weather-anomaly-export-2.xlsx' }));
    expect(screen.getByText('id: instance-2')).toBeTruthy();
    expect(
      screen.queryByText('Insufficient role for detailed access. Showing total completed count only.'),
    ).toBeNull();
  });

  it('shows only count without links when access is restricted', () => {
    renderComponent({
      count: 3,
      canOpenLinks: false,
      items: [],
    });

    expect(screen.getByText('Ready Instances (3)')).toBeTruthy();
    expect(
      screen.getByText(
        'Insufficient role for detailed access. Showing total completed count only.',
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
