/**
 * Matching realtime trips to static trips across a feed-version change.
 *
 * ZET trip IDs are `{agency}_{service}_{block}_{route}_{sequence}`. Everything
 * after the service segment identifies the trip itself and is stable across
 * feed publications; the `{agency}_{service}` prefix is renumbered every time
 * ZET republishes the static feed.
 *
 * That is normally harmless, because realtime and static come from the same
 * publication. On 2026-07-29 they did not: ZET withdrew static feed `000391`
 * while realtime kept running a schedule whose trips were *all* `0_40_…`,
 * against static data containing only `0_20_…`–`0_34_…`. Exact-ID matching
 * scored zero hits, so every stop board silently lost its live vehicles while
 * the map — which needs no join — kept showing them.
 *
 * This fallback matches on the stable part of the ID. It is deliberately *not*
 * a drop-in replacement for exact matching:
 *
 *   - **The key alone is ambiguous.** Weekday/Saturday/Sunday variants of the
 *     same trip share it (30k such collisions across the full dataset), so a
 *     bare key match can surface Saturday's trip, and Saturday's times, on a
 *     Wednesday. Callers must scope a key match to the service they already
 *     believe is active — within a single service the key is unique.
 *   - **Exact stays authoritative.** Try the exact ID first and fall back only
 *     on a miss, so behaviour is unchanged once ZET realigns, and a genuine
 *     regression cannot hide behind a permanently-on fallback.
 *
 * Verified semantically, not just by hit count: for the 229 live vehicles whose
 * key resolved into today's service, the distance from the vehicle to the
 * nearest stop of the *paired* static trip had a median of 36 m, and 98.3% sat
 * within ±30 min of that stop's scheduled time. Unrelated trips would land
 * kilometres away with offsets scattered across the service day. Counting how
 * many keys resolve proves nothing on its own — an earlier version of this
 * change was shipped on that weaker evidence.
 */

/** `{agency}_{service}_{block}_{route}_{sequence}` — verified across 143k static and 725 realtime IDs. */
const SEGMENT_COUNT = 5;
/** `{agency}_{service}` — the part ZET renumbers per publication. */
const SERVICE_SEGMENT_COUNT = 2;

const split = (tripId: string): null | string[] => {
  const parts = tripId.split('_');
  // Anything off-shape is refused rather than best-guessed: if ZET ever changes
  // the ID format, callers fall back to exact-only matching, which degrades to
  // today's behaviour instead of confidently pairing the wrong trips.
  if (parts.length !== SEGMENT_COUNT) return null;
  if (parts.some((p) => p === '')) return null;
  return parts;
};

/**
 * Re-index a realtime map keyed by exact trip ID under {@link tripKey}.
 *
 * Keys reachable from more than one entry are dropped entirely: two live trips
 * sharing a key is not something we can disambiguate, and a wrong live vehicle
 * on a departure board is worse than none. (Does not happen in practice — the
 * realtime feed runs a single service — but it is cheap to be certain.)
 */
export function indexByTripKey<T>(byTripId: Map<string, T>): Map<string, T> {
  const index = new Map<string, T>();
  const collided = new Set<string>();

  for (const [tripId, value] of byTripId) {
    const key = tripKey(tripId);
    if (key === null) continue;
    if (index.has(key)) {
      collided.add(key);
      continue;
    }
    index.set(key, value);
  }
  for (const key of collided) index.delete(key);

  return index;
}

/**
 * Exact match first, then the service-drift fallback.
 *
 * `allowKeyFallback` must be the caller's own judgement that `tripId` belongs
 * to a currently-active service — see the ambiguity note above. Pass `false`
 * and this is plain exact matching.
 */
export function matchRealtime<T>(
  byTripId: Map<string, T>,
  byTripKey: Map<string, T>,
  tripId: string,
  allowKeyFallback: boolean
): T | undefined {
  const exact = byTripId.get(tripId);
  if (exact !== undefined) return exact;
  if (!allowKeyFallback) return undefined;

  const key = tripKey(tripId);
  return key === null ? undefined : byTripKey.get(key);
}

/**
 * The publication-stable part of a trip ID (`block_route_sequence`),
 * or `null` when the ID is not the shape we expect.
 */
export function tripKey(tripId: string): null | string {
  return split(tripId)?.slice(SERVICE_SEGMENT_COUNT).join('_') ?? null;
}

/** The `{agency}_{service}` prefix, or `null` when the ID is off-shape. */
export function tripServiceId(tripId: string): null | string {
  return split(tripId)?.slice(0, SERVICE_SEGMENT_COUNT).join('_') ?? null;
}
