/**
 * Debug panel → Vehicle tab.
 *
 * Shows every piece of context the app holds for the vehicle currently focused
 * in the app (the one clicked on the map / route panel) — raw feed position,
 * trip update, static trip metadata, the merged per-stop schedule/realtime view
 * and matching service alerts — and lets it all be copied as JSON for pasting
 * into a bug report.
 */

import { Bus, Check, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { useCallback, useState } from 'react';

import type { VehicleDiagnostic } from '../../hooks/useVehicleDiagnostic';

import { formatSignedSeconds, formatTimestampAge } from '../../utils/debugFormat';
import { ScheduleRelationship, VehicleStopStatus } from '../../utils/realtime';

interface DebugVehicleTabProps {
  diagnostic: null | VehicleDiagnostic;
  error: Error | null;
  loading: boolean;
  nowMs: number;
  /** tripId of the vehicle focused in the app; null when none is selected */
  selectedTripId: null | string;
}

interface FieldProps {
  label: string;
  value: React.ReactNode;
}

interface SectionProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  subtitle?: string;
  title: string;
}

const SCHEDULE_RELATIONSHIP_LABELS: Record<number, string> = {
  [ScheduleRelationship.NO_DATA]: 'NO_DATA',
  [ScheduleRelationship.SCHEDULED]: 'SCHEDULED',
  [ScheduleRelationship.SKIPPED]: 'SKIPPED',
};

const STOP_STATUS_LABELS: Record<number, string> = {
  [VehicleStopStatus.IN_TRANSIT_TO]: 'IN_TRANSIT_TO',
  [VehicleStopStatus.INCOMING_AT]: 'INCOMING_AT',
  [VehicleStopStatus.STOPPED_AT]: 'STOPPED_AT',
};

export function DebugVehicleTab({
  diagnostic,
  error,
  loading,
  nowMs,
  selectedTripId,
}: DebugVehicleTabProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!diagnostic) return;
    void navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [diagnostic]);

  if (!selectedTripId) {
    return (
      <div className="text-center py-8 text-base-content/40 text-xs">
        <Bus className="w-6 h-6 mx-auto mb-2 opacity-40" />
        Select a vehicle on the map to inspect its context
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error text-xs p-2">{error.message}</div>;
  }

  if (loading || !diagnostic) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-xs text-base-content/50">
        <span className="loading loading-spinner loading-sm" />
        Loading trip data…
      </div>
    );
  }

  const { alerts, progress, route, stops, stopsSource, trip, tripUpdate, vehiclePos } = diagnostic;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <span className={`badge badge-xs ${route ? 'badge-primary' : 'badge-ghost'}`}>
          {route?.shortName ?? vehiclePos?.routeId ?? '?'}
        </span>
        <span className="font-mono text-[11px] truncate flex-1">{diagnostic.tripId}</span>
        <button
          aria-label="Copy vehicle context"
          className="btn btn-ghost btn-xs gap-1"
          onClick={handleCopy}
          title="Copy the full vehicle context as JSON"
          type="button"
        >
          {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          JSON
        </button>
      </div>

      {!vehiclePos && (
        <div className="alert alert-warning text-[11px] p-2">
          No GPS position in the current feed for this trip
          {tripUpdate ? ' — showing trip update only.' : '. It may have finished or been removed.'}
        </div>
      )}

      <Section subtitle={`${stops.length} stops · ${stopsSource}`} title="Progress">
        <Field label="currentIndex" value={progress.currentIndex} />
        <Field label="gpsIndex" value={progress.gpsIndex} />
        <Field label="nextStop" value={progress.nextStopName ?? '—'} />
        <Field label="nextStopId" value={progress.nextStopId ?? '—'} />
        <Field
          label="distToNext"
          value={
            progress.distanceToNextStopMeters != null
              ? `${progress.distanceToNextStopMeters} m`
              : '—'
          }
        />
        <Field label="stopsRemaining" value={progress.stopsRemaining ?? '—'} />
        <Field
          label="stopStatus"
          value={
            progress.stopStatus != null
              ? `${STOP_STATUS_LABELS[progress.stopStatus] ?? '?'} (${progress.stopStatus})`
              : '—'
          }
        />
        <Field label="rtCurrentStopId" value={progress.currentStopId || '—'} />
        <Field label="rtStopSequence" value={progress.currentStopSequence ?? '—'} />
        <Field
          label="tripDelay"
          value={
            progress.tripDelaySeconds != null ? formatSignedSeconds(progress.tripDelaySeconds) : '—'
          }
        />
        <Field
          label="gps age"
          value={progress.gpsAgeSeconds != null ? `${progress.gpsAgeSeconds}s` : '—'}
        />
        <Field
          label="stationary"
          value={progress.stationarySeconds != null ? `${progress.stationarySeconds}s` : '—'}
        />
      </Section>

      {vehiclePos && (
        <Section title="Vehicle position (GTFS-RT)">
          <Field label="vehicleId" value={vehiclePos.vehicleId || '—'} />
          <Field label="routeId" value={vehiclePos.routeId || '—'} />
          <Field
            label="lat / lon"
            value={`${vehiclePos.latitude.toFixed(5)}, ${vehiclePos.longitude.toFixed(5)}`}
          />
          <Field
            label="bearing"
            value={vehiclePos.bearing != null ? `${vehiclePos.bearing}°` : '—'}
          />
          <Field
            label="speed"
            value={vehiclePos.speed != null ? `${(vehiclePos.speed * 3.6).toFixed(1)} km/h` : '—'}
          />
          <Field label="timestamp" value={formatTimestampAge(vehiclePos.timestamp, nowMs)} />
          <Field label="occupancy" value={vehiclePos.occupancyStatus ?? '—'} />
          <Field label="congestion" value={vehiclePos.congestionLevel ?? '—'} />
        </Section>
      )}

      <Section subtitle={trip ? undefined : 'not in static data'} title="Trip (static GTFS)">
        <Field label="headsign" value={trip?.headsign ?? '—'} />
        <Field label="direction" value={trip?.direction ?? '—'} />
        <Field label="serviceId" value={trip?.serviceId ?? '—'} />
        <Field label="shapeId" value={trip?.shapeId ?? '—'} />
        <Field label="routeId" value={route?.id ?? '—'} />
        <Field label="routeName" value={route?.longName ?? '—'} />
        <Field label="routeType" value={route?.type ?? '—'} />
      </Section>

      <Section
        defaultOpen={false}
        subtitle={
          tripUpdate ? `${tripUpdate.stopTimeUpdates.length} stop-time updates` : 'none in feed'
        }
        title="Trip update (GTFS-RT)"
      >
        {tripUpdate ? (
          <>
            <Field label="vehicleId" value={tripUpdate.vehicleId || '—'} />
            <Field
              label="delay"
              value={tripUpdate.delay != null ? formatSignedSeconds(tripUpdate.delay) : '—'}
            />
            <Field
              label="timestamp"
              value={tripUpdate.timestamp ? formatTimestampAge(tripUpdate.timestamp, nowMs) : '—'}
            />
          </>
        ) : (
          <span className="col-span-2 text-base-content/40">No trip update for this trip</span>
        )}
      </Section>

      <Section defaultOpen={false} subtitle={`${stops.length} rows`} title="Stops">
        <div className="col-span-2 overflow-x-auto">
          <table className="table table-xs">
            <thead>
              <tr className="text-[10px]">
                <th>#</th>
                <th>stop</th>
                <th>sched</th>
                <th>delay</th>
                <th>dist</th>
              </tr>
            </thead>
            <tbody>
              {stops.map((s) => {
                const delay = s.departureDelaySeconds ?? s.arrivalDelaySeconds;
                const isCurrent = s.index === progress.currentIndex;
                return (
                  <tr
                    className={
                      isCurrent
                        ? 'bg-primary/10 font-semibold'
                        : s.passed
                          ? 'text-base-content/40'
                          : ''
                    }
                    key={`${s.index}-${s.stopId}`}
                  >
                    <td>{s.index}</td>
                    <td className="max-w-[9rem] truncate" title={`${s.stopName} (${s.stopId})`}>
                      {s.stopName}
                      {s.scheduleRelationship != null &&
                        s.scheduleRelationship !== ScheduleRelationship.SCHEDULED && (
                          <span className="badge badge-xs badge-warning ml-1">
                            {SCHEDULE_RELATIONSHIP_LABELS[s.scheduleRelationship] ?? '?'}
                          </span>
                        )}
                    </td>
                    <td>{s.scheduledTime ?? '—'}</td>
                    <td>{delay != null ? formatSignedSeconds(delay) : '—'}</td>
                    <td>{s.distanceMeters != null ? `${s.distanceMeters} m` : '—'}</td>
                  </tr>
                );
              })}
              {stops.length === 0 && (
                <tr>
                  <td className="text-base-content/40" colSpan={5}>
                    No stop list available for this trip
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      {alerts.length > 0 && (
        <Section defaultOpen={false} subtitle={`${alerts.length}`} title="Service alerts on route">
          <div className="col-span-2 space-y-1">
            {alerts.map((a) => (
              <div className="rounded bg-warning/10 px-1.5 py-1 text-[10px]" key={a.id}>
                <div className="font-semibold">{a.header}</div>
                <div className="opacity-70">
                  {a.effect} · {a.cause}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Field({ label, value }: FieldProps) {
  return (
    <>
      <span className="text-base-content/50">{label}</span>
      <span className="truncate">{value}</span>
    </>
  );
}

function Section({ children, defaultOpen = true, subtitle, title }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-base-300 rounded-lg text-xs">
      <button
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span className="flex-1 font-semibold">{title}</span>
        {subtitle && <span className="text-[10px] text-base-content/40">{subtitle}</span>}
        {open ? (
          <ChevronDown className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-2 pb-2 font-mono text-[11px] grid grid-cols-2 gap-x-2 gap-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}
