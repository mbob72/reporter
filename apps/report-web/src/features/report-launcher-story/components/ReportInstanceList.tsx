import { Anchor, Badge, Group, Paper, Stack, Text } from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';

export type ReportInstanceListItem = {
  id: string;
  label: string;
  metaLabel: string;
  actionHref?: string;
  createdAtLabel?: string;
  finishedAtLabel?: string;
  sizeLabel?: string;
};

type SummaryLabels = {
  id: string;
  file: string;
  created: string;
  finished: string;
  size: string;
};

type ReportInstanceListProps = {
  items: ReportInstanceListItem[];
  emptyMessage: string;
  actionLabel: string;
  noActionLabel?: string;
  selectable?: boolean;
  selectedSummaryTitle?: string;
  selectedSummaryEmptyMessage?: string;
  selectedSummaryLabels?: SummaryLabels;
  selectedSummaryClassName?: string;
};

const defaultSummaryLabels: SummaryLabels = {
  id: 'id',
  file: 'file',
  created: 'created',
  finished: 'finished',
  size: 'size',
};

function toSummaryValue(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return '—';
  }

  return value;
}

export function ReportInstanceList({
  items,
  emptyMessage,
  actionLabel,
  noActionLabel = 'No file',
  selectable = false,
  selectedSummaryTitle = 'Selected instance',
  selectedSummaryEmptyMessage = 'Click an item to preview details.',
  selectedSummaryLabels = defaultSummaryLabels,
  selectedSummaryClassName,
}: ReportInstanceListProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectable || items.length === 0) {
      setSelectedItemId(null);
      return;
    }

    if (!selectedItemId || !items.some((item) => item.id === selectedItemId)) {
      setSelectedItemId(items[0].id);
    }
  }, [items, selectable, selectedItemId]);

  const selectedItem = useMemo(() => {
    if (!selectable || !selectedItemId) {
      return null;
    }

    return items.find((item) => item.id === selectedItemId) ?? null;
  }, [items, selectable, selectedItemId]);

  if (items.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        {emptyMessage}
      </Text>
    );
  }

  return (
    <>
      {selectable ? (
        selectedItem ? (
          <Paper withBorder radius="sm" p="sm" className={selectedSummaryClassName}>
            <Stack gap={4}>
              <Text fw={600} size="sm">
                {selectedSummaryTitle}
              </Text>
              <Text size="xs" c="dimmed">
                {selectedSummaryLabels.id}: {selectedItem.id}
              </Text>
              <Text size="xs" c="dimmed">
                {selectedSummaryLabels.file}: {selectedItem.label}
              </Text>
              <Text size="xs" c="dimmed">
                {selectedSummaryLabels.created}: {toSummaryValue(selectedItem.createdAtLabel)}
              </Text>
              <Text size="xs" c="dimmed">
                {selectedSummaryLabels.finished}: {toSummaryValue(selectedItem.finishedAtLabel)}
              </Text>
              <Text size="xs" c="dimmed">
                {selectedSummaryLabels.size}: {toSummaryValue(selectedItem.sizeLabel)}
              </Text>
            </Stack>
          </Paper>
        ) : (
          <Paper withBorder radius="sm" p="sm" className={selectedSummaryClassName}>
            <Text size="sm" c="dimmed">
              {selectedSummaryEmptyMessage}
            </Text>
          </Paper>
        )
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-1">
        <Stack gap="xs">
          {items.map((item) => {
            const isSelected = selectable && selectedItemId === item.id;

            return (
              <Paper
                key={item.id}
                withBorder
                radius="sm"
                p="xs"
                className={isSelected ? 'border-teal-500 bg-teal-50' : 'bg-white'}
              >
                <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                  {selectable ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemId(item.id);
                      }}
                      className="text-left text-sm font-medium text-slate-800 hover:text-slate-900"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <Text size="sm" fw={600}>
                      {item.label}
                    </Text>
                  )}

                  {item.actionHref ? (
                    <Anchor
                      href={item.actionHref}
                      onClick={() => {
                        if (selectable) {
                          setSelectedItemId(item.id);
                        }
                      }}
                    >
                      {actionLabel}
                    </Anchor>
                  ) : (
                    <Badge color="gray" variant="light">
                      {noActionLabel}
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed" mt={4}>
                  {item.metaLabel}
                </Text>
              </Paper>
            );
          })}
        </Stack>
      </div>
    </>
  );
}
