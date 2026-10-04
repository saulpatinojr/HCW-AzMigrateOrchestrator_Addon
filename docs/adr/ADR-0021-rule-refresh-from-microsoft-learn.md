# ADR-0021: Rule refresh from Microsoft Learn

**Status:** Accepted · **Date:** 2026-10-03

## Context
Rules were authored from documentation knowledge with retrieval dates but no mechanism to detect drift from Microsoft Learn.

## Decision
`parseLearnMoveSupport` parses the Learn move-support tables; `diffRulesAgainstMatrix` compares them with `rules/azure`;
`scripts/refresh-rules-from-learn.mjs` writes `rules/reports/learn-diff.{json,md}`; `rules-refresh.yml` runs weekly and
opens a PR carrying the report. **Rules are never changed automatically** — a human applies accepted changes through the
authoring tool, bumps versions and re-snapshots.

## Consequences
Drift is visible within a week; the parser is tested offline with fixtures; the source path in the azure-docs repository is
marked [VERIFY] and the script accepts `--from <file>` for offline runs.
