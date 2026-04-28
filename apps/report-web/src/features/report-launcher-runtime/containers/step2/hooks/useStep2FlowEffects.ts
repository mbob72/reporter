import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../../../../app/hooks';
import type { OrganizationOption, TenantOption } from '../../../api/reportApi';
import { setSelectedOrganization, setSelectedTenant } from '../../../store/launcherSlice';

type UseStep2FlowEffectsParams = {
  tenantOptions: TenantOption[];
  organizationOptions: OrganizationOption[];
};

export function useStep2FlowEffects({
  tenantOptions,
  organizationOptions,
}: UseStep2FlowEffectsParams) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const selectedReportCode = useAppSelector((state) => state.launcher.selectedReportCode);
  const selectedTenantId = useAppSelector((state) => state.launcher.selectedTenantId);
  const selectedOrganizationId = useAppSelector((state) => state.launcher.selectedOrganizationId);

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
}
