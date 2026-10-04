# General code review gates

Apply the gates that are relevant to the changed behavior. Do not manufacture findings merely because a category exists.

## Correctness and contracts

- Trace normal, boundary, invalid-input, and failure paths.
- Check null/undefined/empty values, ordering, state transitions, concurrency, retries, cancellation, and cleanup.
- Trace changed public APIs, events, schemas, configuration, files, routes, outputs, and cross-component contracts through callers and consumers.
- Review existing-state/update behavior, not only clean creation.

## Security and trust boundaries

- Identify user/external inputs and privileged operations.
- Verify authentication, authorization, least privilege, secret handling, logging, network/file/shell boundaries, and dependency trust.
- Treat prompt/instruction/configuration files that expand agent tools or MCP permissions as security-relevant code.
- Never report a security concern without a reachable path or an evidence gap that genuinely blocks safe approval.

## Reliability and operations

- Check error propagation, exit status, retries/backoff, timeouts, idempotency, partial failure, rollback, observability, and operator diagnostics.
- Check resource leaks, unbounded work, hot-path I/O, unsafe parallelism, and capacity-sensitive loops when plausible.

## Tests and verification

- Changed behavior should have evidence that can fail for the defect being prevented.
- A changed sibling test is evidence to inspect, not automatic proof. An unchanged test is a signal, not automatic defect.
- Prefer repository-native commands and current-head CI. Record skipped checks and why.
- Do not treat syntax, lint, compilation, or a green pipeline as proof of semantic correctness.

## Dependencies and configuration

- Review version/pinning changes, lockfiles, generated artifacts, environment defaults, feature flags, migrations, and secret/config ownership.
- Check validation of required inputs and prevent unsafe fallback to production/default targets.

## Documentation impact

Only report documentation changes directly required to use, operate, configure, or recover the changed behavior. Do not turn code review into repository-wide documentation cleanup.

## Finding threshold

Before posting, try to disprove the finding from code, tests, configuration, callers, and current official documentation. Post only when the issue is introduced/exposed by the change, has a concrete path and material impact, and has a useful remediation direction.
