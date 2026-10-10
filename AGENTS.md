# AGENTS.md — guidance for coding agents (Copilot coding agent, Codex, Claude)

This is `saulpatinojr/HCW-AzMigrateOrchestrator_Addon`: the downstream web-front edition (CSV lab API, the pane app
`apps/lab-web` the website frames at `/tools/migration`, e2e, lab image, site integration). Keep the pane protocol and the
`/api/health` envelope described in `docs/website-integration/integration-guide.md`. The engine, rules, CLI and UI components are **not in this tree**; they come from
`saulpatinojr/HCW-AzMigrateOrchestrator_App` checked out as a sibling at the release pinned in `.github/workflows/*.yml`
(`APP_REF`, ADR-0028) until the packages are on npm.

Build/test: `npm run app:bootstrap` (clones, builds and assembles upstream at the pinned release) then `npm ci && npm test`;
browser suite: `npm run e2e`. Conventions and invariants: `CLAUDE.md`. Review expectations: `.github/copilot-instructions.md`.
Engine or rule changes belong upstream. AI-created changes go through the review → fix → current-head verification cycle in
`.github/setup/HANDSHAKE.md`.
