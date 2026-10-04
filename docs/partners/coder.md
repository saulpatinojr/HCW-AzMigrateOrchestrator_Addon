# Coder

**What it does here.** The guided inspection lab: a per-user, time-limited browser workspace preloaded with one assessment
bundle (`infrastructure/coder/template`), reached through `packages/workspace-provider` so the engine never depends on the
Coder API directly (ADR-0010). Sprint 4 (ADR-0023) added the workspace image, the one-time bundle-token handoff, the "Open in Coder" action (visible only when a provider is configured) and the template-push workflow.
