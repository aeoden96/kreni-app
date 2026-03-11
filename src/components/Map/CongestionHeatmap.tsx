/**
 * Leaflet heatmap layer for tram congestion.
 *
 * Uses L.circleMarker with colored, sized circles instead of a bitmap
 * heatmap library — this avoids adding a dependency and looks great with
 * the existing map style.  Each stop gets a translucent circle whose
 * radius and color encode the average delay.
 */

import { CircleMarker, Tooltip } from 'react-leaflet';
import type { CongestionPoint } from '../../hooks/useCongestionData';

// ── Color scale ────────────────────────────────────────────────────────────

function delayColor(level: CongestionPoint['level']): string {
    switch (level) {
        case 'low': return '#22c55e'; // green-500
        case 'medium': return '#eab308'; // yellow-500
        case 'high': return '#f97316'; // orange-500
        case 'severe': return '#ef4444'; // red-500
    }
}

function delayRadius(avgDelay: number): number {
    const abs = Math.abs(avgDelay);
    if (abs < 30) return 16;
    if (abs < 60) return 24;
    if (abs < 180) return 32;
    if (abs < 360) return 40;
    return 48;
}

function delayOpacity(level: CongestionPoint['level']): number {
    switch (level) {
        case 'low': return 0.20;
        case 'medium': return 0.35;
        case 'high': return 0.45;
        case 'severe': return 0.60;
    }
}

// ── Formatters ─────────────────────────────────────────────────────────────

function formatDelay(seconds: number): string {
    const abs = Math.abs(seconds);
    if (abs < 60) return 'na vrijeme';
    const min = Math.round(abs / 60);
    return seconds > 0 ? `${min} min kasni` : `${min} min prerano`;
}

function formatVsHistorical(ratio: number | undefined): string | null {
    if (ratio === undefined) return null;
    const pct = Math.round((ratio - 1) * 100);
    if (Math.abs(pct) < 10) return 'uobičajeno';
    if (pct > 0) return `${pct}% gore nego inače`;
    return `${Math.abs(pct)}% bolje nego inače`;
}

// ── Component ──────────────────────────────────────────────────────────────

interface CongestionHeatmapProps {
    points: CongestionPoint[];
    show: boolean;
}

export function CongestionHeatmap({ points, show }: CongestionHeatmapProps) {
    if (!show || points.length === 0) return null;

    return (
        <>
            {points.map((pt) => (
                <CircleMarker
                    key={pt.stopId}
                    center={[pt.lat, pt.lon]}
                    radius={delayRadius(pt.avgDelay)}
                    pathOptions={{
                        stroke: false,
                        fillColor: delayColor(pt.level),
                        fillOpacity: delayOpacity(pt.level),
                        className: 'transition-all duration-700 ease-in-out',
                    }}
                >
                    <Tooltip direction="top" offset={[0, -8]} className="congestion-tooltip">
                        <div className="text-xs space-y-0.5">
                            <div className="font-bold">{pt.stopName}</div>
                            <div>{formatDelay(pt.avgDelay)}</div>
                            {pt.maxDelay > 60 && (
                                <div className="text-base-content/60">
                                    max: {Math.round(pt.maxDelay / 60)} min
                                </div>
                            )}
                            <div className="text-base-content/60">
                                {pt.tripCount} {pt.tripCount === 1 ? 'tramvaj' : 'tramvaja'}
                            </div>
                            {pt.vsHistorical !== undefined && (
                                <div className={
                                    pt.vsHistorical > 1.1
                                        ? 'text-error font-semibold'
                                        : pt.vsHistorical < 0.9
                                            ? 'text-success font-semibold'
                                            : 'text-base-content/60'
                                }>
                                    {formatVsHistorical(pt.vsHistorical)}
                                </div>
                            )}
                        </div>
                    </Tooltip>
                </CircleMarker>
            ))}
        </>
    );
}
