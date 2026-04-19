import {
  Badge,
  Card,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';

import type { LauncherUser, ReportSelectionItem, UnavailableReportReason } from '../types';

type Step1ReportSelectionCardProps = {
  users: LauncherUser[];
  reports: ReportSelectionItem[];
  selectedUserId: string;
  selectedReportCode: string;
  searchValue: string;
  onUserChange?: (userId: string) => void;
  onSearchChange?: (searchValue: string) => void;
  onSelectReport?: (reportCode: string) => void;
};

const unavailableReasonLabel: Record<UnavailableReportReason, string> = {
  insufficient_role: 'Недостаточная роль',
  tenant_scope_required: 'Нужен tenant scope',
  organization_scope_required: 'Нужен organization scope',
};

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
  searchValue,
  onUserChange,
  onSearchChange,
  onSelectReport,
}: Step1ReportSelectionCardProps) {
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? users[0] ?? null;

  const filteredReports = reports.filter((report) =>
    report.name.toLowerCase().includes(searchValue.trim().toLowerCase()),
  );

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

        <Group grow align="end" className="gap-3">
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
          />
          <TextInput
            label="Search by report name"
            placeholder="Type report name"
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.currentTarget.value)}
          />
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <Paper withBorder radius="md" p="md" className="bg-white/80">
            <Stack gap={8}>
              <Text fw={700}>Launch Context Preview</Text>
              <Text size="sm" c="dimmed">
                current user: {selectedUser ? selectedUser.name : '—'}
              </Text>
              <Text size="sm" c="dimmed">
                role: {selectedUser ? selectedUser.role : '—'}
              </Text>
              <Text size="sm" c="dimmed">
                tenant scope:{' '}
                {selectedUser && selectedUser.tenantScope.length > 0
                  ? selectedUser.tenantScope.join(', ')
                  : 'none'}
              </Text>
              <Text size="sm" c="dimmed">
                organization scope:{' '}
                {selectedUser && selectedUser.organizationScope.length > 0
                  ? selectedUser.organizationScope.join(', ')
                  : 'none'}
              </Text>
            </Stack>
          </Paper>

          <Paper withBorder radius="md" p="md" className="bg-white/80">
            <Stack gap="sm">
              <Text fw={700}>Reports</Text>

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
                      isUnavailable ? 'cursor-not-allowed opacity-70 hover:border-slate-300' : '',
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
          </Paper>
        </SimpleGrid>
      </Stack>
    </Card>
  );
}
