import type { ComponentProps, FormEvent } from 'react';
import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Step2LaunchConfigurationCard } from './Step2LaunchConfigurationCard';
import type { LaunchConfigurationModel } from '../types';

type Step2FormValues = {
  datasetKey?: string;
};

function createConfiguration(
  partial: Partial<LaunchConfigurationModel<Step2FormValues>> = {},
): LaunchConfigurationModel<Step2FormValues> {
  return {
    reportCode: 'simple-sales-summary',
    reportTitle: 'Simple Sales Summary',
    reportDescription: 'Builds XLSX report enriched with weather metrics.',
    contextSummary: 'Execution context: tenant mode.',
    constraints: [
      {
        id: 'constraint-1',
        label: 'Role gate',
        details: 'Minimum role: TenantAdmin',
        severity: 'info',
      },
    ],
    canLaunch: true,
    initialValues: {},
    ...partial,
  };
}

function renderComponent(
  configuration: LaunchConfigurationModel<Step2FormValues>,
  props: Partial<ComponentProps<typeof Step2LaunchConfigurationCard>> = {},
) {
  return render(
    <MantineProvider>
      <Step2LaunchConfigurationCard configuration={configuration} {...props}>
        <div>Custom step 2 content</div>
      </Step2LaunchConfigurationCard>
    </MantineProvider>,
  );
}

describe('Step2LaunchConfigurationCard', () => {
  it('renders configuration context and custom children', () => {
    renderComponent(createConfiguration());

    expect(screen.getByText('Launch Configuration')).toBeTruthy();
    expect(screen.getByText('Simple Sales Summary')).toBeTruthy();
    expect(screen.getByText('Custom step 2 content')).toBeTruthy();
    expect(screen.getByText('Role gate')).toBeTruthy();
  });

  it('submits form when launch button is clicked', () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    renderComponent(createConfiguration(), { onSubmit });
    fireEvent.click(screen.getByRole('button', { name: 'Launch' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls back handler when clicking Back to reports', () => {
    const onBackToReports = vi.fn();

    renderComponent(createConfiguration(), { onBackToReports });
    fireEvent.click(screen.getByRole('button', { name: 'Back to reports' }));

    expect(onBackToReports).toHaveBeenCalledTimes(1);
  });

  it('shows disabled reason and disables launch button when launch is blocked', () => {
    renderComponent(
      createConfiguration({
        canLaunch: false,
        disabledReason: 'Insufficient role',
      }),
    );

    expect(screen.getByText('Insufficient role')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Launch' })).toHaveProperty('disabled', true);
  });
});
