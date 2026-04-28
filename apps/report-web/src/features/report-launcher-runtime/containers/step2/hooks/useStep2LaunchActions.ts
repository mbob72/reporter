import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../../../../app/hooks';
import { useLaunchReportMutation } from '../../../api/reportApi';
import { toUiErrorMessage } from '../../../lib/toUiErrorMessage';
import {
  type ReportLaunchDraft,
  saveLaunchDraft,
  saveLaunchSnapshot,
} from '../../../store/launcherSlice';

export function useStep2LaunchActions() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const selectedReportCode = useAppSelector((state) => state.launcher.selectedReportCode);

  const [launchReport, launchReportMutationState] = useLaunchReportMutation();
  const [launchError, setLaunchError] = useState<string | null>(null);

  const handleBackToReportsClick = useCallback(
    function handleBackToReportsClick() {
      navigate('/report-launch');
    },
    [navigate],
  );

  const handleLaunchSubmit = useCallback(
    async function handleLaunchSubmit(draft: ReportLaunchDraft) {
      if (!selectedReportCode) {
        return;
      }

      if (draft.reportCode !== selectedReportCode) {
        setLaunchError('Selected report changed. Please review configuration and retry.');
        return;
      }

      setLaunchError(null);
      dispatch(saveLaunchDraft(draft));

      try {
        const launchResponse = await launchReport({
          reportCode: draft.reportCode,
          params: draft.params,
        }).unwrap();

        dispatch(
          saveLaunchSnapshot({
            draft,
            submittedAt: new Date().toISOString(),
          }),
        );

        navigate(`/report-runs/${launchResponse.reportInstanceId}`);
      } catch (error) {
        setLaunchError(toUiErrorMessage(error, 'Failed to launch report.'));
      }
    },
    [dispatch, launchReport, navigate, selectedReportCode],
  );

  return {
    launchReportMutationState,
    launchError,
    handleBackToReportsClick,
    handleLaunchSubmit,
  };
}
