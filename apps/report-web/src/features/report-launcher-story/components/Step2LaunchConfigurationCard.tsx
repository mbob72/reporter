import { Alert, Badge, Button, Card, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { FormEventHandler, ReactNode } from 'react';

import type { LaunchConfigurationModel } from '../types';
import { StepFooterActions } from './StepFooterActions';

type Step2LaunchConfigurationCardProps<TLaunchParams = unknown> = {
  configuration: LaunchConfigurationModel<TLaunchParams>;
  children?: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  onBackToReports?: () => void;
  isLaunching?: boolean;
  launchDisabled?: boolean;
};

function getSeverityColor(severity: 'info' | 'warning' | 'critical') {
  if (severity === 'critical') {
    return 'red';
  }

  if (severity === 'warning') {
    return 'yellow';
  }

  return 'blue';
}

export function Step2LaunchConfigurationCard<TLaunchParams = unknown>({
  configuration,
  children,
  onSubmit,
  onBackToReports,
  isLaunching = false,
  launchDisabled = false,
}: Step2LaunchConfigurationCardProps<TLaunchParams>) {
  return (
    <Card
      withBorder
      radius="lg"
      p={0}
      className="h-full min-h-0 w-full max-w-5xl mx-auto bg-surface shadow-panel flex flex-col"
    >
      <form onSubmit={onSubmit} className="h-full min-h-0 p-4 sm:p-6 flex flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-3">
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start" wrap="wrap" className="gap-2">
              <div>
                <Text tt="uppercase" fw={700} size="xs" c="dimmed">
                  Step 2
                </Text>
                <Title order={2}>Launch Configuration</Title>
                <Text c="dimmed" size="sm" mt={6}>
                  Review launch details and constraints before submit.
                </Text>
              </div>
              <Badge color={configuration.canLaunch ? 'teal' : 'red'} variant="light">
                {configuration.canLaunch ? 'Ready to launch' : 'Launch blocked'}
              </Badge>
            </Group>

            <Paper withBorder radius="md" p="md" className="bg-white/80">
              <Stack gap={6}>
                <Text fw={700}>{configuration.reportTitle}</Text>
                <Text size="sm" c="dimmed">
                  {configuration.reportDescription}
                </Text>
                <Text size="sm" c="dimmed">
                  {configuration.contextSummary}
                </Text>
              </Stack>
            </Paper>

            <Paper withBorder radius="md" p="md" className="bg-white/80">
              <Stack gap="sm">
                <Text fw={700}>Constraints / Access Explanation</Text>
                {configuration.constraints.map((constraint) => (
                  <Group
                    key={constraint.id}
                    justify="space-between"
                    align="flex-start"
                    gap="sm"
                    wrap="wrap"
                  >
                    <div>
                      <Text fw={600} size="sm">
                        {constraint.label}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {constraint.details}
                      </Text>
                    </div>
                    <Badge color={getSeverityColor(constraint.severity)} variant="light">
                      {constraint.severity}
                    </Badge>
                  </Group>
                ))}
              </Stack>
            </Paper>

            {children}

            {configuration.disabledReason ? (
              <Alert color="red" variant="light">
                {configuration.disabledReason}
              </Alert>
            ) : null}
          </Stack>
        </div>

        <StepFooterActions>
          <Button
            type="button"
            variant="light"
            onClick={onBackToReports}
            className="w-full sm:w-auto"
          >
            Back to reports
          </Button>
          <Button
            type="submit"
            disabled={isLaunching || launchDisabled || !configuration.canLaunch}
            className="w-full sm:w-auto"
          >
            {isLaunching ? 'Launching...' : 'Launch'}
          </Button>
        </StepFooterActions>
      </form>
    </Card>
  );
}
