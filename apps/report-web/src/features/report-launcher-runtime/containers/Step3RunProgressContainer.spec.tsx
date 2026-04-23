import { MantineProvider } from '@mantine/core';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Step3RunProgressContainer } from './Step3RunProgressContainer';

const {
  mockUseAppDispatch,
  mockUseAppSelector,
  mockUseNavigate,
  mockUseParams,
  mockSelectReportInstance,
  mockUseGetReportInstanceQuery,
  mockUseListReportsQuery,
} = vi.hoisted(() => ({
  mockUseAppDispatch: vi.fn(),
  mockUseAppSelector: vi.fn(),
  mockUseNavigate: vi.fn(),
  mockUseParams: vi.fn(),
  mockSelectReportInstance: vi.fn(),
  mockUseGetReportInstanceQuery: vi.fn(),
  mockUseListReportsQuery: vi.fn(),
}));

vi.mock('../../../app/hooks', () => ({
  useAppDispatch: mockUseAppDispatch,
  useAppSelector: mockUseAppSelector,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: mockUseNavigate,
    useParams: mockUseParams,
  };
});

vi.mock('../api/reportApi', () => ({
  reportApi: {
    endpoints: {
      getReportInstance: {
        select: mockSelectReportInstance,
      },
    },
  },
  useGetReportInstanceQuery: mockUseGetReportInstanceQuery,
  useListReportsQuery: mockUseListReportsQuery,
}));

vi.mock('../../report-launcher-story/components/Step3RunProgressCard', () => ({
  Step3RunProgressCard: () => <div>Step 3 progress</div>,
}));

describe('Step3RunProgressContainer', () => {
  const mockDispatch = vi.fn();
  const mockNavigate = vi.fn();
  const mockRefetch = vi.fn();
  const cachedSelector = vi.fn();

  function renderComponent() {
    return render(
      <MantineProvider>
        <Step3RunProgressContainer />
      </MantineProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAppDispatch.mockReturnValue(mockDispatch);
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseParams.mockReturnValue({ reportInstanceId: 'instance-1' });
    mockSelectReportInstance.mockReturnValue(cachedSelector);
    mockUseListReportsQuery.mockReturnValue({ data: [] });
    mockUseGetReportInstanceQuery.mockReturnValue({
      data: {
        id: 'instance-1',
        reportCode: 'weather-anomaly-export',
        status: 'running',
        stage: 'generating',
        progressPercent: 42,
      },
      error: undefined,
      refetch: mockRefetch,
    });
  });

  it('stops polling when cached status is failed and stays on step 3', () => {
    mockUseAppSelector.mockReturnValue({
      data: {
        status: 'failed',
      },
    });
    mockUseGetReportInstanceQuery.mockReturnValue({
      data: {
        id: 'instance-1',
        reportCode: 'weather-anomaly-export',
        status: 'failed',
        stage: 'failed',
        progressPercent: 68,
        errorMessage: 'Generation error',
      },
      error: undefined,
      refetch: mockRefetch,
    });

    renderComponent();

    expect(mockSelectReportInstance).toHaveBeenCalledWith('instance-1');
    expect(mockUseGetReportInstanceQuery).toHaveBeenCalledWith(
      'instance-1',
      expect.objectContaining({
        skip: false,
        pollingInterval: 0,
        refetchOnMountOrArgChange: true,
      }),
    );
    expect(mockNavigate).not.toHaveBeenCalledWith('/report-runs/instance-1/result', {
      replace: true,
    });
  });

  it('keeps polling at 1000ms for non-terminal statuses', () => {
    mockUseAppSelector.mockReturnValue({
      data: {
        status: 'running',
      },
    });

    renderComponent();

    expect(mockUseGetReportInstanceQuery).toHaveBeenCalledWith(
      'instance-1',
      expect.objectContaining({
        skip: false,
        pollingInterval: 1000,
        refetchOnMountOrArgChange: true,
      }),
    );
  });

  it('still navigates to result on completed status and stops polling', async () => {
    mockUseAppSelector.mockReturnValue({
      data: {
        status: 'completed',
      },
    });
    mockUseGetReportInstanceQuery.mockReturnValue({
      data: {
        id: 'instance-1',
        reportCode: 'weather-anomaly-export',
        status: 'completed',
        stage: 'done',
        progressPercent: 100,
      },
      error: undefined,
      refetch: mockRefetch,
    });

    renderComponent();

    expect(mockUseGetReportInstanceQuery).toHaveBeenCalledWith(
      'instance-1',
      expect.objectContaining({
        skip: false,
        pollingInterval: 0,
        refetchOnMountOrArgChange: true,
      }),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/report-runs/instance-1/result', {
        replace: true,
      });
    });
  });
});
