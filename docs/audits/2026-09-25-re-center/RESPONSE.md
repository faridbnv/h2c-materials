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
