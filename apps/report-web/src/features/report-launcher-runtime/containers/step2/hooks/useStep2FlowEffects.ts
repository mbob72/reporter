import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import type { SharedSettingOption } from '@report-platform/contracts';

import { useAppDispatch, useAppSelector } from '../../../../../app/hooks';
import type {
  OrganizationOption,
  TenantOption,
} from '../../../api/reportApi';
import {
  setCredentialMode,
  setSelectedOrganization,
  setSelectedSharedSetting,
  setSelectedTenant,
} from '../../../store/launcherSlice';

type UseStep2FlowEffectsParams = {
  hasExternalDependency: boolean;
  tenantOptions: TenantOption[];
  organizationOptions: OrganizationOption[];
  sharedSettings: SharedSettingOption[];
};

export function useStep2FlowEffects({
  hasExternalDependency,
  tenantOptions,
  organizationOptions,
  sharedSettings,
}: UseStep2FlowEffectsParams) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const selectedReportCode = useAppSelector((state) => state.launcher.selectedReportCode);
  const selectedTenantId = useAppSelector((state) => state.launcher.selectedTenantId);
  const selectedOrganizationId = useAppSelector(
    (state) => state.launcher.selectedOrganizationId,
  );
  const selectedSharedSettingId = useAppSelector(
    (state) => state.launcher.selectedSharedSettingId,
  );
  const credentialMode = useAppSelector((state) => state.launcher.credentialMode);

  useEffect(
    function redirectToStep1WhenReportCodeIsMissingEffect() {
      if (selectedReportCode.trim().length === 0) {
        navigate('/report-launch', { replace: true });
      }
    },
    [navigate, selectedReportCode],
  );

  useEffect(
    function syncTenantSelectionWithAvailableOptionsEffect() {
      if (tenantOptions.length === 0) {
        if (selectedTenantId) {
          dispatch(setSelectedTenant(''));
        }

        return;
      }

      const hasSelectedTenant = tenantOptions.some(
        (tenantOption) => tenantOption.id === selectedTenantId,
      );

      if (!hasSelectedTenant) {
        dispatch(setSelectedTenant(tenantOptions[0].id));
      }
    },
    [dispatch, selectedTenantId, tenantOptions],
  );

  useEffect(
    function syncOrganizationSelectionWithTenantEffect() {
      if (!selectedTenantId) {
        if (selectedOrganizationId) {
          dispatch(setSelectedOrganization(''));
        }

        return;
      }

      if (organizationOptions.length === 0) {
        if (selectedOrganizationId) {
          dispatch(setSelectedOrganization(''));
        }

        return;
      }

      const hasSelectedOrganization = organizationOptions.some(
        (organizationOption) => organizationOption.id === selectedOrganizationId,
      );

      if (!hasSelectedOrganization) {
        dispatch(setSelectedOrganization(organizationOptions[0].id));
      }
    },
    [dispatch, selectedOrganizationId, selectedTenantId, organizationOptions],
  );

  useEffect(
    function forceManualCredentialModeWithoutExternalDependencyEffect() {
      if (!hasExternalDependency && credentialMode === 'shared_setting') {
        dispatch(setCredentialMode('manual'));
        dispatch(setSelectedSharedSetting(''));
      }
    },
    [credentialMode, dispatch, hasExternalDependency],
  );

  useEffect(
    function syncSharedSettingSelectionWithAvailableOptionsEffect() {
      if (credentialMode !== 'shared_setting') {
        return;
      }

      if (sharedSettings.length === 0) {
        if (selectedSharedSettingId) {
          dispatch(setSelectedSharedSetting(''));
        }

        return;
      }

      const hasSelectedSharedSetting = sharedSettings.some(
        (setting) => setting.id === selectedSharedSettingId,
      );

      if (!hasSelectedSharedSetting) {
        dispatch(setSelectedSharedSetting(sharedSettings[0].id));
      }
    },
    [credentialMode, dispatch, selectedSharedSettingId, sharedSettings],
  );
}
