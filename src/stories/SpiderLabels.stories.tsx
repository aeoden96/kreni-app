import type { Meta, StoryObj } from '@storybook/react-vite';

function SpiderFanShowcase() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-12 p-8">
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-base-content/60">Tram only</span>
        <SpiderLabelNode
          index={0}
          routes={[
            { shortName: '4', type: 'tram' },
            { shortName: '6', type: 'tram' },
          ]}
          stopName="Savski most"
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-base-content/60">Bus only</span>
        <SpiderLabelNode
          index={1}
          routes={[
            { shortName: '106', type: 'bus' },
            { shortName: '268', type: 'bus' },
          ]}
          stopName="Kvaternikov trg"
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-base-content/60">Mixed</span>
        <SpiderLabelNode
          index={2}
          routes={[
            { shortName: '4', type: 'tram' },
            { shortName: '106', type: 'bus' },
            { shortName: '14', type: 'tram' },
          ]}
          stopName="Glavni kolodvor"
        />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs text-base-content/60">Long list (ticker)</span>
        <SpiderLabelNode
          index={3}
          routes={[
            { shortName: '4', type: 'tram' },
            { shortName: '6', type: 'tram' },
            { shortName: '7', type: 'tram' },
            { shortName: '11', type: 'tram' },
            { shortName: '12', type: 'tram' },
            { shortName: '14', type: 'tram' },
          ]}
          stopName="Mirogoj"
          useTicker
        />
      </div>
    </div>
  );
}

/**
 * Static mock of the spider fan UI (labels + route badges).
 * Uses the same CSS classes as the real SpiderfierManager.
 * No Leaflet required.
 */
function SpiderLabelNode({
  index,
  routes,
  stopName,
  useTicker = false,
}: {
  index: number;
  routes: { shortName: string; type: 'bus' | 'mixed' | 'tram' }[];
  stopName: string;
  useTicker?: boolean;
}) {
  const typeClass = (t: string) => (t === 'tram' ? 'is-tram' : t === 'bus' ? 'is-bus' : 'is-mixed');
  const badgeContent = routes.map((r) => (
    <span className={`spider-route-badge ${typeClass(r.type)}`} key={r.shortName}>
      {r.shortName}
    </span>
  ));

  return (
    <div className="spider-node-wrap" style={{ '--spider-idx': index } as React.CSSProperties}>
      <div className="spider-node-dot" title={stopName} />
      <span
        className="spider-node-label"
        style={{ '--lx': '50px', '--ly': '0px' } as React.CSSProperties}
      >
        <div className="spider-label-content">
          <span className="stop-name">{stopName}</span>
          {useTicker ? (
            <div className="spider-route-ticker">
              <div className="spider-route-ticker-inner">
                {badgeContent}
                {badgeContent}
              </div>
            </div>
          ) : (
            <div className="spider-route-badges">{badgeContent}</div>
          )}
        </div>
      </span>
    </div>
  );
}

const meta = {
  component: SpiderFanShowcase,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Map / Spider Labels',
} satisfies Meta<typeof SpiderFanShowcase>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FanNodes: Story = {};
