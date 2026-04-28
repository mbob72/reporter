import type { Meta, StoryObj } from '@storybook/react';

import { Step2LaunchConfigurationCard } from './components/Step2LaunchConfigurationCard';
import { step2StoryStates } from './mocks';

const meta = {
  title: 'Report Launcher Story/Step 2 - Launch Configuration',
  component: Step2LaunchConfigurationCard,
  tags: ['autodocs'],
} satisfies Meta<typeof Step2LaunchConfigurationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReportWithoutExternalDependency: Story = {
  args: {
    configuration: step2StoryStates.noExternalDependency,
  },
};

export const ReportReadyToLaunch: Story = {
  args: {
    configuration: step2StoryStates.readyToLaunch,
  },
};

export const MetadataLoading: Story = {
  args: {
    configuration: step2StoryStates.metadataLoading,
  },
};

export const ForbiddenLaunch: Story = {
  args: {
    configuration: step2StoryStates.forbiddenLaunch,
  },
};
