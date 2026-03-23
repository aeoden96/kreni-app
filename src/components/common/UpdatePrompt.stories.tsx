import type { Meta, StoryObj } from '@storybook/react-vite';

import { UpdatePrompt } from './UpdatePrompt';

const meta = {
  component: UpdatePrompt,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Common / UpdatePrompt',
} satisfies Meta<typeof UpdatePrompt>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    storybook: true,
  },
};

export const Fallback: Story = {
  args: {
    storybook: true,
    storybookNotes: { changes: [], version: '0.0.0' },
  },
};
