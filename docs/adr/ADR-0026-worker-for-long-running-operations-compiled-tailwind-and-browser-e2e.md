# ADR-0026: Worker for long-running operations, compiled Tailwind, and browser e2e

**Status:** Accepted · **Date:** 2026-10-03

## Decisions
1. **Worker.** Resource Mover actions return `Azure-AsyncOperation` URLs. The API records each accepted action as a
   `TrackedOperation`; `apps/worker` polls due operations (honouring `Retry-After`), persists status transitions and writes
   `operation.<status>` audit events. It runs as a separate Container App (same image, different command, same identity) and
   only ever GETs status URLs. `GET /api/operations/{targetKey}` exposes progress. This closes the §6 `apps/worker` gap.
2. **Compiled Tailwind.** `apps/appliance-web` and the new `apps/ui-harness` use Tailwind 4 via `@tailwindcss/vite` with
   `@source` pointing at `packages/ui`; the play CDN is gone. The content site needs the same `@source` line
   (`docs/website-integration/integration-guide.md`).
3. **Browser e2e.** `tests/e2e/lab.spec.ts` drives `@amo/ui` through `apps/ui-harness` (the same lazy-island pattern as the
   site) against the real lab API: upload, questionnaire, results, detail dialog, state-impact tab, bundle download, delete,
   and asserts no password fields exist. Runs in CI (`ci.yml` job `e2e`); the sandbox cannot download browsers.

## Consequences
Operators see operation progress without polling Azure themselves; UI styling is deterministic and self-hosted; the explorer
is covered end to end in CI. The worker is single-replica by design (no leader election needed at this scale).
