import { useTranslation } from 'react-i18next';

import { extractMapFavouriteSourceId } from '../../../../utils/mapPlaceFavouriteKey';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';
import {
  buildNextbikeMapTooltipSections,
  nextbikeTooltipModelFromClusterProps,
} from './nextbikeStationTooltipSections';

export function NextbikeClusterMapTooltip({
  lat,
  lng,
  properties,
}: {
  lat: number;
  lng: number;
  properties: Record<string, unknown>;
}) {
  const { t } = useTranslation();
  const model = nextbikeTooltipModelFromClusterProps(properties);
  const { description, detail, offset, title } = buildNextbikeMapTooltipSections(model, t);

  return (
    <MapTooltip
      description={description}
      detail={detail}
      headerActions={
        <MapFavouriteStarButton
          lat={lat}
          layerId="nextbikeStations"
          lng={lng}
          sourceId={extractMapFavouriteSourceId('nextbikeStations', properties)}
          title={title}
        />
      }
      offset={offset}
      title={title}
    />
  );
}
