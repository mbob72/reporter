import { Alert, Paper, Radio, Select, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useMemo } from 'react';

import {
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SimpleSalesSummaryLaunchParamsSchema,
} from '@report-platform/contracts';

import { Step2LaunchConfigurationCard } from '../../../../report-launcher-story/components/Step2LaunchConfigurationCard';
import { useListSharedSettingsQuery } from '../../../api/reportApi';
import { toUiErrorMessage } from '../../../lib/toUiErrorMessage';
import type { ReportStep2ComponentProps, SimpleSalesSummaryStep2Configuration } from '../types';
import { applyZodErrors } from './zodFormErrors';

export function SimpleSalesSummaryStep2({
  configuration,
  isLaunching,
  onBackToReports,
  onLaunchDraft,
}: ReportStep2ComponentProps<SimpleSalesSummaryStep2Configuration>) {
  const form = useForm({
    initialValues: configuration.initialValues,
  });
  const setValues = form.setValues;
  const clearErrors = form.clearErrors;
  const initialValuesSignature = useMemo(
    () => JSON.stringify(configuration.initialValues),
    [configuration.initialValues],
  );
  const syncedInitialValues = useMemo(() => configuration.initialValues, [initialValuesSignature]);
  const sharedSettingsQuery = useListSharedSettingsQuery(
    {
      serviceKey: configuration.externalDependencyServiceKey ?? '',
    },
    {
      skip: !configuration.externalDependencyServiceKey,
      refetchOnMountOrArgChange: true,
    },
  );
  const sharedSettings = useMemo(
    () =>
      (sharedSettingsQuery.data ?? []).map((setting) => ({
        id: setting.id,
        label: setting.label,
        description: `Service key: ${setting.serviceKey}`,
      })),
    [sharedSettingsQuery.data],
  );
  const sharedSettingsLoading =
    Boolean(configuration.externalDependencyServiceKey) &&
    (sharedSettingsQuery.isLoading || sharedSettingsQuery.isFetching);
  const sharedSettingsEmptyReason = useMemo(() => {
    if (!configuration.externalDependencyServiceKey) {
      return 'This report does not require shared settings.';
    }

    if (sharedSettingsLoading) {
      return undefined;
    }

    if (sharedSettings.length === 0) {
      return 'No shared settings are available for current user/report context.';
    }

    return undefined;
  }, [configuration.externalDependencyServiceKey, sharedSettingsLoading, sharedSettings.length]);

  useEffect(
    function syncInitialValuesEffect() {
      setValues(syncedInitialValues);
      clearErrors();
    },
    [clearErrors, setValues, syncedInitialValues],
  );

  useEffect(
    function syncSharedSettingSelectionWithLoadedOptionsEffect() {
      const credentials = form.values.credentials;

      if (credentials.mode !== 'shared_setting') {
        return;
      }

      if (sharedSettings.length === 0) {
        return;
      }

      const hasSelectedSharedSetting = sharedSettings.some(
        (setting) => setting.id === credentials.sharedSettingId,
      );

      if (!hasSelectedSharedSetting) {
        form.setFieldValue('credentials.sharedSettingId', sharedSettings[0].id);
      }
    },
    [form, sharedSettings],
  );

  const selectedSharedSettingId =
    form.values.credentials.mode === 'shared_setting'
      ? form.values.credentials.sharedSettingId
      : '';

  const activeSharedSettingDescription = useMemo(() => {
    return (
      sharedSettings.find((setting) => setting.id === selectedSharedSettingId)?.description ??
      sharedSettingsEmptyReason ??
      'Select a shared setting before launch.'
    );
  }, [sharedSettings, sharedSettingsEmptyReason, selectedSharedSettingId]);

  const handleSubmit = form.onSubmit((values) => {
    form.clearErrors();
    const parsed = SimpleSalesSummaryLaunchParamsSchema.safeParse(values);

    if (!parsed.success) {
      applyZodErrors(form, parsed.error);
      return;
    }

    void onLaunchDraft({
      reportCode: SIMPLE_SALES_SUMMARY_REPORT_CODE,
      params: parsed.data,
    });
  });

  return (
    <Step2LaunchConfigurationCard
      configuration={configuration}
      onSubmit={handleSubmit}
      onBackToReports={onBackToReports}
      isLaunching={isLaunching}
    >
      <Paper withBorder radius="md" p="md" className="bg-white/80">
        <Stack gap="sm">
          <Text fw={700}>Credentials</Text>
          <Radio.Group
            value={form.values.credentials.mode}
            onChange={(nextValue) => {
              const mode = nextValue as 'manual' | 'shared_setting';

              if (mode === 'manual') {
                form.setFieldValue('credentials', {
                  mode: 'manual',
                  apiKey:
                    form.values.credentials.mode === 'manual' ? form.values.credentials.apiKey : '',
                });
                return;
              }

              form.setFieldValue('credentials', {
                mode: 'shared_setting',
                sharedSettingId:
                  form.values.credentials.mode === 'shared_setting'
                    ? form.values.credentials.sharedSettingId
                    : (sharedSettings[0]?.id ?? ''),
              });
            }}
          >
            <Stack gap={8}>
              <Radio value="manual" label="Manual API key" />
              <Radio
                value="shared_setting"
                label="Shared setting"
                disabled={sharedSettings.length === 0}
              />
            </Stack>
          </Radio.Group>

          {form.values.credentials.mode === 'manual' ? (
            <TextInput
              label="OpenWeather API key"
              placeholder="ow-live-..."
              value={form.values.credentials.apiKey}
              error={form.errors['credentials.apiKey']}
              onChange={(event) => {
                form.setFieldValue('credentials.apiKey', event.currentTarget.value);
              }}
            />
          ) : (
            <Select
              label="Shared setting"
              value={selectedSharedSettingId}
              data={sharedSettings.map((setting) => ({
                value: setting.id,
                label: setting.label,
              }))}
              disabled={sharedSettingsLoading || sharedSettings.length === 0}
              description={
                sharedSettingsLoading
                  ? 'Loading shared settings...'
                  : activeSharedSettingDescription
              }
              error={form.errors['credentials.sharedSettingId']}
              onChange={(nextValue) => {
                form.setFieldValue('credentials.sharedSettingId', nextValue ?? '');
              }}
            />
          )}

          {sharedSettingsQuery.error ? (
            <Alert color="red" variant="light">
              {toUiErrorMessage(sharedSettingsQuery.error, 'Failed to load shared settings.')}
            </Alert>
          ) : null}
        </Stack>
      </Paper>
    </Step2LaunchConfigurationCard>
  );
}
