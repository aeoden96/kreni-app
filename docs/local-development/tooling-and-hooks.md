---
tags: [area/local-dev, type/reference]
status: current
updated: 2026-07-04
---

# Tooling & git hooks

## Husky hooks (`.husky/`)

| Hook         | Runs                                                                                  |
| ------------ | ------------------------------------------------------------------------------------- |
| `pre-commit` | `npx lint-staged && yarn tsc -b`                                                      |
| `commit-msg` | `yarn commitlint --edit "$1"`                                                         |
| `pre-push`   | `npx branch-name-lint branch-name-lint.json && yarn test && yarn knip && yarn secret` |
| `post-merge` | `yarn install --prefer-offline` if `yarn.lock` changed since `ORIG_HEAD`              |

`lint-staged` config (in `package.json`): `*.{js,jsx,ts,tsx}` → `eslint --fix`, `secretlint`, `prettier --write`; `*.{json,css,md,html}` → `prettier --write`.

## Commit message linting

`commitlint.config.mjs` extends `@commitlint/config-conventional` — commits must follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.), since this is what drives [[release-process]]. One escape hatch: commits containing `[FORCE]` are exempted from the conventional-format check.

## Branch naming

`branch-name-lint.json` enforces `^(?:(?:feat|fix|docs|chore|refactor|test|style|perf|ci)/[a-z0-9-]+|release-please--[a-z0-9-]+)$`, skips `master`, disallows `main`/`develop` outright. This is why the `translate-notes` job's auto-commit (see [[release-process]]) needs `--no-verify` — release-please's own branch names don't match this pattern.

## Dead-code detection — knip

`yarn knip` finds unused exports, files, and dependencies. Runs in CI (`ci.yml`) and in the `pre-push` hook.

## Secret scanning

Two layers:

- **secretlint** (`@secretlint/secretlint-rule-preset-recommend`, config `.secretlintrc.json`) — runs locally via `yarn secret`, in `lint-staged` on every commit, and in the `pre-push` hook.
- **Gitleaks** (`gitleaks/gitleaks-action@v3`) — runs in CI (`ci.yml`'s `secrets` job) against full git history.

## Formatting & linting

- **Prettier** — `yarn format` / `yarn format:check`.
- **ESLint 10** (+ `eslint-plugin-perfectionist`, `eslint-plugin-react`, `eslint-plugin-react-hooks`) — `yarn lint`.

## AGENTS.md protocol

Root `AGENTS.md` is a process file (not architecture docs) for AI coding agents: run `yarn tsc` and `yarn lint` after every change, fix all errors, repeat until both pass, before considering a change complete.

> [!note] Why so many gates for a solo project
> Per [[0001-mobile-platform-strategy]]'s "bus factor" note, this is a solo-maintained hobby project — the heavy tooling (knip, secretlint, Gitleaks, strict commit/branch linting) substitutes for the review-by-teammate safety net a team project would have.
