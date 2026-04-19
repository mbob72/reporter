import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useState } from 'react';

import { mockLauncherUsers, mockReportSelectionItems } from './mocks';
import { Step1ReportSelectionCard } from './components/Step1ReportSelectionCard';

type InteractiveProps = {
  initialUserId: string;
  initialReportCode: string;
  initialSearchValue: string;
};

function InteractiveStep1Story({
  initialUserId,
  initialReportCode,
  initialSearchValue,
}: InteractiveProps) {
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  const [selectedReportCode, setSelectedReportCode] = useState(initialReportCode);
  const [searchValue, setSearchValue] = useState(initialSearchValue);

  useEffect(() => {
    setSelectedUserId(initialUserId);
    setSelectedReportCode(initialReportCode);
    setSearchValue(initialSearchValue);
  }, [initialUserId, initialReportCode, initialSearchValue]);

  return (
    <Step1ReportSelectionCard
      users={mockLauncherUsers}
      reports={mockReportSelectionItems}
      selectedUserId={selectedUserId}
      selectedReportCode={selectedReportCode}
      searchValue={searchValue}
      onUserChange={setSelectedUserId}
      onSearchChange={setSearchValue}
      onSelectReport={setSelectedReportCode}
    />
  );
}

function Step1InteractiveStoryWrapper(props: InteractiveProps) {
  return <InteractiveStep1Story {...props} />;
}

const meta = {
  title: 'Report Launcher Story/Step 1 - Report Selection',
  component: Step1InteractiveStoryWrapper,
  tags: ['autodocs'],
  render: (args: InteractiveProps) => <Step1InteractiveStoryWrapper {...args} />,
} satisfies Meta<InteractiveProps>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    initialUserId: 'tenant-admin-oleg',
    initialReportCode: 'simple-sales-summary',
    initialSearchValue: '',
  },
};

export const WithSearch: Story = {
  args: {
    initialUserId: 'tenant-admin-oleg',
    initialReportCode: 'weather-anomaly-export',
    initialSearchValue: 'weather',
  },
};

export const WithSelectedReport: Story = {
  args: {
    initialUserId: 'admin-maria',
    initialReportCode: 'weather-anomaly-export',
    initialSearchValue: '',
  },
};

export const WithUnavailableReports: Story = {
  args: {
    initialUserId: 'member-anna',
    initialReportCode: 'org-risk-audit',
    initialSearchValue: '',
  },
};

export const EmptySearchResult: Story = {
  args: {
    initialUserId: 'tenant-admin-oleg',
    initialReportCode: 'simple-sales-summary',
    initialSearchValue: 'not-existing-report-name',
  },
};
