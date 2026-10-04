# GitHub

**What it does here.** The GitHub Copilot Code Reviewer pack (`.github/agents`, `.github/skills`) reviews every PR with the
repository profile in `.github/skills/code-review/references/azure-migration-orchestrator-profile.md`;
`copilot-setup-steps.yml` lets the coding agent build and test; Actions run CI, IaC validation, CodeQL, dependency review and
secret scanning; `publish-images.yml` publishes the lab image to GHCR with SLSA provenance attestations and an SBOM.

**What the lab can publish.** Review-to-fix cycle metrics from the handshake PRs; signed-image verification instructions
(`gh attestation verify`).
