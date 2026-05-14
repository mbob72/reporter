import { Card, Container, Stack, Stepper, Text, Title } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { useIssueDevTokenMutation } from '../api/reportApi';
import { clearAccessToken, setAccessToken } from '../store/sessionSlice';

function getActiveStep(pathname: string): number {
  if (pathname.startsWith('/report-runs/') && pathname.endsWith('/result')) {
    return 3;
  }

  if (pathname.startsWith('/report-runs/')) {
    return 2;
  }

  if (pathname.startsWith('/report-launch/configure')) {
    return 1;
  }

  return 0;
}

export function ReportLaunchShell() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const selectedMockUserId = useAppSelector((state) => state.session.selectedMockUserId);
  const accessToken = useAppSelector((state) => state.session.accessToken);
  const [authError, setAuthError] = useState<string | null>(null);
  const [issueDevToken, issueDevTokenState] = useIssueDevTokenMutation();
  const activeStep = useMemo(() => getActiveStep(location.pathname), [location.pathname]);

  useEffect(() => {
    let isCancelled = false;

    if (accessToken) {
      return () => {
        isCancelled = true;
      };
    }

    setAuthError(null);
    void issueDevToken({ mockUserId: selectedMockUserId })
      .unwrap()
      .then((payload) => {
        if (isCancelled) {
          return;
        }

        dispatch(setAccessToken(payload.accessToken));
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        dispatch(clearAccessToken());
        setAuthError('Failed to initialize demo auth token.');
      });

    return () => {
      isCancelled = true;
    };
  }, [accessToken, dispatch, issueDevToken, selectedMockUserId]);

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-100/90 p-2 sm:p-4 lg:p-8">
      <Container size="xl" className="h-full py-0">
        <Card withBorder radius="lg" p="lg" className="h-full bg-white/70">
          <Stack gap="md" className="h-full">
            <div>
              <Text tt="uppercase" fw={700} size="xs" c="dimmed">
                Reporting Runtime
              </Text>
              <Title order={1}>Report Launcher</Title>
              <Text c="dimmed" size="sm" mt={6}>
                Runtime flow uses route as source of truth and recovers state by report instance id.
              </Text>
            </div>

            <Stepper active={activeStep} allowNextStepsSelect={false} size="sm" className="w-full">
              <Stepper.Step label="Select" description="Report selection" />
              <Stepper.Step label="Configure" description="Launch params" />
              <Stepper.Step label="Progress" description="Instance status" />
              <Stepper.Step label="Result" description="Artifacts & history" />
            </Stepper>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-2">
              {authError ? (
                <Text c="red.7" size="sm">
                  {authError}
                </Text>
              ) : accessToken || issueDevTokenState.isLoading ? (
                <Outlet />
              ) : null}
            </div>
          </Stack>
        </Card>
      </Container>
    </div>
  );
}
