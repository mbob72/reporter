import { useAppSelector } from '../../../../../app/hooks';
import {
  useGetReportMetadataQuery,
  useListOrganizationsByTenantQuery,
  useListReportsQuery,
  useListSharedSettingsQuery,
  useListTenantsQuery,
} from '../../../api/reportApi';
import { selectSelectedReport } from '../../../store/launcherSelectors';

export function useStep2DataQueries() {
  const selectedMockUserId = useAppSelector((state) => state.session.selectedMockUserId);
  const selectedReportCode = useAppSelector((state) => state.launcher.selectedReportCode);
  const selectedTenantId = useAppSelector((state) => state.launcher.selectedTenantId);

  const reportsQuery = useListReportsQuery();
  const metadataQuery = useGetReportMetadataQuery(selectedReportCode, {
    skip: selectedReportCode.trim().length === 0,
  });

  const tenantsQuery = useListTenantsQuery(selectedMockUserId, {
    refetchOnMountOrArgChange: true,
  });

  const organizationsQuery = useListOrganizationsByTenantQuery(
    {
      tenantId: selectedTenantId,
      mockUserId: selectedMockUserId,
    },
    {
      skip: selectedTenantId.trim().length === 0,
      refetchOnMountOrArgChange: true,
    },
  );

  const externalDependency = metadataQuery.data?.externalDependencies[0] ?? null;
  const hasExternalDependency = Boolean(externalDependency);

  const sharedSettingsQuery = useListSharedSettingsQuery(
    {
      reportCode: selectedReportCode,
      serviceKey: externalDependency?.serviceKey ?? '',
      mockUserId: selectedMockUserId,
    },
    {
      skip:
        !externalDependency ||
        selectedReportCode.trim().length === 0 ||
        externalDependency.serviceKey.trim().length === 0,
      refetchOnMountOrArgChange: true,
    },
  );

  const selectedReport = useAppSelector(selectSelectedReport);

  return {
    reportsQuery,
    metadataQuery,
    tenantsQuery,
    organizationsQuery,
    sharedSettingsQuery,
    externalDependency,
    hasExternalDependency,
    selectedReport,
  };
}
