# Architecture overview

```
resources.csv ──► csv-ingestion ──┐                        Azure (enterprise only)
                                  │                              │
                 azure-discovery ◄┘ (DiscoveryProvider)          │ Resource Graph (read-only, adapter pending)
                        │
      intent (questionnaire) ──► agents/orchestrator
                                   │  evidence-engine (rules/*.json, snapshot checksum)
                                   │  dependency-graph (discovered parent/child, inferred edges)
                                   │  landing-zone (profile, prerequisites)
                                   ▼
                          classification-engine ──► ResourceDecisionRecord[] + waves + summary
                                   ▼
                          artifact-generator ──► reports / terraform / scripts / runbooks / validation / evidence / manifest
                                   ▼
                          safety agent (blocks CRITICAL findings)
                                   ▼
            apps/cli · apps/lab-api (+ demo-web) · apps/appliance-api
```

- **One core, two editions.** The demo is the same engine with `edition: "demo"`: no authenticated provider can be
  constructed, authorization is capped at *planning*, every conclusion is capped at medium confidence.
- **Decisions are data-driven.** Rules in `rules/azure` carry Microsoft Learn provenance; the engine never guesses.
- **Four dimensions, not one.** Infrastructure, configuration, identity and data get independent dispositions.
- **Evidence states everywhere.** `observed-from-csv`, `derived-from-resource-id`, `inferred-from-type`, `user-supplied`,
  `general-rule`, `observed-from-azure-api`, `missing`, `requires-authenticated-validation`.

See `docs/adr/` for the decisions behind this shape and `docs/agents/README.md` for agent boundaries.
