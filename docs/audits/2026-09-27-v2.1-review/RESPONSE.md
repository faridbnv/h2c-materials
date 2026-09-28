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

### F06: a decision value is bound to its own row (D97)

`ingest:apply` now asks, of every row entering, that its value (and spread and bound) be a number its own evidence line
prints whole, with the line's standards taken out first, and that a number the line prints once have one role
(`countInEvidence` in `scripts/lib/pdf-text.mjs`; `APPLY-VALUE-NOT-IN-EVIDENCE`, `APPLY-CONDITION-ROLE`). The review's
52 → 5 MPa corruption is refused, as are 2, 27 and 527 on the same line; a decimal comma, a split number, a spread and a
row a person read on the page image still enter (`test/ingest-apply.test.js`). The reader no longer takes an annealing
schedule's temperature for a test temperature (`propose.mjs`, with a test that fails on the old reader).

Measured on the archive before it was switched on: 16,990 of the 17,006 accepted values in the proposals bind; of the
16 that do not, most are an OCR'd standard read as the value ("!1SO179" as 179). A batch applied before is not refused
after the fact: `npm run audit:witness` lists the recorded rows that do not bind (`WITNESS-BINDING.md`): 11 of 7,739,
ten of them corrected against their page since, one a value printed against its label with no space.

m212 corrects the two rows the review found: V002780 and V002781 keep their 90 °C, 4 h anneal and no longer claim a
test at 90 °C, re-read on the hash-checked page. Answers moved: none (HDT has no test-temperature condition).

### F01: a product's verdict rests on its own records (D98)

The engine judges a product's environment requirements on its own records (or a twin's, the same sheet), its stock on
its own offers (`grades[].buy`), "a product-specific measurement" on its own or its twin's, and conflicts on the
findings about it: `coverage.csv` has a GradeID (m213), and the seven conflicts about one product are scoped to it. A
sibling's record or a material-wide note is named as context and never passes. The maker's "Fair" and "Fair-Poor" read
as limited resistance, and a record in words no verdict is read from, beside a positive one, leaves the requirement
unresolved (D05). Each product's own results and cited records travel with the evaluation.

Answers moved (old and new engine, same database, 1,077 in-scope products): products passing acids 142 → 7, alkalis
142 → 7, solvents 7 → 1, oils and grease 44 → 6, water 709 → 41; in stock 726 → 41 (the review's 685 inherited stock
passes, exactly); listed 752 → 46; a product-specific measurement 1,077 → 1,050; no unresolved conflict 936 → 1,067.
Materials: oils and grease 5 → 6, no conflict 128 → 135. No template screens on these, so `templates.csv` did not move;
`environment.csv` shows the two re-read ratings. Acceptance: S06 and S07 met (7 expectations), and two invariants.

Left: the engine is not told which acid, alkali or solvent a part meets (the review's acetone example). Category
separation already keeps oils from answering solvents, and the reason names the records' exposures; asking for an
agent is an interface question for when a team needs it (OPEN-PROBLEMS).
