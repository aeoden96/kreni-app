import { ArrowUpRight, MapPin, Navigation, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Stop } from '../../utils/gtfs';

import { useRideHailingDeepLinks } from '../../hooks/useRideHailingDeepLinks';

interface RideHailingModalProps {
  isOpen: boolean;
  onClose: () => void;
  stop: Stop;
}

export function RideHailingModal({ isOpen, onClose, stop }: RideHailingModalProps) {
  const { t } = useTranslation();
  const { getLinks } = useRideHailingDeepLinks();
  const [mode, setMode] = useState<'departure' | 'destination'>('departure');

  if (!isOpen) return null;

  const links = getLinks(stop.lat, stop.lon, stop.name, mode);

  return (
    <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
      />

      {/* Modal */}
      <div
        className="relative w-full sm:max-w-sm bg-base-100 rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col border border-base-200"
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-base-content/40 font-medium mb-0.5">
              {stop.name}
            </p>
            <h2 className="text-base font-bold">{t('rideHailing.title')}</h2>
          </div>
          <button
            className="btn btn-ghost btn-circle btn-sm -mr-1 mt-0.5"
            onClick={onClose}
            title={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4">
          {/* Mode: segmented control */}
          <div>
            <p className="text-xs text-base-content/50 mb-2">{t('rideHailing.question')}</p>
            <div className="grid grid-cols-2 bg-base-200 rounded-xl p-1">
              <button
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'departure'
                    ? 'bg-base-100 text-base-content shadow-sm'
                    : 'text-base-content/50 hover:text-base-content/70'
                }`}
                onClick={() => setMode('departure')}
                type="button"
              >
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                {t('rideHailing.departure')}
              </button>
              <button
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'destination'
                    ? 'bg-base-100 text-base-content shadow-sm'
                    : 'text-base-content/50 hover:text-base-content/70'
                }`}
                onClick={() => setMode('destination')}
                type="button"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {t('rideHailing.destination')}
              </button>
            </div>
          </div>

          {/* App links */}
          <div className="space-y-2">
            <p className="text-xs text-base-content/50">{t('rideHailing.chooseApp')}</p>
            <a
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-base-200/50 hover:bg-base-200 border border-base-200 hover:border-base-300 transition-colors group"
              href={links.uber}
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center shrink-0 text-white">
                <svg aria-hidden className="h-4 w-4" fill="currentColor" viewBox="100 100 300 300">
                  <path d="M414.1 32H33.9C15.2 32 0 47.2 0 65.9V446c0 18.8 15.2 34 33.9 34H414c18.7 0 33.9-15.2 33.9-33.9V65.9C448 47.2 432.8 32 414.1 32zM237.6 391.1C163 398.6 96.4 344.2 88.9 269.6h94.4V290c0 3.7 3 6.8 6.8 6.8H258c3.7 0 6.8-3 6.8-6.8v-67.9c0-3.7-3-6.8-6.8-6.8h-67.9c-3.7 0-6.8 3-6.8 6.8v20.4H88.9c7-69.4 65.4-122.2 135.1-122.2 69.7 0 128.1 52.8 135.1 122.2 7.5 74.5-46.9 141.1-121.5 148.6z" />
                </svg>
              </div>
              <span className="font-semibold text-sm flex-1">Uber</span>
              <ArrowUpRight className="w-4 h-4 text-base-content/30 group-hover:text-base-content/60 transition-colors" />
            </a>
            <a
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-base-200/50 hover:bg-base-200 border border-base-200 hover:border-base-300 transition-colors group"
              href={links.bolt}
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className="w-9 h-9 rounded-lg bg-[#32c77d] flex items-center justify-center shrink-0 text-white">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <span className="font-semibold text-sm flex-1">Bolt</span>
              <ArrowUpRight className="w-4 h-4 text-base-content/30 group-hover:text-base-content/60 transition-colors" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
