# Security policy

Report vulnerabilities privately to security@hybridcloudworks.com (or via GitHub private vulnerability reporting). Please do not open public issues for security findings. Expect an acknowledgement within 3 business days.

Scope highlights: the lab processes uploaded infrastructure inventories in memory only, never connects to Azure, has no execution surface and holds no credentials; see `docs/security/threat-model.md`. The engine it runs on is the published `@hybridcloudworks/migration-core` from `https://github.com/saulpatinojr/HCW-AzMigrateOrchestrator_App`; report engine issues there (`SECURITY.md`). Supported version: `main`.
