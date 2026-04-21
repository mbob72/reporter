import { Alert, Stack } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Step4ResultCard } from '../../report-launcher-story/components/Step4ResultCard';
import type { Step4ResultModel } from '../../report-launcher-story/types';
import {
  useGetReportInstanceQuery,
  useListReportInstancesByReportCodeQuery,
  useListReportsQuery,
} from '../api/reportApi';
import { toUiErrorMessage } from '../lib/toUiErrorMessage';
import { selectReport } from '../store/launcherSlice';

function formatDateLabel(value: string | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString();
}

function formatByteLength(byteLength: number | undefined): string {
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

export function Step4ResultContainer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { reportInstanceId = '' } = useParams();

  const launchSnapshot = useAppSelector((state) => state.launcher.launchSnapshot);

  const reportInstanceQuery = useGetReportInstanceQuery(reportInstanceId, {
    skip: reportInstanceId.trim().length === 0,
    refetchOnMountOrArgChange: true,
  });

  const reportInstancesQuery = useListReportInstancesByReportCodeQuery(
    reportInstanceQuery.data?.reportCode ?? '',
    {
      skip:
        !reportInstanceQuery.data ||
        reportInstanceQuery.data.reportCode.trim().length === 0,
      refetchOnMountOrArgChange: true,
    },
  );

  const reportsQuery = useListReportsQuery();

  // Guard direct-open/reload of /result: if the instance is not completed yet,
  // route back to progress for the same reportInstanceId.
  useEffect(() => {
    if (!reportInstanceId) {
      navigate('/report-launch', { replace: true });
      return;
    }

    if (reportInstanceQuery.data && reportInstanceQuery.data.status !== 'completed') {
      navigate(`/report-runs/${reportInstanceId}`, { replace: true });
    }
  }, [navigate, reportInstanceId, reportInstanceQuery.data]);

  const reportTitle = useMemo(() => {
    const reportCode = reportInstanceQuery.data?.reportCode;

    if (!reportCode) {
      return 'Unknown report';
    }

    const report = (reportsQuery.data ?? []).find(
      (reportItem) => reportItem.code === reportCode,
    );

    return report?.title ?? reportCode;
  }, [reportInstanceQuery.data?.reportCode, reportsQuery.data]);

  const resultModel: Step4ResultModel = useMemo(() => {
    const instance = reportInstanceQuery.data;

    if (!instance) {
      return {
        summary: 'Loading result...',
        primaryArtifact: null,
        recentArtifacts: [],
        launchSummary: [],
      };
    }

    const primaryArtifact = instance.result
      ? {
          id: instance.artifactId ?? instance.id,
          fileName: instance.result.fileName,
          sizeLabel: formatByteLength(instance.result.byteLength),
          createdAt: formatDateLabel(instance.finishedAt ?? instance.createdAt),
          downloadUrl: instance.result.downloadUrl,
          availability: instance.result.downloadUrl ? ('available' as const) : ('unavailable' as const),
        }
      : null;

    const recentArtifacts = (reportInstancesQuery.data ?? [])
      .filter((instanceItem) => instanceItem.id !== instance.id)
      .map((instanceItem) => ({
        id: instanceItem.id,
        fileName: instanceItem.fileName ?? `${instanceItem.reportCode}-${instanceItem.id}`,
        sizeLabel: formatByteLength(instanceItem.byteLength),
        createdAt: formatDateLabel(instanceItem.finishedAt ?? instanceItem.createdAt),
        downloadUrl: instanceItem.downloadUrl,
        availability:
          instanceItem.status === 'completed' && instanceItem.downloadUrl
            ? ('available' as const)
            : ('unavailable' as const),
      }));

    const launchSummary = [
      {
        id: 'summary-report',
        label: 'Report',
        value: reportTitle,
      },
      {
        id: 'summary-instance',
        label: 'Report instance',
        value: instance.id,
      },
      {
        id: 'summary-created-at',
        label: 'Created at',
        value: formatDateLabel(instance.createdAt),
      },
      {
        id: 'summary-finished-at',
        label: 'Finished at',
        value: formatDateLabel(instance.finishedAt),
      },
      {
        id: 'summary-credential-mode',
        label: 'Credential mode',
        value:
          launchSnapshot && launchSnapshot.reportCode === instance.reportCode
            ? launchSnapshot.credentialMode
            : 'unknown',
      },
      {
        id: 'summary-tenant',
        label: 'Tenant',
        value:
          launchSnapshot && launchSnapshot.reportCode === instance.reportCode
            ? launchSnapshot.selectedTenantId || 'not selected'
            : 'unknown',
      },
      {
        id: 'summary-organization',
        label: 'Organization',
        value:
          launchSnapshot && launchSnapshot.reportCode === instance.reportCode
            ? launchSnapshot.selectedOrganizationId || 'not selected'
            : 'unknown',
      },
    ];

    return {
      summary: `Report run completed successfully for ${reportTitle}.`,
      primaryArtifact,
      recentArtifacts,
      launchSummary,
    };
  }, [launchSnapshot, reportInstanceQuery.data, reportInstancesQuery.data, reportTitle]);

  return (
    <Stack gap="md" pt="md" className="h-full min-h-0">
      <Step4ResultCard
        result={resultModel}
        onBackToReports={() => {
          navigate('/report-launch');
        }}
        onRunAgain={() => {
          const reportCode = reportInstanceQuery.data?.reportCode;

          if (reportCode) {
            dispatch(selectReport(reportCode));
          }

          navigate('/report-launch/configure');
        }}
      />

      {reportInstanceQuery.error ? (
        <Alert color="red" variant="light">
          {toUiErrorMessage(reportInstanceQuery.error, 'Failed to load report result.')}
        </Alert>
      ) : null}

      {reportInstancesQuery.error ? (
        <Alert color="red" variant="light">
          {toUiErrorMessage(
            reportInstancesQuery.error,
            'Failed to load report run history.',
          )}
        </Alert>
      ) : null}
    </Stack>
  );
}
