# Rule refresh reports

`learn-diff.{json,md}` are produced by `scripts/refresh-rules-from-learn.mjs` (weekly via `rules-refresh.yml`, or by hand).
They are evidence for a rule change, never a rule change themselves. Offline: `node scripts/refresh-rules-from-learn.mjs --from <saved-learn-markdown.md>`.
