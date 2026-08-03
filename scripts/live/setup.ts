/**
 * Minimal browser shims for the live checks.
 *
 * These import production modules, and `utils/gtfs` pulls in the IndexedDB-backed
 * data cache at module scope. Nothing here uses the cache — the checks fetch over
 * the network directly — but the import has to succeed, so a real in-memory
 * IndexedDB is cheaper than stubbing the shape idb-keyval expects.
 *
 * Kept separate from `src/test/setup.ts`, which assumes jsdom and reaches for
 * `window`.
 */

import 'fake-indexeddb/auto';
