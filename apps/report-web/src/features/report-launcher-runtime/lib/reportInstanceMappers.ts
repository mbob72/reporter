import type { ReportInstance, ReportInstanceListItem } from '@report-platform/contracts';

import type {
  ReadyReportInstanceItem,
  ReadyReportInstancesSummary,
  ResultArtifact,
} from '../../report-launcher-story/types';

type ReadyInstancesSummaryParams = {
  instances: ReportInstanceListItem[] | undefined;
  canOpenLinks: boolean;
  isLoading: boolean;
};

function toArtifactAvailability(
  status: ReportInstance['status'] | ReportInstanceListItem['status'],
  downloadUrl: string | undefined,
): ResultArtifact['availability'] {
  return status === 'completed' && Boolean(downloadUrl) ? 'available' : 'unavailable';
}

export function formatReportDateLabel(value: string | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString();
}

export function formatReportByteLength(byteLength: number | undefined): string {
  if (typeof byteLength !== 'number' || Number.isNaN(byteLength)) {
    return '—';
  }

  if (byteLength < 1024) {
    return `${byteLength} B`;
  }

  const sizeInKb = byteLength / 1024;

  if (sizeInKb < 1024) {
    return `${sizeInKb.toFixed(1)} KB`;
  }

  const sizeInMb = sizeInKb / 1024;

  return `${sizeInMb.toFixed(1)} MB`;
}

export function mapReadyReportInstanceItem(
  instance: ReportInstanceListItem,
): ReadyReportInstanceItem {
  return {
    id: instance.id,
    label: instance.fileName ?? instance.id,
    downloadHref: instance.downloadUrl,
    createdAtLabel: formatReportDateLabel(instance.finishedAt ?? instance.createdAt),
    finishedAtLabel: formatReportDateLabel(instance.finishedAt),
    sizeLabel: formatReportByteLength(instance.byteLength),
  };
}

export function mapReadyReportInstancesSummary({
  instances,
  canOpenLinks,
  isLoading,
}: ReadyInstancesSummaryParams): ReadyReportInstancesSummary {
  const completedInstances = (instances ?? []).filter(
    (instance) => instance.status === 'completed',
  );

  return {
    count: completedInstances.length,
    canOpenLinks,
    isLoading,
    items: canOpenLinks ? completedInstances.map(mapReadyReportInstanceItem) : [],
  };
}

export function mapReportInstanceToPrimaryArtifact(
  instance: ReportInstance,
): ResultArtifact | null {
  if (!instance.result) {
    return null;
  }

  return {
    id: instance.artifactId ?? instance.id,
    fileName: instance.result.fileName,
    sizeLabel: formatReportByteLength(instance.result.byteLength),
    createdAt: formatReportDateLabel(instance.finishedAt ?? instance.createdAt),
    downloadUrl: instance.result.downloadUrl,
    availability: toArtifactAvailability(instance.status, instance.result.downloadUrl),
  };
}

export function mapReportInstanceListItemToResultArtifact(
  instance: ReportInstanceListItem,
): ResultArtifact {
  return {
    id: instance.id,
    fileName: instance.fileName ?? `${instance.reportCode}-${instance.id}`,
    sizeLabel: formatReportByteLength(instance.byteLength),
    createdAt: formatReportDateLabel(instance.finishedAt ?? instance.createdAt),
    downloadUrl: instance.downloadUrl,
    availability: toArtifactAvailability(instance.status, instance.downloadUrl),
  };
}
