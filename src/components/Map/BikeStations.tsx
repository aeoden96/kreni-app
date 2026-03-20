import { memo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { BajsStation } from '../../hooks/useNextbikeData';

interface BikeStationsProps {
    show: boolean;
    stations: BajsStation[];
}

export const BikeStations = memo(function BikeStations({ show, stations }: BikeStationsProps) {
    if (!show || !stations.length) return null;

    return (
        <>
            {stations.map((station) => {
                const isAvailable = station.bikes > 0;
                const iconHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full shadow-md text-white font-bold text-[10px] transition-all"
               style="background-color: ${isAvailable ? '#0ea5e9' : '#94a3b8'}; border: 2px solid white;">
            ${station.bikes}
          </div>
        `;

                const icon = L.divIcon({
                    html: iconHtml,
                    className: 'bajs-station-icon',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                });

                return (
                    <Marker
                        key={station.uid}
                        position={[station.lat, station.lng]}
                        icon={icon}
                        zIndexOffset={500}
                    >
                        <Tooltip direction="top" offset={[0, -12]} className="custom-tooltip shadow-lg">
                            <div className="text-sm font-semibold mb-1">{station.name}</div>
                            <div className="flex gap-4 text-xs text-base-content/80">
                                <div>
                                    <span className="font-bold text-info">{station.bikes_available_to_rent}</span>
                                    <span className="ml-1">bicikala</span>
                                </div>
                                <div>
                                    <span className="font-bold text-success">{station.free_racks}</span>
                                    <span className="ml-1">mjesta</span>
                                </div>
                            </div>
                            {station.maintenance && (
                                <div className="text-xs text-warning mt-1 italic">
                                    Stanica u održavanju
                                </div>
                            )}
                        </Tooltip>
                    </Marker>
                );
            })}
        </>
    );
});
