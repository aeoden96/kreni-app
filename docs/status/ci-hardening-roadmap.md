---
tags: [area/status, type/reference]
status: roadmap
updated: 2026-07-04
---

# CI/CD hardening — roadmap

Security- and reliability-focused CI work. For the current pipeline reference see
[[ci-cd-pipelines]]. This note tracks what landed and what's still open.

## Shipped

- **`android.yml`** — builds the Capacitor Android app on PRs (path-filtered) and
  master: `yarn build` → `cap sync` → `assembleDebug` + `bundleRelease` (unsigned).
  Crucially, `bundleRelease` exercises the R8 / `shrinkResources` release path so
  minify breakage is caught in CI rather than by hand.
- **`ci.yml` least privilege** — added top-level `permissions: contents: read`
  (previously inherited the broad default token).
- **`ci.yml` secretlint job** — mirrors the `pre-push` `yarn secret` hook, so the
  `.secretlintrc` rules run in CI alongside the gitleaks scan.
- **`codeql.yml`** — CodeQL SAST for `javascript-typescript` (PR + push + weekly),
  `security-and-quality` query pack.
- **Dependabot `gradle`** — weekly updates for `android/` (minor/patch grouped,
  majors ignored), joining the existing npm + github-actions ecosystems.
- **`versionCode` from `ANDROID_VERSION_CODE`** env in `android/app/build.gradle`
  (fallback 1) — lets CI feed a monotonic value.

## Open — Android release automation

- **Signed AAB pipeline.** On release-please `release_created`: decode a
  base64-encoded upload keystore from GitHub Secrets into `keystore.properties` +
  `*.jks`, run `bundleRelease`, upload the signed AAB as an artifact. See the
  signing scaffold in `android/app/build.gradle` and `keystore.properties.example`.
- **Auto-publish to Play.** `r0adkll/upload-google-play` with a Play
  service-account JSON (internal/closed track first).
- **Wire `ANDROID_VERSION_CODE`** in the release job (e.g. `github.run_number` or
  a release-please extra-files bump) so uploads strictly increase.
- **assetlinks fingerprint guard.** Fail a release if
  `public/.well-known/assetlinks.json` still contains
  `REPLACE_WITH_SHA256_FINGERPRINT_…` — prevents shipping broken App Links.
  (Non-blocking today, since the placeholder is intentional until the key exists.)

## Open — general hardening

- **SHA-pin actions.** Workflows use floating tags (`@v7`, `@v6`); pin to commit
  SHAs (Dependabot keeps them current) to close tag-mutation supply-chain risk.
- **Add missing `permissions:` blocks** to any remaining workflow that inherits
  the default token; audit for least privilege.
- **Playwright E2E in CI.** The repo has Playwright + `docker-compose.playwright.yml`
  but e2e never runs in CI (unit only — see [[testing]]). Add a job (or nightly)
  against a preview build.
- **Coverage gate.** `@vitest/coverage-v8` is installed but unused in CI — add a
  threshold and surface it in the run summary.
- **Bundle-size budget.** Fail PRs that regress the WebView payload (size-limit or
  a gzip check on `dist/assets`), given mobile-WebView perf sensitivity.
- **Lighthouse CI** on preview deploys — PWA / perf / a11y budgets.
- **OpenSSF Scorecard** workflow for a supply-chain posture baseline.

## Notes / related open items

- `global-announcement.yml` mixes legacy `wrangler@3` (set) and `wrangler-action@v4`
  (clear) — worth normalizing. See [[scheduled-jobs]] and [[project-roadmap]].
- Proxy Worker rate limiting is scaffolded but disabled — a security gap tracked
  in [[gtfs-proxy-worker]] / [[project-roadmap]].

> [!note] Keeping this current
> As items ship, move them into "Shipped" (or flip the note to `status: current`
> once the list is exhausted) so the [[project-roadmap]] Dataview stays accurate.
