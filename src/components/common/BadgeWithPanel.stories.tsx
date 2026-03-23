import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import { BadgeWithPanel } from './BadgeWithPanel';

const meta = {
  argTypes: {
    variant: {
      control: 'radio',
      options: ['popover', 'fullScreen'],
    },
  },
  component: BadgeWithPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Common / BadgeWithPanel',
} satisfies Meta<typeof BadgeWithPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

function PopoverWrapper() {
  const [open, setOpen] = useState(false);
  return (
    <BadgeWithPanel
      ariaLabel="Toggle legend"
      badgeClassName="badge badge-primary gap-1 shadow cursor-pointer hover:badge-outline transition-all"
      onOpenChange={setOpen}
      open={open}
      panelContent={
        <div className="absolute bottom-full right-0 mb-2 p-3 bg-base-100 rounded-xl shadow-lg border border-base-300 min-w-[12rem]">
          <p className="text-sm font-medium">Legend</p>
          <ul className="mt-2 text-sm text-base-content/80 space-y-1">
            <li>Tram</li>
            <li>Bus</li>
            <li>Train</li>
          </ul>
        </div>
      }
      variant="popover"
    >
      <span>Legend</span>
    </BadgeWithPanel>
  );
}

export const Popover: Story = {
  render: () => <PopoverWrapper />,
} as unknown as Story;

function FullScreenWrapper() {
  const [open, setOpen] = useState(false);
  return (
    <BadgeWithPanel
      ariaLabel="Open alerts"
      badgeClassName="badge badge-success gap-1 shadow cursor-pointer hover:badge-outline transition-all"
      onOpenChange={setOpen}
      open={open}
      panelContent={(onClose) => (
        <div className="fixed inset-0 z-50 bg-base-100 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-base-300">
            <h2 className="text-lg font-semibold">Alerts</h2>
            <button className="btn btn-sm btn-ghost" onClick={onClose} type="button">
              Close
            </button>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <p className="text-base-content/80">
              Full-screen overlay content. Click Close or the badge to dismiss.
            </p>
          </div>
        </div>
      )}
      variant="fullScreen"
    >
      <span>Alerts</span>
    </BadgeWithPanel>
  );
}

export const FullScreen: Story = {
  render: () => <FullScreenWrapper />,
} as unknown as Story;
