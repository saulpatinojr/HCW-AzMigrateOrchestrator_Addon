---
name: code-review
description: Review GitHub pull requests and diffs with repository-specific, evidence-first checks, including Copilot code review, Copilot cloud-agent fixes, review/fix/re-review lifecycle, current-head verification, and merge readiness. Use whenever asked to review, check, audit, re-review, or validate a PR or branch, and after code created by GitHub Copilot, Claude, Codex, or another coding partner reaches GitHub.
---

# GitHub Copilot code review

Perform the review as a stateful GitHub PR workflow, not as an isolated static-analysis pass.

## 1. Identify the active GitHub role

Treat GitHub Copilot as one teammate with two distinct hats:

- `copilot-pull-request-reviewer[bot]`: review role. Analyze and comment; do not edit the branch.
- `copilot-swe-agent`: remediation role used by Copilot cloud agent. Implement explicitly requested fixes and push commits.

Never blur the permissions or evidence of one role into the other.

## 2. Establish the review boundary

Collect the PR title/body, base and head SHA, full diff, changed/deleted/renamed files, repository instructions, relevant Skills, required checks, review threads, approvals, and available evidence. Identify the code creator when visible: human, GitHub Copilot, Anthropic Claude, OpenAI Codex, or another coding partner.

For every review, read `references/general-review-gates.md`. For the HybridCloudWorks repository profile, read `references/repository-profile.md` (HybridCloudWorks site) or `references/azure-migration-orchestrator-profile.md` (this repository: look for `rules/azure` and `packages/classification-engine`)` and only the component references it routes to. Do not load unrelated component files.

## 3. Review the changed behavior

For each affected component, evaluate:

1. Correctness and contract integrity.
2. Security and trust boundaries.
3. Tests and deterministic verification.
4. Failure, retry, concurrency, rollback, and existing-state behavior where relevant.
5. Configuration, dependency, workflow, and deployment effects.

A finding needs a concrete failure path, material impact, and actionable correction. Prefer a few high-confidence findings over generic advice.

## 4. Route every finding through the lifecycle

Use `manage-review-finding` for every posted finding or existing review thread.

Apply these rules exactly:

- **Fix closes finding:** acknowledge on the thread, resolve it, and move on. Do not re-derive or keep the PR open merely to prove the fix was read. The next concern is whether the current head is green and approved.
- **Fix does not close finding:** explain the remaining failure path, keep the finding open, push/ask for the correction when authorized, then request another review.
- **Disagreement:** state the evidence and a specific counter-proposal on the thread. If the repository owner/maintainer accepts the alternative and policy permits it, record that disposition and resolve. Suspicion without evidence is not a finding.

## 5. Coordinate remediation when requested

When the user selects **Fix with Copilot**, mentions `@copilot` to make a change, or otherwise explicitly delegates remediation, use `remediate-review-finding`. When the code was created by Copilot, Claude, Codex, or another AI coding partner, also use `coordinate-ai-code-handoff` to preserve the create -> review -> fix -> green-head cycle. The remediation agent may push to the same PR branch or create a separate PR depending on the requested GitHub flow.

Treat a remediation commit as new head state. Do not assume CI has run merely because Copilot pushed it.

## 6. Verify current-head evidence

Use `verify-pr-evidence` after any new push and before publishing a final verdict. Evidence must belong to the current head SHA or to an immutable artifact provably derived from it.

Do not treat skipped, cancelled, unavailable, or stale checks as passing evidence. Do not treat a resolved thread as CI evidence.

## 7. Re-review only what needs re-review

When new commits arrive:

- Revisit unresolved findings and newly changed behavior.
- Verify resolved findings only enough to confirm that the original failure path remains closed; do not recreate the entire prior analysis.
- Detect regressions introduced by the fix.
- Avoid reposting resolved root causes unless the new head reintroduces them.

If repository automatic review is not configured for new pushes, explicitly request/recommend a new Copilot review when machine re-evaluation is required.

## 8. Determine merge readiness

Use `verify-github-merge-readiness` before saying "merge" or "approved". Merge readiness requires the current head, required checks, required approvals, mergeability, and blocking-thread policy to agree.

Copilot review comments and Copilot approvals are repository-policy dependent; do not assume they block or satisfy merge requirements.

## 9. Report

Return:

1. **Verdict**: mergeable as-is, mergeable after current-head gates, or blocking findings.
2. **Findings**: most severe first, each with file:line, failure path, impact, correction, and evidence.
3. **Finding lifecycle**: open, fixed/resolved, disputed with accepted counter-proposal, or re-review required.
4. **Verification**: current-head checks and artifacts, plus anything skipped or stale.
5. **Merge gates**: approvals, required checks, workflow-run approval state, unresolved blockers, and mergeability.
6. **AI handoff**: creator identity when available and whether review -> remediation -> re-review completed.

## References

- `references/general-review-gates.md`: technology-neutral correctness, security, quality, test, and operations gates.
- `references/severity-and-output.md`: finding threshold, severity, confidence, and output discipline.
- `references/repository-profile.md`: repository-specific routing and cross-cutting rules.
- `references/functions.md`: Azure Functions checks.
- `references/frontend.md`: frontend checks.
- `references/infra.md`: Terraform/live-infrastructure checks.
- `references/scripts-workflows.md`: scripts and GitHub Actions checks.
- `references/agents-edge.md`: VPS agent and Cloudflare edge checks.
- `references/github-platform.md`: GitHub Copilot platform behavior and limitations.
- `references/mcp-boundaries.md`: MCP evidence and read-only boundaries.


## Repository selection

Read `references/azure-migration-orchestrator-profile.md` when the repository contains `rules/azure/` and `packages/classification-engine/`; read `references/repository-profile.md` only for the HybridCloudWorks site layout.
