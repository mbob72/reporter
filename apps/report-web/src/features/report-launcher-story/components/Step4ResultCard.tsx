import { Badge, Button, Card, Group, Paper, Stack, Text, Title } from '@mantine/core';

import type { Step4ResultModel } from '../types';
import { ReportInstanceList } from './ReportInstanceList';
import { StepFooterActions } from './StepFooterActions';

type Step4ResultCardProps = {
  result: Step4ResultModel;
  onRunAgain?: () => void;
  onBackToReports?: () => void;
};

export function Step4ResultCard({ result, onRunAgain, onBackToReports }: Step4ResultCardProps) {
  return (
    <Card
      withBorder
      radius="lg"
      p={0}
      className="h-full min-h-0 w-full max-w-5xl mx-auto bg-surface shadow-panel flex flex-col"
    >
      <Stack gap="lg" className="h-full min-h-0 p-4 sm:p-6">
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

        <Paper withBorder radius="md" p="md" className="bg-white/80 min-h-0 flex-1 overflow-hidden">
          <Stack gap={8} className="h-full min-h-0">
            <Text fw={700}>Recent artifacts</Text>
            <ReportInstanceList
              items={result.recentArtifacts.map((artifactItem) => ({
                id: artifactItem.id,
                label: artifactItem.fileName,
                metaLabel: `${artifactItem.createdAt} • ${artifactItem.sizeLabel}`,
                actionHref:
                  artifactItem.availability === 'available' && artifactItem.downloadUrl
                    ? artifactItem.downloadUrl
                    : undefined,
                createdAtLabel: artifactItem.createdAt,
                finishedAtLabel: artifactItem.createdAt,
                sizeLabel: artifactItem.sizeLabel,
              }))}
              emptyMessage="No artifact history yet for this report type."
              actionLabel="Open"
              noActionLabel="Unavailable"
              selectable
              selectedSummaryTitle="Selected instance"
              selectedSummaryEmptyMessage="Click an artifact to preview details above the list."
              selectedSummaryClassName="bg-slate-50 h-36 overflow-hidden"
            />
          </Stack>
        </Paper>

        <StepFooterActions>
          <Button variant="light" onClick={onBackToReports} className="w-full sm:w-auto">
            Back to reports
          </Button>
          <Button onClick={onRunAgain} className="w-full sm:w-auto">
            Run again
          </Button>
        </StepFooterActions>
      </Stack>
    </Card>
  );
}
