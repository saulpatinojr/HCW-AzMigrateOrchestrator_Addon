# Review -> Fix -> Green Head Handshake

```text
AI/Human code creation
        |
        v
Push / PR head SHA
        |
        v
copilot-pull-request-reviewer[bot]
        |
        +--> no finding ------------------------+
        |                                      |
        +--> finding                            |
                |                               |
                +--> disagree -> reason +       |
                |    counter-proposal            |
                |                               |
                +--> Fix with Copilot / @copilot|
                       |                         |
                       v                         |
                 copilot-swe-agent               |
                       |                         |
                       v                         |
                   new commit                    |
                       |                         |
          +------------+-------------+           |
          |                          |            |
          v                          v            |
      closes finding             not closed      |
          |                          |            |
 acknowledge + resolve        explain residual  |
          |                    correct + re-review
          +------------+-------------+           |
                       |                         |
                       v                         |
              current-head evidence <-----------+
                       |
                       v
          required checks + approvals
                       |
                       v
                    merge
```

The finding lifecycle and merge lifecycle are related but separate. Thread resolution closes the review finding; only current-head checks, approvals, mergeability, and repository rules make the PR merge-ready.
