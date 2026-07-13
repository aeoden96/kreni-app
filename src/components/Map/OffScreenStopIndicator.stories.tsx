import type { Meta, StoryObj } from '@storybook/react-vite';

import type { OffScreenIndicatorUIProps } from './OffScreenStopIndicator';

import { OffScreenIndicatorUI } from './OffScreenStopIndicator';

function IndicatorWrapper(props: OffScreenIndicatorUIProps) {
  return (
    <div className="min-w-[400px] min-h-[300px] border border-dashed border-base-300 rounded-lg flex items-center justify-center bg-base-200/30">
      <OffScreenIndicatorUI {...props} inline />
    </div>
  );
}

const meta = {
  argTypes: {
    angle: {
      control: { max: 360, min: 0, step: 15, type: 'range' },
      description: '0 = up, 90 = right, 180 = down, 270 = left',
    },
  },
  component: OffScreenIndicatorUI,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Map / OffScreenStopIndicator',
} satisfies Meta<typeof OffScreenIndicatorUI>;

export default meta;

type Story = StoryObj<typeof meta>;

const defaultArgs = {
  inline: true as const,
  onFlyTo: () => {},
  stopName: 'Savski most',
  x: 200,
  y: 150,
};

export const Up: Story = {
  args: { ...defaultArgs, angle: 0 },
  render: (args: OffScreenIndicatorUIProps) => <IndicatorWrapper {...args} />,
} as unknown as Story;

export const Right: Story = {
  args: { ...defaultArgs, angle: 90, stopName: 'Kvaternikov trg' },
  render: (args: OffScreenIndicatorUIProps) => <IndicatorWrapper {...args} />,
} as unknown as Story;

export const Down: Story = {
  args: { ...defaultArgs, angle: 180, stopName: 'Glavni kolodvor' },
  render: (args: OffScreenIndicatorUIProps) => <IndicatorWrapper {...args} />,
} as unknown as Story;

export const Left: Story = {
  args: { ...defaultArgs, angle: 270, stopName: 'Mirogoj' },
  render: (args: OffScreenIndicatorUIProps) => <IndicatorWrapper {...args} />,
} as unknown as Story;

export const Diagonal: Story = {
  args: { ...defaultArgs, angle: 45, stopName: 'Trg bana Jelačića' },
  render: (args: OffScreenIndicatorUIProps) => <IndicatorWrapper {...args} />,
} as unknown as Story;
