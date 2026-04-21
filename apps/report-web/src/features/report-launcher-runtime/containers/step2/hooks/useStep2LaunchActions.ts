import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../../../../app/hooks';
import { useLaunchReportMutation } from '../../../api/reportApi';
import { toUiErrorMessage } from '../../../lib/toUiErrorMessage';
import {
  saveLaunchSnapshot,
  setCredentialMode,
  setManualApiKey,
  setParameterValue,
  setSelectedOrganization,
  setSelectedSharedSetting,
  setSelectedTenant,
} from '../../../store/launcherSlice';
import type { LaunchSubmitPayload } from '../../../../report-launcher-story/components/Step2LaunchConfigurationCard';

type UseStep2LaunchActionsParams = {
  externalDependencyServiceKey: string | undefined;
};

export function useStep2LaunchActions({
  externalDependencyServiceKey,
}: UseStep2LaunchActionsParams) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const selectedReportCode = useAppSelector((state) => state.launcher.selectedReportCode);
  const selectedTenantId = useAppSelector((state) => state.launcher.selectedTenantId);
  const selectedOrganizationId = useAppSelector(
    (state) => state.launcher.selectedOrganizationId,
  );

  const [launchReport, launchReportMutationState] = useLaunchReportMutation();
  const [launchError, setLaunchError] = useState<string | null>(null);

  const handleTenantChange = useCallback(
    function handleTenantChange(tenantId: string) {
      dispatch(setSelectedTenant(tenantId));
      dispatch(setSelectedOrganization(''));
    },
    [dispatch],
  );

  const handleOrganizationChange = useCallback(
    function handleOrganizationChange(organizationId: string) {
      dispatch(setSelectedOrganization(organizationId));
    },
    [dispatch],
  );

  const handleCredentialModeChange = useCallback(
    function handleCredentialModeChange(mode: LaunchSubmitPayload['credentialMode']) {
      dispatch(setCredentialMode(mode));
    },
    [dispatch],
  );

  const handleManualApiKeyChange = useCallback(
    function handleManualApiKeyChange(value: string) {
      dispatch(setManualApiKey(value));
    },
    [dispatch],
  );

  const handleSharedSettingChange = useCallback(
    function handleSharedSettingChange(sharedSettingId: string) {
      dispatch(setSelectedSharedSetting(sharedSettingId));
    },
    [dispatch],
  );

  const handleParameterChange = useCallback(
    function handleParameterChange(key: string, value: string) {
      dispatch(setParameterValue({ key, value }));
    },
    [dispatch],
  );

  const handleBackToReportsClick = useCallback(
    function handleBackToReportsClick() {
      navigate('/report-launch');
    },
    [navigate],
  );

  const handleLaunchSubmit = useCallback(
    async function handleLaunchSubmit(payload: LaunchSubmitPayload) {
      if (!selectedReportCode) {
        return;
      }

      setLaunchError(null);

      dispatch(setCredentialMode(payload.credentialMode));
      dispatch(setManualApiKey(payload.manualApiKey));
      dispatch(setSelectedSharedSetting(payload.sharedSettingId));

      for (const [key, value] of Object.entries(payload.parameters)) {
        dispatch(setParameterValue({ key, value }));
      }

      const launchParams: Record<string, unknown> = {};

      if (selectedTenantId) {
        launchParams.tenantId = selectedTenantId;
      }

      if (selectedOrganizationId) {
        launchParams.organizationId = selectedOrganizationId;
      }

      for (const [key, value] of Object.entries(payload.parameters)) {
        const normalizedValue = value.trim();

        if (normalizedValue.length > 0) {
          launchParams[key] = normalizedValue;
        }
      }

      if (externalDependencyServiceKey) {
        if (payload.credentialMode === 'manual') {
          launchParams.credentials = {
            mode: 'manual',
            apiKey: payload.manualApiKey.trim(),
          };
        } else {
          launchParams.credentials = {
            mode: 'shared_setting',
            sharedSettingId: payload.sharedSettingId.trim(),
          };
        }
      }

      try {
        const launchResponse = await launchReport({
          reportCode: selectedReportCode,
          params: launchParams,
        }).unwrap();

        dispatch(
          saveLaunchSnapshot({
            reportCode: selectedReportCode,
            selectedTenantId,
            selectedOrganizationId,
            credentialMode: payload.credentialMode,
            selectedSharedSettingId: payload.sharedSettingId,
            manualApiKey: payload.manualApiKey,
            parameters: payload.parameters,
            submittedAt: new Date().toISOString(),
          }),
        );

        navigate(`/report-runs/${launchResponse.reportInstanceId}`);
      } catch (error) {
        setLaunchError(toUiErrorMessage(error, 'Failed to launch report.'));
      }
    },
    [
      dispatch,
      externalDependencyServiceKey,
      launchReport,
      navigate,
      selectedOrganizationId,
      selectedReportCode,
      selectedTenantId,
    ],
  );

  return {
    launchReportMutationState,
    launchError,
    handleTenantChange,
    handleOrganizationChange,
    handleCredentialModeChange,
    handleManualApiKeyChange,
    handleSharedSettingChange,
    handleParameterChange,
    handleBackToReportsClick,
    handleLaunchSubmit,
  };
}
