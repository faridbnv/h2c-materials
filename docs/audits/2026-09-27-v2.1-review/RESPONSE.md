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

### F05: one ranking across the lenses (D102)

`rankingFor` ranks the candidates on screen by the median index of their passing products, each from its own values in
the state it passes in; the table's order, the Ashby guide's top ten, the line's count and the export's new Rank columns
all read it. A candidate whose passing products do not publish what the index needs says "not ranked". The chart's bubbles
and its Pareto front ("of typical values") are labelled as context.

Answers moved: none (ranking changes order, not eligibility; `test/metamorphic.test.js` holds that). Acceptance S09 met:
for Warm environment by a light, stiff beam, the table, the guide and the export give one order; the review found them
disagreeing (PPA-CF, PP-CF, PA612-CF against PP-CF, PAHT-CF, PPA-CF). With this, every expectation in the portfolio holds.

## Phase 2: the practical workflow

### F10: the narrow filter rail is a modal dialog

Below 1100 px the open filter rail covers the results, so it is now a modal dialog as the material drawer is: the page
behind it is inert, Tab and Shift+Tab cycle inside it, and Escape, its close button and the backdrop return focus to
Filters. `npm run ui:check` checks it on the tablet and phone screens every run; on the old page it reports the two
failures the review found (Shift+Tab reached the background), and Escape already returned focus.

### F09: the answer before the exposition

- **A compact results header**: the answer in one line with what could not be checked beside it; the requirements as
  small pills, the three print gates as one ("Printable on the H2C"); one line saying how every product is judged, with
  "Allow annealing: N more pass"; and the template's limits, the policy's detail and the database's limits one press
  away, their first sentence showing. On a phone, "Read the candidates" jumps to the first row.
- **Products first**: a material's Products tab opens on the products that meet every requirement, each with its state
  (annealed at its sheet's schedule, conditioned), what is not settled and why, and its print recipe before its values; the
  material's spread and its makers' coverage follow, one press away.
- **Compare** shows the passing products' own print gates ("2 of 2 within"), with the material's window across every
  product under it as context.
- **Search** names the products a maker or product search matched, with their own verdicts, and says when the material
  passes on another product (a Polymaker search no longer reads as a Polymaker pass).
- **Empty answers are told apart**: no material confirmable from the records (all unresolved), every one measured and
  failed, or some of each; a requirement no record confirms for any material is named, with a next step, instead of
  "nothing does everything you asked".

Measured at the plan's laptop, 1024 × 768 (Warm environment): the first candidate row moved from 668 to 518 px, four rows
show without scrolling (two before); the first passing product in the Products tab from 1,274 px to 264 px, inside the
drawer's first view. `npm run ui:check` now asserts both. The phone's first row is still below the fold (955 px); the
"Read the candidates" button is the route there. Answers moved: none.

### F11: the exact product the team will print, and its decision brief (D103)

"Choose this product" in a material's Products tab keeps the product in the scenario with the state its answer was in,
the release and the day it was chosen on, and a note; Save / share lists the chosen products with their current answer,
writes each one's decision brief (Markdown: the question, the verdict and state with the annealing it needs, every
requirement's result and records, each cited number as printed with its source, page and SHA-256, the admitted
conditions, what is not settled, the recipe with where each part came from, a suggested confirmation test per
requirement), and records the team's own test results, which never enter the database. The tray says how many products
are chosen. A link carries the choice; the saved file carries the notes and tests too.

Answers moved: none. The interface probe chooses the first-ranked stiff-fixture product and records its decision record.
No account, server or approval workflow was built (GOALS, decision 7).

### F08: the facts that would settle an answer, by product

`npm run audit:scenario-gaps` judges the six templates and the acceptance portfolio's questions as the page does
(Confirmed only, each in the state it permits) and lists every product left unresolved by exactly one requirement: the
fact, the kind of work it needs (another state, conditions, source silent, print test, treatment), when to stop looking,
the questions it would settle, and the research package's owner handoff where one already asks it
([SCENARIO-GAPS.md](SCENARIO-GAPS.md)). On 2026-09-28: 3,475 product facts one step from an answer across 11 questions
(2,584 source silent, 701 conditions, 179 another state, 11 print tests); the table lists every fact that settles more than
one question and the first three per material. The first rows are print gates: IPCON PPA-GF's chamber settles five
questions at once, and four products' chamber windows the H2C only partly reaches need a test print, not a search.

No data was collected: imports stay paused except within the owner's exceptions (GOALS), and this change is the worklist,
counted by products made actionable, never by documents.
