# GitHub Copilot platform behavior

Verified against GitHub Docs on 2026-09-10. Treat preview features as changeable and re-verify before relying on them as a merge control.

## Review identity and review behavior

- GitHub Copilot code review is requested with the reviewer identity `copilot-pull-request-reviewer[bot]` through supported GitHub review-request flows.
- Copilot code review may leave review comments and suggested changes. Repository configuration can allow Copilot approval reviews; whether those approvals count toward merge requirements is a separate repository setting and is preview-sensitive.
- Replies to Copilot code review comments are visible to people, but Copilot code review does not consume those replies as a conversational response channel. Thread replies are therefore audit/human communication; machine re-evaluation requires a new-push review or explicit re-review.
- Automatic re-review of new pushes occurs only when the repository has configured review of new pushes. Otherwise re-request review manually.

## Remediation identity and behavior

- Copilot cloud agent can be asked to address PR comments, including through **Fix with Copilot** or `@copilot` on a pull-request comment.
- The coding/remediation work is attributable to Copilot's software-engineering agent identity (`copilot-swe-agent` in GitHub activity/commit attribution contexts).
- Copilot cloud agent may push commits directly to the existing PR branch or, when requested, create a separate PR.
- A pushed fix changes the head SHA and therefore invalidates any previous current-head conclusion.

## Actions after Copilot pushes

GitHub Actions workflows do not run automatically on Copilot cloud-agent pushes by default. A user with write access may need to select **Approve and run workflows**, unless repository administrators have disabled that approval requirement. Do not describe a Copilot fix as green until required checks have actually executed for the new head.

## Approval and merge controls

- Do not assume Copilot review itself blocks merging.
- Do not assume Copilot approval counts toward required approvals unless repository settings explicitly permit it.
- For Copilot-authored pull requests, GitHub applies additional human-review safeguards when required approvals are configured. Preserve repository branch/ruleset policy rather than trying to route around it.

## Skills, instructions, and MCP

- GitHub Copilot code review can use repository agent Skills in `.github/skills` and repository custom instructions.
- Review-focused Skill names/descriptions improve selection for code review.
- Copilot code review can use repository-configured MCP tools when enabled. For code review, only tools whose MCP definitions carry `readOnlyHint: true` are eligible.
- Repository MCP configuration for GitHub.com is entered in repository Copilot settings. A checked-in JSON file is a source/configuration artifact, not proof that GitHub.com has applied the settings.
