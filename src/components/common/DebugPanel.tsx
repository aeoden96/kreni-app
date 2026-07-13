/**
 * Debug panel — three tabs:
 *  1. Sandbox  — time override (existing)
 *  2. Live Feed — browse all vehicles currently in the GTFS-RT feed
 *  3. Stop      — per-trip diagnostic for the currently selected stop
 */

import {
  Bus,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  MapPin,
  Presentation,
  Radio,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { TripDiagnostic } from '../../hooks/useStopDiagnostic';
import type { Route, Stop } from '../../utils/gtfs';
import type { ParsedVehiclePosition } from '../../utils/realtime';

import { useGTFSMode } from '../../contexts/GTFSModeContext';
import { useStopDiagnostic } from '../../hooks/useStopDiagnostic';
import { useRealtimeStore } from '../../stores/realtimeStore';
import { minutesToTime } from '../../utils/gtfs';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DebugPanelProps {
  routesById?: Map<string, Route>;
  selectedStopId?: null | string;
  stopsById?: Map<string, Stop>;
}

type TabId = 'feed' | 'stop';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSeconds(sec: number): string {
  const abs = Math.abs(Math.round(sec));
  if (abs < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const sign = sec < 0 ? '-' : '';
  return `${sign}${m}m ${s}s`;
}

function fmtTimestamp(ts: number, nowMs: number): string {
  const age = Math.round(nowMs / 1000 - ts);
  return `${age}s ago`;
}

const REASON_LABELS: Record<string, { color: string; label: string }> = {
  beyond_diag_window: { color: 'badge-ghost', label: 'Outside ±60 min' },
  ok: { color: 'badge-success', label: 'Included' },
  outside_window: { color: 'badge-warning', label: 'Too far ahead (>30 min)' },
  passed_stop_too_far: { color: 'badge-error', label: 'Passed stop (>400 m)' },
  past_grace_window: { color: 'badge-neutral', label: 'Already departed' },
  terminus: { color: 'badge-secondary', label: 'Terminus (arrival only)' },
};

// ─── Sub-component: VehicleCard (Live Feed tab) ───────────────────────────────

interface LiveFeedTabProps {
  nowMs: number;
  routesById: Map<string, Route>;
}

interface StopDiagnosticTabProps {
  diagnostics: TripDiagnostic[];
  error: Error | null;
  loading: boolean;
  nowMs: number;
  routesById: Map<string, Route>;
  selectedStopId: null | string;
  stopsById: Map<string, Stop>;
  totalTrips: number;
  tripsIncluded: number;
  tripsWithGPS: number;
}

// ─── Sub-component: TripDiagnosticRow (Stop tab) ──────────────────────────────

interface TripDiagnosticRowProps {
  d: TripDiagnostic;
  nowMs: number;
}

interface VehicleCardProps {
  nowMs: number;
  onPin: () => void;
  pinned: boolean;
  pos: ParsedVehiclePosition;
  routeShortName?: string;
}

// ─── Sub-component: LiveFeedTab ───────────────────────────────────────────────

export function DebugPanel({
  routesById = new Map(),
  selectedStopId = null,
  stopsById = new Map(),
}: DebugPanelProps) {
  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const lastUpdate = useRealtimeStore((s) => s.lastUpdate);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('feed');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { dataDir } = useGTFSMode();
  const stopDiag = useStopDiagnostic(selectedStopId, stopsById, routesById, nowMs, { dataDir });

  const handleCopy = useCallback(() => {
    const vehicles = Array.from(vehiclePositions.values());
    const selectedStop = selectedStopId ? stopsById.get(selectedStopId) : null;
    const payload = {
      capturedAt: new Date(nowMs).toISOString(),
      liveFeed: {
        lastUpdate: lastUpdate ? new Date(lastUpdate).toISOString() : null,
        vehicleCount: vehicles.length,
        vehicles,
      },
      selectedStop: selectedStop
        ? {
            diagnostics: {
              totalTrips: stopDiag.totalTrips,
              trips: stopDiag.diagnostics,
              tripsIncluded: stopDiag.tripsIncluded,
              tripsWithGPS: stopDiag.tripsWithGPS,
            },
            id: selectedStopId,
            lat: selectedStop.lat,
            lon: selectedStop.lon,
            name: selectedStop.name,
          }
        : null,
    };
    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [vehiclePositions, lastUpdate, nowMs, selectedStopId, stopsById, stopDiag]);

  if (!isOpen) {
    return (
      <button
        aria-label="Open debug panel"
        className="fixed bottom-4 left-4 z-[1000] btn btn-circle btn-secondary btn-sm shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <Presentation className="w-4 h-4" />
      </button>
    );
  }

  const tabs: { icon: React.ReactNode; id: TabId; label: string }[] = [
    { icon: <Radio className="w-3 h-3" />, id: 'feed', label: 'Live Feed' },
    { icon: <Bus className="w-3 h-3" />, id: 'stop', label: 'Stop' },
  ];

  return (
    <div className="fixed bottom-4 left-4 z-[2000] card bg-base-100 shadow-xl w-96 max-h-[60vh] flex flex-col">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Presentation className="w-4 h-4" />
          Debug Panel
        </h3>
        <div className="flex items-center gap-1">
          <button
            aria-label="Copy context to clipboard"
            className="btn btn-ghost btn-circle btn-xs"
            onClick={handleCopy}
            title="Copy live feed + stop context to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            aria-label="Close debug panel"
            className="btn btn-ghost btn-circle btn-xs"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 shrink-0">
        <div className="tabs tabs-boxed tabs-xs" role="tablist">
          {tabs.map((tab) => (
            <button
              className={`tab gap-1 ${activeTab === tab.id ? 'tab-active' : ''}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-4 py-3">
        {activeTab === 'feed' && <LiveFeedTab nowMs={nowMs} routesById={routesById} />}

        {activeTab === 'stop' && (
          <StopDiagnosticTab
            diagnostics={stopDiag.diagnostics}
            error={stopDiag.error}
            loading={stopDiag.loading}
            nowMs={nowMs}
            routesById={routesById}
            selectedStopId={selectedStopId}
            stopsById={stopsById}
            totalTrips={stopDiag.totalTrips}
            tripsIncluded={stopDiag.tripsIncluded}
            tripsWithGPS={stopDiag.tripsWithGPS}
          />
        )}
      </div>
    </div>
  );
}

function LiveFeedTab({ nowMs, routesById }: LiveFeedTabProps) {
  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const lastUpdate = useRealtimeStore((s) => s.lastUpdate);
  const [query, setQuery] = useState('');
  const [pinnedTripId, setPinnedTripId] = useState<null | string>(null);

  const all = Array.from(vehiclePositions.values());
  const q = query.trim().toLowerCase();
  const filtered = q
    ? all.filter(
        (p) =>
          p.tripId.toLowerCase().includes(q) ||
          (p.vehicleId && p.vehicleId.toLowerCase().includes(q)) ||
          (p.routeId && p.routeId.toLowerCase().includes(q))
      )
    : all;

  filtered.sort((a, b) => {
    if (a.tripId === pinnedTripId) return -1;
    if (b.tripId === pinnedTripId) return 1;
    return b.timestamp - a.timestamp;
  });

  const ageStr = lastUpdate ? `${Math.round((nowMs - lastUpdate) / 1000)}s ago` : 'never';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-base-content/50">
        <span>{all.length} vehicles in feed</span>
        <span>updated {ageStr}</span>
      </div>
      <input
        className="input input-bordered input-xs w-full"
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter by tripId / vehicleId / routeId…"
        type="text"
        value={query}
      />
      <div className="max-h-96 overflow-y-auto pr-0.5">
        {filtered.length === 0 && (
          <div className="text-xs text-base-content/40 text-center py-4">No vehicles match</div>
        )}
        {filtered.map((pos) => {
          const route = pos.routeId ? routesById.get(pos.routeId) : undefined;
          return (
            <VehicleCard
              key={pos.tripId}
              nowMs={nowMs}
              onPin={() => setPinnedTripId((id) => (id === pos.tripId ? null : pos.tripId))}
              pinned={pinnedTripId === pos.tripId}
              pos={pos}
              routeShortName={route?.shortName}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-component: StopDiagnosticTab ────────────────────────────────────────

function StopDiagnosticTab({
  diagnostics,
  error,
  loading,
  nowMs,
  selectedStopId,
  stopsById,
  totalTrips,
  tripsIncluded,
  tripsWithGPS,
}: StopDiagnosticTabProps) {
  const [showCollapsed, setShowCollapsed] = useState(false);

  if (!selectedStopId) {
    return (
      <div className="text-center py-8 text-base-content/40 text-xs">
        <MapPin className="w-6 h-6 mx-auto mb-2 opacity-40" />
        Select a stop on the map to run diagnostics
      </div>
    );
  }

  const stop = stopsById.get(selectedStopId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-xs text-base-content/50">
        <span className="loading loading-spinner loading-sm" />
        Loading timetable…
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error text-xs p-2">{error.message}</div>;
  }

  const visible = diagnostics.filter((d) => d.filterReason !== 'beyond_diag_window');
  const collapsed = diagnostics.filter((d) => d.filterReason === 'beyond_diag_window');
  const includedTrips = visible.filter((d) => d.included);
  const excludedTrips = visible.filter((d) => !d.included);

  return (
    <div className="space-y-2">
      <div className="text-xs">
        <span className="font-semibold">{stop?.name ?? selectedStopId}</span>
        <span className="text-base-content/40 ml-1">#{selectedStopId}</span>
      </div>

      <div className="flex flex-wrap gap-1 text-[10px]">
        <span className="badge badge-success badge-xs">{tripsIncluded} shown</span>
        <span className="badge badge-warning badge-xs">{excludedTrips.length} filtered out</span>
        <span className="badge badge-info badge-xs">{tripsWithGPS} with GPS</span>
        <span className="badge badge-ghost badge-xs">{totalTrips} total (±60 min)</span>
      </div>

      {includedTrips.length > 0 && (
        <>
          <div className="text-[10px] font-semibold text-success uppercase tracking-wide">
            Included
          </div>
          {includedTrips.map((d) => (
            <TripDiagnosticRow d={d} key={d.tripId} nowMs={nowMs} />
          ))}
        </>
      )}

      {excludedTrips.length > 0 && (
        <>
          <div className="text-[10px] font-semibold text-warning uppercase tracking-wide mt-2">
            Filtered Out
          </div>
          {excludedTrips.map((d) => (
            <TripDiagnosticRow d={d} key={d.tripId} nowMs={nowMs} />
          ))}
        </>
      )}

      {includedTrips.length === 0 && excludedTrips.length === 0 && (
        <div className="text-xs text-base-content/40 text-center py-4">
          No trips within ±60 min window
        </div>
      )}

      {collapsed.length > 0 && (
        <button
          className="text-[10px] text-base-content/40 hover:text-base-content/70 transition-colors"
          onClick={() => setShowCollapsed((s) => !s)}
          type="button"
        >
          {showCollapsed ? '▲ Hide' : '▶ Show'} {collapsed.length} trips outside ±60 min
        </button>
      )}
      {showCollapsed &&
        collapsed.map((d) => <TripDiagnosticRow d={d} key={d.tripId} nowMs={nowMs} />)}
    </div>
  );
}

function TripDiagnosticRow({ d, nowMs }: TripDiagnosticRowProps) {
  const [open, setOpen] = useState(false);
  const meta = REASON_LABELS[d.filterReason] ?? { color: 'badge-ghost', label: d.filterReason };
  const etaStr =
    d.arrivingInSeconds > 0
      ? `in ${fmtSeconds(d.arrivingInSeconds)}`
      : `${fmtSeconds(d.arrivingInSeconds)} ago`;

  return (
    <div
      className={`border rounded-lg text-xs mb-1 ${d.included ? 'border-success/40' : 'border-base-300'}`}
    >
      <button
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span
          className="badge badge-xs text-white"
          style={{ backgroundColor: d.routeType === 0 ? '#2563eb' : '#d97706' }}
        >
          {d.routeShortName}
        </span>
        <span className="flex-1 truncate">{etaStr}</span>
        <span className={`badge badge-xs ${meta.color} shrink-0`}>{meta.label}</span>
        {d.hasVehiclePosition && <span className="badge badge-xs badge-info shrink-0">GPS</span>}
        {open ? (
          <ChevronDown className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-2 pb-2 font-mono text-[11px] space-y-0.5">
          <div className="grid grid-cols-2 gap-x-2">
            <span className="text-base-content/50">tripId</span>
            <span className="truncate">{d.tripId}</span>
            <span className="text-base-content/50">routeId</span>
            <span>{d.routeId}</span>
            <span className="text-base-content/50">scheduled</span>
            <span>{minutesToTime(d.scheduledMinutes)}</span>
            <span className="text-base-content/50">delay</span>
            <span>{d.delaySeconds != null ? `${d.delaySeconds}s` : '—'}</span>
            <span className="text-base-content/50">arrivingIn</span>
            <span>{fmtSeconds(d.arrivingInSeconds)}</span>
            <span className="text-base-content/50">GPS</span>
            <span>{d.hasVehiclePosition ? '✓' : '✗'}</span>
            <span className="text-base-content/50">distance</span>
            <span>{d.distanceMeters != null ? `${d.distanceMeters} m` : '—'}</span>
            <span className="text-base-content/50">stopsAway</span>
            <span>{d.stopsAway != null ? String(d.stopsAway) : '—'}</span>
            <span className="text-base-content/50">passedStop</span>
            <span>{d.passedStop ? '⚠ yes' : 'no'}</span>
            <span className="text-base-content/50">direction</span>
            <span>{d.directionKey ?? '—'}</span>
            <span className="text-base-content/50">stopIdx</span>
            <span>
              {d.targetStopIndex >= 0 ? String(d.targetStopIndex) : '— (not found in orderedStops)'}
            </span>
          </div>
          {d.vehiclePos && (
            <>
              <div className="divider my-1 text-[10px]">Vehicle Position</div>
              <div className="grid grid-cols-2 gap-x-2">
                <span className="text-base-content/50">vehicleId</span>
                <span>{d.vehiclePos.vehicleId || '—'}</span>
                <span className="text-base-content/50">lat / lon</span>
                <span>
                  {d.vehiclePos.latitude.toFixed(5)}, {d.vehiclePos.longitude.toFixed(5)}
                </span>
                <span className="text-base-content/50">speed</span>
                <span>
                  {d.vehiclePos.speed != null
                    ? `${(d.vehiclePos.speed * 3.6).toFixed(1)} km/h`
                    : '—'}
                </span>
                <span className="text-base-content/50">bearing</span>
                <span>{d.vehiclePos.bearing != null ? `${d.vehiclePos.bearing}°` : '—'}</span>
                <span className="text-base-content/50">gps age</span>
                <span>{fmtTimestamp(d.vehiclePos.timestamp, nowMs)}</span>
                <span className="text-base-content/50">stopSeq</span>
                <span>{d.vehiclePos.currentStopSequence ?? '—'}</span>
              </div>
            </>
          )}
          {d.tripUpdate && (
            <>
              <div className="divider my-1 text-[10px]">
                Trip Update ({d.tripUpdate.stopTimeUpdates.length} stop-time updates)
              </div>
              <div className="grid grid-cols-2 gap-x-2">
                <span className="text-base-content/50">tripDelay</span>
                <span>{d.tripUpdate.delay != null ? `${d.tripUpdate.delay}s` : '—'}</span>
              </div>
            </>
          )}
          {!d.included && (
            <div className="mt-1 px-1.5 py-1 rounded bg-warning/10 text-warning text-[10px]">
              <strong>Filtered out:</strong> {meta.label}
              {d.filterReason === 'terminus' && (
                <span>
                  {' '}
                  — this stop is the last stop of the route (stopIdx {d.targetStopIndex}); only
                  arrivals here, no departures
                </span>
              )}
              {d.filterReason === 'outside_window' && (
                <span>
                  {' '}
                  — arrives in {Math.round(d.arrivingInSeconds / 60)} min (limit: 30 min)
                </span>
              )}
              {d.filterReason === 'passed_stop_too_far' && d.distanceMeters != null && (
                <span> — {d.distanceMeters} m away (limit: 400 m)</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main DebugPanel component ────────────────────────────────────────────────

function VehicleCard({ nowMs, onPin, pinned, pos, routeShortName }: VehicleCardProps) {
  const [open, setOpen] = useState(false);
  const age = Math.round(nowMs / 1000 - pos.timestamp);
  const isStale = age > 60;

  return (
    <div
      className={`border rounded-lg text-xs mb-1 ${pinned ? 'border-primary bg-primary/5' : 'border-base-300'}`}
    >
      <button
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
        onClick={() => {
          setOpen((o) => !o);
          onPin();
        }}
        type="button"
      >
        <span className={`badge badge-xs ${pos.routeId ? 'badge-primary' : 'badge-ghost'}`}>
          {routeShortName ?? pos.routeId ?? '?'}
        </span>
        <span className="font-mono truncate flex-1">{pos.tripId}</span>
        <span className={`shrink-0 ${isStale ? 'text-warning' : 'text-success'}`}>{age}s</span>
        {open ? (
          <ChevronDown className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-0.5 font-mono text-[11px]">
          <div className="grid grid-cols-2 gap-x-2">
            <span className="text-base-content/50">vehicleId</span>
            <span className="truncate">{pos.vehicleId || '—'}</span>
            <span className="text-base-content/50">tripId</span>
            <span className="truncate">{pos.tripId}</span>
            <span className="text-base-content/50">routeId</span>
            <span>{pos.routeId || '—'}</span>
            <span className="text-base-content/50">lat / lon</span>
            <span>
              {pos.latitude.toFixed(5)}, {pos.longitude.toFixed(5)}
            </span>
            <span className="text-base-content/50">bearing</span>
            <span>{pos.bearing != null ? `${pos.bearing}°` : '—'}</span>
            <span className="text-base-content/50">speed</span>
            <span>{pos.speed != null ? `${(pos.speed * 3.6).toFixed(1)} km/h` : '—'}</span>
            <span className="text-base-content/50">gps age</span>
            <span>{fmtTimestamp(pos.timestamp, nowMs)}</span>
            <span className="text-base-content/50">stopSeq</span>
            <span>{pos.currentStopSequence ?? '—'}</span>
            <span className="text-base-content/50">stopId</span>
            <span>{pos.currentStopId || '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
