import { Card, Container, Stack, Stepper, Text, Title } from '@mantine/core';
import { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

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
  const location = useLocation();
  const activeStep = useMemo(() => getActiveStep(location.pathname), [location.pathname]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-100/90 p-2 sm:p-4 lg:p-8">
      <Container size="xl" py="xl">
        <Card withBorder radius="lg" p="lg" className="bg-white/70">
          <Stack gap="md">
            <div>
              <Text tt="uppercase" fw={700} size="xs" c="dimmed">
                Reporting Runtime
              </Text>
              <Title order={1}>Report Launcher</Title>
              <Text c="dimmed" size="sm" mt={6}>
                Runtime flow uses route as source of truth and recovers state by report instance id.
              </Text>
            </div>

            <Stepper
              active={activeStep}
              allowNextStepsSelect={false}
              size="sm"
              className="w-full"
            >
              <Stepper.Step label="Select" description="Report selection" />
              <Stepper.Step label="Configure" description="Launch params" />
              <Stepper.Step label="Progress" description="Instance status" />
              <Stepper.Step label="Result" description="Artifacts & history" />
            </Stepper>

            <Outlet />
          </Stack>
        </Card>
      </Container>
    </div>
  );
}
