import { describe, expect, it } from 'vitest';

import type { Route, Stop } from '../utils/gtfs';

import { buildStopNameIndex } from '../utils/stopNameMatch';
import { convertToServiceAlerts } from './useRssServiceAlerts';

/** Minimal Route/Stop factories — only the fields the converter reads. */
function route(shortName: string, id: string, type = 0): Route {
  return { id, longName: `${shortName} long`, shortName, type };
}

function stop(name: string, id: string): Stop {
  return { code: id, id, lat: 0, locationType: 0, lon: 0, name, parentStation: null };
}

const ROUTES = new Map<string, Route>([
  ['r4', route('4', 'r4')],
  ['r7', route('7', 'r7')],
]);
// Two platforms share the "Zagrepčanka" name, as real GTFS stops routinely do.
const STOP_INDEX = buildStopNameIndex([
  stop('Zagrepčanka', 'zag_1'),
  stop('Zagrepčanka', 'zag_2'),
  stop('Zvonimirova', 'zvo_1'),
]);

/** A fully-populated alert, as the parser emits when the model behaves. */
const COMPLETE = {
  affectedStops: ['Zagrepčanka'],
  endDate: '2026-07-27',
  guid: 'http://www.zet.hr/default.aspx?id=10089',
  id: '57cc10bff4ed',
  lines: ['4'],
  processedAt: '2026-07-24T23:29:06.236Z',
  pubDate: 'Fri, 24 Jul 2026 14:00:00 +0200',
  startDate: '2026-07-24',
  summary: 'Tramvajska linija 4 vozi izmijenjenom trasom.',
  title: 'Vikend izmjene na tramvajskoj liniji 4',
  type: 'route-change' as const,
  url: 'https://www.zet.hr/default.aspx?id=10089',
};

/**
 * The record that actually shipped in KV on 2026-07-24: the model returned
 * parseable JSON that omitted every derived key, so `lines`/`affectedStops`/
 * `summary`/`type` are absent from the wire payload entirely.
 */
const PARTIAL = {
  endDate: null,
  guid: 'http://www.zet.hr/default.aspx?id=9564',
  id: 'af0712d9dcc3',
  processedAt: '2026-07-24T23:29:20.608Z',
  pubDate: 'Mon, 20 Jul 2026 12:00:00 +0200',
  startDate: null,
  title: 'Izmjene na noćnim tramvajskim linijama',
  url: 'https://www.zet.hr/default.aspx?id=9564',
};

describe('convertToServiceAlerts', () => {
  it('maps a complete alert onto routes and stops', () => {
    const [alert] = convertToServiceAlerts([COMPLETE], ROUTES, STOP_INDEX);

    expect(alert.id).toBe('rss-57cc10bff4ed');
    expect(alert.effect).toBe('DETOUR');
    expect(alert.routeIds).toEqual(['r4']);
    expect(alert.stopIds).toEqual(['zag_1', 'zag_2']);
    expect(alert.description).toBe(COMPLETE.summary);
  });

  it('groups stops by name, keeping every platform the name resolved to', () => {
    const multi = { ...COMPLETE, affectedStops: ['Zagrepčanka', 'Zvonimirova'] };
    const [alert] = convertToServiceAlerts([multi], ROUTES, STOP_INDEX);

    // One entry per name — that is one button per stop on the card.
    expect(alert.stops).toEqual([
      { ids: ['zag_1', 'zag_2'], name: 'Zagrepčanka' },
      { ids: ['zvo_1'], name: 'Zvonimirova' },
    ]);
    // stopIds stays the flattened union: the map badge layer still reads it.
    expect(alert.stopIds).toEqual(['zag_1', 'zag_2', 'zvo_1']);
  });

  it('drops stop names that resolve to no platform', () => {
    const unknown = { ...COMPLETE, affectedStops: ['Zagrepčanka', 'Nepostojeće stajalište'] };
    const [alert] = convertToServiceAlerts([unknown], ROUTES, STOP_INDEX);

    expect(alert.stops?.map((s) => s.name)).toEqual(['Zagrepčanka']);
  });

  it('keeps the rest of the batch when one record is missing derived fields', () => {
    // The regression: reading through the absent `lines` threw for the whole
    // map, the hook swallowed it, and every alert vanished from the panel.
    const converted = convertToServiceAlerts([COMPLETE, PARTIAL, COMPLETE], ROUTES, STOP_INDEX);

    expect(converted).toHaveLength(3);
  });

  it('defaults every LLM-derived field on a partial record', () => {
    const [alert] = convertToServiceAlerts([PARTIAL], ROUTES, STOP_INDEX);

    expect(alert.routeIds).toEqual([]);
    expect(alert.stopIds).toEqual([]);
    expect(alert.stops).toEqual([]);
    expect(alert.effect).toBe('OTHER_EFFECT');
    // No summary — fall back to the title so the card still reads as something.
    expect(alert.description).toBe('Izmjene na noćnim tramvajskim linijama');
    expect(alert.header).toBe('Izmjene na noćnim tramvajskim linijama');
    expect(alert.activeSince).toBeNull();
    expect(alert.activeUntil).toBeNull();
  });

  it('does not hide alerts whose endDate is in the past', () => {
    // Feed presence is ZET's own curation; parsed dates are informational.
    const stale = { ...COMPLETE, endDate: '2020-01-02', startDate: '2020-01-01' };

    expect(convertToServiceAlerts([stale], ROUTES, STOP_INDEX)).toHaveLength(1);
  });

  it('drops line numbers that match no known route without dropping the alert', () => {
    const unknownLine = { ...COMPLETE, lines: ['4', '999'] };
    const [alert] = convertToServiceAlerts([unknownLine], ROUTES, STOP_INDEX);

    expect(alert.routeIds).toEqual(['r4']);
  });
});
