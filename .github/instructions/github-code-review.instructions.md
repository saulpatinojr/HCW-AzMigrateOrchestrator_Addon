---
applyTo: "**/*"
---

# GitHub pull-request review

- Use `.github/skills/code-review/SKILL.md` for PR review, re-review, and review-thread follow-up.
- Prefer concrete failure paths and current-head evidence over generic recommendations.
- Load repository/component references only for paths or contracts touched by the change.
- When `.github/agents/**`, `.github/skills/**`, `.github/instructions/**`, `.github/hooks/**`, or Copilot MCP configuration changes, also use `review-copilot-customization`.
- A finding that is demonstrably fixed is closed; acknowledge and resolve it rather than re-litigating it.
- A non-closing fix stays open and requires a correction plus re-review.
- Disagreement requires evidence and a counter-proposal, not suspicion.
- Recompute check and approval status for every new head SHA.
