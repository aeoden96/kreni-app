import type { ReactNode } from 'react';

import { Popup, type PopupProps, Tooltip, type TooltipProps } from 'react-leaflet';

interface MapTooltipProps {
  className?: string;
  description?: ReactNode;
  /** Optional block between description and key-value rows (e.g. bike type breakdown). */
  detail?: ReactNode;
  /** Tooltip only: arrow direction when using the sticky/hover path. */
  direction?: TooltipProps['direction'];
  /** Shown next to the title (e.g. favourite star). Enables interactive tooltips when sticky. */
  headerActions?: ReactNode;
  keyValues?: Record<string, null | ReactNode | undefined>;
  /** Tooltip: pixel offset. Popup: passed to Leaflet as [x, y] when not sticky. */
  offset?: TooltipProps['offset'];
  /** Tooltip only (sticky path). */
  opacity?: number;
  /** When true, use hover Tooltip that follows cursor on paths/polygons. Otherwise use click Popup. */
  sticky?: boolean;
  title: ReactNode;
}

export function MapTooltip({
  className = 'custom-tooltip shadow-lg',
  description,
  detail,
  direction = 'top',
  headerActions,
  keyValues,
  offset = [0, -14],
  opacity = 0.98,
  sticky,
  title,
}: MapTooltipProps) {
  const body = (
    <MapTooltipContent
      description={description}
      detail={detail}
      headerActions={headerActions}
      keyValues={keyValues}
      title={title}
    />
  );

  if (sticky) {
    return (
      <Tooltip
        className={className}
        direction={direction}
        interactive={Boolean(headerActions || detail)}
        offset={offset}
        opacity={opacity}
        sticky
      >
        {body}
      </Tooltip>
    );
  }

  return (
    <Popup
      className={className}
      closeButton={false}
      maxWidth={320}
      minWidth={240}
      offset={offset as PopupProps['offset']}
    >
      {body}
    </Popup>
  );
}

function isFilled(value: unknown) {
  return value !== null && value !== undefined && value !== '';
}

function MapTooltipContent({
  description,
  detail,
  headerActions,
  keyValues,
  title,
}: Pick<MapTooltipProps, 'description' | 'detail' | 'headerActions' | 'keyValues' | 'title'>) {
  const kvRows = Object.entries(keyValues ?? {}).filter(([, value]) => isFilled(value));

  return (
    <div className="w-full min-w-0 max-w-[min(18rem,calc(100vw-4rem))] overflow-hidden">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="text-[13px] sm:text-sm font-bold leading-snug break-words [overflow-wrap:anywhere] min-w-0 flex-1">
          {title}
        </div>
        {headerActions ? (
          <div className="shrink-0 pointer-events-auto pt-px">{headerActions}</div>
        ) : null}
      </div>
      {description ? (
        <div className="text-[11px] sm:text-xs text-base-content/70 leading-snug mt-0.5 break-words [overflow-wrap:anywhere] whitespace-normal">
          {description}
        </div>
      ) : null}
      {detail ? (
        <div className="text-[11px] sm:text-xs text-base-content/70 leading-snug mt-1 break-words [overflow-wrap:anywhere] whitespace-normal">
          {detail}
        </div>
      ) : null}
      {kvRows.length > 0 ? (
        <div className="mt-1.5 space-y-0.5">
          {kvRows.map(([key, value]) => (
            <div
              className="text-[11px] sm:text-xs text-base-content/70 leading-snug break-words [overflow-wrap:anywhere]"
              key={key}
            >
              <span className="font-semibold">{key}:</span> {value}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
