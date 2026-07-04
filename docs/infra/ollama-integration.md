---
tags: [area/infra, type/reference]
status: current
updated: 2026-07-04
---

# Ollama integration

Kreni uses an LLM (Ollama Cloud) in exactly two build/CI scripts — there is no LLM usage in the client at runtime.

## `scripts/parse-service-alerts.mjs`

Structures ZET's free-text Croatian RSS alerts into JSON (`{lines, type, startDate, endDate, affectedStops, summary}`). Called from `parse-service-alerts.yml` every 4 hours. Full pipeline: [[service-alerts]], trigger: [[scheduled-jobs]].

- Endpoint: `https://ollama.com/api/chat` (Ollama **Cloud**, not a self-hosted instance)
- `format: 'json'` mode + `temperature: 0` for deterministic structured output
- Croatian-language system prompt, strict output schema
- Falls back to a default `{type: 'other', summary: <title>}` record if `OLLAMA_API_KEY` is unset or the call fails — never blocks the pipeline

## `scripts/generate-release-notes.mjs`

Translates `public/changelog.json` (produced by `generate-changelog.js` from `CHANGELOG.md`) into rider-facing HR/EN/DE release notes, called once per new version from the `translate-notes` job in `release-please.yml` — see [[release-process]]. Skips versions already present in the live `release-notes.json` fetched from `kreni.app`, so it only translates genuinely new entries.

## Model: `gemma4:31b-cloud`

Both scripts were switched from `gemma3:12b` in commit `3714a23` ("chore: move Ollama scripts off deprecating gemma3 to gemma4:31b-cloud") because Ollama Cloud is deprecating gemma3. Comment in `parse-service-alerts.mjs`:

> "gemma4:31b-cloud – strong multilingual (incl. Croatian), reliable JSON output. gemma3 is being deprecated on Ollama Cloud; gemma4:cloud is the smaller/faster alternative."

> [!warning] Verify externally
> `gemma4:31b-cloud` is what's literally in this repo's source as of the commit above. It's outside this assistant's training data, so if you're auditing Ollama model availability/pricing, check Ollama's current model catalog directly rather than trusting this note's model name to stay accurate over time.

## Required env var

`OLLAMA_API_KEY` — Ollama Cloud API key, required in both scripts' environment (locally via `.env`, in CI via the `OLLAMA_API_KEY` GitHub secret). See [[environment-variables]].
