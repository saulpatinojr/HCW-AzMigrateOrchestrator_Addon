# CLAUDE.md — working agreement for Claude Code in this repository

This is `saulpatinojr/HCW-AzMigrateOrchestrator_Addon`: the shared migration intelligence core (`packages/*`), the rule corpus (`rules/`), the `amo` CLI, the CSV lab API, the lab web harness and the `@amo/ui` explorer package. The Azure appliance lives in `saulpatinojr/HCW-AzMigrateOrchestrator_App` and consumes this repository's packages at a pinned version (ADR-0027). Nothing here may depend on `@amo/azure-auth`, `@amo/azure-arm`, `@amo/azure-execution` or any `@azure/*` SDK; `tests/security/edition-boundary.test.mjs` enforces it.

- Read `docs/requirements-ledger.md`, `WORKING-PLAN.md` and `VALIDATION.md` before changing behaviour; keep them current.
- Run `npm test` and `npm run rules:validate` before claiming anything works. Never claim a check passed that you did not run.
- Rules are data: change `scripts/author-rules.mjs` → `node scripts/author-rules.mjs` → build → `amo rules report` → `amo rules snapshot`. Cite Microsoft Learn with a retrieval date.
- Golden files (`samples/expected-reports`) change only deliberately via `npm run goldens:update`; explain the diff in the PR.
- Never weaken: the unauthenticated confidence cap, the lab's inability to construct an Azure provider, the Safety Agent checks, the authorization gate, the "not production" labels.
- No secrets, tokens, customer inventories or real tenant/subscription IDs anywhere, including fixtures and tests.
- Owner-pasteable commands: no placeholders; bash and PowerShell both acceptable.
- This repository holds the canonical ADR log for both repositories. Record material design choices as ADRs in `docs/adr/` (next number: 0028). Record limitations in `VALIDATION.md`.
- Docs for agents are generated: edit `packages/agents/src/definitions.ts`, then `node scripts/generate-agent-docs.mjs`.
- A change to a package's public surface is a change to the appliance's dependency: say so in the PR and bump the version.
