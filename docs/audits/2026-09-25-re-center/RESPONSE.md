# Re-center: what was done

The [report](REPORT.md) is the review and plan as the owner approved it on 2026-09-25. This page records what each phase did,
with the figures its gate asked for.

## Phase 0: pause, tidy, tell the truth (2026-09-25)

| Item | What was done |
|---|---|
| The goal written down | [docs/GOALS.md](../../GOALS.md): the goal, the method, the two data tiers, the scorecard, what is decided and not yet built (D83 to D85), the working rules. `CLAUDE.md`, `AGENTS.md` and `docs/README.md` send a reader there first |
| Imports paused | `AGENTS.md` ("Importing a batch of data sheets") and the head of `PLAN-REMAINING.md`, which is marked superseded as the working plan |
| The close report corrected | V2's `RESPONSE.md` said every ledger row was terminal; 39 were `held`. Corrected, with a note on who reviewed and what parity measures |
| Who reviewed | Every one of the 20,478 review decisions in the import's proposals is an agent's. `AGENTS.md` now says "a named reviewer (a person, or an agent named as one)" and that a report must say which |
| What parity measures | `ingest:propose -- --compare --all` now also scores the reader against only the values recorded before the import (up to V002645, commit 73de8d2), which it did not write; STATUS.md shows both. **Independent parity 87.1 %** (1,759 of 2,020 values on 141 sheets), against a regression figure of 96.6 %. Most makers imported in V2 have one such sheet or none |
| Stale documents | DATA-MODEL (counts in the diagram, the calibration table and the estimate counts now point at `build/reports/validation-report.md`), ARCHITECTURE (payload size), HOW-IT-WORKS ("about a hundred filaments"), README (the mode buttons' names), PIPELINE (a timing that contradicted itself, a test file's name), OPEN-PROBLEMS §8 (source counts), `docs/README.md` and `docs/audits/README.md` (the index), the b27 batch title, `bundle.js` and `ui-fuzz.mjs` comments |
| Decisions | D83 (a material is the range of its products), D84 (two evidence levels) and D85 (the record tier) are written in GOALS.md as decided; each enters DECISIONS.md in the change that builds it |
| Faster checks | The build result is cached by content (`build/src/build-cache.js`, `.cache/build/`, keyed on the tables in memory, the build code, the runtime and the options; a private copy per hit; off in CI, in the audit's rebuild, the scale check and the reproducibility test, and with `H2C_NO_BUILD_CACHE=1`). Tests that look only for a compile or validate error build without estimates; the declared-variant test's four builds run in parallel; the import pipeline's tests moved to `npm run test:ingest`, which `verify` runs. Five tests pin the cache key and its entries |

**Gate.**

| | Before | After |
|---|---:|---:|
| `verify:fast`, after a change (empty cache) | about 168 s | 75 s |
| `verify:fast`, nothing the build reads changed | about 168 s | 29 s |
| Tests passing | 433 | 438 (274 in `npm test`, 164 in `test:ingest`; 5 new) |
| `npm run verify`, end to end | documented as about 24 min | 3 min 39 s, passing |
| `npm run build:diff` | | 0 differences |

`dist/db.json`, `reference.json` and the page are byte-identical with the cache off, on a cold run and on a hit.

**Found, not changed:** a build result shares two module constants (`db.meta.h2cBaseline`,
`db.meta.estimateModel.levels`), so a caller that edits one changes later builds in its process; the cache hands out
copies, but the build should copy them itself. `build/package.json`'s own `test` script still runs every file.

**Branching (owner, 2026-09-25).** V2 is not merged into `main` and is not tagged as a release: the owner is not
satisfied with the state V2 closed in. The re-center is how V2 gets finished, so it continues on the `v2` branch, one
commit per phase step; `main` stays at V1 until the re-centered V2 passes its phase 3 gate and the owner asks.

**Waiting on the owner:** the taxonomy decision in phase 5 (Bambu's product lines as products of their material, an
"other / unspecified" home per family).

## Phase 1: every product's own values and print recipe, by rule (2026-09-25)

`build/src/products.js` adds, beside each material's headline and deciding nothing yet:

- **`grades[].headline[key]`**: each product's own value per headline, chosen by rule from its own measurements, at
  one of two levels (D84 as decided): comparable, or as published where the source leaves the direction or the load
  unstated. A `headlines.csv` value row pins its product's value.
- **`grades[].print`**: each product's own recipe from its own profiles: the gate and window per axis, enclosure,
  hardened nozzle, drying, and the annealing its sheets state. Never a union across the material.
- **`materials[].summary[key]`**: the spread across the material's procurement products that are not declared
  variants: products, n comparable, range, quartiles, median, the typical product, and the as-published values and
  variants counted apart.

`aggregateGate` moved to `build/src/gates.js` and `cents` to `normalize/values.js`, unchanged, so a product and a
material share them. The contract (`schema/db.schema.json`) describes the three additions; the snapshot gains
`products.csv` and `summaries.csv`, and `npm run sql` gains `products_compiled` and `summaries_compiled`.

**Gate.**

| | Result |
|---|---|
| `npm run build:diff` | only `db.grades[].headline` (1,098), `db.grades[].print` (1,098) and `db.materials[].summary` (153): nothing that existed moved |
| The rule against the 477 hand picks | **all 477 agree** (471 the same measurement, 6 the same value): [rule-vs-hand-picks.md](rule-vs-hand-picks.md). The picks are redundant, which phase 4 acts on |
| Headlines the hand left empty that the rule fills on the representative grade | 122, listed in the same report (PLA's strength among them: a printed XY break strength of 56 MPa nobody selected) |
| Product values | 3,356 on 3,318 distinct measurements, against 2,166 measurements on representative grades before: density 843; modulus 254 comparable + 307 as published; strength 335 + 393; elongation 328 + 361; heat deflection 415 + 82; price 38 |
| PLA, stiffness | 27 comparable products, 0.95–2.95 GPa, median 2.27, none at 3 GPa; 46 as published, 1.44–4.78 GPa, 30 of them at 3 GPa or more; 11 variants apart. The report's first figures (0.95–3.4, 49) came from a looser query and are corrected there |
| Tests | 9 new (`test/products.test.js`), each a rule over every product; 283 pass in `npm test` |
| `verify:fast` / `verify` | 71 s cold / 3 min 1 s, passing |
| `db.json` / page | 20.1 → 20.8 MiB / 6.03 → 6.14 MiB |

Where the hand picks sat matters for phase 2: the report lists, per material, the share of its products at or below
the picked value. 87 picks sit at an extreme (0 % or 100 %) of their material; PA12-CF's stiffness, for one, was 8 GPa
against a median of 3.3 across its four comparable products.

Not built in this step, and why: a print summary per material (the engine will need the products' recipes, not a
summary of them; the table's print columns come in phase 3), and D83/D84 in DECISIONS.md (they are entered with the
phase 2 change that makes them decide).

## Phase 2: the engine answers all / some / none, including printability (2026-09-25)

`app/js/engine/products.js` gives a **product view**: the material with one product's values and its own print recipe.
`evaluateProducts` (`constraints.js`) judges every product on every requirement at once and rolls up: PASS when one
product passes, with share ALL or SOME; FAIL (NONE) when none passes and one fails; UNKNOWN when none could be judged;
untested products counted and never held against the material. The material's estimate stands in only where none of
its products publishes a comparable value. `runSelection` and `explainExclusions` do this whenever the context carries
`productsByMaterial`; `explainExclusions` also counts the products each requirement removes. `rankMaterials`
(`indices.js`) ranks by the median index over a material's passing products, computed product by product. Search finds
a material by its products' makers and names ("Polymaker", "Prusament"), in the page and in the fuzzer alike. D83 and
D84 are entered in DECISIONS.md, with D8 marked superseded in its refusal of a range and D2 and D37 amended.

**The page still judges materials on their headline**, as planned: phase 3 switches it, with the interface that can
show a SOME row. `build/snapshot/templates-products.csv` holds the templates judged by products.

**Gate: the decision diff**, six templates, Include uncertain, materials judged by their headline against by products:

| Template | Headline: PASS / FAIL / UNKNOWN | Products: PASS / FAIL / UNKNOWN | FAIL→PASS | UNKNOWN→PASS | UNKNOWN→FAIL | SOME |
|---|---|---|---:|---:|---:|---:|
| Outdoor structural part | 17 / 88 / 48 | 18 / 96 / 39 | 1 | 0 | 9 | 8 |
| Indoor prototype | 20 / 35 / 98 | 20 / 35 / 98 | 0 | 0 | 0 | 0 |
| Lightweight structure | 23 / 84 / 46 | 27 / 93 / 33 | 4 | 0 | 13 | 11 |
| Warm environment | 23 / 57 / 73 | 28 / 63 / 62 | 1 | 4 | 7 | 13 |
| High-stiffness fixture | 12 / 87 / 54 | 18 / 85 / 50 | 6 | 0 | 4 | 10 |
| Flexible component | 8 / 91 / 54 | 13 / 93 / 47 | 1 | 4 | 3 | 1 |
| **Total** | 103 / 442 / 373 | 124 / 465 / 329 | **13** | **8** | **36** | 43 |

No PASS was lost, per-product print gates included. The 13 FAIL→PASS match the phase 1 estimate of about 14. Examples:
- PA6-CF, PET-CF, PAHT-CF, ASA-CF, PETG-CF and PA6-GF pass the stiffness fixture through a product the representative
  grade was not.
- PLA passes the warm-environment template through 5 of its 63 judged products (135 untested), and PETG through 1 of 27.
- The 36 UNKNOWN→FAIL are materials whose representative grade was silent but whose products that publish all fail:
  PLA Silk's 10 judged products for heat, PP's 5 for stiffness.

UNKNOWN among the materials not ruled out fell from 78 % (373 of 476) to 73 % (329 of 453).

| | Result |
|---|---|
| Tests | 10 new engine tests (`test/selection-products.test.js`: joint judgement, all / some / none, D84 levels, print gates per product, the estimate's reach, a material without products, why excluded, ranking), 1 search test; 293 pass in `npm test`, 164 in `test:ingest` |
| `verify` | 3 min 41 s, passing; the page's 63 views and 300 fuzzed scenarios unchanged |

Not built in this step: `rankBy` and `evidence` in the scenario and its link, which arrive with the controls that set
them (phase 3), so no saved scenario changes shape before the page can use it.

## Phase 3: the interface follows the funnel (2026-09-25)

The page now judges every material by its products and shows it as their spread.

- **Boot.** The page shows each material as the spread of its products (`displayMaterials`,
  `app/js/engine/products.js`): a headline that products publish comparably becomes their typical value (median) with
  their range; one no product publishes keeps what the build gave it (an estimate, a related value, not published,
  not applicable). The engine judges by products (`ctx.productsByMaterial`). The fuzzer applies the same transform and
  the same context, so the page is still checked against the engine it runs.
- **Table.**
  - Each number cell shows the typical value with its range and count under it (`2.27` over `0.95–2.95 · 27`).
  - The Result shows how many products pass (`1 of 4`), with the untested count in its popover and a way to the
    products.
  - **Rank by** orders the results by a performance index over each material's passing products, and names the best
    product under each material.
  - The legend explains the new marks; "headline" has left the screen.
- **Drawer.**
  - The Grades tab is now **Products**. It opens with the material's spread per property and, with requirements set,
    the products that meet all of them first.
  - Each product shows its own values (marked where not comparable), **How to print it** from its own profiles, and
    **What the maker says** (its print notes and evidence records, or the gap stated).
  - A grade estimate is shown only where a product has no comparable value of its own; the "10–10 %" bug is gone.
  - The Overview counts, per axis, how many products the H2C can print.
- **Ashby chart.** Each material is a bubble behind its typical point (the middle half of its products, whiskers to
  the extremes). **One product** plots every product with both values comparable.
- **Compare** draws each material's product range behind its bar.
- **Export.** **Export their products** writes every product of the materials on screen with its values, levels,
  print settings, source and verdict.
- **Evidence and links.** **Also count values published without their test direction or load** (Evidence filters)
  lets such values decide (D84). The goal and the evidence level travel in links and saved scenarios only when set,
  so every older link reads as it did.
- **Plain language.** The estimate popover now says, for a non-statistician, what the range is, how often ranges like
  it held when tested, and that an estimate never passes a material. "Good precision" no longer claims to decide.
- **Templates.** `build/snapshot/templates.csv` is judged by products, as the page is; `templates-products.csv` is
  gone.

**Gate.**

| | Result |
|---|---|
| Views | 65 (two new: the stiffness fixture ranked by specific stiffness, PA12-CF's Products tab), reviewed; no layout failure on laptop, tablet or phone |
| Fuzz | a new invariant, I5-spread (neither end of a range may be rounded across a threshold), with range ends probed as thresholds; 300 scenarios in `verify` and 600 on seed 3 with no violation. 2,000 on seed 11 found 168 of one kind: a reader's assumption lost to a product value that was not comparable, and the reason called it published. Fixed (an assumption stands in wherever no value may decide) and pinned by a test; 2,000 on seed 11 then clean |
| PLA | reads `2.27` over `0.95–2.95 · 27`, with 46 values published without a direction set apart |
| PPS-CF | each product's own nozzle window in its Products tab; the material's recorded range kept only as a guide |
| Boot | about 0.36 s to the first result in headless Chrome from a cached file, 104 MB heap: no second payload needed |
| Tests | 295 in `npm test` and 164 in `test:ingest`, all passing; `verify` 3 min 41 s |
| Build | `build:diff` shows only the rewording of the related-evidence reasons ("not comparable", not "not the headline") |

**Not done in this step, and why.**
- Rows do not expand in the table. The Products tab, one press away from every row and from the "1 of 4" mark, shows
  the passing products first, and the table's rows stay one per material, which is what the fuzzer and the views
  check.
- The team test needs two of the team's engineers: its script is [team-test.md](team-test.md).

## Phase 4: the representative grade retires (2026-09-25)

*In plain words: nobody chooses a material's number any more. The build works it out from the material's products, and
the machinery that held the old one-product shape together is gone.*

**What changed.**
- **A material's headline is derived by the build** (`build/src/products.js`): its products' median, range and count,
  and the typical product nearest the median. The page shows what the build gives; the transform it ran at boot in
  phase 3 is gone. A material whose every product is a declared variant (PP Lightweight) is its variants.
- **m137 retires the representative grade.** `materials.csv` loses the column; `headlines.csv` loses its 477 value rows
  and 16 context rows, and keeps its shape as the place to pin one product's value, now with a Reason. Everything
  removed is archived word for word in [retired-representative-picks.csv](retired-representative-picks.csv) (519 rows:
  every pick, and every material's representative grade) and named in `data/review/removed-records.csv` (D72).
  `rule-vs-hand-picks.md` regenerates from the archive and is unchanged: 477 of 477 agree.
- **The estimate stage lost its representative-grade special cases** (`estimate/index.js`, `bounds.js`, `grades.js`,
  `observations.js`, `calibration.js`, `screening.js`, `validate.js`). Calibration and the screening back-test hide each
  material's typical product. A material estimate exists only where no product publishes comparably: 255 became 184,
  and 71 materials' values that were estimates are now their products' medians (477 measured values became 548). With
  one product the estimate is that product's; with several it predicts an unmeasured one. The first attempt predicted
  at the material's mean, which the model's kernel gives no product term, so it read narrower than any single product;
  the fix is a formulation of its own, which carries the spread between products. A grade estimate is attached only
  to a product without a comparable value of its own (4,200 became 2,543). The unstated-load bracket went: D84 counts
  such values apart, and no material headline has an unstated load.
- **Heat deflection does not apply to an elastomer, by its definition.** `headline_definitions.csv` hdt045 Applies to
  is now `Morphology: amorphous | semicrystalline | not modelled`, the polymer's morphology from `polymers.csv` (a new
  field the Applies-to grammar may test). Before, the estimate stage held out only the elastomers whose representative
  grade happened to publish none; TPC-ESD's hand pick decided, and without the rule TPU would have passed Warm
  environment on Flashforge TPU95A's 95 °C, a value the physics lint flags (W0059, accepted as published). Now every
  elastomer's HDT is shown as its sheet's measurement and decides nothing (D56 amended).
- **Checks.** REP-GRADE-NOT-OWN, HDT-LOAD-WRONG and HDT-LOAD-UNSTATED are gone (112 rules became 109); HEADLINE-CITATION,
  HEADLINE-DIRECTION, MEAS-HEADLINE-TYPE and QUARANTINE-NUMERIC now check product values, which is where a value can
  decide; HEADLINE-SELECTION-INVALID and -MULTIPLE check pins (one per product and headline, and one that could be
  the value). `scripts/data/representative.mjs` is retired. A reason names a caveat when a value published without its
  load or direction decides because the reader included such values.
- **Tests** that asserted the old shape now assert the rule over every product, or the product the record was about:
  `test/headlines.test.js` tests pins; nine record tests in `database.test.js` read the product that was the
  representative grade; the bracket tests are one test of an as-published value's reason.

**The decision diff** (`build/snapshot/templates.csv`, six templates):

| Mode | Answers moved | What |
|---|---:|---|
| Strict | 0 | |
| Explore | 1 | TPC-ESD enters Warm environment as unknown: its hand-picked HDT had failed it, and an elastomer's HDT no longer decides |
| Explore with estimates | 19 | 13 screens lifted, because an estimate that stands in for every product of a material is wider than one describing one product: PA66, PA612, PET, PBT, PC-PTFE, PE-GF, PLA-GR, PLA-EC, ABS-AF and ASA-AF at 5 GPa, PLA-EC at 3 GPa, PETG-PTFE and PET-LW at 80 °C. 4 added: PP at 2.5 and 5 GPa, SAN and PE-GF at 100 % elongation. TPC-ESD is screened by not applicable, and TPU-CF gains a second reason |

Seven build findings moved with the medians and were reviewed one by one: three acceptances no longer occur and are
removed (PLA-CF and PLA-NF below PLA, TPU's elongation outlier); four are new and accepted with their reasons (PLA-EC's
density, ASA-GF and ABS-AF below their unfilled siblings, PA12-AF's estimated HDT below PA12's median). The page counts
142 materials with a density where it said 127, because the count is now the build's and the build now knows what the
page showed.

**Not done in this phase.**
- The stored copies (Availability's "Retired mapping" beside Status, H2C status "Excluded" beside Scope) stay, with
  the checks that keep each pair in step: removing a column there is hygiene that moves no answer, and it waits for
  phase 5.
- A material's print summary and gates (`materials[].print`, `.gates`) are still the union across its products. The
  engine reads them only for the four materials with no product, and the drawer shows the union as "a guide rather
  than one recipe" beside each product's own. Phase 5 decides whether it stays.
- The record tests that pin one product's number stay until phase 5 turns them into rules.

| | Result |
|---|---|
| `npm run data:check` / `data:lint` | 0 issues / 287 findings, all accepted, 0 new |
| `npm run build` | 0 errors, 4 warnings; `db.json` 21.0 MB became 19.8 MB |
| `npm run build:diff` | 11,963 differences: every material headline (its shape and, where it had several products, its value), `representativeGrade` and `headlineEvidence` gone, `pinned` gone from 476 product values (the 477th, TPC-ESD's HDT, is no longer a value), the elastomers' HDT product values and summaries (8 and 14), 1,657 grade estimates, the material estimates' ranges, `meta.estimateModel` (calibration, screening, outliers, `bracketScreening` gone), `meta.consistency`, and one material's closest related value, chosen without the representative grade's weight |
| Tests | 301 pass |
| `verify:fast` | 28.5 s with the build cached |

## Phase 6, lane 1: the record (2026-09-25)

Scorecard line C11 (the record), working rule 2. `npm run sql` / `npm run db:sqlite` now writes the record tier into
`dist/h2c.sqlite` (`scripts/data/record-tier.mjs`, called by `writeSqlite`). Nothing is stored under `data/tables`:
every row is derived from the committed proposals, the ledger and the tables, and the index from the text cache.
D85 is entered in DECISIONS.md.

- **`source_facts`** has one row per distinct line (document, page, text) that the import reader read without it
  becoming data, deduplicated across the batch folders that re-read a document.
  - `skipped` lines carry the reader's reason. `unapplied` lines are rows it made on a document the database cites no
    source for (deferred, held, a copy); the report calls these "the rows the build never used".
  - Each row carries the document's digest and ledger key, the source the ledger registered it as, that source's active
    grades, and the known property the line names. That property comes from the reader's own naming, or else from a
    `properties.csv` name found in the words, and `property_by` says which.
  - A row a reviewer rejected is left out.
- **`documents`** has every document the ledger, a proposal or `sources.csv` names by digest.
- **`documents_fts`** is an FTS5 index of every cached document's text, one row per page. It is built only where
  `.cache/text` is present, so CI and a fresh clone have none; `dist/` is not committed.

| | Result |
|---|---|
| Skipped lines in the proposals | 82,848 occurrences in 2,957 proposal files; 39,468 distinct on 1,499 documents |
| `source_facts` | **42,016**, from two kinds:<br>• 39,382 skipped lines: the 39,468 less 86 that a later batch made a row of on an unregistered document<br>• 2,634 unapplied rows: 1,758 measurement lines on 181 documents and 876 print-setting lines |
| Reached | 1,499 documents and 1,117 sources (29,201 facts); 951 active grades of 124 materials (25,452 facts) |
| Deferred for identity alone | all 74 documents: 3,164 facts, 681 of them the values they were deferred with |
| A known property named | 5,965 facts: 4,916 by the reader's naming, 1,049 by a registry name in the words |
| `documents` / `documents_fts` | 2,178 documents (2,009 in the ledger, 169 cited only in `sources.csv`); the index holds 4,482 pages of the 2,036 whose text is cached, 13.8 MB of the 55 MB file |
| Time | the record tier 0.9 to 1.3 s; `npm run sql -- --rebuild` 1.7 s in all |
| Tests | 7 new in `test/sqlite.test.js` (listed in D85); 300 pass in `npm test` |
| `verify:fast` | 30 s with the build cache warm, against 26 s before, with another session loading the machine (load average 10). One run took 107 s, because the shared `.cache/build` had just been emptied |
| `npm run verify` | Every step passed except the scale check's time budget: `test:ingest` (164), the audit, the snapshot, the 63 views and the 300 fuzzed scenarios. The scale check builds the tables at twice their size, which this change does not touch. Its compile budget is 150 s, and it took 297 s, then 475 s, while a concurrent session held the load average at 10 to 36. It is to be re-run on a quiet machine |
| `npm run build:diff` | 0 differences: `dist/db.json` does not change |

**Gate: a query finds a given skipped fact by its words and page; nothing in `db.json` changes.** The line is the
one the report quotes:

```
$ npm run sql -- "select kind, sourceid, gradeids, page, text, reason from source_facts where text like '%linear) shrinkage%' and page = 1"
kind     sourceid                       gradeids  page  text                                            reason
-------  -----------------------------  --------  ----  ----------------------------------------------  -----------------------------------------------
skipped  S-SPECTRUM-en-tds-spectrum-pp  G082-03   1     • low processing (linear) shrinkage up to 0.3%  no property and value this line states together
```

The report's own questions, over the cached text:

```
$ npm run sql -- "select count(distinct sha256) as documents, count(*) as pages from documents_fts where documents_fts match 'anneal*'"
documents  pages
---------  -----
194        254
```

The same count for `'"UL 94"'` is 278 documents, and for `'"insulation resistance"'` it is 96.
`test/sqlite.test.js` pins the gate query. `npm run build:diff` shows 0 differences, and a test checks that writing the
SQLite file leaves `dist/db.json` byte-identical.

**Found, not changed:**
- **Lines stay `skipped` after a later row.** 143 lines were skipped by one batch and made a row of by another, on
  documents that are registered, and they stay `skipped`. For 110 of them a measurement with the same property and
  raw value is now in the database. The other 18 measurement rows are not, and 17 of them were read only in held
  batches (`bNN-held`, `held-research`); they are candidates for lane 4's re-read. The remaining 15 lines became print
  settings.
- **Reasons differ between batches.** 294 lines have a different skip reason in different batches; the latest
  batch's reason is kept.
- **Copies share a source.** Several digests can share one registered source, because the ledger registered a copy
  under another document's source (`S-SPECTRUM-en-tds-spectrum-pla-premium` has 5). Their facts carry that source,
  and `sha256` still names the document read.
- **Ledger keys are not always digest prefixes.** Some ledger `doc_key`s are URLs or `url:` keys from the early
  batches.
- **The property heuristic has blind spots.** It misses synonyms: "heat deflection" is not matched to HDT, and "Tg"
  is not matched. It also takes false friends: "Infill Density" is matched to Density.
- **The sample check is still to do.** GOALS.md asks for a person to read 30 to 50 rows per lane against the page
  image, and that has not been done.

## Phase 6, lane 2: printability and treatment, from the documents already cached (2026-09-25)

Phase 6, lane 2 (GOALS step 2, C9). Since D83 each product's own profiles screen it, and a product whose profile is
silent on an axis is unknown on that gate. Migration `m136-print-recipes-the-sheets-state` writes what the products'
own sheets state and the database did not record. Every statement is pinned, with its page and the label of its row,
in `scripts/migrate/m136-print-recipes-the-sheets-state.csv` (356 cells) and `…-annealing.csv` (61 statements); the
migration re-reads each on its cached, hash-checked page before writing (the statement's words stand on that page in
order), and checks the typed columns against the build's own parsers. The reviewer of every row is an agent (Claude
Opus 5.5), reading the candidates the rules below proposed; no person has reviewed them.

**The census, before anything changed.** Of 1,098 active products, per axis: how many lack it, and what their own
cached documents say. "Own" means a document linked to that product alone (grade source, profile or measurement
source), from the maker or resin producer. The import's proposals had extracted almost none of it: their `settings`
lines give a value for only 6 of the products lacking a chamber, 18 lacking an enclosure and 15 lacking drying.

| Axis | Lacking | Own document mentions it | A labelled row or a sentence the rules found | Filled |
|---|---:|---:|---:|---:|
| Chamber or enclosure (neither recorded) | 830 | 182 | 87 chamber, 48 enclosure | 58 chamber, 31 enclosure |
| Drying | 917 | 605 (the word "dry" in a test condition or a storage note counts here) | 276 | 224 |
| Nozzle | 336 | 218 | 52 (products with no profile only) | 17 |
| Bed | 430 | 255 | 25 (products with no profile only) | 15 |
| Hardened nozzle | 877 | 180 | not attempted | 0 |
| Annealing the part, as a treatment | none recorded | 143 mention annealing | 78 | 61 |

What the statements look like: Flashforge's recommended table prints "Ambient Temperature for Printing | Room
temperature~40℃" (29 products); Polymaker's older sheets "Environmental temperature | Room temperature - 45 (˚C)" in
the recommended table (their second such row, "90 °C" beside "Cooling fan", is how the test bars were printed, and is
left), and the newer ones "Closure chamber | Not needed" and "Drying temp. and time | 55°C/6H" in the right-hand
column the import did not read; Spectrum "Drying (if wet) | recommended***" with the schedule in the footnote ("at
least 6h at 75°C using a hot dry air oven"); eSUN "Drying Preparation | 50℃ >8H"; and prose: Nanovia's "Dehydrate
for 4h at 60°C prior to printing after prolonged exposure to humidity." (27), SIDDAMENT's "If damp, dry at 80°C for
2-4 hours." (21), Flashforge's "Using a hot dry air oven at 80℃ for at least 12 hours is recommended" (24),
Nobufil's "Pre-dry material for 3-6 hours at 60 - 70°C (max.)." (13). Annealing: Bambu Lab's "the suggested annealing
temperature of models printed with Bambu PA6-CF is 80 to 130 °C, and the time is 6 to 12 hours." (23), Polymaker's
"Annealing temp. and time 100 °C/16H" and "Annealing settings: 90˚C for 2h", Raise3D's "After the printing, it is
recommended to anneal the model in the oven at 80-100°C for 8-12 hours."

**What m136 wrote.** 254 cells on 208 existing profiles, and 102 on 61 new ones (a product with no profile gets one, citing
its own sheet, with every axis the sheet does not state left Not published); the Locator of an existing profile gains
the page and label of each statement. The raw column is the sheet's words, fullwidth punctuation written in ASCII;
the typed columns are the parser's reading, except 13 cells whose Parse review says why: two windows marked
"(Recommended)" after their numbers, eight Spectrum drying temperatures printed without a unit ("at 80 using a hot dry
air oven"), and three printed with a degree glyph the parser does not know ("50 - 60 ºC", "60 ∞C"). Annealing went to
`evidence.csv` as a Manufacturer statement under Post-processing, the maker's words in Finding and the schedule in
Exposure / conditions (Q00498 to Q00558), one per product, its own document first. No new check code, vocabulary
value or column.

| Products (of 1,098) with the axis stated | Before | After |
|---|---:|---:|
| A profile at all | 840 | 899 |
| Nozzle | 762 | 779 |
| Bed | 668 | 683 |
| Chamber state | 140 | 198 |
| Chamber decided (a chamber state, or "no enclosure needed") | 222 | 296 |
| Enclosure | 135 | 166 |
| Drying | 181 | 405 |
| Hardened nozzle | 221 | 221 |
| An annealing recipe for the part | 0 | 61 |

Each product's own print gate (`grades[].print`): chamber unknown 886 → 812 (59 within, 9 partial, 2 recommended above
65 °C, 4 exceeding: PolyMax PC-FR and PolyLite PC Transparent "Closure chamber Needed (70°C-100°C)", PolyMax PC-FR V5.1
"90-100 (˚C)", Ensinger's PEKK "120 - 160 °C"); nozzle unknown 336 → 319; bed unknown 430 → 415.

**The decision diff.** Of the six templates only "Warm environment" screens on the print gates (nozzle and chamber),
and only there did an answer move. Judged by products (`templates-products.csv`, Explore): PASS 28 → 31, UNKNOWN
62 → 61. Three materials' verdicts moved: ABS-ESD and PC-CF now pass through one product each (a Flashforge sheet's
40 °C and 60 °C ambient ceilings) and enter the candidate set the material-level gate had kept them from, and PBAT
goes UNKNOWN → PASS. PC FR goes from ALL to SOME: Polymaker's PolyMax PC-FR asks for 90-100 °C, beyond the H2C. Eight
passing materials gained passing products (ABS 1 → 3, ASA 1 → 3, PET-CF 1 → 3, ABS-GF, ASA-CF, PA6-CF, PA12-CF,
PET-GF one more each). Judged by headline (`templates.csv`), Warm environment PASS 23 → 26 (ABS-ESD, PC-CF, PBAT).

**Sample check.** 30 of the 417 statements drawn with a fixed seed (20260925; `mulberry32`, a shuffle of the 356
cells and 61 annealing rows) and each re-read against its page's text by the same agent: **30 agree**. Two needed a
second look because their number stands on more than one line of the page (FIBERON PA12 CF10's drying and PA6 GF25's
annealing), and both rows print exactly what was recorded.

**Left, and why** (counts are products):
- **Twins and reprints: 75.** The products the import recorded as another's twin (R053, 49) or reprint (R166 and its
  like, 26) hold no values of their own, and their sheets' printing tables were rejected with them. Under D83 they are
  unknown on every print gate. A ruling is needed: record the recipe per product, or let a product read its twin's.
- **Wordings the parser cannot read,** left rather than typed against it (each would be a PARSE-UNREAD warning):
  Polymaker's "Closure chamber Needed" / "No Needed" (7; the bracketed temperatures of "Needed (…)" were taken as the
  chamber), Eryone's "Sealed printing | Supports open/closed printing" (35 sheets), BASF's "Build Chamber Temperature
  -" (4), CreatBot's "OFF", Polymaker ABS Max's "65˚C+" (an at-least value the gate would read as met), the prose
  "printable on non-heated chamber FFF 3D printers" and "we highly recommend printing … within a closed chamber
  printer". eSUN's "Drying Recommendations | N/A" (27) states no drying, and is not one.
- **Not the product's recipe:** the conditions test bars were printed under (37 chamber, 6 nozzle, 6 bed readings,
  among them 3DXTECH's "Chamber Temp: 160°C"), drying the printed part to raise its strength (Flashforge's "After the
  printing process, it is recommended to dry the model in the oven at 80-100°C for 1-3 hours", 16 products: a
  treatment, not yet recorded), the test material's preparation (Bambu PLA Pure's "baked in a 50°C blast drying oven"),
  and a PolyTerra PLA+ sheet filed under PolyTerra PLA.
- **Numbers the parser would misread:** Ensinger's "160 - 230 °C" chamber (above its 200 °C window), text broken by
  the layout ("5 0-6 0°C"), unitless "50-150" (Anycubic).
- **Annealing, 4:** three Bambu sheets name another product in the sentence (ASA Aero's and ASA-CF's say "Bambu ASA",
  PLA Silk Dual Color's "Bambu PLA Silk"), and PETG-CF's "65 to 70 hours" reads as a misprint.
- **Not attempted:** the hardened-nozzle column (180 products' sheets mention it), and nozzle and bed for products that
  already had a profile. Both are next in this lane, as is a polymer-level printing guide where makers are silent.

Found and not fixed, now in [OPEN-PROBLEMS.md](../../OPEN-PROBLEMS.md) §12: 35 Polymaker profiles that are the "How to
make specimens" block recorded as guidance, 26 drying cells that hold a fragment rather than a schedule, and nine
grades whose product name is a sentence fragment ("and prevents nozzle jams.").

| | Result |
|---|---|
| `npm run data:check` / `data:lint` | 0 issues / 287 findings, all accepted, 0 new |
| `npm run build` | 0 errors, the same 5 warnings; no PARSE-UNREAD |
| `npm run build:diff` | 2,945 differences, all downstream of the profiles and the 61 evidence rows: `db.profiles` (61 new, 208 with a new Locator, their drying, chamber, enclosure and gates), `db.grades[].print` (53 products gain a recipe; chamber, drying, enclosure, nozzle and bed of the rest), `db.materials[].gates`, `.print`, `.profileIds` and two `.guidance.chamber` (the material-wide unions), `db.evidence` (61), 23 derived `db.coverage[].finding`, `db.meta.counts`, `db.meta.chamberEstimates` and two `db.materials[].print.chamberEstimate` (two research chamber bands superseded by a published window) and `db.meta.printEstimates` (one window, the fibre offset for bed) |
| Tests | 293 pass in `npm test`; one test re-targeted: "chamber windows recovered from the cited Bambu data sheets" now reads the Bambu product's own window (D83), since PC FR's material-wide union widened to 45-100 °C with Polymaker's product; it still checks the material's lower end and gate |
| `verify:fast` / `verify` | 47 s with the build cached / passing; three recorded views rewritten (`ui:check -- --write`): Warm environment, strict and with estimates, shows 26 PASS where it showed 23, and the three-way comparison shows ASA-EC's drying as published |

**Merged onto the re-centered page (2026-09-25).** Lane 2 was built on phase 2; on `v2` after phase 3 the snapshot and
the views are regenerated with the page judging by products. The one test the lane rewrote (PC FR's chamber window,
now the Bambu product's own) went in its own commit before the data, and holds on the data before and after it. Full
`verify` passes, the scale check included (60 s at twice the data, against its 150 s budget; it had failed in the
lanes only under a load average of 10 to 36).

## Phase 6, lane 3: makers' know-how (2026-09-25)

GOALS step 5 (drill down) and scorecard line C10 (makers' know-how, in the panel, gaps visible). Migration
`m140-makers-know-how` records what makers write about printing and using their products beyond the numbers, in their
own words, from the documents already cached; the build derives a know-how state for every product and material
(`build/src/know-how.js`); the Products tab shows both; `npm run audit:know-how` writes the maker-site search worklist
([KNOW-HOW-WORKLIST.md](KNOW-HOW-WORKLIST.md)). D85 gains its last part, the planned exception. Every reading and review
in this lane is an agent's (Claude Opus 5.5): no person has read the statements.

**How the statements were found.** Every cached document of every active product (1,249, the ones the tables link to a
product: its own source, a profile's, a measurement's, or Applicable grades) and 24 makers' product pages already
fetched as witnesses were taken apart page by page: the PDF text rebuilt in reading order from the hash-checked bytes
into sentences and bullets, and the cached lines as the page lays them out, for table rows ("Odor Odorless", "Surface
finish semi-matte"). That gave 158,589 units. A broad filter kept those that could be know-how (topic words, sentence
shape, English, no legal, contact, shop or safety-data-sheet boilerplate, no property or settings row), and they were
grouped by maker: 9,676 distinct candidates, each with how many of the maker's documents and materials print it. Fourteen
agents read them in 44 batches under one set of written rules, kept 3,633 and chose a topic for each: the text exactly
as the candidate holds it, or an exact part of it (a leading heading dropped). The rules left out table labels, lone
fragments, disclaimers, test notes, numbers the tables hold (property values, chemical-resistance rows, print settings,
drying and annealing schedules, water absorption), and a sentence a maker prints on the sheets of many different
materials, unless it is a short rating row, which is each product's own. Shrinkage figures are not held, and were kept.

The kept statements were then placed on every product and page that prints them (5,497), and a script dropped: a
statement another of the same product's statements holds whole (58), a shrinkage figure the product already has as a
Mould shrinkage measurement from that source (30), two template sentences with only the product's name changed printed
across most of a maker's range (30: Raise3D's "Abrasion of the brass nozzle happens frequently when printing …",
Nanovia's air-extraction sentence), two with words the extraction glued together, and three occurrences of Spectrum's
"Ruby or hardened nozzle recommended" on The Filament TPU sheets, where it is the row's label and the value beside it
is "No". The lane's agent added four Polymaker shrinkage figures the first batch had rejected before the shrinkage rule
was written. Full-width punctuation is written in ASCII (TEXT-FULLWIDTH), as m136 did; nothing else is changed.

**What m140 wrote.** Every statement is pinned in `scripts/migrate/m140-makers-know-how.csv` (product, source, page,
topic, words) and re-read on its cached, hash-checked page before anything is written: its characters, spaces aside,
stand in the page's text in reading order, or it stands in one line of the page as laid out. All 4,502 do.
- 4,502 rows in `evidence.csv` (Q00559 to Q05060): Domain "Makers' know-how", one of twelve topics, Evidence type
  Manufacturer statement, Locator `p. N`, on the exact product; none at material level.
- 13 makers' product pages registered as sources (`…-sources.csv`), Source class "Manufacturer product page or guide",
  so the panel labels their 65 statements (12 products) as the maker's marketing text: Fiberlogy (6), MatterHackers
  NylonG, BigRep PLX, colorFabb stoneFill and XT, Recreus Filaflex 95 Foamy, Polymaker's wiki for PolyCast and
  PolyDissolve S1, Fillamentum Nylon CF15. The other 11 witness pages gave nothing new or are retailers' or index pages.
- 1,262 rows in the new table `know_how_reads.csv` (Scope `document`, read on 2026-09-25, by the agent): which sources
  were read, the one fact about know-how the build cannot derive (`…-reads.csv`).
- Vocabulary: the non-filterable category `know-how`, twelve topics mapped to it, the evidence domain "Makers'
  know-how", and the scopes `document` and `maker site`. No new check code.

| Topic | Statements | Products | Makers |
|---|---:|---:|---:|
| Good for | 585 | 371 | 43 |
| Benefits | 1,325 | 641 | 48 |
| Pitfalls and limitations | 129 | 90 | 23 |
| Warping and shrinkage | 311 | 237 | 38 |
| Precision and tolerance | 45 | 45 | 19 |
| Surface finish | 385 | 285 | 35 |
| Adhesion between layers | 126 | 111 | 24 |
| Moisture sensitivity | 353 | 257 | 32 |
| Nozzle wear | 334 | 244 | 30 |
| Odour and emissions | 161 | 146 | 27 |
| Supports and removal | 327 | 217 | 22 |
| Printing advice | 421 | 215 | 33 |
| **All** | **4,502** | **888** | **52** |

**Gate: products with at least one statement, before and after.** The plan's 87 re-counts as 82: the active products
with an evidence record before lane 2 (chemical exposure 57, flammability 41, support and solubility 40,
post-processing 32; 86 if records since retired as duplicates are counted). At the start of this lane, after lane 2's
annealing statements, 108. After it, **888 of the 1,098 active products carry a know-how statement, and 902 carry a
statement of either kind.**

**Gate: every material carries a state.** Derived by the build from the statements and the reads (D74):

| | Collected | Sheet silent, site not yet searched | Searched, nothing published | No document read | All |
|---|---:|---:|---:|---:|---:|
| Procurement products | 887 | 198 | 0 | 6 | 1,091 |
| Materials | 128 | 20 | 0 | 5 | 153 |
| Print recipe, active products: chamber | 367 | 721 | 0 | 10 | 1,098 |
| … drying | 412 | 675 | 0 | 11 | 1,098 |
| … annealing | 85 | 1,001 | 0 | 12 | 1,098 |

The five materials with no document read are PLA Lite (its one product, eSUN PLA-Lite, has no cached text) and four
with no procurement product (PA66, PA66-CF, PA612, PA612-GF). "Searched, nothing published" exists and is empty: it is
what a `maker site` row makes of a silent product, dated (a test builds it). The worklist lists the 20 silent materials
and the silent products of every other, the six templates' Strict candidates first, with the sites the data holds for
each maker: 22 makers, 3DXTECH (68 products) and Fiberlogy (42) the most.

**Gate: the sample check.** 50 of the 4,502 statements drawn with a fixed seed (20260925; `mulberry32`, a shuffle of the
evidence rows in the know-how domain) and each read by the lane's agent against its page's text, around the statement:
**50 stand on the page their Locator names, in those words**, none on a different page only, all on the product's own
document. None has the wrong product or the wrong topic. Three are weaker than the rest: two are bullet lists or table
cells run together without their bullets (Prusa's ABS features, Ensinger's target industries), and one is a generic PLA
sentence Bambu prints on its PLA sheets ("PLA is the most common material in 3D printing as it's easy to print and
inexpensive."). Two products in the sample carry a grade name that is a sentence fragment ("colors.",
"betterperformance to your 3D printing projects."), already in OPEN-PROBLEMS §12.

**Never used for selection, confirmed by reading the engine.** `evaluateEnvironment` (`app/js/engine/constraints.js`)
answers only the category a constraint names; `validateScenario` drops a constraint whose category is not in
`meta.environmentCategories`, which `countUsableByCategory` fills with filterable categories only; the polymer-level
layer may use a filterable category only (D64), and its precedence reads `db.evidence`; coverage reads the environment
categories only. On top of that, the build moves the statements out of `db.evidence` altogether (`db.knowHow`), so the
drawer's Environment tab, the evidence counts and the engine's context are what they were. `test/know-how.test.js`
checks the category, the split, the states, the worklist, and runs the six templates in Strict and Explore with the
statements put back beside the evidence: every answer is unchanged.

**The panel.** In the Products tab, each product's "What the maker says" lists its statements by topic in the maker's
words with the source and page ("data sheet, p. 2", or "the maker's product page (marketing text), p. 1"), then one
sentence for what is missing: "Polymaker's data sheet says nothing about its benefits, pitfalls, warping, precision,
surface finish, layer adhesion, odour or printing advice; it gives no drying schedule; its website has not been searched
yet." A silent product has that sentence alone ("3DXTECH's data sheet says nothing about printing or using it beyond its
numbers; …"). The product's other evidence records are under "Its other published records". The profile notes the old
section quoted (for example "Detail / tolerance: No special concerns") stay in the Printing tab, where every profile's
notes are listed. Above the products, "What makers say" counts each topic ("Nozzle wear: 7 of 15 makers (8 products)"
for PA12-CF) and the recipe gaps. Two new CSS classes (`maker-quotes`, `maker-src`); a new view,
`15-drawer-pa12cf-maker-says`.

**Found, not changed** (now OPEN-PROBLEMS §13): eSUN prints on 52 cached documents (47 active products) that its
properties "are obtained based on the injection molding spline test", while their measurements are recorded as printed
or unstated specimens that decide (D84), a re-read for lane 4; a document covering two products speaks for the one the
tables link (three PA12 CF+ statements on Raise3D Industrial PA12 CF); some statements are bullets run together;
narrower templates were kept or dropped by each reader's judgement.

| | Result |
|---|---|
| `npm run data:check` / `data:lint` | 0 issues / 287 findings, all accepted, 0 new |
| `npm run build` | 0 errors, the same 5 warnings |
| `npm run build:diff` | 1,268 differences: `db.grades[].knowHow` (1,098), `db.materials[].knowHow` (153), `db.sources[]` (13 product pages), `db.meta.counts.sources`, `db.meta.counts.knowHow`, `db.meta.knowHow`, `db.knowHow`. `db.evidence` and everything that decides do not change |
| Decision diff | `npm run snapshot`: `templates.csv`, `screening.csv`, `products.csv` and every other CSV unchanged; only the views change |
| Tests | 309 pass in `npm test`, 6 of them new in `test/know-how.test.js` |
| `verify:fast` | 72 s on the first run after the data changed (the build cache cold for the new tables; load average 3.5 to 4.5, another session working), 36 s warm (load average 8) |
| `npm run verify` | Passes, in 6 min 52 s at a load average of 10 to 21 (another session working): `npm test` (309), `test:ingest` (164), the scale check within its budget, the audit, the snapshot current, the 66 views, the 300 fuzzed scenarios. `dist/db.json` 21.1 → 22.5 MB, the page 6.19 → 6.45 MB |
| Views | `ui:check -- --write`: two views change (PLA's and PA12-CF's Products tab) and one is new |

**Merged onto phase 4 (2026-09-25).** The three commits applied onto `v2` after phase 4 with one conflict (the status
line in `docs/GOALS.md`, both kept); m137 and m140 re-run as no-ops, and the snapshot, the worklist and the 66 views
came out unchanged. One correction on review: a recipe part was "sheet silent" whenever the product's print settings
lacked it, and the panel then said "it gives no drying schedule" beside the product's own "Dry PA12 CF at 80°C for 12
hours before printing" (Raise3D, whose two-product sheets lane 2 left to a ruling), and "no chamber or enclosure need"
beside Siraya Tech's "An enclosure is crucial for maintaining consistent printing temperatures". A drying schedule or a
chamber or enclosure need in the maker's own statements now counts as collected, as an annealing statement already did:
chamber 341 became 367, drying 405 became 412, and the table above is the corrected one. Those 33 products' settings
still lack what their words say, so their gates stay unknown; that is lane 2's to type (OPEN-PROBLEMS §12).

**Checked after the merge: the eSUN finding was already handled.** Lane 3 reported that 52 eSUN documents call their
values injection-moulded while the database records them as printed. The database does not: m128 typed the 202 bar
values from those 49 sources as moulded on 2026-09-21, and none of them is a product's value. What decides is the 39
densities m128 left "not explicitly established" by its own stated rule (density is not measured on the bar), 38 of
them products' densities. OPEN-PROBLEMS §13 now says that, instead of the lane's claim.

## Phase 6, lane 4 begins: the gaps that block an answer (2026-09-25)

*In plain words: before fetching or re-reading anything more, a report says which missing or uncertain values actually
stop the six templates from answering, so the next data work goes where it moves an answer.*

`npm run audit:gaps` writes [BLOCKING-GAPS.md](BLOCKING-GAPS.md), generated from the data and changing nothing. Judged
as the page judges (products, comparable values, Explore):

| Template | UNKNOWN | What leaves them unjudged |
|---|---:|---|
| Outdoor structural part | 39 | not published 51; published without direction or load 24 |
| Indoor prototype | 98 | no sampled price 98 |
| Lightweight structure | 33 | not published 25; without direction or load 19 |
| Warm environment | 62 | print setting not recorded 57; not published 27; without direction or load 2 |
| High-stiffness fixture | 50 | without direction or load 31; not published 19 |
| Flexible component | 47 | without direction or load 30; not published 17 |

- **The biggest single lever is XY stiffness.** 41 materials cannot be judged on it: 27 in all three templates that
  ask for it, 14 in two. For 24 of the 41 the products publish a modulus without saying the direction (PA12, PCL, COC,
  SAN, TPU-CF, the PLA and PETG graphene grades, PP); one reading of each sheet's test conditions settles up to three
  answers. For the other 17 no product publishes one.
- **114 answers change when values published without direction or load are admitted.** Those are the re-reads that
  settle the most, listed by template. The direction of the change is the D84 caution: PLA goes from FAIL to PASS in
  the outdoor template on values that read like moulded bars.
- **Warm environment waits on print settings**: 57 material × window pairs have no product with a recorded chamber or
  nozzle window, which is lane 2's next step.
- **Price holds up the Indoor prototype alone** (98 materials without a sampled price), which the plan leaves for a
  price refresh late in the funnel.
- **797 close calls**, products decided by 10 % or less on one value; the 80 closest are listed as the first values a
  person should check against the page.

Nothing was re-read in this step; it names the targets.

