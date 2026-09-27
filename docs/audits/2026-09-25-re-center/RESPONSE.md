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

## Phase 5, part 1: the owner's decisions, and one maker's product lines are products (2026-09-25)

*In plain words: the owner decided how products are grouped. Bambu's own product lines stop being materials and join
the material they are, and TPU is divided by hardness, because a flexible part is chosen by it.*

**The decisions** were asked with the facts and a recommendation each (`docs/GOALS.md`, "Decided on 2026-09-25, for
phase 5"): merge the product lines, and split TPU by hardness for every maker rather than keep one TPU; give each family
a "polymer not stated" home and import the 50 sheets waiting on it now; keep metal and ceramic sintering filaments out
of scope, with the other rulings on the proposed defaults; keep eSUN's densities.

**m141** (D86) moves 85 products with the 1,502 records filed under them:
- PLA gains Bambu's PLA Basic, Matte, Basic Gradient, Tough+ and Translucent and eSUN PLA-Lite; PLA Silk gains PLA
  Silk+ and Silk Dual Color; PETG gains PETG Basic, HF and Translucent. The eleven rows are aliases now.
- TPU's 74 products are read by the Shore hardness their makers rate them and filed in five classes: 87A or softer
  (16), 88 to 92A (12), 93 to 97A (25), harder than 95A (13) and not stated (8). The rating is the product's name, else
  its sheet's published hardness; RECIFLEX's "92-98 Shore A" counts at its middle. TPU is a family entry over the five,
  and Bambu's four TPU rows aliases of their class.
- A check caught four sheets filed under two classes. Two are one formulation under two names (colorFabb varioShore
  and varioShore Prosthetic, eSUN TPU 95A and TPU HS: R053 twins whose sheets print the same numbers), so the unrated
  one takes its twin's class. Two are sheets R053 recorded once for products the makers rate differently (Essentium's
  80A and 95A, FormFutura's rTPU 85A, 90A and 95A); those are not one formulation, and each now has its own key.
- A product moves by its MaterialID and keeps its ID (`moveGrade`, `scripts/data/records.mjs`): the old retire-and-copy
  would have duplicated all 1,502 records and broken every link to them. Coverage findings of the rows left without a
  product are superseded, never edited; four "Gap" findings the moved products fill (PLA's and PETG's price, PLA Silk's
  price and environment) are superseded by Resolved rows.

**The decision diff** (`build/snapshot/templates.csv`): PLA, PLA Silk and PETG now pass the Indoor prototype, since
their products carry the sampled Canadian prices that sat only on the product lines; PETG passes the Lightweight
structure on Bambu PETG Basic; TPU answers per class (in the Flexible component the 95A class passes on 7 of its 25
products, the 90A class on 4 of 12, the softer and harder classes on 1 of 16 and 3 of 13). The fifteen product-line rows
leave the results. The blocking-gaps report now counts 92 unknown in the Indoor prototype where it counted 98.

**Checks.** One check was loosened, in its own commit (`4a6200b`), with its reason: the dense-solve comparison's
variance tolerance, 1e-10 of the prior, which the larger hold-out of a PLA with 204 products exceeds by
floating-point arithmetic alone (a relative 1e-8). Eight tests that named the merged rows now name the product or the
class. The drawer's pointer guard counts the aliases' prose too: every pointer resolves, 50 as before.


## Phase 5, part 2: the held sheets get a home (2026-09-25)

*In plain words: seventy-four data sheets had been set aside because they did not say which polymer their product
is. The owner decided where such a product belongs: in its family's "polymer not stated" material, shown and judged
like any other and never estimated. Forty-four of them are in the database now, and each of the other thirty says why
it is not.*

Improves C2 (a home for everything) and C3 (the decision tier's evidence), steps 2 and 5.

**The homes** (m142, D87). One material per family entry and declared filler the sheets need, each in scope, labelled
in its name, Estimate identity Not applicable, a member of its family entry where one exists:

| Material | Family (entry) | Products |
|---|---|---:|
| M164 Nylon, polymer not stated | Nylon / Polyamide (PA) | 9 |
| M165 Nylon-CF, polymer not stated | Nylon / Polyamide (PA-CF) | 1 |
| M166 Nylon-GF, polymer not stated | Nylon / Polyamide (PA-GF) | 1 |
| M167 TPE, polymer not stated | Flexible Elastomers (TPE) | 12 |
| M168 PLA family, polymer not stated | PLA | 7 |
| M169 PLA family-CF, polymer not stated | PLA | 2 |
| M170 TPS | Flexible Elastomers (TPE) | 2 |
| M171 316L stainless steel sintering filament | Metal and Ceramic Sintering (new, Excluded) | 2 |
| M172 Silicon carbide sintering filament | Metal and Ceramic Sintering (Excluded) | 1 |
| M173 Alumina sintering filament | Metal and Ceramic Sintering (Excluded) | 1 |

- The nylon and TPE homes take the family's word as their base polymer (PA, TPE), so a word ruling files a family-only
  sheet by its declared filler. The PLA family's homes are for the undisclosed bio-copolymers the owner named; their
  family is PLA because two of Extrudr's own safety-sheet editions say "based on PLA, contains copolyester", every one
  of them prints at PLA's temperatures and is compared with PLA by its maker, and the reader already filed GreenTEC's
  word under PLA's family. Their base polymer is "Biopolymer (not stated)", which no identity reaches.
- purefil's GreenTEC Pro and Spectrum's GreenyHT, filed under PLA from their sheets' comparison with PLA, moved to the
  PLA family's home with their 30 records (moveGrade); their "undisclosed dense filler" had been measured against
  PLA's neat density, and with the polymer not stated it is not a reading, so their Variant is Not applicable.
- **TPS has no polymers.csv row**, as the owner's default said: the one styrenic resin reference recorded (Kraton
  G1650 M) is a single SEBS grade, and purefil's sheet does not say its block copolymer is SEBS. **Heat deflection,
  checked as asked: hdt045 applied to "Morphology: amorphous | semicrystalline | not modelled", and a material with no
  polymer row is "not modelled", so it applied to TPS and to the TPE home.** FiberFlex's 70 °C and purefil TPS 40D's
  110 °C would have decided heat requirements. hdt045 now names the rigid families as well (Applies to), which leaves
  out Flexible Elastomers and the sintering filaments; no material that existed before changed (build:diff 0 before the
  homes). The limit: a new rigid family must be added to that list (OPEN-PROBLEMS §14).
- **The homes are not estimated**, and the build required every in-scope headline to have a value or an estimate
  (HEADLINE-BLANK, an error). That check was wrong for a material the owner declared not estimated, and the homes could
  not be built without changing it, so it changed in its own commit (`4b1ba1e`, the one edit to build/src): it stays an
  error where a material names an Estimate identity, and a declared-not-estimated material lists its blanks under
  HEADLINE-UNESTIMATED, at info. On the data before the homes it moved nothing (PC-ASA publishes all five headlines).

**The rulings** (rulings.csv, R167 to R198; R056 marked superseded):

| Ruling | Kind | What it settles | By |
|---|---|---|---|
| R167 | identity-policy | A sheet that names only a family goes to the family's home; amends R077 | owner |
| R168 to R170 | identity | "nylon" and "pa" are PA, "tpe" is TPE: the words the homes stand for | agent |
| R171 | identity-policy | Elastomers named only by hardness and undisclosed bio-copolymers take their family's home | owner |
| R172 to R174 | material | FiberFlex 30D, FiberFlex 40D, MattFlex 40D: TPE home | owner |
| R175 to R178 | material | Nanovia Flex, Flex VX, ISTROFLEX, Flex B4C: TPE home (R171 applied) | agent |
| R179 to R182 | material | GreenTEC, GreenTEC Pro (PLA family home), GreenTEC Pro CF (with CF), niceBIO | owner |
| R183 to R186 | material | Greeny Pro, GreenyHT, BigRep PRO HT, BigRep HI-TEMP CF (R171 applied) | agent |
| R187 | scope | Metal and ceramic sintering filaments: recorded, Excluded, a material per metal or ceramic | owner |
| R188 to R191 | material | Ultrafuse 316L, Mt 316L, SiC, Kerfil alumina | owner |
| R192 | material | Antero 800NA is PEKK (M098) | owner |
| R193 | material | PI Z2 is TPI (M121), not a new PI: its sheet says "Thermoplastic Polyimide" | agent, deviating |
| R194 | source-record | Eastman's Amphora resin sheets are registered to the colorFabb product made of each | owner (AM3300), agent |
| R195 | identity | WearX is a PA6 | owner |
| R196 | new-material | TPS, its own material; supersedes R056 | owner |
| R197 | material | MD Flex, "a high quality TPU98A": TPU harder than 95A | agent |
| R198 | material | Onyx GF: Nylon-GF home (the reader missed its filler) | agent |

"agent" means claude-opus-5.5 under R089; each such row says so. The classifier learned the `material` kind, which
names a MaterialID (an identity ruling can only name a polymer with a row), and to file a TPU by its Shore rating from
its name or its sheet's hardness row: since m141 every new TPU had gone to the table's first class, 87A or softer
(`a40e8f6`; parity census unchanged).

**The import** (batch b34, m143). `--reopen-gap` put the 74 back under the hold they were deferred with; `--holds`;
`--propose --held ruling` read 105 held sheets, and the 31 outside the owner's exception were set aside and the 74
proposed by key. Review, `--split`, `ingest:apply --dry-run`, the migration, `--holds`, then `--settle` and `--defer`
for the 30 that did not enter (batches/b34/README.md, review.mjs, settle.mjs).

**Who reviewed: an agent.** Every row of the 74 was read and decided by claude-opus-5.5, named on each row as
"claude-opus-5.5 (agent reviewer)". The eight optically read sheets were read against their page images and signed
`--visual`. No person and no second reader has sampled the batch; R085's sample is still to draw.

| | Sheets |
|---|---:|
| applied, 38 products, 381 records (257 measurements, 37 profiles) | 44 |
| registered to a product already recorded | 6 |
| not a data sheet | 2 |
| deferred, the gap named | 22 |

Per sheet:

| Sheet (listed as) | Outcome |
|---|---|
| 3D4Makers PI Filament Z2 Zymergen 3D4Makers | deferred: a layout the reader does not pair |
| 3DJake niceBIO | applied: PLA family, polymer not stated (G168-02) |
| Extrudr greentec pro cf (3DJake's copy) | registered to G169-01 |
| Fiberlogy FIBERLOGY FIBERFLEX 30D (3DJake) | applied: TPE, polymer not stated (G167-03) |
| Fiberlogy FIBERLOGY FIBERFLEX 40D (3DJake) | applied: TPE, polymer not stated (G167-06) |
| Fiberlogy FIBERLOGY MATTFLEX 40D (3DJake, two copies) | applied: TPE, polymer not stated (G167-04), two sources |
| Fiberlogy FiberFlex 30D (3DJake, older layout) | applied: TPE, polymer not stated (G167-03) |
| colorFabb AmphoraAM3300 | registered to G092-01 |
| colorFabb AmphoraHT5300 | registered to G089-04 |
| colorFabb ColorFabb PA neat | applied: Nylon, polymer not stated (G164-06) |
| colorFabb carbon | deferred: identity: names neither polymer nor family |
| colorFabb colorFabb Woodfill Fine | deferred: identity: a resin maker's sheet naming no filament |
| colorFabb colorFabb XT Light Blue | registered to G089-03 |
| colorFabb colorFabbPABlueMetalDetectable | applied: Nylon, polymer not stated (G164-02) |
| 3DXTECH WearX Wear Resistant PA6 | applied: PA6 (G049-09) |
| BASF Forward AM ultrafuse 17 4 ph (a debinding guide for 316L) | not a data sheet |
| BASF Forward AM ultrafuse tps 90a | applied: TPS (G170-02) |
| BigRep hi temp | deferred: a text layer whose glyphs are mis-mapped |
| BigRep hi temp cf | applied: PLA family-CF, polymer not stated (G169-02) |
| BigRep pro ht | applied: PLA family, polymer not stated (G168-01) |
| Essentium / Nexa3D Essentium PA | deferred: a layout the reader does not pair |
| Essentium / Nexa3D Essentium PA CF | deferred: a layout the reader does not pair |
| Extrudr greentec | applied: PLA family, polymer not stated (G168-04) |
| Extrudr greentec pro | applied: PLA family, polymer not stated (G168-03) |
| Extrudr greentec pro cf | applied: PLA family-CF, polymer not stated (G169-01) |
| Fabru / purefil purefil TPS 40D Filament | applied: TPS (G170-01) |
| Fabru / purefil purefil TPS 40D Filament (the bytes are the TPV sheet) | deferred: identity: owner ruling pending |
| Fabru / purefil purefil kerfil alumina | applied: Alumina sintering filament (G173-01) |
| Fiberlogy FIBERLOGY FIBERFLEX30D | applied: TPE, polymer not stated (G167-03) |
| Fiberlogy FIBERLOGY FIBERFLEX40D | applied: TPE, polymer not stated (G167-06) |
| CreatBot CreatBot UltraPA | applied: Nylon, polymer not stated (G164-09) |
| Filament2Print Electrifi | deferred: identity: names neither polymer nor family |
| Filament2Print Flex 77A | deferred: a language the lexicon lacks |
| Filament2Print Iglidur | deferred: identity: names neither polymer nor family |
| Filament2Print Nuterials Jecto [EN] | deferred: identity: names neither polymer nor family |
| Filament2Print POP 4 (a 3D scanner brochure) | not a data sheet |
| Fillamentum Flexfill TPE 90A | applied: TPE, polymer not stated (G167-02) |
| Fillamentum Flexfill TPE 96A | applied: TPE, polymer not stated (G167-11) |
| Fillamentum Nylon FX256 | applied: Nylon, polymer not stated (G164-01) |
| Fillamentum Timberfill | deferred: identity: names neither polymer nor family |
| Flashforge TPE | deferred: a language the lexicon lacks |
| Copper3D MDflex | applied: TPU harder than 95A (G162-01) |
| FormFutura Crystal Flex | deferred: identity: owner ruling pending |
| FormFutura SKULPT | deferred: identity: names neither polymer nor family |
| Markforged Carbon Fiber (the Composites sheet) | deferred: several products in one table |
| Markforged Onyx GF | applied: Nylon-GF, polymer not stated (G166-01) |
| MatterHackers MatterHackers PRO Series Nylon | applied: Nylon, polymer not stated (G164-04) |
| Nanovia Flex | applied: TPE, polymer not stated (G167-09) |
| Nanovia Flex B4C | applied: TPE, polymer not stated (G167-07) |
| Nanovia Flex VX | applied: TPE, polymer not stated (G167-08) |
| Nanovia ISTROFLEX | applied: TPE, polymer not stated (G167-12) |
| Nanovia Mt 316L | applied: 316L stainless steel sintering filament (G171-01) |
| Nanovia PA Food Industry | applied: Nylon, polymer not stated (G164-07) |
| Nanovia SiC | applied: Silicon carbide sintering filament (G172-01) |
| Nanovia TPE 22D | applied: TPE, polymer not stated (G167-01) |
| Nanovia TPE 22D (French page) | registered to G167-01 |
| NinjaTek Chinchilla | applied: TPE, polymer not stated (G167-05) |
| NinjaTek NinjaFlex Edge (the Eel sheet) | deferred: identity: names neither polymer nor family |
| colorFabb PA CF Low Warp | applied: Nylon-CF, polymer not stated (G165-01) |
| QIDI S WHITE | deferred: identity: owner ruling pending |
| BASF Forward AM Ultrafuse Stainless Steel 316L | applied: 316L stainless steel sintering filament (G171-02) |
| Spectrum spectrum greeny pro | applied: PLA family, polymer not stated (G168-05) |
| Spectrum spectrum thermatech pa | applied: Nylon, polymer not stated (G164-03) |
| Stratasys Composite Molding Material (ST-130) | deferred: Stratasys condition tables |
| Stratasys antero 800na | deferred: Stratasys condition tables |
| Stratasys diran410mf07 | deferred: Stratasys condition tables |
| Stratasys nylon cf10 | deferred: Stratasys condition tables |
| UltiMaker MakerBot Specialty Nylon | applied: Nylon, polymer not stated (G164-05) |
| UltiMaker MakerBot Specialty Nylon (Method comparison page) | registered to G164-05 |
| Guangzhou Yousu 3D Technology Nylon | applied: Nylon, polymer not stated (G164-08) |
| colorFabb PA Blue Metal Detectable | applied: Nylon, polymer not stated (G164-02) |
| colorFabb colorFabb PA NEAT | applied: Nylon, polymer not stated (G164-06) |
| eSUN eSUN TPE 83A Filament | applied: TPE, polymer not stated (G167-10) |

Twenty-two are deferred: seven name neither a polymer nor a family, three wait on the owner with a recommendation each
(Crystal Flex's SBC: an SBC material under Styrenics; purefil's TPV: the TPE home; QIDI S-White: Support for ABS), and
twelve on a reader gap (OPEN-PROBLEMS §14). purefil's GreenTEC sheet, held before b34 and not among the 74, is answered
by R179 and waits for imports to resume.

**The decision diff** (`build/snapshot/templates.csv`, against `a7b9004`): 995 answers before, 1,055 after. 60 are new,
the new materials' own; none was lost.

| Change | Answers | Which |
|---|---:|---|
| New PASS | 12 | Lightweight structure: Nylon, polymer not stated, on CreatBot Ultra PA (1 of 9 products), in all three modes. Warm environment: PLA family, polymer not stated (3 of 7, typical GreenyHT) and PLA family-CF (1 of 2, GreenTEC Pro CF), all three modes. Flexible component: TPS on Ultrafuse TPS 90A (1 of 2), all three modes |
| New UNKNOWN | 46 | the homes where no product publishes the value asked, or publishes it without a direction |
| New screened (Explore with estimates) | 2 | TPE, polymer not stated, and TPS in the Warm environment: heat deflection does not apply to them, the way it does not to the TPU classes |
| Screen lifted (Explore with estimates) | 5 | PET in the Warm environment (hdt045 ≥ 80); PA66, PA612, PBT and PET-LW in the Flexible component (elongation ≥ 100). The screening ends are set by the back-test over every observation (D59), and the new ones moved them (screening.csv: the family bottom of elongation, the this-material top of heat deflection) |
| Same verdict, other pass or fail counts | 6 | PLA in the Lightweight structure and the Warm environment, all three modes: 204 → 202 products (GreenTEC Pro and GreenyHT moved); the Warm environment's passing products 5 → 4, GreenyHT being one |
| Same verdict and counts, one product more or fewer | 21 | PA6 (+WearX) and TPU harder than 95A (+MD Flex) in each template and mode where they appear, untested; PLA's other three rows |

No Strict or Explore verdict of a material that existed before changed; only its counts did.

**Checks.**

| Check | Result |
|---|---|
| `data:check` | 24 tables, 27,338 rows, 0 issues |
| `data:lint` | 0 new findings; 4 accepted with a per-record reason in the batch (two melt flows near 100 g/10 min printed with no condition, a 22 Shore D elastomer named for it, an unnotched Charpy of 218 kJ/m²) |
| `npm run build` | 0 errors; the same 4 warnings as before |
| Parity census | unchanged by the reader change (census/parity.csv identical) |
| Tests | `npm test` 307 pass; `test:ingest` 167 pass, 3 new (ingest-homes). Three tests the import had to update: the envelope test names the high-temperature family (the sintering filaments are excluded by scope, not by the envelope); the in-scope-headline test lets a material declared not estimated show a blank; the catalogued-codes test lists HEADLINE-UNESTIMATED |
| Views | `ui:check -- --write`: 34 of 66 views change (the new materials in the lists and counts), no layout failure |
| `audit:gaps`, `audit:know-how` | regenerated: in scope 128 → 135 materials, unknown answers 319 → 343 across the six templates (Explore), the homes' own; the know-how worklist gains the new products |
| `verify:fast` | 62 s on the first run after the data changed (load average 2.3 to 2.8), 27.5 s warm (load 2.1 to 3.5); budget 90 s |
| `npm run verify` | passes in 3 min 2 s (load average 3.1 at the start, 11.4 at the end with the headless browser): `npm test` 307, `test:ingest` 167, the scale check (65 s), the audit, the snapshot current, 66 views, 300 fuzzed scenarios |

**What is left, with a recommendation each** (OPEN-PROBLEMS §14): the three owner questions above; PI filed as TPI (R193),
which the owner may overrule; the four Stratasys sheets and the three layouts wait on reader rules the import plan
already names; a new rigid family must be added to hdt045's Applies to; a second reader should sample b34 (R085).

## Phase 5, part 3: fewer places for a number to go stale (2026-09-25)

*In plain words: the numbers the docs quoted are now counted by the build, the developer documents are one, the paused
import procedure has its own page, and tests that pinned one product's number became rules or were retired where the
snapshot already holds the number.*

- **Counts are generated.** `npm run snapshot` writes `build/snapshot/counts.md` (materials, products, measurements,
  product and material values, profiles, evidence, know-how statements, prices, sources), and `verify` fails when it
  is stale. The README links it; INTERFACE and PIPELINE no longer quote a denominator that moved (153 materials became
  142 in-scope rows with m141).
- **One developer document.** PIPELINE.md is now ARCHITECTURE.md's "The build, stage by stage", every section kept;
  PIPELINE.md stays as a pointer for older links. The plan also named HOW-IT-WORKS, but it is written for the engineer
  using the tool, not for one changing it, so it stays apart.
- **AGENTS.md** keeps the rules every change follows (3,835 words became 2,965); the import procedure moved, word for
  word, to `docs/IMPORTING.md`, since imports run only by the owner's exception.
- **Tests.** The PPA and PET-GF15 tests, which pinned the cases that found a rule, became the rule over every product:
  no product value is an annealed bar where the product publishes the property as printed, and an annealed value says
  so (`anneal`). The PETG-GF, ASA-GF and POM value pins and the CoPE test are retired: `build/snapshot/products.csv`
  holds those values and `verify` compares it on every change, and the one-home test covers CoPE. The HyperLite PP test
  keeps its physics and drops its PC-GF value pins. 307 tests became 304.
- **The material print windows** say what they are: "across its products", in the drawer and in the table's Printing
  view, where each product's own window is in its Products tab.

Still to do in phase 5, after the held sheets are merged: the two stored copies (Availability's retirement copy of
Status, H2C status's copy of Scope's exclusion), and moving the 75 MB of import proposals to `archive/`.

## Phase 5, part 2b: the owner's answers to what b34 left (2026-09-25)

*In plain words: three sheets from the held set waited on a question for the owner. The owner answered, and two of them
are in the database now; the third is settled but waits for the reader to learn its maker's layout.*

The owner's four answers are rulings signed "owner" (R199 to R202, and R193 amended with the confirmation). Batch b35
(m144, m145) built them through the pipeline, every row reviewed by claude-opus-5.5, named as an agent reviewer
(batches/b35/README.md):

- **FormFutura Crystal Flex entered** as the one product of a new in-scope material, **SBC** (M174, styrene-butadiene
  block copolymer, under Styrenics): its density, melt flow, moisture absorption, yield strength, elongation, flexural
  strength and modulus, hardness and nozzle window. SBC is not estimated until a resin reference gives it a
  polymers.csv row. Heat deflection applies to it: hdt045 already names Styrenics among the rigid families (D87), so
  nothing there changed.
- **purefil's TPV sheet entered** under TPE, polymer not stated (M167), as "Thermoplastic vulcanizate (TPV)", the product
  the sheet names, not the TPS 40D its listing said: its density and tensile modulus. The sheet is not a scan; its text
  layer draws the "ti" ligature as "+", which the review renamed.
- **QIDI S-White is settled as Support for ABS and did not enter.** QIDI's bilingual layout holds every QIDI sheet, and
  this one shows why: the reader read no printing profile, where a support's pairings (the seven QIDI materials the
  sheet lists) belong, and misread its water absorption. It is deferred with that gap and its pairings named.
- **3D4Makers PI Z2 stays TPI**, confirmed; it is still deferred for its layout.

**The decision diff** (`build/snapshot/templates.csv`, against `c21755a`): 1,055 answers became 1,067. The 12 new ones
are SBC's, UNKNOWN in all six templates in Explore and Explore with estimates: Crystal Flex publishes its strength and
elongation without a direction (D84), and nothing else a template asks. No existing answer changed its verdict, share or
pass and fail counts; TPE, polymer not stated has 13 products where it had 12, in its 8 rows.

**Checks.** `data:check` 0 issues, `data:lint` 0 new findings, the build 0 errors with its 4 warnings, 29 of the 66
views rewritten for the new counts and lists with no layout failure. The full `npm run verify` passes in 3 min 33 s
(load average 3.2 at the start, 10.6 at the end): `npm test` 304, `test:ingest` 167, the scale check, the audit, the
snapshot and counts current, 66 views, 300 fuzzed scenarios.

## Phase 5, part 5: stored copies, the reference layer, DECISIONS summaries (2026-09-25)

*In plain words: two facts that were written down twice are now written once, three misspelled reference names and a
dead number are gone, seventy source titles that were page furniture now say what the sheet prints, and every decision
opens with one line a newcomer can read. No answer the tool gives changed.*

Built by an agent (claude-opus-5.5), in four commits on its branch; every value was read from the tables' history or a
cached, hash-checked document.

- **Exclusion lives in Scope (m146).** H2C status "Excluded" was Scope again, kept in step by EXCLUSION, and it left
  the vocabulary. The three sintering filaments are Theoretical: Bambu does not list them, and their own sheets print
  at 170-250 °C on a 40-120 °C bed. The fourteen industrial high-temperature materials fit no existing value, because
  each asserts that the H2C can print the material and their profiles ask 340-480 °C nozzles, 120-180 °C beds and
  70-150 °C chambers; they take one new value, **Exceeds H2C limits**, which describes the printer, not the candidate
  set. The vocabulary's Meaning cells, empty until now, are written. EXCLUSION keeps only its gate check; the drawer no
  longer tells an excluded material it was "included on the strength of its processing requirements", and the scope
  gate's reason no longer calls a sintering filament outside the envelope. D87 is amended.
- **Retirement lives in Status (m147).** Availability's "Retired mapping; audit trail only" was Status again, kept in
  step by GRADE-RETIREMENT-HALF. Availability is what was recorded about buying the product, and retirement withdraws
  a grade record, not a product: all 21 retired grades are products that live on under another grade. Each gets back
  what was recorded before the phrase overwrote it (18 Not published, 3 "Current official product listing retrieved",
  as their active twins still read). GRADE-RETIREMENT-HALF is retired, `npm run data:retire` sets Status alone, and
  the Method rules, AGENTS.md's recipe, DATA-MODEL and ARCHITECTURE say so.
- **The reference layer (m148, PLAN-REMAINING §3.5).** "Standstone", "Slilicon" and the two "Polywood ... to board"
  rows are sandstone, silicon and plywood by their own envelopes; each is re-keyed in place, with its eight envelopes,
  through the removal ledger (36 rows, D72). `table-io` set now needs `{ migration }` to change a primary key and writes
  the ledger row. The dead `offset` left `dist/reference.json` and its contract. `scenario.plot.showReference` is still
  the only reader, and it reads nothing that moved. D67 is amended; OPEN-PROBLEMS §7 loses both entries.
- **Printed titles (m149).** Copper3D's MD Flex was titled "supported by", the corner credit whose sponsor is a logo.
  SOURCE-TITLE-NOT-TITLE is widened to that class, precisely (no false hit in 1,422 titles): a credit line ending
  "by", a lone mark or number, the "TECHNICAL" of a two-line heading, a "Page:" or "Version:" label. It found 70, all
  read from a sheet's first line by the importer; each now carries the heading its cached sheet prints, and one ELEGOO
  table that prints no title is Not published, which the column now accepts. A title that is only "Technical Data
  Sheet" (45) is left alone, because some sheets print exactly that. M173's "A alumina" is "An alumina"; M171 and M172
  were right. D63 is extended. Reading the heads found two identity defects, now OPEN-PROBLEMS §16: Anycubic's PLA+
  sheet sits on the Anycubic PLA product, and ELEGOO's PLA product is named "S.I.".
- **DECISIONS in plain words.** Every one of the 87 decisions opens with a line saying what it decides, and a status
  line where a later decision superseded, amended, narrowed or extended it. Eleven changes the index had missed are
  now stated: D2 (by D47), D39, D43 (by D48), D45, D47, D50, D53 and D56 (by D68), D55, D77 and D80; beside them are
  this part's own notes on D63, D67 and D87. `npm run docs:decisions` puts both lines in the index and names any entry
  without its plain-words line; the entries' text is otherwise unchanged.

**`npm run build:diff`** against 45443ef: 187 differences, every one a stored field: 70 source titles, 56 revisions and
12 publication dates the heads printed, 2 source notes, 21 grades' Availability, 17 materials' H2C status, 6 derived
coverage findings that quote the H2C status, 2 Method rules and 1 identity note. `dist/reference.json`: four names and
their ids, and no offset.

**The decision diff: none.** `build/snapshot/` is unchanged, `templates.csv` included: no answer, share or count moved
in any of the six templates, and the 66 interface views match without a rewrite.

**Checks.** m146 to m149 re-run as no-ops. `data:check` 0 issues, `data:lint` 0 new findings (291 accepted, none
stale), the removal ledger covers every re-keyed row. `verify:fast` 85 s after the change. The full `npm run verify`
passes in 4 min 58 s at a load average of 16.6 to 20.7 (three other agents building): `npm test` 305, `test:ingest`
167, the scale check (2x in 99 s), the audit, the snapshot current, 66 views, 300 fuzzed scenarios.

## Phase 6, lane 4: the values that decide, re-read (2026-09-25)

*In plain words: 124 answers turned on numbers published without saying how the test bar was made. Every sheet behind
them was re-read. Twenty-four sheets do say it, in a note or a footnote, and 18 answers are now settled; the other 175
name a standard and nothing else, so those answers wait for a document that says more. The 80 closest calls were
checked against their pages and all 80 numbers stand. The reader was an AI agent, not a person.*

Scorecard lines C3 (the decision tier, values with their conditions) and C4 (comparability); method step 2, screen.
Every page was read by an AI agent (Claude, lane 4), and every note it wrote says so. This is not the human spot-check
GOALS also asks for, which is still owed.

**Task A: the test conditions the sheets state (m155).** BLOCKING-GAPS listed 124 answers that change when values
published without their direction or load are admitted (D84). Behind them stand 251 product values on 199 sheets, all
cached: 242 without a direction (24 of them already recorded as printed) and 9 heat deflections without a load. Each
sheet's text was read in full, and where the document is a web page whose text extraction dropped a sentence, its
hash-checked bytes. Twenty-four sheets state a condition for 37 of the 251 values. m155 applies each statement to every
row it covers, 158 rows, and adds one:

| Sheet | What it states | Rows |
|---|---|---:|
| colorFabb: 31 sheets print it, 23 with rows to change, 10 behind an answer | p. 2, Notes: "The specimens have been printed in XY plane, ...", for the table headed "Mechanical Properties – 3D Printed" | 99 → XY |
| 3D-Fuel Workday ABS | "All properties, except melt flow rate are measured on injection molded specimens ..." | 8 → moulded |
| MakerBot / UltiMaker Tough | "All tests were performed ... with injection molded specimens from the same resin used to create MakerBot filaments." The rows had been recorded as printed. | 6 → moulded |
| eSUN TPE 83A | "... obtained based on the injection molding spline test.": m128's sentence, on a sheet that entered after it | 2 → moulded |
| Stratasys ABS-M30i | footnote 1 to Mechanical Properties: "Build orientation is on side long edge."; "Tested parts were built on Fortus 400mc" | 4 → printed, XZ |
| Filament2Print BioFil PCL | "Heat deflection temperature 57°C ISO 75 B": method B, 0.45 MPa (D65) | 1 → load |
| SIDDAMENT PA12-CF | p. 2 "Test Sample Printing Conditions"; p. 3 "Attachment: Test sample dimensions and printing direction", the bars drawn flat (read on the page image) | 6 → printed, 4 of them XY |
| Nanovia: 18 product pages, 8 behind an answer | each tensile tab's sentence: "at 0°, along with the tension stress", "successively at 45° and -45° per layer", "at 90°" | 28 → a raster, not a direction; 4 → 45/45; 1 added |

A statement covers the bars a test is made on (m128's scope), never density, melt flow or a DSC temperature. Nanovia's
rasters settle nothing, because a raster is not a build direction (DSM's "raster 0°-90°", m35; Essentium's 45/45, m33),
but "Unstated" had claimed the page says nothing. Two of its rows stood in the ±45° tab: PLA Flax's modulus (2.83 GPa;
its 0° row, spelled "Young modulus’s", was never transcribed and is added at 3.1 GPa) and PA Rail's second elongation.
ABS ESD prints no 0° tab, so its product has no stiffness or elongation value now.

**The decision diff** (`build/snapshot/templates.csv`, against `45443ef`): 40 answers moved across the three modes, 18
of them in Explore, the page's default. Every Explore one is an answer BLOCKING-GAPS listed, and each moved the way
admitting the value had predicted.

| Template | Explore | Strict | Explore with estimates |
|---|---|---|---|
| Outdoor structural part | PET, nGen FLEX, PCL: UNKNOWN → FAIL | — | the same 3; PA12 and COC now screened at 3 GPa, TPU-CF gains that screen |
| Lightweight structure | PLA-PHA UNKNOWN → PASS (colorFabb PLA/PHA 3.29 GPa, XY); nGen FLEX UNKNOWN → FAIL | PLA-PHA FAIL → PASS | the same 2; PCL screened at 2.5 GPa |
| Warm environment | PCL UNKNOWN → FAIL (57 °C at 0.45 MPa) | — | the same |
| High-stiffness fixture | CPE-CF UNKNOWN → PASS (colorFabb XT-CF20 5.15 GPa, XY); PET, CPE, nGen-CF, nGen FLEX, PLA-PHA UNKNOWN → FAIL | CPE-CF FAIL → PASS | the same 6; PETG-PTFE, PC-PTFE and PET-LW screened at 5 GPa |
| Flexible component | PET (colorFabb PET Flex Max, 418 %) and nGen FLEX (320 %) UNKNOWN → PASS; CPE, CPE-CF, nGen-CF, PLA-PHA UNKNOWN → FAIL | PET, nGen FLEX FAIL → PASS | the same 6; PA6, PBT and PET-LW screened at 100 % |
| Indoor prototype | — | — | — |

Counts changed inside three passing answers: TPU 85A class and softer (1 → 3 products pass), TPU 95A class (7 → 8),
and Nylon, polymer not stated in Lightweight structure (1 → 3). Product values fell from 3,452 to 3,439 (a moulded, XZ
or ±45° bar is no product value), material values from products rose from 444 to 463 and estimated ones fell from 182
to 163, and the estimate model recalibrated on the larger comparable set (`build/snapshot/grades.csv`). ASA-GF's
family-order finding no longer occurs, and its acceptance is removed. 19 of the 66 views changed, with no layout
failure.

**What the sheets could not settle.** 107 answers still change when as-published values are admitted (CPE's Flexible
answer is now FAIL, and admitting still makes it PASS). Behind them stand 217 values of 179 products on 180 sheets that
name a standard and say nothing about the bar. Some look like resin data without saying so (purefil's ISO 294-4 mould
shrinkage, Spectrum's "Linear mould shrinkage", Fiberlogy's "supplier test data", 3D-Fuel Pro PCTG's "injection molded
and 3D printed parts" without saying which); none is a statement about a row, so none was recorded. For the targeted
fetches (GOALS, phase 6 decision 4), maker by maker:

| Maker | Values | Products | Materials, and what they decide | Where its sheets are |
|---|---:|---:|---|---|
| Fiberlogy | 34 | 28 | PA12, PP, PETG-PTFE, PCTG-GF, PCTG-CF, PLA-CE, TPU-CF, CPE, CPE-LW, PVB, TPE (polymer not stated) and others: stiffness, elongation | fiberlogy.com/app/uploads/…_TDS.pdf |
| Spectrum | 31 | 26 | PA6 (and its HDT load), PA6-GS, PA6-CE, PC-PTFE, ABS-AF, PE, PC, PCTG-GF, PLA-CF (and its HDT load), PLA family | spectrumfilaments.com/wp-content/uploads/… |
| FormFutura | 25 | 22 | PA12 (STYX-12), PA6 (STYX PA6 and its HDT load), SBC (Crystal Flex), ASA-AF, PCTG, PCTG-CF, PLA Galaxy | formfutura.com, formfutura.sharepoint.com |
| purefil (Fabru) | 25 | 19 | COC, LCP, PBT, PE-GF, SAN, PP, PVC, PA12, PLA family (GreenTEC Pro), TPE (TPV) | cdn02.plentyone.com (purefil.de) |
| Extrudr | 17 | 14 | PC-PBT-CF, PLA family and family-CF (GreenTEC), TPU-CF, TPU harder than 95A, TPU-ESD, PLA-NF, PLA-CF (ASTM E2092 HDT, no load) | s3.extrudr.com/extrudr-media/datasheets/tds/ |
| Nanovia | 15 | 11 | PLA-NF, PC-PTFE, ABS-AF, ABS, PETG-CF, PC-ABS, PA6 (PA Rail), TPE: a raster is stated, not the build direction | nanovia.tech/en/mechanical-data-on-3d-printed-test-specimens-at-3-different-angles/ (linked from every page, not fetched) |
| Fillamentum | 14 | 11 | PA12-AF (AF80), PLA-PHB (NonOilen), PP, PC-ABS, CPE, PVC, PA6, TPE | fillamentum.com/wp-content/uploads/2020/10/… |
| 3DJake (PROGRAFEN) | 11 | 7 | PETG-GR and PLA-GR (all their products), PLA-CF, PCTG | 3d.nice-cdn.com/upload/file/EN_TDS_… |
| SIDDAMENT, iSANMATE, QIDI | 11 | 10 | heat deflection loads: PA6 and PLA-CF (SIDDAMENT), PP (iSANMATE), PETG-GF (QIDI); PC, PETG elongation | cdn.shopify.com, isanmate.com, drive.google.com |
| 3DXTECH | 4 | 2 | PA-ESD (3DXSTAT ESD PA12 lacks the "Printed Specimen Conditions" block its other sheets print) | cdn.shopify.com/…/3DXSTAT_ESD_PA12_TDS_v1.pdf |
| Twelve others (MatterHackers, Recreus, SUNLU, NinjaTek, BigRep, 3D-Fuel, 3D4Makers, Filament2Print, Yousu, Prusa, AzureFilm, colorFabb's PA-CF low warp) | 30 | 29 | TPU-EC, TPU-LW, PCL, Nylon-CF, and single products of PETG, ABS, PLA Silk and PLA Wood | as recorded in sources.csv |

A document settles a value when it says, for its test bars, the build orientation (or that they were moulded), or for
heat deflection the load or its method letter: a newer data sheet, the maker's test-method page, or the maker's
answer. Nanovia's article is the one fetch that may settle a whole maker.

**Task B: the 80 closest calls, re-read.** BLOCKING-GAPS's 80 closest products (decided by 0.8 % or less) were read
against their pages: the number, the unit, the property, the direction, the specimen and the moisture state. **All 80
numbers, units and properties stand, and so do their conditions: 0 of 80 wrong.** Most are a density printed as 1.25
g/cm³ against the 1,250 kg/m³ limit; 13 are the low end of a range the sheet prints (Flashforge's 1.25~1.26 g/cm³,
Nanovia's 80–90 °C), which the product value takes by rule. One raw cell was garbled and m156 corrects it: 3DXTECH
ECOMAX Tough PLA's heat deflection read "0.45 °C ISO 75", joining the load's number to the value's unit; the typed 0.45
MPa was right. The re-read for m155 found what the close calls did not: varioShore TPU 85A's "Stress @ 300%
elongation" line recorded as an elongation at break of 300 % (the sheet's is 585 %, V005953), quarantined in m156 as
m127 quarantined such numbers. Of the 251 values' recorded conditions, 3 were wrong (MakerBot Tough's specimen, PLA
Flax's tab, PCL's load letter) and 34 were recorded as unstated where the sheet states them; the 251 numbers were not
re-read one by one beyond the close calls and the sample below.

**Task C: SBC's polymer row, not written.** The reference cited for it, BASF's "Polystyrene and Styrolux"
(R-BASF-POLYSTYRENE-STYROLUX), is not in the cache on this machine: its bytes (SHA-256 0ae31d22…) are not under
`.cache/sources/by-sha`, and `documents_fts` holds no page of it. Nothing about S/B/S could be re-read, so nothing was
written (D35). A polymers.csv row needs the reference's own group and morphology for S/B/S (M174's note argues from
Crystal Flex's Shore D 63 and 1,795 MPa flexural modulus that it is a stiff styrenic, not an elastomer), melting point,
as-printed and water uptake Not applicable as for the other styrenics if the reference agrees, and the neat density
range it prints. Re-fetching it from its recorded URL, hash-checked, is the first step; OPEN-PROBLEMS §14 says so.

**Sample check of this lane's own edits** (an agent's, seed 20260925: 30 of the 161 rows m155 and m156 wrote, each
shown beside its page line and its statement): 30 of 30 stand. They are 17 colorFabb rows, each in its sheet's
3D-printed table with the XY note on p. 2; 3 MakerBot Tough, 1 Workday ABS and 2 eSUN TPE 83A rows with their moulding
sentences; 5 Nanovia rows in the tab their note names; 1 Stratasys flexural strength with its footnote; and SIDDAMENT
PA12-CF's elongation, printed and flat.

**Left, with a recommendation** (OPEN-PROBLEMS §15):
- Nanovia's "Elongation ultimate strength" is filed as Elongation at break on 14 rows of 13 products; it reads as the
  strain at maximum stress (Tensile strain at strength). Recommend a property ruling before a later change moves it.
- A raster-only label (±45°) is no product value (m33), and many makers' XY bars are printed at ±45°. Whether a
  raster-only label should count as XY is the owner's question; recommend keeping m33 until a sheet that states both
  shows the two agree.
- Fetch Nanovia's article first, then Fiberlogy's, Spectrum's and purefil's test-method statements: with Nanovia they
  hold 105 of the 217 values.
- The human spot-check of 30 to 50 decision values against their sheets is still owed (REPORT, phase 6).

**Checks.** `data:check` 0 issues, `data:lint` 0 new findings (291 accepted), the build 0 errors with its 4 warnings,
`audit:data` 0 errors, the snapshot current, 66 views matching with no layout failure, 300 fuzzed scenarios in
agreement. `verify:fast` passes in 31.5 s with the build cache (load average 12.7); its first run after the change,
with an empty cache, took 118 s at load 17. The full `npm run verify` passed `verify:fast` (`npm test` 305) and
`test:ingest` (167) and stopped at the scale check, run while three other lanes built in parallel (load 23.7 at its
start, 24.0 at its end; compile and validate 188 s against a 150 s budget). The steps after it were run one by one and
pass. The scale check alone failed once more at load 21 (194 s) and passed the next time (150 s for the whole check,
load 16.6 falling to 7.9). The unchanged tree at `45443ef`, timed the same way straight after, failed it at 151 s
(load 7.3 rising to 17.5): the budget sits at its edge on this machine under this load whatever the data, and this
change does not move it past.

## Phase 5, part 4: tests and acceptances as rules (2026-09-26)

*In plain words: the tests that checked one named product's number now check a rule over every product, or were
dropped where a committed snapshot already holds the number. The acceptances that repeated one reason dozens of times
became that reason, written once as a rule or a window. Nothing a template answers moved.*

Step and scorecard line: C15, engineering hygiene (checks guard decisions), and C13, data operations (working rules 2
and 5). Made by claude-opus-5.5, an agent.

**Tests.** `npm test` ran 305 tests and now runs 294. In `database.test.js` twenty tests that named records became
eleven. Headlines, products and templates lost one each, merged into a rule or retired to a snapshot, and lint gained
one. The tests that edit a
copy of the tables to prove a check fires keep a real record as the fixture, now chosen by what it must be (a product
with two comparable moduli, a profile with a parsed window, a grade that measurements, a profile and a source all stand
on), so a batch that moves one record cannot break the proof. The polymer-environment fixtures build the core alone,
where the layer is attached and validated, instead of running the estimate stage twice.

Time. Run back to back with the build cache off, the eleven changed files take the same wall time as before (43.9 s,
set by their slowest file), with 25 % less CPU: 237 s became 178 s (load 2 to 7). `verify:fast` passes, but its wall
time could not be compared fairly, because three other agents ran their own checks throughout. At the baseline it was
26.5 s with a warm cache (load 1.5 to 3.4) and 78 s with an empty one (load 8). Afterwards it was 68 s warm at load 17,
and 99 s at load 6 rising to 19. In that last run the reproducibility test, a cache-off rebuild this change does not
touch, took 88 s of the 99.

**Acceptances.** 299 became 228 (lint 291 became 219; build review 8 became 9).

| Code | Before | After | What changed |
|---|---:|---:|---|
| `MEAS-PHYSICS-WINDOW` | 186 | 148 | 31 hardness rows and 6 metal-filled densities: rules below. One duplicate row removed. |
| `MEAS-PHYSICS-ORDER` | 47 | 22 | 25 glass transitions above a heavy-load Vicat: rule below |
| `MEAS-PHYSICS-STRAIN` | 31 | 31 | per record (below) |
| `COVERAGE-SUPERSEDED` | 8 | 1 | 7 logs of Resolved rows: rule below |
| `MEAS-PHYSICS-Z-ABOVE-XY` | 7 | 7 | per record |
| `MEAS-CROSS-SOURCE-TWIN` | 5 | 5 | per record; a finding (below) |
| `SOURCE-LOCAL-PATH` | 4 | 4 | per record; two reasons corrected (below) |
| `MEAS-LOCATOR-DIRECTION` | 2 | 0 | rule below |
| `EST-FAMILY-ORDER` | 4 | 4 | |
| `EST-OUTLIER` | 2 | 3 | PLA Metal's gone (m161), PA6-CE's and PA6-GS's reviewed (below) |
| `NO-MEASUREMENTS` | 2 | 2 | |
| `HEADLINE-FAMILY-UNLISTED` | 1 | 1 | |

What became a rule, each with the reason the acceptances gave:

- **A hardness whose scale the sheet does not publish** (31: SUNLU's "HA/HD" column, and one sheet printing no scale
  at all). The unit "Shore (scale not specified by source)" is the state that says so. The reader writes it
  (`propose.mjs`), and nothing that decides reads it (the estimate model takes Shore A and D only). The window W0079
  flagged every such value whatever its number. m160 makes it the union of the Shore A and Shore D windows it could
  belong to. A number is impossible only where it is impossible on both scales, and surprising only where it would
  surprise on both. It is no wider than those two windows, and a lint test holds it to them.
- **A Vicat taken under the heavy load** (25: SUNLU's "5kg ISO 306" and "5kg ASTM D1525", and like sheets). A needle
  pressed at 50 N sinks into a glassy bar once it yields, below the glass transition. So `MEAS-PHYSICS-ORDER` no longer
  orders a glass transition against a Vicat whose own words name the heavy load ("5 kg", "50 N", ISO 306's B50 or
  B120). The Vicat is still ordered against the melting point. Four kinds of pair still fire, and their acceptances
  stand: a load the row does not state (Eryone), the light load (Anycubic's "VST 10N"), ASTM's "Rate B" (a heating
  rate, not a load), and Bambu's PC at 145 against 119 °C.
- **A log of Resolved coverage rows** (7). A Resolved row is closed, so several in one domain are separate events and
  not one finding overtaking another. `COVERAGE-SUPERSEDED` now looks at open statuses only. The one acceptance left
  is two "Evidence recorded" rows.
- **An HDT's locator naming the print orientation** (2). A thermal or physical row whose Direction is Not applicable
  carries no build direction by convention, so its locator's "XY" is how the bar was printed. A mechanical row is
  still held to its locator.
- **Spectrum's metal-filled PLAs** (6, and PLA Metal's `EST-OUTLIER`). The rule already existed: D80's dense fill
  class and R095's Variant "declared dense filler". R095 said on 2026-09-21 that these three grades "take the Variant
  in the sweep", and they never did. m161 applies it. Each sheet was re-read from the SHA-keyed text cache, and each
  says on page 1 "enriched with copper [brass, bronze] powder", "High … powder content" and "Approximately two to
  three times heavier than" standard PLA.

Left per record, because the reason is a judgement about one sheet or needs a basis nobody has recorded:

- `MEAS-PHYSICS-STRAIN`, 10 × "brittle printed bars", eight of them Z. The reason is a modulus basis (chord,
  crosshead) that the sheets do not state, so no column carries it. Loosening the ratio would need a sourced bound on
  how far two bases differ, and switching the check off for Bambu Lab or IPCON is not allowed.
- The elastomer groups: 3DXSTAT ESD-TPC 6, S-Flex Carbon 5 and FiberFlex CF 2. A fibre-filled elastomer window would
  need a reference for what fibre does to a TPU, and none is recorded.
- `MEAS-CROSS-SOURCE-TWIN` and the notched Izod group.

**The disposition of every test touched** (a: a rule over all records; b: retired, with its guard; c: a fixture kept,
now chosen by shape):

| File: test (before) | Pinned | Now |
|---|---|---|
| database: a material with one fitting grade is printable… | PPS-GF's nozzle gate | a: every material's three gates are the best of its active profiles', and its windows span theirs |
| database: likely and plausible ranges hold… | PA12-CF's strength spread | b: `summaries.csv`; the calibration half stays |
| database: every commercial product has exactly one home | CoPE `sharedWith` | b: `FORMULATION-KEY-SPANS-MATERIALS`; the one-home rule stays |
| database: PA, PA-CF, PA-GF, TPE and CoPA are family entries | five names | a: every row of `family_entries.csv`, with its members from `family_members.csv` |
| database: mis-filed products moved… | nine grades, PA6-GF's price, PA-ESD's window | a: every measurement sits under its grade's material, and no retired grade keeps one; evidence duplicates counted from the table. b: the price is in `headlines.csv`, the window is profiles.csv's and the new gate rule |
| database: a heat deflection whose load is unstated… | eSUN PLA-Lite | a: products: every material's as-published and variant spans, checked exactly |
| database: the validator rejects a family entry… | PA-CF | c |
| database: estimates follow the physics of printing… and polyamide estimates… (two tests) | PET, BVOH, PA12, PA66, PA66-CF, PA612, PA612-GF | a, one test: every heat deflection estimate is under its polymer's melting point, and an unfilled one under its own highest Vicat; a fibre-filled estimate is no lighter and is stiffer and stretches less than the unfilled same polymer's. b: PA12's density is in `headlines.csv` |
| database: an elastomer's heat deflection… | eleven names | a: every material whose polymer is an elastomer |
| database: estimated nozzle and bed windows… | PA66, PA612-GF | a: every estimated nozzle window starts above its polymer's melting point |
| database: values the registered sources publish… | V000605, V000039, V000507, V000008, five typical HDTs | b: the window check, the products rule, the Data status set by migration, `headlines.csv`, and the HDT load rule. The rule half stays, renamed |
| database: resin references are study grades… | three -R1 grades | a: every -R# grade is no product and backs none of its material's values |
| database: the four audited grades… are compiled | four grades, four profiles, 92 IDs | b: the tables hold them; nothing is deleted without a ledger row (pre-commit, D72); the record-moves rule |
| database: a quarantined price observation… | CA0069, ABS 25.99 | a: every quarantined price, and every cited listing is its own material's. b: ABS's price is in `headlines.csv` |
| database: a qualitative result is evidence… | V001899 | a: every qualitative measurement |
| database: the corrected Bambu notch records… | V000342, V000343, V000717 | b: impact backs no headline or estimate (record tier); `data:diff` shows any edit |
| database: an over-temperature audited profile…, and a chamber window the H2C only partly reaches… (two tests) | P0160, PPA-CF, ABS-CF | a, one test: every profile's gate on every axis is its own window against the H2C, and a partial one says how much |
| database: chamber windows recovered from the Bambu sheets… | five grades, three materials | b: profiles.csv; products: a product's window is its own profile's; `gates.csv` |
| database: a "-" in a data sheet is no setpoint | TPC / TPEE | a: every no-setpoint profile |
| database: an annealed value is not averaged… | four IDs | the rule over every conflict stays; the IDs go |
| database: a physically implausible value is kept… | TPU for AMS | b: `headlines.csv`; the rule stays |
| database: HyperLite PP is its own material… | PP, PP Lightweight, G082-01 | b: `summaries.csv`, `headlines.csv`; the record-moves rule |
| database: no product value is an annealed bar… | G069-01 at 103 | b: `products.csv`; the rule stays |
| database: raw-material supplier values never become a product's value | G092-01 | b: products: "no product value is a Z, moulded, film, filament, conditioned or implausible value" |
| database: a flexural modulus never fills the stiffness headline | eSUN PLA-Lite | a: every product value is a property its headline takes, and every flexural-only product has no stiffness |
| database: an estimated chamber band never sits beside… | PPA's band | b: chamber_bands.csv, `gates.csv`; the rule stays |
| database: five validator tests (another product's value; the wrong material; a missing GradeID; guidance; environment and coverage) | G068-02, G025-02, G036-01, CoPE, PC FR, Q00290, C00435, C00428 | c; the environment test adds a rule over every material's environmental records |
| database: recovered Bambu chemical records keep each sheet's verdict | four findings | b: the new `build/snapshot/environment.csv`, every verdict an environment requirement screens on, 711 rows |
| database: corrected source endpoints…, and retired CoPE identity… (two tests) | V000894, V000920, V001349, V000419; G091-01, P0115 | a: a strain at another endpoint is never an elongation at break (fixture by shape), no retired duplicate reaches the database, and no material lists a retired grade or profile. b: V001349 is m14's |
| database: raw values reconcile, a unit is its meaning, a headline cannot borrow, the validator rejects a blank headline | V000539, G002-01, PA66 | c |
| database: a declared grade variant explains its own offset | G049-01 | c, now asserting the fixture still declares its filler; one of its four whole builds was the build every test reads, and is reused |
| products: a declared variant stays out of its material's range | PLA | a: merged into the summary rule, which now checks the median exactly |
| headlines: a material's headline is the median… | PETG, PA66 | a: the products summary rule; PA66's "Not published" is in `headlines.csv` |
| headlines: three pin tests | G020-02, V000398, V003638, V000384, V000001, V001933 | c |
| grades: four tests | M031, G020-01, G020-03, M020 | c; a study grade is never listed, over every -R# |
| typed-values: three tests | P0003 | c |
| data-check: four tests | C00002's line, V000384's value, G020-01, G020-03 | c; the others, which inject a defect into V000384, P0001 or Q00001, keep them, since IDs are never reused |
| drawer: three tests | Q00282–Q00285, PVA and BVOH, PLA | c, and b for PVA and BVOH (materials.csv prose; every pointer resolves) |
| templates: the indoor prototype includes ordinary PLA | PLA | b: `templates.csv` |
| contract: a renamed field is reported | PLA | c |

**What the rules found on today's data.** These are not written as tests because they do not hold today:

- Nineteen unfilled products publish a density outside their polymer's neat range and declare no Variant.
  Examples: Polymaker PolyLite ABS 1,120 against 1,000 to 1,110; Spectrum PET-G MATT and eSUN PETG-Matte 1,350
  against 1,220 to 1,300; SUNLU PVA 1,010 against 1,180 to 1,340; Polymaker PolyDissolve S1 1,370; Recreus RECIFLEX
  1,000. R078 declares a Variant where a density is beyond the neat polymer. Each needs its sheet re-read, and some
  of the neat ranges are narrow, so nothing was changed.
- Two heat deflection estimates reach above their polymer's melting point at an upper end, though their centres are
  below it: PCL (likely to 62.2 °C, plausible to 66.5, melting 60) and PA612-GF (plausible to 220, melting 218). Only
  the centre is asserted.
- A study grade carries product values: G052-R1 (Stratasys, PA12) has a density and a heat deflection of its own. It
  is in no material's list and backs none of PA12's values, so nothing reads them. Whether a study grade should have
  them at all is open.
- Two fibre-filled materials publish a median density below their unfilled polymer's: PPS-CF 1,290 against PPS 1,305,
  and CPE-CF 1,220 against CPE 1,250, each a median of two to five sheets. The estimates keep the order.
- Three `MEAS-CROSS-SOURCE-TWIN` pairs, accepted as "two revisions of one product's sheet", are cited by two grades:
  PolyLite PETG, PolySonic PLA, and Polymaker ABS beside PolyLite ABS. If the reason is right, each is one product
  counted twice in its material's spread. `GRADE-PRODUCT-DUPLICATE` misses them because the names differ by the maker's
  prefix or a revision suffix. Merging them moves medians and needs the owner's word that they are one product.
- An acceptance was written twice for V005862, and the second copy quoted the wrong value (150 MPa for a row that
  prints 130). One row with the right number stays. `data:lint` now fails on a repeated acceptance, which it never
  read.
- Two `SOURCE-LOCAL-PATH` reasons said "kept as provenance" of LOCAL-CREEP and LOCAL-FATIGUE, which are cited. The
  reasons now say so.

**The decision diff** (`build/snapshot/templates.csv`, against `45443ef`): none. All 1,067 answers are unchanged.

m160 moves nothing in the build: the windows feed the lint and the reader only. m161 moves what it should. PLA
Metal's density becomes the median of its three plain products, 1,225 kg/m³ (1,200 to 1,250). It was 1,765 over six;
the metal grades are now counted apart as six variants from 2,280 to 3,500. The estimate model refits without the
metal densities pulling the PLA family. `npm run build:diff` counts 3,968 paths, nearly all grade estimate ranges
moving in the third significant figure. The warnings trade PLA Metal's `EST-OUTLIER` for PA6-CE's and PA6-GS's. Both
were re-read from their sheets (1.49 g/cm³ with ceramic fillers and a flame retardant; 1.01 g/cm³ filled with hollow
glass spheres) and accepted with that reason: the model has no covariate for either filler. Nine interface views change
in the numbers they show, and none in a verdict.

## Phase 6, lane 2 (the owner's decisions): the print guide and twins (2026-09-25)

*In plain words: a product whose own sheet says nothing about how to print it now reads the sheet it shares with a
sibling, and after that Bambu Lab's filament guide for its type, and every answer read that way says where it came
from. More products can be judged; one more material passes the warm-environment screen; nothing that was decided
changed.*

GOALS step 2 (screen, printability) and step 5 (drill down), scorecard lines C9 and C8. The owner's decisions 1 and 2
for phase 6 (docs/GOALS.md), entered as D88 and D89 in DECISIONS. Three commits: the snapshot gains `print.csv` (every
product's print gates and where each part came from) and a From/Twins column, moving nothing (`build:diff` 0
differences); then D89; then D88 with migration m150. The reviewer of every reading and mapping here is an agent,
claude-opus-5.5 (agent reviewer); no person has reviewed them.

**Twins (D89).** A twin is derived, not stored: another active product of the same material under the same Shared
formulation key, the products whose sheets print one table recorded once (R053). Where a product has no value of its own
for a headline it reads its twin's own value, and where its own profiles say nothing on a part of its recipe, its twin's
own; never a price, never what the twin itself read, and a key never spans two materials, so a reprint of another
material's table (R166) reads nothing. Each carries `from` and the label "same sheet as <maker product>", shown in the
drawer's product values and print card, the engine's reasons, the products export (Values read from, Recipe read from),
the chart's product points and the spread's popover. 46 of the 47 twins read 160 values (Prusament PETG Recycled's
sibling publishes only a hardness), and 42 read part of a recipe. **The spread counts each twin** as the product it is,
because its own sheet prints those values: PLA Silk's tensile strength is the median of 17 products where it was 10, four
of them SUNLU's Silk PLA+ colour packs, and it moved from 47.4 to 50 MPa. Fifty material headlines changed their count
and 23 their median; `spread.twins` and the popover say how many values are a twin's. A twin reading a declared
variant's sheet is set apart with it (SUNLU High Speed Matte PLA prints PLA Lite's dense-filler table), and where a twin
ties its sibling the typical product is the sibling, so the estimate model's calibration still hides the formulation it
names. 119 estimate ranges moved with the medians; no screen moved.

**The guide (D88).** Bambu Lab's Filament Guide is registered twice: R-BAMBU-GUIDE-202609 (the current revision) and
B-GUIDE (January 2025). **Both were re-fetched on 2026-09-25 from their recorded URLs, and each matched its recorded
SHA-256** (`048fb9a6…dc41` and `ea799364…b858`); no new revision was registered. The ingest fetcher works from the
import ledger, where neither is listed, so they were fetched directly and cached by SourceID and digest. The guide is one
page, a column per Bambu filament type. It states a nozzle temperature, a bed temperature per plate, whether to print
with an enclosure, the nozzle sizes and materials, drying and annealing; it states no chamber temperature.

- `print_guide.csv` holds the current revision's fifteen types in a print profile's columns, the guide's words and the
  profile parsers' reading of them; `print_guide_materials.csv` maps each to the one material it is, with a reason naming
  the neighbours it is not (PC to PC, never PC FR, PC-CF or a PC blend; PETG HF to PETG, since Bambu's PETG HF is a
  product of PETG; TPU 95A HF to the 95A class). m150 finds every cell on the hash-checked page by its column heading
  and row label (`scripts/lib/comparison-table.mjs`); the current revision draws the enclosure answer as a green tick or
  a red cross, which m150 reads by fill colour and checks against the January 2025 revision's words (Required for each
  tick, Optional for each cross, all fifteen agreeing). The parsers learnt two wordings: a lone mark as an enclosure
  answer, and the guide's nozzle column.
- Where a product's own profiles, and then its twin's, say nothing on a part of its print gate, it reads its material's
  guide row, labelled "per Bambu Lab's Filament Guide for PC, not this maker's sheet" (for Bambu's own products, "not this
  product's data sheet") in the gate's reason, the print card and the export; the Printing tab shows the row itself. What
  the product's own sheet says always wins, even words the parser cannot read.
- It cannot decide the chamber for the nine types it asks an enclosure for: no temperature is given, and an enclosure is
  not proof that 65 °C is enough. Drying is recorded and fills nothing.

**Products that gained a decided gate, by origin** (1,131 products; "decided" is a verdict other than unknown):

| Part | Before | Own sheet | Twin (D89) | Guide (D88) | Still unknown |
|---|---:|---:|---:|---:|---:|
| Nozzle | 811 | 811 | +34 | +126 | 160 |
| Bed | 706 | 706 | +36 | +175 | 214 |
| Chamber | 298 | 298 | +15 | +244 (all "within", from an enclosure the guide says is not needed) | 574 |
| Enclosure stated | 171 | 171 | +17 | +446 | 497 |
| Hardened nozzle stated | 224 | 224 | +12 | +417 | 478 |
| Drying | 410 | 410 | +19 | none, by rule | 702 |

**The decision diff.** Across the six templates, twins moved no material's answer; the guide moved one. Judged by
product in Explore over all 136 in-scope materials:

| Warm environment | Base (`45443ef`) | After twins | After the guide |
|---|---:|---:|---:|
| Materials PASS / FAIL / UNKNOWN | 33 / 37 / 66 | 33 / 37 / 66 | 34 / 36 / 66 |
| Products PASS / FAIL / UNKNOWN | 58 / 232 / 790 | 59 / 242 / 779 | 64 / 242 / 774 |
| Products unresolved on the chamber gate | 817 | 804 | 560 |
| Products unresolved on the nozzle gate | 310 | 277 | 151 |

In `templates.csv`, twins changed 33 rows (the product counts of PLA, PETG, ABS, PA6-GF, PPA-CF, PPS-CF and TPU,
hardness not stated) and the guide 6: PLA-CF enters Warm environment as PASS (3DXTECH CarbonX CF-PLA, heat deflection
91 °C, its sheet silent on the chamber, which the guide clears), and PLA passes on 8 products where it passed on 4
(3DXTECH ECOMAX Tough PLA, purefil PLA+, colorFabb PLA-HP, 3DXTECH SimuBone). Passing products in the other templates
rose with the twins only (Strict: Outdoor 36 to 38, Lightweight 57 to 59, High-stiffness 28 to 30, Flexible 29 to 30).
**Why the 66 UNKNOWNs stay:** each is held by a heat deflection no product publishes comparably, or by a chamber
nobody states. 24 of them have a product that meets everything but the chamber; for PC (11 products) and PPA-CF (6)
that product's only word on the chamber is the guide's tick. A question for the owner, with a recommendation: count
Bambu's own "print with an enclosure" as within the H2C's chamber for the types its guide names, labelled as the guide's
(the guide's own drying rows name Bambu's X1 series, so it speaks of Bambu's own printers), which would let PC and
PPA-CF pass Warm environment; revisit when a maker states a chamber temperature for either. Until then it is in
OPEN-PROBLEMS §12.

**Left.** Thirty products with no value of their own have no twin (R166 reprints, and products whose sibling holds
nothing); 27 of them have no profile either. The January 2025 revision's ASA-CF, PC FR and TPU for AMS columns are not
read, since the current revision dropped them. The guide's annealing, AMS, adhesion and speed rows are not recorded.
Both are in OPEN-PROBLEMS §12.

| | Result |
|---|---|
| `npm run data:check` / `data:lint` | 26 tables, 0 issues / 291 findings, all accepted, 0 new |
| `npm run build:diff` | twins: 1,117 differences (product values, spreads, the estimates that follow their medians); the guide: 3,285 (`db.grades[].print` and `.print.from`, `db.printGuide`, two source fields) |
| `node scripts/migrate/m150-bambu-filament-guide.mjs` | 33 changes; a re-run is a no-op |
| Tests | `npm test` 312 (seven new rules over every product: a twin reads only a same-material, same-key sibling's own value and never a price; no product is silent beside a sibling that publishes; a twin's recipe part is its sibling's own and only where its own profiles are silent; the spread's twin count; a guide part is its material's row, only where the product and its twins are silent, labelled; a guide's enclosure without a temperature leaves the chamber unknown; the engine judges and labels a borrowed value and gate), `test:ingest` 167 |
| `verify:fast` / `verify` | 57 s with the build cached at load 14 (78 s at load 17 to 20 for the twins commit) / passing in 5 min 50 s at load 13 to 37: the scale check, the audit, the snapshot and counts current, 66 views (6 rewritten for the guide, 25 for the twins), 300 fuzzed scenarios |
