import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';

import type {
  LauncherUser,
  ReadyReportInstancesSummary,
  ReportSelectionItem,
  UnavailableReportReason,
} from '../types';
import { useResettableState } from '../hooks/useResettableState';
import { ReportInstanceList } from './ReportInstanceList';
import { StepFooterActions } from './StepFooterActions';

type Step1ReportSelectionCardProps = {
  users: LauncherUser[];
  reports: ReportSelectionItem[];
  selectedUserId: string;
  selectedReportCode: string;
  readyInstances?: ReadyReportInstancesSummary;
  canContinueToLaunchConfig?: boolean;
  initialSearchValue?: string;
  onUserChange?: (userId: string) => void;
  onSelectReport?: (reportCode: string) => void;
  onContinueToLaunchConfig?: () => void;
};

const unavailableReasonLabel: Record<UnavailableReportReason, string> = {
  insufficient_role: 'Недостаточная роль',
  tenant_scope_required: 'Нужен tenant scope',
  organization_scope_required: 'Нужен organization scope',
};
const summaryInfoCardClassName = 'bg-slate-50 h-36 overflow-hidden';

function getAvailabilityBadge(report: ReportSelectionItem, isSelected: boolean) {
  if (isSelected) {
    return { label: 'Selected', color: 'teal' as const };
  }

  if (report.availability === 'available') {
    return { label: 'Available', color: 'green' as const };
  }

  return { label: 'Unavailable', color: 'red' as const };
}

export function Step1ReportSelectionCard({
  users,
  reports,
  selectedUserId,
  selectedReportCode,
  readyInstances,
  canContinueToLaunchConfig = false,
  initialSearchValue = '',
  onUserChange,
  onSelectReport,
  onContinueToLaunchConfig,
}: Step1ReportSelectionCardProps) {
  const [searchValue, setSearchValue] = useResettableState(initialSearchValue);
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0] ?? null;

  const filteredReports = reports.filter((report) =>
    report.name.toLowerCase().includes(searchValue.trim().toLowerCase()),
  );

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
              Step 1
            </Text>
            <Title order={2}>Report Selection</Title>
            <Text c="dimmed" size="sm" mt={6}>
              Choose launcher context and report definition before moving to configuration.
            </Text>
          </div>
          <Badge variant="light" color="teal">
            Mock Data Only
          </Badge>
        </Group>

        <Group align="end" className="gap-3">
          <Select
            label="Select mock user"
            value={selectedUserId}
            data={users.map((user) => ({
              value: user.id,
              label: `${user.name} (${user.role})`,
            }))}
            onChange={(nextValue) => {
              if (nextValue && onUserChange) {
                onUserChange(nextValue);
              }
            }}
            className="w-full md:max-w-sm"
          />
        </Group>

        <div className="min-h-0 flex-1">
          <div className="grid h-full min-h-0 grid-cols-1 gap-4 pb-1 md:grid-cols-2 md:items-stretch">
            <Paper
              withBorder
              radius="md"
              p="md"
              className="h-full min-h-0 bg-white/80 flex flex-col overflow-hidden"
            >
              <Stack gap="sm" className="h-full min-h-0">
                <Text fw={700}>Reports</Text>
                <Paper withBorder radius="sm" p="sm" className={summaryInfoCardClassName}>
                  <Stack gap={4}>
                    <Text fw={600} size="sm">
                      Launch context
                    </Text>
                    <Text size="xs" c="dimmed">
                      user: {selectedUser ? selectedUser.name : '—'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      role: {selectedUser ? selectedUser.role : '—'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      tenant scope:{' '}
                      {selectedUser && selectedUser.tenantScope.length > 0
                        ? selectedUser.tenantScope.join(', ')
                        : 'none'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      organization scope:{' '}
                      {selectedUser && selectedUser.organizationScope.length > 0
                        ? selectedUser.organizationScope.join(', ')
                        : 'none'}
                    </Text>
                  </Stack>
                </Paper>
                <TextInput
                  label="Search by report name"
                  placeholder="Type report name"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.currentTarget.value)}
                />

                <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-1">
                  <Stack gap="sm">
                    {filteredReports.length === 0 ? (
                      <Text size="sm" c="dimmed">
                        No reports match the current search query.
                      </Text>
                    ) : null}

                    {filteredReports.map((report) => {
                      const isSelected = selectedReportCode === report.code;
                      const badge = getAvailabilityBadge(report, isSelected);
                      const isUnavailable = report.availability === 'unavailable';

                      return (
                        <button
                          key={report.code}
                          type="button"
                          onClick={() => {
                            if (!isUnavailable) {
                              onSelectReport?.(report.code);
                            }
                          }}
                          className={[
                            'rounded-lg border px-3 py-3 text-left transition',
                            isSelected
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-slate-300 bg-white hover:border-slate-500',
                            isUnavailable
                              ? 'cursor-not-allowed opacity-70 hover:border-slate-300'
                              : '',
                          ].join(' ')}
                        >
                          <Group justify="space-between" align="flex-start" gap="xs" wrap="wrap">
                            <div>
                              <Text fw={600}>{report.name}</Text>
                              <Text size="sm" c="dimmed">
                                {report.description}
                              </Text>
                            </div>
                            <Badge color={badge.color} variant="light">
                              {badge.label}
                            </Badge>
                          </Group>

                          {isUnavailable && report.unavailableReason ? (
                            <Text size="xs" c="red" mt={8}>
                              {unavailableReasonLabel[report.unavailableReason]}
                            </Text>
                          ) : null}
                        </button>
                      );
                    })}
                  </Stack>
                </div>
              </Stack>
            </Paper>

            <Paper
              withBorder
              radius="md"
              p="md"
              className="h-full min-h-0 bg-white/80 flex flex-col overflow-hidden"
            >
              <Stack gap="sm" className="h-full min-h-0">
                <Text fw={700}>Ready Instances ({readyInstances?.count ?? 0})</Text>

                {readyInstances?.isLoading ? (
                  <Text size="sm" c="dimmed">
                    Loading completed report instances...
                  </Text>
                ) : null}

                {!readyInstances?.isLoading && readyInstances && !readyInstances.canOpenLinks ? (
                  <Text size="sm" c="dimmed">
                    Insufficient role for detailed access. Showing total completed count only.
                  </Text>
                ) : null}

                {!readyInstances?.isLoading && readyInstances && readyInstances.canOpenLinks ? (
                  <ReportInstanceList
                    items={readyInstances.items.map((instance) => ({
                      id: instance.id,
                      label: instance.label,
                      metaLabel: instance.createdAtLabel,
                      actionHref: instance.downloadHref,
                      createdAtLabel: instance.createdAtLabel,
                      finishedAtLabel: instance.finishedAtLabel,
                      sizeLabel: instance.sizeLabel,
                    }))}
                    emptyMessage="No completed report instances for the selected report yet."
                    actionLabel="Download"
                    selectable
                    selectedSummaryTitle="Selected instance"
                    selectedSummaryEmptyMessage="Click an instance to preview details above the list."
                    selectedSummaryClassName={summaryInfoCardClassName}
                  />
                ) : null}
              </Stack>
            </Paper>
          </div>
        </div>

        {onContinueToLaunchConfig ? (
          <StepFooterActions>
            <Button
              disabled={!canContinueToLaunchConfig}
              onClick={onContinueToLaunchConfig}
              className="w-full sm:w-auto"
            >
              Continue to launch config
            </Button>
          </StepFooterActions>
        ) : null}
      </Stack>
    </Card>
  );
}
