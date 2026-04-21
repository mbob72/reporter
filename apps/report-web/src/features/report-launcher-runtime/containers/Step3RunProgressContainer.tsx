import { Alert, Stack } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAppDispatch } from '../../../app/hooks';
import { Step3RunProgressCard } from '../../report-launcher-story/components/Step3RunProgressCard';
import type { RunProgressSnapshot } from '../../report-launcher-story/types';
import { useGetReportInstanceQuery, useListReportsQuery } from '../api/reportApi';
import { toUiErrorMessage } from '../lib/toUiErrorMessage';
import { selectReport } from '../store/launcherSlice';

const stageOrder: Array<'queued' | 'preparing' | 'generating' | 'storing-result' | 'done'> = [
  'queued',
  'preparing',
  'generating',
  'storing-result',
  'done',
];

const stageLabels: Record<(typeof stageOrder)[number], string> = {
  queued: 'Queued',
  preparing: 'Preparing',
  generating: 'Generating',
  'storing-result': 'Storing result',
  done: 'Completed',
};

function buildRunSnapshot(params: {
  status: 'queued' | 'running' | 'failed' | 'completed';
  stage: 'queued' | 'preparing' | 'generating' | 'storing-result' | 'done' | 'failed';
  progressPercent: number;
  errorMessage?: string;
}): RunProgressSnapshot {
  const resolvedStage =
    params.stage === 'failed' ? 'generating' : (params.stage as (typeof stageOrder)[number]);
  const currentStageIndex = Math.max(0, stageOrder.indexOf(resolvedStage));

  const stages = stageOrder.map((stage, stageIndex) => {
    if (params.status === 'completed') {
      return {
        id: stage,
        label: stageLabels[stage],
        status: 'completed' as const,
      };
    }

    if (params.status === 'failed') {
      if (stageIndex < currentStageIndex) {
        return {
          id: stage,
          label: stageLabels[stage],
          status: 'completed' as const,
        };
      }

      if (stageIndex === currentStageIndex) {
        return {
          id: stage,
          label: stageLabels[stage],
          status: 'failed' as const,
        };
      }

      return {
        id: stage,
        label: stageLabels[stage],
        status: 'pending' as const,
      };
    }

    if (stageIndex < currentStageIndex) {
      return {
        id: stage,
        label: stageLabels[stage],
        status: 'completed' as const,
      };
    }

    if (stageIndex === currentStageIndex) {
      return {
        id: stage,
        label: stageLabels[stage],
        status: 'active' as const,
      };
    }

    return {
      id: stage,
      label: stageLabels[stage],
      status: 'pending' as const,
    };
  });

  return {
    status: params.status,
    stageLabel: params.stage,
    progress: Math.round(params.progressPercent),
    stages,
    diagnostics: [
      {
        id: 'runtime-status',
        level: 'info',
        message: `Runtime state: ${params.status}`,
      },
    ],
    failureMessage: params.errorMessage,
  };
}

export function Step3RunProgressContainer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { reportInstanceId = '' } = useParams();

  const reportInstanceQuery = useGetReportInstanceQuery(reportInstanceId, {
    skip: reportInstanceId.trim().length === 0,
    pollingInterval: 1000,
    refetchOnMountOrArgChange: true,
  });
  const reportsQuery = useListReportsQuery();

  const reportName = useMemo(() => {
    if (!reportInstanceQuery.data) {
      return 'Report run';
    }

    const report = (reportsQuery.data ?? []).find(
      (reportItem) => reportItem.code === reportInstanceQuery.data?.reportCode,
    );

    return report?.title ?? reportInstanceQuery.data.reportCode;
  }, [reportInstanceQuery.data, reportsQuery.data]);

  const snapshot = useMemo(() => {
    if (!reportInstanceQuery.data) {
      return buildRunSnapshot({
        status: 'queued',
        stage: 'queued',
        progressPercent: 0,
      });
    }

    return buildRunSnapshot({
      status: reportInstanceQuery.data.status,
      stage: reportInstanceQuery.data.stage,
      progressPercent: reportInstanceQuery.data.progressPercent,
      errorMessage: reportInstanceQuery.data.errorMessage,
    });
  }, [reportInstanceQuery.data]);

  useEffect(() => {
    if (!reportInstanceId) {
      navigate('/report-launch', { replace: true });
      return;
    }

    if (reportInstanceQuery.data?.status === 'completed') {
      navigate(`/report-runs/${reportInstanceId}/result`, { replace: true });
    }
  }, [navigate, reportInstanceId, reportInstanceQuery.data?.status]);

  return (
    <Stack gap="md" pt="md" className="h-full min-h-0">
      <Step3RunProgressCard
        reportName={reportName}
        reportInstanceId={reportInstanceId}
        snapshot={snapshot}
        onRefresh={() => {
          void reportInstanceQuery.refetch();
        }}
        onRetry={() => {
          if (reportInstanceQuery.data?.reportCode) {
            dispatch(selectReport(reportInstanceQuery.data.reportCode));
          }

          navigate('/report-launch/configure');
        }}
        onGoToResult={() => {
          navigate(`/report-runs/${reportInstanceId}/result`);
        }}
      />

      {reportInstanceQuery.error ? (
        <Alert color="red" variant="light">
          {toUiErrorMessage(
            reportInstanceQuery.error,
            'Failed to load report instance state.',
          )}
        </Alert>
      ) : null}
    </Stack>
  );
}
