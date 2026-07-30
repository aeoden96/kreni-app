/**
 * Placeholders for <StopModal> while its four data sources resolve.
 *
 * The modal used to paint whatever had arrived and grow in steps as the rest
 * landed — heading line, then route badges, then platform pills, then the
 * board — which read as a stutter right after opening. These stand in for all
 * of it at roughly the final heights, so the modal opens at a settled size and
 * swaps once.
 */

/** Departure board placeholder. */
export function StopModalBodySkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="p-4 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-base-content/50">{label}</span>
        <span className="loading loading-spinner loading-xs text-base-content/30" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div className="skeleton h-20 w-full rounded-xl" key={i} />
      ))}
    </div>
  );
}

/** Route badges and platform pills, in the modal header. */
export function StopModalHeaderSkeleton() {
  return (
    <div aria-hidden>
      <div className="flex flex-wrap gap-1 mb-3">
        {[10, 8, 12, 8, 10].map((w, i) => (
          <div className="skeleton h-4 rounded-full" key={i} style={{ width: `${w * 4}px` }} />
        ))}
      </div>

      <div className="mb-3">
        <div className="skeleton h-2.5 w-24 rounded mb-1.5" />
        <div className="flex flex-wrap gap-1.5">
          {[28, 32, 24].map((w, i) => (
            <div className="skeleton h-7 rounded-full" key={i} style={{ width: `${w * 4}px` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
