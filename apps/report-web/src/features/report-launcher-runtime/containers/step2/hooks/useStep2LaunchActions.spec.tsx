import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
} from '@report-platform/contracts';

import {
  saveLaunchDraft,
  saveLaunchSnapshot,
  type ReportLaunchDraft,
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
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

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
  };
};

function createSimpleSalesDraft(): ReportLaunchDraft {
  return {
    reportCode: SIMPLE_SALES_SUMMARY_REPORT_CODE,
    params: {
      tenantId: 'tenant-alpha',
      organizationId: 'org-north',
      credentials: {
        mode: 'manual',
        apiKey: 'ow-live-123',
      },
    },
  };
}

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
        selectedReportCode: SIMPLE_SALES_SUMMARY_REPORT_CODE,
      },
    };

    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseAppSelector.mockImplementation((selector: (state: MockRootState) => unknown) =>
      selector(mockState),
    );
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseLaunchReportMutation.mockReturnValue([mockLaunchReport, { isLoading: false }]);
    mockToUiErrorMessage.mockReturnValue('Failed to launch report (mapped).');
  });

  it('handles back navigation', () => {
    const { result } = renderHook(() => useStep2LaunchActions());

    act(() => {
      result.current.handleBackToReportsClick();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/report-launch');
  });

  it('submits typed draft, saves snapshot, and navigates on success', async () => {
    mockUnwrap.mockResolvedValue({ reportInstanceId: 'instance-123' });
    mockLaunchReport.mockReturnValue({ unwrap: mockUnwrap });

    const { result } = renderHook(() => useStep2LaunchActions());
    const draft = createSimpleSalesDraft();

    await act(async () => {
      await result.current.handleLaunchSubmit(draft);
    });

    expect(mockDispatch).toHaveBeenCalledWith(saveLaunchDraft(draft));
    expect(mockLaunchReport).toHaveBeenCalledWith({
      reportCode: SIMPLE_SALES_SUMMARY_REPORT_CODE,
      params: draft.params,
    });

    const saveSnapshotCall = mockDispatch.mock.calls.find(
      ([action]) => action.type === saveLaunchSnapshot.type,
    );

    expect(saveSnapshotCall?.[0]).toMatchObject({
      type: saveLaunchSnapshot.type,
      payload: {
        draft,
        submittedAt: expect.any(String),
      },
    });
    expect(mockNavigate).toHaveBeenCalledWith('/report-runs/instance-123');
    expect(result.current.launchError).toBeNull();
  });

  it('does not launch when selected report code is missing', async () => {
    mockState.launcher.selectedReportCode = '';

    const { result } = renderHook(() => useStep2LaunchActions());

    await act(async () => {
      await result.current.handleLaunchSubmit(createSimpleSalesDraft());
    });

    expect(mockLaunchReport).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('sets error when draft report code does not match selected report', async () => {
    const { result } = renderHook(() => useStep2LaunchActions());
    const mismatchedDraft: ReportLaunchDraft = {
      reportCode: SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
      params: {},
    };

    await act(async () => {
      await result.current.handleLaunchSubmit(mismatchedDraft);
    });

    expect(result.current.launchError).toBe(
      'Selected report changed. Please review configuration and retry.',
    );
    expect(mockLaunchReport).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(saveLaunchDraft(mismatchedDraft));
  });

  it('sets mapped launchError when launch mutation fails', async () => {
    const launchError = new Error('network down');
    mockUnwrap.mockRejectedValue(launchError);
    mockLaunchReport.mockReturnValue({ unwrap: mockUnwrap });

    const { result } = renderHook(() => useStep2LaunchActions());

    await act(async () => {
      await result.current.handleLaunchSubmit(createSimpleSalesDraft());
    });

    await waitFor(() => {
      expect(result.current.launchError).toBe('Failed to launch report (mapped).');
    });
    expect(mockToUiErrorMessage).toHaveBeenCalledWith(launchError, 'Failed to launch report.');
    expect(mockNavigate).not.toHaveBeenCalledWith('/report-runs/instance-123');
  });
});
