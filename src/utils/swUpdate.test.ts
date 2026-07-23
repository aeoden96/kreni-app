import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UpdatableRegistration } from './swUpdate';

import { startSwUpdateChecks } from './swUpdate';

function makeRegistration(overrides: Partial<UpdatableRegistration> = {}) {
  return {
    installing: null,
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as UpdatableRegistration & { update: ReturnType<typeof vi.fn> };
}

/**
 * Let the promise chain inside `check` settle. Fake timers are active, so a
 * setTimeout-based flush would never fire — drain the microtask queue instead.
 */
const flush = () => vi.advanceTimersByTimeAsync(0);

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('startSwUpdateChecks', () => {
  let stop: (() => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 } as Response));
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not check on start — registration has just happened', () => {
    const r = makeRegistration();
    stop = startSwUpdateChecks('/sw.js', r);

    expect(fetch).not.toHaveBeenCalled();
    expect(r.update).not.toHaveBeenCalled();
  });

  it('checks once the interval elapses', async () => {
    const r = makeRegistration();
    stop = startSwUpdateChecks('/sw.js', r, { intervalMs: 1000 });

    await vi.advanceTimersByTimeAsync(1000);

    expect(fetch).toHaveBeenCalledWith('/sw.js', { cache: 'no-store' });
    expect(r.update).toHaveBeenCalledTimes(1);
  });

  // The regression that caused this file to exist: a resumed PWA never
  // navigates, so without this trigger it never discovers a new build.
  it('checks when the app returns to the foreground', async () => {
    const r = makeRegistration();
    stop = startSwUpdateChecks('/sw.js', r);

    setVisibility('visible');
    await flush();

    expect(r.update).toHaveBeenCalledTimes(1);
  });

  it('ignores the app going to the background', async () => {
    const r = makeRegistration();
    stop = startSwUpdateChecks('/sw.js', r);

    setVisibility('hidden');
    await flush();

    expect(r.update).not.toHaveBeenCalled();
  });

  it('does not call update when the script is not served', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404 } as Response));
    const r = makeRegistration();
    stop = startSwUpdateChecks('/sw.js', r, { intervalMs: 1000 });

    await vi.advanceTimersByTimeAsync(1000);

    expect(r.update).not.toHaveBeenCalled();
  });

  it('survives a failed probe and keeps checking', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ status: 200 } as Response);
    vi.stubGlobal('fetch', fetchMock);
    const r = makeRegistration();
    stop = startSwUpdateChecks('/sw.js', r, { intervalMs: 1000 });

    await vi.advanceTimersByTimeAsync(1000);
    expect(r.update).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(r.update).toHaveBeenCalledTimes(1);
  });

  it('skips the probe while offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    const r = makeRegistration();
    stop = startSwUpdateChecks('/sw.js', r, { intervalMs: 1000 });

    await vi.advanceTimersByTimeAsync(1000);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips while the browser is already installing an update', async () => {
    const r = makeRegistration({ installing: {} as ServiceWorker });
    stop = startSwUpdateChecks('/sw.js', r, { intervalMs: 1000 });

    await vi.advanceTimersByTimeAsync(1000);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('stops checking after teardown', async () => {
    const r = makeRegistration();
    const teardown = startSwUpdateChecks('/sw.js', r, { intervalMs: 1000 });

    teardown();
    await vi.advanceTimersByTimeAsync(5000);
    setVisibility('visible');
    await flush();

    expect(r.update).not.toHaveBeenCalled();
  });
});
