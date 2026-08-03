#!/usr/bin/env node
/**
 * Accumulate trip-drift evidence across many snapshots.
 *
 * A single run of `verify-trip-drift` can only judge trips that happen, at that
 * instant, to expose two or more comparable stops — about a quarter of the fleet.
 * The rest are not evidence of anything; they are simply unobserved. Sampling
 * repeatedly fixes that: as a trip progresses, the feed publishes more stop
 * updates, so a trip that was unjudgeable at 08:00 becomes judgeable at 08:20.
 *
 * Evidence is merged per trip id, and the merge is deliberately pessimistic:
 *
 *   - a trip refuted in ANY sample is recorded as refuted, permanently
 *   - a trip that is verified in one sample and refuted in another is FLAPPING,
 *     which is worse than a plain refutation — it means the pairing is unstable
 *     and is reported separately rather than averaged away
 *   - `verified` requires agreement and never overwrites a refutation
 *
 * State persists to disk, so runs across several days accumulate rather than
 * restart, and the store can be inspected independently of this script.
 *
 * Usage (dev server running):
 *   yarn sample:trip-drift                      # default: every 3 min for 1 h
 *   SAMPLE_INTERVAL_S=120 SAMPLE_DURATION_MIN=180 yarn sample:trip-drift
 *   SAMPLE_ONCE=1 yarn sample:trip-drift        # single pass, then report
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { collectSample } from './verify-trip-drift.mjs';

const STORE = process.env.SAMPLE_STORE ?? 'trip-drift-evidence.json';
const INTERVAL_S = Number(process.env.SAMPLE_INTERVAL_S ?? 180);
const DURATION_MIN = Number(process.env.SAMPLE_DURATION_MIN ?? 60);
const ONCE = process.env.SAMPLE_ONCE === '1';

process.env.VERIFY_QUIET = '1';

async function loadStore() {
  try {
    return JSON.parse(await readFile(STORE, 'utf8'));
  } catch {
    return { samples: 0, startedAt: new Date().toISOString(), trips: {} };
  }
}

async function main() {
  const store = await loadStore();
  console.log(
    `Sampling into ${STORE} — every ${INTERVAL_S}s for ${DURATION_MIN} min` +
      `${ONCE ? ' (single pass)' : ''}`
  );

  const deadline = Date.now() + DURATION_MIN * 60_000;
  for (;;) {
    try {
      await takeSample(store);
    } catch (err) {
      // One bad poll must not end a multi-hour run.
      console.warn(`  ! sample failed: ${err.message}`);
    }
    if (ONCE || Date.now() + INTERVAL_S * 1000 > deadline) break;
    await new Promise((r) => setTimeout(r, INTERVAL_S * 1000));
  }

  report(store);
}

/** Pessimistic merge — see the header. A refutation is never downgraded. */
function mergeTrip(prev, next) {
  if (!prev) {
    return {
      firstSeen: new Date().toISOString(),
      refutedCount: next.verdict === 'refuted' ? 1 : 0,
      routeId: next.routeId,
      seen: 1,
      verdict: next.verdict,
      verifiedCount: next.verdict === 'verified' ? 1 : 0,
      worst: next.worst ?? 0,
      ...(next.detail ? { detail: next.detail } : {}),
    };
  }

  const merged = {
    ...prev,
    refutedCount: prev.refutedCount + (next.verdict === 'refuted' ? 1 : 0),
    seen: prev.seen + 1,
    verifiedCount: prev.verifiedCount + (next.verdict === 'verified' ? 1 : 0),
    worst: Math.max(prev.worst ?? 0, next.worst ?? 0),
  };
  if (next.detail) merged.detail = next.detail;

  if (merged.verifiedCount > 0 && merged.refutedCount > 0) merged.verdict = 'flapping';
  else if (merged.refutedCount > 0) merged.verdict = 'refuted';
  else if (merged.verifiedCount > 0) merged.verdict = 'verified';
  // Otherwise keep whatever non-judging verdict we already had.
  else merged.verdict = next.verdict;

  return merged;
}

function report(store) {
  const { counts, refuted } = summarise(store);
  const verified = counts.verified ?? 0;
  const bad = (counts.refuted ?? 0) + (counts.flapping ?? 0);
  const judged = verified + bad;
  const total = Object.keys(store.trips).length;

  console.log('\n════ Cumulative trip-drift evidence ════');
  console.log(`samples taken .......... ${store.samples}`);
  console.log(`since .................. ${store.startedAt}`);
  console.log(`distinct trips observed. ${total}`);
  console.log('');
  console.log(`VERIFIED ............... ${verified}`);
  console.log(`REFUTED ................ ${counts.refuted ?? 0}`);
  console.log(`FLAPPING (unstable) .... ${counts.flapping ?? 0}`);
  console.log(`still unjudged ......... ${counts.insufficient ?? 0}`);
  console.log(`suffix had no candidate. ${counts.suffixMiss ?? 0}`);
  console.log(`static conflict ........ ${counts.conflict ?? 0}`);
  if (judged) {
    console.log('');
    console.log(`agreement rate ......... ${((verified / judged) * 100).toFixed(2)}%  (n=${judged})`);
    console.log(`coverage of observed ... ${((judged / total) * 100).toFixed(1)}%`);
  }

  if (refuted.length) {
    console.log('\n── Trips that ever failed (investigate individually) ──');
    for (const r of refuted.slice(0, 20)) {
      console.log(
        `  ${r.verdict.padEnd(8)} route ${String(r.routeId).padEnd(4)} ${r.tripId}` +
          `  worst Δ${r.worst} min  (verified ${r.verifiedCount}× / refuted ${r.refutedCount}×)`
      );
    }
    if (refuted.length > 20) console.log(`  … and ${refuted.length - 20} more in ${STORE}`);
  }

  console.log(
    `\nVerdict: ${bad === 0 && verified > 0 ? 'no counter-example yet — keep sampling' : 'counter-examples exist, see above'}`
  );
  console.log('Identity only. Says nothing about filtering safety — see 1a73e22.');
}

async function saveStore(store) {
  const dir = path.dirname(STORE);
  if (dir && dir !== '.') await mkdir(dir, { recursive: true });
  await writeFile(STORE, JSON.stringify(store, null, 2));
}

function summarise(store) {
  const counts = {};
  let flapping = 0;
  const refuted = [];
  for (const [tripId, t] of Object.entries(store.trips)) {
    counts[t.verdict] = (counts[t.verdict] ?? 0) + 1;
    if (t.verdict === 'flapping') flapping += 1;
    if (t.verdict === 'refuted' || t.verdict === 'flapping') {
      refuted.push({ tripId, ...t });
    }
  }
  return { counts, flapping, refuted };
}

async function takeSample(store) {
  const { perTrip, stats } = await collectSample();
  store.samples += 1;
  for (const t of perTrip) {
    store.trips[t.tripId] = mergeTrip(store.trips[t.tripId], t);
  }
  await saveStore(store);
  const { counts } = summarise(store);
  console.log(
    `[${new Date().toISOString().slice(11, 19)}] sample ${store.samples}: ` +
      `${stats.totalTrips} live, +${perTrip.length} verdicts | ` +
      `cumulative verified ${counts.verified ?? 0}, refuted ${counts.refuted ?? 0}, ` +
      `flapping ${counts.flapping ?? 0}, unjudged ${counts.insufficient ?? 0}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
