import type { Feature, Point } from 'geojson';

import L from 'leaflet';
import { memo, useEffect, useMemo, useState } from 'react';
import { Marker } from 'react-leaflet';

import { STATIC_DATA_URL } from '../../../../config';
import { useCityPointLayerRegistration } from '../../../../hooks/useCityPointLayerRegistration';
import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import { cachedFetchWithTTL } from '../../../../stores/dataCache';
import {
  parseSportsFacilitiesCsv,
  type SportsFacilityProps,
} from '../../../../utils/csvPointParsers';
import { annotateCityClusterFeatures } from '../../cityPointClusterAnnotate';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';

const URL = `${STATIC_DATA_URL}/sports-facilities-csv`;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface Props {
  show: boolean;
}

export const SportsFacilitiesMap = memo(function SportsFacilitiesMap({ show }: Props) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const [features, setFeatures] = useState<
    Array<{ coordinates: [number, number]; properties: SportsFacilityProps }>
  >([]);

  useEffect(() => {
    if (!show || features.length > 0) return;

    cachedFetchWithTTL(
      URL,
      async () => {
        const response = await fetch(URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch sports facilities CSV (${response.status})`);
        }

        const rawCsv = await response.text();
        const geoJson = parseSportsFacilitiesCsv(rawCsv);

        return geoJson.features
          .map((feature) => {
            const coordinates = (feature.geometry as Point).coordinates;
            if (!coordinates || coordinates.length < 2) return null;
            return {
              coordinates: [coordinates[1], coordinates[0]] as [number, number],
              properties: feature.properties ?? {},
            };
          })
          .filter(
            (item): item is { coordinates: [number, number]; properties: SportsFacilityProps } =>
              item !== null
          );
      },
      ONE_WEEK_MS
    )
      .then((data) => setFeatures(data))
      .catch((error) => console.error('Failed to load sports facilities:', error));
  }, [show, features.length]);

  const visibleFeatures = useMemo(() => {
    if (!shouldRenderDetail) return [];
    const inBounds = features.filter((f) => bounds.contains(f.coordinates));
    const asGeoJson: Feature<Point>[] = inBounds.map(({ coordinates, properties }) => ({
      geometry: {
        coordinates: [coordinates[1], coordinates[0]],
        type: 'Point',
      },
      properties,
      type: 'Feature',
    }));
    return asGeoJson.map((feat) => {
      const [lng, lat] = feat.geometry.coordinates;
      return {
        coordinates: [lat, lng] as [number, number],
        properties: (feat.properties ?? {}) as SportsFacilityProps,
      };
    });
  }, [bounds, features, shouldRenderDetail]);

  const featuresForCluster = useMemo(() => {
    if (!shouldRenderDetail || features.length === 0) return [];
    const asGeoJson: Feature<Point>[] = features.map(({ coordinates, properties }) => ({
      geometry: {
        coordinates: [coordinates[1], coordinates[0]],
        type: 'Point',
      },
      properties,
      type: 'Feature',
    }));
    return annotateCityClusterFeatures(asGeoJson, 'sportsFacilities');
  }, [features, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'sportsFacilities',
    show,
    features.length > 0,
    featuresForCluster
  );

  if (!show || features.length === 0) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  const icon = L.divIcon({
    className: 'sports-facilities-icon',
    html: `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-lime-600 border-2 border-white shadow-lg text-[15px]">🏟️</div>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  });

  return (
    <>
      {visibleFeatures.map(({ coordinates, properties }, index) => {
        const titleStr = properties.naziv || 'Sportski objekt';
        const lat = coordinates[0];
        const lng = coordinates[1];
        return (
          <Marker
            icon={icon}
            key={`${properties.naziv ?? 'sports-facility'}-${index}`}
            position={coordinates}
          >
            <MapTooltip
              description={properties.adresa}
              headerActions={
                <MapFavouriteStarButton
                  lat={lat}
                  layerId="sportsFacilities"
                  lng={lng}
                  title={titleStr}
                />
              }
              keyValues={{
                Kategorija: properties.kategorija,
                Objekt: properties.objekt,
                Opremljenost: properties.opremljenost,
                Sportovi: properties.sportovi,
                Telefon: properties.telefon,
                Upravljač: properties.upravljac,
                Web: properties.web,
              }}
              title={titleStr}
            />
          </Marker>
        );
      })}
    </>
  );
});
