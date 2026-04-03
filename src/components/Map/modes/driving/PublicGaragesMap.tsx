import type { FeatureCollection, Point } from 'geojson';

import L from 'leaflet';
import { memo, useMemo } from 'react';
import { Marker } from 'react-leaflet';

import { useCityPointLayerRegistration } from '../../../../hooks/useCityPointLayerRegistration';
import { useStaticDatasetJson } from '../../../../hooks/useStaticDatasetJson';
import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import { firstNumberProp, firstStringProp } from '../../../../utils/geojsonPropertyPick';
import { geoJsonLngLatInMapBounds } from '../../../../utils/geoViewportCulling';
import { annotateCityClusterFeatures } from '../../cityPointClusterAnnotate';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';

interface PublicGaragesMapProps {
  show: boolean;
}

function fmtInt(n: number | undefined): string | undefined {
  if (n === undefined) return undefined;
  return String(Math.trunc(n));
}

export const PublicGaragesMap = memo(function PublicGaragesMap({ show }: PublicGaragesMapProps) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'driving' });
  const geoData = useStaticDatasetJson<FeatureCollection<Point>>('public-garages.geojson', show, {
    logErrorLabel: 'public garages',
    ttlMs: null,
    useDataFetch: true,
  });

  const visibleFeatures = useMemo(() => {
    if (!geoData || !shouldRenderDetail) return [];
    const raw = geoData.features.filter((feature) => {
      const coords = (feature.geometry as Point).coordinates;
      return (
        coords && coords.length >= 2 && geoJsonLngLatInMapBounds(bounds, [coords[0], coords[1]])
      );
    });
    return raw;
  }, [bounds, geoData, shouldRenderDetail]);

  const featuresForCluster = useMemo(() => {
    if (!geoData || !shouldRenderDetail) return [];
    const valid = geoData.features.filter((f) => {
      const coords = (f.geometry as Point).coordinates;
      return coords && coords.length >= 2;
    });
    return annotateCityClusterFeatures(valid, 'publicGarages');
  }, [geoData, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'publicGarages',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  if (!show || !geoData) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  const icon = L.divIcon({
    className: 'public-garage-icon',
    html: `
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg text-white font-bold text-lg">
                P
            </div>
        `,
    iconAnchor: [16, 16],
    iconSize: [32, 32],
  });

  return (
    <>
      {visibleFeatures.map((feature) => {
        const coords = (feature.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const p = feature.properties ?? {};
        const key = firstStringProp(p, ['id', 'OBJECTID']) ?? `${coords[0]}-${coords[1]}`;
        const titleStr = firstStringProp(p, ['naziv', 'NAZIV']) || 'Javna garaža';
        const sourceId = firstStringProp(p, ['id', 'OBJECTID']);
        return (
          <Marker icon={icon} key={key} position={[coords[1], coords[0]]}>
            <MapTooltip
              className="custom-tooltip shadow-lg"
              description={firstStringProp(p, ['adresa', 'ADRESA'])}
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="publicGarages"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={titleStr}
                />
              }
              keyValues={{
                'Broj etaža': fmtInt(firstNumberProp(p, ['br_etaza'])),
                'Invalidska mjesta': fmtInt(firstNumberProp(p, ['invalidska_mj'])),
                Kapacitet: fmtInt(firstNumberProp(p, ['kapacitet', 'Kapacitet'])),
                Korisnici: firstStringProp(p, ['korisnici']),
                'Mjesta za hibrid': fmtInt(firstNumberProp(p, ['mj_za_hibrid_voz'])),
                'Obiteljska mjesta': fmtInt(firstNumberProp(p, ['obiteljska_mj'])),
                'Parkiralište za bicikle': fmtInt(firstNumberProp(p, ['parkiraliste_za_bic'])),
                'Površina (m²)': fmtInt(firstNumberProp(p, ['uk_povr_m2'])),
                'Punjači (EV)': fmtInt(firstNumberProp(p, ['punionica_za_EV'])),
                Telefon: firstStringProp(p, ['telefon', 'Telefon']),
                Vlasništvo: firstStringProp(p, ['vlasnistvo']),
              }}
              offset={[0, -16]}
              title={titleStr}
            />
          </Marker>
        );
      })}
    </>
  );
});
