import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  saveLaunchSnapshot,
  setCredentialMode,
  setManualApiKey,
  setParameterValue,
  setSelectedOrganization,
  setSelectedSharedSetting,
  setSelectedTenant,
} from '../../../store/launcherSlice';
import { useStep2LaunchActions } from './useStep2LaunchActions';

const {
  mockUseAppDispatch,
  mockUseAppSelector,
  mockUseNavigate,
  mockUseLaunchReportMutation,
  mockToUiErrorMessage,
} = vi.hoisted(() => ({
  mockUseAppDispatch: vi.fn(),
  mockUseAppSelector: vi.fn(),
  mockUseNavigate: vi.fn(),
  mockUseLaunchReportMutation: vi.fn(),
  mockToUiErrorMessage: vi.fn(),
}));

vi.mock('../../../../../app/hooks', () => ({
  useAppDispatch: mockUseAppDispatch,
  useAppSelector: mockUseAppSelector,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );

  return {
    ...actual,
    useNavigate: mockUseNavigate,
  };
});

vi.mock('../../../api/reportApi', () => ({
  useLaunchReportMutation: mockUseLaunchReportMutation,
}));

vi.mock('../../../lib/toUiErrorMessage', () => ({
  toUiErrorMessage: mockToUiErrorMessage,
}));

type MockRootState = {
  launcher: {
    selectedReportCode: string;
    selectedTenantId: string;
    selectedOrganizationId: string;
  };
};

describe('useStep2LaunchActions', () => {
  const mockDispatch = vi.fn();
  const mockNavigate = vi.fn();
  const mockLaunchReport = vi.fn();
  const mockUnwrap = vi.fn();

  let mockState: MockRootState;

  beforeEach(() => {
    vi.clearAllMocks();

    mockState = {
      launcher: {
        selectedReportCode: 'weather-anomaly-export',
        selectedTenantId: 'tenant-alpha',
        selectedOrganizationId: 'org-north',
      },
    };

    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseAppSelector.mockImplementation(
      (selector: (state: MockRootState) => unknown) => selector(mockState),
    );
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseLaunchReportMutation.mockReturnValue([
      mockLaunchReport,
      { isLoading: false },
    ]);
    mockToUiErrorMessage.mockReturnValue('Failed to launch report (mapped).');
  });

  it('dispatches tenant/organization updates and handles back navigation', () => {
    const { result } = renderHook(() =>
      useStep2LaunchActions({ externalDependencyServiceKey: 'openweather' }),
    );

    act(() => {
      result.current.handleTenantChange('tenant-beta');
      result.current.handleOrganizationChange('org-west');
      result.current.handleBackToReportsClick();
    });

    expect(mockDispatch).toHaveBeenCalledWith(setSelectedTenant('tenant-beta'));
    expect(mockDispatch).toHaveBeenCalledWith(setSelectedOrganization(''));
    expect(mockDispatch).toHaveBeenCalledWith(setSelectedOrganization('org-west'));
    expect(mockNavigate).toHaveBeenCalledWith('/report-launch');
  });

  it('submits launch payload, persists snapshot, and navigates on success', async () => {
    mockUnwrap.mockResolvedValue({ reportInstanceId: 'instance-123' });
    mockLaunchReport.mockReturnValue({ unwrap: mockUnwrap });

    const { result } = renderHook(() =>
      useStep2LaunchActions({ externalDependencyServiceKey: 'openweather' }),
    );

    await act(async () => {
      await result.current.handleLaunchSubmit({
        credentialMode: 'manual',
        manualApiKey: '  ow-live-123  ',
        sharedSettingId: '',
        parameters: {
          period: ' 2026-04 ',
          region: 'EU-Central',
          notes: '   ',
        },
      });
    });

    expect(mockLaunchReport).toHaveBeenCalledWith({
      reportCode: 'weather-anomaly-export',
      params: {
        tenantId: 'tenant-alpha',
        organizationId: 'org-north',
        period: '2026-04',
        region: 'EU-Central',
        credentials: {
          mode: 'manual',
          apiKey: 'ow-live-123',
        },
      },
    });

    expect(mockDispatch).toHaveBeenCalledWith(setCredentialMode('manual'));
    expect(mockDispatch).toHaveBeenCalledWith(setManualApiKey('  ow-live-123  '));
    expect(mockDispatch).toHaveBeenCalledWith(setSelectedSharedSetting(''));
    expect(mockDispatch).toHaveBeenCalledWith(
      setParameterValue({ key: 'period', value: ' 2026-04 ' }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setParameterValue({ key: 'region', value: 'EU-Central' }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      setParameterValue({ key: 'notes', value: '   ' }),
    );

    const saveSnapshotCall = mockDispatch.mock.calls.find(
      ([action]) => action.type === saveLaunchSnapshot.type,
    );

    expect(saveSnapshotCall?.[0]).toMatchObject({
      type: saveLaunchSnapshot.type,
      payload: {
        reportCode: 'weather-anomaly-export',
        selectedTenantId: 'tenant-alpha',
        selectedOrganizationId: 'org-north',
        credentialMode: 'manual',
        selectedSharedSettingId: '',
        manualApiKey: '  ow-live-123  ',
        parameters: {
          period: ' 2026-04 ',
          region: 'EU-Central',
          notes: '   ',
        },
        submittedAt: expect.any(String),
      },
    });

    expect(mockNavigate).toHaveBeenCalledWith('/report-runs/instance-123');
    expect(result.current.launchError).toBeNull();
  });

  it('does not launch when report code is missing', async () => {
    mockState.launcher.selectedReportCode = '';

    const { result } = renderHook(() =>
      useStep2LaunchActions({ externalDependencyServiceKey: 'openweather' }),
    );

    await act(async () => {
      await result.current.handleLaunchSubmit({
        credentialMode: 'manual',
        manualApiKey: 'key',
        sharedSettingId: '',
        parameters: {},
      });
    });

    expect(mockLaunchReport).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('sets mapped launchError when launch mutation fails', async () => {
    const launchError = new Error('network down');
    mockUnwrap.mockRejectedValue(launchError);
    mockLaunchReport.mockReturnValue({ unwrap: mockUnwrap });

    const { result } = renderHook(() =>
      useStep2LaunchActions({ externalDependencyServiceKey: 'openweather' }),
    );

    await act(async () => {
      await result.current.handleLaunchSubmit({
        credentialMode: 'shared_setting',
        manualApiKey: '',
        sharedSettingId: 'openweather-prod',
        parameters: {
          period: '2026-04',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.launchError).toBe('Failed to launch report (mapped).');
    });
    expect(mockToUiErrorMessage).toHaveBeenCalledWith(
      launchError,
      'Failed to launch report.',
    );
    expect(mockNavigate).not.toHaveBeenCalledWith('/report-runs/instance-123');
  });
});
