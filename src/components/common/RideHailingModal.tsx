import { CarTaxiFront, MapPin, Navigation, X, Zap } from 'lucide-react';
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
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-base-300/60 backdrop-blur-3xl"
        onClick={onClose}
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm bg-base-100 rounded-[1rem] shadow-2xl overflow-hidden flex flex-col border border-base-200"
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        <div className="p-6 pb-4 flex items-center justify-between border-b border-base-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <CarTaxiFront className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">{t('rideHailing.title')}</h2>
              <p className="text-sm text-base-content/60">{stop.name}</p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-circle btn-sm"
            onClick={onClose}
            title={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-7 border-t border-base-300/50">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-base-content/80">
              {t('rideHailing.question')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-colors ${
                  mode === 'departure'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-base-200 bg-base-200/30 text-base-content/70 hover:bg-base-200 hover:border-base-300'
                }`}
                onClick={() => setMode('departure')}
                type="button"
              >
                <Navigation className="w-6 h-6" />
                <span className="text-sm font-bold">{t('rideHailing.departure')}</span>
                <span className="text-[10px] font-medium opacity-70">
                  {t('rideHailing.fromHere')}
                </span>
              </button>
              <button
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-colors ${
                  mode === 'destination'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-base-200 bg-base-200/30 text-base-content/70 hover:bg-base-200 hover:border-base-300'
                }`}
                onClick={() => setMode('destination')}
                type="button"
              >
                <MapPin className="w-6 h-6" />
                <span className="text-sm font-bold">{t('rideHailing.destination')}</span>
                <span className="text-[10px] font-medium opacity-70">
                  {t('rideHailing.toHere')}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-base-content/80">
              {t('rideHailing.chooseApp')}
            </p>
            <div className="flex flex-col gap-3">
              <a
                className="btn btn-lg w-full flex items-center justify-center gap-3 border-none bg-black hover:bg-black/80 text-white rounded-2xl h-[3.5rem] shadow-lg shadow-black/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                href={links.uber}
                rel="noopener noreferrer"
                target="_blank"
              >
                <div className="bg-white text-black    flex items-center justify-center shrink-0">
                  <svg
                    aria-hidden
                    className="h-5 w-5 shrink-0"
                    fill="currentColor"
                    viewBox="100 100 300 300"
                  >
                    <path d="M414.1 32H33.9C15.2 32 0 47.2 0 65.9V446c0 18.8 15.2 34 33.9 34H414c18.7 0 33.9-15.2 33.9-33.9V65.9C448 47.2 432.8 32 414.1 32zM237.6 391.1C163 398.6 96.4 344.2 88.9 269.6h94.4V290c0 3.7 3 6.8 6.8 6.8H258c3.7 0 6.8-3 6.8-6.8v-67.9c0-3.7-3-6.8-6.8-6.8h-67.9c-3.7 0-6.8 3-6.8 6.8v20.4H88.9c7-69.4 65.4-122.2 135.1-122.2 69.7 0 128.1 52.8 135.1 122.2 7.5 74.5-46.9 141.1-121.5 148.6z" />
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tighter">Uber</span>
              </a>
              <a
                className="btn btn-lg w-full flex items-center justify-center gap-2 border-none bg-[#32c77d] hover:bg-[#2eaa6a] text-white rounded-2xl h-[3.5rem] shadow-lg shadow-[#32c77d]/30 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                href={links.bolt}
                rel="noopener noreferrer"
                target="_blank"
              >
                <div className="bg-white text-[#32c77d] p-0.5 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <span className="text-xl font-bold tracking-tight">Bolt</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
