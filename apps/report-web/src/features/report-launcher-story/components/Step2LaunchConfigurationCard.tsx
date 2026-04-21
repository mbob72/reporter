import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Radio,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect, useRef } from 'react';

import type { CredentialsMode, LaunchConfigurationModel } from '../types';
import { StepFooterActions } from './StepFooterActions';

export type LaunchSubmitPayload = {
  credentialMode: CredentialsMode;
  manualApiKey: string;
  sharedSettingId: string;
  parameters: Record<string, string>;
};

type Step2LaunchConfigurationCardProps = {
  configuration: LaunchConfigurationModel;
  onLaunch?: (payload: LaunchSubmitPayload) => void;
  onBackToReports?: () => void;
  isLaunching?: boolean;
  onCredentialModeChange?: (mode: CredentialsMode) => void;
  onManualApiKeyChange?: (value: string) => void;
  onSharedSettingChange?: (sharedSettingId: string) => void;
  onParameterChange?: (key: string, value: string) => void;
};

type LaunchFormValues = {
  credentialMode: CredentialsMode;
  manualApiKey: string;
  sharedSettingId: string;
  parameters: Record<string, string>;
};

function getSeverityColor(severity: 'info' | 'warning' | 'critical') {
  if (severity === 'critical') {
    return 'red';
  }

  if (severity === 'warning') {
    return 'yellow';
  }

  return 'blue';
}

function areParameterValuesEqual(
  left: Record<string, string>,
  right: Record<string, string>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return rightKeys.every((key) => left[key] === right[key]);
}

function renderReportSpecificBlocks(params: {
  reportCode: string;
  parameterFields: LaunchConfigurationModel['parameterFields'];
  externalDependency: string | undefined;
  credentials: LaunchConfigurationModel['credentials'];
  credentialMode: CredentialsMode;
  manualApiKey: string;
  sharedSettingId: string;
  formErrors: ReturnType<typeof useForm<LaunchFormValues>>['errors'];
  setCredentialMode: (mode: CredentialsMode) => void;
  setManualApiKey: (value: string) => void;
  setSharedSettingId: (value: string) => void;
  setParameterValue: (key: string, value: string) => void;
  onCredentialModeChange?: (mode: CredentialsMode) => void;
  onManualApiKeyChange?: (value: string) => void;
  onSharedSettingChange?: (sharedSettingId: string) => void;
  onParameterChange?: (key: string, value: string) => void;
}) {
  if (params.reportCode === 'simple-sales-summary-xlsx') {
    return null;
  }

  return (
    <>
      {params.parameterFields.length > 0 ? (
        <Paper withBorder radius="md" p="md" className="bg-white/80">
          <Stack gap="sm">
            <Text fw={700}>Launch Parameters</Text>
            {params.parameterFields.map((field) => (
              <TextInput
                key={field.key}
                label={field.label}
                placeholder={field.placeholder}
                value={field.value ?? ''}
                required={field.required}
                disabled={field.disabled}
                description={field.helperText}
                error={params.formErrors[`parameters.${field.key}`]}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  params.setParameterValue(field.key, nextValue);
                  params.onParameterChange?.(field.key, nextValue);
                }}
              />
            ))}
          </Stack>
        </Paper>
      ) : null}

      {params.externalDependency ? (
        <Paper withBorder radius="md" p="md" className="bg-white/80">
          <Stack gap="sm">
            <Text fw={700}>Credentials</Text>
            <Radio.Group
              value={params.credentialMode}
              onChange={(nextValue) => {
                const mode = nextValue as CredentialsMode;
                params.setCredentialMode(mode);
                params.onCredentialModeChange?.(mode);
              }}
            >
              <Stack gap={8}>
                <Radio value="manual" label={params.credentials.manualLabel} />
                <Radio
                  value="shared_setting"
                  label={params.credentials.sharedLabel}
                  disabled={params.credentials.sharedModeDisabled}
                />
              </Stack>
            </Radio.Group>

            {params.credentialMode === 'manual' ? (
              <TextInput
                label="OpenWeather API key"
                placeholder="ow-live-..."
                value={params.manualApiKey}
                error={params.formErrors.manualApiKey}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  params.setManualApiKey(nextValue);
                  params.onManualApiKeyChange?.(nextValue);
                }}
              />
            ) : (
              <Select
                label="Shared setting"
                value={params.sharedSettingId}
                data={params.credentials.sharedSettings.map((setting) => ({
                  value: setting.id,
                  label: setting.label,
                }))}
                disabled={
                  params.credentials.sharedSettingsLoading ||
                  params.credentials.sharedSettings.length === 0
                }
                description={
                  params.credentials.sharedSettingsLoading
                    ? 'Loading shared settings...'
                    : params.credentials.sharedSettings.find(
                          (setting) => setting.id === params.sharedSettingId,
                        )?.description ??
                      params.credentials.sharedSettingsEmptyReason ??
                      'Select a shared setting'
                }
                error={params.formErrors.sharedSettingId}
                onChange={(nextValue) => {
                  const nextValueNormalized = nextValue ?? '';
                  params.setSharedSettingId(nextValueNormalized);
                  params.onSharedSettingChange?.(nextValueNormalized);
                }}
              />
            )}
          </Stack>
        </Paper>
      ) : null}
    </>
  );
}

export function Step2LaunchConfigurationCard({
  configuration,
  onLaunch,
  onBackToReports,
  isLaunching = false,
  onCredentialModeChange,
  onManualApiKeyChange,
  onSharedSettingChange,
  onParameterChange,
}: Step2LaunchConfigurationCardProps) {
  const lastForcedValidationMessageRef = useRef<string | null>(null);

  const initialParameters = configuration.parameterFields.reduce<Record<string, string>>(
    (acc, field) => {
      acc[field.key] = field.value ?? '';
      return acc;
    },
    {},
  );

  const form = useForm<LaunchFormValues>({
    initialValues: {
      credentialMode: configuration.credentials.defaultMode,
      manualApiKey: configuration.credentials.manualApiKey ?? '',
      sharedSettingId: configuration.credentials.selectedSharedSettingId ?? '',
      parameters: initialParameters,
    },
  });
  const parameterFieldSignature = JSON.stringify(
    configuration.parameterFields.map((field) => [field.key, field.value ?? '']),
  );

  useEffect(function syncFormValuesFromConfigurationEffect() {
    const nextParameters = configuration.parameterFields.reduce<Record<string, string>>(
      (acc, field) => {
        acc[field.key] = field.value ?? '';
        return acc;
      },
      {},
    );

    const nextCredentialMode = configuration.credentials.defaultMode;
    const nextManualApiKey = configuration.credentials.manualApiKey ?? '';
    const nextSharedSettingId =
      configuration.credentials.selectedSharedSettingId ?? '';

    if (form.values.credentialMode !== nextCredentialMode) {
      form.setFieldValue('credentialMode', nextCredentialMode);
    }

    if (form.values.manualApiKey !== nextManualApiKey) {
      form.setFieldValue('manualApiKey', nextManualApiKey);
    }

    if (form.values.sharedSettingId !== nextSharedSettingId) {
      form.setFieldValue('sharedSettingId', nextSharedSettingId);
    }

    if (!areParameterValuesEqual(form.values.parameters, nextParameters)) {
      form.setFieldValue('parameters', nextParameters);
    }
  }, [
    configuration.credentials.defaultMode,
    configuration.credentials.manualApiKey,
    configuration.credentials.selectedSharedSettingId,
    parameterFieldSignature,
    configuration.reportCode,
  ]);

  useEffect(function syncForcedValidationMessageEffect() {
    const forcedValidationMessage = configuration.forcedValidationMessage ?? null;
    const previousForcedValidationMessage = lastForcedValidationMessageRef.current;

    if (forcedValidationMessage) {
      if (form.errors.manualApiKey !== forcedValidationMessage) {
        form.setFieldError('manualApiKey', forcedValidationMessage);
      }
      lastForcedValidationMessageRef.current = forcedValidationMessage;
      return;
    }

    if (
      previousForcedValidationMessage &&
      form.errors.manualApiKey === previousForcedValidationMessage
    ) {
      form.clearFieldError('manualApiKey');
    }

    lastForcedValidationMessageRef.current = null;
  }, [configuration.forcedValidationMessage]);

  const handleSubmit = form.onSubmit((values) => {
    form.clearErrors();

    if (!configuration.canLaunch) {
      return;
    }

    if (configuration.forcedValidationMessage) {
      form.setFieldError('manualApiKey', configuration.forcedValidationMessage);
      return;
    }

    if (
      configuration.externalDependency &&
      values.credentialMode === 'manual' &&
      values.manualApiKey.trim().length === 0
    ) {
      form.setFieldError('manualApiKey', 'Введите API key для manual режима.');
      return;
    }

    if (
      configuration.externalDependency &&
      values.credentialMode === 'shared_setting' &&
      values.sharedSettingId.trim().length === 0
    ) {
      form.setFieldError('sharedSettingId', 'Выберите shared setting перед запуском.');
      return;
    }

    for (const field of configuration.parameterFields) {
      if (field.required && values.parameters[field.key]?.trim().length === 0) {
        form.setFieldError(`parameters.${field.key}`, `${field.label} is required.`);
        return;
      }
    }

    onLaunch?.({
      credentialMode: values.credentialMode,
      manualApiKey: values.manualApiKey,
      sharedSettingId: values.sharedSettingId,
      parameters: values.parameters,
    });
  });

  return (
    <Card
      withBorder
      radius="lg"
      p={0}
      className="h-full min-h-0 w-full max-w-5xl mx-auto bg-surface shadow-panel flex flex-col"
    >
      <form onSubmit={handleSubmit} className="h-full min-h-0 p-4 sm:p-6 flex flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-3">
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start" wrap="wrap" className="gap-2">
              <div>
                <Text tt="uppercase" fw={700} size="xs" c="dimmed">
                  Step 2
                </Text>
                <Title order={2}>Launch Configuration</Title>
                <Text c="dimmed" size="sm" mt={6}>
                  Configure launch parameters and select credentials mode.
                </Text>
              </div>
              {configuration.externalDependency ? (
                <Badge color="orange" variant="light">
                  External dependency: {configuration.externalDependency}
                </Badge>
              ) : (
                <Badge color="teal" variant="light">
                  No external dependency
                </Badge>
              )}
            </Group>

            <Paper withBorder radius="md" p="md" className="bg-white/80">
              <Stack gap={6}>
                <Text fw={700}>{configuration.reportTitle}</Text>
                <Text size="sm" c="dimmed">
                  {configuration.reportDescription}
                </Text>
                <Text size="sm" c="dimmed">
                  {configuration.contextSummary}
                </Text>
              </Stack>
            </Paper>

            <Paper withBorder radius="md" p="md" className="bg-white/80">
              <Stack gap="sm">
                <Text fw={700}>Constraints / Access Explanation</Text>
                {configuration.constraints.map((constraint) => (
                  <Group
                    key={constraint.id}
                    justify="space-between"
                    align="flex-start"
                    gap="sm"
                    wrap="wrap"
                  >
                    <div>
                      <Text fw={600} size="sm">
                        {constraint.label}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {constraint.details}
                      </Text>
                    </div>
                    <Badge color={getSeverityColor(constraint.severity)} variant="light">
                      {constraint.severity}
                    </Badge>
                  </Group>
                ))}
              </Stack>
            </Paper>

            {renderReportSpecificBlocks({
              reportCode: configuration.reportCode,
              parameterFields: configuration.parameterFields.map((field) => ({
                ...field,
                value: form.values.parameters[field.key] ?? '',
              })),
              externalDependency: configuration.externalDependency,
              credentials: configuration.credentials,
              credentialMode: form.values.credentialMode,
              manualApiKey: form.values.manualApiKey,
              sharedSettingId: form.values.sharedSettingId,
              formErrors: form.errors,
              setCredentialMode: (mode) => {
                form.setFieldValue('credentialMode', mode);
              },
              setManualApiKey: (value) => {
                form.setFieldValue('manualApiKey', value);
              },
              setSharedSettingId: (value) => {
                form.setFieldValue('sharedSettingId', value);
              },
              setParameterValue: (key, value) => {
                form.setFieldValue(`parameters.${key}`, value);
              },
              onCredentialModeChange,
              onManualApiKeyChange,
              onSharedSettingChange,
              onParameterChange,
            })}

            {configuration.disabledReason ? (
              <Alert color="red" variant="light">
                {configuration.disabledReason}
              </Alert>
            ) : null}
          </Stack>
        </div>

        <StepFooterActions>
          <Button
            type="button"
            variant="light"
            onClick={onBackToReports}
            className="w-full sm:w-auto"
          >
            Back to reports
          </Button>
          <Button
            type="submit"
            disabled={isLaunching || !configuration.canLaunch}
            className="w-full sm:w-auto"
          >
            {isLaunching ? 'Launching...' : 'Launch'}
          </Button>
        </StepFooterActions>
      </form>
    </Card>
  );
}
