# Optional AI provenance record

Use only when the repository wants explicit provenance beyond Git authorship.

```text
Code creator: <GitHub Copilot | Anthropic Claude | OpenAI Codex | Other | Human | Mixed>
Surface: <VS Code | GitHub.com | CLI | vendor app | other>
Source commit/head: <SHA if known>
Task/session reference: <link or identifier only when actually available>
Human requester/owner: <repository identity if already public in the PR>
Review cycle: <initial | re-review N>
```

Do not require vendor/session metadata that the workflow does not expose. Never fabricate provenance.
