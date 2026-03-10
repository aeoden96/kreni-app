/**
 * Debug panel — three tabs:
 *  1. Sandbox  — time override (existing)
 *  2. Live Feed — browse all vehicles currently in the GTFS-RT feed
 *  3. Stop      — per-trip diagnostic for the currently selected stop
 */

import { useState, useEffect, useCallback } from 'react';
import { Clock, X, Play, Pause, Radio, Bus, MapPin, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { useDebug } from '../../hooks/useDebug';
import { minutesToTime, timeToMinutes, getCurrentTimeMinutes } from '../../utils/gtfs';
import type { Stop, Route } from '../../utils/gtfs';
import { useSettingsStore } from '../../stores/settingsStore';
import { useRealtimeStore } from '../../stores/realtimeStore';
import { useStopDiagnostic } from '../../hooks/useStopDiagnostic';
import type { TripDiagnostic } from '../../hooks/useStopDiagnostic';
import type { ParsedVehiclePosition } from '../../utils/realtime';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DebugPanelProps {
  selectedStopId?: string | null;
  stopsById?: Map<string, Stop>;
  routesById?: Map<string, Route>;
}

type TabId = 'sandbox' | 'feed' | 'stop';

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
  const age = Math.round((nowMs / 1000) - ts);
  return `${age}s ago`;
}

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  ok: { label: 'Included', color: 'badge-success' },
  terminus: { label: 'Terminus (arrival only)', color: 'badge-secondary' },
  outside_window: { label: 'Too far ahead (>30 min)', color: 'badge-warning' },
  past_grace_window: { label: 'Already departed', color: 'badge-neutral' },
  passed_stop_too_far: { label: 'Passed stop (>400 m)', color: 'badge-error' },
  beyond_diag_window: { label: 'Outside ±60 min', color: 'badge-ghost' },
};

// ─── Sub-component: VehicleCard (Live Feed tab) ───────────────────────────────

interface VehicleCardProps {
  pos: ParsedVehiclePosition;
  routeShortName?: string;
  pinned: boolean;
  nowMs: number;
  onPin: () => void;
}

function VehicleCard({ pos, routeShortName, pinned, nowMs, onPin }: VehicleCardProps) {
  const [open, setOpen] = useState(false);
  const age = Math.round((nowMs / 1000) - pos.timestamp);
  const isStale = age > 60;

  return (
    <div className={`border rounded-lg text-xs mb-1 ${pinned ? 'border-primary bg-primary/5' : 'border-base-300'}`}>
      <button
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
        onClick={() => { setOpen((o) => !o); onPin(); }}
        type="button"
      >
        <span className={`badge badge-xs ${pos.routeId ? 'badge-primary' : 'badge-ghost'}`}>
          {routeShortName ?? pos.routeId ?? '?'}
        </span>
        <span className="font-mono truncate flex-1">{pos.tripId}</span>
        <span className={`shrink-0 ${isStale ? 'text-warning' : 'text-success'}`}>{age}s</span>
        {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-0.5 font-mono text-[11px]">
          <div className="grid grid-cols-2 gap-x-2">
            <span className="text-base-content/50">vehicleId</span><span className="truncate">{pos.vehicleId || '—'}</span>
            <span className="text-base-content/50">tripId</span><span className="truncate">{pos.tripId}</span>
            <span className="text-base-content/50">routeId</span><span>{pos.routeId || '—'}</span>
            <span className="text-base-content/50">lat / lon</span><span>{pos.latitude.toFixed(5)}, {pos.longitude.toFixed(5)}</span>
            <span className="text-base-content/50">bearing</span><span>{pos.bearing != null ? `${pos.bearing}°` : '—'}</span>
            <span className="text-base-content/50">speed</span><span>{pos.speed != null ? `${(pos.speed * 3.6).toFixed(1)} km/h` : '—'}</span>
            <span className="text-base-content/50">gps age</span><span>{fmtTimestamp(pos.timestamp, nowMs)}</span>
            <span className="text-base-content/50">stopSeq</span><span>{pos.currentStopSequence ?? '—'}</span>
            <span className="text-base-content/50">stopId</span><span>{pos.currentStopId || '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: TripDiagnosticRow (Stop tab) ──────────────────────────────

interface TripDiagnosticRowProps {
  d: TripDiagnostic;
  nowMs: number;
}

function TripDiagnosticRow({ d, nowMs }: TripDiagnosticRowProps) {
  const [open, setOpen] = useState(false);
  const meta = REASON_LABELS[d.filterReason] ?? { label: d.filterReason, color: 'badge-ghost' };
  const etaStr =
    d.arrivingInSeconds > 0
      ? `in ${fmtSeconds(d.arrivingInSeconds)}`
      : `${fmtSeconds(d.arrivingInSeconds)} ago`;

  return (
    <div className={`border rounded-lg text-xs mb-1 ${d.included ? 'border-success/40' : 'border-base-300'}`}>
      <button
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="badge badge-xs text-white" style={{ backgroundColor: d.routeType === 0 ? '#2563eb' : '#d97706' }}>
          {d.routeShortName}
        </span>
        <span className="flex-1 truncate">{etaStr}</span>
        <span className={`badge badge-xs ${meta.color} shrink-0`}>{meta.label}</span>
        {d.hasVehiclePosition && <span className="badge badge-xs badge-info shrink-0">GPS</span>}
        {open ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
      </button>
      {open && (
        <div className="px-2 pb-2 font-mono text-[11px] space-y-0.5">
          <div className="grid grid-cols-2 gap-x-2">
            <span className="text-base-content/50">tripId</span><span className="truncate">{d.tripId}</span>
            <span className="text-base-content/50">routeId</span><span>{d.routeId}</span>
            <span className="text-base-content/50">scheduled</span><span>{minutesToTime(d.scheduledMinutes)}</span>
            <span className="text-base-content/50">delay</span><span>{d.delaySeconds != null ? `${d.delaySeconds}s` : '—'}</span>
            <span className="text-base-content/50">arrivingIn</span><span>{fmtSeconds(d.arrivingInSeconds)}</span>
            <span className="text-base-content/50">GPS</span><span>{d.hasVehiclePosition ? '✓' : '✗'}</span>
            <span className="text-base-content/50">distance</span><span>{d.distanceMeters != null ? `${d.distanceMeters} m` : '—'}</span>
            <span className="text-base-content/50">stopsAway</span><span>{d.stopsAway != null ? String(d.stopsAway) : '—'}</span>
            <span className="text-base-content/50">passedStop</span><span>{d.passedStop ? '⚠ yes' : 'no'}</span>
            <span className="text-base-content/50">direction</span><span>{d.directionKey ?? '—'}</span>
            <span className="text-base-content/50">stopIdx</span>
            <span>{d.targetStopIndex >= 0 ? String(d.targetStopIndex) : '— (not found in orderedStops)'}</span>
          </div>
          {d.vehiclePos && (
            <>
              <div className="divider my-1 text-[10px]">Vehicle Position</div>
              <div className="grid grid-cols-2 gap-x-2">
                <span className="text-base-content/50">vehicleId</span><span>{d.vehiclePos.vehicleId || '—'}</span>
                <span className="text-base-content/50">lat / lon</span>
                <span>{d.vehiclePos.latitude.toFixed(5)}, {d.vehiclePos.longitude.toFixed(5)}</span>
                <span className="text-base-content/50">speed</span>
                <span>{d.vehiclePos.speed != null ? `${(d.vehiclePos.speed * 3.6).toFixed(1)} km/h` : '—'}</span>
                <span className="text-base-content/50">bearing</span>
                <span>{d.vehiclePos.bearing != null ? `${d.vehiclePos.bearing}°` : '—'}</span>
                <span className="text-base-content/50">gps age</span><span>{fmtTimestamp(d.vehiclePos.timestamp, nowMs)}</span>
                <span className="text-base-content/50">stopSeq</span><span>{d.vehiclePos.currentStopSequence ?? '—'}</span>
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
                <span> — this stop is the last stop of the route (stopIdx {d.targetStopIndex}); only arrivals here, no departures</span>
              )}
              {d.filterReason === 'outside_window' && (
                <span> — arrives in {Math.round(d.arrivingInSeconds / 60)} min (limit: 30 min)</span>
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

// ─── Sub-component: LiveFeedTab ───────────────────────────────────────────────

interface LiveFeedTabProps {
  routesById: Map<string, Route>;
  nowMs: number;
}

function LiveFeedTab({ routesById, nowMs }: LiveFeedTabProps) {
  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const lastUpdate = useRealtimeStore((s) => s.lastUpdate);
  const [query, setQuery] = useState('');
  const [pinnedTripId, setPinnedTripId] = useState<string | null>(null);

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

  const ageStr = lastUpdate
    ? `${Math.round((nowMs - lastUpdate) / 1000)}s ago`
    : 'never';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-base-content/50">
        <span>{all.length} vehicles in feed</span>
        <span>updated {ageStr}</span>
      </div>
      <input
        type="text"
        placeholder="Filter by tripId / vehicleId / routeId…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="input input-bordered input-xs w-full"
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
              pos={pos}
              routeShortName={route?.shortName}
              pinned={pinnedTripId === pos.tripId}
              nowMs={nowMs}
              onPin={() => setPinnedTripId((id) => (id === pos.tripId ? null : pos.tripId))}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-component: StopDiagnosticTab ────────────────────────────────────────

interface StopDiagnosticTabProps {
  selectedStopId: string | null;
  stopsById: Map<string, Stop>;
  routesById: Map<string, Route>;
  nowMs: number;
  diagnostics: TripDiagnostic[];
  loading: boolean;
  error: Error | null;
  totalTrips: number;
  tripsWithGPS: number;
  tripsIncluded: number;
}

function StopDiagnosticTab({
  selectedStopId,
  stopsById,
  nowMs,
  diagnostics,
  loading,
  error,
  totalTrips,
  tripsWithGPS,
  tripsIncluded,
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
    return (
      <div className="alert alert-error text-xs p-2">
        {error.message}
      </div>
    );
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
          <div className="text-[10px] font-semibold text-success uppercase tracking-wide">Included</div>
          {includedTrips.map((d) => <TripDiagnosticRow key={d.tripId} d={d} nowMs={nowMs} />)}
        </>
      )}

      {excludedTrips.length > 0 && (
        <>
          <div className="text-[10px] font-semibold text-warning uppercase tracking-wide mt-2">Filtered Out</div>
          {excludedTrips.map((d) => <TripDiagnosticRow key={d.tripId} d={d} nowMs={nowMs} />)}
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
      {showCollapsed && collapsed.map((d) => <TripDiagnosticRow key={d.tripId} d={d} nowMs={nowMs} />)}
    </div>
  );
}

// ─── Main DebugPanel component ────────────────────────────────────────────────

export function DebugPanel({
  selectedStopId = null,
  stopsById = new Map(),
  routesById = new Map(),
}: DebugPanelProps) {
  const { debugTime, setDebugTime, isDebugMode, setDebugMode, isPlaying, setIsPlaying, timeSpeed } =
    useDebug();
  const sandboxVisible = useSettingsStore((state) => state.sandboxVisible);
  const vehiclePositions = useRealtimeStore((s) => s.vehiclePositions);
  const lastUpdate = useRealtimeStore((s) => s.lastUpdate);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('sandbox');
  const [timeInput, setTimeInput] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const stopDiag = useStopDiagnostic(selectedStopId, stopsById, routesById, nowMs);

  useEffect(() => {
    if (!timeInput) {
      const currentMinutes = debugTime ?? getCurrentTimeMinutes();
      setTimeInput(minutesToTime(currentMinutes));
    }
  }, [debugTime, timeInput]);

  useEffect(() => {
    if (isPlaying && debugTime !== null) {
      const interval = setInterval(() => {
        setTimeInput(minutesToTime(debugTime));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isPlaying, debugTime]);

  useEffect(() => {
    if (debugTime !== null) {
      setTimeInput(minutesToTime(debugTime));
    }
  }, [debugTime]);

  const handleToggleSandboxMode = () => {
    if (isDebugMode) {
      setDebugMode(false);
      setDebugTime(null);
      setIsPlaying(false);
    } else {
      setDebugMode(true);
      const currentMinutes = getCurrentTimeMinutes();
      setDebugTime(currentMinutes);
      setTimeInput(minutesToTime(currentMinutes));
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTimeInput(value);
    if (value.match(/^\d{2}:\d{2}$/)) {
      const minutes = timeToMinutes(value);
      setDebugTime(minutes);
    }
  };

  const handleSetTime = (minutes: number) => {
    setDebugTime(minutes);
    setTimeInput(minutesToTime(minutes));
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleCopy = useCallback(() => {
    const vehicles = Array.from(vehiclePositions.values());
    const selectedStop = selectedStopId ? stopsById.get(selectedStopId) : null;
    const payload = {
      capturedAt: new Date(nowMs).toISOString(),
      liveFeed: {
        vehicleCount: vehicles.length,
        lastUpdate: lastUpdate ? new Date(lastUpdate).toISOString() : null,
        vehicles,
      },
      selectedStop: selectedStop
        ? {
          id: selectedStopId,
          name: selectedStop.name,
          lat: selectedStop.lat,
          lon: selectedStop.lon,
          diagnostics: {
            totalTrips: stopDiag.totalTrips,
            tripsIncluded: stopDiag.tripsIncluded,
            tripsWithGPS: stopDiag.tripsWithGPS,
            trips: stopDiag.diagnostics,
          },
        }
        : null,
    };
    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [vehiclePositions, lastUpdate, nowMs, selectedStopId, stopsById, stopDiag]);

  if (!sandboxVisible) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-[1000] btn btn-circle btn-secondary btn-sm shadow-lg"
        aria-label="Open debug panel"
      >
        <Clock className="w-4 h-4" />
      </button>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'sandbox', label: 'Sandbox', icon: <Clock className="w-3 h-3" /> },
    { id: 'feed', label: 'Live Feed', icon: <Radio className="w-3 h-3" /> },
    { id: 'stop', label: 'Stop', icon: <Bus className="w-3 h-3" /> },
  ];

  return (
    <div className="fixed bottom-4 left-4 z-[2000] card bg-base-100 shadow-xl w-96 max-h-[60vh] flex flex-col">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Debug Panel
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="btn btn-ghost btn-circle btn-xs"
            aria-label="Copy context to clipboard"
            title="Copy live feed + stop context to clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="btn btn-ghost btn-circle btn-xs"
            aria-label="Close debug panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 shrink-0">
        <div role="tablist" className="tabs tabs-boxed tabs-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              className={`tab gap-1 ${activeTab === tab.id ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto flex-1 px-4 py-3">
        {activeTab === 'sandbox' && (
          <div className="space-y-3">
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Omogući postavljanje vremena</span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={isDebugMode}
                  onChange={handleToggleSandboxMode}
                />
              </label>
            </div>

            {isDebugMode && (
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Current time (HH:MM)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={timeInput}
                      onChange={handleTimeChange}
                      className="input input-bordered input-sm flex-1"
                    />
                    <button
                      onClick={handlePlayPause}
                      className={`btn btn-sm ${isPlaying ? 'btn-warning' : 'btn-success'}`}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                  {isPlaying && (
                    <label className="label">
                      <span className="label-text-alt text-warning">
                        ⚡ Auto-advancing ({timeSpeed} min/sec)
                      </span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Quick presets</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[6, 9, 12, 15, 18, 22].map((h) => (
                      <button
                        key={h}
                        onClick={() => handleSetTime(h * 60)}
                        className="btn btn-xs btn-outline"
                        type="button"
                      >
                        {String(h).padStart(2, '0')}:00
                      </button>
                    ))}
                  </div>
                </div>

                <div className="alert alert-info">
                  <div className="text-sm">
                    <div className="font-bold">
                      Sandbox: {debugTime !== null ? minutesToTime(debugTime) : '--:--'}
                    </div>
                    <div className="text-xs opacity-70">
                      Real: {minutesToTime(getCurrentTimeMinutes())}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'feed' && (
          <LiveFeedTab routesById={routesById} nowMs={nowMs} />
        )}

        {activeTab === 'stop' && (
          <StopDiagnosticTab
            selectedStopId={selectedStopId}
            stopsById={stopsById}
            routesById={routesById}
            nowMs={nowMs}
            diagnostics={stopDiag.diagnostics}
            loading={stopDiag.loading}
            error={stopDiag.error}
            totalTrips={stopDiag.totalTrips}
            tripsWithGPS={stopDiag.tripsWithGPS}
            tripsIncluded={stopDiag.tripsIncluded}
          />
        )}
      </div>
    </div>
  );
}
