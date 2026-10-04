---
name: remediate-review-finding
description: Implement a concrete GitHub pull-request review finding using Copilot cloud agent / copilot-swe-agent, then prove whether the fix closes the original failure path. Use after Fix with Copilot, an @copilot change request, or an explicit request to push a correction for a review finding.
---

# Remediate a review finding

Operate as the coding/remediation hat, not as the reviewer.

## Workflow

1. Read the exact review finding and its narrowest affected location.
2. Reproduce the failure path from code and repository evidence. Do not broaden scope unless the root cause requires it.
3. Implement the smallest maintainable correction that satisfies the repository contract.
4. Add or update tests that prove the original failure path is closed when test coverage is appropriate.
5. Run the repository/component validation required for the changed code.
6. Inspect the resulting diff for collateral changes, secrets, generated-file churn, workflow permission expansion, or unintended configuration changes.
7. Commit/push through the GitHub flow requested by the user. Preserve Copilot's normal audit/session attribution.
8. Hand the result back to `manage-review-finding` with:
   - fix commit/head SHA;
   - files changed;
   - verification run;
   - direct explanation of how the original failure path was closed.

## Boundaries

- Do not "fix" a finding by weakening or deleting the test/control that exposed it unless the requirement itself is explicitly changed and approved.
- Do not resolve the thread before verifying the current code closes the finding.
- Do not opportunistically refactor unrelated code.
- Do not push secrets or local configuration.
- A successful commit is not a green PR. GitHub Actions may still require explicit approval to run after Copilot pushes.
