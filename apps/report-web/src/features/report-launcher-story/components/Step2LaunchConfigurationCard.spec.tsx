import type { ComponentProps } from 'react';
import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Step2LaunchConfigurationCard } from './Step2LaunchConfigurationCard';
import type { LaunchConfigurationModel } from '../types';

type LaunchConfigurationOverrides = Partial<
  Omit<LaunchConfigurationModel, 'credentials' | 'parameterFields'>
> & {
  credentials?: Partial<LaunchConfigurationModel['credentials']>;
  parameterFields?: LaunchConfigurationModel['parameterFields'];
};

function createConfiguration(
  partial: LaunchConfigurationOverrides = {},
): LaunchConfigurationModel {
  const baseConfiguration: LaunchConfigurationModel = {
    reportCode: 'weather-anomaly-export',
    reportTitle: 'Weather Anomaly Export',
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
    parameterFields: [
      {
        key: 'period',
        label: 'Reporting period',
        placeholder: '2026-03',
        required: true,
        value: '2026-03',
      },
    ],
    credentials: {
      manualLabel: 'Manual API key',
      sharedLabel: 'Shared setting',
      defaultMode: 'manual',
      manualApiKey: '',
      sharedSettings: [
        {
          id: 'openweather-prod',
          label: 'OpenWeather / Production',
          description: 'Managed by Platform team.',
        },
      ],
      selectedSharedSettingId: 'openweather-prod',
      sharedModeDisabled: false,
    },
    canLaunch: true,
    externalDependency: 'OpenWeather API key',
  };

  return {
    ...baseConfiguration,
    ...partial,
    credentials: {
      ...baseConfiguration.credentials,
      ...partial.credentials,
    },
    parameterFields: partial.parameterFields ?? baseConfiguration.parameterFields,
  };
}

function renderComponent(
  configuration: LaunchConfigurationModel,
  props: Partial<ComponentProps<typeof Step2LaunchConfigurationCard>> = {},
) {
  return render(
    <MantineProvider>
      <Step2LaunchConfigurationCard configuration={configuration} {...props} />
    </MantineProvider>,
  );
}

describe('Step2LaunchConfigurationCard', () => {
  it('submits payload when form is valid', async () => {
    const onLaunch = vi.fn();
    const onManualApiKeyChange = vi.fn();
    const onParameterChange = vi.fn();
    const configuration = createConfiguration();

    renderComponent(configuration, {
      onLaunch,
      onManualApiKeyChange,
      onParameterChange,
    });

    fireEvent.change(screen.getByLabelText('OpenWeather API key'), {
      target: { value: 'ow-live-123' },
    });
    fireEvent.change(screen.getByPlaceholderText('2026-03'), {
      target: { value: '2026-04' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Launch' }));

    await waitFor(() => {
      expect(onLaunch).toHaveBeenCalledWith({
        credentialMode: 'manual',
        manualApiKey: 'ow-live-123',
        sharedSettingId: 'openweather-prod',
        parameters: {
          period: '2026-04',
        },
      });
    });
    expect(onManualApiKeyChange).toHaveBeenCalledWith('ow-live-123');
    expect(onParameterChange).toHaveBeenCalledWith('period', '2026-04');
  });

  it('shows validation error when manual API key is empty for external dependency', async () => {
    const onLaunch = vi.fn();
    const configuration = createConfiguration({
      credentials: {
        defaultMode: 'manual',
        manualApiKey: '',
      },
    });

    renderComponent(configuration, { onLaunch });
    fireEvent.click(screen.getByRole('button', { name: 'Launch' }));

    await waitFor(() => {
      expect(screen.getByText('Введите API key для manual режима.')).toBeTruthy();
    });
    expect(onLaunch).not.toHaveBeenCalled();
  });

  it('prevents submit when required parameter is empty and allows submit after value is provided', async () => {
    const onLaunch = vi.fn();
    const configuration = createConfiguration({
      externalDependency: undefined,
      parameterFields: [
        {
          key: 'period',
          label: 'Reporting period',
          placeholder: '2026-03',
          required: true,
          value: '',
        },
      ],
    });

    renderComponent(configuration, { onLaunch });
    fireEvent.click(screen.getByRole('button', { name: 'Launch' }));

    await waitFor(() => {
      expect(onLaunch).not.toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText('2026-03'), {
      target: { value: '2026-04' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Launch' }));

    await waitFor(() => {
      expect(onLaunch).toHaveBeenCalledWith({
        credentialMode: 'manual',
        manualApiKey: '',
        sharedSettingId: 'openweather-prod',
        parameters: {
          period: '2026-04',
        },
      });
    });
  });

  it('requires shared setting when shared credential mode is selected', async () => {
    const onLaunch = vi.fn();
    const onCredentialModeChange = vi.fn();
    const configuration = createConfiguration({
      credentials: {
        defaultMode: 'shared_setting',
        selectedSharedSettingId: '',
      },
    });

    renderComponent(configuration, { onLaunch, onCredentialModeChange });
    fireEvent.click(screen.getByRole('radio', { name: 'Manual API key' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Shared setting' }));
    fireEvent.click(screen.getByRole('button', { name: 'Launch' }));

    await waitFor(() => {
      expect(screen.getByText('Выберите shared setting перед запуском.')).toBeTruthy();
    });
    expect(onCredentialModeChange).toHaveBeenCalledWith('shared_setting');
    expect(onLaunch).not.toHaveBeenCalled();
  });
});
