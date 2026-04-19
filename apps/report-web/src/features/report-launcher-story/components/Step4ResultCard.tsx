import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';

import type { Step4ResultModel } from '../types';

type Step4ResultCardProps = {
  result: Step4ResultModel;
  onRunAgain?: () => void;
  onBackToReports?: () => void;
};

export function Step4ResultCard({
  result,
  onRunAgain,
  onBackToReports,
}: Step4ResultCardProps) {
  const artifact = result.primaryArtifact;

  return (
    <Card
      withBorder
      radius="lg"
      p={0}
      className="w-full max-w-5xl mx-auto bg-surface shadow-panel"
    >
      <Stack gap="lg" className="p-4 sm:p-6">
        <Group justify="space-between" align="flex-start" wrap="wrap" className="gap-2">
          <div>
            <Text tt="uppercase" fw={700} size="xs" c="dimmed">
              Step 4
            </Text>
            <Title order={2}>Result</Title>
            <Text c="dimmed" size="sm" mt={6}>
              Review generated artifact and recent outputs for this report type.
            </Text>
          </div>
          <Badge color="green" variant="light">
            Completed
          </Badge>
        </Group>

        <Paper withBorder radius="md" p="md" className="bg-white/80">
          <Stack gap={8}>
            <Text fw={700}>Result summary</Text>
            <Text size="sm" c="dimmed">
              {result.summary}
            </Text>
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md" className="bg-white/80">
          <Stack gap={8}>
            <Text fw={700}>Primary artifact</Text>
            {artifact ? (
              <>
                <Text size="sm">
                  <Text component="span" fw={700}>
                    File name:
                  </Text>{' '}
                  {artifact.fileName}
                </Text>
                <Text size="sm">
                  <Text component="span" fw={700}>
                    File size:
                  </Text>{' '}
                  {artifact.sizeLabel}
                </Text>
                <Text size="sm">
                  <Text component="span" fw={700}>
                    Generated:
                  </Text>{' '}
                  {artifact.createdAt}
                </Text>

                {artifact.availability === 'available' && artifact.downloadUrl ? (
                  <Anchor href={artifact.downloadUrl}>Download artifact</Anchor>
                ) : (
                  <Alert color="red" variant="light">
                    Download is currently unavailable. The file link is broken or expired.
                  </Alert>
                )}
              </>
            ) : (
              <Text size="sm" c="dimmed">
                No artifact data available.
              </Text>
            )}
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md" className="bg-white/80">
          <Stack gap={8}>
            <Text fw={700}>Launch summary</Text>
            {result.launchSummary.map((summaryLine) => (
              <Text key={summaryLine.id} size="sm">
                <Text component="span" fw={700}>
                  {summaryLine.label}:
                </Text>{' '}
                {summaryLine.value}
              </Text>
            ))}
          </Stack>
        </Paper>

        <Paper withBorder radius="md" p="md" className="bg-white/80">
          <Stack gap={8}>
            <Text fw={700}>Recent artifacts</Text>
            {result.recentArtifacts.length === 0 ? (
              <Text size="sm" c="dimmed">
                No artifact history yet for this report type.
              </Text>
            ) : null}

            {result.recentArtifacts.map((artifactItem) => (
              <Group key={artifactItem.id} justify="space-between" align="center" wrap="wrap">
                <div>
                  <Text size="sm" fw={600}>
                    {artifactItem.fileName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {artifactItem.createdAt} • {artifactItem.sizeLabel}
                  </Text>
                </div>
                {artifactItem.availability === 'available' && artifactItem.downloadUrl ? (
                  <Anchor href={artifactItem.downloadUrl}>Open</Anchor>
                ) : (
                  <Badge color="red" variant="light">
                    Unavailable
                  </Badge>
                )}
              </Group>
            ))}
          </Stack>
        </Paper>

        <Group className="w-full">
          <Button variant="light" onClick={onBackToReports} className="w-full sm:w-auto">
            Back to reports
          </Button>
          <Button onClick={onRunAgain} className="w-full sm:w-auto">
            Run again
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
