# Output bundle

Layout is exactly the §20 contract: `README.md`, `manifest.json` (sha256 per file, edition, timestamp, input hash, rules
version/checksum, app version, confidence summary, validation status), `DEMO-NOT-FOR-PRODUCTION.md` (demo) or
`VALIDATION-STATUS.md` (authenticated), `reports/`, `terraform/` (modules by separation of concerns), `scripts/powershell`,
`scripts/azure-cli`, `runbooks/` (pre-migration, migration, cutover, validation, rollback), `validation/` (checklist,
reconciliation plan, test plan), `evidence/` (rules used, assumptions, provenance). Golden copies of the sample's key
files live in `samples/expected-reports/`.
