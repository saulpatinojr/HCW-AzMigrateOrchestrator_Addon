---
name: review-copilot-customization
description: Review GitHub Copilot customization changes for agents, skills, instructions, hooks, MCP configuration, repository Copilot settings, and related workflow policy. Use when a PR changes `.github/agents`, `.github/skills`, `.github/instructions`, `.github/hooks`, `.github/mcp.json`, Copilot MCP settings, or instructions that can alter agent behavior or tool access.
---

# Review Copilot customization

Treat Copilot customization as executable governance: prompt text, tool lists, hooks, and MCP configuration can change what an agent can read, execute, or modify.

## Checks

- Agent profiles: scope, trigger description, tool allowlist, model-independent behavior, and separation between review-only and write-capable roles.
- Skills: accurate triggers, compact control plane, one owner per procedure, relative references, no hidden credentials, and no instructions that bypass repository policy.
- Instructions: avoid contradictory always-on rules, overly broad path globs, or instructions that cause unrelated code to load domain-specific context.
- Hooks: verify supported lifecycle events, command safety, timeouts, secret handling, and whether the hook is supported on the intended Copilot surface.
- MCP: validate JSON, least-privilege tool allowlists, read-only expectations for code review, image/package pinning for local servers, and repository-setting deployment requirements.
- Self-review: when the PR changes the very review Skill/Agent that will inspect it, compare against the base-branch version and require a human reviewer for governance-sensitive changes.
- Workflow/security boundary: changes that allow Copilot pushes to run privileged workflows automatically deserve explicit security review.

Run `scripts/audit_mcp_config.py` for checked-in MCP configuration when present.

## Findings

Report only concrete privilege expansion, review bypass, invalid configuration, unsafe command execution, prompt-injection exposure with a reachable path, stale/ambiguous trigger behavior, or governance drift. Do not report generic "AI is risky" concerns.
