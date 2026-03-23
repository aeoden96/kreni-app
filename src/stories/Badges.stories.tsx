import type { Meta, StoryObj } from '@storybook/react-vite';

function BadgeShowcase() {
  const variants = [
    'badge-primary',
    'badge-secondary',
    'badge-success',
    'badge-warning',
    'badge-error',
    'badge-info',
    'badge-ghost',
    'badge-neutral',
  ] as const;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-3">Variants</h2>
        <div className="flex flex-wrap gap-2">
          {variants.map((variant) => (
            <span className={`badge ${variant}`} key={variant}>
              {variant.replace('badge-', '')}
            </span>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-3">Sizes</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-primary badge-sm">Small</span>
          <span className="badge badge-primary">Default</span>
          <span className="badge badge-primary badge-lg">Large</span>
        </div>
      </section>
    </div>
  );
}

const meta = {
  component: BadgeShowcase,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Design System / Badges',
} satisfies Meta<typeof BadgeShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="badge badge-primary badge-sm">Small</span>
      <span className="badge badge-primary">Default</span>
      <span className="badge badge-primary badge-lg">Large</span>
    </div>
  ),
};
