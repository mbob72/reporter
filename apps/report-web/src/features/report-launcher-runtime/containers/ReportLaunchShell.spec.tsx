import { MantineProvider } from '@mantine/core';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportLaunchShell } from './ReportLaunchShell';

const {
  mockUseAppDispatch,
  mockUseAppSelector,
  mockUseLocation,
  mockIssueDevToken,
  mockLogoutSession,
  mockIssueDevTokenState,
} = vi.hoisted(() => ({
  mockUseAppDispatch: vi.fn(),
  mockUseAppSelector: vi.fn(),
  mockUseLocation: vi.fn(),
  mockIssueDevToken: vi.fn(),
  mockLogoutSession: vi.fn(),
  mockIssueDevTokenState: { isLoading: false },
}));

vi.mock('../../../app/hooks', () => ({
  useAppDispatch: mockUseAppDispatch,
  useAppSelector: mockUseAppSelector,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useLocation: mockUseLocation,
    Outlet: () => <div>Outlet</div>,
  };
});

vi.mock('../api/reportApi', () => ({
  useIssueDevTokenMutation: () => [mockIssueDevToken, mockIssueDevTokenState],
  useLogoutSessionMutation: () => [mockLogoutSession],
}));

describe('ReportLaunchShell', () => {
  const mockDispatch = vi.fn();
  let state: { session: { selectedMockUserId: string; accessToken: string | null } };

  function renderComponent() {
    return render(
      <MantineProvider>
        <ReportLaunchShell />
      </MantineProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseAppDispatch.mockReturnValue(mockDispatch);
    state = {
      session: {
        selectedMockUserId: 'admin',
        accessToken: null,
      },
    };
    mockUseAppSelector.mockImplementation((selector) => selector(state));
    mockUseLocation.mockReturnValue({ pathname: '/report-launch' });
    mockIssueDevToken.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ accessToken: 'fresh-access-token' }),
    });
    mockLogoutSession.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ success: true }),
    });
  });

  it('logs out previous session and requests new token when mock user changes', async () => {
    const view = renderComponent();
    state.session.selectedMockUserId = 'manager';
    view.rerender(
      <MantineProvider>
        <ReportLaunchShell />
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(mockLogoutSession).toHaveBeenCalled();
      expect(mockIssueDevToken).toHaveBeenCalledWith({ mockUserId: 'manager' });
    });
  });
});
