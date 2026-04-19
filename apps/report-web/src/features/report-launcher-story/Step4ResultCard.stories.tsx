import type { Meta, StoryObj } from '@storybook/react';

import { Step4ResultCard } from './components/Step4ResultCard';
import { step4StoryStates } from './mocks';

const meta = {
  title: 'Report Launcher Story/Step 4 - Result',
  component: Step4ResultCard,
  tags: ['autodocs'],
  args: {
    onRunAgain: () => undefined,
    onBackToReports: () => undefined,
  },
} satisfies Meta<typeof Step4ResultCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CompletedWithSingleResult: Story = {
  args: {
    result: step4StoryStates.singleResult,
  },
};

export const CompletedWithRecentArtifacts: Story = {
  args: {
    result: step4StoryStates.withRecentArtifacts,
  },
};

export const NoArtifactsHistory: Story = {
  args: {
    result: step4StoryStates.noHistory,
  },
};

export const UnavailableFileState: Story = {
  args: {
    result: step4StoryStates.brokenLink,
  },
};
