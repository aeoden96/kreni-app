#!/usr/bin/env node
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
/**
 * Does suffix matching actually pair the SAME trip? Evidence, not a guess.
 *
 * Background: ZET's realtime feed emits trip ids whose service field is `40`,
 * while the static feed only ever uses 4–14. Exact trip_id lookup therefore
 * matches nothing, and every live vehicle is orphaned.
 *
 * A previous fix (13efa67) stripped the service field and matched on the
 * remaining `pattern_route_tripnum` suffix. It was reverted (1a73e22) because it
 * emptied every stop board in production, and the post-mortem named the
 * reasoning error precisely: the verification counted how many keys *resolved*
 * (240/261), not whether the paired trips described the same journey. Equal keys
 * are not evidence of equal trips.
 *
 * So this script refuses to report a resolution rate as a headline. It pairs
 * every live trip by suffix and then CHECKS THE PAIRING against stop times:
 * for each stop the realtime feed gives us, `arrivalTime + arrivalDelay`
 * reconstructs what the schedule must have said. That reconstructed time is
 * compared to the static timetable for the paired trip, on the same stop id and
 * the same stop_sequence. Agreement across many trips is evidence; disagreement
 * anywhere is disqualifying, and is reported loudest.
 *
 * Usage (dev server running, so `/api` proxies past the Worker's CORS):
 *   node scripts/verify-trip-drift.mjs
 *   VERIFY_BASE_URL=https://kreni.app node scripts/verify-trip-drift.mjs
 */
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const BASE_URL = process.env.VERIFY_BASE_URL ?? 'http://localhost:5173';
/** Timetable minutes are minutes-after-midnight in Zagreb local time. */
const TZ_OFFSET_MIN = Number(process.env.VERIFY_TZ_OFFSET_MIN ?? 120);
/** A pairing counts as agreeing only if every comparable stop lands within this. */
const TOLERANCE_MIN = Number(process.env.VERIFY_TOLERANCE_MIN ?? 0);
/** A pairing is only judged when this many stops can be compared. See below. */
const MIN_STOPS = Number(process.env.VERIFY_MIN_STOPS ?? 2);
/**
 * Read lazily, never hoisted into a const: ES module imports are evaluated before
 * the importing module's body runs, so a sampler that sets VERIFY_QUIET at module
 * scope would set it too late to suppress anything.
 */
const isQuiet = () => process.env.VERIFY_QUIET === '1';

async function fetchFeed(endpoint, apiKey) {
  const res = await fetch(`${BASE_URL}/api/?endpoint=${endpoint}`, {
    headers: { 'X-API-Key': apiKey, 'X-App-Request': '1' },
  });
  if (!res.ok) throw new Error(`${endpoint}: HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buf);
}

async function fetchJson(relPath) {
  const res = await fetch(`${BASE_URL}/${relPath}`, { headers: { 'X-App-Request': '1' } });
  const type = res.headers.get('content-type') ?? '';
  // A missing data file returns the SPA index.html with 200, so status is not
  // enough — content-type is what actually distinguishes data from the fallback.
  if (!res.ok || !type.includes('json')) return null;
  return res.json();
}

/**
 * Read the key exactly the way the app does. Hand-rolling the .env parse is how
 * you get a key that is one character off — `.env.local` documents that the value
 * must stay single-quoted, and a silently truncated key comes back as a 401 that
 * looks like a permissions problem rather than a parsing one.
 */
async function loadApiKey() {
  if (process.env.VITE_GTFS_API_KEY) return process.env.VITE_GTFS_API_KEY;
  const { loadEnv } = await import('vite');
  return loadEnv('development', process.cwd(), '').VITE_GTFS_API_KEY ?? '';
}

const suffixOf = (tripId) => {
  const p = String(tripId).split('_');
  return p.length >= 5 ? p.slice(2).join('_') : null;
};
const serviceOf = (tripId) => String(tripId).split('_')[1] ?? null;

export async function collectSample() {
  const apiKey = await loadApiKey();
  if (!apiKey) console.warn('! No VITE_GTFS_API_KEY found — the proxy will likely 401.\n');

  const tripFeed = await fetchFeed('trip-updates', apiKey);
  const updates = tripFeed.entity.filter((e) => e.tripUpdate);
  if (!isQuiet()) console.log(`Live trip updates: ${updates.length}`);

  // Group live trips by route so each static timetable is fetched once.
  const byRoute = new Map();
  for (const e of updates) {
    const tu = e.tripUpdate;
    const routeId = tu.trip?.routeId;
    const tripId = tu.trip?.tripId;
    if (!routeId || !tripId) continue;
    if (!byRoute.has(routeId)) byRoute.set(routeId, []);
    byRoute.get(routeId).push(tu);
  }
  if (!isQuiet()) console.log(`Routes represented: ${byRoute.size}\n`);

  const stats = {
    agree: 0,
    ambiguousStaticTimes: 0,
    disagree: 0,
    exactIdHit: 0,
    insufficient: 0,
    routesMissing: 0,
    suffixMiss: 0,
    totalTrips: 0,
  };
  const rtServices = new Map();
  const disagreements = [];
  const deltas = new Map();
  // Where do disagreements land? If they cluster on one stop_sequence they are a
  // feed artefact; if they are spread across the trip the pairing is simply wrong.
  const badSeq = new Map();
  const okSeq = new Map();
  const mixedTrips = [];
  const soleStopSeq = new Map();
  /** Per-trip verdicts, so repeated samples can be merged over time. */
  const perTrip = [];
  let stopIdMismatches = 0;

  for (const [routeId, trips] of byRoute) {
    const table = await fetchJson(`data/timetables/${routeId}.json`);
    if (!table) {
      stats.routesMissing += 1;
      stats.totalTrips += trips.length;
      continue;
    }

    // suffix → { services:[], stops: Map(seq → {stopId, minutes}) }, plus a flag
    // when variants disagree on stop times (which would make the suffix unsafe).
    const bySuffix = new Map();
    for (const [tid, stops] of Object.entries(table)) {
      const suf = suffixOf(tid);
      if (!suf) continue;
      const body = JSON.stringify(stops);
      const entry = bySuffix.get(suf);
      if (entry) {
        entry.services.push(serviceOf(tid));
        if (entry.body !== body) entry.conflicting = true;
      } else {
        bySuffix.set(suf, {
          body,
          conflicting: false,
          services: [serviceOf(tid)],
          stops: new Map(stops.map(([stopId, seq, minutes]) => [seq, { minutes, stopId }])),
        });
      }
    }

    for (const tu of trips) {
      stats.totalTrips += 1;
      const tripId = tu.trip.tripId;
      const svc = serviceOf(tripId);
      rtServices.set(svc, (rtServices.get(svc) ?? 0) + 1);
      if (table[tripId]) stats.exactIdHit += 1;

      const suf = suffixOf(tripId);
      const cand = suf ? bySuffix.get(suf) : null;
      if (!cand) {
        stats.suffixMiss += 1;
        perTrip.push({ routeId, tripId, verdict: 'suffixMiss' });
        continue;
      }
      if (cand.conflicting) {
        stats.ambiguousStaticTimes += 1;
        perTrip.push({ routeId, tripId, verdict: 'conflict' });
        continue;
      }

      let compared = 0;
      let worst = 0;
      let bad = null;
      let agreeStops = 0;
      let badStops = 0;
      let lastSeq = null;
      for (const stu of tu.stopTimeUpdate ?? []) {
        const seq = stu.stopSequence;
        const arrival = stu.arrival ?? stu.departure;
        if (seq == null || !arrival?.time || arrival.delay == null) continue;
        const stat = cand.stops.get(seq);
        if (!stat) continue;

        const scheduledEpoch = Number(arrival.time) - Number(arrival.delay);
        const rtMinutes = toLocalMinutes(scheduledEpoch);
        // Timetables can run past midnight (minutes ≥ 1440); compare modulo the day.
        let delta = Math.abs(((rtMinutes - stat.minutes + 720 + 1440) % 1440) - 720);
        const stopMatches = String(stat.stopId) === String(stu.stopId);
        compared += 1;
        lastSeq = seq;
        if (delta > worst) worst = delta;
        if (delta > TOLERANCE_MIN || !stopMatches) {
          bad = { delta, expected: stat.stopId, got: stu.stopId, seq, stopMatches };
          badStops += 1;
          badSeq.set(seq, (badSeq.get(seq) ?? 0) + 1);
          if (!stopMatches) stopIdMismatches += 1;
        } else {
          agreeStops += 1;
          okSeq.set(seq, (okSeq.get(seq) ?? 0) + 1);
        }
      }

      // One comparable stop is not evidence. In practice the lone stop is almost
      // always stop_sequence 1, where ZET emits a placeholder time that does not
      // reconstruct to the schedule — convicting a pairing on that alone would be
      // the same "counted resolutions, not identity" mistake in a new costume.
      if (compared < MIN_STOPS) {
        stats.insufficient += 1;
        if (compared > 0) soleStopSeq.set(lastSeq, (soleStopSeq.get(lastSeq) ?? 0) + 1);
        perTrip.push({ compared, routeId, tripId, verdict: 'insufficient' });
        continue;
      }
      deltas.set(worst, (deltas.get(worst) ?? 0) + 1);
      if (bad) {
        stats.disagree += 1;
        mixedTrips.push({ agreeStops, badStops });
        if (disagreements.length < 12) disagreements.push({ routeId, tripId, ...bad });
        perTrip.push({ compared, detail: bad, routeId, tripId, verdict: 'refuted', worst });
      } else {
        stats.agree += 1;
        perTrip.push({ compared, routeId, tripId, verdict: 'verified', worst });
      }
    }
  }

  const checked = stats.agree + stats.disagree;
  if (!isQuiet()) {
  console.log('── Pairing evidence ──────────────────────────────');
  console.log(`live trips seen............ ${stats.totalTrips}`);
  console.log(`exact trip_id hits......... ${stats.exactIdHit}`);
  console.log(`suffix had no candidate.... ${stats.suffixMiss}`);
  console.log(`static variants conflicted. ${stats.ambiguousStaticTimes}`);
  console.log(`too few stops to judge...... ${stats.insufficient}`);
  console.log(`route timetable missing.... ${stats.routesMissing}`);
  console.log('');
  console.log(`VERIFIED pairs (stop times agree) ... ${stats.agree}`);
  console.log(`REFUTED pairs (stop times differ) ... ${stats.disagree}`);
  if (checked) {
    console.log(`agreement rate ...................... ${((stats.agree / checked) * 100).toFixed(2)}%`);
  }
  console.log('');
  console.log('RT service-id field distribution:', Object.fromEntries(rtServices));
  console.log(
    'worst per-trip delta (min) histogram:',
    Object.fromEntries([...deltas].sort((a, b) => a[0] - b[0]).slice(0, 10))
  );

  const top = (m) =>
    Object.fromEntries([...m].sort((a, b) => b[1] - a[1]).slice(0, 6));
  console.log('\n── Where disagreements land ──────────────────────');
  console.log('stop_sequence of trips having only ONE comparable stop:', top(soleStopSeq));
  console.log('disagreeing stop comparisons by stop_sequence:', top(badSeq));
  console.log('agreeing    stop comparisons by stop_sequence:', top(okSeq));
  console.log(`stop_id mismatches (seq aligned to wrong stop): ${stopIdMismatches}`);
  const whollyBad = mixedTrips.filter((t) => t.agreeStops === 0).length;
  console.log(
    `refuted trips with ZERO agreeing stops: ${whollyBad} / ${mixedTrips.length}` +
      ` (the rest agree on some stops and differ on others)`
  );

  if (disagreements.length) {
    console.log('\n── Disagreements (disqualifying) ─────────────────');
    for (const d of disagreements) {
      console.log(
        `  route ${d.routeId} ${d.tripId} seq ${d.seq}: Δ${d.delta} min` +
          (d.stopMatches ? '' : `, stop id ${d.got} ≠ static ${d.expected}`)
      );
    }
  }

  console.log(
    `\nVerdict: ${stats.disagree === 0 && stats.agree > 0 ? 'suffix pairing is consistent on this sample' : 'NOT SAFE — see disagreements above'}`
  );
  console.log('Note: this validates identity only. It says nothing about whether');
  console.log('attaching a vehicle is safe for filtering — see 1a73e22.');
  }

  return { disagreements, perTrip, rtServices: Object.fromEntries(rtServices), stats };
}

/** epoch seconds → minutes after local midnight, matching the timetable encoding. */
function toLocalMinutes(epochSec) {
  const d = new Date((epochSec + TZ_OFFSET_MIN * 60) * 1000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  collectSample().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
