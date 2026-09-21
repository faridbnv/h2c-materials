# What is left of V2

Rewritten 2026-09-21 as the close-out plan: every document terminal, the data swept for mistakes, the estimator
extended to grades, and the interface reworked for the volume. It replaces the completion plan, whose phases landed
as batches b23 to b27, migrations m98 to m106, rulings R074 to R088 and D80.

Everything that can be counted is generated and lives elsewhere. What is here is what has to be decided or built,
in what order, with the reasoning a count cannot carry.

**Three documents say where the import stands, and all three are generated:**

- [STATUS.md](STATUS.md) — the database, the corpus by status, the parity census (`npm run ingest:inventory -- --status`)
- [BLOCKERS.md](BLOCKERS.md) — every open document, what it needs, who it waits on (`npm run ingest:blockers`)
- [READINGS.md](READINGS.md) — the identity each held sheet gives its product (`npm run ingest:readings`)

## 1. Where it stands

On 2026-09-21, after batch b30: 1,146 of 2,088 ledger rows applied, 534 settled, **408 open** — 358 `held`, 33
`gated` (INTAMSYS, out of V2), 17 `unreachable`. The ledger grew by 40 witness rows (R089), which are settled as
`duplicate-of` their documents. Batch b27 (the optical pool) is reviewed and not applied. The database: 157
materials, 1,031 grades, 10,440 measurements, 1,307 sources (row counts, retired records included).

Two owner archives sit untracked and ignored beside the repository; the pipeline keeps only their hashed bytes:

| Folder | What is in it | What matters |
|---|---|---|
| `_temp FormFutura Filaments/` | FormFutura's SharePoint library, 358 PDFs, 227 MB | 68 technical data sheets (67 match the 64 gated rows by file name; Lehvoss PAHT 9825 NT matches none); 202 safety sheets; the rest declarations, case studies, spool specs, website texts, which are ignored |
| `_temp iSANMATE/` | iSANMATE's download page, 35 PDFs | 17 for a waiting row, 2 file names shared by two revisions each, 14 byte-identical to applied documents, 1 new (`PDS_TDS.pdf`), 1 duplicate download; `2023/03/CF-PC_TDS.pdf` has no file and is no longer listed |

## 2. The owner's decisions of 2026-09-21

Each becomes a row of `rulings/rulings.csv` when it is acted on.

| Question | Decision |
|---|---|
| FormFutura | the owner obtained the library; stage the data sheets from it and ignore everything else |
| INTAMSYS | stays `gated`; not in V2 |
| iSANMATE | the owner saved the files; the pipeline stages them (R084 stands) |
| The identity verdicts | the agent decides them (R089). A reading counts only from a fetched, hashed document the maker published; the research inventory, the research notes and a web search are pointers to such a document, never evidence (D35). What nothing names goes back to the owner as one short list |
| The Ashby reference layer | off by default, one toggle, the Ashby lens only |
| "Refactoring the database" | a quality sweep and the query layer, **and** the estimator extended: polymer group → material → grade, every usable measurement, a leave-one-grade-out back-test |
| The family filter | two levels: Family, then base polymer |
| The drawer | by maker, then grade; collapsed; a search box; mechanical and thermal by property first |
| Family ranges | the refusal stands: no cross-grade range of any kind (`compile.js:389`) |

## 3. The plan, in order

Data first, because the sweep and the estimator need the complete corpus and the interface must be designed against
the real volume. The estimator before the drawer, because the drawer shows grade estimates. The family facet (3.1)
and the reference clean-up (3.5) need no data, and are the work for any wait on the owner.

| Step | What | Sessions | State |
|---|---|---:|---|
| 0 | Housekeeping: archives ignored, `--holds` re-run, this plan written | ½ | done 2026-09-21 |
| 1.1 | FormFutura: recursive staging, layout parity, batch b28 | 1½ | done 2026-09-21 (b28, m107–m111) |
| 1.2 | iSANMATE: staging, layout parity, batch b29 | ½ | done 2026-09-21 (b29, m112; parity 61 %, completeness measured) |
| 1.3 | Verdicts by witness, batch b30 | 1½ | done 2026-09-21 (b30, m117; R099–R164) |
| 1.4 | Supports, density-unit misreads, the six unsettled, batch b31 | 1 | done 2026-09-21 in b30 (R076, R098, m114, m116); PEKK/PAEK rows wait with Stratasys's reader gap (1.7); PMMA, SBC, PI and WearX to the owner's list |
| 1.5 | Batch b27 applied | 1 | |
| 1.6 | Second read: the findings register, the corrections | 1 | |
| 1.7 | The tail: twins, no-values, unreachable, several-values, low-parity makers, `deferred` | 1½ | |
| 1.8 | The import closed | ½ | |
| 2.1 | Cross-maker consistency: SQL views, `EST-CONFLICT` | 1 | |
| 2.2 | Grade posteriors, `EST-GRADE-OUTLIER`, D81 | 2 | |
| 2.3 | The sweep | 1½ | |
| 2.4 | Representative grades and headlines after the import | ½ | |
| 2.5 | Query layer, OPEN-PROBLEMS | ½ | |
| 3.1 | Family → polymer facet | 1 | |
| 3.2 | The drawer by maker → grade | 2 | |
| 3.3 | Estimates in the interface | 1 | |
| 3.4 | Decision helpers | 1 | |
| 3.5 | Reference layer clean-up | ½ | |
| 3.6 | Size and boot, measured | ½ | |
| 4 | Release | 1 | |

**Done for V2 means:** every ledger row terminal (`applied`, `duplicate-of`, `registered`, `safety-data-sheet`,
`not-a-data-sheet`, `skipped`, `unreachable` dated, `gated` named, or `deferred` — a named reader gap V2 will not
close, dated); zero `held`; every maker in `census/parity.csv` at 95 % or with a measured reason; every second-read
finding closed; every accepted finding current; grade posteriors back-tested; the interface reworked; `npm run
verify` and CI green; `main` merged only when the owner asks.

### 1.1 FormFutura (b28)

`ingest:fetch --stage` reads one folder level (`fetch.mjs:180`) and refuses a file no row carries
(`rowForStagedFile`, `fetch.mjs:131`). It learns:

- `--recursive`, staging only files whose name says TDS or "technical data sheet" and not SDS or safety, and
  reporting everything else by kind without staging it.
- Matching by the URL's product folder and file name together first: two rows carry `TDS - High Gloss PLA.pdf`,
  one under High Gloss PLA and one under its ColorMorph folder. Then the file name alone, then the longest product
  name, as today.
- `--create --root-url <prefix>`: a data sheet no row carries gets a row built as `harvest.mjs:77` builds one —
  `doc_key` from the URL's digest, the URL rebuilt from the prefix and the file's path in the backup, the maker from
  the partner folder (Lehvoss, Covestro, Mitsubishi Chemical, Copper 3D) through `manufacturerIndex()`, Access state
  `retrieved-copy`, discovery "staged from the maker's backup folder (R084)".
- Bytes already in the ledger are reported as that document: the three ReForm sheets repeated under "ReForm
  Promotion Material" and one of the two High Gloss PLA files.
- The seven Covestro Addigy leaflets and the Mitsubishi Xantar spec print property tables and are staged by hand;
  extraction decides whether each is a data sheet.

**Parity before novelty.** FormFutura reproduces 12 of 26 values on its two transcribed sheets (`S-PET-TDS`,
`R-FORMFUTURA-STYX-PA6-TDS`). Name the layout rule, add its fixture, reach 95 %, `--compare --all` before and after
with no maker down. Budget half a session; past it, FormFutura's sheets are held `reader:<gap>` and wait safely.

Then batch b28. Afterwards `--holds` again: the eighteen 3DJake copies of FormFutura sheets that b27 read as "UTURA"
(the logo) should turn `registered` once the products are in under FormFutura's own sheets.

### 1.2 iSANMATE (b29)

`--stage "_temp iSANMATE" --provider iSANMATE` hashes the 17 one-to-one files. The two shared names (`ASA_TDS.pdf`,
`PA12_CF-TDS.pdf`) are staged with `--doc` against the revision the file's own date says it is, and the other
revision becomes `unreachable`, dated, "no longer listed on the maker's download page", as does `CF-PC_TDS.pdf`.
`PLA_TDS.pdf` is byte-identical to the applied 2022/09 document, so its 2022/07 row becomes `duplicate-of` by
itself. `PDS_TDS.pdf` gets a row with `--create`. Parity is 58 of 142; the misses are the 2025
"Glass-Fiber-Technical-Data-Sheet" layout (density, melting point, bending stress, notched impact). Same procedure
and budget as 1.1, then batch b29.

### 1.3 Verdicts by witness (b30)

`readings/readings.csv` holds 159 readings: `said` 27, `named` 29, `narrowed` 14, `said (product page)` 5,
`unread` 84 (READINGS.md has the current split). Under R089:

1. `ingest:witness --doc <key> --url <url>`: a page or PDF a search found, fetched and hashed as a `product-page`
   witness row (reusing `witness()`, `witness.mjs:63`). A safety data sheet's composition section is the maker's
   document and names the polymer.
2. A search subagent with a written brief (`BRIEF-witness-search.md`): per row, one maker-published URL that names
   the polymer, or `none`. Retailer pages are pointers only.
3. `ingest:readings`, then the Verdict column: `yes` where a witness now says or names it. What stays `unread` is
   the owner's short list.
4. `ingest:readings -- --rulings --by "claude (R089)"`. A polymer with no `polymers.csv` row is refused there
   (R081) and gets its row from a producer's reference first, as m70 and m98 did. Then `--holds`, `--propose --held
   ruling`, twins, review by exception, migration.

### 1.4 Small reader rules and the six unsettled (b31)

- **Supports (18, R076):** `classify.mjs:321-338` detects a support and asks for a ruling; nothing maps the
  chemistry. PVA → M075, BVOH → M076, HIPS → M081, a breakaway named for what it supports → M077 to M080. Fixture
  tests. PolyDissolve S1 and Polycast, which the density check caught instead, go the same way.
- **Density read a thousand times too high (5):** Yousu's three at 23,000 kg/m³, QIDI PC ABS FR at 1,183,000,
  3DJake PLA 2020 at 124,000. One reader defect; find it, fixture, re-propose.
- **"PESU" (2, Filament2Print Eco Coffee and Flex 77A):** where the word comes from; else the witness route.
- **Four below-neat densities** (LumberLay, COC flex, Polywood, PETG FX120): a declared wood or foam load is a
  grade Variant `lightweight additive` (D57); an undeclared one goes to the owner.
- **The six unsettled:** a `Metal` value in `schema/vocab/modifiers.csv` (R090, in the commit whose data uses it)
  for both copperFills and Prusament Magnetite and Tungsten; a `PAEK` row in `polymers.csv` from Victrex's reference
  for Stratasys AM200; WearX PA6 copolymer as PA6 with the copolymer in Composition.

### 1.5 Batch b27 applied

After b28 and b30, `--holds` on b27's documents first: the UTURA eighteen and any twins leave as `registered` or
`duplicate-of`.

1. `ingest:review --rename "<name>" --visual --by <reader> --note "p. 1 prints …"`: a grade's Product name set to
   what the page image prints, quoted. A name is accepted only as printed; it is not a corrected value. For the ten
   reviewed documents named from furniture (BASF "run by Mass Additive Manufacturing" ×5, "forwardAafyT",
   "Ultrafuse PLA Prot", Fiberlogy "TARDE NAME: …", "Sheet", "vii)").
2. **Every grade row signed `--visual`.** All 139 texts are optical, and `APPLY-OCR-UNVERIFIED` checks every row a
   proposal carries (`apply.mjs:116`), grades included; no grade row has `visual`, so 127 documents would be refused
   today. The optical reader signs each grade against page 1 and finishes the 31 documents with undecided rows. The
   check stays as it is.
3. The twelve documents needing an identity take their verdicts through 1.3.
4. `--split`, `--accept`, `ingest:apply --dry-run`, migration, `--finish`.

### 1.6 Second read: the findings register and the corrections

R085 says one disagreement reopens its document. For an applied document that cannot work: `--tally` writes
`held: second-read`, and the next `--holds` makes the row `registered` again and overwrites the finding
(`batch.mjs:245-259`). **R091** (amends R085): an applied document is questioned, not reopened. `--tally` writes
`second-read/findings.csv` (batch, document, measurement, property, verdict, note, by, date, resolution) and
leaves the ledger's status alone; `--open` lists what is unresolved; a migration or a reason closes each finding;
the rate per batch goes into STATUS.md.

The corrections are one migration per class, each class counted across the whole table with SQL first: conditions
(the sample's 84: notch, build direction, dry or wet or annealed, specimen form, melt-flow condition, test load);
QIDI's 26 unrecorded standards; the seven values listed in OPEN-PROBLEMS §10. QIDI's specimen type and Extrudr's
split specimen type become rulings.

### 1.7 The tail

- **Twins (47):** `--twins` after b28 to b31; what still refuses is read as a pair (R053), once.
- **`no-values:layout` (15):** Essentium's eight are one shape, tripled text: a normaliser in `extract.mjs` if it
  frees them. The rest get fifteen minutes each, then `deferred`. **`no-values:language` (14):** labels only for a
  language with three sheets or more. **`no-values:prose` (1):** `deferred`.
- **`unreachable` (14):** one Wayback retry each (`archive.org/wayback/available`; the access note names the
  archive URL), then terminal.
- **`reader:several-values` (31) and `reader:condition-table` (3):** proposed under b24's column and caption rules;
  what still holds is read, and a row that merges several products is `deferred: shared-table`.
- **`deferred`:** a terminal status, written only by hand (`ingest:batch --defer <key> --why …`), dated, counted
  as settled.
- **Low-parity makers, time-boxed to one session:** Prusa 44 %, Essentium 4 %, Kimya 64 %, Grupa Azoty 67 %,
  Stratasys 83 %, IPCON 89 %, Yousu 90 %, Bambu 93 %, Braskem 93 %. Each ends at 95 % or with the miss named.

### 1.8 The import closed

`--holds`, the three generators, every row terminal, the batch READMEs, RESPONSE.md, and in STATUS.md a generated
reconciliation of the research inventory's 1,868 preferred links: applied, settled, deferred, gated.

### 2.1 Cross-maker consistency

Nothing compares a grade's value with its material's other grades. `fitWithConflicts` (`calibration.js:75`) finds
the contradictions and down-weights them into `meta.estimateModel.conflicts`, and nobody reviews them.

- **`EST-CONFLICT`**, a reviewed code: one finding per material, grade and headline, with its z-score and what it
  contradicts. It starts at `info` with counts by material in the Estimates report; it is reviewed only once the
  count is small enough to review (target under 60). Today's 184 are 31 PLA densities at 1,360 to 1,390 kg/m³ — an
  undeclared Variant, not a review.
- **SQL views** in `scripts/data/sqlite.mjs`: `v_property_spread` (per material, property and stated conditions:
  grades, median, MAD, extremes with their grade IDs) and `v_measurement_z` (each measurement's robust z within
  that group). The sweep list is `v_measurement_z` ordered by |z|.

### 2.2 Grade posteriors, `EST-GRADE-OUTLIER` (D81)

Designed and measured on today's build without committing anything. The hierarchy asked for is already the
kernel: chemical group, polymer identity, a per-material deviation and a per-formulation deviation
(`gaussian.js:24-37`, `:73-74`). The material loop predicts at the representative grade's row (`index.js:108`); a
grade posterior is the same `predict` at the grade's own row, with no new hierarchy and no refit. The model
estimates five headlines; price is a median of listings and stays as it is.

| | density | modulus | strength | elongation | hdt045 |
|---|---:|---:|---:|---:|---:|
| grades held out, whole grade hidden | 753 | 701 | 709 | 677 | 614 |
| likely / plausible coverage using the material's calibration | .75 / .94 | .89 / .97 | .94 / .99 | .75 / .95 | .79 / .93 |
| own observations beyond z = 3, not the material's only evidence | 12 | 5 | 1 | 5 | 23 |

The material's calibration does not hold at grade level (strength covers 0.94 where 0.80 is claimed), so grade
ranges get their own calibration from their own back-test and the material's ranges do not move. Cost: about 4.3 s
at today's size, about 50 s of the 150 s budget at twice it.

- **Where:** `db.grades[].estimate[key]` = strength, precision, centre, likely, plausible, own share, the
  formulation's evidence, the grades it is shared with, basis; nothing that screens (grade posteriors decide
  nothing, D48 and D59). About 1 MB. A new `build/src/estimate/grades.js`; `makeRangeFor` gains a `formulation`
  option so the D78 hold uses the grade's own published limits.
- **Back-test:** through `holdOut` (`calibration.js:26`): hide each grade's own observations of the headline's
  kind to calibrate and measure coverage per headline and per strength class
  (`meta.estimateModel.properties[key].gradeCalibration`, a table in the Estimates report, `build/snapshot/grades.csv`),
  with `EST-CALIBRATION` at the same tolerances; hide the whole grade to score each of its observations, with the
  conversion noise in the denominator.
- **`EST-GRADE-OUTLIER`:** a grade's own observation beyond z = 3 from its leave-one-grade-out prediction; not the
  material's only evidence; not where `EST-OUTLIER` already names the headline. `info` first, reviewed later.
- **Gates, in order:** the grade estimates attached with `build:diff` showing nothing under `db.materials`; the
  back-test with `npm run scale` recorded in `test/scale.check.js`'s history (past 60 s at 2x, the hold-out
  downdate is made sparse before anything else, and the budget is never raised); the two codes at `info`; the data
  fixes their counts point at; then reviewed. A headline whose grade calibration clamps at its bounds ships no grade
  estimate, and D81 says why.

### 2.3 The sweep

The top 200 by |z| from 2.1 and the two codes, each read once against its cached, hash-checked sheet, ending in one
of four ways: a transcription fix through `correct()` (the class counted first, one migration per class); flagged
implausible with the reason (the m24 shape); a grade Variant (D57, D80); or an accepted finding with a reason. After
200 the rest stay as findings. Also: SUNLU's HA/HD hardness column (30 accepted window findings are that one unit);
windows for properties that have none where 30 measurements or more exist; W0024 and W0080 revisited once
Lehvoss's PEEK CF is the second thirty-per-cent grade; the reason written into the eleven implausible rows whose
Notes lack it (OPEN-PROBLEMS §2).

### 2.4 Representative grades and headlines after the import

Everything keyed to `Representative grade` froze when the materials gained grades (`compile.js:304`, `:433`,
`observations.js:182`, `bounds.js:56`, `estimate/validate.js:101`, `coverage-rules.js:93`). A report
(`scripts/data/representative.mjs --report`) lists per material the current grade and the best-documented one;
the owner confirms the moves in one pass; one migration moves `Representative grade` and the `headlines.csv` rows
together, with the coverage rows `COVERAGE-UNTRUE` names.

### 2.5 Query layer and OPEN-PROBLEMS

`grades_compiled` beside `headlines_compiled`; OPEN-PROBLEMS re-derived from its queries.

### 3.1 Family → polymer facet

`Family` is not a filter, and `db.polymers` is shipped and read by nothing in the app. `material.facets.family` and
`.polymer` in `compile.js:515`; `FACETS` in `engine/scenario.js:56`; `evaluateFacet` (`constraints.js:295`) is
generic; a "Material family" group at the top of the rail with counts that follow the candidate set; the chosen
families written to `scenario.plot.promotedFamilies` (`ashby.js:493`), which nothing writes today, so the chart's
colours follow. `ui-fuzz.mjs:104` generates the facet. The registry fixture changes in its own commit.

### 3.2 The drawer by maker → grade

`groupByMaker` and `groupByProperty` beside `groupBySource` (`detail.js:184`). Grades, Printing and Sources group by
maker, each collapsed to one line with a search box above; Mechanical and Thermal lead with the property and list
each grade's value on its own row, with no aggregate range. Drawer text views for PLA added to `ui-probe.mjs`
**before** the rework, because no text view opens the drawer today.

### 3.3 Estimates in the interface

Grade estimate cards in the Grades tab; the rail's availability lines count estimates when estimates are on
(`meta.estimateCoverage`, computed and unread); Parallel draws an estimated centre dashed instead of dropping the
material. Strict must stay byte-identical with the switch on and off (fuzz invariant I3).

### 3.4 Decision helpers

Three: a ranking by the chosen performance index (`rankByIndex`, `indices.js:126`, exported and unused); the
nearest miss in Why excluded (the one requirement whose relaxation recovers a material, and by how much); the stale
"40 of 102" in `indices.js:80,86` read from the data.

### 3.5 Reference layer

Off by default, one toggle, the Ashby lens only is already the behaviour: `scenario.plot.showReference`, and nothing
else reads `reference.json`. Verified with a probe view. Then `Standstone`, `Slilicon` and `Polywood` renamed
through the removal ledger (D72), and the dead `offset` removed from `schema/reference.schema.json` (D67).

### 3.6 Size and boot

`db.json` is 16.5 MB, 9.7 of it measurements, and the page parses all of it at start (`main.js:73`). Boot is
measured before and after Phase 1; past 1.5 s, measurements move to a second payload read on first drawer open.

### 4. Release

`verify`, `ui:fuzz:full`, CI green; INTERFACE, ARCHITECTURE, DECISIONS, DATA-MODEL current; RESPONSE.md and this
page as the closing report. `v2` merges to `main` only when the owner asks.

## 4. What frees each kind of held document

`npm run ingest:batch -- --holds` asks every carried document why it waits and writes the answer into the ledger,
so the queue is a query rather than a memory. It asks first whether the maker already has an active grade for the
product, by the sheet's name and the catalogue's, and a row whose note says `held: registered` is terminal too.

| Reason | What frees it | Step |
|---|---|---|
| `ruling` | a verdict in `readings/readings.csv`, or a ruling row for a one-off | 1.3, 1.4 |
| `ocr-visual` | a reader against the page image, row by row, `--visual` (D35) | 1.5 |
| `reader:several-values`, `reader:condition-table`, `reader:bilingual-columns` | b24's columns and caption rules; what they miss is read or `deferred` | 1.7 |
| `twin` | the sheet it repeats applied first, then `--twins` (R053); or a reading of the pair | 1.7 |
| `no-values:*` | a reader rule if it frees a maker; else `deferred` | 1.7 |

A twin is only a twin once its primary is applied. The maker's product page is a second witness and a weak one:
of 72 fetched, 33 named the product in their title at all, and 5 settled a reading.

## 5. What the pipeline does not do, and why

- **Evidence rows.** `apply.mjs` writes `evidence.csv` rows (`:292`), but `propose.mjs` proposes none: chemical,
  safety and certification statements are not read. Not in V2.
- **A captured page's own title.** A page a browser draws begins with navigation; MakerBot's PETG was named
  "Refresh". `html-text.mjs:75` caches the `<title>` and only `readings.mjs` reads it. Twenty-four rows are
  captured pages; the rule is worth building only if 1.7 finds more than one misnamed.
- **Corrections through the pipeline.** `edits[]` was measured to correct 8 of 96 rows and to overwrite good hand
  transcriptions, so corrections go through `correct()` in a migration.

Durable fixes already made and measured, so none is rediscovered: the fill class per grade Variant (D80, 24
acceptances removed, 0 differences in the compiled database); two high-temperature fibre windows waiting for a
second thirty-per-cent grade (four findings accepted).

## 6. How a batch is run

`scripts/ingest/batch.mjs` is the program, and AGENTS.md lists its steps in order. The rules it keeps:

- **`--holds` first, then propose.** A hold reason is what the last `--holds` run wrote. `--propose --held any`
  takes every held document.
- **One propose run over everything the batch holds**, selected by hold reason, not one run per maker.
- **Review by exception**, and a bulk decision matches **every** reason a row is held for, never one of them.
- **A review names its batch**; `--doc` without `--batch` refuses.
- **Twins before review**, so a copy never produces rows to read.
- **Parity once**, `--compare --all`, before the batch commits and before and after any reader change.
- **One full `verify` per batch**, after `--finish`.
- **A reader rule is built when it frees about twenty documents or a whole maker**; below that the gap is named on
  the row. Fifteen minutes to see whether a gap is a one-line fix, then move on.
- **Nothing is fixed one row at a time.** Count the class with SQL, correct it in one migration through
  `correct()`, and add a window or a lint so it cannot re-enter.
- **A check that pins the corpus's contents is rewritten to assert the rule**, in its own commit, with the reason.
  A check is never weakened.
- **A reader who did not decide the rows** is a subagent with a written brief (`BRIEF-*.md`); the pipeline itself
  is never delegated.

## 7. A blocker nobody has seen before

| What turned up | What to do |
|---|---|
| a data question | a ruling row, and the document held until it is answered |
| a layout the reader cannot read | the rule if it frees about twenty documents or a whole maker; otherwise the gap on the row, and `deferred` at the close |
| a check breaching its budget | measure, fix the cause, and never raise the budget twice |
| a fetch failure | one retry, one Wayback retry, then the dated state |
| a wrong value in the tables | count the class with SQL, one migration through `correct()`, a window or lint so it cannot re-enter |
| a vocabulary value the data needs | the same commit as the data that cites it |
| anything else | BLOCKERS.md names it, and the batch continues without it |

## 8. Where to pick this up

1. `npm run ingest:inventory -- --status`, `npm run ingest:blockers`, `npm run ingest:readings`.
2. The first step in §3 without a date in its State column. After b30 that is **1.5**, batch b27. What b28 to
   b30 left waiting is in their READMEs' last sections; b30's is the owner's list: family-only names, contradicting
   maker documents, resin makers' sheets, TPS under R056, and single sheets whose polymer has no row (PMMA, SBC, PI).
   A polymer row for PEKK and PAEK is worth writing only with Stratasys's condition-table rule, which holds both
   sheets anyway (1.7).
3. Before committing: `npm run verify:fast`; `npm run verify` once per batch; `npm run ingest:propose -- --compare
   --all` if the reader changed. A parity drop after a reader fix may be the recorded rows being wrong: it happened
   three times, and each time the migration that corrected them brought the census back.
4. When a step finishes, date it in §3 and move §8's pointer.
