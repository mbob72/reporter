import { Paper, Radio, Select, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useMemo } from 'react';

import {
  SIMPLE_SALES_SUMMARY_REPORT_CODE,
  SimpleSalesSummaryLaunchParamsSchema,
} from '@report-platform/contracts';

import { Step2LaunchConfigurationCard } from '../../../../report-launcher-story/components/Step2LaunchConfigurationCard';
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

  useEffect(
    function syncInitialValuesEffect() {
      setValues(syncedInitialValues);
      clearErrors();
    },
    [clearErrors, setValues, syncedInitialValues],
  );

  const selectedSharedSettingId =
    form.values.credentials.mode === 'shared_setting'
      ? form.values.credentials.sharedSettingId
      : '';

  const activeSharedSettingDescription = useMemo(() => {
    return (
      configuration.sharedSettings.find((setting) => setting.id === selectedSharedSettingId)
        ?.description ??
      configuration.sharedSettingsEmptyReason ??
      'Select a shared setting before launch.'
    );
  }, [
    configuration.sharedSettings,
    configuration.sharedSettingsEmptyReason,
    selectedSharedSettingId,
  ]);

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
                    : (configuration.sharedSettings[0]?.id ?? ''),
              });
            }}
          >
            <Stack gap={8}>
              <Radio value="manual" label="Manual API key" />
              <Radio
                value="shared_setting"
                label="Shared setting"
                disabled={configuration.sharedSettings.length === 0}
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
              data={configuration.sharedSettings.map((setting) => ({
                value: setting.id,
                label: setting.label,
              }))}
              disabled={
                configuration.sharedSettingsLoading || configuration.sharedSettings.length === 0
              }
              description={
                configuration.sharedSettingsLoading
                  ? 'Loading shared settings...'
                  : activeSharedSettingDescription
              }
              error={form.errors['credentials.sharedSettingId']}
              onChange={(nextValue) => {
                form.setFieldValue('credentials.sharedSettingId', nextValue ?? '');
              }}
            />
          )}
        </Stack>
      </Paper>
    </Step2LaunchConfigurationCard>
  );
}
