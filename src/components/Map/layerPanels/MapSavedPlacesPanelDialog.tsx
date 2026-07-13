import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { BajsStation } from '../../../hooks/useNextbikeData';
import type { MapFavouriteScope } from '../../../types/mapPlaceFavourite';

import { MapSavedPlacesTab } from '../MapSavedPlacesTab';
import { LayersPanelShell } from './LayerPanelShared';

type Props = {
  headerIconClassName: string;
  isOpen: boolean;
  nextbikeStations?: BajsStation[];
  onClose: () => void;
  scope: MapFavouriteScope;
};

export function MapSavedPlacesPanelDialog({
  headerIconClassName,
  isOpen,
  nextbikeStations,
  onClose,
  scope,
}: Props) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <LayersPanelShell
      activeCount={0}
      blurBackground={false}
      closeLabel={t('common.close')}
      headerIcon={<Heart className={`w-4 h-4 ${headerIconClassName}`} />}
      onClose={onClose}
      onReset={() => {}}
      panelLabel={t('mapSavedPlaces.panelTitle')}
      resetLabel={t('common.close')}
    >
      <MapSavedPlacesTab nextbikeStations={nextbikeStations} scope={scope} />
    </LayersPanelShell>
  );
}
