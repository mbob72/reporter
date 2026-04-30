import { useMemo } from 'react';

import { DEFAULT_MOCK_USER_ID, mockUsers } from '@report-platform/auth';
import type {
  ReportListItem,
  ReportMetadata,
  SimpleSalesSummaryLaunchParams,
  SimpleSalesSummaryXlsxLaunchParams,
} from '@report-platform/contracts';
import {
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
} from '@report-platform/contracts';

import { useAppSelector } from '../../../../../app/hooks';
import { hasRoleAccess } from '../../../lib/access';
import type { ReportLaunchDraft } from '../../../store/launcherSlice';
import type { ReportStep2Configuration } from '../types';

type UseStep2LaunchConfigurationViewModelParams = {
  selectedReport: ReportListItem | undefined;
  metadata: ReportMetadata | undefined;
  metadataLoading: boolean;
  reportsLoading: boolean;
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

function buildSimpleSalesInitialValues(params: {
  selectedTenantId: string;
  selectedOrganizationId: string;
  launchDraft: ReportLaunchDraft | null;
}): SimpleSalesSummaryLaunchParams {
  const previousDraft =
    params.launchDraft?.reportCode === SIMPLE_SALES_SUMMARY_REPORT_CODE
      ? params.launchDraft.params
      : undefined;

  const credentials = previousDraft?.credentials ?? {
    mode: 'manual' as const,
    apiKey: '',
  };

  return {
    tenantId: params.selectedTenantId,
    organizationId: params.selectedOrganizationId,
    credentials,
  };
}

function buildSimpleSalesXlsxInitialValues(params: {
  launchDraft: ReportLaunchDraft | null;
}): SimpleSalesSummaryXlsxLaunchParams {
  const previousDraft =
    params.launchDraft?.reportCode === SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE
      ? params.launchDraft.params
      : undefined;

  return {
    name: previousDraft?.name ?? '',
    job: previousDraft?.job ?? '',
    email: previousDraft?.email ?? '',
    favoriteColor: previousDraft?.favoriteColor ?? '',
    age: previousDraft?.age ?? 18,
    website: previousDraft?.website ?? '',
    role: previousDraft?.role ?? 'developer',
    datasetKey: previousDraft?.datasetKey,
  };
}

export function useStep2LaunchConfigurationViewModel({
  selectedReport,
  metadata,
  metadataLoading,
  reportsLoading,
  isLaunching,
}: UseStep2LaunchConfigurationViewModelParams) {
  const selectedMockUserId = useAppSelector((state) => state.session.selectedMockUserId);
  const selectedReportCode = useAppSelector((state) => state.launcher.selectedReportCode);
  const selectedTenantId = useAppSelector((state) => state.launcher.selectedTenantId);
  const selectedOrganizationId = useAppSelector((state) => state.launcher.selectedOrganizationId);
  const launchDraft = useAppSelector((state) => state.launcher.launchDraft);

  const currentUser = mockUsers[selectedMockUserId] ?? mockUsers[DEFAULT_MOCK_USER_ID];
  const externalDependencyServiceKey = metadata?.externalDependencies[0]?.serviceKey;

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

      if (!selectedTenantId) {
        return 'No tenant selected yet.';
      }

      if (!selectedOrganizationId) {
        return 'No organization selected yet.';
      }

      return undefined;
    },
    [
      selectedReportCode,
      metadataLoading,
      reportsLoading,
      hasLaunchAccess,
      metadata,
      selectedTenantId,
      selectedOrganizationId,
    ],
  );

  const baseConfiguration = useMemo(
    () => ({
      reportTitle: metadata?.title ?? selectedReport?.title ?? selectedReportCode,
      reportDescription: metadata?.description ?? selectedReport?.description ?? 'Report launch',
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
          details: metadata ? `Minimum role: ${metadata.minRoleToLaunch}` : 'Metadata is loading.',
          severity: hasLaunchAccess ? ('info' as const) : ('critical' as const),
        },
        {
          id: 'tenant-scope',
          label: 'Tenant scope',
          details: selectedTenantId
            ? `Selected tenant: ${selectedTenantId}`
            : 'No tenant selected yet.',
          severity: selectedTenantId ? ('info' as const) : ('warning' as const),
        },
        {
          id: 'organization-scope',
          label: 'Organization scope',
          details: selectedOrganizationId
            ? `Selected organization: ${selectedOrganizationId}`
            : 'No organization selected yet.',
          severity: selectedOrganizationId ? ('info' as const) : ('warning' as const),
        },
        {
          id: 'external-dependency',
          label: 'External dependency',
          details: externalDependencyServiceKey
            ? `Service: ${externalDependencyServiceKey}`
            : 'No external dependency declared.',
          severity: externalDependencyServiceKey ? ('critical' as const) : ('info' as const),
        },
      ],
      canLaunch: Boolean(metadata) && hasLaunchAccess && !disabledReason && !isLaunching,
      disabledReason,
    }),
    [
      metadata,
      selectedReport,
      selectedReportCode,
      selectedMockUserId,
      currentUser.role,
      selectedTenantId,
      selectedOrganizationId,
      hasLaunchAccess,
      externalDependencyServiceKey,
      disabledReason,
      isLaunching,
    ],
  );

  const launchConfiguration = useMemo<ReportStep2Configuration | null>(() => {
    switch (selectedReportCode) {
      case SIMPLE_SALES_SUMMARY_REPORT_CODE:
        return {
          reportCode: SIMPLE_SALES_SUMMARY_REPORT_CODE,
          ...baseConfiguration,
          initialValues: buildSimpleSalesInitialValues({
            selectedTenantId,
            selectedOrganizationId,
            launchDraft,
          }),
          externalDependencyServiceKey,
        };
      case SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE:
        return {
          reportCode: SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
          ...baseConfiguration,
          initialValues: buildSimpleSalesXlsxInitialValues({ launchDraft }),
        };
      default:
        return null;
    }
  }, [
    selectedReportCode,
    baseConfiguration,
    selectedTenantId,
    selectedOrganizationId,
    launchDraft,
    externalDependencyServiceKey,
  ]);

  return {
    launchConfiguration,
  };
}
