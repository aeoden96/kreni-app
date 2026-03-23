#!/usr/bin/env node
/**
 * parse-service-alerts.mjs
 *
 * Fetches the ZET RSS feed, diffs against the current Cloudflare KV state,
 * calls Ollama (gemma3:12b) for any new items, and writes the result to KV.
 *
 * Required env vars:
 *   OLLAMA_API_KEY          – Ollama Cloud API key (https://ollama.com)
 *   CF_ACCOUNT_ID           – Cloudflare account ID
 *   CF_KV_NAMESPACE_ID      – KV namespace ID bound as KV_SERVICE_ALERTS
 *   CF_API_TOKEN            – Cloudflare API token with KV write permission
 */

import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RSS_URL = 'https://www.zet.hr/rss_promet.aspx';
const KV_KEY = 'service-alerts';

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_KV_NAMESPACE_ID = process.env.CF_KV_NAMESPACE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

// ---------------------------------------------------------------------------
// Types (JSDoc only – script is plain JS)
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   id: string,
 *   guid: string,
 *   title: string,
 *   lines: string[],
 *   type: 'route-change'|'stop-change'|'cancellation'|'new-service'|'other',
 *   startDate: string|null,
 *   endDate: string|null,
 *   affectedStops: string[],
 *   summary: string,
 *   pubDate: string,
 *   url: string,
 *   processedAt: string,
 * }} ServiceAlert
 */

// ---------------------------------------------------------------------------
// RSS fetching & parsing (no external deps)
// ---------------------------------------------------------------------------

/** Extract CDATA content from a tag */
function extractCdata(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, 'i'));
  return m ? m[1] : null;
}

/** Extract plain text content from a tag (no CDATA) */
function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
  return m ? m[1] : null;
}

/** @returns {Promise<{guid:string, title:string, description:string, link:string, pubDate:string}[]>} */
async function fetchRssItems() {
  const res = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'Kreni-ServiceAlerts/1.0' },
  });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const xml = await res.text();

  const items = [];
  // Split on <item> boundaries
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of itemMatches) {
    const block = match[1];
    const title = extractCdata(block, 'title') ?? extractTag(block, 'title') ?? '';
    const description =
      extractCdata(block, 'description') ?? extractTag(block, 'description') ?? '';
    const link = extractTag(block, 'link') ?? '';
    const pubDate = extractTag(block, 'pubDate') ?? '';
    const guid = extractTag(block, 'guid') ?? link;
    items.push({
      description,
      guid: guid.trim(),
      link: link.trim(),
      pubDate: pubDate.trim(),
      title: title.trim(),
    });
  }
  return items;
}

function makeId(guid) {
  return createHash('md5').update(guid).digest('hex').slice(0, 12);
}

// ---------------------------------------------------------------------------
// Stable ID from guid
// ---------------------------------------------------------------------------

/** Strip HTML tags and collapse whitespace */
function stripHtml(html) {
  if (!html) return '';

  // 1. Remove script/style tags entirely
  let text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');

  // 2. Map common block tags to newlines before stripping
  text = text.replace(/<(p|br|div|tr|li|h[1-6])[^>]*>/gi, '\n');

  // 3. Strip all remaining tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 4. Decode HTML entities in a single pass to avoid double-unescaping (CodeQL: js/double-escaping)
  const entities = {
    '&amp;': '&', // Decoded last in the map
    '&apos;': "'",
    '&gt;': '>',
    '&lt;': '<',
    '&nbsp;': ' ',
    '&quot;': '"',
  };

  text = text.replace(/&(?:nbsp|lt|gt|quot|apos|amp);/g, (match) => entities[match]);

  // 5. Cleanup numeric entities and collapse whitespace
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// OpenAI structured parsing
// ---------------------------------------------------------------------------

// Ollama Cloud endpoint
const OLLAMA_API_URL = 'https://ollama.com/api/chat';
// gemma3:12b – strong multilingual (incl. Croatian), reliable JSON output, ~24 GB.
// Other good options from https://ollama.com/api/tags:
//   ministral-3:14b  (~16 GB, Mistral multilingual)
//   gpt-oss:20b      (~14 GB, smaller/faster)
const OLLAMA_MODEL = 'gemma3:12b';

const SYSTEM_PROMPT = `Ti si parser podataka o prometu za ZET (Zagrebački električni tramvaj).
Primaš obavijest o prometu na hrvatskom jeziku (naslov + opis u plain-textu).
Izdvoji strukturirane podatke i vrati SAMO valjani JSON s točno ovim ključevima:
{
  "lines": ["6", "7"],          // brojevi tramvajskih/autobusnih linija (stringovi)
  "type": "route-change",        // jedno od: route-change, stop-change, cancellation, new-service, other
  "startDate": "2026-03-02",     // ISO 8601 datum ili null
  "endDate": "2026-03-09",       // ISO 8601 datum ili null
  "affectedStops": ["Zapruđe"], // nazivi stajališta (zadrži hrvatska imena)
  "summary": "..."}              // sažetak od 1-2 rečenice NA HRVATSKOM JEZIKU

Vrijednosti za type:
- route-change: izmjena trase ili preusmjeravanje
- stop-change: stajalište premješteno, zatvoreno ili privremeno izmješteno
- cancellation: usluga obustavljena ili zamijenjena (npr. autobusi umjesto tramvaja)
- new-service: nova linija ili produžena usluga
- other: ostalo

Vrati SAMO JSON objekt. Bez markdowna, bez objašnjenja.`;

async function main() {
  console.log('Fetching ZET RSS feed…');
  const rssItems = await fetchRssItems();
  console.log(`  ${rssItems.length} items in feed`);

  // Load existing alerts from KV (source of truth)
  /** @type {{ alerts: ServiceAlert[], lastUpdate: string }} */
  console.log('Reading existing alerts from KV…');
  const kvExisting = await readFromKv();
  const existing = kvExisting ?? { alerts: [], lastUpdate: new Date(0).toISOString() };
  if (!kvExisting) console.log('  No existing KV data – starting fresh');

  const existingIds = new Set(existing.alerts.map((a) => a.guid));
  const newItems = rssItems.filter((item) => !existingIds.has(item.guid));
  console.log(`  ${newItems.length} new item(s) to process`);

  const newAlerts = /** @type {ServiceAlert[]} */ ([]);

  for (const item of newItems) {
    console.log(`  Parsing: ${item.title}`);
    const plain = stripHtml(item.description);
    let parsed;
    try {
      parsed = await parsWithLlm(item.title, plain);
    } catch (err) {
      console.error(`  LLM error for "${item.title}":`, err.message);
      parsed = {
        affectedStops: [],
        endDate: null,
        lines: [],
        startDate: null,
        summary: item.title,
        type: 'other',
      };
    }

    newAlerts.push({
      affectedStops: parsed.affectedStops,
      endDate: parsed.endDate,
      guid: item.guid,
      id: makeId(item.guid),
      lines: parsed.lines,
      processedAt: new Date().toISOString(),
      pubDate: item.pubDate,
      startDate: parsed.startDate,
      summary: parsed.summary,
      title: item.title,
      type: /** @type {any} */ (parsed.type),
      url: item.link,
    });
  }

  // Merge: new alerts first (most recent at top), then existing
  const merged = [...newAlerts, ...existing.alerts];

  // Keep only guids that still appear in the feed (prune removed items)
  const feedGuids = new Set(rssItems.map((i) => i.guid));
  const pruned = merged.filter((a) => feedGuids.has(a.guid));

  const output = {
    alerts: pruned,
    lastUpdate: new Date().toISOString(),
  };

  if (newAlerts.length > 0 || pruned.length !== existing.alerts.length) {
    await writeToKv(output);
  } else {
    console.log('No changes – skipping KV write');
  }
}

// ---------------------------------------------------------------------------
// Cloudflare KV write-back
// ---------------------------------------------------------------------------

/**
 * @param {string} title
 * @param {string} plainDescription
 * @returns {Promise<{lines:string[], type:string, startDate:string|null, endDate:string|null, affectedStops:string[], summary:string}>}
 */
async function parsWithLlm(title, plainDescription) {
  if (!OLLAMA_API_KEY) {
    console.warn('OLLAMA_API_KEY not set – skipping LLM parse, using defaults');
    return {
      affectedStops: [],
      endDate: null,
      lines: [],
      startDate: null,
      summary: title,
      type: 'other',
    };
  }

  const userContent = `Title: ${title}\n\nDescription: ${plainDescription.slice(0, 2000)}`;

  const res = await fetch(OLLAMA_API_URL, {
    body: JSON.stringify({
      // Ollama JSON mode: instructs the model to respond with valid JSON
      format: 'json',
      messages: [
        { content: SYSTEM_PROMPT, role: 'system' },
        { content: userContent, role: 'user' },
      ],
      model: OLLAMA_MODEL,
      options: { temperature: 0 },
      stream: false,
    }),
    headers: {
      Authorization: `Bearer ${OLLAMA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  // Ollama chat response: { message: { role, content } }
  const content = json.message?.content;
  if (!content) throw new Error('Empty Ollama response');

  // Strip accidental markdown fences if the model adds them
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

async function readFromKv() {
  if (!CF_ACCOUNT_ID || !CF_KV_NAMESPACE_ID || !CF_API_TOKEN) return null;
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}/values/${KV_KEY}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.warn(`KV read failed ${res.status} – treating as empty`);
    return null;
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function writeToKv(payload) {
  if (!CF_ACCOUNT_ID || !CF_KV_NAMESPACE_ID || !CF_API_TOKEN) {
    console.warn('CF KV env vars not set – cannot write to KV');
    return;
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}/values/${KV_KEY}`;
  const res = await fetch(url, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    method: 'PUT',
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`KV write failed ${res.status}: ${err}`);
  } else {
    console.log('✓ Written to Cloudflare KV');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
