/**
 * Live check: does the app still pair realtime vehicles with static trips?
 *
 *   yarn verify:live
 *
 * This imports the *production* modules rather than reimplementing the join, so
 * it fails when the shipped code fails and not merely when a copy of it drifts.
 * It answers two separate questions the debug panel otherwise only hints at:
 *
 *   1. Is the bug fixed?  — how many live vehicles a route panel would show.
 *   2. Has ZET's data improved? — whether trips match on their exact ID again,
 *      which is what makes the drift fallback unnecessary.
 *
 * Deliberately excluded from `yarn test`: it needs the network, and overnight the
 * fleet legitimately empties out. Failing CI for either would be wrong.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import type { ActiveTrip } from '../../src/utils/gtfs';
import type { ParsedVehiclePosition } from '../../src/utils/realtime';

import { getCurrentServiceId, getPreviousServiceId } from '../../src/utils/gtfs';
import { createStaticTripResolver } from '../../src/utils/staticTripResolver';
import { mapRealtimeToVehiclePositions } from '../../src/utils/vehicles';

/**
 * Everything is fetched through the dev server, matching `verify:trip-drift`.
 *
 * It is not just convenience: the realtime Worker sits behind protection that
 * refuses non-browser clients outright (403 regardless of API key, Origin or
 * User-Agent), so `vite dev`'s server-side proxy is the only way to reach it
 * from Node. Run `yarn dev` in another terminal first.
 */
const BASE_URL = process.env.VERIFY_BASE_URL ?? 'http://localhost:5173';
/** Below this the fleet is too small to conclude anything — e.g. the small hours. */
const MIN_FLEET = 20;
/** Routes whose live vehicles resolve. Historically ~92%; the rest sit on other services. */
const MIN_RESOLVED_RATIO = 0.75;

interface Fleet {
  perRoute: Map<string, string[]>;
  positions: Map<string, ParsedVehiclePosition>;
}

async function fetchFleet(): Promise<Fleet> {
  // Read the key the way the app does — hand-parsing .env.local is how you get a
  // key that is one character short and a 401 that looks like a permissions bug.
  const { loadEnv } = await import('vite');
  const env = loadEnv('development', process.cwd(), '');
  const apiKey = process.env.VITE_GTFS_API_KEY ?? env.VITE_GTFS_API_KEY;
  if (!apiKey) throw new Error('VITE_GTFS_API_KEY is not set — the feed will reject the request');

  const GtfsRealtimeBindings = (await import('gtfs-realtime-bindings')).default;
  const res = await fetch(`${BASE_URL}/api/?endpoint=vehicle-positions`, {
    headers: { 'X-API-Key': apiKey, 'X-App-Request': '1' },
  });
  if (!res.ok) throw new Error(`realtime feed returned HTTP ${res.status} via ${BASE_URL}`);

  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
    new Uint8Array(await res.arrayBuffer())
  );

  const positions = new Map<string, ParsedVehiclePosition>();
  const perRoute = new Map<string, string[]>();
  for (const entity of feed.entity) {
    const v = entity.vehicle;
    const tripId = v?.trip?.tripId;
    const routeId = v?.trip?.routeId;
    if (!tripId || !routeId) continue;
    positions.set(tripId, {
      latitude: v.position?.latitude ?? 0,
      longitude: v.position?.longitude ?? 0,
      routeId,
      tripId,
      vehicleId: v.vehicle?.id ?? undefined,
    } as ParsedVehiclePosition);
    perRoute.set(routeId, [...(perRoute.get(routeId) ?? []), tripId]);
  }
  return { perRoute, positions };
}

async function fetchJson<T>(relPath: string): Promise<null | T> {
  const res = await fetch(`${BASE_URL}/${relPath}`, { headers: { 'X-App-Request': '1' } });
  // A missing data file is served as the SPA shell with a 200, so the status
  // alone would happily hand back an HTML page as "JSON".
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.includes('json')) return null;
  return (await res.json()) as T;
}

describe('realtime → static trip join, against the live feeds', () => {
  let fleet: Fleet;
  let serviceId: null | string;
  let previousServiceId: null | string;

  beforeAll(async () => {
    const initial = await fetchJson<{ calendar: Record<string, string>; feedVersion: string }>(
      'data/initial.json'
    ).catch(() => {
      throw new Error(
        `cannot reach ${BASE_URL} — start the dev server first:\n\n    yarn dev\n\n` +
          'or point this at another instance with VERIFY_BASE_URL.'
      );
    });
    if (!initial) throw new Error(`could not load initial.json from ${BASE_URL}`);

    // The same helpers the app uses, so a calendar bug shows up here too.
    serviceId = getCurrentServiceId(initial.calendar);
    previousServiceId = getPreviousServiceId(initial.calendar);
    fleet = await fetchFleet();

    console.log(`\n  origin        ${BASE_URL}`);
    console.log(`  feed version  ${initial.feedVersion}`);
    console.log(`  service today ${serviceId ?? '(none)'}`);
    console.log(`  service prev  ${previousServiceId ?? '(none)'}`);
    console.log(
      `  live fleet    ${fleet.positions.size} vehicles across ${fleet.perRoute.size} routes\n`
    );
  });

  it('shows vehicles on the route panel for the routes that have them', async () => {
    if (fleet.positions.size < MIN_FLEET) {
      console.log(`  SKIPPED — only ${fleet.positions.size} vehicles running; nothing to conclude`);
      return;
    }

    let live = 0;
    let resolved = 0;
    let exactHits = 0;
    let driftHits = 0;
    const emptyRoutes: string[] = [];

    for (const [routeId, tripIds] of [...fleet.perRoute].sort()) {
      const data = await fetchJson<{ trips: ActiveTrip[] }>(
        `data/route_active_trips/${routeId}.json`
      );
      if (!data) continue; // route the static feed does not carry — not a join failure

      const trips = data.trips ?? [];
      const staticIds = new Set(trips.map((t) => t.id));
      const resolver = createStaticTripResolver(
        trips.map((t) => t.id),
        [serviceId, previousServiceId]
      );

      // Exactly what the route panel renders.
      const shown = mapRealtimeToVehiclePositions(
        fleet.positions,
        new Map(),
        trips,
        routeId,
        resolver
      );

      live += tripIds.length;
      resolved += shown.length;
      for (const tripId of tripIds) {
        if (staticIds.has(tripId)) exactHits += 1;
        else if (resolver.resolve(tripId) !== undefined) driftHits += 1;
      }
      if (shown.length === 0 && tripIds.length > 0) emptyRoutes.push(routeId);
    }

    const ratio = live === 0 ? 0 : resolved / live;
    console.log(`  exact ID hits ${exactHits}`);
    console.log(`  drift hits    ${driftHits}`);
    console.log(`  unresolved    ${live - exactHits - driftHits}`);
    console.log(`  route panels  ${resolved}/${live} vehicles (${(ratio * 100).toFixed(1)}%)`);
    if (emptyRoutes.length > 0) {
      console.log(`  empty panels  ${emptyRoutes.join(' ')}`);
    }

    console.log(
      exactHits > 0 && driftHits === 0
        ? '\n  ZET DATA IMPROVED — trips match on their exact ID; the drift fallback is idle.\n'
        : exactHits > 0
          ? '\n  PARTIAL REALIGNMENT — some trips match exactly, some still need the fallback.\n'
          : '\n  STILL DRIFTING — no trip matches exactly; the fallback is carrying every vehicle.\n'
    );

    expect(
      ratio,
      `only ${resolved} of ${live} live vehicles resolve — route panels are losing vehicles`
    ).toBeGreaterThan(MIN_RESOLVED_RATIO);
  });

  it('does not regress to the exact-only behaviour that emptied every panel', async () => {
    if (fleet.positions.size < MIN_FLEET) return;

    // The busiest route stands in for the whole network: if this one renders
    // nothing, the join is broken regardless of what the averages say.
    const [busiestRoute] = [...fleet.perRoute].sort((a, b) => b[1].length - a[1].length)[0];
    const data = await fetchJson<{ trips: ActiveTrip[] }>(
      `data/route_active_trips/${busiestRoute}.json`
    );
    expect(data, `no static trips file for route ${busiestRoute}`).not.toBeNull();

    const trips = data!.trips ?? [];
    const resolver = createStaticTripResolver(
      trips.map((t) => t.id),
      [serviceId, previousServiceId]
    );
    const shown = mapRealtimeToVehiclePositions(
      fleet.positions,
      new Map(),
      trips,
      busiestRoute,
      resolver
    );

    console.log(`  busiest route ${busiestRoute}: ${shown.length} vehicles on the panel`);
    expect(shown.length, `route ${busiestRoute} panel is empty`).toBeGreaterThan(0);
    // Headsign and direction only exist on the static side, so their presence is
    // what proves the vehicle was paired rather than waved through by the
    // pre-index routeId fallback.
    expect(shown.some((v) => v.headsign !== '')).toBe(true);
  });
});
