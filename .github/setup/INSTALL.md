# Install GitHub Copilot Code Reviewer

1. Copy the provided `.github/` directory into the repository root, merging with existing files instead of overwriting unrelated instructions.
2. Keep the main review Skill at `.github/skills/code-review/`.
3. Keep the custom agent at `.github/agents/github-copilot-code-reviewer.agent.md` for VS Code/Copilot agent use.
4. Review and merge `.github/copilot-instructions.md` with existing repository instructions.
5. In repository **Settings -> Copilot -> Code review**, enable the desired review behavior and, when appropriate, **Review new pushes**.
6. In repository **Settings -> Copilot -> MCP servers**, paste/apply the reviewed MCP configuration. A checked-in JSON file is not automatically GitHub.com's repository MCP setting.
7. Keep MCP tool access least-privilege. Copilot code review can only use MCP tools advertised as read-only.
8. Review **Settings -> Copilot -> Cloud agent** before allowing Actions workflows to run automatically on Copilot pushes. The safer default requires a person with write access to approve workflow execution.
9. Keep repository rulesets, required checks, CODEOWNERS/human review, protected environments, and merge queue/branch protections as the authoritative enforcement layer.
10. Seed test PRs with known defects and known valid fixes. Verify that the reviewer finds the defect, the swe agent can close it, the thread is resolved without redundant re-review, and the new head must still pass current checks.
