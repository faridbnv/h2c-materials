# Version 2.1: what was done

The [review](REVIEW.md) and its [plan](V2.1-PLAN.md) are the package as delivered on 2026-09-27. The owner asked on
2026-09-28 for the plan to be built on the `v2` branch, taking its recommended answer to each question
([GOALS.md](../../GOALS.md), "Decided on 2026-09-28, for version 2.1"). This page records what each step did, the
scenario answers it moved, and what it left. The work was done by Claude Opus 5.5, an agent; where a step needs a
person (the source spot-check, the team's task trial, a print), it says so and is not claimed.

## Phase 0: the decisions and the acceptance portfolio

| Item | What was done |
|---|---|
| The direction written down | GOALS.md, "Decided on 2026-09-28, for version 2.1": the seven answers, each to become a DECISIONS entry in the change that builds it |
| The review in the record | This folder: the report, the plan, the backlog and the three dossiers as delivered; the package's evidence stays outside the repository (README.md) |
| An independent oracle | [ACCEPTANCE.md](ACCEPTANCE.md): twelve questions and 46 expectations written from the source records before any code changed, run by `test/acceptance.test.js`. On the baseline, the 11 about existing behaviour held and 34 of the 35 new ones failed |
| Invariants | `test/metamorphic.test.js`: seven relations between two runs; three waited on F01 and F04 when written |
