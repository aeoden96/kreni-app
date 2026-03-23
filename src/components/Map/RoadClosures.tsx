import type { TFunction } from 'i18next';

import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { Marker, Polyline, Popup } from 'react-leaflet';

import type { RoadClosure } from '../../hooks/useRoadClosures';

import i18n from '../../i18n';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatRoadClosureInstant, roadClosureReasonLabel } from '../../utils/roadClosureDisplay';

interface RoadClosuresProps {
  closures: RoadClosure[];
  show: boolean;
}

export function RoadClosures({ closures, show }: RoadClosuresProps) {
  const { t } = useTranslation();
  const theme = useSettingsStore((s) => s.theme);

  if (!show || closures.length === 0) return null;

  const lineColor = theme === 'dark' ? '#ef4444' : '#dc2626'; // Tailwind red-500 / red-600

  // Construction icon for point closures (if polyline has no/one point)
  const createConstructionIcon = () =>
    L.divIcon({
      className: '',
      html: `
        <div style="background-color: ${lineColor}; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
      `,
      iconAnchor: [12, 12],
      iconSize: [24, 24],
    });

  return (
    <>
      {closures.map((closure) => {
        // If it's a valid polyline
        if (closure.polyline && closure.polyline.length > 1) {
          return (
            <Polyline
              key={closure.id}
              pathOptions={{
                color: lineColor,
                dashArray: '10, 10', // Dashed line to indicate under construction/closed
                opacity: 0.8,
                weight: 6,
              }}
              positions={closure.polyline}
            >
              <Popup className="road-closure-popup">
                <RoadClosurePopupBody closure={closure} locale={i18n.language} t={t} />
              </Popup>
            </Polyline>
          );
        }

        // If it only has one point, show a marker instead
        if (closure.polyline && closure.polyline.length === 1) {
          const point = closure.polyline[0];
          return (
            <Marker icon={createConstructionIcon()} key={closure.id} position={point}>
              <Popup>
                <RoadClosurePopupBody closure={closure} locale={i18n.language} t={t} />
              </Popup>
            </Marker>
          );
        }

        return null;
      })}
    </>
  );
}

function RoadClosurePopupBody({
  closure,
  locale,
  t,
}: {
  closure: RoadClosure;
  locale: string;
  t: TFunction;
}) {
  const until = formatRoadClosureInstant(closure.endDate, locale);
  const from = formatRoadClosureInstant(closure.startDate, locale);

  return (
    <div className="p-1">
      <h3 className="font-bold text-sm mb-1">{closure.streetName}</h3>
      <div className="text-xs space-y-1">
        <p>
          <strong>{t('roadClosures.reasonLabel')}</strong>{' '}
          {roadClosureReasonLabel(closure.reason, t)}
        </p>
        <p>
          <strong>{t('roadClosures.directionLabel')}</strong>{' '}
          {closure.direction === 'BOTH_DIRECTIONS'
            ? t('roadClosures.bothDirections')
            : closure.direction}
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
