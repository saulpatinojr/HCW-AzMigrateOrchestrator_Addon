---
name: manage-review-finding
description: Manage a GitHub review finding from first comment through fix, disagreement, resolution, and re-review. Use when a Copilot review thread has a proposed fix, a pushed commit, a disputed finding, a request to resolve a thread, or a question about whether another review is required.
---

# Manage review finding

Treat each finding as a state machine tied to one original failure path.

## Procedure

1. Restate the original finding in one sentence: trigger, incorrect behavior, and material impact.
2. Inspect the current-head change that claims to address it.
3. Classify the result using `references/finding-states.md`.
4. Apply exactly one disposition:
   - `FIXED`: acknowledge the concrete closing change, resolve the thread, and stop re-litigating this finding.
   - `NOT_FIXED`: explain the remaining failure path, keep the thread open, and route to `remediate-review-finding` when authorized.
   - `DISPUTED`: compare evidence and alternatives; post a reasoned counter-proposal. Do not treat disagreement as defect evidence.
   - `OBSOLETE`: resolve when the code path was removed or superseded and the original failure path is no longer reachable.
   - `EVIDENCE_GAP`: request only the evidence necessary to establish closure; do not invent a defect.
5. After any commit changes the head, route to `verify-pr-evidence` and `verify-github-merge-readiness` as appropriate.

## Non-negotiable closure rule

If the pushed fix actually closes the original finding, that finding is closed. Acknowledge and resolve it. Do not hold the PR open simply to re-derive the fix or prove the reviewer read it.

## Re-review rule

Request another Copilot review when:

- The fix does not close the finding and a correction is pushed.
- A new commit changes behavior outside the already-verified closing change.
- Repository policy requires new-push review.

Do not require machine re-review solely because a fully verified finding was resolved, unless repository policy says otherwise.

## Thread communication

Thread replies are for maintainers and audit history. Copilot code review does not consume replies as a conversational channel. If machine re-evaluation is necessary, use new-push automatic review or explicitly re-request review.
