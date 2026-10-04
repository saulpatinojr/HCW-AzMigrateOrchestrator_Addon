# GitHub Copilot reviewer enforcement checklist

- [ ] `.github/skills/code-review/SKILL.md` is on the PR head branch.
- [ ] Copilot code review is enabled for the repository.
- [ ] Review new pushes is enabled if automatic re-review is required by policy.
- [ ] Required status checks are configured through a ruleset/branch protection.
- [ ] CODEOWNERS or equivalent human ownership covers sensitive paths.
- [ ] Copilot approval behavior is explicitly configured; no one assumes it counts by default.
- [ ] Cloud-agent workflow-run approval policy is explicitly chosen and documented.
- [ ] Privileged workflows are reviewed before allowing automatic execution after Copilot pushes.
- [ ] MCP servers use explicit least-privilege tool allowlists.
- [ ] Code-review MCP tools are read-only and advertise `readOnlyHint: true`.
- [ ] GitHub/MCP configuration changes receive human governance review.
- [ ] Critical/High repository-defined blocking findings must be resolved before merge.
- [ ] Current-head check results, not older-head results, are used for merge decisions.
- [ ] AI-generated changes from Copilot, Claude, Codex, or another partner enter the same review loop.
