# Severity and output discipline

Use GitHub Copilot code review's High/Medium/Low convention for posted review comments unless repository policy defines a stricter scale. If an internal Critical condition exists, describe it as blocking and map it to High for a surface that only supports High/Medium/Low labels.

## High

Use for a concrete path to major security exposure, data loss, production outage, destructive infrastructure change, privilege expansion, review/approval bypass, stale or unreviewed production artifact, or similarly severe impact.

## Medium

Use for a real correctness, reliability, configuration, rollback, dependency, or security defect with constrained blast radius or additional preconditions. A material evidence gap may also be Medium when the implementation cannot be cleared safely without target-specific proof.

## Low

Use sparingly for concrete limited-impact defects. Do not use Low for taste, optional refactoring, praise, or generic best practices.

## Confidence

- High: directly established by code, tests, current-head tooling, schema, or official documentation.
- Medium: strongly supported but missing one confirming artifact.
- Low: normally ask for evidence rather than post as a defect.

## Review comment

Each finding must include: severity, narrow changed location, concrete defect, trigger/execution path, impact, correction direction, and verification when not obvious. Consolidate one root cause into one finding.

Do not emit style-only comments, diff narration, speculative product claims, duplicate findings, or a generic request to add tests without naming the behavior the test must prove.
