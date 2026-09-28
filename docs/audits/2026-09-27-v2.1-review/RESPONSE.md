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

### F02: a product is judged in a state it can be made in (D99)

Each product has decision states (`grades[].states`): as printed and dry; each annealing schedule its sheets state;
conditioned where it publishes conditioned values; and their combinations, each holding only that state's values. Which
headlines a state changes is data (`headline_definitions.csv`, "Changes with annealing", "Changes with moisture", m214).
A scenario says whether the team can anneal (and up to what oven temperature) and whether the part lives conditioned; the
rail asks it, and the results header says the state every product is judged in and how many more materials annealing
would pass, one press away. A verdict in an annealed state carries the annealing it needs; a value from another state is
named in the reason, never used; a value's unstated conditions and standards are said ("specimen form, moisture state and
treatment not stated, admitted for screening"). Exports carry each product's state and what it is not settled by. The UI
fuzz now randomises annealing and the service state.

m215 records Fiberon PET-GF15's annealed heat deflections on the one schedule its sheet states, 120 °C for 16 h (a
reading, for a person to confirm; ACCEPTANCE.md). m212 (with F06) corrected V002780 and V002781.

Answers moved, Strict, as printed and dry: Outdoor 18 → 14 materials, Lightweight 29 → 26, Warm 34 → 29, High-stiffness
19 → 15; Indoor 15 and Flexible 16 unchanged. With annealing permitted: 17, 29, 32 and 19. Every loss rested on a value
measured after an annealing the scenario never said it could do (`templates.csv`, new mode "Strict, annealing
permitted"; `states.csv`, 638 state values that are not the published one). In Explore some FAIL rows are the old rollup
at work (a sibling's failure beside an annealed-only pass); F04 answers those. Acceptance: S01.2, S01.5-6, S03, S04, S05
met (13 expectations), and a new invariant (forbidding a treatment never creates a pass).

### F04: a material fails only when every product fails (D100)

The rollup is PASS when one product passes, UNKNOWN while one is unresolved and none passes, FAIL only when every
product fails; the evaluation carries `someFail` beside its counts, and the table's share says a material with no
demonstrated pass is unresolved rather than failed when not every product fails. Why excluded counts a removal only when
every product fails the requirement. Three tests that pinned D83's old clause were rewritten to D100, with the
counterexample in `test/metamorphic.test.js`.

Answers moved: Strict none. Include uncertain, 263 FAIL → UNKNOWN across the six templates (Outdoor 52 → 113
candidates, Lightweight 55 → 107, High-stiffness 63 → 113, Flexible 65 → 116, Warm 92 → 126, Indoor 115 → 130), and as
many with estimates on. Acceptance S08 met, after its premise was corrected before the code changed (PLA now has four
products above 3 GPa; the question moved to PETG and 100 °C, re-derived from the tables).

### F03 and F12: every template asks the H2C's print gates; the prototype tracks its price (D101)

Every template asks each product's nozzle, bed and chamber against the H2C's (`PRINTABLE`), so Warm environment now asks
the bed too. The rail's "Printable on the H2C" sets the three together; without them the results header says research
mode, with a button that asks them. The Indoor prototype asks printability and tracks its price instead of requiring
one: 38 of 1,077 in-scope products have a sampled Canadian price.

Answers moved, Strict as printed: Outdoor 14 → 5 materials, Lightweight 26 → 11, High-stiffness 15 → 5, Flexible 16 → 6,
Warm 29 unchanged, Indoor 15 → 70. Every material lost is unresolved, not failed (its passing products have no recipe, or
a window the H2C only partly reaches), and Include uncertain keeps it; with annealing permitted: 10, 16, 10, 7, 32. The
interface probe's drawer step now opens the first-ranked material (PA12-CF's passing product has no recipe).
Acceptance: S01.7, S02 (three) and S11 (two) met.
