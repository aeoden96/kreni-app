import type { TFunction } from 'i18next';

import L from 'leaflet';
import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker, Pane, Polyline, Popup } from 'react-leaflet';

import type { RoadClosure } from '../../../../hooks/useRoadClosures';

import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import i18n from '../../../../i18n';
import { useSettingsStore } from '../../../../stores/settingsStore';
import { latLngPolylineIntersectsMapBounds } from '../../../../utils/geoViewportCulling';
import {
  formatRoadClosureInstant,
  roadClosureDirectionLabel,
  roadClosureReasonLabel,
} from '../../../../utils/roadClosureDisplay';

interface RoadClosuresProps {
  closures: RoadClosure[];
  show: boolean;
}

export function RoadClosures({ closures, show }: RoadClosuresProps) {
  const { t } = useTranslation();
  const theme = useSettingsStore((s) => s.theme);
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'driving' });

  const visibleClosures = useMemo(() => {
    if (!shouldRenderDetail) return [];
    return closures.filter((c) => latLngPolylineIntersectsMapBounds(bounds, c.polyline));
  }, [bounds, closures, shouldRenderDetail]);

  if (!show || closures.length === 0) return null;
  if (!shouldRenderDetail) return null;
  if (visibleClosures.length === 0) return null;

  const lineColor = theme === 'dark' ? '#ef4444' : '#dc2626'; // Tailwind red-500 / red-600
  /** Wide invisible stroke over the whole line — the tap hitbox (easy to hit on touch screens). */
  const hitStrokeWeight = 30;
  /**
   * Pane z-index for the closure layer. MUST stay below the Leaflet marker pane (600) and the
   * spiderfier panes (610 / 620) so stop, vehicle and spider-node clicks always win where they
   * overlap a closure. Above overlayPane (400) so async path layers (parking polygons) stay under.
   */
  const closurePaneZ = 450;
  /** Debug: reveal the otherwise-invisible tap hitboxes. Flip to true to make them visible. */
  const showHitboxes = false;
  const hitboxColor = showHitboxes ? '#3b82f6' : lineColor; // blue-500 while debugging
  const hitboxOpacity = showHitboxes ? 0.25 : 0;

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
    <Pane name="zet-road-closures" style={{ zIndex: closurePaneZ }}>
      {visibleClosures.map((closure) => {
        // Valid polyline: visible dashed line (non-interactive) + wide invisible tap hitbox.
        if (closure.polyline && closure.polyline.length > 1) {
          const popup = (
            <Popup className="road-closure-popup" pane="popupPane">
              <RoadClosurePopupBody closure={closure} locale={i18n.language} t={t} />
            </Popup>
          );

          return (
            <Fragment key={closure.id}>
              <Polyline
                interactive={false}
                pathOptions={{
                  color: lineColor,
                  dashArray: '10, 10', // Dashed line to indicate under construction/closed
                  lineCap: 'round',
                  lineJoin: 'round',
                  opacity: 0.85,
                  weight: 7,
                }}
                positions={closure.polyline}
              />
              {/* Tap hitbox: wide stroke covering the whole closure. Invisible in prod
                  (opacity 0); shown faintly while showHitboxes is true. bubblingMouseEvents
                  is off so a tap opens the popup without reaching the map (spider / deselect). */}
              <Polyline
                pathOptions={{
                  bubblingMouseEvents: false,
                  color: hitboxColor,
                  lineCap: 'round',
                  lineJoin: 'round',
                  opacity: hitboxOpacity,
                  weight: hitStrokeWeight,
                }}
                positions={closure.polyline}
              >
                {popup}
              </Polyline>
            </Fragment>
          );
        }

        // If it only has one point, show a marker instead
        if (closure.polyline && closure.polyline.length === 1) {
          const point = closure.polyline[0];
          return (
            <Marker icon={createConstructionIcon()} key={closure.id} position={point}>
              <Popup className="road-closure-popup" pane="popupPane">
                <RoadClosurePopupBody closure={closure} locale={i18n.language} t={t} />
              </Popup>
            </Marker>
          );
        }

        return null;
      })}
    </Pane>
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
          {roadClosureDirectionLabel(closure.direction, t)}
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
