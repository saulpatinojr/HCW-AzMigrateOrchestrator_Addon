# Optional Copilot hooks policy

GitHub Copilot hooks can add deterministic guardrails for Copilot cloud agent and Copilot CLI, but hooks are not a substitute for branch protection, required checks, or code review.

This pack intentionally does not enable a generic write-blocking hook by default because repository command/tool names and legitimate build operations differ. If hooks are added:

- Place repository hooks under `.github/hooks/*.json`.
- Use `preToolUse` only for clearly defined dangerous operations or policy checks.
- Keep commands noninteractive, bounded by a timeout, secret-safe, and portable to the intended Copilot surface.
- Remember that cloud-agent hooks run in an ephemeral Linux sandbox and only the supported subset of events is available there.
- Test malformed-item behavior and fail-closed decisions before treating a hook as enforcement.
- Require human review for any hook that can deny/allow tool use or change the agent's effective permissions.
