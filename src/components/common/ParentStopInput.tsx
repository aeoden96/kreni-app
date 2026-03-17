import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X } from 'lucide-react';
import type { Stop } from '../../utils/gtfs';
import { useParentStopSearch } from '../../hooks/useParentStopSearch';

interface ParentStopInputProps {
  stops: Stop[];
  value: Stop | null;
  onChange: (stop: Stop | null) => void;
  placeholder: string;
  autoFocus?: boolean;
}

export function ParentStopInput({
  stops,
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: ParentStopInputProps) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useParentStopSearch(stops, query, 12);

  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value]);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [autoFocus]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, []);

  const showList = useMemo(
    () => open && query.trim().length > 0 && matches.length > 0,
    [open, query, matches.length],
  );

  useLayoutEffect(() => {
    if (!showList || !inputRef.current) {
      setDropdownRect(null);
      return;
    }
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [showList, matches]);

  return (
    <div ref={containerRef} className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          if (value) onChange(null);
        }}
        className="input input-bordered w-full pl-9 pr-9 min-h-[44px] text-sm"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery('');
            onChange(null);
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/80"
          aria-label="Očisti odabir stanice"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {showList &&
        dropdownRect &&
        createPortal(
          <div
            className="fixed z-[3100] rounded-xl border border-base-300 bg-base-100 shadow-lg max-h-64 overflow-y-auto"
            style={{
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
          >
            {matches.map((stop) => (
              <button
                key={stop.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-base-200 transition-colors"
                onClick={() => {
                  onChange(stop);
                  setQuery(stop.name);
                  setOpen(false);
                }}
              >
                {stop.name}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
