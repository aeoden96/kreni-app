import { MapPin } from 'lucide-react';
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import type { Stop } from '../../../utils/gtfs';

interface StopDropdownProps {
  hasMore: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isOpen: boolean;
  onSelect: (stop: Stop) => void;
  stops: Stop[];
}

export function StopDropdown({ hasMore, inputRef, isOpen, onSelect, stops }: StopDropdownProps) {
  const { t } = useTranslation();
  const [dropdownRect, setDropdownRect] = useState<null | {
    left: number;
    top: number;
    width: number;
  }>(null);

  useLayoutEffect(() => {
    if (!isOpen || !inputRef.current) {
      setDropdownRect(null);
      return;
    }
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownRect({ left: rect.left, top: rect.bottom + 4, width: rect.width });
  }, [isOpen, stops, inputRef]);

  if (!isOpen || !dropdownRect) return null;

  return createPortal(
    <div
      className="fixed z-[3100] rounded-xl border border-base-300 bg-base-100 shadow-lg overflow-y-auto"
      style={{
        left: dropdownRect.left,
        maxHeight: '240px',
        top: dropdownRect.top,
        width: dropdownRect.width,
      }}
    >
      {stops.length === 0 ? (
        <p className="px-4 py-3 text-sm text-center text-base-content/50">
          {t('search.emptyNoResults')}
        </p>
      ) : (
        <>
          {stops.map((stop) => (
            <button
              className="w-full flex items-center gap-3 py-3 px-4 text-left hover:bg-base-200 active:bg-base-300 transition-colors min-h-[52px]"
              key={stop.id}
              onClick={() => onSelect(stop)}
              type="button"
            >
              <MapPin className="w-4 h-4 text-base-content/40 shrink-0" />
              <span className="text-sm font-medium">{stop.name}</span>
            </button>
          ))}
          {hasMore && (
            <p className="px-4 py-2 text-xs text-base-content/50 text-center">
              {t('search.listFirst20Hint')}
            </p>
          )}
        </>
      )}
    </div>,
    document.body
  );
}
