import { Alert, Stack } from '@mantine/core';
import type { ComponentType } from 'react';

import { toUiErrorMessage } from '../lib/toUiErrorMessage';
import { useStep2DataQueries } from './step2/hooks/useStep2DataQueries';
import { useStep2FlowEffects } from './step2/hooks/useStep2FlowEffects';
import { useStep2LaunchActions } from './step2/hooks/useStep2LaunchActions';
import { useStep2LaunchConfigurationViewModel } from './step2/hooks/useStep2LaunchConfigurationViewModel';
import { reportStep2Registry } from './step2/reportStep2Registry';
import type { ReportStep2ComponentProps, ReportStep2Configuration } from './step2/types';

export function Step2LaunchConfigurationContainer() {
  const step2Queries = useStep2DataQueries();

  useStep2FlowEffects({
    tenantOptions: step2Queries.tenantsQuery.data ?? [],
    organizationOptions: step2Queries.organizationsQuery.data ?? [],
  });

  const step2Actions = useStep2LaunchActions();

  const { launchConfiguration } = useStep2LaunchConfigurationViewModel({
    selectedReport: step2Queries.selectedReport,
    metadata: step2Queries.metadataQuery.data,
    metadataLoading: step2Queries.metadataQuery.isLoading,
    reportsLoading: step2Queries.reportsQuery.isLoading,
    externalDependencyServiceKey: step2Queries.externalDependency?.serviceKey,
    sharedSettings: step2Queries.sharedSettingsQuery.data ?? [],
    sharedSettingsLoading:
      step2Queries.sharedSettingsQuery.isFetching || step2Queries.sharedSettingsQuery.isLoading,
    isLaunching: step2Actions.launchReportMutationState.isLoading,
  });

  const Step2Component = launchConfiguration
    ? (reportStep2Registry[launchConfiguration.reportCode] as ComponentType<
        ReportStep2ComponentProps<ReportStep2Configuration>
      >)
    : null;

  return (
    <Stack gap="md" pt="md" className="h-full min-h-0">
      {launchConfiguration && Step2Component ? (
        <Step2Component
          key={launchConfiguration.reportCode}
          configuration={launchConfiguration}
          isLaunching={step2Actions.launchReportMutationState.isLoading}
          onBackToReports={step2Actions.handleBackToReportsClick}
          onLaunchDraft={step2Actions.handleLaunchSubmit}
        />
      ) : (
        <Alert color="red" variant="light">
          Unsupported report code for Step 2.
        </Alert>
      )}

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
          {toUiErrorMessage(step2Queries.organizationsQuery.error, 'Failed to load organizations.')}
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
