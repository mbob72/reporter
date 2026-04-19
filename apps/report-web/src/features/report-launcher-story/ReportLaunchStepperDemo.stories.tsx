import type { Meta, StoryObj } from '@storybook/react';

import { stepperScenarios } from './mocks';
import { ReportLaunchStepperDemo } from './components/ReportLaunchStepperDemo';

const meta = {
  title: 'Report Launcher Story/Stepper Demo',
  component: ReportLaunchStepperDemo,
  tags: ['autodocs'],
  argTypes: {
    scenario: {
      control: { type: 'select' },
      options: Object.keys(stepperScenarios),
      mapping: stepperScenarios,
    },
  },
  args: {
    scenario: stepperScenarios.happyPath,
  },
} satisfies Meta<typeof ReportLaunchStepperDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FullHappyPath: Story = {
  args: {
    scenario: stepperScenarios.happyPath,
  },
};

export const AccessRestrictedPath: Story = {
  args: {
    scenario: stepperScenarios.accessRestricted,
  },
};

export const CredentialBasedPath: Story = {
  args: {
    scenario: stepperScenarios.credentialBased,
  },
};

export const CompletedPath: Story = {
  args: {
    scenario: stepperScenarios.completed,
  },
};

export const FailedPath: Story = {
  args: {
    scenario: stepperScenarios.failed,
  },
};
