# GitHub Copilot repository instructions

For pull-request review or re-review, use `.github/skills/code-review/SKILL.md` and apply only the component references relevant to the diff.

Treat GitHub Copilot as one teammate with separate review and remediation hats:

- `copilot-pull-request-reviewer[bot]` reviews.
- Copilot cloud agent / `copilot-swe-agent` fixes only when explicitly requested.

A fix that demonstrably closes the original finding closes that finding: acknowledge and resolve the thread, then evaluate the current head. Do not keep a PR open merely to re-derive a closed finding. If the fix does not close it, explain the remaining failure path, correct it when authorized, and request another review. Handle disagreement on-thread with evidence and a counter-proposal; unsupported suspicion is not a finding.

After any AI coding partner (GitHub Copilot, Anthropic Claude, OpenAI Codex, or other declared partner) creates or changes code, route the result through the GitHub review -> fix -> current-head verification cycle before merge.

Never expose secrets. Never treat a stale/older-head check as current evidence. Never treat a resolved review thread as proof that required checks or approvals are satisfied.

## This repository

This is `saulpatinojr/HCW-AzMigrateOrchestrator_Addon`: the slim web-front edition (CSV lab API, static harness, site integration, lab infrastructure). The engine, rules, CLI and UI components live upstream in `saulpatinojr/HCW-AzMigrateOrchestrator_App` and arrive here as `@hybridcloudworks/migration-core` / `@hybridcloudworks/migration-ui` at the ref pinned in `.github/workflows` (`APP_REF`, ADR-0028). Build needs that sibling checkout: `npm run app:bootstrap`.
