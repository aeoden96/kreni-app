import {
  Building2,
  Camera,
  CarFront,
  Construction,
  Flame,
  Layers,
  MapPin,
  Zap,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../../../../stores/settingsStore';
import {
  LayerQuickToggleGrid,
  LayersBadge,
  LayersPanelShell,
  LayerToggleRow,
  MapControlBadgesRow,
  SavedPlacesMapBadge,
} from '../LayerPanelShared';
import { MapSavedPlacesPanelDialog } from '../MapSavedPlacesPanelDialog';

const WARNING_THRESHOLD = 2;

type MapChromePanel = 'closed' | 'layers' | 'saved';

/** Pinned 2×2 quick toggles; remainder in the list below. */
const DRIVING_QUICK_LAYER_IDS = [
  'parking_zones',
  'garages',
  'ev_chargers',
  'gas_stations',
] as const;

type DrivingLayersPanelProps = {
  onOpenChange?: (open: boolean) => void;
};

type LayerToggle = {
  active: boolean;
  description: string;
  icon: ReactNode;
  id: string;
  label: string;
  set: (value: boolean) => void;
};

type PanelProps = {
  activeCount: number;
  isOpen: boolean;
  onClose: () => void;
};

export function DrivingLayersPanel({ onOpenChange }: DrivingLayersPanelProps) {
  const {
    showElectricCharging,
    showGasStations,
    showParkingZones,
    showPublicGarages,
    showRoadClosures,
    showSurveillanceCameras,
    showTaxiStands,
  } = useSettingsStore();
  const [chrome, setChrome] = useState<MapChromePanel>('closed');
  const { t } = useTranslation();
  const savedCount = useSettingsStore((s) => s.mapPlaceFavouritesDriving.length);

  const activeCount = [
    showParkingZones,
    showPublicGarages,
    showElectricCharging,
    showGasStations,
    showTaxiStands,
    showSurveillanceCameras,
    showRoadClosures,
  ].filter(Boolean).length;

  useEffect(() => {
    onOpenChange?.(chrome !== 'closed');
  }, [chrome, onOpenChange]);

  return (
    <>
      <MapControlBadgesRow>
        <LayersBadge
          activeCount={activeCount}
          badgeCountClassName="bg-orange-500"
          badgeId="driving-layers-badge"
          icon={<Layers className="w-4 h-4 shrink-0" />}
          label={t('drivingLayers.badge')}
          onClick={() => setChrome((p) => (p === 'layers' ? 'closed' : 'layers'))}
        />
        <SavedPlacesMapBadge
          badgeCountClassName="bg-orange-500"
          badgeId="driving-saved-places-badge"
          count={savedCount}
          label={t('mapSavedPlaces.badge')}
          onClick={() => setChrome((p) => (p === 'saved' ? 'closed' : 'saved'))}
        />
      </MapControlBadgesRow>
      <DrivingLayersPanelContent
        activeCount={activeCount}
        isOpen={chrome === 'layers'}
        onClose={() => setChrome('closed')}
      />
      <MapSavedPlacesPanelDialog
        headerIconClassName="text-rose-500"
        isOpen={chrome === 'saved'}
        onClose={() => setChrome('closed')}
        scope="driving"
      />
    </>
  );
}

function DrivingLayersPanelContent({ activeCount, isOpen, onClose }: PanelProps) {
  const { t } = useTranslation();
  const {
    setShowElectricCharging,
    setShowGasStations,
    setShowParkingZones,
    setShowPublicGarages,
    setShowRoadClosures,
    setShowSurveillanceCameras,
    setShowTaxiStands,
    showElectricCharging,
    showGasStations,
    showParkingZones,
    showPublicGarages,
    showRoadClosures,
    showSurveillanceCameras,
    showTaxiStands,
  } = useSettingsStore();

  const items: LayerToggle[] = [
    {
      active: showParkingZones,
      description: t('drivingLayers.zones.desc'),
      icon: <CarFront className="w-5 h-5 text-orange-400" />,
      id: 'parking_zones',
      label: t('drivingLayers.zones.label'),
      set: setShowParkingZones,
    },
    {
      active: showPublicGarages,
      description: t('drivingLayers.garages.desc'),
      icon: <Building2 className="w-4 h-4 text-amber-400" />,
      id: 'garages',
      label: t('drivingLayers.garages.label'),
      set: setShowPublicGarages,
    },
    {
      active: showElectricCharging,
      description: t('drivingLayers.ev.desc'),
      icon: <Zap className="w-4 h-4 text-lime-400" />,
      id: 'ev_chargers',
      label: t('drivingLayers.ev.label'),
      set: setShowElectricCharging,
    },
    {
      active: showGasStations,
      description: t('drivingLayers.gasStations.desc'),
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      id: 'gas_stations',
      label: t('drivingLayers.gasStations.label'),
      set: setShowGasStations,
    },
    {
      active: showTaxiStands,
      description: t('drivingLayers.taxi.desc'),
      icon: <MapPin className="w-4 h-4 text-yellow-400" />,
      id: 'taxi_stands',
      label: t('drivingLayers.taxi.label'),
      set: setShowTaxiStands,
    },
    {
      active: showSurveillanceCameras,
      description: t('drivingLayers.cameras.desc'),
      icon: <Camera className="w-4 h-4 text-slate-400" />,
      id: 'surveillance_cameras',
      label: t('drivingLayers.cameras.label'),
      set: setShowSurveillanceCameras,
    },
    {
      active: showRoadClosures,
      description: t('drivingLayers.roadClosures.desc'),
      icon: <Construction className="w-4 h-4 text-red-400" />,
      id: 'road_closures',
      label: t('drivingLayers.roadClosures.label'),
      set: setShowRoadClosures,
    },
  ];

  function handleResetAll() {
    setShowParkingZones(false);
    setShowPublicGarages(false);
    setShowElectricCharging(false);
    setShowGasStations(false);
    setShowTaxiStands(false);
    setShowSurveillanceCameras(false);
    setShowRoadClosures(false);
  }

  if (!isOpen) return null;

  const quickIdSet = new Set<string>(DRIVING_QUICK_LAYER_IDS);
  const quickItems = DRIVING_QUICK_LAYER_IDS.map((id) => items.find((i) => i.id === id)).filter(
    (x): x is LayerToggle => x != null
  );
  const listItems = items.filter((i) => !quickIdSet.has(i.id));

  const quickGridItems = quickItems.map((item) =>
    item.id === 'parking_zones'
      ? {
          ...item,
          tileExtraClassName:
            'ring-1 ring-orange-400/45 dark:ring-orange-400/40 border-orange-300/40 dark:border-orange-400/30',
        }
      : item
  );

  return (
    <LayersPanelShell
      activeCount={activeCount}
      closeLabel={t('common.close')}
      headerIcon={<Layers className="w-4 h-4 text-orange-400" />}
      onClose={onClose}
      onReset={handleResetAll}
      panelLabel={t('drivingLayers.panelTitle')}
      resetLabel={t('drivingLayers.resetAll')}
      warningDescription={t('drivingLayers.tooManyDesc')}
      warningThreshold={WARNING_THRESHOLD}
      warningTitle={t('drivingLayers.tooManyTitle')}
    >
      <div className="city-layers-panel-body py-1">
        <LayerQuickToggleGrid
          accentActiveClassName="dark:bg-orange-500/16 bg-orange-500/11 border border-orange-400/45 dark:border-orange-400/38 ring-1 ring-orange-400/28 dark:ring-orange-400/22"
          inputIdPrefix="driving-layer-quick"
          items={quickGridItems}
          toggleClassName="city-layer-toggle city-layer-toggle--driving"
        />
        <div className="py-1">
          <div className="text-[10px] font-extrabold tracking-[0.1em] uppercase px-4 pb-1 pt-1.5 dark:text-orange-300/80 text-orange-700/75">
            {t('drivingLayers.moreLayers')}
          </div>
          <div className="flex flex-col">
            {listItems.map((item) => (
              <LayerRow key={item.id} {...item} />
            ))}
          </div>
        </div>
      </div>
    </LayersPanelShell>
  );
}

function LayerRow({ active, description, icon, id, label, set }: LayerToggle) {
  return (
    <LayerToggleRow
      active={active}
      description={description}
      icon={icon}
      id={id}
      inputIdPrefix="driving-layer-toggle"
      label={label}
      set={set}
    />
  );
}
