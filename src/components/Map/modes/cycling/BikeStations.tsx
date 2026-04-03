import type { Feature, Point } from 'geojson';

import L from 'leaflet';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Marker } from 'react-leaflet';

import type { BajsStation } from '../../../../hooks/useNextbikeData';

import { useCityPointLayerRegistration } from '../../../../hooks/useCityPointLayerRegistration';
import { useSettingsStore } from '../../../../stores/settingsStore';
import { NEXTBIKE_BRAND_HEX } from '../../../../utils/nextbikeAppLinks';
import { annotateCityClusterFeatures } from '../../cityPointClusterAnnotate';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';
import {
  buildNextbikeMapTooltipSections,
  nextbikeTooltipModelFromStation,
} from './nextbikeStationTooltipSections';

interface BikeStationsProps {
  show: boolean;
  stations: BajsStation[];
}

export const BikeStations = memo(function BikeStations({ show, stations }: BikeStationsProps) {
  const { t } = useTranslation();
  const mapPlaceFavouritesCycling = useSettingsStore((s) => s.mapPlaceFavouritesCycling);

  const rawFeatures = useMemo((): Feature<Point>[] => {
    return stations.map((s) => {
      const isFavourite = mapPlaceFavouritesCycling.some(
        (f) => f.layerId === 'nextbikeStations' && f.sourceId === String(s.uid)
      );
      return {
        geometry: { coordinates: [s.lng, s.lat], type: 'Point' },
        properties: {
          _isFavourite: isFavourite,
          bike_types_json: JSON.stringify(s.bike_types ?? {}),
          bikes: s.bikes,
          maintenance: s.maintenance,
          name: s.name,
          place_number: s.place_number ?? null,
          uid: s.uid,
        },
        type: 'Feature',
      };
    });
  }, [mapPlaceFavouritesCycling, stations]);

  const featuresForCluster = useMemo(
    () => annotateCityClusterFeatures(rawFeatures, 'nextbikeStations'),
    [rawFeatures]
  );

  const useCluster = useCityPointLayerRegistration(
    'nextbikeStations',
    show,
    stations.length > 0,
    featuresForCluster
  );

  if (!show || !stations.length) return null;
  if (useCluster) return null;

  return (
    <>
      {stations.map((station) => {
        const isAvailable = station.bikes > 0;
        const isFav = mapPlaceFavouritesCycling.some(
          (f) => f.layerId === 'nextbikeStations' && f.sourceId === String(station.uid)
        );
        const favRing = isFav ? 'box-shadow: 0 0 0 2px #fbbf24, 0 2px 6px rgba(0,0,0,0.25);' : '';
        const iconHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full shadow-md text-white font-bold text-[10px] transition-all"
               style="background-color: ${isAvailable ? NEXTBIKE_BRAND_HEX : '#94a3b8'}; border: 2px solid white; ${favRing}">
            ${station.bikes}
          </div>
        `;

        const icon = L.divIcon({
          className: 'bajs-station-icon',
          html: iconHtml,
          iconAnchor: [12, 12],
          iconSize: [24, 24],
        });

        const model = nextbikeTooltipModelFromStation(station);
        const { description, detail, offset, title } = buildNextbikeMapTooltipSections(model, t);

        return (
          <Marker
            icon={icon}
            key={station.uid}
            position={[station.lat, station.lng]}
            zIndexOffset={500}
          >
            <MapTooltip
              description={description}
              detail={detail}
              headerActions={
                <MapFavouriteStarButton
                  lat={station.lat}
                  layerId="nextbikeStations"
                  lng={station.lng}
                  sourceId={String(station.uid)}
                  title={station.name}
                />
              }
              offset={offset}
              title={title}
            />
          </Marker>
        );
      })}
    </>
  );
});
