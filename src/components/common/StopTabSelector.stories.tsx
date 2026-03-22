import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { StopTabSelector, type StopTab } from './StopTabSelector';

function StopTabSelectorWrapper(props: {
  liveVehicleCount?: number;
  compact?: boolean;
  hideVehicles?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<StopTab>('vehicles');
  return (
    <div className="w-80">
      <StopTabSelector
        activeTab={activeTab}
        onTabChange={setActiveTab}
        {...props}
      />
    </div>
  );
}

const meta = {
  title: 'Common / StopTabSelector',
  component: StopTabSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    activeTab: {
      control: 'radio',
      options: ['vehicles', 'timetable'],
    },
    liveVehicleCount: { control: 'number' },
    compact: { control: 'boolean' },
    hideVehicles: { control: 'boolean' },
  },
} satisfies Meta<typeof StopTabSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <StopTabSelectorWrapper />,
} as unknown as Story;

export const Compact: Story = {
  render: () => <StopTabSelectorWrapper compact />,
} as unknown as Story;

export const WithLiveCount: Story = {
  render: () => <StopTabSelectorWrapper liveVehicleCount={3} />,
} as unknown as Story;

export const HideVehicles: Story = {
  render: () => <StopTabSelectorWrapper hideVehicles />,
} as unknown as Story;
