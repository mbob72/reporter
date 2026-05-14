import { Alert, Stack } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { type MockUserId, mockUsers } from '@report-platform/auth';

import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Step1ReportSelectionCard } from '../../report-launcher-story/components/Step1ReportSelectionCard';
import { buildLauncherUsers } from '../lib/launcherUsers';
import { hasRoleAccess } from '../lib/access';
import { triggerBrowserDownload } from '../lib/downloadGeneratedFile';
import { mapReadyReportInstancesSummary } from '../lib/reportInstanceMappers';
import { toUiErrorMessage } from '../lib/toUiErrorMessage';
import {
  useDownloadGeneratedFileMutation,
  useListReportInstancesByReportCodeQuery,
  useListReportsQuery,
} from '../api/reportApi';
import { resetLaunchDraft, selectReport } from '../store/launcherSlice';
import { selectMockUser } from '../store/sessionSlice';

export function Step1ReportSelectionContainer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const users = useMemo(() => buildLauncherUsers(), []);
  const selectedMockUserId = useAppSelector((state) => state.session.selectedMockUserId);
  const accessToken = useAppSelector((state) => state.session.accessToken);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadGeneratedFile] = useDownloadGeneratedFileMutation();
  const selectedReportCode = useAppSelector((state) => state.launcher.selectedReportCode);
  const currentUser = mockUsers[selectedMockUserId];

  const reportsQuery = useListReportsQuery(undefined, {
    skip: !accessToken,
  });
  const reportInstancesQuery = useListReportInstancesByReportCodeQuery(selectedReportCode, {
    skip: !accessToken || selectedReportCode.trim().length === 0,
    refetchOnMountOrArgChange: true,
  });

  const reportSelectionItems = useMemo(() => {
    const reportList = reportsQuery.data ?? [];

    return reportList.map((report) => {
      const hasAccess = hasRoleAccess(currentUser.role, report.minRoleToLaunch);

      return {
        code: report.code,
        name: report.title,
        description: report.description,
        minRoleToLaunch: report.minRoleToLaunch,
        availability: hasAccess ? ('available' as const) : ('unavailable' as const),
        unavailableReason: hasAccess ? undefined : ('insufficient_role' as const),
      };
    });
  }, [currentUser.role, reportsQuery.data]);

  const selectedReport = reportSelectionItems.find((report) => report.code === selectedReportCode);

  const canProceedToConfigure = selectedReport?.availability === 'available';
  const canOpenReadyInstanceLinks = Boolean(
    selectedReport?.availability === 'available' &&
      hasRoleAccess(currentUser.role, selectedReport.minRoleToLaunch),
  );

  const readyInstances = useMemo(() => {
    return mapReadyReportInstancesSummary({
      instances: reportInstancesQuery.data,
      canOpenLinks: canOpenReadyInstanceLinks,
      isLoading: reportInstancesQuery.isLoading || reportInstancesQuery.isFetching,
    });
  }, [
    canOpenReadyInstanceLinks,
    reportInstancesQuery.data,
    reportInstancesQuery.isFetching,
    reportInstancesQuery.isLoading,
  ]);

  useEffect(() => {
    if (reportSelectionItems.length === 0) {
      return;
    }

    if (
      selectedReportCode.trim().length === 0 ||
      !reportSelectionItems.some((report) => report.code === selectedReportCode)
    ) {
      dispatch(selectReport(reportSelectionItems[0].code));
    }
  }, [dispatch, reportSelectionItems, selectedReportCode]);

  const handleReadyInstanceDownload = useCallback(
    async (input: { id: string; label: string; actionHref: string }) => {
      try {
        setDownloadError(null);
        const payload = await downloadGeneratedFile({
          downloadUrl: input.actionHref,
          fallbackFileName: input.label,
        }).unwrap();
        triggerBrowserDownload(payload.fileBlob, payload.fileName);
      } catch (error) {
        setDownloadError(toUiErrorMessage(error, 'Failed to download generated file.'));
      }
    },
    [downloadGeneratedFile],
  );

  return (
    <Stack gap="md" pt="md" pb="xs" className="h-full min-h-0">
      <Step1ReportSelectionCard
        users={users}
        reports={reportSelectionItems}
        selectedUserId={selectedMockUserId}
        selectedReportCode={selectedReportCode}
        readyInstances={readyInstances}
        canContinueToLaunchConfig={
          Boolean(canProceedToConfigure) &&
          !reportsQuery.isLoading &&
          !reportsQuery.isFetching &&
          selectedReportCode.trim().length > 0
        }
        onUserChange={(nextUserId) => {
          dispatch(selectMockUser(nextUserId as MockUserId));
          dispatch(resetLaunchDraft());
        }}
        onSelectReport={(reportCode) => {
          dispatch(selectReport(reportCode));
          dispatch(resetLaunchDraft());
        }}
        onContinueToLaunchConfig={() => {
          navigate('/report-launch/configure');
        }}
        onReadyInstanceActionClick={handleReadyInstanceDownload}
      />

      {reportsQuery.error ? (
        <Alert color="red" variant="light">
          {toUiErrorMessage(reportsQuery.error, 'Failed to load reports.')}
        </Alert>
      ) : null}

      {reportInstancesQuery.error ? (
        <Alert color="red" variant="light">
          {toUiErrorMessage(reportInstancesQuery.error, 'Failed to load report run history.')}
        </Alert>
      ) : null}

      {downloadError ? (
        <Alert color="red" variant="light">
          {downloadError}
        </Alert>
      ) : null}
    </Stack>
  );
}
