---
name: coordinate-ai-code-handoff
description: Coordinate the cyclical GitHub review handshake after code is created by GitHub Copilot, Anthropic Claude, OpenAI Codex, or another AI coding partner, especially from VS Code or vendor applications. Use when AI-generated changes are pushed, handed to GitHub for review, remediated, re-reviewed, or prepared for merge.
---

# Coordinate AI code handoff

Treat AI provenance as context, not as a reason to lower or inflate review severity.

## Handshake

1. **Create**: record the coding partner when known (Copilot, Claude, Codex, other, or human-assisted) and the surface when useful (VS Code, GitHub.com, CLI, vendor app).
2. **Push**: establish the GitHub PR head SHA and changed scope.
3. **Review**: route to `code-review`; reviewer hat is `copilot-pull-request-reviewer[bot]` when GitHub Copilot code review is used.
4. **Disposition**:
   - no actionable findings -> current-head merge gates;
   - actionable finding -> remediation request;
   - disagreement -> evidence-based thread discussion and counter-proposal.
5. **Fix**: route to `remediate-review-finding`; GitHub Copilot remediation uses the cloud-agent / `copilot-swe-agent` path when selected.
6. **Close finding**: use `manage-review-finding`. If the fix closes the original failure path, acknowledge and resolve without redundant re-derivation.
7. **Green head**: use `verify-pr-evidence` and `verify-github-merge-readiness` for the new head.
8. **Repeat only when needed**: another cycle is required only for remaining/new defects, new behavioral changes, failed gates, or repository-required re-review.

## Provenance record

When the repository wants explicit AI provenance, use `references/provenance.md`. Do not invent session IDs, vendor metadata, or authorship that Git history does not support.

## Independence rule

The reviewer evaluates code behavior, not vendor reputation. Code from Copilot, Claude, Codex, or a human receives the same evidence threshold. AI provenance matters for audit, workflow authorization, and deciding which remediation channel can act.
