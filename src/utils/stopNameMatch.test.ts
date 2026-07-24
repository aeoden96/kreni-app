import { describe, expect, it } from 'vitest';

import type { Stop } from './gtfs';

import { buildStopNameIndex, matchStopName } from './stopNameMatch';

/** Minimal Stop factory — only the fields the matcher reads (id, name). */
let seq = 0;
function stop(name: string, id?: string): Stop {
  return {
    code: String(++seq),
    id: id ?? `s${seq}`,
    lat: 0,
    locationType: 0,
    lon: 0,
    name,
    parentStation: null,
  };
}

// A fixture drawn from real GTFS names + the archived alert strings that exercise
// each tier and, crucially, the false-positive guard.
const STOPS: Stop[] = [
  stop('Britanski trg', 'brit_1'),
  stop('Britanski trg', 'brit_2'), // second platform of the same name
  stop('Zagrepčanka', 'zag_1'),
  stop('Desprimska', 'desp_1'),
  stop('Brezovička-ambulanta', 'brez_1'),
  stop('Mrkšina', 'mrk_1'),
  stop('Trg žrt. fašizma', 'tzf_1'),
  stop('Trg žrt. fašizma', 'tzf_2'),
  stop('Lj.Posavsk.-Kelekova', 'ljp_1'),
  stop('Savska', 'savska_1'),
  stop('Savski most', 'savski_1'),
  stop('Sljemenska', 'sljem_1'), // the guard trap for "Sljeme"
  stop('Puškarićeva-škola', 'pusk_1'),
];

const index = buildStopNameIndex(STOPS);

describe('matchStopName — exact tier', () => {
  it('matches an exact name and returns all its platforms', () => {
    expect(matchStopName('Britanski trg', index).sort()).toEqual(['brit_1', 'brit_2']);
  });

  it('matches ignoring diacritics/case', () => {
    expect(matchStopName('zagrepcanka', index)).toEqual(['zag_1']);
  });
});

describe('matchStopName — cleanup tier', () => {
  it('drops a generic "ulica" suffix', () => {
    expect(matchStopName('Desprimska ulica', index)).toEqual(['desp_1']);
  });

  it('unifies " - " with a hyphen', () => {
    expect(matchStopName('Brezovička - ambulanta', index)).toEqual(['brez_1']);
  });

  it('strips a house number + descriptor to the base street', () => {
    expect(matchStopName('Mrkšina 65 - crkva', index)).toEqual(['mrk_1']);
  });

  it('resolves "Savska cesta" to Savska, not Savski most', () => {
    expect(matchStopName('Savska cesta', index)).toEqual(['savska_1']);
  });
});

describe('matchStopName — guarded fuzzy tier', () => {
  it('expands a dotted abbreviation (žrt. ← žrtava)', () => {
    expect(matchStopName('Trg žrtava fašizma', index).sort()).toEqual(['tzf_1', 'tzf_2']);
  });

  it('matches an abbreviated intersection name', () => {
    expect(matchStopName('Ljudevita Posavskog-Kelekova', index)).toEqual(['ljp_1']);
  });
});

describe('matchStopName — false-positive guard', () => {
  it('does NOT match "Sljeme" to "Sljemenska" (bare prefix is rejected)', () => {
    expect(matchStopName('Sljeme', index)).toEqual([]);
  });

  it('returns [] for a name absent from GTFS', () => {
    expect(matchStopName('Avenija Marina Držića', index)).toEqual([]);
  });
});
