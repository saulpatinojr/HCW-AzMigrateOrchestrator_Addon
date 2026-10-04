# Threat model (demo edition)

| Asset | Threat | Control |
|---|---|---|
| Uploaded inventory (sensitive infrastructure metadata) | Disclosure to other users | UUIDv4 IDs + 192-bit owner token (hashed, constant-time compare); 404 for unknown/foreign IDs; in-memory only; TTL sweep; immediate delete |
| | Disclosure via logs | Logger never serializes objects; redaction of connection strings/SAS/JWT/keys; only counts and IDs logged |
| Service | Resource exhaustion | 5 MB body limit (socket destroyed past limit), 5000-row limit, 200-assessment cap, container memory limit, read-only FS, no-new-privileges, all capabilities dropped |
| | CSV formula injection in outputs | `looksLikeFormula` neutralisation on ingest and in `decisionsCsv`/`csvSafe` |
| | Path traversal (static files, bundle files) | normalized paths must stay under the static dir; bundle files looked up by exact key; `..` rejected in zip/bundle writers |
| | XSS in UI | all dynamic content escaped; CSP `default-src 'self'`; no inline scripts |
| Azure estate | Demo reaching Azure | no Azure SDK in image; `assertDemoCannotUseAzure`; authorization capped at planning; `/api/execute` always 403 |
| Credentials | Phishing via questionnaire | server rejects credential-shaped intent keys; UI states what is never asked |
| Generated artifacts | Misrepresentation as production | Safety Agent fails CRITICAL on secret-like content or "production-ready" claims; `DEMO-NOT-FOR-PRODUCTION.md` mandatory |
| Rules | Tampering by public users | rules are read from the image/filesystem; no API writes; snapshot checksum enforced in CI |

Enterprise additions (planned): Entra token validation (JWKS, audience, tenant), app-role authorization, approval records
in PostgreSQL, Key Vault references for configuration, private endpoints, Defender for Cloud on the hosting subscription.
