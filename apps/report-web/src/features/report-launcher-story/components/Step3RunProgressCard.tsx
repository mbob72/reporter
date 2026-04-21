import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  Title,
} from '@mantine/core';

import type { RunProgressSnapshot } from '../types';
import { StepFooterActions } from './StepFooterActions';

type Step3RunProgressCardProps = {
  reportName: string;
  reportInstanceId: string;
  snapshot: RunProgressSnapshot;
  onRefresh?: () => void;
  onRetry?: () => void;
  onGoToResult?: () => void;
};

function getStatusColor(status: RunProgressSnapshot['status']) {
  if (status === 'failed') {
    return 'red';
  }

  if (status === 'completed') {
    return 'green';
  }

  if (status === 'running') {
    return 'blue';
  }

  return 'gray';
}

function getStageBadgeColor(stageStatus: 'pending' | 'active' | 'completed' | 'failed') {
  if (stageStatus === 'failed') {
    return 'red';
  }

  if (stageStatus === 'completed') {
    return 'green';
  }

  if (stageStatus === 'active') {
    return 'blue';
  }

  return 'gray';
}

function getDiagnosticColor(level: 'info' | 'warning' | 'error') {
  if (level === 'error') {
    return 'red';
  }

  if (level === 'warning') {
    return 'yellow';
  }

  return 'blue';
}

export function Step3RunProgressCard({
  reportName,
  reportInstanceId,
  snapshot,
  onRefresh,
  onRetry,
  onGoToResult,
}: Step3RunProgressCardProps) {
  return (
    <Card
      withBorder
      radius="lg"
      p={0}
      className="h-full min-h-0 w-full max-w-5xl mx-auto bg-surface shadow-panel flex flex-col"
    >
      <Stack gap="lg" className="h-full min-h-0 p-4 sm:p-6">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-3">
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start" wrap="wrap" className="gap-2">
              <div>
                <Text tt="uppercase" fw={700} size="xs" c="dimmed">
                  Step 3
                </Text>
                <Title order={2}>Run Progress</Title>
                <Text c="dimmed" size="sm" mt={6}>
                  Track background job execution with diagnostics and stage details.
                </Text>
              </div>
              <Badge color={getStatusColor(snapshot.status)} variant="light">
                {snapshot.status}
              </Badge>
            </Group>

            <Paper withBorder radius="md" p="md" className="bg-white/80">
              <Group justify="space-between" align="flex-start" wrap="wrap" className="gap-2">
                <Stack gap={4}>
                  <Text fw={700}>{reportName}</Text>
                  <Text size="sm" c="dimmed">
                    Report instance ID: {reportInstanceId}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Current stage: {snapshot.stageLabel}
                  </Text>
                </Stack>
                <Text fw={700}>{snapshot.progress}%</Text>
              </Group>

              <Progress value={snapshot.progress} size="lg" radius="xl" mt="md" />
            </Paper>

            <Paper withBorder radius="md" p="md" className="bg-white/80">
              <Stack gap="sm">
                <Text fw={700}>Timeline</Text>
                {snapshot.stages.map((stage) => (
                  <Group key={stage.id} justify="space-between" align="center" wrap="wrap">
                    <Text size="sm">{stage.label}</Text>
                    <Badge color={getStageBadgeColor(stage.status)} variant="light">
                      {stage.status}
                    </Badge>
                  </Group>
                ))}
              </Stack>
            </Paper>

            <Paper withBorder radius="md" p="md" className="bg-white/80">
              <Stack gap="sm">
                <Text fw={700}>Diagnostics</Text>
                {snapshot.diagnostics.length === 0 ? (
                  <Text size="sm" c="dimmed">
                    No diagnostics yet.
                  </Text>
                ) : null}
                {snapshot.diagnostics.map((diagnostic) => (
                  <Group key={diagnostic.id} justify="space-between" align="center" wrap="wrap">
                    <Text size="sm">{diagnostic.message}</Text>
                    <Badge color={getDiagnosticColor(diagnostic.level)} variant="light">
                      {diagnostic.level}
                    </Badge>
                  </Group>
                ))}
                {snapshot.failureMessage ? (
                  <Text size="sm" c="red">
                    {snapshot.failureMessage}
                  </Text>
                ) : null}
              </Stack>
            </Paper>
          </Stack>
        </div>

        <StepFooterActions>
          <Button variant="light" onClick={onRefresh} className="w-full sm:w-auto">
            Refresh
          </Button>
          {snapshot.status === 'failed' ? (
            <Button color="red" variant="outline" onClick={onRetry} className="w-full sm:w-auto">
              Retry
            </Button>
          ) : null}
          {snapshot.status === 'completed' ? (
            <Button color="teal" onClick={onGoToResult} className="w-full sm:w-auto">
              Go to result
            </Button>
          ) : null}
        </StepFooterActions>
      </Stack>
    </Card>
  );
}
