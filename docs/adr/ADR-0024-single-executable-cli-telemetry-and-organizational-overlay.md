# ADR-0024: Single-executable CLI, opt-in aggregate telemetry, and the owner's organizational overlay

**Status:** Accepted · **Date:** 2026-10-03

## Decisions
1. **Single executable.** `scripts/build-sea.sh` bundles the CLI with esbuild and produces a Node single-executable application
   with the rule corpus embedded as the `rules.json` asset (`loadRulesFromContents`). A consultant can assess a customer CSV on a
   laptop with nothing installed and nothing leaving the machine. `release-cli.yml` builds Linux/macOS/Windows binaries with
   build-provenance attestations on tags. Verified locally: the Linux binary runs from an unrelated directory with
   `"source": "embedded"` and the same rules checksum as the repository.
2. **Telemetry.** Off by default (`AMO_TELEMETRY=1`). In-memory aggregates only — counts by resource type, disposition and
   rule misses — exposed at `GET /api/stats`; never names, IDs, tags, subscriptions or file contents (tested). Its purpose is
   to prioritise rule authoring. `GET /api/rules/coverage` and `docs/rules/coverage.md` publish what the engine covers.
3. **Organizational overlay.** `rules/organization/hcw-standards.json` is the first live overlay (precedence 100): Hybrid
   Cloud Works prefers Azure Storage Mover over AzCopy for storage region/tenant moves. It demonstrates the precedence
   mechanism on real output; the snapshot checksum gate caught the change, the change report named the rule, goldens were
   regenerated deliberately.
4. **Marketplace.** Evaluated in `docs/product/marketplace-evaluation.md`: Managed Application is the fit; defer until two
   real engagements have run the appliance.
