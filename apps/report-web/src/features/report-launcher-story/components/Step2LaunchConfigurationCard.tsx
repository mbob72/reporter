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

export type LaunchSubmitPayload = {
  credentialMode: CredentialsMode;
  manualApiKey: string;
  sharedSettingId: string;
  parameters: Record<string, string>;
};

export type Step2ScopeOptions = {
  selectedTenantId: string;
  tenantOptions: Array<{ value: string; label: string }>;
  onTenantChange?: (tenantId: string) => void;
  selectedOrganizationId: string;
  organizationOptions: Array<{ value: string; label: string }>;
  onOrganizationChange?: (organizationId: string) => void;
  organizationsLoading?: boolean;
};

type Step2LaunchConfigurationCardProps = {
  configuration: LaunchConfigurationModel;
  onLaunch?: (payload: LaunchSubmitPayload) => void;
  scope?: Step2ScopeOptions;
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

export function Step2LaunchConfigurationCard({
  configuration,
  onLaunch,
  scope,
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
      className="w-full max-w-5xl mx-auto bg-surface shadow-panel"
    >
      <form onSubmit={handleSubmit} className="p-4 sm:p-6">
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

          {scope ? (
            <Paper withBorder radius="md" p="md" className="bg-white/80">
              <Stack gap="sm">
                <Text fw={700}>Access Scope</Text>
                <Select
                  label="Tenant"
                  value={scope.selectedTenantId}
                  data={scope.tenantOptions}
                  onChange={(nextValue) => {
                    if (!nextValue) {
                      return;
                    }

                    scope.onTenantChange?.(nextValue);
                  }}
                />
                <Select
                  label="Organization"
                  value={scope.selectedOrganizationId}
                  data={scope.organizationOptions}
                  disabled={scope.organizationOptions.length === 0}
                  description={
                    scope.organizationsLoading
                      ? 'Loading organizations...'
                      : scope.organizationOptions.length === 0
                        ? 'No organizations available for selected tenant.'
                        : undefined
                  }
                  onChange={(nextValue) => {
                    scope.onOrganizationChange?.(nextValue ?? '');
                  }}
                />
              </Stack>
            </Paper>
          ) : null}

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

          <Paper withBorder radius="md" p="md" className="bg-white/80">
            <Stack gap="sm">
              <Text fw={700}>Launch Parameters</Text>
              {configuration.parameterFields.map((field) => (
                <TextInput
                  key={field.key}
                  label={field.label}
                  placeholder={field.placeholder}
                  value={form.values.parameters[field.key] ?? ''}
                  required={field.required}
                  disabled={field.disabled}
                  description={field.helperText}
                  error={form.errors[`parameters.${field.key}`]}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    form.setFieldValue(`parameters.${field.key}`, nextValue);
                    onParameterChange?.(field.key, nextValue);
                  }}
                />
              ))}
            </Stack>
          </Paper>

          <Paper withBorder radius="md" p="md" className="bg-white/80">
            <Stack gap="sm">
              <Text fw={700}>Credentials</Text>
              <Radio.Group
                value={form.values.credentialMode}
                onChange={(nextValue) => {
                  const mode = nextValue as CredentialsMode;
                  form.setFieldValue('credentialMode', mode);
                  onCredentialModeChange?.(mode);
                }}
              >
                <Stack gap={8}>
                  <Radio value="manual" label={configuration.credentials.manualLabel} />
                  <Radio
                    value="shared_setting"
                    label={configuration.credentials.sharedLabel}
                    disabled={configuration.credentials.sharedModeDisabled}
                  />
                </Stack>
              </Radio.Group>

              {form.values.credentialMode === 'manual' ? (
                <TextInput
                  label="OpenWeather API key"
                  placeholder="ow-live-..."
                  value={form.values.manualApiKey}
                  error={form.errors.manualApiKey}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value;
                    form.setFieldValue('manualApiKey', nextValue);
                    onManualApiKeyChange?.(nextValue);
                  }}
                />
              ) : (
                <Select
                  label="Shared setting"
                  value={form.values.sharedSettingId}
                  data={configuration.credentials.sharedSettings.map((setting) => ({
                    value: setting.id,
                    label: setting.label,
                  }))}
                  disabled={
                    configuration.credentials.sharedSettingsLoading ||
                    configuration.credentials.sharedSettings.length === 0
                  }
                  description={
                    configuration.credentials.sharedSettingsLoading
                      ? 'Loading shared settings...'
                      : configuration.credentials.sharedSettings.find(
                            (setting) => setting.id === form.values.sharedSettingId,
                          )?.description ??
                        configuration.credentials.sharedSettingsEmptyReason ??
                        'Select a shared setting'
                  }
                  error={form.errors.sharedSettingId}
                  onChange={(nextValue) => {
                    const nextValueNormalized = nextValue ?? '';
                    form.setFieldValue('sharedSettingId', nextValueNormalized);
                    onSharedSettingChange?.(nextValueNormalized);
                  }}
                />
              )}
            </Stack>
          </Paper>

          {configuration.disabledReason ? (
            <Alert color="red" variant="light">
              {configuration.disabledReason}
            </Alert>
          ) : null}

          <Group justify="flex-end" className="w-full">
            <Button
              type="submit"
              disabled={isLaunching || !configuration.canLaunch}
              className="w-full sm:w-auto"
            >
              {isLaunching ? 'Launching...' : 'Launch'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}
