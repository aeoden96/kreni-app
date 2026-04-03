#!/usr/bin/env node
/**
 * generate-release-notes.mjs
 *
 * Reads public/changelog.json, fetches the currently deployed release-notes.json
 * from kreni.app to avoid retranslating existing releases, and calls Ollama (gemma3:12b)
 * to generate user-friendly changelogs for HR, EN, and DE.
 *
 * Required env vars:
 *   OLLAMA_API_KEY
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.resolve(__dirname, '..');
const publicPath = path.resolve(rootPath, 'public');
const distPath = path.resolve(rootPath, 'dist');

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const OLLAMA_API_URL = 'https://ollama.com/api/chat';
const OLLAMA_MODEL = 'gemma3:12b';
const LIVE_NOTES_URL = 'https://kreni.app/release-notes.json';

const PROMPT_TEMPLATE = `You rewrite technical changelog lines for a public transit app (Zagreb) into plain language for end users.

Input: a JSON array of short technical change strings. Your output must stay VERY compact — do not invent details, do not add marketing fluff, and do not expand beyond what the input implies.

Rules:
- Output one bullet per input line unless two lines are clearly the same topic (then merge into one bullet). Never output more bullets than the input has lines.
- Each bullet: ONE short phrase or single sentence, max ~15 words. No second sentences, no clauses that restate the same idea.
- Title: max 6 words, optional one leading emoji. No subtitle, no punctuation beyond maybe an exclamation if natural.
- Strip jargon (GTFS, React, refactored, commits, API names) but keep the same meaning; do not introduce new features or benefits not hinted in the input.
- Omit '[FORCE]' and issue numbers like '#24' everywhere.
- Bug fixes: short positive wording (e.g. "Nearby vehicles display correctly").
- Optional: one small emoji at the start of a bullet if it fits (🚲 🚌 ✨); skip if unsure.
- Language for all strings: {TARGET_LANG}

Return ONLY valid JSON:
{
  "title": "...",
  "changes": ["...", "..."]
}

No markdown fences, no commentary.`;

async function fetchLiveNotes() {
  console.log(`[release-notes] Fetching live notes from ${LIVE_NOTES_URL}...`);
  try {
    const res = await fetch(`${LIVE_NOTES_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) {
      console.log(`[release-notes] Live notes not found or error (${res.status}). Starting fresh.`);
      return [];
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      console.log(`[release-notes] Successfully loaded ${data.length} existing releases.`);
      return data;
    }
    return [];
  } catch (err) {
    console.warn(`[release-notes] Failed to fetch live notes: ${err.message}. Starting fresh.`);
    return [];
  }
}

async function main() {
  const changelogPath = path.resolve(publicPath, 'changelog.json');
  if (!fs.existsSync(changelogPath)) {
    console.error(
      `[release-notes] public/changelog.json not found! Run generate-changelog.js first.`
    );
    process.exit(1);
  }

  const rawChangelog = JSON.parse(fs.readFileSync(changelogPath, 'utf-8'));
  const liveNotes = await fetchLiveNotes();
  const liveNotesMap = new Map(liveNotes.map((n) => [n.version, n]));

  const mergedNotes = [];

  for (const release of rawChangelog) {
    if (liveNotesMap.has(release.version)) {
      console.log(`[release-notes] Version ${release.version} already translated. Skipping.`);
      mergedNotes.push(liveNotesMap.get(release.version));
      continue;
    }

    console.log(`[release-notes] Translating version ${release.version}...`);

    // If there are no changes or it's just an empty fallback, provide defaults
    if (!release.changes || release.changes.length === 0) {
      mergedNotes.push({
        de: {
          changes: ['Fehlerbehebungen und Leistungsverbesserungen.'],
          title: 'Kleine Updates ✨',
        },
        en: { changes: ['Bug fixes and performance improvements.'], title: 'Minor Updates ✨' },
        force: release.force,
        hr: {
          changes: ['Ispravke grešaka i poboljšanja performansi.'],
          title: 'Manja ažuriranja ✨',
        },
        version: release.version,
      });
      continue;
    }

    let deData, enData, hrData;
    try {
      hrData = await translateWithLlm(release.version, release.changes, 'hr');
      enData = await translateWithLlm(release.version, release.changes, 'en');
      deData = await translateWithLlm(release.version, release.changes, 'de');
    } catch (err) {
      console.error(`[release-notes] Error translating v${release.version}:`, err.message);
      // Fallback
      hrData = { changes: release.changes, title: 'Ažuriranje' };
      enData = { changes: release.changes, title: 'Update' };
      deData = { changes: release.changes, title: 'Aktualisieren' };
    }

    mergedNotes.push({
      de: deData,
      en: enData,
      force: release.force,
      hr: hrData,
      version: release.version,
    });
  }

  const outputJson = JSON.stringify(mergedNotes, null, 2);

  const publicOutPath = path.resolve(publicPath, 'release-notes.json');
  fs.writeFileSync(publicOutPath, outputJson);
  console.log(`[release-notes] Wrote ${mergedNotes.length} releases to ${publicOutPath}`);

  if (fs.existsSync(distPath)) {
    const distOutPath = path.resolve(distPath, 'release-notes.json');
    fs.writeFileSync(distOutPath, outputJson);
    console.log(`[release-notes] Wrote ${mergedNotes.length} releases to ${distOutPath}`);
  }
}

async function translateWithLlm(version, changes, targetLang) {
  if (!OLLAMA_API_KEY) {
    console.warn(`[release-notes] OLLAMA_API_KEY not set. Using raw changes for ${targetLang}.`);
    return {
      changes: changes,
      title: `Update v${version} (${targetLang.toUpperCase()})`,
    };
  }

  const systemPrompt = PROMPT_TEMPLATE.replace(
    '{TARGET_LANG}',
    targetLang === 'hr' ? 'Croatian' : targetLang === 'de' ? 'German' : 'English'
  );
  const userContent = JSON.stringify(changes, null, 2);

  console.log(`[release-notes]   - Calling Ollama for ${targetLang.toUpperCase()}...`);
  const res = await fetch(OLLAMA_API_URL, {
    body: JSON.stringify({
      format: 'json',
      messages: [
        { content: systemPrompt, role: 'system' },
        { content: userContent, role: 'user' },
      ],
      model: OLLAMA_MODEL,
      options: { num_predict: 800, temperature: 0.1 },
      stream: false,
    }),
    headers: {
      Authorization: `Bearer ${OLLAMA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const content = json.message?.content;
  if (!content) throw new Error('Empty response from Ollama');

  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

main().catch((err) => {
  console.error('[release-notes] Fatal error:', err);
  process.exit(1);
});
