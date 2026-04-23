import { Alert, Stack } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAppDispatch } from '../../../app/hooks';
import { Step4ResultCard } from '../../report-launcher-story/components/Step4ResultCard';
import type { Step4ResultModel } from '../../report-launcher-story/types';
import {
  useGetReportInstanceQuery,
  useListReportInstancesByReportCodeQuery,
  useListReportsQuery,
} from '../api/reportApi';
import {
  formatReportByteLength,
  formatReportDateLabel,
  mapReportInstanceListItemToResultArtifact,
  mapReportInstanceToPrimaryArtifact,
} from '../lib/reportInstanceMappers';
import { toUiErrorMessage } from '../lib/toUiErrorMessage';
import { selectReport } from '../store/launcherSlice';

export function Step4ResultContainer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { reportInstanceId = '' } = useParams();

  const reportInstanceQuery = useGetReportInstanceQuery(reportInstanceId, {
    skip: reportInstanceId.trim().length === 0,
    refetchOnMountOrArgChange: true,
  });

  const reportInstancesQuery = useListReportInstancesByReportCodeQuery(
    reportInstanceQuery.data?.reportCode ?? '',
    {
      skip: !reportInstanceQuery.data || reportInstanceQuery.data.reportCode.trim().length === 0,
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

    const report = (reportsQuery.data ?? []).find((reportItem) => reportItem.code === reportCode);

    return report?.title ?? reportCode;
  }, [reportInstanceQuery.data?.reportCode, reportsQuery.data]);

  const resultModel: Step4ResultModel = useMemo(() => {
    const instance = reportInstanceQuery.data;

    if (!instance) {
      return {
        summary: 'Loading result...',
        recentArtifacts: [],
      };
    }

    const currentArtifact = mapReportInstanceToPrimaryArtifact(instance) ?? {
      id: instance.artifactId ?? instance.id,
      fileName: instance.fileName ?? `${instance.reportCode}-${instance.id}`,
      sizeLabel: formatReportByteLength(instance.byteLength),
      createdAt: formatReportDateLabel(instance.finishedAt ?? instance.createdAt),
      downloadUrl: instance.result?.downloadUrl,
      availability:
        instance.status === 'completed' && Boolean(instance.result?.downloadUrl)
          ? ('available' as const)
          : ('unavailable' as const),
    };

    const historicalArtifacts = (reportInstancesQuery.data ?? [])
      .filter((instanceItem) => instanceItem.id !== instance.id)
      .map(mapReportInstanceListItemToResultArtifact);

    const recentArtifacts = [currentArtifact, ...historicalArtifacts];

    return {
      summary: `Report run completed successfully for ${reportTitle}.`,
      recentArtifacts,
    };
  }, [reportInstanceQuery.data, reportInstancesQuery.data, reportTitle]);

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
          {toUiErrorMessage(reportInstancesQuery.error, 'Failed to load report run history.')}
        </Alert>
      ) : null}
    </Stack>
  );
}
