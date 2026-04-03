import { AlertTriangle, Heart, RotateCcw, X } from 'lucide-react';
import { type ReactNode, useTransition } from 'react';

type LayerQuickToggleGridProps = {
  /** Tailwind classes applied when `active` (border/background). */
  accentActiveClassName: string;
  inputIdPrefix: string;
  items: LayerQuickToggleItem[];
  /** When omitted, no section heading is shown above the grid. */
  sectionLabel?: string;
  /** Overrides default muted label styling (e.g. purple/orange to match panel). */
  sectionLabelClassName?: string;
  /** Defaults to `city-layer-toggle`. Use `city-layer-toggle city-layer-toggle--driving` for orange switch. */
  toggleClassName?: string;
};

type LayerQuickToggleItem = {
  active: boolean;
  description?: string;
  icon: ReactNode;
  id: string;
  label: string;
  set: (value: boolean) => void;
  /** Merged onto the tile (e.g. primary layer emphasis). */
  tileExtraClassName?: string;
};

type LayersBadgeProps = {
  activeCount: number;
  badgeCountClassName: string;
  badgeId: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

type LayersPanelShellProps = {
  activeCount: number;
  /** When false, scrim and panel skip backdrop blur (e.g. saved places). Default true. */
  blurBackground?: boolean;
  children: ReactNode;
  closeLabel: string;
  headerAccessory?: ReactNode;
  headerIcon: ReactNode;
  onClose: () => void;
  onReset: () => void;
  panelLabel: string;
  resetLabel: string;
  warningDescription?: string;
  warningThreshold?: number;
  warningTitle?: string;
};

type LayerToggleRowProps = {
  active: boolean;
  description: string;
  descriptionClassName?: string;
  icon: ReactNode;
  iconWrapperClassName?: string;
  id: string;
  inputIdPrefix?: string;
  label: string;
  labelClassName?: string;
  rowClassName?: string;
  set: (value: boolean) => void;
};

/** Top-left row: place [LayersBadge] and [SavedPlacesMapBadge] side by side. */
export function MapControlBadgesRow({ children }: { children: ReactNode }) {
  return (
    <div className="absolute left-3 top-3 z-[800] flex items-center gap-2 flex-wrap max-w-[calc(100vw-1.5rem)]">
      {children}
    </div>
  );
}

const DEFAULT_ROW_CLASSNAME =
  'flex items-center gap-3 px-4 py-[9px] cursor-pointer select-none transition-colors duration-[120ms] dark:hover:bg-white/[0.04] hover:bg-black/[0.04]';
const DEFAULT_ICON_WRAPPER_CLASSNAME =
  'flex items-center justify-center w-7 h-7 rounded-lg shrink-0 dark:bg-white/[0.07] bg-black/[0.05]';
const DEFAULT_LABEL_CLASSNAME =
  'text-[13px] font-semibold truncate dark:text-white/90 text-black/85';
const DEFAULT_DESCRIPTION_CLASSNAME =
  'text-[11px] leading-[1.4] line-clamp-2 dark:text-white/40 text-black/45';

/** Shared glass pill for top-left map badges (layers + saved). */
const mapLayerBadgeButtonClass =
  'flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/10 backdrop-blur-md cursor-pointer will-change-transform transition-transform duration-200 hover:scale-[1.04] active:scale-[0.96] dark:bg-[rgba(30,30,40,0.88)] dark:text-white/85 dark:shadow-[0_4px_20px_rgba(0,0,0,0.45),0_1px_4px_rgba(0,0,0,0.3)] bg-[rgba(255,255,255,0.88)] text-black/80 shadow-[0_4px_20px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.06)] shrink-0';

type SavedPlacesMapBadgeProps = {
  badgeCountClassName: string;
  badgeId: string;
  count: number;
  label: string;
  onClick: () => void;
};

export function LayersBadge({
  activeCount,
  badgeCountClassName,
  badgeId,
  icon,
  label,
  onClick,
}: LayersBadgeProps) {
  return (
    <button
      className={mapLayerBadgeButtonClass}
      id={badgeId}
      onClick={onClick}
      style={{ animation: 'spider-reveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
      type="button"
    >
      {icon}
      <span className="text-[11px] font-extrabold tracking-[0.08em] uppercase whitespace-nowrap">
        {label}
      </span>
      {activeCount > 0 && (
        <span
          className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] rounded-full text-[10px] font-extrabold text-white leading-none ${badgeCountClassName}`}
        >
          {activeCount}
        </span>
      )}
    </button>
  );
}

export function LayersPanelShell({
  activeCount,
  blurBackground = true,
  children,
  closeLabel,
  headerAccessory,
  headerIcon,
  onClose,
  onReset,
  panelLabel,
  resetLabel,
  warningDescription,
  warningThreshold,
  warningTitle,
}: LayersPanelShellProps) {
  return (
    <>
      <div
        aria-hidden
        className={[
          'fixed inset-0 z-[1180] bg-black/35 sm:hidden',
          blurBackground ? 'backdrop-blur-[2px]' : '',
        ].join(' ')}
        onClick={onClose}
      />

      <div
        aria-label={panelLabel}
        className={[
          'fixed z-[1190] left-0 right-0 bottom-0 w-full',
          'sm:absolute sm:left-3 sm:top-14 sm:right-auto sm:bottom-auto sm:w-[340px]',
          'rounded-t-[20px] sm:rounded-[20px]',
          'max-h-[82dvh] sm:max-h-[78dvh]',
          'flex flex-col overflow-hidden',
          blurBackground ? 'backdrop-blur-xl' : '',
          'border border-white/10',
          'dark:bg-[rgba(18,18,28)] dark:shadow-[0_-4px_40px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)]',
          'bg-[rgba(250,250,255,0.95)] shadow-[0_-4px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.06)]',
          'animate-[city-panel-slide-up_0.35s_cubic-bezier(0.34,1.4,0.64,1)_both]',
          'sm:animate-[city-panel-slide-down_0.35s_cubic-bezier(0.34,1.4,0.64,1)_both]',
        ].join(' ')}
        role="dialog"
      >
        <div className="flex items-center justify-between px-4 pt-[14px] pb-[10px] shrink-0 border-b border-black/[0.08] dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            {headerIcon}
            <span className="text-[13px] font-extrabold tracking-[0.06em] uppercase dark:text-white/90 text-black/80">
              {panelLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {activeCount > 0 && (
              <button
                aria-label={resetLabel}
                className="flex items-center gap-[5px] px-[10px] py-[5px] rounded-full border text-[12px] font-medium cursor-pointer transition-all duration-[180ms] dark:bg-white/[0.06] dark:border-white/10 dark:text-white/55 dark:hover:bg-white/10 dark:hover:border-white/[0.18] dark:hover:text-white/85 bg-black/[0.05] border-black/10 text-black/45 hover:bg-black/[0.08] hover:border-black/[0.16] hover:text-black/70"
                onClick={onReset}
                title={resetLabel}
                type="button"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden [@media(min-width:360px)]:inline">{resetLabel}</span>
              </button>
            )}
            <button
              aria-label={closeLabel}
              className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer transition-all duration-150 dark:bg-white/[0.08] dark:text-white/60 dark:hover:bg-white/[0.14] dark:hover:text-white hover:scale-110 bg-black/[0.06] text-black/50 hover:bg-black/10 hover:text-black"
              onClick={onClose}
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {headerAccessory ? <div className="px-4 pb-2 shrink-0">{headerAccessory}</div> : null}

        {warningThreshold !== undefined &&
          warningTitle &&
          warningDescription &&
          activeCount > warningThreshold && (
            <div
              className="flex items-start gap-[10px] mx-[10px] mt-[10px] mb-[2px] px-3 py-[10px] rounded-[14px] border dark:bg-amber-400/[0.08] dark:border-amber-400/20 bg-amber-600/[0.07] border-amber-600/20 [animation:city-layers-fade-in_0.3s_ease_both]"
              role="status"
            >
              <AlertTriangle className="w-[15px] h-[15px] shrink-0 mt-px text-amber-400" />
              <div className="flex flex-col gap-px text-[12px] leading-[1.45] dark:text-white/85 text-black/75">
                <strong className="font-semibold text-[12px] text-amber-400">{warningTitle}</strong>
                <span>{warningDescription}</span>
              </div>
            </div>
          )}

        {children}
      </div>
    </>
  );
}

/** Heart pill next to [LayersBadge]; opens saved-places dialog from parent. */
export function SavedPlacesMapBadge({
  badgeCountClassName,
  badgeId,
  count,
  label,
  onClick,
}: SavedPlacesMapBadgeProps) {
  const hasSaved = count > 0;
  const compactClass = mapLayerBadgeButtonClass.replace('gap-1.5 px-3.5', 'gap-1 px-2.5');
  return (
    <button
      aria-label={label}
      className={compactClass}
      id={badgeId}
      onClick={onClick}
      style={{ animation: 'spider-reveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
      title={label}
      type="button"
    >
      <Heart
        className={[
          'w-4 h-4 shrink-0 transition-colors',
          hasSaved ? 'fill-rose-500 text-rose-500' : 'text-rose-400/80 dark:text-rose-300/70',
        ].join(' ')}
      />
      {count > 0 ? (
        <span
          className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-[5px] rounded-full text-[10px] font-extrabold text-white leading-none ${badgeCountClassName}`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

const QUICK_TILE_BASE_INACTIVE =
  'border border-black/[0.1] dark:border-white/[0.12] bg-black/[0.02] dark:bg-white/[0.04]';
const QUICK_ICON_WRAP =
  'flex items-center justify-center w-10 h-10 rounded-xl shrink-0 dark:bg-white/[0.08] bg-black/[0.06]';

function LayerQuickToggleTile({
  accentActiveClassName,
  inputIdPrefix,
  item,
  toggleClassName,
}: {
  accentActiveClassName: string;
  inputIdPrefix: string;
  item: LayerQuickToggleItem;
  toggleClassName: string;
}) {
  const [, startTransition] = useTransition();
  const inputId = `${inputIdPrefix}-${item.id}`;
  const { active, description, icon, label, set, tileExtraClassName } = item;

  return (
    <label
      className={[
        'relative flex flex-col gap-2 min-h-[92px] p-3 rounded-2xl cursor-pointer select-none transition-colors duration-[120ms]',
        active ? accentActiveClassName : QUICK_TILE_BASE_INACTIVE,
        'dark:hover:bg-white/[0.06] hover:bg-black/[0.05]',
        tileExtraClassName ?? '',
      ].join(' ')}
      htmlFor={inputId}
      title={description}
    >
      <div className="flex items-start justify-between gap-2 min-h-0">
        <div className={QUICK_ICON_WRAP}>{icon}</div>
        <input
          aria-label={label}
          checked={active}
          className={toggleClassName}
          id={inputId}
          onChange={() => startTransition(() => set(!active))}
          type="checkbox"
        />
      </div>
      <span className="text-[12px] font-semibold leading-snug line-clamp-2 dark:text-white/90 text-black/85 pr-1">
        {label}
      </span>
    </label>
  );
}

const QUICK_SECTION_LABEL_DEFAULT =
  'text-[10px] font-extrabold tracking-[0.1em] uppercase px-0.5 pb-1 dark:text-white/45 text-black/50';

export function LayerQuickToggleGrid({
  accentActiveClassName,
  inputIdPrefix,
  items,
  sectionLabel,
  sectionLabelClassName,
  toggleClassName = 'city-layer-toggle',
}: LayerQuickToggleGridProps) {
  if (items.length === 0) return null;

  return (
    <div className="px-4 pt-2 pb-1 shrink-0">
      {sectionLabel ? (
        <div className={sectionLabelClassName ?? QUICK_SECTION_LABEL_DEFAULT}>{sectionLabel}</div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <LayerQuickToggleTile
            accentActiveClassName={accentActiveClassName}
            inputIdPrefix={inputIdPrefix}
            item={item}
            key={item.id}
            toggleClassName={toggleClassName}
          />
        ))}
      </div>
    </div>
  );
}

export function LayerToggleRow({
  active,
  description,
  descriptionClassName,
  icon,
  iconWrapperClassName,
  id,
  inputIdPrefix = 'layer-toggle',
  label,
  labelClassName,
  rowClassName,
  set,
}: LayerToggleRowProps) {
  const [, startTransition] = useTransition();
  const inputId = `${inputIdPrefix}-${id}`;

  return (
    <label className={rowClassName ?? DEFAULT_ROW_CLASSNAME} htmlFor={inputId}>
      <div className={iconWrapperClassName ?? DEFAULT_ICON_WRAPPER_CLASSNAME}>{icon}</div>
      <div className="flex-1 flex flex-col gap-px min-w-0">
        <span className={labelClassName ?? DEFAULT_LABEL_CLASSNAME}>{label}</span>
        <span className={descriptionClassName ?? DEFAULT_DESCRIPTION_CLASSNAME}>{description}</span>
      </div>
      <input
        checked={active}
        className="city-layer-toggle"
        id={inputId}
        onChange={() => startTransition(() => set(!active))}
        type="checkbox"
      />
    </label>
  );
}
