import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createAppStore } from '../../../app/store';
import { setAccessToken } from '../store/sessionSlice';
import { reportApi } from './reportApi';

describe('reportApi baseQueryWithReauth', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('refreshes access token on 401 and retries original request once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: 'next-access-token' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              code: 'simple-sales-summary',
              title: 'Simple Sales Summary',
              description: 'Demo report',
              minRoleToLaunch: 'Admin',
            },
          ]),
          { status: 200 },
        ),
      );

    global.fetch = fetchMock as typeof fetch;

    const store = createAppStore();
    store.dispatch(setAccessToken('expired-token'));

    const result = await store.dispatch(reportApi.endpoints.listReports.initiate());

    expect(result.isSuccess).toBe(true);
    expect(store.getState().session.accessToken).toBe('next-access-token');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('clears session when refresh request fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), { status: 401 }),
      );

    global.fetch = fetchMock as typeof fetch;

    const store = createAppStore();
    store.dispatch(setAccessToken('expired-token'));

    const result = await store.dispatch(reportApi.endpoints.listReports.initiate());

    expect(result.isError).toBe(true);
    expect(store.getState().session.accessToken).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
