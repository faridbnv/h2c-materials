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

## Phase 1: the decisions made true

### F07: a release is its content (D96)

A twelve-character release ID over the tables, schema, rules, engine and templates, and the dependency lockfile
(`build/src/release.js`) is in the page (top bar, *Save / share*), its file name, `dist/manifest.json`, every saved
scenario and link (`release`, `i`), and every CSV export. A scenario reopened on another release warns before asking its
question again, even on the same data date; a scenario from before releases says its identity was only a date. Every
release published from `main` is kept as the GitHub release `h2c-<release>` (`pages.yml`). `build:diff` reports the
release apart, so a change meant to move nothing still shows 0 differences. The Snapshot row of `method.csv` no longer
says there is no ranking.

Answers moved: none (`build/snapshot/templates.csv` unchanged). Acceptance: S12's four expectations met. One interface
view changed (Compare's printed context names the release).
