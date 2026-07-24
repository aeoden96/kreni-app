/**
 * Match free-form Croatian stop-name strings (as they appear in ZET service
 * alerts' `affectedStops`) to GTFS stop ids.
 *
 * The alert strings are colloquial/full names ("Trg žrtava fašizma",
 * "Desprimska ulica"), while GTFS `stop_name`s are inconsistent and heavily
 * abbreviated ("Trg žrt. fašizma", "Lj.Posavsk.-Kelekova", "Puškarićeva-škola").
 * Matching is therefore tiered and best-effort — an unmatched alert stop simply
 * yields no ids (the caller shows no indicator, exactly as before this feature).
 *
 * Measured on the real alert archive (57 stop mentions vs 1,199 GTFS names):
 * ~65% exact, ~84% with the cleanup + guarded-fuzzy tiers below.
 *
 * The fuzzy tier deliberately does NOT match by bare prefix (that wrongly maps
 * "Sljeme" → "Sljemenska"); prefix-expansion is allowed only for GTFS tokens
 * that were dotted abbreviations, otherwise a Levenshtein similarity floor.
 */

import type { Stop } from './gtfs';

import { normalize } from './searchUtils';

/** Generic suffix words that carry no disambiguating value in a stop name. */
const STOPWORDS = new Set(['av', 'avenija', 'cesta', 'ceste', 'ul', 'ulica']);
const TOKEN_SPLIT = /[\s.-]+/;
/** Captures the stem of a dotted abbreviation, e.g. "žrt." → "zrt". */
const ABBREV_RE = /([a-z0-9]+)\./g;
const SIM_THRESHOLD = 0.86;
const MIN_TOKEN_LEN = 2;
/** A candidate GTFS name must have ≥ this share of its own tokens matched. */
const MIN_GTFS_COVERAGE = 0.5;

export interface StopNameIndex {
  /** cleanup-key → stop ids */
  clean: Map<string, string[]>;
  /** one entry per distinct normalized name, for the fuzzy tier */
  entries: GtfsEntry[];
  /** normalized name → stop ids */
  exact: Map<string, string[]>;
}

interface GtfsEntry {
  ids: string[];
  stems: Set<string>;
  tokens: string[];
}

/** Build the lookup index once from the loaded stops (memoize at the call site). */
export function buildStopNameIndex(stops: Stop[]): StopNameIndex {
  const exact = new Map<string, string[]>();
  const clean = new Map<string, string[]>();
  const byName = new Map<string, GtfsEntry>();
  for (const s of stops) {
    if (!s.name) continue;
    const norm = normalize(s.name);
    push(exact, norm, s.id);
    const ck = cleanKey(norm);
    if (ck) push(clean, ck, s.id);
    let entry = byName.get(norm);
    if (!entry) {
      entry = { ids: [], stems: abbrevStems(norm), tokens: tokensOf(norm) };
      byName.set(norm, entry);
    }
    entry.ids.push(s.id);
  }
  return { clean, entries: [...byName.values()], exact };
}

/**
 * Resolve one alert stop-name string to GTFS stop ids (all platforms of the
 * matched name). Returns [] when nothing matches confidently.
 */
export function matchStopName(alertName: string, index: StopNameIndex): string[] {
  const norm = normalize(alertName);

  const exact = index.exact.get(norm);
  if (exact) return exact;

  const ck = cleanKey(norm);
  if (ck) {
    const cleaned = index.clean.get(ck);
    if (cleaned) return cleaned;
  }

  const alertToks = tokensOf(norm);
  if (alertToks.length === 0) return [];

  let best: GtfsEntry | null = null;
  let bestCov = 0;
  for (const entry of index.entries) {
    if (entry.tokens.length === 0) continue;
    // Every alert token must match some GTFS token of this candidate.
    if (!alertToks.every((a) => entry.tokens.some((g) => tokenMatches(a, g, entry.stems)))) {
      continue;
    }
    const cov =
      entry.tokens.filter((g) => alertToks.some((a) => tokenMatches(a, g, entry.stems))).length /
      entry.tokens.length;
    if (cov >= MIN_GTFS_COVERAGE && cov > bestCov) {
      bestCov = cov;
      best = entry;
    }
  }
  return best ? best.ids : [];
}

/** Stems that appeared as dotted abbreviations in an already-normalized name. */
function abbrevStems(norm: string): Set<string> {
  const set = new Set<string>();
  for (const m of norm.matchAll(ABBREV_RE)) set.add(m[1]);
  return set;
}

/** Cleanup key: house numbers stripped, hyphen/space unified, stopwords dropped. */
function cleanKey(norm: string): string {
  return tokensOf(norm.replace(/\s+\d+.*$/, '')).join(' ');
}

function push(map: Map<string, string[]>, key: string, id: string): void {
  const arr = map.get(key);
  if (arr) arr.push(id);
  else map.set(key, [id]);
}

/** Normalized Levenshtein similarity in [0,1], with a cheap length-gap bailout. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  const max = Math.max(la, lb);
  if (Math.abs(la - lb) / max > 0.4) return 0;
  const prev = new Array<number>(lb + 1);
  const cur = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    for (let j = 1; j <= lb; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    for (let j = 0; j <= lb; j++) prev[j] = cur[j];
  }
  return 1 - prev[lb] / max;
}

/** Does an alert token match a GTFS token — equal, abbrev-expansion, or near-equal? */
function tokenMatches(alertTok: string, gtfsTok: string, gtfsStems: Set<string>): boolean {
  if (alertTok === gtfsTok) return true;
  // Abbreviation expansion, e.g. GTFS "zrt." ← alert "zrtava". Guarded: only when
  // the GTFS token really was a dotted abbreviation, never a bare prefix.
  if (gtfsStems.has(gtfsTok) && gtfsTok.length >= 2 && alertTok.startsWith(gtfsTok)) return true;
  return similarity(alertTok, gtfsTok) >= SIM_THRESHOLD;
}

/** Content tokens of an already-normalized name (numbers + stopwords dropped). */
function tokensOf(norm: string): string[] {
  return norm
    .split(TOKEN_SPLIT)
    .filter((t) => t.length >= MIN_TOKEN_LEN && !/^\d+$/.test(t) && !STOPWORDS.has(t));
}
