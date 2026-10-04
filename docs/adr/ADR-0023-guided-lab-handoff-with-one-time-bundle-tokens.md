# ADR-0023: Guided-lab handoff with one-time bundle tokens

**Status:** Accepted · **Date:** 2026-10-03

## Context
The Coder workspace must receive one assessment bundle without ever holding the owner token (which can read, download and
delete the assessment) and without the lab API persisting anything.

## Decision
`POST /api/assessments/{id}/workspace` (owner token required) issues a **one-time, 10-minute bundle token** and asks the
`WorkspaceProvider` to create a workspace with `assessment_id`, `bundle_token` and `api_base_url` as template parameters.
The template's startup script downloads `bundle.zip` once with `x-bundle-token`; the token is consumed on first use (match
or not) and grants nothing else. The feature is invisible unless `/api/health` reports a configured provider. The workspace
image carries tools only (code-server, terraform, pwsh, az) and blocks `az login` by alias to discourage authenticating a
shared lab image.

## Consequences
Least-privilege handoff with no persistence; a leaked bundle token is worthless after one use or ten minutes; the owner token
never leaves the browser. Live Coder validation remains pending (VALIDATION.md).
