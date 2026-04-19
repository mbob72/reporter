import type { Meta, StoryObj } from '@storybook/react';

import { Step2LaunchConfigurationCard } from './components/Step2LaunchConfigurationCard';
import { step2StoryStates } from './mocks';

const meta = {
  title: 'Report Launcher Story/Step 2 - Launch Configuration',
  component: Step2LaunchConfigurationCard,
  tags: ['autodocs'],
  args: {
    onLaunch: () => undefined,
  },
} satisfies Meta<typeof Step2LaunchConfigurationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReportWithoutExternalDependency: Story = {
  args: {
    configuration: step2StoryStates.withoutExternalDependency,
  },
};

export const ReportWithManualCredentials: Story = {
  args: {
    configuration: step2StoryStates.withManualCredentials,
  },
};

export const ReportWithSharedSetting: Story = {
  args: {
    configuration: step2StoryStates.withSharedSetting,
  },
};

export const ForbiddenLaunch: Story = {
  args: {
    configuration: step2StoryStates.forbiddenLaunch,
  },
};

export const ValidationErrorState: Story = {
  args: {
    configuration: step2StoryStates.validationError,
  },
};
