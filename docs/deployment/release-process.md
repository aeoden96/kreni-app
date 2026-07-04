---
tags: [area/deployment, type/reference]
status: current
updated: 2026-07-04
---

# Release process

Versioning and changelog generation are handled by **release-please**, driven entirely by Conventional Commits — enforced locally via `commitlint.config.mjs` (extends `@commitlint/config-conventional`) and the husky `commit-msg` hook (see [[tooling-and-hooks]]).

## Configuration

There is **no `release-please-config.json` or `.release-please-manifest.json`** in the repo. `release-please.yml` uses `googleapis/release-please-action@v5` with only `release-type: node` inline — so release-please falls back to reading/bumping the version directly in `package.json` and generating `CHANGELOG.md` at repo root. This is single-package versioning; there's no manifest-based multi-package configuration (consistent with this not being a monorepo — see [[overview]]).

## Flow

1. Conventional-commit PRs merge to `master`.
2. `release-please.yml` (triggered on every push to master) opens/updates a release PR that bumps `package.json`'s version and appends to `CHANGELOG.md`.
3. Merging that release PR triggers `release_created`, which:
   - Runs the `deploy` job → calls `deploy.yml` with `secrets: inherit` — see [[cloudflare-pages-deploy]].
   - Runs the `translate-notes` job → `node scripts/generate-changelog.js` then `node scripts/generate-release-notes.mjs`, producing rider-facing HR/EN/DE release notes via Ollama (see [[ollama-integration]]), auto-committed to `public/release-notes.json`.

Recent release history (from `CHANGELOG.md`): 3.2.0 → 3.3.0 → 3.4.0 (current, "train view improvements", 2026-06-21) — consistent with `package.json`'s `"version": "3.4.0"`, no drift detected.

> [!note] `--no-verify` is intentional here, not a shortcut
> The `translate-notes` job's auto-commit uses `--no-verify` because release-please's branch names contain no `/`, which would otherwise fail the `branch-name-lint` pre-push hook (see [[tooling-and-hooks]]). This is the one place in the repo where skipping hooks is deliberate and documented, not a workaround to avoid.
