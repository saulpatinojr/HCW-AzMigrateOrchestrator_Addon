# AGENTS.md — guidance for coding agents (Copilot coding agent, Codex, Claude)

This is `saulpatinojr/HCW-AzMigrateOrchestrator_Addon` (shared core, rules, CLI, lab API, UI package). The Azure appliance is `saulpatinojr/HCW-AzMigrateOrchestrator_App` and consumes this repository's packages at a pinned version (ADR-0027).

Build/test: `npm ci && npm test` (TypeScript project references, Node 22 test runner). Rules: `npm run rules:validate`.
Conventions and invariants: see `CLAUDE.md`. Review expectations: `.github/copilot-instructions.md` and
`.github/skills/code-review/references/azure-migration-orchestrator-profile.md`.

Product agents (the 19 migration agents) are documented in `docs/agents/README.md` and defined in
`packages/agents/src/definitions.ts`; do not confuse them with coding agents. AI-created changes go through the
review → fix → current-head verification cycle described in `.github/setup/HANDSHAKE.md`.
