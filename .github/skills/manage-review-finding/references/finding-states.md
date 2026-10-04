# Finding states

| State | Required evidence | Action |
| --- | --- | --- |
| OPEN | Original failure path is still reachable | Keep thread open |
| FIXED | Current head removes or correctly guards the original failure path | Acknowledge and resolve |
| NOT_FIXED | Proposed fix leaves the original failure path or creates an equivalent defect | Explain residual defect, correct, re-review |
| DISPUTED | Reviewer and author differ on behavior/risk | Compare evidence, propose alternative, maintainer decides |
| OBSOLETE | Code path/resource/contract no longer exists or is no longer reachable | Resolve with concise reason |
| EVIDENCE_GAP | Closure depends on missing runtime/target evidence | Ask only for the missing evidence |

A resolved conversation is a thread state, not proof of required checks or approvals.
