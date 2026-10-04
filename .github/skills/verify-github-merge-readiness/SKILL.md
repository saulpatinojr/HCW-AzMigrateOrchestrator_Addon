---
name: verify-github-merge-readiness
description: Decide whether the current GitHub pull-request head is actually ready to merge. Use after review findings are addressed, after Copilot pushes fixes, before approval/merge, or when asked whether a PR is green. Checks required status checks, approvals, unresolved blockers, workflow-run approval, mergeability, and current-head freshness.
---

# Verify GitHub merge readiness

Evaluate merge readiness independently from finding resolution.

## Required gates

1. Confirm the PR head SHA has not changed since evidence was collected.
2. Confirm every repository-required status check has completed successfully for the current head.
3. Confirm GitHub Actions workflows that require approval after a Copilot push were actually approved and run, or that repository policy explicitly permits automatic execution.
4. Confirm required approvals are satisfied under the repository's actual ruleset.
5. Confirm no unresolved Critical/High or repository-defined blocking finding remains.
6. Confirm the PR is mergeable and not blocked by conflicts, branch rules, environment rules, or required conversation-resolution policy.
7. Confirm any deployment-specific approval remains a deployment gate rather than being confused with PR merge approval.

## Copilot approval caveat

Repository administrators can configure Copilot approval behavior, including whether Copilot approvals count toward merge requirements. Treat this as configuration-dependent and preview-sensitive; inspect the repository setting/ruleset instead of assuming.

## AI-authored PR caveat

When GitHub Copilot cloud agent authored the PR, preserve GitHub's independent-human review safeguards and required-approval rules. Do not attempt to satisfy a human-separation control with the same initiating actor.

## Output

Return exactly one state:

- `MERGE_READY`
- `WAITING_FOR_CHECKS`
- `WAITING_FOR_WORKFLOW_APPROVAL`
- `WAITING_FOR_REVIEW`
- `BLOCKED_BY_FINDING`
- `BLOCKED_BY_CONFLICT_OR_RULE`
- `INSUFFICIENT_EVIDENCE`

Include the current head SHA and only the gates that are not satisfied.
