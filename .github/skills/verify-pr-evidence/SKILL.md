---
name: verify-pr-evidence
description: Verify that GitHub pull-request evidence belongs to the current head and intended target. Use for CI checks, workflow logs, test results, scans, artifacts, plans, MCP evidence, stale results, cancelled/skipped jobs, or whenever a review conclusion depends on proof rather than code inspection alone.
---

# Verify PR evidence

## Evidence contract

Accept evidence only when its provenance is sufficient for the claim.

Check:

- Current PR head SHA.
- Check/workflow run SHA and conclusion.
- Artifact or plan digest/identity when relevant.
- Target environment and parameter/input set when relevant.
- Whether the check ran, skipped, cancelled, timed out, or was prevented from starting.
- Whether the evidence predates a remediation commit.

## GitHub-specific rules

- After a Copilot cloud-agent push, do not assume workflows ran. GitHub Actions require approval by default for Copilot pushes unless the repository changes that setting.
- Treat `skipped`, `cancelled`, `timed_out`, missing, and stale results as non-passing evidence.
- A green check from an older head cannot clear a new head.
- A resolved review thread cannot substitute for a required check.
- Use the GitHub MCP server or GitHub UI/API evidence when available; if unavailable, state the limitation.

## MCP rules

Read `references/evidence-sources.md` before relying on repository-configured MCP data.

## Output

Return a compact ledger:

| Evidence | Head/target match | Result | Supports |
| --- | --- | --- | --- |

Then list missing evidence that materially blocks a conclusion. Do not request irrelevant proof.
