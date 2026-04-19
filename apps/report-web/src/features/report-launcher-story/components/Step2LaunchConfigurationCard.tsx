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
import { useEffect } from 'react';

import type { CredentialsMode, LaunchConfigurationModel } from '../types';

export type LaunchSubmitPayload = {
  credentialMode: CredentialsMode;
  manualApiKey: string;
  sharedSettingId: string;
  parameters: Record<string, string>;
};

type Step2LaunchConfigurationCardProps = {
  configuration: LaunchConfigurationModel;
  onLaunch?: (payload: LaunchSubmitPayload) => void;
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

export function Step2LaunchConfigurationCard({
  configuration,
  onLaunch,
}: Step2LaunchConfigurationCardProps) {
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

  useEffect(() => {
    if (configuration.forcedValidationMessage) {
      form.setFieldError('manualApiKey', configuration.forcedValidationMessage);
      return;
    }

    form.clearFieldError('manualApiKey');
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
                  onChange={(event) =>
                    form.setFieldValue(`parameters.${field.key}`, event.currentTarget.value)
                  }
                />
              ))}
            </Stack>
          </Paper>

          <Paper withBorder radius="md" p="md" className="bg-white/80">
            <Stack gap="sm">
              <Text fw={700}>Credentials</Text>
              <Radio.Group
                value={form.values.credentialMode}
                onChange={(nextValue) =>
                  form.setFieldValue('credentialMode', nextValue as CredentialsMode)
                }
              >
                <Stack gap={8}>
                  <Radio value="manual" label={configuration.credentials.manualLabel} />
                  <Radio value="shared_setting" label={configuration.credentials.sharedLabel} />
                </Stack>
              </Radio.Group>

              {form.values.credentialMode === 'manual' ? (
                <TextInput
                  label="OpenWeather API key"
                  placeholder="ow-live-..."
                  value={form.values.manualApiKey}
                  error={form.errors.manualApiKey}
                  onChange={(event) =>
                    form.setFieldValue('manualApiKey', event.currentTarget.value)
                  }
                />
              ) : (
                <Select
                  label="Shared setting"
                  value={form.values.sharedSettingId}
                  data={configuration.credentials.sharedSettings.map((setting) => ({
                    value: setting.id,
                    label: setting.label,
                  }))}
                  description={
                    configuration.credentials.sharedSettings.find(
                      (setting) => setting.id === form.values.sharedSettingId,
                    )?.description ?? 'Select a shared setting'
                  }
                  error={form.errors.sharedSettingId}
                  onChange={(nextValue) =>
                    form.setFieldValue('sharedSettingId', nextValue ?? '')
                  }
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
              disabled={!configuration.canLaunch}
              className="w-full sm:w-auto"
            >
              Launch
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}
