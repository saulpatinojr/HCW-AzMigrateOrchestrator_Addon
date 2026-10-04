# Repository existing-files review

Inspection date: 2026-10-03. The workspace started empty apart from the supplied intake artifacts (uploads). No existing
source code, Git history, CI, Terraform, Docker or Coder files were present. Git status after `git init`: clean.

## Supplied artifacts and how they were used

| File | Original purpose | Applies here? | Action | Reason |
|---|---|---|---|---|
| `github-repository-ready.zip` → `.github/**` | GitHub Copilot Code Reviewer pack: custom agent, 7 skills, instructions | Yes | **Installed** at `.github/`. **Defect corrected**: `.github/skills/review-copilot-customization/` contained a nested duplicate of every other skill (6 extra skill trees). Replaced with the clean copy from the pack's `.apm/skills/review-copilot-customization/` (identical `SKILL.md`, `agents/openai.yaml`, `scripts/audit_mcp_config.py`). | A nested duplicate would make Copilot discover two copies of the review skill and bloat every review context. |
| `.github/skills/code-review/references/repository-profile.md` and component refs (`frontend.md`, `functions.md`, `infra.md`, `scripts-workflows.md`, `agents-edge.md`) | HybridCloudWorks **site** repository routing | Not to this codebase | **Preserved unchanged**; added `azure-migration-orchestrator-profile.md` and a "Repository selection" section in `SKILL.md` so the skill routes by repository layout. | The profile already says "use only when the repository matches"; keeping it keeps the pack portable to the sister repo. |
| `.github/copilot-instructions.md`, `.github/instructions/github-code-review.instructions.md`, `.github/agents/github-copilot-code-reviewer.agent.md` | Review lifecycle, finding states, merge readiness | Yes | Installed; appended a "This repository" section to `copilot-instructions.md` pointing at the new profile and the verification commands. | Owner conventions (closure rule, evidence-first, no suspicion findings) preserved verbatim. |
| `setup/*.md` | Install, handshake, enforcement checklist, hooks policy | Yes | Moved to `.github/setup/` | Keeps operator guidance next to what it configures. |
| `copilot-mcp.json` / `setup/copilot-mcp.repository-settings.json` | Read-only MCP servers for the HybridCloudWorks site (terraform, microsoft-learn, cloudflare-docs, azure, github-mcp-server) | Partly | Stored as `.github/copilot-mcp.hybridcloudworks-site.json` for reference; **not** applied to this repo's settings. | The `azure` server grants read access to the site's live estate and the `github-mcp-server` env file path is site-specific. For this repo, only `microsoft-learn` and `terraform` registry servers are relevant; apply through repository Copilot settings after review (`.github/setup/INSTALL.md` step 6). Security issue avoided: no credential paths copied. |
| `SKILL.md` (two copies: `docs/` and `wiki/` variants of `hcw-code-review`) | Earlier revisions of the site review skill | No | Not installed; superseded by the pack's `code-review` skill. Content preserved in the pack's references. | Duplicate names would conflict with `code-review`. |
| `VALIDATION_REPORT.md`, `PORTABLE_AGENT_SKILL_PACK_AUTHORING_PROMPT.md` | Pack validation and authoring standard | Yes (process) | Kept under `docs/governance/` for provenance. | Authoring prompt informs how skills/agents in this repo are structured. |
| `github-copilot-code-reviewer-skills.zip`, `-agent.zip`, `-pack.zip` | Distribution archives | Redundant with repo-ready | Not committed (binary duplicates). | Content is already in `.github/`. |

## Conventions preserved

- Review culture: few, high-confidence, evidence-backed findings; closure rule; current-head gates.
- Documentation discipline: narrative docs in `docs/`, open work in `TODO.md` (not created — tracked via the ledger), completed work in `CHANGELOG.md`.
- Owner-pasteable commands without placeholders.

## Security issues corrected

1. Nested skill duplication (above).
2. Site-specific MCP configuration with live-estate access **not** propagated to this repository.
3. Unverifiable image digests and action SHAs replaced by tag pins with an explicit follow-up (see VALIDATION.md) rather than shipping fabricated hashes.
