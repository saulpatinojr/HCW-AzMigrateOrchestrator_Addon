# Agents

Generated from `packages/agents/src/definitions.ts` by `scripts/generate-agent-docs.mjs`. Do not edit by hand.

19 agents. Agents marked *enterprise only* are defined but do not run in the demo edition.

## Intake and Scope Agent (`intake`)

Collect source/destination, tenant & subscription relationship, region, landing-zone status, downtime/RTO/RPO, intent.

| | |
|---|---|
| Inputs | questionnaire answers |
| Outputs | MigrationIntent with assumedFields |
| Allowed tools | defaultIntent |
| Prohibited | Never request, store or emit credentials, tokens, keys or connection strings. |
| State | assessment-scoped |
| Handoff | intent built |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | none |
| Audit events | intent.created |
| Deterministic fallback | defaults labelled as assumptions |

## Authentication and Authorization Agent (`authn`)

Establish read-only discovery context; report permission gaps.

| | |
|---|---|
| Inputs | session; credential kind |
| Outputs | Principal; permission gaps |
| Allowed tools | Entra OIDC (enterprise); managed identity; workload identity federation |
| Prohibited | service principal secrets in code; elevating beyond requested level; Never request, store or emit credentials, tokens, keys or connection strings. |
| State | assessment-scoped |
| Handoff | principal established |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | any level above planning |
| Audit events | auth.level.granted |
| Deterministic fallback | demo principal at planning level |

## Discovery Agent (`discovery`) — enterprise only

Azure Resource Graph discovery and service-API enrichment; detect partial visibility; redact secrets.

| | |
|---|---|
| Inputs | scope |
| Outputs | NormalizedResource[] with observed-from-azure-api evidence |
| Allowed tools | DiscoveryProvider.discover (read-only) |
| Prohibited | any write; Never request, store or emit credentials, tokens, keys or connection strings. |
| State | assessment-scoped |
| Handoff | resources normalized |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | none (read-only) |
| Audit events | discovery.completed, discovery.partial |
| Deterministic fallback | fixture provider |

## CSV Discovery Agent (`csv-discovery`)

Parse resources.csv, normalize headers/values, track provenance, reject unsafe input, report missing fields.

| | |
|---|---|
| Inputs | csv text |
| Outputs | IngestionResult |
| Allowed tools | ingestResourcesCsv |
| Prohibited | executing uploaded content; logging raw rows; Never request, store or emit credentials, tokens, keys or connection strings. |
| State | assessment-scoped |
| Handoff | ≥1 resource or explicit error |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | none |
| Audit events | ingest.completed |
| Deterministic fallback | n/a (deterministic) |

## Dependency Mapping Agent (`dependencies`)

Parent/child (discovered) and type/co-location edges (inferred); sequence resources.

| | |
|---|---|
| Inputs | resources |
| Outputs | dependency map; sequence |
| Allowed tools | mapDependencies; sequence |
| Prohibited | labelling inferred edges as discovered |
| State | assessment-scoped |
| Handoff | map built |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | none |
| Audit events | dependencies.mapped |
| Deterministic fallback | n/a |

## Support Matrix and Evidence Agent (`evidence`)

Load versioned rules; detect stale, duplicate and conflicting rules; cite sources.

| | |
|---|---|
| Inputs | rules directory |
| Outputs | LoadedRules; snapshot |
| Allowed tools | loadRules |
| Prohibited | inventing support states; editing rules at runtime |
| State | assessment-scoped |
| Handoff | rules valid |
| Retry | none: deterministic; rerun the assessment |
| On failure | abort: an invalid rule corpus must not produce decisions |
| Human approval boundary | none |
| Audit events | rules.loaded, rules.stale |
| Deterministic fallback | n/a |

## Classification and Decision Agent (`classification`)

Assign disposition per dimension, reason codes, alternatives, confidence; flag human review.

| | |
|---|---|
| Inputs | resources; rules; dependencies; intent; landing-zone profile |
| Outputs | ResourceDecisionRecord[] |
| Allowed tools | classifyResource |
| Prohibited | high confidence from low evidence; ASR as default migration tool; unsupported without alternative |
| State | assessment-scoped |
| Handoff | every resource has a record |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | none (recommendation only) |
| Audit events | decision.created |
| Deterministic fallback | unknown-requires-validation |

## Landing Zone Agent (`landing-zone`)

Determine destination MG/subscription/RG/network/DNS/identity/logging/naming/tags/budget/regional constraints.

| | |
|---|---|
| Inputs | intent; authenticated inspection (enterprise) |
| Outputs | LandingZoneProfile; prerequisites |
| Allowed tools | profileFromIntent; landingZonePrerequisites |
| Prohibited | claiming validation of a real landing zone in demo |
| State | assessment-scoped |
| Handoff | profile built |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | none |
| Audit events | landingzone.profiled |
| Deterministic fallback | sample profile |

## Infrastructure as Code Agent (`iac`)

Generate modular Terraform for recreate dispositions.

| | |
|---|---|
| Inputs | Assessment |
| Outputs | terraform/** |
| Allowed tools | generateTerraform |
| Prohibited | plaintext secrets; import blocks without inspection; claiming production readiness |
| State | assessment-scoped |
| Handoff | files generated |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | apply |
| Audit events | artifact.terraform |
| Deterministic fallback | skip unsupported types with reason |

## Migration Tooling Agent (`tooling`)

Generate PowerShell/Azure CLI scaffolding: dry-run, preconditions, structured logs, exit codes.

| | |
|---|---|
| Inputs | Assessment |
| Outputs | scripts/** |
| Allowed tools | generateScripts |
| Prohibited | embedding credentials; blind retries; executing |
| State | assessment-scoped |
| Handoff | files generated |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | execution |
| Audit events | artifact.scripts |
| Deterministic fallback | n/a |

## Data Migration Agent (`data`)

Define online/offline method, sync passes, freeze, final sync, cutover, validation, rollback per data-bearing resource.

| | |
|---|---|
| Inputs | decisions |
| Outputs | reconciliation plan |
| Allowed tools | buildValidationPlan |
| Prohibited | conflating data path with infrastructure move |
| State | assessment-scoped |
| Handoff | plan built |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | data cutover |
| Audit events | artifact.reconciliation |
| Deterministic fallback | n/a |

## Backup and Disaster Recovery Agent (`dr`)

Identify vault/backup/ASR/failover re-protection needs after migration; keep DR distinct from migration.

| | |
|---|---|
| Inputs | decisions |
| Outputs | secondary actions |
| Allowed tools | classification secondary actions |
| Prohibited | selecting ASR as migration path |
| State | assessment-scoped |
| Handoff | actions attached |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | replication enablement |
| Audit events | dr.evaluated |
| Deterministic fallback | n/a |

## Cost and Capacity Agent (`cost`) — enterprise only

Regional availability, quota, SKU, licensing, coexistence/transfer cost.

| | |
|---|---|
| Inputs | decisions; authenticated SKU/quota APIs (enterprise) |
| Outputs | availability states |
| Allowed tools | Azure quota/SKU APIs (enterprise, read-only) |
| Prohibited | asserting availability without evidence |
| State | assessment-scoped |
| Handoff | states recorded |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | none |
| Audit events | capacity.evaluated |
| Deterministic fallback | unknown + requires-authenticated-validation |

## Wave Planning and Cutover Agent (`waves`)

Application groups, waves, sequencing, entry/exit criteria, cutover, rollback, hypercare.

| | |
|---|---|
| Inputs | decisions |
| Outputs | WavePlan; runbooks |
| Allowed tools | planWaves; generateRunbooks |
| Prohibited | scheduling unknowns |
| State | assessment-scoped |
| Handoff | plan built |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | cutover |
| Audit events | waves.planned |
| Deterministic fallback | type-based waves |

## Validation Agent (`validation`)

Checklist and test plan across infra/config/identity/network/security/data/perf/monitoring/backup/DR/app.

| | |
|---|---|
| Inputs | decisions |
| Outputs | validation/** |
| Allowed tools | buildValidationPlan |
| Prohibited | marking items validated |
| State | assessment-scoped |
| Handoff | plan built |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | none |
| Audit events | artifact.validation |
| Deterministic fallback | n/a |

## Security and Compliance Agent (`security`)

Excess privilege, residency, encryption/CMK, secret transfer, private connectivity, Defender, policy.

| | |
|---|---|
| Inputs | decisions; intent |
| Outputs | risk/prerequisite entries |
| Allowed tools | rule risks; landing-zone prerequisites |
| Prohibited | downgrading a security finding |
| State | assessment-scoped |
| Handoff | entries attached |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | none |
| Audit events | security.evaluated |
| Deterministic fallback | n/a |

## Report and Evidence Agent (`report`)

Executive, engineering, security, data reports; audit records; artifact manifest.

| | |
|---|---|
| Inputs | Assessment |
| Outputs | reports/**; evidence/**; manifest.json |
| Allowed tools | buildBundle |
| Prohibited | omitting disclaimers |
| State | assessment-scoped |
| Handoff | bundle built |
| Retry | none: deterministic; rerun the assessment |
| On failure | fail the stage, record the error in progress, keep earlier outputs |
| Human approval boundary | none |
| Audit events | artifact.bundle |
| Deterministic fallback | n/a |

## Safety Agent (`safety`)

Verify facts/assumptions separated, confidence ≤ evidence, demo labelled, no credentials, no approval bypass, no output misrepresented as validated.

| | |
|---|---|
| Inputs | Assessment; bundle |
| Outputs | safety findings |
| Allowed tools | runSafetyChecks |
| Prohibited | suppressing findings |
| State | assessment-scoped |
| Handoff | always runs last |
| Retry | none: deterministic; rerun the assessment |
| On failure | findings attached; a critical finding fails the assessment |
| Human approval boundary | none |
| Audit events | safety.checked |
| Deterministic fallback | n/a |

## Human Approval Gate (`approval-gate`)

Require explicit approval before role assignments, replication, production deploy, failover, DNS, data cutover, source deletion, destructive or irreversible operations.

| | |
|---|---|
| Inputs | Principal; operation; target |
| Outputs | gate decision |
| Allowed tools | gate |
| Prohibited | auto-approval; demo execution |
| State | stateless |
| Handoff | n/a |
| Retry | n/a |
| On failure | deny |
| Human approval boundary | this agent is the boundary |
| Audit events | approval.requested, approval.granted, approval.denied |
| Deterministic fallback | deny |

## Execution order (orchestrator)

csv-discovery *or* discovery → intake → evidence → dependencies → landing-zone → classification → waves → report (iac, tooling, data, dr, validation, security run inside the bundle build) → safety. The approval gate is consulted only by execution surfaces, which the demo does not have.
