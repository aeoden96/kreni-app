#!/usr/bin/env node
/**
 * probe-zet-cadence.mjs
 *
 * Measures how often the ZET GTFS-RT feed *document* actually regenerates, by
 * polling the upstream fast and watching the decoded `header.timestamp` (ZET's
 * own "generated at" clock) plus a hash of the raw body. This is the empirical
 * basis for the poll-interval decision in
 * docs/decisions/0002-realtime-proxy-cost-and-cadence.md — a run on 2026-07-04
 * showed the feed regenerates every exactly 10.0 s (not the 7 s the app polls).
 *
 * Re-run at rush hour to confirm the interval holds under load (it should — the
 * cadence is a property of ZET's feed-generation job, not vehicle count).
 *
 * Usage:
 *   node scripts/probe-zet-cadence.mjs                 # 2 s sampling, 180 s
 *   SAMPLE_MS=1000 DURATION_MS=300000 node scripts/probe-zet-cadence.mjs
 *   ZET_URL=https://www.zet.hr/gtfs-rt-protobuf node scripts/probe-zet-cadence.mjs
 *
 * Env vars (all optional):
 *   ZET_URL      – upstream feed URL          (default: https://www.zet.hr/gtfs-rt-protobuf)
 *   SAMPLE_MS    – ms between polls           (default: 2000)
 *   DURATION_MS  – total run length in ms     (default: 180000)
 */

import crypto from 'node:crypto';

import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

const ZET_URL = process.env.ZET_URL || 'https://www.zet.hr/gtfs-rt-protobuf';
const SAMPLE_MS = Number(process.env.SAMPLE_MS) || 2000;
const DURATION_MS = Number(process.env.DURATION_MS) || 180_000;

const samples = [];
const start = Date.now();

/** POSIX seconds → HH:MM:SS (UTC) for compact logging. */
function fmt(ts) {
  return new Date(ts * 1000).toISOString().slice(11, 19);
}

async function poll() {
  const t0 = Date.now();
  let rec = { ok: false, wall: t0 };
  try {
    const res = await fetch(ZET_URL, {
      cache: 'no-store',
      headers: { 'User-Agent': 'ZET-Live-App/cadence-probe' },
    });
    const buf = new Uint8Array(await res.arrayBuffer());
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buf);
    const hdrTs = feed.header?.timestamp ? Number(feed.header.timestamp) : null;

    // Freshest per-vehicle GPS ping present in this document.
    let maxVehTs = 0;
    let nVeh = 0;
    for (const e of feed.entity) {
      if (e.vehicle?.timestamp) {
        maxVehTs = Math.max(maxVehTs, Number(e.vehicle.timestamp));
        nVeh++;
      }
    }

    rec = {
      bytes: buf.length,
      hash: crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10),
      hdrTs,
      maxVehTs: maxVehTs || null,
      nEntity: feed.entity.length,
      nVeh,
      ok: true,
      wall: t0,
    };
  } catch (e) {
    rec.err = e instanceof Error ? e.message : String(e);
  }

  samples.push(rec);
  const rel = ((rec.wall - start) / 1000).toFixed(1).padStart(5);
  if (rec.ok) {
    console.log(
      `t=${rel}s  hdrTs=${rec.hdrTs ? fmt(rec.hdrTs) : '—'}  ` +
        `bytes=${String(rec.bytes).padStart(5)}  hash=${rec.hash}  ` +
        `veh=${rec.nVeh}  freshestPing=${rec.maxVehTs ? fmt(rec.maxVehTs) : '—'}`
    );
  } else {
    console.log(`t=${rel}s  ERROR ${rec.err}`);
  }
}

function stat(arr) {
  if (!arr.length) return { n: 0 };
  return {
    max: Math.max(...arr).toFixed(1),
    mean: (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1),
    min: Math.min(...arr).toFixed(1),
    n: arr.length,
    values: arr.map((v) => Number(v).toFixed(0)).join(','),
  };
}

function analyze() {
  const ok = samples.filter((s) => s.ok);
  const elapsed = ((Date.now() - start) / 1000).toFixed(0);
  console.log(`\n===== ANALYSIS (${ok.length} good samples over ${elapsed}s) =====`);

  // Gaps between distinct feed header timestamps (the regeneration cadence).
  const hdrGaps = [];
  let prevHdr = null;
  for (const s of ok) {
    if (s.hdrTs != null && s.hdrTs !== prevHdr) {
      if (prevHdr != null) hdrGaps.push(s.hdrTs - prevHdr);
      prevHdr = s.hdrTs;
    }
  }

  // Wall-clock gaps between distinct response bodies.
  const bodyGaps = [];
  let prevHash = null;
  let prevWall = null;
  for (const s of ok) {
    if (s.hash !== prevHash) {
      if (prevWall != null) bodyGaps.push((s.wall - prevWall) / 1000);
      prevHash = s.hash;
      prevWall = s.wall;
    }
  }
  const distinctBodies = new Set(ok.map((s) => s.hash)).size;

  console.log('\n[Feed header timestamp] gaps between distinct hdrTs (seconds):');
  console.log('  ', JSON.stringify(stat(hdrGaps)));
  console.log('\n[Body bytes] gaps between distinct response bodies (wall seconds):');
  console.log('  ', JSON.stringify(stat(bodyGaps)));
  console.log(`\n  distinct bodies: ${distinctBodies} / ${ok.length} polls`);
  console.log(
    `  → a true 7 s cadence over ~${elapsed}s would yield ~${Math.round(elapsed / 7)} distinct documents.`
  );
}

console.log(`Polling ${ZET_URL} every ${SAMPLE_MS / 1000}s for ${DURATION_MS / 1000}s...\n`);
await poll();
const iv = setInterval(async () => {
  if (Date.now() - start >= DURATION_MS) {
    clearInterval(iv);
    analyze();
    return;
  }
  await poll();
}, SAMPLE_MS);
