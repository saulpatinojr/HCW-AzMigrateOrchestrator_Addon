# Operations runbook (demo)

- **Health:** `curl -s https://<domain>/api/health` → `{"ok":true,...}`.
- **Logs:** `docker compose -f docker-compose.lab.yml logs -f lab-api` (JSON lines, redacted, no inventory content).
- **Restart / upgrade / rollback:** see `docs/deployment/vps.md`. Restarting drops in-memory assessments by design.
- **Rule update:** follow `docs/rules/README.md`; deploy = rebuild image.
- **Abuse:** rate-limit at Caddy (`rate_limit` module) if needed; the API already bounds body size, rows and stored assessments.
- **Data requests:** nothing is persisted; an assessment is gone at TTL or on delete; container restart purges everything.
