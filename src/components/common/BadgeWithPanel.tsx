import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

type BadgeWithPanelVariant = 'popover' | 'fullScreen';

interface BadgeWithPanelProps {
  /** Content of the badge button (e.g. icon + label). */
  children: ReactNode;
  /** Extra classes for the badge button (e.g. badge-primary, badge-success). Default: "badge gap-1 shadow cursor-pointer hover:badge-outline transition-all". */
  badgeClassName?: string;
  ariaLabel?: string;
  title?: string;
  /** How the panel is shown when open: small absolute popover near the badge, or full-screen overlay (portal). */
  variant: BadgeWithPanelVariant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Panel content. For popover: ReactNode. For fullScreen: ReactNode or (onClose) => ReactNode so the overlay can close on backdrop/button. */
  panelContent: ReactNode | ((onClose: () => void) => ReactNode);
  /** For variant="popover" only: classes for the positioned panel wrapper (e.g. "absolute bottom-16 right-0 bg-base-100 rounded-xl ..."). */
  popoverClassName?: string;
}

const defaultBadgeClass =
  'badge gap-1 shadow cursor-pointer hover:badge-outline transition-all';

/**
 * A badge button that toggles a panel. The panel can be either a small
 * absolute popover (e.g. legend, technical details) or a full-screen
 * overlay (e.g. alerts list). Open state is controlled from the parent.
 */
export function BadgeWithPanel({
  children,
  badgeClassName = defaultBadgeClass,
  ariaLabel,
  title,
  variant,
  open,
  onOpenChange,
  panelContent,
  popoverClassName,
}: BadgeWithPanelProps) {
  const button = (
    <button
      type="button"
      onClick={() => onOpenChange(!open)}
      className={badgeClassName}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );

  if (variant === 'fullScreen') {
    const onClose = () => onOpenChange(false);
    const resolvedContent =
      typeof panelContent === 'function' ? panelContent(onClose) : panelContent;
    return (
      <>
        {button}
        {open && createPortal(resolvedContent, document.body)}
      </>
    );
  }

  // popover: panel is positioned relative to a wrapper (panelContent is ReactNode)
  return (
    <div className="relative">
      {button}
      {open && (
        <div className={popoverClassName} role="dialog" aria-label={ariaLabel}>
          {typeof panelContent === 'function' ? null : panelContent}
        </div>
      )}
    </div>
  );
}
