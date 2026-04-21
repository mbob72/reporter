import { Alert, Button, Group, Stack } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { type MockUserId, mockUsers } from '@report-platform/auth';

import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { Step1ReportSelectionCard } from '../../report-launcher-story/components/Step1ReportSelectionCard';
import { buildLauncherUsers } from '../lib/launcherUsers';
import { hasRoleAccess } from '../lib/access';
import { toUiErrorMessage } from '../lib/toUiErrorMessage';
import { useListReportsQuery } from '../api/reportApi';
import {
  resetLaunchDraft,
  selectReport,
} from '../store/launcherSlice';
import { selectMockUser } from '../store/sessionSlice';

export function Step1ReportSelectionContainer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const users = useMemo(() => buildLauncherUsers(), []);
  const selectedMockUserId = useAppSelector((state) => state.session.selectedMockUserId);
  const selectedReportCode = useAppSelector((state) => state.launcher.selectedReportCode);
  const currentUser = mockUsers[selectedMockUserId];

  const reportsQuery = useListReportsQuery();

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

  const selectedReport = reportSelectionItems.find(
    (report) => report.code === selectedReportCode,
  );

  const canProceedToConfigure = selectedReport?.availability === 'available';

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

  return (
    <Stack gap="md" pt="md">
      <Step1ReportSelectionCard
        users={users}
        reports={reportSelectionItems}
        selectedUserId={selectedMockUserId}
        selectedReportCode={selectedReportCode}
        onUserChange={(nextUserId) => {
          dispatch(selectMockUser(nextUserId as MockUserId));
          dispatch(resetLaunchDraft());
        }}
        onSelectReport={(reportCode) => {
          dispatch(selectReport(reportCode));
          dispatch(resetLaunchDraft());
        }}
      />

      {reportsQuery.error ? (
        <Alert color="red" variant="light">
          {toUiErrorMessage(reportsQuery.error, 'Failed to load reports.')}
        </Alert>
      ) : null}

      <Group justify="flex-end" className="w-full">
        <Button
          disabled={
            !canProceedToConfigure ||
            reportsQuery.isLoading ||
            reportsQuery.isFetching ||
            selectedReportCode.trim().length === 0
          }
          onClick={() => {
            navigate('/report-launch/configure');
          }}
          className="w-full sm:w-auto"
        >
          Continue to launch config
        </Button>
      </Group>
    </Stack>
  );
}
