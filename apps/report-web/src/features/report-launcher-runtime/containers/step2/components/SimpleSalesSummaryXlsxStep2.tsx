import { NativeSelect, NumberInput, Paper, Stack, TextInput } from '@mantine/core';
import { hasLength, isEmail, isInRange, isNotEmpty, matches, useForm } from '@mantine/form';
import { useEffect, useMemo } from 'react';

import {
  SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
  SimpleSalesSummaryXlsxLaunchParamsSchema,
} from '@report-platform/contracts';

import { Step2LaunchConfigurationCard } from '../../../../report-launcher-story/components/Step2LaunchConfigurationCard';
import type { ReportStep2ComponentProps, SimpleSalesSummaryXlsxStep2Configuration } from '../types';
import { applyZodErrors } from './zodFormErrors';

const ROLE_OPTIONS = ['developer', 'designer', 'manager'] as const;

function validateUrl(value: string): string | null {
  if (value.trim().length === 0) {
    return 'Invalid URL';
  }

  try {
    new URL(value);
    return null;
  } catch {
    return 'Invalid URL';
  }
}

function validateRole(value: string): string | null {
  return ROLE_OPTIONS.includes(value as (typeof ROLE_OPTIONS)[number]) ? null : 'Pick a valid role';
}

export function SimpleSalesSummaryXlsxStep2({
  configuration,
  isLaunching,
  onBackToReports,
  onLaunchDraft,
}: ReportStep2ComponentProps<SimpleSalesSummaryXlsxStep2Configuration>) {
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: configuration.initialValues,
    validate: {
      name: hasLength({ min: 2, max: 10 }, 'Name must be 2-10 characters long'),
      job: isNotEmpty('Enter your current job'),
      email: isEmail('Invalid email'),
      favoriteColor: matches(/^#([0-9a-f]{3}){1,2}$/, 'Enter a valid hex color'),
      age: isInRange({ min: 18, max: 99 }, 'You must be 18-99 years old to register'),
      website: validateUrl,
      role: validateRole,
    },
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

  const handleSubmit = form.onSubmit((values) => {
    form.clearErrors();
    const parsed = SimpleSalesSummaryXlsxLaunchParamsSchema.safeParse(values);

    if (!parsed.success) {
      applyZodErrors(form, parsed.error);
      return;
    }

    void onLaunchDraft({
      reportCode: SIMPLE_SALES_SUMMARY_XLSX_REPORT_CODE,
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
      <Paper
        withBorder
        radius="md"
        p="md"
        className="bg-white/80 max-h-[55vh] overflow-y-auto pr-1"
      >
        <Stack gap="sm">
          <TextInput
            label="Name"
            placeholder="Name"
            withAsterisk
            key={form.key('name')}
            {...form.getInputProps('name')}
          />
          <TextInput
            label="Your job"
            placeholder="Your job"
            withAsterisk
            key={form.key('job')}
            {...form.getInputProps('job')}
          />
          <TextInput
            label="Your email"
            placeholder="Your email"
            withAsterisk
            key={form.key('email')}
            {...form.getInputProps('email')}
          />
          <TextInput
            label="Your favorite color"
            placeholder="Your favorite color"
            withAsterisk
            key={form.key('favoriteColor')}
            {...form.getInputProps('favoriteColor')}
          />
          <NumberInput
            label="Your age"
            placeholder="Your age"
            withAsterisk
            key={form.key('age')}
            {...form.getInputProps('age')}
          />
          <TextInput
            label="Your website"
            placeholder="https://example.com"
            withAsterisk
            key={form.key('website')}
            {...form.getInputProps('website')}
          />
          <NativeSelect
            label="Your role"
            data={['', 'developer', 'designer', 'manager']}
            withAsterisk
            key={form.key('role')}
            {...form.getInputProps('role')}
          />
        </Stack>
      </Paper>
    </Step2LaunchConfigurationCard>
  );
}
