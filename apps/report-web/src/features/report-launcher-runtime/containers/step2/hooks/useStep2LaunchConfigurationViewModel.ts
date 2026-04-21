import { useMemo } from 'react';

import {
  DEFAULT_MOCK_USER_ID,
  mockUsers,
} from '@report-platform/auth';
import type {
  ReportListItem,
  ReportMetadata,
  SharedSettingOption,
} from '@report-platform/contracts';

import { useAppSelector } from '../../../../../app/hooks';
import type {
  LaunchConfigurationModel,
  SharedSettingOption as SharedSettingViewOption,
} from '../../../../report-launcher-story/types';
import { hasRoleAccess } from '../../../lib/access';

type UseStep2LaunchConfigurationViewModelParams = {
  selectedReport: ReportListItem | undefined;
  metadata: ReportMetadata | undefined;
  metadataLoading: boolean;
  reportsLoading: boolean;
  hasExternalDependency: boolean;
  externalDependencyServiceKey: string | undefined;
  sharedSettings: SharedSettingOption[];
  sharedSettingsLoading: boolean;
  isLaunching: boolean;
};

function formatContextSummary(params: {
  mockUserId: string;
  role: string;
  selectedTenantId: string;
  selectedOrganizationId: string;
}) {
  return `Execution context: initiator=${params.mockUserId} (${params.role}), tenant=${params.selectedTenantId || 'not selected'}, organization=${params.selectedOrganizationId || 'not selected'}.`;
}

export function useStep2LaunchConfigurationViewModel({
  selectedReport,
  metadata,
  metadataLoading,
  reportsLoading,
  hasExternalDependency,
  externalDependencyServiceKey,
  sharedSettings,
  sharedSettingsLoading,
  isLaunching,
}: UseStep2LaunchConfigurationViewModelParams) {
  const selectedMockUserId = useAppSelector((state) => state.session.selectedMockUserId);
  const selectedReportCode = useAppSelector((state) => state.launcher.selectedReportCode);
  const selectedTenantId = useAppSelector((state) => state.launcher.selectedTenantId);
  const selectedOrganizationId = useAppSelector(
    (state) => state.launcher.selectedOrganizationId,
  );
  const credentialMode = useAppSelector((state) => state.launcher.credentialMode);
  const selectedSharedSettingId = useAppSelector(
    (state) => state.launcher.selectedSharedSettingId,
  );
  const manualApiKey = useAppSelector((state) => state.launcher.manualApiKey);
  const parameterValues = useAppSelector((state) => state.launcher.parameterValues);

  const currentUser = mockUsers[selectedMockUserId] ?? mockUsers[DEFAULT_MOCK_USER_ID];

  const sharedSettingOptions: SharedSettingViewOption[] = useMemo(
    () =>
      sharedSettings.map((setting) => ({
        id: setting.id,
        label: setting.label,
        description: `Service key: ${setting.serviceKey}`,
      })),
    [sharedSettings],
  );

  const sharedSettingsEmptyReason = useMemo(
    function buildSharedSettingsEmptyReason() {
      if (!hasExternalDependency) {
        return 'This report does not require shared settings.';
      }

      if (sharedSettingsLoading) {
        return undefined;
      }

      if (sharedSettingOptions.length === 0) {
        return 'No shared settings are available for current user/report context.';
      }

      return undefined;
    },
    [hasExternalDependency, sharedSettingsLoading, sharedSettingOptions.length],
  );

  const hasLaunchAccess = metadata
    ? hasRoleAccess(currentUser.role, metadata.minRoleToLaunch)
    : false;

  const disabledReason = useMemo(
    function buildLaunchDisabledReason() {
      if (selectedReportCode.trim().length === 0) {
        return 'Select report on Step 1 before configuration.';
      }

      if (metadataLoading || reportsLoading) {
        return 'Loading report metadata...';
      }

      if (!hasLaunchAccess && metadata) {
        return `Insufficient role. Minimum role is ${metadata.minRoleToLaunch}.`;
      }

      if (
        externalDependencyServiceKey &&
        credentialMode === 'shared_setting' &&
        !selectedSharedSettingId
      ) {
        return 'Select shared setting before launch.';
      }

      if (
        externalDependencyServiceKey &&
        credentialMode === 'manual' &&
        manualApiKey.trim().length === 0
      ) {
        return 'Provide API key in manual mode before launch.';
      }

      return undefined;
    },
    [
      selectedReportCode,
      metadataLoading,
      reportsLoading,
      hasLaunchAccess,
      metadata,
      externalDependencyServiceKey,
      credentialMode,
      selectedSharedSettingId,
      manualApiKey,
    ],
  );

  const launchConfiguration: LaunchConfigurationModel = useMemo(
    function buildLaunchConfigurationModel() {
      return {
        reportCode: selectedReportCode,
        reportTitle: metadata?.title ?? selectedReport?.title ?? selectedReportCode,
        reportDescription:
          metadata?.description ?? selectedReport?.description ?? 'Report launch',
        contextSummary: formatContextSummary({
          mockUserId: selectedMockUserId,
          role: currentUser.role,
          selectedTenantId,
          selectedOrganizationId,
        }),
        constraints: [
          {
            id: 'role-gate',
            label: 'Role gate',
            details: metadata
              ? `Minimum role: ${metadata.minRoleToLaunch}`
              : 'Metadata is loading.',
            severity: hasLaunchAccess ? 'info' : 'critical',
          },
          {
            id: 'tenant-scope',
            label: 'Tenant scope',
            details: selectedTenantId
              ? `Selected tenant: ${selectedTenantId}`
              : 'No tenant selected yet.',
            severity: selectedTenantId ? 'info' : 'warning',
          },
          {
            id: 'organization-scope',
            label: 'Organization scope',
            details: selectedOrganizationId
              ? `Selected organization: ${selectedOrganizationId}`
              : 'Organization is optional or not available.',
            severity: selectedOrganizationId ? 'info' : 'warning',
          },
          {
            id: 'external-dependency',
            label: 'External dependency',
            details: externalDependencyServiceKey
              ? `Service: ${externalDependencyServiceKey}`
              : 'No external dependency declared.',
            severity: externalDependencyServiceKey ? 'critical' : 'info',
          },
        ],
        parameterFields: (metadata?.fields ?? [])
          .filter((field) => field.kind === 'text')
          .map((field) => ({
            key: field.name,
            label: field.label,
            placeholder: field.label,
            required: field.required,
            value: parameterValues[field.name] ?? '',
          })),
        credentials: {
          manualLabel: 'Manual API key',
          sharedLabel: 'Shared setting',
          defaultMode: credentialMode,
          manualApiKey,
          sharedSettings: sharedSettingOptions,
          selectedSharedSettingId,
          sharedSettingsLoading: hasExternalDependency && sharedSettingsLoading,
          sharedSettingsEmptyReason,
          sharedModeDisabled: !hasExternalDependency,
        },
        canLaunch: Boolean(metadata) && hasLaunchAccess && !disabledReason && !isLaunching,
        disabledReason,
        externalDependency: externalDependencyServiceKey,
      };
    },
    [
      selectedReportCode,
      metadata,
      selectedReport,
      selectedMockUserId,
      currentUser.role,
      selectedTenantId,
      selectedOrganizationId,
      hasLaunchAccess,
      externalDependencyServiceKey,
      parameterValues,
      credentialMode,
      manualApiKey,
      sharedSettingOptions,
      selectedSharedSettingId,
      hasExternalDependency,
      sharedSettingsLoading,
      sharedSettingsEmptyReason,
      disabledReason,
      isLaunching,
    ],
  );

  return {
    launchConfiguration,
  };
}
