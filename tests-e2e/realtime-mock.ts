/**
 * Realtime feed mock helper for E2E tests.
 *
 * Usage:
 *   import { interceptRealtimeFeed } from './realtime-mock';
 *
 *   test('...', async ({ page }) => {
 *     await interceptRealtimeFeed(page, [
 *       { vehicleId: 'v1', tripId: '0_20_101_1_10007', routeId: '1', lat: 45.815, lng: 15.982 },
 *     ]);
 *     await page.goto('/');
 *     // The app calls http://localhost:9999/?endpoint=vehicle-positions
 *     // which page.route() intercepts and fulfills with the protobuf binary.
 *   });
 *
 * IMPORTANT: playwright.config.ts webServer.env must set
 *   VITE_GTFS_PROXY_URL: 'http://localhost:9999'
 * so the Vite-built app actually issues requests to localhost:9999 instead
 * of throwing early because the proxy URL is empty.
 */

import type { Page } from '@playwright/test';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';

interface MockVehicle {
  vehicleId: string;
  /** Must be a real trip_id from trips.txt so the store can enrich it. */
  tripId: string;
  /** Route short name, e.g. '1'. */
  routeId: string;
  lat: number;
  lng: number;
  bearing?: number;
}

/**
 * Registers a page.route() handler that intercepts every request to
 * http://localhost:9999/** and returns a GTFS-RT protobuf binary feed
 * containing the given vehicles.
 *
 * Call this *before* page.goto() so the handler is registered before
 * the app starts its first poll.
 */
export async function interceptRealtimeFeed(
  page: Page,
  vehicles: MockVehicle[],
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.create({
    header: {
      gtfsRealtimeVersion: '2.0',
      incrementality:
        GtfsRealtimeBindings.transit_realtime.FeedHeader.Incrementality.FULL_DATASET,
      timestamp: now,
    },
    entity: vehicles.map((v, i) => ({
      id: String(i + 1),
      vehicle: {
        trip: { tripId: v.tripId, routeId: v.routeId },
        position: {
          latitude: v.lat,
          longitude: v.lng,
          bearing: v.bearing ?? 0,
        },
        vehicle: { id: v.vehicleId },
        timestamp: now,
      },
    })),
  });

  const buffer = GtfsRealtimeBindings.transit_realtime.FeedMessage.encode(feed).finish();

  await page.route('http://localhost:9999/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: Buffer.from(buffer),
    });
  });
}
