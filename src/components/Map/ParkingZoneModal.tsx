import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useState } from 'react';

import type { ParkingZoneProperties, SubzoneInfo, ZoneInfo } from '../../types/parkingZones';

interface ParkingZoneModalProps {
  onClose: () => void;
  zone: ParkingZoneProperties;
  zoneInfo: Record<string, ZoneInfo>;
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'] as const;

export function ParkingZoneModal({ onClose, zone, zoneInfo }: ParkingZoneModalProps) {
  const [isStreetsOpen, setIsStreetsOpen] = useState(false);
  const info = zoneInfo[String(zone.zone)];
  if (!info) return null;

  // Use subzone-specific info if available
  const subInfo: null | SubzoneInfo =
    zone.subzone && info.subzones[zone.subzone] ? info.subzones[zone.subzone] : null;

  const displayInfo = subInfo ?? info;
  const sms = subInfo?.sms ?? info.sms;

  return (
    // Compact floating card — no backdrop, map stays interactive
    <div
      className="fixed bottom-0 left-0 right-0 sm:bottom-4 sm:left-4 sm:right-auto sm:w-80 z-[1050] bg-base-100 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[60vh] sm:max-h-[70vh]"
      style={{ animation: 'modal-fade-in 0.2s ease-out', borderTop: `3px solid ${zone.color}` }}
    >
      {/* Header */}
      <div className="p-3 border-b border-base-300 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-black tracking-wider px-2.5 py-1 rounded-full text-black/80 flex-shrink-0"
            style={{ backgroundColor: zone.color }}
          >
            {ROMAN[zone.zone]}. ZONA
          </span>
          {zone.subzone && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-base-300 text-base-content/70 flex-shrink-0">
              {zone.subzone}
            </span>
          )}
          <h2 className="text-sm font-bold flex-1 text-base-content leading-tight">{zone.block}</h2>
          <button className="btn btn-ghost btn-circle btn-xs flex-shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 p-3 space-y-3">
        {/* SMS */}
        {sms && (
          <div className="flex items-center gap-3 px-3 py-2 bg-base-200/60 rounded-lg">
            <span className="text-base-content/50 text-xs">SMS</span>
            <a
              className="font-mono font-bold text-base-content text-base tracking-widest hover:underline"
              href={`sms:${sms}`}
            >
              {sms}
            </a>
          </div>
        )}

        {/* Enforcement hours */}
        <div className="rounded-lg overflow-hidden border border-base-300">
          <div className="px-3 py-1.5 bg-base-200/60 text-[10px] font-bold uppercase tracking-wider text-base-content/50">
            Naplata
          </div>
          <div className="divide-y divide-base-300">
            {displayInfo.enforcement.weekday && (
              <div className="flex justify-between items-center px-3 py-2">
                <span className="text-xs text-base-content/70">Pon – Pet</span>
                <span className="text-xs font-semibold text-base-content">
                  {displayInfo.enforcement.weekday}
                </span>
              </div>
            )}
            {displayInfo.enforcement.saturday && (
              <div className="flex justify-between items-center px-3 py-2">
                <span className="text-xs text-base-content/70">Subota</span>
                <span className="text-xs font-semibold text-base-content">
                  {displayInfo.enforcement.saturday}
                </span>
              </div>
            )}
            {displayInfo.enforcement.sunday && (
              <div className="flex justify-between items-center px-3 py-2">
                <span className="text-xs text-base-content/70">Nedjelja / praznik</span>
                <span className="text-xs font-semibold text-base-content">
                  {displayInfo.enforcement.sunday}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Max parking time + Prices — side by side if both present */}
        <div className="grid grid-cols-2 gap-2">
          {displayInfo.maxTime && (
            <div className="rounded-lg overflow-hidden border border-base-300">
              <div className="px-2 py-1.5 bg-base-200/60 text-[10px] font-bold uppercase tracking-wider text-base-content/50">
                Maks. parkiranje
              </div>
              <div className="px-2 py-2">
                <span className="text-xs font-semibold text-base-content">
                  {displayInfo.maxTime}
                </span>
              </div>
            </div>
          )}

          {displayInfo.prices.length > 0 && (
            <div
              className={`rounded-lg overflow-hidden border border-base-300 ${!displayInfo.maxTime ? 'col-span-2' : ''}`}
            >
              <div className="px-2 py-1.5 bg-base-200/60 text-[10px] font-bold uppercase tracking-wider text-base-content/50">
                Cijena karte
              </div>
              <div className="divide-y divide-base-300">
                {displayInfo.prices.map((p, i) => (
                  <div className="flex justify-between items-center px-2 py-1.5" key={i}>
                    <span className="text-xs text-base-content/70">{p.unit}</span>
                    <span className="text-xs font-bold text-base-content">{p.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Collapsible streets list */}
        {zone.streets.length > 0 && (
          <div className="rounded-lg overflow-hidden border border-base-300">
            <button
              className="w-full px-3 py-2 bg-base-200/60 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-base-content/50 hover:bg-base-200 transition-colors"
              onClick={() => setIsStreetsOpen((o) => !o)}
            >
              <span>Granica bloka ({zone.streets.length})</span>
              {isStreetsOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
            {isStreetsOpen && (
              <ul className="divide-y divide-base-300 max-h-48 overflow-y-auto">
                {zone.streets.map((street, i) => (
                  <li className="px-3 py-1.5 text-xs text-base-content/70" key={i}>
                    {street}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
