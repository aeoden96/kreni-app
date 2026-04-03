import { MoreHorizontal, X } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface TransitBottomToolsFabProps {
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

/**
 * Right-anchored control strip for transit map: one trigger expands additional
 * tools to the left (same footprint as a single circle when collapsed).
 */
export function TransitBottomToolsFab({
  children,
  onOpenChange,
  open,
}: TransitBottomToolsFabProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-row-reverse items-center gap-2">
      <button
        aria-expanded={open}
        aria-label={open ? t('gtfs.bottomToolsCollapseAria') : t('gtfs.bottomToolsExpandAria')}
        className="btn btn-circle btn-sm min-h-8 min-w-8 size-8 shrink-0 border-none bg-base-100 p-0 shadow transition-[box-shadow,transform,filter] duration-200 ring-1 ring-base-300/60 hover:ring-primary/55 hover:brightness-110 active:scale-95"
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        {open ? <X className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
      </button>
      {open ? children : null}
    </div>
  );
}
