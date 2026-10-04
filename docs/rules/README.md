# Rules

- **Where:** `rules/azure/*.json` (vendor-derived, precedence 10), `rules/organization/*.json` (overlays, precedence 100).
- **Schema:** `rules/schemas/rule.schema.json`; structural validation also in `@amo/domain` `validateRule`.
- **Authoring:** edit `scripts/author-rules.mjs`, run `node scripts/author-rules.mjs`, then `npm run build && npm run rules:validate`.
  Review the change report (`node apps/cli/dist/main.js rules report`), then `node apps/cli/dist/main.js rules snapshot`
  and commit `rules/snapshots/current.json`. CI fails on a checksum mismatch.
- **Rollback:** `git revert` the rule commit and re-snapshot. Decisions cite `ruleId`/`ruleVersion`, so affected assessments are identifiable.
- **Invariants enforced:** every rule has Microsoft Learn sources with retrieval dates; `unsupported` across the board requires
  alternatives; Azure Site Recovery as a default tool requires a DR justification; same-precedence disagreement is a conflict;
  duplicate IDs fail; review dates in the past are reported as stale.
- **Source URL verification:** URLs were authored on 2026-10-03 from documentation knowledge and **not fetched live in this
  build**; `VALIDATION.md` lists live verification as a required step before the demo is published.
