# Agent and Skill Pack Authoring Prompt

Use this prompt as the persistent build standard for future Agent/Skill packs.

## Mission

Create a concise, source-controlled Agent and Skill pack that preserves all unique source requirements, removes duplication, fills material capability gaps from current official vendor specifications, and packages every reusable capability for reliable progressive loading.

## Required architecture

1. Keep the Agent thin: identity, scope, routing, guardrails, required capabilities, and completion contract only.
2. Put reusable procedures in focused Skills. A Skill owns one capability and must not duplicate another Skill's procedure.
3. Keep detailed product, repository, or technology knowledge in one-level `references/` files and load it only when relevant.
4. Use scripts only for deterministic, repeatable, or fragile operations; test every added script.
5. Preserve source-specific rules unless they conflict with current platform behavior. Record any such conflict explicitly rather than silently rewriting it.
6. Ground version-sensitive behavior in current official vendor documentation and record verification dates in `compatibility/vendor-sources.yml`.
7. Track source provenance and ownership in `docs/SOURCE_TRACEABILITY.md`.
8. Build positive, negative, boundary, output-contract, security, and distribution tests.
9. Package every Skill independently as `skill.zip` and also provide a combined Skills archive.
10. Produce a complete pack ZIP plus a validation report.

## GitHub-specific specialization

When the pack targets GitHub Copilot:

- Prefer native repository locations: `.github/agents/`, `.github/skills/`, `.github/instructions/`, `.github/hooks/`, and repository Copilot settings.
- Keep the review Skill in a review-focused directory such as `.github/skills/code-review/` so Copilot code review can discover it reliably.
- Distinguish `copilot-pull-request-reviewer[bot]` from Copilot cloud agent / `copilot-swe-agent`.
- Treat review and remediation as a state machine, not a single prompt.
- A pushed fix that demonstrably closes the finding closes that finding. Acknowledge and resolve; do not demand redundant re-derivation.
- A non-closing fix remains open: explain the remaining failure path, correct it, and request re-review.
- Handle disagreement on the review thread using evidence and a concrete counter-proposal. Do not elevate suspicion into a finding.
- Recompute merge readiness on every new head SHA.
- Do not confuse a resolved thread with a green PR. Required checks, required approvals, mergeability, and current-head status remain separate gates.
- Remember that replies to Copilot code review comments are visible to people but are not consumed by Copilot code review as a conversational reply channel. Use new-push review or explicit re-review for machine re-evaluation.
- Remember that GitHub Actions do not run automatically after Copilot cloud-agent pushes by default unless a person approves the workflow run or the repository changes that setting.
- Treat Copilot approvals as repository-policy dependent and preview-sensitive; never assume they count toward merge requirements.
- Configure MCP with least privilege. For Copilot code review, only MCP tools annotated read-only are usable.

## Deliverable contract

Always produce these four primary artifacts:

1. Complete source pack ZIP.
2. This authoring prompt as Markdown.
3. Combined archive of all Skills.
4. Validation report.

Also produce target-specific secondary artifacts. For a GitHub-only pack, provide at minimum:

- Repository-ready `.github` ZIP.
- Individual custom-agent file.
- Main review Skill ZIP and all other individual `skill.zip` files.
- MCP configuration/reference artifact when applicable.
- Setup/enforcement guide.
- Compatibility/source registry and source-traceability ledger.

## Quality bar

A pack is complete only when its Agent can route the task, every capability has one authoritative owner, scripts pass tests, references resolve, source-specific behavior is retained, platform limitations are documented, distribution archives are safe, and the validation report distinguishes structural validation from environment-dependent runtime validation.
