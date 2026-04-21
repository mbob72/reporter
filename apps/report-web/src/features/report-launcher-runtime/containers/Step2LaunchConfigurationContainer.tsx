import { Alert, Stack } from '@mantine/core';

import { Step2LaunchConfigurationCard } from '../../report-launcher-story/components/Step2LaunchConfigurationCard';
import { toUiErrorMessage } from '../lib/toUiErrorMessage';
import { useStep2DataQueries } from './step2/hooks/useStep2DataQueries';
import { useStep2FlowEffects } from './step2/hooks/useStep2FlowEffects';
import { useStep2LaunchActions } from './step2/hooks/useStep2LaunchActions';
import { useStep2LaunchConfigurationViewModel } from './step2/hooks/useStep2LaunchConfigurationViewModel';

export function Step2LaunchConfigurationContainer() {
  const step2Queries = useStep2DataQueries();

  useStep2FlowEffects({
    hasExternalDependency: step2Queries.hasExternalDependency,
    tenantOptions: step2Queries.tenantsQuery.data ?? [],
    organizationOptions: step2Queries.organizationsQuery.data ?? [],
    sharedSettings: step2Queries.sharedSettingsQuery.data ?? [],
  });

  const step2Actions = useStep2LaunchActions({
    externalDependencyServiceKey: step2Queries.externalDependency?.serviceKey,
  });

  const { launchConfiguration } = useStep2LaunchConfigurationViewModel({
    selectedReport: step2Queries.selectedReport,
    metadata: step2Queries.metadataQuery.data,
    metadataLoading: step2Queries.metadataQuery.isLoading,
    reportsLoading: step2Queries.reportsQuery.isLoading,
    hasExternalDependency: step2Queries.hasExternalDependency,
    externalDependencyServiceKey: step2Queries.externalDependency?.serviceKey,
    sharedSettings: step2Queries.sharedSettingsQuery.data ?? [],
    sharedSettingsLoading:
      step2Queries.sharedSettingsQuery.isFetching ||
      step2Queries.sharedSettingsQuery.isLoading,
    isLaunching: step2Actions.launchReportMutationState.isLoading,
  });

  return (
    <Stack gap="md" pt="md" className="h-full min-h-0">
      <Step2LaunchConfigurationCard
        key={launchConfiguration.reportCode}
        configuration={launchConfiguration}
        isLaunching={step2Actions.launchReportMutationState.isLoading}
        onBackToReports={step2Actions.handleBackToReportsClick}
        onCredentialModeChange={step2Actions.handleCredentialModeChange}
        onManualApiKeyChange={step2Actions.handleManualApiKeyChange}
        onSharedSettingChange={step2Actions.handleSharedSettingChange}
        onParameterChange={step2Actions.handleParameterChange}
        onLaunch={step2Actions.handleLaunchSubmit}
      />

      {step2Queries.metadataQuery.error ? (
        <Alert color="red" variant="light">
          {toUiErrorMessage(step2Queries.metadataQuery.error, 'Failed to load report metadata.')}
        </Alert>
      ) : null}

      {step2Queries.tenantsQuery.error ? (
        <Alert color="red" variant="light">
          {toUiErrorMessage(step2Queries.tenantsQuery.error, 'Failed to load tenants.')}
        </Alert>
      ) : null}

      {step2Queries.organizationsQuery.error ? (
        <Alert color="red" variant="light">
          {toUiErrorMessage(
            step2Queries.organizationsQuery.error,
            'Failed to load organizations.',
          )}
        </Alert>
      ) : null}

      {step2Queries.sharedSettingsQuery.error ? (
        <Alert color="red" variant="light">
          {toUiErrorMessage(
            step2Queries.sharedSettingsQuery.error,
            'Failed to load shared settings.',
          )}
        </Alert>
      ) : null}

      {step2Actions.launchError ? (
        <Alert color="red" variant="light">
          {step2Actions.launchError}
        </Alert>
      ) : null}
    </Stack>
  );
}
