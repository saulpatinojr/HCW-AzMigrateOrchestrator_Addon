# Threat model (web-front edition, framed by hybridcloudworks.com)

| Asset | Threat | Control |
|---|---|---|
| Uploaded inventory (sensitive infrastructure metadata) | Disclosure to other users | UUIDv4 IDs + 192-bit owner token (hashed, constant-time compare); 404 for unknown/foreign IDs; in-memory only; TTL sweep; immediate delete |
| | Disclosure via logs | Logger never serializes objects; redaction of connection strings/SAS/JWT/keys; only counts and IDs logged |
| Service | Resource exhaustion by volume | 5 MB body limit (socket destroyed past limit), 5000-row limit, 200-assessment cap, container memory/pids limits, read-only FS, no-new-privileges, all capabilities dropped |
| | Abuse of the anonymous upload route | Human verification (token verified server side with the host-vault secret) on every upload; **fail closed**: without a secret the route answers `503 turnstile_not_configured` at once, closes the connection and never reads the body, unless `AMO_ALLOW_NO_TURNSTILE=1`, which is never set on a host; a secret without its site key refuses to start |
| | Request floods from one client | App-level token bucket per client address on `POST /api/assessments` and the workspace request (`AMO_RATE_LIMIT_POSTS` per `AMO_RATE_LIMIT_WINDOW_MINUTES`, default 10 / 10 min) → `429 rate_limited` with `Retry-After`; the host's Caddy rate limit sits in front |
| | CPU exhaustion by concurrent assessments | `AMO_MAX_CONCURRENT` (default 2) requests at once, counted from verification through the assessment; beyond it `503 overloaded` with `Retry-After: 5`, before any engine work |
| | Connection exhaustion through a stalled verification endpoint | Each siteverify call is bounded (5 s, aborted and raced) and a timeout is a failed verdict (`siteverify-timeout`); stalled verifications occupy at most `AMO_MAX_CONCURRENT` slots |
| | A zero or garbage limit disabling a bound | `AMO_RATE_LIMIT_POSTS`, `AMO_RATE_LIMIT_WINDOW_MINUTES`, `AMO_MAX_CONCURRENT` and the TTL are accepted only as positive integers; anything else refuses to start with the variable named |
| | Client-address spoofing of the limiter or the verification `remoteip` | The socket peer is the client unless `AMO_TRUST_PROXY=1`, in which case only the **first** `X-Forwarded-For` value, which the host's Caddy sets and nothing else can reach on the loopback port; `CF-Connecting-IP` is never read |
| Visitor (framing) | Clickjacking, framing by a foreign site | CSP `frame-ancestors` from `AMO_FRAME_ANCESTORS` (`'none'` by default, with `X-Frame-Options: DENY`; on the host exactly the site origins, equal to Caddy's `caddy_frame_ancestors`); `base-uri 'none'`, `form-action 'self'` |
| | The pane escaping the site's sandbox | The site frames with `allow-scripts allow-same-origin allow-forms allow-downloads` only, never `allow-top-navigation` or `allow-modals`; the pane is cross-origin to the site so scripts plus same-origin cannot lift the sandbox; navigation to the site goes through a `navigate` message the site validates against its allow-list |
| | Messages to or from the wrong window | The pane posts only to the origins in `AMO_SITE_ORIGINS`, never `*`; the site accepts a message only from the frame's own window and the AddOn's origin with `type`, `id` and a known `state`; the site sends nothing |
| | XSS in the pane | All dynamic content escaped by React; CSP `default-src 'self'`, `script-src 'self'` plus the verification script origin only when a site key is configured, `connect-src 'self'`; no inline scripts; hashed assets immutable, `index.html` `no-cache` |
| | Path traversal (static files, bundle files) | Normalized paths must stay under the static dir; bundle files looked up by exact key; `..` rejected in zip/bundle writers |
| | CSV formula injection in outputs | `looksLikeFormula` neutralisation on ingest and in `decisionsCsv`/`csvSafe` |
| Azure estate | The AddOn reaching Azure | No Azure SDK in the image (`tests/security/edition-boundary.test.mjs`); `assertDemoCannotUseAzure`; authorization capped at planning; `/api/execute` always 403; the lab host grants the container no identity endpoint, no socket, no volumes |
| Credentials | Phishing via questionnaire | Server rejects credential-shaped intent keys; the pane states what is never asked; no password inputs (e2e) |
| Secrets | Verification secret disclosure | Only the lab host's Ansible vault (`vault_addon_migration_turnstile_secret`) holds it; the site key is public by design; nothing secret in the image, Git, Terraform state or the site bundle |
| Generated artifacts | Misrepresentation as production | Safety Agent fails CRITICAL on secret-like content or "production-ready" claims; `DEMO-NOT-FOR-PRODUCTION.md` mandatory; "not production" label in the pane |
| Rules | Tampering by public users | Rules ship inside the published core package; no API writes; snapshot checksum enforced upstream |
| Availability signal | The site mounting a dead pane | The site's status proxy reads `/api/health` (`ok`, `version`, `edition`, `capabilities`, `asOf` only) and shows one sentence otherwise; the pane reports `unavailable` itself; the host's 503 body reads the same sentence |

Enterprise additions live upstream (appliance edition): Entra token validation, app-role authorization, approval records,
Key Vault references, private endpoints, Defender for Cloud on the hosting subscription.
