---
tags: [area/infra, type/reference]
status: current
updated: 2026-07-04
---

# Environment variables

## Local development (`.env`, from `.env.example`)

| Variable                      | Required                                                 | Purpose                                                                                                                                                                 |
| ----------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_GTFS_PROXY_URL`         | yes                                                      | URL of the external `kreni-app-worker` Cloudflare Worker. Used for GTFS-RT, Nextbike, global announcement, and Driving-mode road closures. See [[cloudflare-topology]]. |
| `OLLAMA_API_KEY`              | only for running the alert/release-notes scripts locally | Ollama Cloud API key — see [[ollama-integration]]                                                                                                                       |
| `VITE_GTFS_API_KEY`           | optional, commented out                                  | Only needed if the proxy Worker has key-based auth configured                                                                                                           |
| `VITE_TALLY_FEEDBACK_FORM_ID` | optional, commented out                                  | Tally feedback form ID (Publish → Share → Form ID)                                                                                                                      |

## GitHub Actions secrets (configured in repo settings, not in code)

| Secret                                                                    | Used by                                                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`                                                    | `deploy.yml` (Pages deploy), `parse-service-alerts.yml` (as `CF_API_TOKEN`), `global-announcement.yml` |
| `CLOUDFLARE_ACCOUNT_ID`                                                   | same three, `parse-service-alerts.yml` as `CF_ACCOUNT_ID`                                              |
| `CF_KV_NAMESPACE_ID`                                                      | `parse-service-alerts.yml`, `global-announcement.yml`                                                  |
| `OLLAMA_API_KEY`                                                          | `parse-service-alerts.yml`, `release-please.yml`'s `translate-notes` job                               |
| `VITE_GTFS_PROXY_URL`, `VITE_GTFS_API_KEY`, `VITE_TALLY_FEEDBACK_FORM_ID` | `deploy.yml` build step (baked into the static build)                                                  |
| `GITHUB_TOKEN`                                                            | automatic; used by `gtfs-static-bump.yml` for `gh pr create`                                           |

See [[ci-cd-pipelines]] and [[scheduled-jobs]] for which workflow consumes which secret in context.

> [!note] `.env` itself is git-ignored
> `.gitignore` excludes `.env`, `.env.local`, `.env.*.local`. Only `.env.example` (with empty/commented values) is committed.
