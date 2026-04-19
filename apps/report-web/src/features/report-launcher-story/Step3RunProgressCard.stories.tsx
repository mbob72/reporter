import type { Meta, StoryObj } from '@storybook/react';

import { Step3RunProgressCard } from './components/Step3RunProgressCard';
import { step3StoryStates } from './mocks';

const meta = {
  title: 'Report Launcher Story/Step 3 - Run Progress',
  component: Step3RunProgressCard,
  tags: ['autodocs'],
  args: {
    reportName: 'Weather Anomaly Export',
    jobId: 'job-demo-7bcf4a',
    onRefresh: () => undefined,
    onRetry: () => undefined,
    onGoToResult: () => undefined,
  },
} satisfies Meta<typeof Step3RunProgressCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Queued: Story = {
  args: {
    snapshot: step3StoryStates.queued,
  },
};

export const Running20Percent: Story = {
  args: {
    snapshot: step3StoryStates.running20,
  },
};

export const Running80Percent: Story = {
  args: {
    snapshot: step3StoryStates.running80,
  },
};

export const Failed: Story = {
  args: {
    snapshot: step3StoryStates.failed,
  },
};

export const Completed: Story = {
  args: {
    snapshot: step3StoryStates.completed,
  },
};
