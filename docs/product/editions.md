# Editions

| | Azure Migration Orchestrator (enterprise) | Hybrid Cloud Works Migration Explorer (demo) |
|---|---|---|
| Input | Authenticated Azure Resource Graph discovery (adapter pending) | `resources.csv` export |
| Authentication | Entra OIDC + managed identity / WIF; app roles → authorization levels | None; opaque per-assessment owner token |
| Max authorization level | destructive-execution (gated per operation, explicit approval) | planning — hard-coded |
| Confidence | rule confidence, uncapped | capped at 0.74 (medium) |
| Persistence | PostgreSQL (planned) | in-memory, TTL, immediate delete |
| Output | same bundle + `VALIDATION-STATUS.md` | same bundle + `DEMO-NOT-FOR-PRODUCTION.md` |
| Execution | controlled, approval-gated (not yet implemented) | technically impossible |

The 14 questions from §1 map onto `ResourceDecisionRecord`: 1–5 → `nativeMoveSupport`, `regionalRelocationSupport`,
`recommendedTool`, `dataDisposition`; 6–8 → the four dimension dispositions; 9 → `disposition` (retain/retire/replace/
redesign/unknown); 10 → `evidence`; 11 → `missingInformation`; 12 → `confidence`; 13 → `prerequisites`, `risks`,
`validationMethod`, `rollbackMethod`; 14 → `generatedArtifacts` and the bundle.
