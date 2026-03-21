import { Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { RoadClosure } from '../../hooks/useRoadClosures';
import { useSettingsStore } from '../../stores/settingsStore';
import i18n from '../../i18n';

interface RoadClosuresProps {
    show: boolean;
    closures: RoadClosure[];
}

function closureReasonLabel(reason: string, t: (k: string) => string): string {
    if (reason === 'ROAD_CLOSED_CONSTRUCTION') return t('roadClosures.reasonConstruction');
    if (reason === 'ROAD_CLOSED') return t('roadClosures.reasonClosed');
    return reason;
}

/** ISO 8601 from Zagreb feed (`expectedStartTime` / `expectedEndTime`) → locale date+time, or null if invalid. */
function formatClosureInstant(iso: string | undefined, locale: string): string | null {
    if (!iso?.trim()) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

function RoadClosurePopupBody({
    closure,
    t,
    locale,
}: {
    closure: RoadClosure;
    t: TFunction;
    locale: string;
}) {
    const until = formatClosureInstant(closure.endDate, locale);
    const from = formatClosureInstant(closure.startDate, locale);

    return (
        <div className="p-1">
            <h3 className="font-bold text-sm mb-1">{closure.streetName}</h3>
            <div className="text-xs space-y-1">
                <p>
                    <strong>{t('roadClosures.reasonLabel')}</strong> {closureReasonLabel(closure.reason, t)}
                </p>
                <p>
                    <strong>{t('roadClosures.directionLabel')}</strong>{' '}
                    {closure.direction === 'BOTH_DIRECTIONS' ? t('roadClosures.bothDirections') : closure.direction}
                </p>
                {from ? (
                    <p>
                        <strong>{t('roadClosures.closedFrom')}</strong> {from}
                    </p>
                ) : null}
                {until ? (
                    <p>
                        <strong>{t('roadClosures.closedUntil')}</strong> {until}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

export function RoadClosures({ show, closures }: RoadClosuresProps) {
    const { t } = useTranslation();
    const theme = useSettingsStore((s) => s.theme);

    if (!show || closures.length === 0) return null;

    const lineColor = theme === 'dark' ? '#ef4444' : '#dc2626'; // Tailwind red-500 / red-600

    // Construction icon for point closures (if polyline has no/one point)
    const createConstructionIcon = () =>
        L.divIcon({
            html: `
        <div style="background-color: ${lineColor}; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
      `,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });

    return (
        <>
            {closures.map((closure) => {
                // If it's a valid polyline
                if (closure.polyline && closure.polyline.length > 1) {
                    return (
                        <Polyline
                            key={closure.id}
                            positions={closure.polyline}
                            pathOptions={{
                                color: lineColor,
                                weight: 6,
                                opacity: 0.8,
                                dashArray: '10, 10', // Dashed line to indicate under construction/closed
                            }}
                        >
                            <Popup className="road-closure-popup">
                                <RoadClosurePopupBody closure={closure} t={t} locale={i18n.language} />
                            </Popup>
                        </Polyline>
                    );
                }

                // If it only has one point, show a marker instead
                if (closure.polyline && closure.polyline.length === 1) {
                    const point = closure.polyline[0];
                    return (
                        <Marker key={closure.id} position={point} icon={createConstructionIcon()}>
                            <Popup>
                                <RoadClosurePopupBody closure={closure} t={t} locale={i18n.language} />
                            </Popup>
                        </Marker>
                    );
                }

                return null;
            })}
        </>
    );
}
