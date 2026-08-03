#!/usr/bin/env node
/**
 * Capture Play Console store screenshots at exact required pixel sizes.
 *
 * The trick that makes these look right: Play wants 1080×1920 for phones, but
 * rendering at a 1080 px *CSS* viewport would trip every `sm:` breakpoint and
 * screenshot the desktop layout. So each preset sets a realistic CSS viewport
 * and a device scale factor whose product is the required output — 360×640 @3
 * is a phone that happens to be captured at 1080×1920.
 *
 * Scope is the ZET transit view on purpose: that is the app's headline feature
 * and what the listing sells. Train/cycling/city modes are secondary and their
 * screenshots read as a different, less busy product.
 *
 * Usage (dev server must already be running):
 *   yarn screenshots
 *   SCREENSHOT_THEMES=dark yarn screenshots
 *   SCREENSHOT_BASE_URL=http://localhost:4173 yarn screenshots
 */
import { mkdir, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:5173';
const OUT_DIR = process.env.SCREENSHOT_OUT_DIR ?? 'play-screenshots';
const THEMES = (process.env.SCREENSHOT_THEMES ?? 'dark,light').split(',');
/** Extra settle time after network idle, for map tiles and marker animations. */
const SETTLE_MS = Number(process.env.SCREENSHOT_SETTLE_MS ?? 4000);

/** CSS viewport × scale = the pixel size Play asks for. */
const ALL_DEVICES = [
  { height: 640, name: 'phone', scale: 3, width: 360 }, // → 1080×1920
  { height: 960, name: 'tablet7', scale: 2, width: 600 }, // → 1200×1920
  { height: 1280, name: 'tablet10', scale: 2, width: 800 }, // → 1600×2560
];
/** e.g. SCREENSHOT_DEVICES=phone — iterate on framing without a full run. */
const DEVICES = process.env.SCREENSHOT_DEVICES
  ? ALL_DEVICES.filter((d) => process.env.SCREENSHOT_DEVICES.split(',').includes(d.name))
  : ALL_DEVICES;

/** Trg bana Jelačića — dense enough that any zoom lands on something worth seeing. */
const DOWNTOWN = [45.8131, 15.9775];
/** Trg bana J. Jelačića, platform 1. Busiest interchange in the network. */
const STOP_JELACIC = '106_1';
/** Črnomerec–Sopot and Črnomerec–Dubec: the two busiest tram lines. */
const ROUTE_BUSY = '6';
const ROUTE_BUSY_ALT = '11';

/** Croatian UI labels, used as accessible names for the controls we click. */
const LABEL_DETAILS = 'Prikaži detalje';

/**
 * Selection is URL-addressable (`?route=&stop=&dir=`, see useSelectionParams) and
 * the map viewport is a persisted setting, so most shots need no clicking — just
 * the right link plus a seeded view. `#v=lat,lng,zoom` is read by the init script
 * below; the app itself ignores the hash.
 *
 * The stop modal and the focused-vehicle card are *not* URL-addressable — they
 * are transient UI reached by tapping — so those two carry an `act` step.
 *
 * Zooms are chosen against the layer thresholds in mapZoomConstants: individual
 * vehicles reach full opacity at 16, and the cluster discs take over at 15 and
 * below. Hence one deliberately wide shot to show the clustered fleet.
 */
const SHOTS = [
  { center: DOWNTOWN, name: '1-map', url: '/', zoom: 16 },
  { center: DOWNTOWN, name: '2-route', url: `/?route=${ROUTE_BUSY}&dir=A`, zoom: 16 },
  { center: DOWNTOWN, name: '3-stop', url: `/?stop=${STOP_JELACIC}`, zoom: 17 },
  {
    act: openStopDetails,
    center: DOWNTOWN,
    name: '4-stop-details',
    url: `/?stop=${STOP_JELACIC}`,
    zoom: 17,
  },
  {
    act: focusVehicle,
    center: DOWNTOWN,
    name: '5-vehicle',
    url: `/?route=${ROUTE_BUSY_ALT}&dir=A`,
    zoom: 16,
  },
  // Wide enough that AllVehicleMarkers has faded out entirely and the whole
  // fleet is showing as counted tram/bus discs.
  { center: DOWNTOWN, name: '6-clusters', url: '/', zoom: 12 },
];

/**
 * Seed the persisted store so no onboarding covers the map. Shape and version
 * must match settingsStore's `persist` config — a version mismatch would send
 * this through migrate() and the flags would not survive.
 */
const SETTINGS_VERSION = 12;
const MODES = ['transit', 'city', 'cycling', 'driving', 'train'];

/**
 * Tap a live vehicle on the route diagram to open its itinerary card.
 *
 * Deliberately the panel's own vehicle chip rather than a map marker: markers
 * sit wherever the vehicle happens to be, which at zoom 16 is usually outside
 * the viewport, and tapping one on the all-vehicles layer only opens the
 * lightweight preview. The diagram lists every vehicle on the line regardless
 * of where the map is looking.
 *
 * A route with no vehicles running throws rather than silently capturing the
 * un-focused panel — a screenshot that quietly shows the wrong thing is worse
 * than a missing one.
 */
async function focusVehicle(page) {
  const chip = page.locator('[data-testid="route-vehicle"]').first();
  await chip.waitFor({ state: 'visible', timeout: 20_000 });
  await chip.click();
  await page.waitForTimeout(2500);

  // Note: deliberately *not* tapping "Prati ovo vozilo" afterwards. It looks
  // like it should improve the framing by recentring on the vehicle, but the
  // follower keeps the whole line in view, which at this zoom piles every stop
  // marker into one unreadable clump.
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  // Replace rather than accumulate: the folder is what gets uploaded, and a
  // stale phone-4-train.png from a previous run would go up with the rest.
  const stale = (await readdir(OUT_DIR)).filter((f) => f.endsWith('.png'));
  await Promise.all(stale.map((f) => unlink(path.join(OUT_DIR, f))));
  if (stale.length > 0) console.log(`Removed ${stale.length} previous screenshot(s)\n`);

  const browser = await chromium.launch();
  let captured = 0;
  const failures = [];

  try {
    for (const theme of THEMES) {
      for (const device of DEVICES) {
        const context = await browser.newContext({
          baseURL: BASE_URL,
          colorScheme: theme === 'dark' ? 'dark' : 'light',
          deviceScaleFactor: device.scale,
          hasTouch: true,
          isMobile: true,
          locale: 'hr-HR',
          viewport: { height: device.height, width: device.width },
        });
        await context.addInitScript(seedScript(theme));
        const page = await context.newPage();

        for (const shot of SHOTS) {
          const [lat, lng] = shot.center;
          const target = `${shot.url}${shot.url.includes('#') ? '' : `#v=${lat},${lng},${shot.zoom}`}`;
          const label = `${device.name}-${theme}-${shot.name}`;

          await page.goto(target, { waitUntil: 'domcontentloaded' });
          // Two shots can share a path and differ only in the hash, which `goto`
          // treats as a same-document navigation — the init script would not re-run
          // and the second would inherit the first one's viewport.
          await page.reload({ waitUntil: 'domcontentloaded' });
          // Tiles and the realtime poll both settle well after DOM ready; networkidle
          // alone is not enough because the vehicle poll keeps the connection busy.
          await page.waitForLoadState('networkidle').catch(() => {});
          await page.waitForTimeout(SETTLE_MS);

          if (shot.act) {
            try {
              await shot.act(page);
            } catch (err) {
              failures.push(`${label}: ${err.message.split('\n')[0]}`);
              console.log(`✗ ${label}  — skipped, UI never appeared`);
              continue;
            }
          }

          const file = path.join(OUT_DIR, `${label}.png`);
          await page.screenshot({ path: file, scale: 'device' });
          captured += 1;
          console.log(`✓ ${file}  (${device.width * device.scale}×${device.height * device.scale})`);
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${captured} screenshots in ${path.resolve(OUT_DIR)}`);
  if (failures.length > 0) {
    console.log(`\n${failures.length} skipped:`);
    for (const f of failures) console.log(`  ${f}`);
    process.exitCode = 1;
  }
}

/** Expand the stop info bar into the full departures modal. */
async function openStopDetails(page) {
  const expand = page.getByRole('button', { name: LABEL_DETAILS }).first();
  await expand.waitFor({ state: 'visible', timeout: 15_000 });
  await expand.click();
  await page.waitForTimeout(1500);
}

function seedScript(theme) {
  const onboardingCompleted = Object.fromEntries(MODES.map((m) => [m, true]));
  const base = {
    // Without this the first-run GPS explainer covers roughly half the stop
    // modal, which is exactly the part of it worth showing.
    dismissedGpsTip: true,
    globalOnboardingCompleted: true,
    onboardingCompleted,
    theme,
  };
  // Runs before app code on every navigation, so the viewport in the hash is
  // already in localStorage by the time the store initialises from it.
  return `
    (() => {
      const base = ${JSON.stringify(base)};
      const m = location.hash.match(/v=(-?[\\d.]+),(-?[\\d.]+),([\\d.]+)/);
      const view = m
        ? { mapCenter: [parseFloat(m[1]), parseFloat(m[2])], mapZoom: parseFloat(m[3]) }
        : {};
      const state = Object.assign({}, base, view);
      localStorage.setItem(
        'kreni-settings',
        JSON.stringify({ state, version: ${SETTINGS_VERSION} })
      );
      localStorage.setItem('theme', ${JSON.stringify(theme)});
      document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});
    })();
  `;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
