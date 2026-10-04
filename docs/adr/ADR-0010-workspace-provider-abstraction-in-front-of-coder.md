# ADR-0010: Workspace-provider abstraction in front of Coder

**Status:** Accepted · **Date:** 2026-10-03

## Context

§24: do not couple the engine to the Coder API.

## Decision

`WorkspaceProvider` interface with Disabled, InMemory and Coder implementations; artifacts reach the workspace through the template's startup script using a one-time owner token.

## Consequences

Coder can be replaced; demo UI hides the action when the provider is disabled.
