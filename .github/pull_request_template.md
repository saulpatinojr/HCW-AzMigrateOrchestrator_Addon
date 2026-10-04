## Summary

<!-- What changes and why. Link the requirement ledger IDs (docs/requirements-ledger.md) this affects. -->

## Verification

- [ ] `npm test` — result:
- [ ] `npm run rules:validate` — result:
- [ ] Golden files regenerated deliberately (`npm run goldens:update`) and the diff reviewed — or not applicable
- [ ] Checks not run and why:

## Rules (if `rules/**` changed)

- [ ] Microsoft Learn sources added/updated with `retrievedOn`
- [ ] `amo rules report` output pasted below
- [ ] `rules/snapshots/current.json` regenerated

## Infrastructure (if `infrastructure/**` changed)

- [ ] `terraform fmt -check` / `validate` output or iac-validate run link
- [ ] No privileged containers, Docker socket exposure or secrets introduced

## AI provenance

- [ ] Code created or changed by an AI coding partner (GitHub Copilot / Claude / Codex) — reviewer applies `.github/skills/coordinate-ai-code-handoff`
