import { Alert, Button, Group, Stack, Stepper, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useEffect, useMemo, useState } from 'react';

import type { StepperDemoScenario, UnavailableReportReason } from '../types';
import { Step1ReportSelectionCard } from './Step1ReportSelectionCard';
import {
  Step2LaunchConfigurationCard,
  type LaunchSubmitPayload,
} from './Step2LaunchConfigurationCard';
import { Step3RunProgressCard } from './Step3RunProgressCard';
import { Step4ResultCard } from './Step4ResultCard';

type ReportLaunchStepperDemoProps = {
  scenario: StepperDemoScenario;
  initialStep?: number;
};

const unavailableReasonLabel: Record<UnavailableReportReason, string> = {
  insufficient_role: 'Недостаточная роль для запуска выбранного отчета.',
  tenant_scope_required: 'Для запуска нужен tenant scope с несколькими tenants.',
  organization_scope_required: 'Для запуска нужен organization scope.',
};

function getInitialStep(scenario: StepperDemoScenario, initialStep?: number) {
  const resolved = initialStep ?? scenario.initialStep ?? 0;
  if (resolved < 0) {
    return 0;
  }

  if (resolved > 3) {
    return 3;
  }

  return resolved;
}

export function ReportLaunchStepperDemo({
  scenario,
  initialStep,
}: ReportLaunchStepperDemoProps) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const scenarioInitialStep = getInitialStep(scenario, initialStep);
  const timelineLastIndex = Math.max(0, scenario.progressTimeline.length - 1);

  const [activeStep, setActiveStep] = useState(scenarioInitialStep);
  const [selectedUserId, setSelectedUserId] = useState(scenario.initialUserId);
  const [selectedReportCode, setSelectedReportCode] = useState(
    scenario.initialSelectedReportCode,
  );
  const [searchValue, setSearchValue] = useState('');
  const [runSnapshotIndex, setRunSnapshotIndex] = useState(
    scenarioInitialStep >= 2 ? timelineLastIndex : 0,
  );

  useEffect(() => {
    const nextInitialStep = getInitialStep(scenario, initialStep);
    setActiveStep(nextInitialStep);
    setSelectedUserId(scenario.initialUserId);
    setSelectedReportCode(scenario.initialSelectedReportCode);
    setSearchValue('');
    setRunSnapshotIndex(nextInitialStep >= 2 ? Math.max(0, scenario.progressTimeline.length - 1) : 0);
  }, [scenario, initialStep]);

  const selectedReport = useMemo(
    () => scenario.reports.find((report) => report.code === selectedReportCode) ?? null,
    [scenario.reports, selectedReportCode],
  );

  const canProceedFromStep1 = selectedReport?.availability === 'available';

  const launchConfiguration = useMemo(() => {
    if (!selectedReport) {
      return {
        ...scenario.launchConfiguration,
        canLaunch: false,
        disabledReason: 'Сначала выберите отчет.',
      };
    }

    if (selectedReport.availability === 'unavailable') {
      return {
        ...scenario.launchConfiguration,
        reportCode: selectedReport.code,
        reportTitle: selectedReport.name,
        reportDescription: selectedReport.description,
        canLaunch: false,
        disabledReason: selectedReport.unavailableReason
          ? unavailableReasonLabel[selectedReport.unavailableReason]
          : 'Этот отчет недоступен для текущего контекста.',
      };
    }

    return {
      ...scenario.launchConfiguration,
      reportCode: selectedReport.code,
      reportTitle: selectedReport.name,
      reportDescription: selectedReport.description,
    };
  }, [scenario.launchConfiguration, selectedReport]);

  const currentSnapshot =
    scenario.progressTimeline[Math.min(runSnapshotIndex, timelineLastIndex)] ??
    scenario.progressTimeline[0];

  const handleReset = () => {
    const nextInitialStep = getInitialStep(scenario, initialStep);
    setActiveStep(nextInitialStep);
    setSelectedUserId(scenario.initialUserId);
    setSelectedReportCode(scenario.initialSelectedReportCode);
    setSearchValue('');
    setRunSnapshotIndex(nextInitialStep >= 2 ? timelineLastIndex : 0);
  };

  const handleLaunch = (_payload: LaunchSubmitPayload) => {
    setRunSnapshotIndex(0);
    setActiveStep(2);
  };

  const handleRefreshProgress = () => {
    setRunSnapshotIndex((current) => Math.min(current + 1, timelineLastIndex));
  };

  const handleRetry = () => {
    setRunSnapshotIndex(0);
    setActiveStep(1);
  };

  return (
    <Stack gap="md" className="w-full max-w-6xl mx-auto">
      <Group justify="space-between" align="center" wrap="wrap" className="gap-3">
        <div>
          <Text fw={700}>{scenario.name}</Text>
          <Text size="sm" c="dimmed">
            {scenario.description}
          </Text>
        </div>

        <Button
          variant="default"
          onClick={handleReset}
          className="w-full sm:w-auto"
        >
          Reset scenario
        </Button>
      </Group>

      <Stepper
        active={activeStep}
        onStepClick={setActiveStep}
        allowNextStepsSelect
        orientation={isMobile ? 'vertical' : 'horizontal'}
        size={isMobile ? 'sm' : 'md'}
        className="w-full"
      >
        <Stepper.Step label="Select" description="Report selection">
          <Stack gap="md" pt="md">
            <Step1ReportSelectionCard
              users={scenario.users}
              reports={scenario.reports}
              selectedUserId={selectedUserId}
              selectedReportCode={selectedReportCode}
              searchValue={searchValue}
              onUserChange={setSelectedUserId}
              onSearchChange={setSearchValue}
              onSelectReport={setSelectedReportCode}
            />

            {!canProceedFromStep1 ? (
              <Alert color="red" variant="light">
                Selected report cannot be launched in the current mocked context.
              </Alert>
            ) : null}

            <Group justify="flex-end" className="w-full">
              <Button
                disabled={!canProceedFromStep1}
                onClick={() => setActiveStep(1)}
                className="w-full sm:w-auto"
              >
                Continue to launch config
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Configure" description="Launch settings">
          <Stack gap="md" pt="md">
            <Step2LaunchConfigurationCard
              configuration={launchConfiguration}
              onLaunch={handleLaunch}
            />

            <Group justify="space-between" className="w-full">
              <Button
                variant="default"
                onClick={() => setActiveStep(0)}
                className="w-full sm:w-auto"
              >
                Back to reports
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Progress" description="Run status">
          <Stack gap="md" pt="md">
            <Step3RunProgressCard
              reportName={launchConfiguration.reportTitle}
              jobId="job-demo-7bcf4a"
              snapshot={currentSnapshot}
              onRefresh={handleRefreshProgress}
              onRetry={handleRetry}
              onGoToResult={() => setActiveStep(3)}
            />
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Result" description="Artifact output">
          <Stack gap="md" pt="md">
            <Step4ResultCard
              result={scenario.result}
              onBackToReports={() => setActiveStep(0)}
              onRunAgain={() => {
                setRunSnapshotIndex(0);
                setActiveStep(1);
              }}
            />
          </Stack>
        </Stepper.Step>
      </Stepper>
    </Stack>
  );
}
