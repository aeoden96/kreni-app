/**
 * E2E tests for the live vehicle realtime feed.
 *
 * These tests use page.route() to intercept the GTFS-RT proxy calls and
 * return a synthetic protobuf binary, making the realtime store believe real
 * vehicles are running.
 *
 * Prerequisites (handled by playwright.config.ts webServer.env):
 *   VITE_GTFS_PROXY_URL=http://localhost:9999
 * Without this the store throws before fetching and page.route() never fires.
 *
 * NOTE on trip/service IDs:
 *   The vehicles mock passes any tripId.  The realtimeStore stores positions
 *   keyed by tripId regardless of whether the trip appears in today's service
 *   calendar.  The `mapRealtimeToVehiclePositions` helper (used by the single-
 *   route view) *does* filter by active trips, so vehicle counts in the route
 *   info bar depend on which service IDs are active for the test run date.
 *   The tests below are written to be date-independent:
 *     - Test 1 checks the store fetched successfully (success badge)
 *     - Test 2 checks no [RealtimeStore] error appears in the console
 */

import { test, expect } from './fixtures';
import { interceptRealtimeFeed } from './realtime-mock';

// A valid static route ID that exists in all GTFS snapshots
const MOCK_ROUTE_ID = '1';
// A stable trip ID string — the store ingests it regardless of service calendar
const MOCK_TRIP_ID = 'mock-realtime-trip-001';

test.describe('realtime vehicle feed', () => {
  test('data status shows success badge when proxy returns a valid feed', async ({
    page,
  }) => {
    // Register the intercept BEFORE navigating so the very first poll is mocked.
    await interceptRealtimeFeed(page, [
      {
        vehicleId: 'tram-101',
        tripId: MOCK_TRIP_ID,
        routeId: MOCK_ROUTE_ID,
        lat: 45.815,
        lng: 15.982,
      },
    ]);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // "ZET podaci stari Xs" button only appears when the realtime store fetched
    // successfully.  Its presence proves the entire mock→decode→render pipeline
    // is working.
    await expect(
      page.getByRole('button', { name: /ZET podaci stari/ }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('no [RealtimeStore] console errors when proxy mock is active', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];

    await interceptRealtimeFeed(page, [
      {
        vehicleId: 'tram-102',
        tripId: MOCK_TRIP_ID,
        routeId: MOCK_ROUTE_ID,
        lat: 45.812,
        lng: 15.978,
      },
    ]);

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for the store's first fetch cycle to complete
    await expect(
      page.getByRole('button', { name: /ZET podaci stari/ }),
    ).toBeVisible({ timeout: 10_000 });

    // With the mock intercepting all localhost:9999 requests, the
    // "[RealtimeStore] Fetch failed" error must not appear.
    const realtimeErrors = consoleErrors.filter((e) => e.includes('[RealtimeStore]'));
    expect(realtimeErrors).toHaveLength(0);
  });
});
