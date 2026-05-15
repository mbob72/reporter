import { Loader, Stack, Text } from '@mantine/core';
import { type PropsWithChildren, useEffect, useRef } from 'react';
import type { MockUserId } from '@report-platform/auth';

import { useAppDispatch, useAppSelector } from '../hooks';
import { useRefreshSessionMutation } from '../../features/report-launcher-runtime/api/reportApi';
import {
  clearSession,
  markSessionBootstrapped,
  selectMockUser,
  setAccessToken,
} from '../../features/report-launcher-runtime/store/sessionSlice';

export function SessionBootstrap({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const isBootstrapped = useAppSelector((state) => state.session.isBootstrapped);
  const bootstrapStartedRef = useRef(false);
  const [refreshSession] = useRefreshSessionMutation();

  useEffect(() => {
    if (bootstrapStartedRef.current) {
      return;
    }

    bootstrapStartedRef.current = true;

    const runBootstrap = async () => {
      try {
        const payload = await refreshSession().unwrap();
        dispatch(selectMockUser(payload.mockUserId as MockUserId));
        dispatch(setAccessToken(payload.accessToken));
      } catch {
        dispatch(clearSession());
      } finally {
        dispatch(markSessionBootstrapped());
      }
    };

    void runBootstrap();
  }, [dispatch, refreshSession]);

  if (!isBootstrapped) {
    return (
      <div className="h-screen w-full bg-slate-100/90 flex items-center justify-center">
        <Stack align="center" gap="xs">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Restoring session...
          </Text>
        </Stack>
      </div>
    );
  }

  return children;
}
