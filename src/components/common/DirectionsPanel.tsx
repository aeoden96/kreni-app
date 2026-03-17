import { useMemo, useState } from 'react';
import { ArrowUpDown, Bus, Loader2, TrainFront } from 'lucide-react';
import type { Route, Stop } from '../../utils/gtfs';
import { useDirections } from '../../hooks/useDirections';
import { ParentStopInput } from './ParentStopInput';

interface DirectionsPanelProps {
  stops: Stop[];
  routesById: Map<string, Route>;
  onRouteClick?: (routeId: string, routeType: number, direction: 'A' | 'B') => void;
  dataDir?: string;
}

export function DirectionsPanel({
  stops,
  routesById,
  onRouteClick,
  dataDir = 'data',
}: DirectionsPanelProps) {
  const [fromStop, setFromStop] = useState<Stop | null>(null);
  const [toStop, setToStop] = useState<Stop | null>(null);
  const { results, loading } = useDirections(fromStop?.id ?? null, toStop?.id ?? null, routesById, { dataDir });

  const canSwap = Boolean(fromStop || toStop);
  const hasSelection = Boolean(fromStop && toStop);

  const resultLabel = useMemo(() => {
    if (!hasSelection) return 'Odaberite polazište i odredište';
    if (loading) return 'Traženje direktnih linija...';
    if (results.length === 0) return 'Nema izravne linije za odabrane stanice';
    return `${results.length} ${results.length === 1 ? 'linija' : 'linije'}`;
  }, [hasSelection, loading, results.length]);

  return (
    <div className="p-4 space-y-3">
      <div className="relative space-y-2">
        <ParentStopInput
          stops={stops}
          value={fromStop}
          onChange={setFromStop}
          placeholder="Odakle?"
          autoFocus
        />
        <ParentStopInput
          stops={stops}
          value={toStop}
          onChange={setToStop}
          placeholder="Kamo?"
        />

        <button
          type="button"
          className="btn btn-sm btn-circle absolute right-2 top-[22px]"
          onClick={() => {
            if (!canSwap) return;
            setFromStop(toStop);
            setToStop(fromStop);
          }}
          disabled={!canSwap}
          aria-label="Zamijeni polazište i odredište"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
      </div>

      <div className="text-xs text-base-content/60 px-1">{resultLabel}</div>

      {loading && hasSelection && (
        <div className="flex items-center gap-2 text-sm text-base-content/60 px-1">
          <Loader2 className="w-4 h-4 animate-spin" />
          Učitavanje...
        </div>
      )}

      {hasSelection && !loading && results.length > 0 && (
        <div className="divide-y divide-base-300 border border-base-300 rounded-xl overflow-hidden">
          {results.map((item) => {
            const color = item.route.type === 0 ? '#2563eb' : item.route.type === 3 ? '#d97706' : '#64748b';
            const VehicleIcon = item.route.type === 0 ? TrainFront : Bus;
            return (
              <button
                key={`${item.route.id}-${item.directionKey}`}
                type="button"
                className="w-full px-3 py-3 text-left hover:bg-base-200 transition-colors"
                onClick={() => onRouteClick?.(item.route.id, item.route.type, item.directionFilter)}
              >
                <div className="flex items-center gap-3">
                  <span className="badge font-bold text-white min-w-[3rem] justify-center" style={{ backgroundColor: color }}>
                    {item.route.shortName}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm line-clamp-1">{item.route.longName}</div>
                    <div className="text-xs text-base-content/60">
                      Smjer {item.directionFilter} · {item.stopsBetween + 1} stanica
                    </div>
                  </div>
                  <VehicleIcon className="w-4 h-4 text-base-content/50 shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
