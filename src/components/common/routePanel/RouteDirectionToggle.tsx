import { Bus, Train } from 'lucide-react';

import type { VehiclePosition } from '../../../utils/vehicles';

export interface DirectionLabel {
  color: string;
  key: string;
  label: string;
}

interface RouteDirectionToggleProps {
  activeKey: string;
  directions: DirectionLabel[];
  onSelect: (key: string) => void;
  routeType: number;
  vehicles: VehiclePosition[];
}

/** Segmented A/B direction switch with per-direction live vehicle counts. */
export function RouteDirectionToggle({
  activeKey,
  directions,
  onSelect,
  routeType,
  vehicles,
}: RouteDirectionToggleProps) {
  const VehicleIcon = routeType === 3 ? Bus : Train;

  return (
    <div className="flex rounded-lg overflow-hidden border border-base-300 w-full">
      {directions.map((dir, idx) => {
        const count = vehicles.filter((v) => v.direction === idx).length;
        const isActive = activeKey === dir.key;
        return (
          <button
            className={[
              'flex-1 flex items-center justify-between gap-1.5 px-2 py-1.5 text-xs font-semibold transition-colors min-w-0',
              isActive ? 'text-white' : 'bg-base-100 text-base-content/60 hover:bg-base-200',
            ].join(' ')}
            key={dir.key}
            onClick={() => onSelect(dir.key)}
            style={isActive ? { backgroundColor: dir.color } : undefined}
            type="button"
          >
            <span className="truncate text-left">{dir.label}</span>
            <span
              className={[
                'flex items-center gap-0.5 shrink-0 font-bold tabular-nums',
                isActive ? 'text-white/90' : count > 0 ? 'text-success' : 'opacity-30',
              ].join(' ')}
            >
              {count > 0 && (
                <span
                  className={[
                    'w-1.5 h-1.5 rounded-full animate-pulse',
                    isActive ? 'bg-white/80' : 'bg-success',
                  ].join(' ')}
                />
              )}
              <VehicleIcon className="w-3 h-3" />
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
