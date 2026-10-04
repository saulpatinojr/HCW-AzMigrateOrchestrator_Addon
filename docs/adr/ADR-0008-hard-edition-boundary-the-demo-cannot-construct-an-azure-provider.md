# ADR-0008: Hard edition boundary: the demo cannot construct an Azure provider

**Status:** Accepted · **Date:** 2026-10-03

## Context

§2.2 and §3.11: the demo must be *technically unable* to reach Azure.

## Decision

`assertDemoCannotUseAzure` throws in the orchestrator; `apps/lab-api` has no import of the Azure provider; Docker image contains no Azure SDK; health endpoint reports `azureConnectivity: disabled-by-design`.

## Consequences

Tested; adding Azure access to the demo requires changing three guarded places and failing tests.
