import { describe, expect, it } from 'vitest';

import { createStaticTripResolver } from './staticTripResolver';

// Shapes taken from the real feeds: static publishes services 0_4–0_14 while
// realtime runs entirely on 0_40, so no live ID is ever present verbatim.
const TODAY = '0_4';
const YESTERDAY = '0_14';

const staticId = (service: string, seq: string) => `${service}_601_6_${seq}`;
const liveId = (seq: string) => `0_40_601_6_${seq}`;

describe('createStaticTripResolver', () => {
  it('resolves a live ID onto the static trip in the active service', () => {
    const resolver = createStaticTripResolver(
      [staticId(TODAY, '10022'), staticId('0_9', '10022')],
      [TODAY]
    );
    expect(resolver.resolve(liveId('10022'))).toBe(staticId(TODAY, '10022'));
  });

  it('prefers an exact hit, so it is a no-op once the feeds realign', () => {
    const exact = staticId(TODAY, '10022');
    const resolver = createStaticTripResolver([exact], [TODAY]);
    expect(resolver.resolve(exact)).toBe(exact);
  });

  it('never crosses into a service that is not live', () => {
    // Same trip key, but only published under a service nobody asked for.
    const resolver = createStaticTripResolver([staticId('0_9', '10022')], [TODAY]);
    expect(resolver.resolve(liveId('10022'))).toBeUndefined();
  });

  it('consults services in order, so today wins over yesterday', () => {
    const resolver = createStaticTripResolver(
      [staticId(YESTERDAY, '10022'), staticId(TODAY, '10022')],
      [TODAY, YESTERDAY]
    );
    expect(resolver.resolve(liveId('10022'))).toBe(staticId(TODAY, '10022'));
  });

  it('falls through to yesterday for trips running past midnight', () => {
    const resolver = createStaticTripResolver(
      [staticId(YESTERDAY, '10022'), staticId(TODAY, '99999')],
      [TODAY, YESTERDAY]
    );
    expect(resolver.resolve(liveId('10022'))).toBe(staticId(YESTERDAY, '10022'));
  });

  it('degrades to exact-only rather than guessing when no service is known', () => {
    const exact = staticId(TODAY, '10022');
    const resolver = createStaticTripResolver([exact], [null]);
    expect(resolver.resolve(exact)).toBe(exact);
    expect(resolver.resolve(liveId('10022'))).toBeUndefined();
  });

  it('drops a key reachable from two static trips', () => {
    // Unreachable with well-formed two-segment service IDs — prefix plus key is
    // the whole ID, so a duplicate would have to be the same string. A truncated
    // prefix is what makes it possible, and it must not silently pick one.
    const resolver = createStaticTripResolver(['0_4_601_6_1', '0_9_601_6_1'], ['0']);
    expect(resolver.resolve('0_40_601_6_1')).toBeUndefined();
  });

  it('does not let a service prefix match a longer one', () => {
    // '0_4' must not swallow '0_40'; the trailing separator is what prevents it.
    const resolver = createStaticTripResolver(['0_40_601_6_1'], [TODAY]);
    expect(resolver.resolve('0_40_601_6_2')).toBeUndefined();
  });

  it('ignores off-shape IDs instead of best-guessing', () => {
    const resolver = createStaticTripResolver([staticId(TODAY, '10022')], [TODAY]);
    expect(resolver.resolve('nonsense')).toBeUndefined();
    expect(resolver.resolve('')).toBeUndefined();
  });

  it('handles an empty static collection', () => {
    expect(createStaticTripResolver([], [TODAY]).resolve(liveId('1'))).toBeUndefined();
  });
});
