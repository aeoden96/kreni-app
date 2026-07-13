import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Static mock of the spider list popup (used for large clusters).
 * Uses the same CSS classes as the real implementation.
 */
const MOCK_STOPS = [
  { id: '1', name: 'Savski most', routes: '4, 6, 7' },
  { id: '2', name: 'Kvaternikov trg', routes: '106, 268' },
  { id: '3', name: 'Glavni kolodvor', routes: '4, 6, 14, 106' },
  { id: '4', name: 'Britanac', routes: '4, 6' },
  { id: '5', name: 'Vukovarska', routes: '1, 2, 4, 6, 11' },
  { id: '6', name: 'Trg bana Jelačića', routes: '1, 2, 4, 6, 7, 8, 11, 12, 14' },
  { id: '7', name: 'Mirogoj', routes: '4, 6, 7, 11, 12, 14' },
  { id: '8', name: 'Dubec', routes: '4' },
];

function SpiderListPopupDemo({ itemCount = 8 }: { itemCount?: number }) {
  const items = MOCK_STOPS.slice(0, itemCount);

  return (
    <div className="spider-list-popup">
      <div className="spider-list-header">{items.length} postaja u blizini — odaberite jednu</div>
      {items.map((stop) => (
        <button className="spider-list-item" key={stop.id} onClick={() => {}} type="button">
          <span className="font-medium">{stop.name}</span>
          <span className="ml-1 text-base-content/60 text-xs">({stop.routes})</span>
        </button>
      ))}
    </div>
  );
}

const meta = {
  argTypes: {
    itemCount: { control: { max: 8, min: 1, type: 'number' } },
  },
  component: SpiderListPopupDemo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Map / Spider List Popup',
} satisfies Meta<typeof SpiderListPopupDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { itemCount: 8 },
};

export const FewItems: Story = {
  args: { itemCount: 3 },
};

export const Scrollable: Story = {
  args: { itemCount: 8 },
  parameters: {
    docs: {
      description: {
        story: 'Popup with max-height 280px — scroll when many items.',
      },
    },
    layout: 'centered',
  },
};
