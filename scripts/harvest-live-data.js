import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The local Cloudflare worker endpoint
const url =
  (process.env.VITE_GTFS_PROXY_URL || 'http://127.0.0.1:8787') + '/?endpoint=vehicle-positions';
const durationMinutes = 2;
const intervalMs = 5000; // Poll every 5 seconds
const maxIterations = Math.ceil((durationMinutes * 60 * 1000) / intervalMs);
let iteration = 0;

const outputDir = path.join(__dirname, '..', 'data-harvest');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Starting GTFS-RT harvest from ${url}`);
console.log(
  `Duration: ${durationMinutes} minutes. Interval: ${intervalMs}ms. Max iterations: ${maxIterations}`
);
console.log(`Saving data to ${outputDir}\n`);

// Run immediately for iteration 1
harvest();
const timer = setInterval(harvest, intervalMs);

async function harvest() {
  iteration++;

  if (iteration > maxIterations) {
    clearInterval(timer);
    console.log('Harvest complete.');
    return;
  }

  const fetchStart = Date.now();
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const fetchEnd = Date.now();
    const fetchTimeMs = fetchEnd - fetchStart;

    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const workerTimestamp = res.headers.get('X-Timestamp') || 'unknown';
    const cacheStatus = res.headers.get('X-Cache-Status') || 'MISS';
    const age = res.headers.get('Age') || '0';

    const buffer = await res.arrayBuffer();

    // Write raw protobuf for backup
    const filenameBase = `snapshot-${fetchStart}`;
    fs.writeFileSync(path.join(outputDir, `${filenameBase}.pb`), Buffer.from(buffer));

    // Decode and parse to JSON for easier inspection
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));

    // Since bigints/Longs might fail in standard JSON.stringify, we can provide a replacer
    const jsonString = JSON.stringify(
      {
        feed: feed,
        meta: {
          age,
          cacheStatus,
          fetchStart,
          fetchTimeMs,
          totalEntities: feed.entity.length,
          workerTimestamp,
        },
      },
      (key, value) => {
        return typeof value === 'bigint' ? value.toString() : value;
      },
      2
    );

    fs.writeFileSync(path.join(outputDir, `${filenameBase}.json`), jsonString);

    console.log(
      `[${iteration}/${maxIterations}] Saved snapshot ${fetchStart}. ` +
        `Entities: ${feed.entity.length}, Cache: ${cacheStatus}, Age: ${age}s, Fetch Latency: ${fetchTimeMs}ms`
    );
  } catch (err) {
    console.error(`[${iteration}/${maxIterations}] Failed to fetch:`, err.message);
  }
}
