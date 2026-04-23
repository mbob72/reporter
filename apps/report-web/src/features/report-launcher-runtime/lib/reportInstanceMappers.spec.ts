import { describe, expect, it } from 'vitest';

import type { ReportInstance, ReportInstanceListItem } from '@report-platform/contracts';

import {
  formatReportByteLength,
  mapReadyReportInstancesSummary,
  mapReportInstanceListItemToResultArtifact,
  mapReportInstanceToPrimaryArtifact,
} from './reportInstanceMappers';

describe('reportInstanceMappers', () => {
  it('returns completed count but hides ready instance links when access is restricted', () => {
    const instances: ReportInstanceListItem[] = [
      {
        id: 'instance-1',
        reportCode: 'sales',
        status: 'completed',
        createdAt: '2026-04-22T10:00:00.000Z',
        finishedAt: '2026-04-22T10:01:00.000Z',
        fileName: 'sales-1.xlsx',
        byteLength: 1024,
        downloadUrl: '/generated-files/instance-1',
      },
      {
        id: 'instance-2',
        reportCode: 'sales',
        status: 'failed',
        createdAt: '2026-04-22T11:00:00.000Z',
      },
      {
        id: 'instance-3',
        reportCode: 'sales',
        status: 'completed',
        createdAt: '2026-04-22T12:00:00.000Z',
      },
    ];

    const summary = mapReadyReportInstancesSummary({
      instances,
      canOpenLinks: false,
      isLoading: true,
    });

    expect(summary.count).toBe(2);
    expect(summary.isLoading).toBe(true);
    expect(summary.items).toEqual([]);
  });

  it('maps completed instances to ready instance items', () => {
    const summary = mapReadyReportInstancesSummary({
      instances: [
        {
          id: 'instance-1',
          reportCode: 'sales',
          status: 'completed',
          createdAt: '2026-04-22T10:00:00.000Z',
          finishedAt: '2026-04-22T10:01:00.000Z',
          fileName: 'sales-1.xlsx',
          byteLength: 1024,
          downloadUrl: '/generated-files/instance-1',
        },
      ],
      canOpenLinks: true,
      isLoading: false,
    });

    expect(summary.count).toBe(1);
    expect(summary.items).toHaveLength(1);
    expect(summary.items[0]?.label).toBe('sales-1.xlsx');
    expect(summary.items[0]?.downloadHref).toBe('/generated-files/instance-1');
    expect(summary.items[0]?.sizeLabel).toBe('1.0 KB');
  });

  it('maps completed report instance to primary artifact', () => {
    const instance: ReportInstance = {
      id: 'instance-1',
      reportCode: 'sales',
      status: 'completed',
      stage: 'done',
      progressPercent: 100,
      createdAt: '2026-04-22T10:00:00.000Z',
      finishedAt: '2026-04-22T10:01:00.000Z',
      result: {
        kind: 'downloadable-file',
        fileName: 'sales-1.xlsx',
        byteLength: 1500,
        downloadUrl: '/generated-files/instance-1',
      },
    };

    const artifact = mapReportInstanceToPrimaryArtifact(instance);

    expect(artifact).not.toBeNull();
    expect(artifact?.id).toBe('instance-1');
    expect(artifact?.fileName).toBe('sales-1.xlsx');
    expect(artifact?.availability).toBe('available');
  });

  it('maps list item to unavailable artifact when instance is not completed', () => {
    const artifact = mapReportInstanceListItemToResultArtifact({
      id: 'instance-2',
      reportCode: 'sales',
      status: 'failed',
      createdAt: '2026-04-22T12:00:00.000Z',
      downloadUrl: '/generated-files/instance-2',
    });

    expect(artifact.fileName).toBe('sales-instance-2');
    expect(artifact.availability).toBe('unavailable');
  });

  it('formats byte lengths into human readable labels', () => {
    expect(formatReportByteLength(undefined)).toBe('—');
    expect(formatReportByteLength(12)).toBe('12 B');
    expect(formatReportByteLength(2048)).toBe('2.0 KB');
    expect(formatReportByteLength(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});
