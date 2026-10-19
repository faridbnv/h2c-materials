# Architecture

> **In short.** For someone changing code. Filament Atlas is three layers: the data tables (the source of truth, changed only through checked scripts), a build that validates them and compiles one database file, and the page, which reads that file and never changes it. This document gives the shape of each layer, the build stage by stage, the module map, and where a change goes; why each choice was made is in [DECISIONS.md](DECISIONS.md), and where things stand in the [README](../README.md).

## The shape of the thing

Three layers, separated on purpose, each with a rule about what it may not do.

```
  data/tables/*.csv          the source of truth: reviewed, diffable, one fact in one place
  schema/                    the declared contract for every table, and for the compiled output
            |
            |   CHECK   every table against its schema, before anything is compiled
            |   BUILD   node, deterministic, fails loudly           build/src/
            v
  dist/db.json  +  dist/reference.json  the compiled runtime representation
            |
            |   BUNDLE  gzip the data, inline the libraries
            v
  dist/H2C_Material_Selector_<snapshot>_<release>.html    one file, no server, works offline
            |
            |   PAGES   a page per well-documented material, from dist/db.json   app/pages/
            v
  dist/materials/<id>.html, <id>-products.html, index.html, method.html, assets/   static, beside it; decide nothing
```

Inside the application, the same separation again:

```
  app/js/engine/     pure decision logic. No DOM, no globals, no imports from ui/
  app/js/ui/         rendering and interaction. Imports engine freely
  app/js/main.js     the only place that holds state and wires the two together
  app/pages/         the material pages' renderer, run by the build's stage 8 in Node. Imports ui/ and engine/ (stage.js also
                     the build's cache); nothing in app/ imports it
```

**The engine never imports from `ui/`.** That is what makes the selection logic testable without a
browser, and it is why `test/constraints.test.js` can assert what a user will see without rendering
anything. If you find yourself wanting a DOM in the engine, the thing you want belongs in `ui/`.

## Why CSV tables and a schema, rather than a workbook or a database

Until 2026-09-14 the source was an Excel workbook. Git saw it as one binary blob, relationships lived
as semicolon lists inside cells, headline values were typed twice, and every row added needed an XML
patch script and a hand-edited row count. The tables under `data/tables/` hold the same records with
none of that: each change is a readable row diff, each fact has one home, and `schema/tables/`
declares every column, type, missing state, vocabulary and reference so a mistake is reported at
its file, line and field in about a second (DECISIONS D45).

No database server or SQLite file sits in the build path. For one person and two agents editing some tens of
thousands of rows, text files under a schema give the same integrity checks with none of the operations,
and the build is where those checks run anyway.

A SQLite file is generated beside it, for reading only: `npm run db:sqlite` writes `dist/h2c.sqlite`
from the same tables and the same schema, with numbers typed, missing states in a sibling column and
every CSV header recoverable from `_columns` (DECISIONS D75). `npm run sql -- "select ..."` queries it.
Nothing reads it back, and it is gitignored with the rest of `dist/`, so data still changes in one
place; it exists because a question that spans records is a join, not a script. It also carries the record tier
(D85): what the sources publish that no row holds, and a full-text index of the cached documents. The file is one
generation (D105): `_generation` stamps the release its tables, rules and engine make, the compiled database it read and
the record tier's inputs, and `_tables` the tier and release of every table. A query rewrites a file that is not of the
tables as they are, and refuses while `dist/db.json` is of another release; `--snapshot` answers from the file as written
and says which release it holds. How much of the corpus the full-text index holds is stamped too
(`fulltext` complete, partial or unavailable; `v_sources_without_text` names what is missing), and so is whether
`source_facts` could be read (`source_facts` available or unavailable): it is read from the 2026-09-18 import's proposals,
which live in the private store and are restored to `.cache/proposals` by `npm run packets -- --restore
ingest-2026-09-18` (D138).

## Why a build step, rather than reading the tables in the browser

Reading the tables in the browser would couple the interface to their layout, push validation
failures into the user's session, and make the output non-deterministic. The tables are the authoring
format; JSON is the compiled runtime representation, checked against `schema/db.schema.json`.

The build is also where the project's discipline lives. It fails on any validation error, so a
database that has drifted cannot reach a distributable file at all. It is reproducible: the same
commit builds the same bytes, and `dist/manifest.json` records what went in and what came out.

## Why one self-contained HTML file

The brief fixes this: the tool must work from a local file, a shared drive, or static hosting, with
no backend and no network. That rules out CDN references, which is why the libraries are inlined and
the dependency versions are pinned.

The compiled database ships gzipped and base64-encoded, inflated at boot with `DecompressionStream`.
On 2026-10-17 it was about 39 MB raw, most of it measurements, and 3.6 MB embedded once gzipped and base64-encoded.
The plotting library is still most of what the file weighs: 4.3 of the page's 8.5 MB ("Scale" below says how far that
holds; 8.4 before the selector embedded the pages' Inter subset, D147). The build prints sizes in MiB (8.1 for the page).

The material pages are not in it (D142). They are separate static files beside it, in `dist/materials/` (on the site
at `materials/`; a release carries them as one zip), because a page per material would multiply the one file's weight
and none of them is needed to answer a question: the selector works without them; the drawer's Full page link and the
status bar's Material pages link lead to them, carrying the selection so the pages' way back restores it (D145). They keep the same rule against the network: their fonts are embedded in their one stylesheet as data:
URIs and their script is a classic one, because a browser refuses font files and module scripts from `file://`, so a
page opened from disk, from an unzipped release, reads and works as it does on the site.

## Module map

### Build, `build/src/`

| Module | Responsibility |
|---|---|
| `csv.js` | The canonical CSV format: parse, and write in the one form every table is kept in. |
| `schema.js` | Check every table against `schema/tables/`: columns, types, missing states, patterns, vocabularies, uniqueness, references (including IDs inside lists and prose), canonical format and `data/manifest.json`. |
| `load.js` / `source.js` | Read the tables into raw row objects, and (`source.js`) each file's SHA-256 for the audit record. No interpretation. |
| `registry.js` | The property registry: what each property and headline means, which materials it applies to (Applies to may test the material's columns and its polymer's Morphology), and which property replaces a retired name (`properties.csv`, `headline_definitions.csv`; D57), and the comparisons the drawer draws (`drawer_comparisons.csv`, checked by REGISTRY-COMPARISON; D139). |
| `normalize/values.js` | Numbers, missing states, operators, intervals. Everything downstream depends on these staying distinct. |
| `normalize/direction.js` | Thirteen spellings of build direction onto eleven canonical values (a source's own label, a ±45° raster and a YX bar get their own values; three spellings are unknown), and which may be compared with which. |
| `normalize/thermal.js` | HDT standard and load out of about twenty spellings of free text, MPa, psi and kgf/cm², ISO 75's method letter ("HDT/A", "Method B") among them; a load stated as a number outranks a letter beside it, and a text naming both loads states neither. The test temperature a wording states ("23 °C", "@23° C", "+24°C", "150℃"). |
| `normalize/standards.js` | The standards a Standard / load text names, at family level and one spelling each (DIN's five-digit numbers and ISO's "ISO-R" among them); it checks the typed Standards column (D76). |
| `normalize/process.js` | Nozzle, bed and chamber temperatures, enclosure wording, nozzle diameters, drying (its need, required, optional, not-needed or unknown, and an open duration such as "6+ h": D127, D129), abrasion. A window the H2C covers only from its bottom (`within-low-end` or `edge`, D151), the chamber's answers in words, and an enclosure the H2C's chamber meets (`enclosed`, D90, D93). A number a cell states that is not a temperature (a nozzle size, a speed, hours) is set aside (`stripNonTemperatures`); every other is read as stated, and one outside its axis's plausible window (`TEMP_WINDOW` in `recipe.js`) is typed as stated and reported (PROCESS-WINDOW-IMPLAUSIBLE), never dropped (D141). |
| `normalize/chemical.js` | Environment topics onto canonical categories (`schema/vocab/environment-topics.csv`); findings onto verdicts. |
| `normalize/moisture.js` | The moisture state at test (dry, conditioned, not-stated): the typed Moisture state column, and a reader of what the Moisture condition wording plainly says, which checks it (D53, D68). |
| `normalize/specimen.js` | The declared Form of each Specimen type (printed, not-stated, moulded, film, filament, off-recipe), the typed Post-processing state (as-printed, annealed, not-stated) and anneal schedule with the readers that check them, and whether an annealed value has an as-printed twin (D56, D68, D95). A denied annealing ("has not been annealed") reads as as-printed first (D129). |
| `typed-values.js` | The typed profile and measurement columns the build decides on, and the parser check that they agree with the raw text (PARSE-MISMATCH, D49). A Parse review silences only the columns it names (PARSE-REVIEW-SCOPE, D115), and a profile's or measurement's review naming a column that agrees with the parser stops the build (PARSE-REVIEW-STALE, D119); a typed endpoint is a number its cell states and an open bound stays open, whatever a review says (PARSE-TEXT-BOUNDS, OPEN-BOUND-WINDOW). |
| `page-context.js` | What a source page states once (`page_context.csv`): the rows that speak for a measurement by page and scope and by the table they head (Table, D128), and the inheritance compile applies where the row states nothing of its own (D116), the direction a page states for its printed bars among it (D135). |
| `recipe.js` | One print recipe read from a profile's or a guide row's columns: the typed windows, enclosure, drying and hardened nozzle checked against the raw text (`readAbrasion` is the one reader of the hardened-nozzle question for the build, the migrations and the import, and listens to the nozzle-material and nozzle-size lines when the abrasion line is silent, D129), the chamber a "no enclosure needed" clears, where a chamber may be declared `enclosed` (PROCESS-ENCLOSED, D90, D93), and the gates against the H2C. |
| `print-guide.js` | A printer maker's filament guide (D88): its rows of `print_guide.csv` read as recipes, the material each speaks for (`print_guide_materials.csv`), and the refusals (PRINT-GUIDE-REFERENCE, PRINT-GUIDE-MATERIAL). `products.js` reads a material's row, for the print gate and drying, where a product and its twin are silent, and never for a product with a Variant (D129). |
| `normalize/provenance.js` | The origin tag every derived value carries. |
| `prices.js` | Listings in any currency (D113): each listing's regular CAD/kg derived from its amounts, the VAT its page states, its net mass and the Bank of Canada rate in force (`fx_rates.csv`); a product's price sample (its Canadian listings where it has any, else its foreign ones); the sample as the page counts it. Refuses PRICE-INCOMPLETE, PRICE-TAX-UNSTATED, PRICE-FX-MISSING and PRICE-MARKET-CURRENCY. |
| `compile.js` | Assemble the relational runtime database. A material's headline starts missing, with its related evidence and implied bounds (from printed values and those of a source that states no specimen, D55, D126); products.js fills each one its products publish comparably. |
| `products.js` | Every product's own value per headline and its print recipe, chosen by rule, every material's spread across its products, and the material headline that spread gives (D83; re-center phases 1 and 4). Where a product is silent, its twin's (same material and formulation key, D89), then for the print gate and drying its material's guide row (D88, D127), never for a product with a Variant (D129), each so read labelled. Every product's decision states (`states`, D99): as printed and dry, each annealing schedule, conditioned, each holding only its own values, with the conditions each value admitted unstated. Its twins (`twins`). Checks the pins in `headlines.csv`. A strength taken from a yield or break stress is the greatest of the stress endpoints one test prints (D126). The engine judges the products. |
| `product-claims.js` | What a maker sells a product as, where it matters to how its values are read (`product_claims.csv`, D133): each claim points at the maker's own recorded statement, whose words must speak of what the claim is about (PRODUCT-CLAIM-REFERENCE, PRODUCT-CLAIM-WORDS); shown beside the product's values, and products sold as toughened are set apart from the impact medians. |
| `written.js` | The written summaries at the head of the material pages (D142): each row of `material_summaries.csv` becomes `materials[].written` (who, when, review status, and its text as parts), every placeholder filled from the material's compiled spreads, its print windows, drying and layer shares (read from `material-highlights.js`), after products.js. A field the material cannot fill stops the build (SUMMARY-PLACEHOLDER); the lint finds a number typed by hand (SUMMARY-NUMBER) and a count of products, makers, values or profiles, which the page's head already says (SUMMARY-COUNT, D145; both in lint-rules.js). It decides nothing. |
| `gates.js` | A gate across several print profiles (within beats within at the low end beats on the line beats exceeds beats unknown, D151), for a material and for a product. |
| `coverage-rules.js` | Define, once, what counts as a material's own mechanical, thermal, print, environmental and price data (the moisture domain also counts its makers' own statements on moisture sensitivity, which decide nothing, D143), and which rarely published properties it lacks; compile derives coverage rows from it, evidence and absence (D74, D114), and validation checks the stored rows against it. |
| `pipeline.js` | The stages every caller runs (the build, the snapshot, the audit, the trace, the tests): compile, the estimate stage, a silent chamber read from its kind of plastic (`chamber-need.js`, D151), validate. `estimates: false` builds the core database alone, and it must validate. |
| `build-cache.js` | The result of `buildDatabase` stored in `.cache/build/` under a SHA-256 of everything it depends on, so the callers that compile the same tables run the estimate stage once (below, "Scale"). The same store keeps the material pages (stage 8), keyed by `digestFiles` over the renderer's code, the database's SHA-256 and the selector's file name. |
| `estimate/` | The estimate stage, applied to the compiled database as an overlay (D58): one calibrated Gaussian model per headline over every observation, converted to the headline, configured by `build/mappings/estimate-model.json` (conversions, limits, the fit's judgements) and the tables it reads (`polymers.csv`, a material's Estimate identity and Variant class, Shore hardness measurements; D43, D53, D60), following printing physics (D56) and bounded by what the material's own printed data prove (D55); the screening back-test that decides which evidence may screen (D48); estimated nozzle and bed windows, which decide nothing. `model.js` configuration and shared names, `numerics.js`, `observations.js` conversion kinds and the snapshot, `conversions.js`, `gaussian.js` kernel, fit and prediction, `solver.js` the kernel solved block by chemical group (D79), `calibration.js`, `bounds.js` ranges and their limits (a material's range contains every product's proven floor; a semicrystalline polymer's melting point is a ceiling on its heat deflection, D126), `screening.js`, `print.js`, `validate.js` its checks and report section, `index.js` the stage. `floors.js` back-tests the floors (`meta.estimateModel.properties.*.floors`), and `order.js` checks that no estimate or product value shown breaks an order its own measurements set (EST-ORDER, PRODUCT-ORDER; D126). `grades.js` predicts every active grade at its own row and calibrates those ranges at grade level (D81); a grade estimate never passes; D137 adds independent product exclusion certification in `product-screening.js`. |
| `physical-relations.js` | The orderings physics fixes between two properties, from `data/tables/physical_relations.csv`: the one list the data lint judges published measurements by (`MEAS-PHYSICS-ORDER`, `MEAS-PHYSICS-HDT-LOADS`) and the registry checks every headline lower bound against (`RELATIONS-HEADLINE-DRIFT`). |
| `lower-bounds.js` | What a product's or a material's own measurements prove a headline is at least (`headline_definitions.csv` Lower bound properties; D126): the one rule that compile (implied bounds), the estimate stage (a grade's range, the floor back-test) and the order check (EST-ORDER) all read, so what bounds an estimate and what the check asks of it cannot differ. A printed bar bounds it, and so does one whose source states no specimen, in any direction; a moulded, film, filament or off-recipe bar bounds nothing. |
| `chamber-estimates.js` | The research's chamber bands, from `data/tables/chamber_bands.csv`. Attached only where nothing better exists; they decide nothing. |
| `evidence-ledger.js` | The evidence ledger and the physics limits per kind of plastic (`data/tables/conversions.csv`, `class_limits.csv`; D153, D154), called at the end of `attachProducts`: for each product state with no deciding value, every row's contribution from its own records and its twin's, judged by `assess()` with only what the row changes changed, and the deciding comparable ones' intersection (`states[i].bounds`); a PLA or PET HDT from an undescribed bar marked `ceilingOnly`; a comparable value its deciding records or its kind's limit contradict marked `doubtful`; each row's band re-measured on same-sheet pairs. The refusals (CONVERSION-ROW, LEDGER-LB-DRIFT, CLASS-LIMIT-ROW, CLASS-LIMIT-SOURCE) and the reviewed findings (CONVERSION-PAIRS, LEDGER-DISAGREE, CLASS-LIMIT-CONTRADICTED). `db.conversions` and `db.classLimits` hold the rows with their counts. The estimate stage reads none of it. |
| `chamber-need.js` | What a silent chamber means for a kind of plastic (`data/tables/chamber_need.csv`, D151): per row, the distinct makers whose own sheet or twin's states a chamber and those asking above 65 °C (`chamberNeedStats`), the refusals (CHAMBER-NEED-DRIFT, -BAND-CONFLICT, -OVERLAP) and a reported row ready to decide (CHAMBER-NEED-READY), and, for a deciding within row, each truly silent chamber read as within with origin `family`. Run by `pipeline.js` after the estimate stage, whose product-screening validation set stays the products whose own sheets, twins or guide settle all three printer checks. `db.chamberNeed` holds the rows and their counts. |
| `polymer-environment.js` | A base polymer's published environmental behaviour, from `data/tables/polymer_environment.csv` (D64): compiled with its refusals, one verdict per category by the documented rule, attached as inferred records (`db.polymerEvidence`, `evidenceIds.polymer`) only where a material has no record of its own. Core evidence, not the estimate stage, but marked inferred and removable: an empty table leaves the database untouched. |
| `know-how.js` | Makers' know-how (D85, lane 3): moves the statements (evidence rows in the non-filterable `know-how` category) out of `db.evidence` into `db.knowHow`, so nothing that screens reads one, and derives each product's and material's know-how state (collected, sheet silent, searched, no document read) and the recipe's, from the statements and `data/tables/know_how_reads.csv`. The product panel is the one reader. |
| `reference.js` | The generic-material baseline layer, compiled separately on purpose. |
| `reference-properties.js` | The reference envelopes' properties and units, read from `schema/vocab/reference-properties.csv` (D67). |
| `validate.js` | Every invariant, plus the human-readable report. |
| `rules.js` | The catalogue of every issue code, its level (error, warn, info, lint), meaning and fix (D50); generates `docs/RULES.md`. |
| `lint-rules.js` | Data quality the schema cannot express, as coded findings with a record each (D50): text artefacts, duplicates, indistinct conditions, directions named in locators, and physics one sheet must not contradict (MEAS-PHYSICS-*, D55; the orderings between two properties are read from `physical_relations.csv`, D126); one table under two products with no shared key (GRADE-VALUES-TWIN), an impact unit its standard does not report, a filler a product's name has and its material does not, a row that contradicts its page (CONTEXT-ROW-CONTRADICTS-PAGE), and one product's setup read twice from one sheet, or a row of it silent on what the sheet states for every row (PROFILE-DUPLICATE, PROFILE-SIBLING-SILENT, D120). |
| `property-references.js` | Property names the code relies on, checked against the registry, and the estimate model's references (D51). |
| `measurement-rules.js` | Independent raw-value, uncertainty, upper-bound, unit and endpoint checks, and no use of a replaced property, used by validation and the systematic audit. |
| `contract.js` | Check `dist/db.json` and `dist/reference.json` against `schema/db.schema.json` and `schema/reference.schema.json`. |
| `review-workbook.js` | The generated, read-only Excel review workbook (`npm run data:export-xlsx`). |
| `bundle.js` | One HTML file, named by its data date and its release: the shared tokens and the selector's stylesheet inlined as one style element, with the material pages' Inter subset as a data: URI and its licence (D147), the libraries, the application and both databases. |
| `release.js` | The release ID (D96): a digest of the tables, schema, rules, engine, templates and lockfile; the page's name. |
| `index.js` | Runs the stages, decides whether the build may proceed, stamps the release, runs stage 8 (the material pages, `app/pages/stage.js`, loaded only then; `--no-pages` leaves them out and removes `dist/materials/`), and writes the release manifest. |

### Data tooling, `scripts/`

| Script | Responsibility |
|---|---|
| `data/table-io.mjs` | The scripted-edit API: open, find, set (with an expected-value guard), update a row of a keyless table by its fields, append, add or drop a column, create a table, the next ID, save in canonical form with a fresh manifest, as one transaction that refuses a second writer and is finished by the next open if it stopped part-way (D104); `stageFile` puts another file in the same save. A record leaves a table (`remove`, `removeWhere`) only with a row in `data/review/removed-records.csv` naming its migration and where it went (D72). |
| `data/fmt.mjs` | `npm run data:fmt`: rewrite tables and vocabularies canonically and refresh `data/manifest.json`; `--check` changes nothing. |
| `data/check.mjs` | `npm run data:check`: the schema gate on its own, in about a second. |
| `data/new-id.mjs` | `npm run data:new-id`: the next free ID for a table, or a material's next grade. |
| `data/new-material.mjs` | `npm run data:new-material`: a material and its first grade in one write, and a list of the records it still needs. |
| `lib/cdp.mjs` | Headless Chrome for `ui-probe.mjs` and `ui-fuzz.mjs`: where it is, how it is launched, the debugging port. |
| `lib/pdf-text.mjs` | A source document's bytes, digest and text page by page, cached by SHA-256 in `.cache/`: the reader the audits, the import and the migrations prove a number on its page with. `repairLigatures` puts back the "ti" and "ft" a font mapped to digits and W ("Prin5ng"), as a view made at read time; the cached text is never changed (D125). |
| `lib/pdf-layout.mjs` | A page's spans cut into blocks in reading order (an XY-cut), so the columns of a two-column sheet are read one after the other and a table whose rows share baselines stays whole; `readingOrder` for a page, `withReadingOrder` for a document. A view beside the cached lines, not a replacement (D125). |
| `lib/text-quality.mjs` | Whether a cached page's text is a reading of the page: the flags `empty`, `glyph`, `letters`, `garble` and `label-no-number`, per page. It decides nothing about data (D125). |
| `lib/html-text.mjs` | A data sheet that is a web page read into the same lines and columns a PDF reads into: tables (colspan and rowspan expanded), definition lists, grids of label/value blocks, and the product data a page carries as JSON-LD, Shopify product JSON or `__NEXT_DATA__` (reader version 5, D125). A page whose table is drawn by script is not run here; `ingest/capture.mjs` renders it, opening its tabs, accordions and `<details>` first. |
| `lib/offers.mjs` | The offers a saved shop document holds, read from its bytes alone: a Shopify catalogue page (with the shop's `/meta.json` for its currency), a product page's schema.org offers, an Amazon page as a browser drew it; and a listing's net mass and diameter from its own words (D113). |
| `lib/comparison-table.mjs` | Reading a one-page comparison table by column heading and row label, and a mark drawn in a cell by its fill colour: how m150 proves each guide cell stands where its Locator says (D88). |
| `lib/nanovia-tabs.mjs` | Nanovia's tensile tables, one tab per raster, read from the page's own hash-checked bytes (m155, m167, m168). |
| `lib/source-edits.mjs`, `lib/sweep-shared.mjs`, `lib/read-proposals-apply.mjs`, `lib/profile-settings.mjs`, `lib/coverage-clause.mjs` | What a migration builds on: a measurement corrected against its source with the value it replaces named (`correct`, `addValue`), a quote checked on its cached sheet (`onSheet`), the page-read path's proposals applied quote by quote (`applyProposals`), a profile's typed cells read again from its raw cells (`retype`, `typedOf`). In `scripts/migrate/` until 2026-10-15, when living code stopped importing run-once migrations (D138). |
| `lib/frozen.mjs`, `lib/generated-mark.mjs`, `lib/status-counts.mjs` | A round's frozen list written once and refused a rewrite unless `--refreeze` (`writeFrozen`); the mark a generated audit document opens with; the counts the README status block and the snapshot share. |
| `audit/coverage-campaign-status.mjs` | `npm run audit:coverage-status`: the coverage campaign's generated status page, from the build, its frozen targets and the approved outcomes; `--check` in `verify` (in `verify:fast` until 2026-10-15). |
| `round-close.mjs` | `npm run round:close`: what a closing round leaves open (migrations not yet in `archive/migrations/`, packets and proposals not yet in the store), the generated documents' checks, and what changed in the frozen estimate stage and text reader; `--archive` moves the round's migrations and re-points their imports, and `checkImports` resolves every archived import to a file and an export (D138). |
| `data/packets.mjs` | `npm run packets`: a round's working files to the private evidence store and back. `--manifest` says what would move and why each kept file stays; `--export` copies, reads each copy back and writes the round's `PACKETS.md` and `PACKETS.csv` (size, SHA-256, last commit) and re-points links, and with `--remove` takes the copies out of git; `--verify`, `--restore`; `--check` in `verify` (D138). `ingest-2026-09-18` is the import pipeline's proposals, read from `.cache/proposals`. |
| `docs-links.mjs` | `npm run docs:links`: every relative link and anchor in the tracked Markdown resolves (GitHub's slugs, `<a id>`); `rewriteLinks` re-points a moved file's links. In `verify`. |
| `docs-open-problems.mjs` | `npm run docs:open-problems`: the counts at the head of `docs/OPEN-PROBLEMS.md`, from `docs/open-problems-queries.json`; checked by `round:close`. |
| `docs-decisions.mjs` | The index at the head of `docs/DECISIONS.md`: every decision, its line in plain words, and whether it still holds; a decision that holds in no part is in `docs/DECISIONS-ARCHIVE.md`, and its row links there. |
| `docs-status.mjs` | The plain-language status block in `README.md` ("Where things stand"), its numbers from the build; `--check` in `verify:fast`. |
| `docs-history.mjs` | `npm run docs:history`: the Historical record, Current or Generated mark every Markdown file under `docs/audits`, `docs/background` and `archive` opens with; `test/docs-history.test.js` fails on a file with none. |
| `verify.mjs` | `npm run verify`: every step before a commit, each step's time and the total, the failures listed at the end. |
| `data/new.mjs`, `data/retire.mjs`, `data/records.mjs` | `npm run data:new`: a complete new row (next ID, template, missing states); `npm run data:retire`: a grade retired with every dependent record listed; `records.mjs` holds both, and `moveGrade`, which moves a product and every record filed under it to another material (D86). |
| `data/lint.mjs` | `npm run data:lint`: quality findings (`build/src/lint-rules.js`) against the reasoned baseline `data/review/accepted-findings.csv`; `--accept` also accepts per-record build findings. |
| `data/review-findings.mjs` | The per-record build findings (EST-OUTLIER, EST-WIDE, EST-FAMILY-ORDER, NO-MEASUREMENTS) a reviewer must fix or accept; `audit-data.mjs` checks them (D57). EST-THIN is informational and is not among them (D73). |
| `audit/source-completeness.mjs` | `npm run audit:sources`: every PDF source re-read for values and properties the tables lack. |
| `audit/context-witness.mjs` | `npm run audit:context` (in `verify`, where the text cache is): each value's own line on its cached sheet against its row (direction, notch, bound sign, test temperature, standard), every page statement no `page_context.csv` row carries, and every print setting the import's own sheet reader (with `guidanceBeyondLabels`) finds on a profile's sheet that the profile does not hold or holds in part, read block by block so a sheet's test-bar settings are never taken for guidance; a held setting its sheet prints only under a test-bar or pellet-processing heading; and guidance on a sheet whose profile says it prints none (D116, D119, D120). It also finds a product's own sheet that prints a print-settings block no profile of the product holds (CONTEXT-PROFILE-UNRECORDED, D125); a page that speaks for three formulations or more is left to its products' own sheets. Its baseline is `data/review/context-witness-accepted.csv`, each finding with a reason. |
| `audit/reader-recall.mjs` | `npm run audit:reader-recall` (not in `verify`; needs the text cache): every cached sheet read by the import's sheet reader with the reading-order view off and on, and what the second view adds, per print setting and property, into `build/reports/reader-recall/` (D125). |
| `audit/refresh-html-cache.mjs` | `node scripts/audit/refresh-html-cache.mjs`: the cached web-page texts read again from their hash-checked bytes after a reader version bump; it fetches nothing and writes no table. |
| `audit/profile-marks.mjs`, `audit/profile-marks-detect.mjs` | `npm run audit:profile-marks` (not in `verify`; needs the text cache): every line of a profile's cached sheet where an error could hide (a setting-like number or statement no profile holds, a held number found only under a test-bar heading or beside another setting's label, a cell not printed as one run of words, two profiles of one product that disagree), grouped by template, into `build/reports/profile-marks/marks.csv`. A reading aid for layouts `audit:context` has not seen (D120). |
| `audit/blocking-gaps.mjs` | `npm run audit:gaps`: what keeps a material from an answer in each template, and what could turn one, into `docs/audits/2026-09-25-re-center/BLOCKING-GAPS.md`. |
| `audit/scenario-gaps.mjs` | `npm run audit:scenario-gaps`: every product one fact from an answer in the templates and the acceptance questions, with the work that would settle it and when to stop (F08), into `docs/audits/2026-09-27-v2.1-review/SCENARIO-GAPS.md`. |
| `audit/witness-binding.mjs` | `npm run audit:witness`: the evidence binding (D97) asked of the rows already recorded, into `docs/audits/2026-09-27-v2.1-review/WITNESS-BINDING.md`. |
| `audit/duplicates.mjs`, `audit/leverage.mjs`, `audit/table-detectors.mjs` | Run by hand (check round 3, D131): one product held twice, rows on another product's grade and densities out of range; which values and print cells a misreading would turn into another answer; and words in the wrong column, a negation read as positive, a rule reaching too far. Each writes under `build/reports/`. |
| `audit/know-how-worklist.mjs` | `npm run audit:know-how`: the maker-site search worklist, every product whose documents were read for makers' know-how and said nothing, into `KNOW-HOW-WORKLIST.md` beside it; `--check` fails if it is stale. |
| `audit/spot-check.mjs` | `npm run audit:spot-check`: a fixed, seeded sample of what the page shows, for a person to check against the source page, into `SPOT-CHECK.md` beside it. |
| `audit/decisive-sample.mjs` | `npm run audit:decisive-sample`: a seeded sample of the measurements the passing products' verdicts cite, state by state, for a person to check role by role against the hashed page, into `docs/audits/2026-09-27-v2.1-review/SPOT-CHECK-DECISIVE.md` (F15). |
| `doctor.mjs` | `npm run doctor`: what this checkout can run (Node, both dependency groups, Chrome, the hooks, the cached sources) and what each missing piece needs (F17). |
| `audit/rule-vs-hand-picks.mjs` | The product rule against the retired hand picks, from their archive, into `rule-vs-hand-picks.md` beside it (D83, m137). |
| `audit/final-round-sample.mjs` | A seeded sample of the rows phase 6's final round wrote, each checked again on its cached page. |
| `build-diff.mjs` | `npm run build:diff`: builds HEAD (or `--ref`) in a temporary worktree and the working tree, both without the material pages, and prints every difference in `dist/db.json`. |
| `data/db-diff.mjs` | Every difference by path between two `dist/db.json` files (`--summary` groups them); what `build-diff.mjs` prints with. |
| `ensure-db.mjs` | Runs `npm run build` before `npm test`, so the database tests read current inputs. |
| `snapshot.mjs`, `ui-probe.mjs`, `lib/page-products-check.js` | `npm run snapshot`, `npm run ui:check`: the committed review snapshot and interface views; the snapshot's `pages.csv` and the probe's `50-page-*` views are the material pages' (`--only pages` runs those alone), and `page-products-check.js`, evaluated inside a page, sorts, searches, toggles and pages its Products table as a reader would. |
| `lib/run-steps.mjs`, `scale-budget.mjs` | How `verify` and `verify:fast` run their steps, side by side or one at a time, and print the table (`runGraph`, D144); the scale check's timings judged against their budget, last in `verify`. |
| `pages/render.mjs` | `npm run pages -- M020 M001` (or `--all`): renders material pages into `dist/materials/` while their design is worked on, after emptying it: the named materials only (or all with `--all`), so `npm run build` comes before `pages:check`; the build's stage 8 writes them all. A page's written summary is the database's (`materials[].written`). |
| `pages/fields.mjs`, `pages/page-text.mjs`, `pages/add-summaries.mjs` | The written summaries' tools (D142): `npm run pages:fields -- <id>`, every field a material's summary can fill with the value the build would put there, and what it refuses, asked of `build/src/written.js` itself; `npm run pages:text -- <id>`, the page the build wrote as text, section by section; `npm run pages:add-summaries -- <file.csv>`, a file's rows into `material_summaries.csv` through table-io, all or none (`--revise` replaces, naming the cells it replaces; `--check` writes nothing), a material with no page, a placeholder the build refuses or a lint finding refusing the file. `pages/lib.mjs` holds what they share. |
| `pages/subset-fonts.mjs` | Run once: downloads Inter and Newsreader, checks their SHA-256 and their licence (SIL Open Font License 1.1, no Reserved Font Name), subsets them to what the pages use and writes `app/pages/assets/fonts/` with `FONTS.md`. |
| `ui-fuzz.mjs` | `npm run ui:fuzz`: seeded random scenarios through the built page in headless Chrome, in every Strict/Explore/estimates setting, table and chart compared with the engine in Node (D57). |
| `docs-rules.mjs`, `docs-dictionary.mjs` | `docs/RULES.md` from the rule catalogue; `docs/DATA-DICTIONARY.md` from the schema. Both are checked by `verify:fast`, with the decisions index. |
| `data/diff.mjs`, `data/diff-lib.mjs` | `npm run data:diff`: a record-level changelog between two versions; `--fail-on-removed` refuses a deletion that `data/review/removed-records.csv` does not name. A keyless table's declared `identity` and `replacedWithin` make a re-pointed citation an edit. It replaces hand-written audit changelogs. |
| `trace.mjs` | `npm run trace`: a headline back to its measurement, grade and source, with file and line; `--scenario <file> --product <GradeID>` one decision as the page makes it, with its states, requirements and the records each rests on (D105). |
| `bench.mjs`, `verify-fast.mjs` | `npm run bench`: the build cold and warm by stage, peak memory, sizes, each template's selection, and `--growth` for the largest chemical group (`build/reports/bench.json`). `npm run verify:fast` runs its steps timed against the 90 s budget (D105). |
| `data/synthesize.mjs` | A multiple of today's data under new IDs, for the scale test. |
| `data/export-xlsx.mjs` | The read-only review workbook. |
| `migrate/` | An open round's source corrections and table changes; each names the value it replaces through `lib/source-edits.mjs`, so a re-run is a no-op. Its README is the template. `npm run round:close -- --archive` moves a closed round's migrations to `archive/migrations/` (m10 onwards, each run once and kept as the record) and re-points their imports. The 2026-09-14 workbook conversion (m01 to m09, its ledger and replay) is in `archive/workbook-conversion/`, which no longer runs: the workbooks were deleted with the cutover. |
| `audit-data.mjs` | Reproducible source-to-HTML verification and record inventories, and the review of per-record build findings. |
| `data/sqlite.mjs` | `npm run db:sqlite`, `npm run sql -- "..."`: the compiled database as a SQLite file with the schema's types, the compiled headlines, and a robust z-score per measurement against its material's others (`v_measurement_z`, D75), stamped as one generation (`_generation`, `_tables`, D105). |
| `data/source-store.mjs` | `npm run data:sources`: every registered source's cached bytes and text, listed (`--manifest`), backed up by digest (`--export`), restored only where they hash to a registered digest (`--restore`); it never fetches (D104). |
| `data/record-tier.mjs` | The record tier in the same file (D85): `source_facts`, the lines the import reader read without them becoming data, and `documents_fts`, a full-text index of the cached documents and of the optical readings of pages whose text layer is broken (`view`, D136; built only where `.cache/text` is present). |
| `ingest/` | The import pipeline: fetch, extract, propose, review, batch, apply through a migration, and the generated STATUS, BLOCKERS and READINGS. Its proposals are in `.cache/proposals/` (`context.mjs` names the path; the 2026-09-18 import's are restored there from the private store with `npm run packets -- --restore ingest-2026-09-18`, D138); the ledger of every document, STATUS, BLOCKERS and READINGS stay in `docs/audits/2026-09-18-v2-import/`. `second-read.mjs` draws an independent sample and keeps the findings register (R085, R165). `witness.mjs` records a maker's page beside a sheet, fetched, or staged from the copy its reader saved (`--from`, checked against the digest recorded when it was read). `prices.mjs` is the one way a price enters: shop pages captured and hashed, the reviewed listings proposed, and a guarded apply (D113; sellers and batches in `archive/ingest-2026-09-18/prices/`). `context.mjs` names every live path (`H2C_INGEST_ROOT`, `H2C_PROPOSALS`, `H2C_DOCUMENT_CACHE` move them); `fetch.mjs` bounds each request and journals each finished document (D104). `quality.mjs` and `ocr-pass.mjs` flag pages whose text is not a reading of them and read them optically into a sidecar (`.cache/ocr-text/`) beside the text layer. `read-packet.mjs`, `read-reconcile.mjs` and `read-proposals.mjs` (with `read-common.mjs`) are the path on which a model reads page images: a packet per document, each reading checked against the text layer, the reading-order view, the ligature-repaired view and the sidecar, and proposal files that `lib/read-proposals-apply.mjs` (`applyProposals`) writes through a migration, quote by quote (D125). The rules are in `docs/IMPORTING.md`. |

`npm run verify:fast` runs format, schema, lint, generated docs, build and tests while you work, and prints each step's
time against the budget: about 80 seconds after a data change and about 45 when nothing the build reads changed (GOALS C13)
(`npm run bench` measures the parts), because the build result is cached by content
(`build/src/build-cache.js`, `.cache/build/`); its budget is 90 seconds (docs/GOALS.md). The import pipeline's tests
run in `verify` (`npm run test:ingest`), not here, to keep `verify:fast` within its budget.
`npm run verify` adds the import tests, the coverage campaign's page, the audits (`audit:data`, and `audit:context` where
the text cache is), the review snapshot, the material pages against the build (`npm run pages:check`), the link and packet
checks, interface views (the selector's and the material pages') and 300 rendered scenarios, and the
scale and reproducible-build checks (`npm run scale`, `npm run reproducible`), before a commit. Both scripts run every step even when one fails and list the
failures at the end (`scripts/lib/run-steps.mjs`), so one run shows everything that is wrong. The steps that do not need
each other run side by side, each printed whole when it finishes (D144): the documents' checks while the build runs, the
audit, the snapshot and the views beside the tests; the import tests after the unit tests, the timed scale check alone after every other step, the
reproducible-build check alone after it (it rebuilds `dist/`), and the scale budget judged last. `--serial` runs one step at a time. The
pre-commit hook (`npm run hooks` installs it) runs the data checks on any commit touching `data/` or
`schema/`, CI runs `verify`'s data group, its views and its rendered scenarios in three parts side by side on every push
to main and on pull requests, and its
scale and reproducible-build checks and 2,000 rendered scenarios on a new seed every week, and
`npm run build:diff` shows what a change did to the compiled database. `AGENTS.md` is the editing guide.

### Engine, `app/js/engine/`

| Module | Responsibility |
|---|---|
| `constraints.js` | The four-state evaluator, the unknown-data policies, ranked exclusions. The heart of the tool. A product is judged in each state the scenario permits and answered by the best (D99); its environment, stock, exact-grade and conflict criteria read its own records (D98); a material passes on one product, is unknown while one is unresolved, and fails only when all fail (D100). A numeric requirement is answered in one order (D153): does not apply; the product's own value measured the way asked, which always wins; what the evidence ledger bounds it to; the estimate, which never decides; the rest. Each product's answer carries its own results and records. One rank (`compareGroups`) sorts what is unresolved by what would settle it (D155): it picks a product's state and the product that represents a material, whose group (meets, one check away, not enough data with its likely tag, unlikely to meet, hidden, fail) and reason (`groupReason`, naming that product and its numbers) are the material's; a measured miss no product meets makes a material unlikely to meet. A presentation of the verdict: it moves none. |
| `ledger.js` | The evidence ledger's arithmetic and words (D153, D154), shared with the build: the intersection of the contributions a reader admits (a deciding row's, at the comparable level unless the reader admits values published without their direction or load), and the reasons a ledger answer gives. |
| `products.js` | A material answered by its products (D83): a product view (the material with one product's values, recipe and offers, in one of its states), which `evaluateProducts` in `constraints.js` judges on every requirement at once. `scenarioStates` says which states a scenario permits (as printed; annealed where permitted; dry or conditioned), and `stateOf` reads a named state back without borrowing another: one a product does not publish holds no values (D107). Used when the context carries `productsByMaterial`; the page does from re-center phase 3. |
| `indices.js` | The Ashby performance-index library, their slopes, geometry and caveats, the line on direct or swapped axes, and the one ranking every lens reads (`rankingFor`, D102): candidates by their passing products' own index, in the states they pass in (D107). |
| `workspace.js` | The Ashby decision workspace's one model (D107): each product in the state its answer is in, both coordinates from that state (a derived cost per volume from its own price and density), its bucket (confirmed, unresolved, failed), the gaps and why, the line's count, the front, material ranges (the middle half of its own products, variants apart, D108) and estimate context. The chart, its list, the inspector and the exports read it. |
| `pareto.js` | Non-dominated sets over the current candidates and axes. |
| `coverage.js` | What the database knows and does not, per material and per domain. |
| `scenario.js` | The user's question, serialised: shareable link, saved file, user assumptions, the states it permits (D99), its chosen products and their test results (D103), its goal and chart view (version 2, D107; version 1 migrated; objective stages saved before D108 read as a line position), and the release it was answered on (D96). Validation leaves out, with a warning, what the build cannot evaluate, and warns when a scenario is reopened on another release. |
| `search.js` | Catalogue search, by a material's own words and its products' makers and names. Its own module because the obvious implementation matches "PLA" inside "thermoplastic". |

### Interface, `app/js/ui/`

| Module | Responsibility |
|---|---|
| `registry.js` | Builds the interface's property definitions from the database's registry at start-up: labels, filters, axes, table columns, export headers and the drawer's property tabs, from the selectable headlines; the drawer's comparisons read every headline, the drawer-only ones too (D139). |
| `labels.js` | The single vocabulary. What every property, criterion, gate verdict and chamber statement is called, in plain words with the technical name behind it. Nothing else names them. |
| `format.js` | The single place a value becomes text. Owns the visual distinction between measured, related and estimated, and never rounds a value across a requirement's threshold (D54). It also holds a published bound's sign before a median (`boundSign`, `medianSign`, so every table and figure prints "> 200 °C" as the key properties do), the price sample's one sentence (`priceSampleSentence`), and the family colours: the palette in one place and one call, `familyColors`, read by the Ashby chart, its work views and Parallel lines, so a family is one colour in all of them and no family takes the accent blue (D147). |
| `popover.js` | One explanation popover for every mark whose meaning is more than its glyph: each such mark is a button (`explainButton` in `format.js`) that opens it, from touch and keyboard too, never a title alone (D61). |
| `filters.js` | The requirement rail, including the data-availability line under every control. |
| `table.js` | The results grid and the client-side exports: the candidates with their rank (D102), best product and state; the products with each one's verdict, state and what it is not settled by. Under Include the grid is one table per group (D155), in the engine's order, "Unlikely to meet" folded; an unresolved row's reason and its estimate on a required number are its deciding product's. |
| `ashby.js` | The Ashby lens (D107 to D112): lays the lens out and keeps the reader's place through each redraw, wires every control and the More menu (`wireControls`), and draws Material typicals (one dot per material at its products' median datasheet value, which says so, `typicalNote`, D112) and the two test-pair views: published values, state-independent. |
| `decision.js` | The Ashby lens's work views (D107 to D111): Products and Material ranges, drawn from `workspace.js`; the question bar and the starter; the Draw, Also and Line rows, More, and the axis bar; the pills that say what narrows the chart; the result list and what it remembers (`listUi`), and the details that replace it (D110); the key and the reading note; and the chart's data and image exports. |
| `chart.js` | What every Ashby view shares: one rule for the chart's size and legend (`lensChartSize`, D111), one resize listener, label placement, axis ranges, readable Log ticks (`logTicks`, D111), the reader's zoom kept across redraws (`zoomMemory`, D109), and the requirement, reference and familiar-filament overlays. |
| `axes.js` | The chart's axes from the registry, which measurements an axis may draw, and whether two may share a strict evidence point (`pairCompatibility`, D107). |
| `parallel.js` | Parallel coordinates, hand-drawn in SVG: each line's result as the Ashby chart draws it, each requirement across its axis as Compare draws it, the opening axes from the requirements (`openingAxes`), names on a set of 15 lines or fewer, and the selection the lenses share (D147). |
| `heatmap.js` | The coverage lens. |
| `compare.js` | Up to six shortlisted materials side by side, or one against a familiar baseline, with their measurement conditions, and the passing products' own print gates beside the material's window. |
| `detail.js` | One material's complete record. Its Products tab opens on the products that pass, each with its state, what is not settled, its recipe and its values, and a Choose button (D103). Its Mechanical and Thermal tabs draw the comparison headings in the place of the first property each reads, and its Printing tab opens on the print temperatures, a product per dot (D133, D139). |
| `print-spread.js` | Each product's lowest and highest print temperatures, as its print gate reads them, and their medians: the Printing tab's heading (D139), worked out on the page and deciding nothing. |
| `explain.js` | Why the list is what it is, ranked by what each criterion costs, and the zero-result screen, which tells all-failed from none-confirmable; and the product a material's *Your requirements* lines are one product's (`shownProduct`), which the drawer's Products tab lists first (D147), said with why it was chosen ("Shown for one product, X", D155). |
| `start.js` | The opening panel, and the compact active-requirements header that replaces it: the answer, the requirements, how products are judged and what annealing would add (D99), the "H2C printability not checked" line, the notes one press away. |
| `templates.js` | Application templates. They populate controls and then get out of the way. Every one asks the H2C's print gates (`PRINTABLE`, D101). |
| `brief.js` | A chosen product's decision brief (D103), written from the engine's own answer; it names the material page and the product's card on its Products page (`page-rule.js`, D147). |
| `material-facts.js` | One material's facts as the drawer and the material pages show them (`materialContext`: selected, counted, grouped, summarised), before any markup or sentence, so the two renderers never disagree; and the one rule for reader text (`readerText`, `readerNote`, `readerGap`, `GAP_DOMAIN_WORDS`, D146), so both leave the maintainers' notes behind an ID mark, and for a known gap shown and counted (`shownGap`, D147). Its API: `docs/audits/2026-10-16-material-pages-round/FACTS-API.md`. |
| `material-words.js` | The sentences the drawer and the material pages share, as plain text, unescaped: each renderer escapes them; among them what an exposure's statements say, counted (`statementVerdictWords`), and the H2C's limits as one list (`h2cLimitsText`, D147). |
| `material-stats.js` | Display statistics only the material pages draw: the alternatives (`peerSet`), one scale per property (`propertyScale`) and the maps' fixed frames, how many products accept each print temperature (`printWindows`) and the window a page states (`typicalWindow`), what a product keeps across the layers, the heat ladder. Pure data; it decides nothing. |
| `material-highlights.js` | What the pages single out, from compiled fields: the six key figures (`KEY_FIGURES`), the evidence tier, the products well above the rest and the product holding the highest or lowest value of each key property, where a material stands among the others, and the windows, drying and Z shares a summary may name (`build/src/written.js` reads the same functions). Display only. |
| `print-brief.js` | *On the H2C* in brief (`onTheH2cRows`, D146): each print setting as most products give it, with who gives it; the drawer's Overview and the material pages' plate and settings table print it from here, so the two give one window per setting; and the line on settings beyond the H2C's limits (`beyondLimitsLine`, D147). |
| `display-numbers.js` | Numbers as a reader's view prints them (`fmtDisplay`, `spanDisplay` and their unit forms, D146): the material pages, the drawer's key figures and its comparison and print tables. The table and every record keep `format.js`'s forms, which the page-against-engine check reads. |
| `scales.js` | The one scale rule for a row of values drawn product by product, read by the drawer's comparison headings and print temperatures and by the pages' figures. |
| `text.js` | Plain-text helpers every sentence is put together with (a count with its noun, a list in prose, whether a cell states anything), imported by `labels.js`, `material-words.js` and `material-facts.js` alike. |
| `page-rule.js` | Which materials have a page of their own (`PAGE_RULE`, `pageOf`; D142): read by the build's stage 8, the drawer's Full page link, the pages' index, the README's status line and the tests; and a material's Products page and a product's card on it (`productsHref`, `productsPageOf`), read by the pages, the drawer's link to a product's card and the decision brief (D147). |
| `dates.js` | Dates as a person reads them, "13 Sep 2026" and a span "10 Sep–7 Oct 2026" (`dayWords`, `daysWords`), when a set of documents was read (`documentsRead`), and the provenance line the selector's status bar and every page's closing line print (`provenanceWords`, D147). ISO dates stay where a machine reads them. |
| `say.js` | Sentences with their numbers marked (`say`, `num`, `joinSay`, `andSay`): the plain words for the drawer and the same words as markup for the pages, each compiled value wrapped so `pages:check` can hold it to the facts (moved from `app/pages/findings.js`, D147). |
| `evidence-line.js` | How well documented a material is (well, partly or thinly documented, and why), and what a key property's figure is (`keyFiguresBasis`): the drawer's On file line and the page's evidence line from one function (D147). |
| `product-order.js` | The order a material's products are listed in when nothing else is asked, most documented first (`mostDocumentedFirst`): the Products page's opening order and the drawer's passing products, so the two surfaces put the same product first (D147). |

The shared design tokens (the palette light and dark, the status colours, the three radii, the font stacks, Inter first) are
`app/css/tokens.css`: the selector bundles them ahead of `app.css`, and the material pages' stylesheet opens with them.

### Material pages, `app/pages/`

Run by the build's stage 8 in Node, never in the selector. They read the compiled database through `app/js/ui/`
(the facts, words, statistics and scales above) and decide nothing; `app/pages` is outside the release's inputs (D96), so
a change to the pages' design is not a new release (D142). So are the interface around the engine (`app/js/ui` but
`templates.js`) and `app/css`: `RELEASE_INPUTS` in `build/src/release.js` names the tables, the schema, `build/src` and
`build/mappings`, the engine with the templates, and the locked dependencies, and `test/release.test.js` asserts that the
engine and the templates are in and the rest of `app/` is out.

**Kept from disagreeing.** The drawer and the pages are two renderers of one set of facts. Which records, in which
order, counted how, drawn or not and why is chosen once, in `material-facts.js`; the shared sentences are
`material-words.js`, which takes every word for a stored code from `labels.js`, with the sentences whose numbers the
page marks (`say.js`), the evidence line (`evidence-line.js`), the dates and the provenance line (`dates.js`) and the
products' order (`product-order.js`) beside it, each moved out of `app/pages` so the drawer prints the same words
(D147); numbers become text in `format.js`; the scales are `scales.js`. A number the build does not hold is compiled in
`build/src/`, where the contract checks it and the drawer can read the same field, never worked out in a page alone
(`written.js` fills a summary's numbers so). The guards: `test/material-facts.test.js` holds the contracts the two share
against the rendered drawer (the context, the tab counts, the page rule, the scale rule, a product's name, the rank
table); `test/material-stats.test.js` holds each page-only statistic to the compiled fields;
`test/drawer-comparisons.test.js` and `test/print-spread.test.js` hold the drawer's comparison headings and print
temperatures to the build; `test/summaries.test.js` holds the summaries' fill; and `test/pages.check.js` (`npm run
pages:check`, in `verify` after the build: P1 to P3 and P5 to P14, REC and IX; P4, the rank tracks, and CNT went with
the old pages) holds every number and figure mark on every page to the database it was rendered from, every record to
exactly one place across a material's Overview and Products page, the ways back to the selector, and the drawer's Full
page link to the page rule (P13).

| Module | Responsibility |
|---|---|
| `render.js` | `renderSite(db, env)`: for every material the page rule admits, its Overview (`<id>.html`), its Products page (`<id>-products.html`) and the stub at its old records address (`<id>-records.html`); the index, the method page and the shared assets, as text, from the database alone. No file is read or written (it sets the ui modules' registry and baseline, as the selector does at start). `pageEnv` makes its env (lookups, every material's medians, the stamps, the selector's file name). |
| `stage.js` | Node only: stage 8. The build cache, the write to `dist/.materials-<pid>/` and the rename into `dist/materials/`, the budgets, and the digest the manifest records. |
| `read-assets.js` | Node only: reads what the shared assets are made of (tokens, stylesheets, scripts, the faces, the licences) for `buildAssets`. |
| `shell.js` | The document around every page: head, the sticky bar (the mark and *Materials* to the index, the material, the section in view with the list of sections, *Back to your results*), the tabs, the main element and its stamps, and the footer band set after it on every page kind with its closing line (`siteFooter`, `signOff`, D147). |
| `sections/` | The Overview's sections, in reading order (`SECTIONS` in `sections/index.js`); each is `{ id, title, render(c, env) }`, returning `{ html, empty, stats }`; an empty one leaves the page silently. `masthead.js` holds the first screen (the name and tabs, the six key figures, the summary with the evidence line beside *On the H2C*), `footer.js` a material page's footer (its summary's authorship and citation, in `shell.js`'s band). |
| `products/` | The Products page: the list, its search and sort, and each product's card with every record of that product (`card.js`). |
| `records/` | What the cards reuse of the retired records page (`common.js`, `measurements.js`), and `placement.js`: where every record of a material is shown, and `offThePages`, the records no page shows (the project's own reading of a source, a reviewer's note among the environment statements, a coverage note that is not a known gap a reader is shown). |
| `method-page.js`, `index-page.js`, `stub.js` | *How the numbers are worked out*, written once; the index of materials by family, with one search; the redirect at each old records address. |
| `charts/` | The five figures (`peers.js` against the alternatives, `map.js` among all materials, `strips.js` the products per section, `layers.js` across the layers, `temperatures.js` every temperature on one axis), the key figures' small drawing (`mini.js`), and their grammar: scales, marks, axes, the frame with its table twin (`figure.js`, `kit.js`, `marks.js`, `scale.js`). |
| `figures.js` | What the figures draw, as configuration: the alternatives' columns (`PEER_COLUMNS`), the maps (`MAP_PANELS`), each section's strips (`STRIP_SETS`) and the one rule for a strip (`STRIP_MIN`, `inStrip`), the layer pairs (`LAYER_PAIRS`), the ladder's extra rungs (`LADDER_EXTRA`); and the figure functions, re-exported. |
| `findings.js`, `numbers.js`, `html.js` | The page's own sentences (the drawer's are `material-words.js`; *On the H2C*'s rows are `app/js/ui/print-brief.js`'s, and the sentence machinery, the evidence line and the dates `say.js`, `evidence-line.js` and `dates.js`'s, re-exported, D147); numbers as the pages print them (`numbers.js` re-exports `app/js/ui/display-numbers.js`: three significant figures, whole degrees, a no-break space before the unit); markup helpers. |
| `budget.js` | What an Overview (also the index and the method page), a Products page, a stub, the stylesheet, the script and the set may weigh (`PAGE_BUDGET`: `main`, `products`, `records`, `css`, `script`, `set`). |
| `tables-asset.js`, `assets/` | The stylesheet sources (`frame.src.css`, `sections.src.css`, `figures.src.css`, `products.src.css`), the classic scripts (`page.js`, `products.src.js`) and the embedded faces with their licences (`fonts/`, `FONTS.md`); `tables-asset.js` ships both scripts without their comment lines and indentation (`productsScript`, `pageScript`), which keeps `page.js` within the script budget (D147). |

## State

`main.js` holds one state object. The interesting parts:

- `scenario` — the user's question. Serialised into the URL and into saved files.
- `selection` — the engine's answer, recomputed whenever the question changes.
- `rows` — what the current lens should draw: the evaluations whose verdict the status chips admit,
  narrowed by search and by any lasso subset.
- `showStates` — which verdicts the table shows. Derived from the policy by `defaultShowStates`,
  which exists in exactly one place so the boot path, the mode buttons and scenario import cannot
  drift apart. They did once; a shared Explore link rendered as Strict.
- `searchExcluded` — search hits that the current requirements removed. Search runs over the whole
  database, so "no results" never means "not in this database" when the material is simply failing
  a criterion.
- `baseline` — the familiar material drawn beside the results. A reference, never a candidate: it
  is not in `rows`, not in the counts, and not on the Pareto front.
- `highlightMeasurement` — the measurement the reader clicked through to, so the drawer can scroll
  it into view and mark it rather than opening a list of twenty-one.

Every lens draws from the same `rows`. Switching lens never changes membership.

## Adding things

**A new material.** [WALKTHROUGH-ADD-A-MATERIAL.md](WALKTHROUGH-ADD-A-MATERIAL.md) chains the AGENTS.md
recipes once, with a real product, from the source row to the commit.

**A new table.** Its schema in `schema/tables/<name>.schema.json`, and the places the build learns about it, in the
same commit: `TABLE_ORDER` (`build/src/schema.js`), `TABLES` (`build/src/load.js`) and, if it holds free text,
`TEXT_TABLES` (`build/src/lint-rules.js`); `inputs` in `build/src/source.js` follows `TABLES`. A table missing from
`TABLE_ORDER` sorts to the front of the review workbook. If it is a child of a per-material table, add it
to `scripts/data/synthesize.mjs` too, or the scale test loses its rows. `reference_envelopes` (m42) and
`profile_notes` (m44) are the two worked examples.

**A typed column beside raw text.** The raw column keeps the source's words; the typed one is what the
build reads; a reader in `build/src/normalize/` says what the words plainly mean, and `typed-values.js`
stops the build where the two disagree with no Parse review (D49). Use it wherever a decision would
otherwise be read out of prose on every build. Moisture state and Post-processing state (D68), Anneal °C and Anneal h
(m30), Standards (D76) and Test temperature °C (m175, D92) are examples.

**A new lens that draws numbers.** Decide what it does with an estimate before you write it. Three
lenses drew only measured headlines and silently dropped a quarter of the candidates; an estimate is
a range, so it is drawn as a range, counted where it cannot be drawn, and never allowed to dominate
a measured value.

**A new measured property.** A row in `data/tables/properties.csv` (domain, units, and "Applies to"
if it only means something for some filaments), then its measurements. It appears in the drawer's
tab for its domain, counts as coverage evidence, and is checked for unit and applicability. No code.

**A new selectable property (headline).** A row in `data/tables/headline_definitions.csv`; each product's
value is then chosen from its measurements by rule, and each material shows its products' spread. The filter rail, charts, table, export,
drawer and engine pick it up from the registry (a row that is Drawer only reaches the drawer alone, D139); materials outside "Applies to" show it as not
applicable with the reason. `test/new-property.test.js` does exactly this for an elastomer-only
rebound resilience (Shore A and Shore D hardness, the real case, are rows since D150). Only estimation needs code: mark it Estimated only after adding `HEAD` (`estimate/model.js`) and `kindOf`
(`estimate/observations.js`) cases and its scale, floors, precision thresholds and conversions in
`build/mappings/estimate-model.json`; the build refuses the flag otherwise, and the calibration check
says at once whether the model holds.

**A new constraint kind.** Add a branch in `evaluateConstraint` and a matching control. Return the
same result shape, including `criterion` and `reason`, or the explain panel will have nothing to
say. Then add a case to `describeConstraint` in `ui/labels.js`: that function is what the pills, the
explain panel, the why list, the excluded-search group and the CSV export all use, and a missing
case is how an internal key reaches the screen.

**A new gate verdict.** Add it to `GATE_PRECEDENCE` in `build/src/gates.js` (how a material's profiles are ranked);
give it a status in `GATE_STATUS` in `app/js/engine/constraints.js`, which is what `evaluateGate` answers and what its
chip is coloured by; and give it its words (`word`, `short`, `against`) in `GATE_VERDICT` in `ui/labels.js`, which the
table, drawer, Compare and decision brief read. `test/gate-verdicts.test.js` fails until the four, and the compiled
contract's enum, are the same set, in the same order. `within-low-end` and `edge` were the last added, replacing
`partial` (D151), with the page's lists of products beyond the H2C (`print-spread.js` OUTSIDE), the rail's caveat and
the validation report.

**A new word for something.** It goes in `ui/labels.js` and nowhere else. Environment category names
are the exception, and only because they belong with the topic rules: they are authored in
`schema/vocab/environment-categories.csv` and `environment-topics.csv` and compiled into the snapshot, so the engine can name a
category without importing anything from `ui/`.

**A new lens.** Add it to `renderLens` in `main.js` and to the lens bar in `app/index.html`. Read
`state.rows`; never re-filter.

**A new section on the material pages.** One file in `app/pages/sections/` (`{ id, title, render(c, env) }`, reading only the material's facts) and one line in `SECTIONS` (`app/pages/sections/index.js`); with nothing
on file it returns `empty` and leaves the page silently (the page says nothing of a section it lacks). A
new property, headline or comparison needs no page code: the pages read the registry as the drawer does. A section
decides nothing, and a number it needs that the build does not hold is compiled (above, "Kept from disagreeing").

**A new figure on the material pages.** A new column of the alternatives (`PEER_COLUMNS`), a map of every material
(`MAP_PANELS`), a property in a section's strips (`STRIP_SETS`), a pair across the layers (`LAYER_PAIRS`) or a rung on
the heat ladder (`LADDER_EXTRA`) is one line in `app/pages/figures.js`; a new kind of figure is a module in
`app/pages/charts/`, drawn with the shared marks and `figure()` so it has a title, a key, a caption and its table twin.
A new kind of record shown on a product's card is written in `app/pages/products/card.js`, and
`app/pages/records/placement.js` says whether it belongs on a page at all (`offThePages`); `pages:check` (REC) then holds
it to exactly one place.

**A new field a written summary can name.** A count or a part of a headline's spread is added in `build/src/written.js`
(`COUNT_FIELDS`, `HEADLINE_PARTS`, and their fill), from compiled values only, never an estimate; `npm run pages:fields
-- <MaterialID>` then lists it with its value. A field a material cannot fill stops the build (SUMMARY-PLACEHOLDER), and
`test/summaries.test.js` guards the fill. The page formats a filled value as its key figures do; the stored part keeps
the raw number.

## The build, stage by stage

*Until 2026-09-25 this was `docs/PIPELINE.md`; it is here so a developer reads one document (re-center phase 5).*

```
npm run verify:fast    while you work: format, schema, lint, generated docs, build and tests
npm run verify         before a commit: verify:fast, the import tests, the campaign page, audit, context audit,
                       review snapshot, the material pages, links, packets, interface views, 300 rendered
                       scenarios, the scale and
                       reproducible-build checks
npm run ui:fuzz:full   2,000 random scenarios through the built page, compared with the engine (weekly in CI)
npm run build:diff     every difference a change made to dist/db.json, against HEAD or --ref
npm run data:check     the schema gate alone, in about a second
npm run build          full build, ending in a distributable HTML file, the material pages and the manifest
npm run validate       stops after the report; writes no dist artefacts
npm test               builds, then engine, data gate, registry, contract, database and interface-logic tests;
                       the import tests (test:ingest), the material pages' check (pages:check) and the scale and
                       reproducible-build checks (*.check.js) run in verify
```

Everything runs from `build/src/index.js`, and every caller (the build, the snapshot, the audit, the trace and the tests)
runs the stages through `build/src/pipeline.js`. The build is deterministic and **fails on any validation
error**, so a database that has drifted cannot reach a distributable file.

---

### Stage 0: Check — `schema.js`

Before anything is read for meaning, every table under `data/tables/` is checked against
`schema/tables/<table>.schema.json`: the columns and their order, each value's type, required values,
the explicit missing states a field accepts, patterns, controlled vocabularies (`schema/vocab/`),
uniqueness, and references between tables, including each item of a list and each grade ID written
into prose. Files must be in canonical CSV form and `data/manifest.json` (row count and SHA-256 per
table) must be current, so a count change is visible in the commit that makes it. Any violation stops
the build with the file, line, record and field. The whole check takes about a second; `npm run data:check` prints
its time.

### Stage 1: Load — `load.js`

Reads the tables into raw row objects, one set per table under the name the compiler addresses it by.
No interpretation happens here: a value is its trimmed text or null, so `"Not published"` and a number
remain distinguishable downstream. Each row carries its file and line for error messages.

### Stage 2: Normalize — `normalize/`

Where the sources' free text becomes machine-readable. This is the largest and most error-prone
stage, and the one the architecture brief does not mention at all.

**Missing states** (`values.js`). Four states that must never collapse into each other or into zero:
not published, insufficient comparable data, not applicable, quarantined. Plus a fifth for price,
where "no price observation in the sampled shops" is a different statement from "not published".

**Intervals** (`values.js`). What a measurement actually asserts: a point, a range, a value plus
uncertainty, or a bound from a `>` or `<` operator. The engine judges a value plus uncertainty on its value and
flags a threshold inside the spread (D54); a range and a bound stay intervals. Unbounded ends are `null`, not `Infinity`,
because this is serialised to JSON and `JSON.stringify` would turn Infinity into null anyway.

**Direction** (`direction.js`). Thirteen spellings onto eleven canonical values. Some are the source's own words rather
than a confirmed build orientation, so `Horizontal (source label)` gets its own value and never merges into XY, in the
engine or in the estimate model (Prusa's sheets, which define theirs, are typed XY and XZ since D143); `Not published`,
`Unstated` and `Stated, not a usable direction` are all unknown to the build, and differ only in whether someone has
read the source. A tensile value a sheet labels only by a ±45° raster is XY (D91); `45/45` is a ±45° bar the sheet
labels beside its own XY bar, and `YX` a flat bar the sheet labels YX beside it (D143), each its own value.
The Method table's rule: an unknown direction is not XY. A locator naming a direction the Direction column does not
record is a lint finding (MEAS-LOCATOR-DIRECTION): 18 Z results coded unknown once skewed every estimate.

**Thermal** (`thermal.js`). About twenty spellings of HDT standard and load, including full-width
commas from Chinese-language datasheets, 1.81 and 1.820 MPa, MN/m², a decimal comma beside the unit, and
ISO 75-2's method letters (A 1.80 MPa, B 0.45 MPa), ASTM D648's psi (66, 264) and kgf/cm² (4.6, 18.5). A text naming
both loads states neither. A load that was never stated stays unstated: the product's value is as published, with
caveat `load-not-stated`, counted apart and deciding only when the reader asks (D84).

**Standards** (`standards.js`). The standards a measurement's Standard / load text names, at family level and one
spelling each: ISO 527-2/50 and ISO 527-1 are both ISO 527, because the part and the specimen speed are conditions of
one test that the row's own columns carry. ASTM designations printed without the body ("D 638") are read as ASTM's.
A text naming none reads as none, which is what a melt-flow condition or a study's own method does. The typed
`Standards` list is what the build reads; this parser checks it (D76).

**Declared states** (`moisture.js`, `specimen.js`). A measurement carries its Moisture state (dry, conditioned,
not-stated) and Post-processing state (as-printed, annealed, not-stated) as typed columns, and each Specimen type
declares a Form (printed, not-stated, moulded, film, filament, off-recipe) in its vocabulary, because those wordings
are the database's own. The build reads the state, never the words. Where the words plainly say otherwise the build stops
(PARSE-MISMATCH); where they say nothing the column decides, so a new datasheet sentence is data rather than a
schema change (D53, D56, D68).

**Typed values** (`typed-values.js`). The parsers above no longer feed compile directly: the typed columns do, and
the parsers check them (PARSE-MISMATCH unless Parse review explains the difference; D49).

**Process** (`process.js`). Temperatures, nozzle diameters, drying schedules, abrasion. Two bugs
here shipped and are now pinned by tests:

- A leading minus in the number pattern made the range dash in `255-275C` read as the sign of -275,
  which failed the plausibility window and collapsed the range to its lower end. Until D141 that window also filtered
  a cell's numbers before the window was read, so `450 - 520 °C` was typed as 450; a plausibility window is now a check,
  never a filter: a number outside it is typed as stated and reported (PROCESS-WINDOW-IMPLAUSIBLE).
- `Room Temp. Annealing temp. and time 100 °C/16H PolyDissolve S1` is a room-temperature chamber
  plus a post-print anneal. Scraping its 100 °C as a chamber requirement wrongly excluded four
  printable support materials.

This stage also distinguishes a **requirement** from a **recommendation**. "Recommended 70-140C if
possible" exceeds the H2C's 65 °C chamber but does not make the material unprintable.

A window whose upper end is beyond the H2C is read by how much of it the H2C covers, on every axis (DECISIONS D151,
which amends D32): 5 °C or more from its bottom is `within-low-end`, a pass; less, only its bottom edge, is `edge`, on
the line; none of it is `exceeds`. A chamber's at-least window ("65˚C+") is read the same way; a nozzle or bed one the
H2C reaches is within.

The chamber has one more answer the other axes do not (DECISIONS D33):

- A chamber answered in words stays words. "Not required" and room temperature are `not-required`;
  "Recommended" with no number is `recommended`; a data sheet's "-" is `no-setpoint`. The Enclosure
  column is parsed too, and "not necessary" there means no heated chamber is needed. An enclosure
  being recommended means nothing about 65 °C, except where a row declares Chamber state `enclosed`: a printer
  maker's guide row (D90), or a maker's own profile for one of the types that guide asks an enclosure for (D93),
  which reads as within (PROCESS-ENCLOSED says where it may be declared).

**Chemical** (`chemical.js`). Environment topics onto canonical categories, via a hand-maintained
vocabulary, `schema/vocab/environment-topics.csv`, that `evidence.Topic` must match, so an unmapped topic fails at the schema gate. `environment-categories.csv` carries
each category's display names, which is why it is the only place a category is named. The evidence runs
two overlapping source vocabularies for the same chemistry, `Resistance to Acid` alongside `Effect
of weak acids`; they merge but keep their strength qualifier, because a source that distinguished
weak from strong said more than one that did not.

### Stage 3: Compile — `compile.js`

Assembles the relational runtime database, and does the one thing that matters most:

> **A number is read from its measurement, never typed a second time, and nobody selects it.**

Each product's value for a headline is chosen by rule from its own measurements (`products.js`): an active numeric
measurement of an allowed property, in the headline's unit, from a printed or unstated specimen (not a bar printed off
the product's recipe, D95), not conditioned, not flagged physically implausible, not annealed where the product
publishes the property as printed, of the headline's notch and at its test temperature where it sets them (D92), to
its standard where it names one and the value names others (D94), and in the headline's direction and at its load
("comparable"), or with either unstated ("as published", D84). The layer strength takes no value whose direction is
unstated: its Unstated direction is `excluded`. A measurement that states no specimen, moisture, treatment, standard,
test temperature or (for a printed bar) direction of its own takes what its page states once (`page_context.csv`,
`page-context.js`, D116, D135). Where a
product has no value of its own and its twin does, it reads the twin's, labelled (D89), its own maker's first (D119). A product's strength taken from a yield or break stress is the greatest of the stress endpoints that one test prints (same source, direction, specimen, moisture and post-processing state, test temperature), because the ultimate strength is the maximum stress; another source's number is another test and is not compared (D126). A material's
headline is its products' spread: the median of their comparable values, their range and count, and the typical
product (D83). `headlines.csv` only pins one product's value where the rule chooses wrongly, and the build checks a pin
against the same definition. Until m137 the table held 477 hand picks on each material's "representative grade"; the
rule reproduced every one, and they are archived in `docs/audits/2026-09-25-re-center/`.
A selection that fails any of these is a build error naming the material and the reason (HEADLINE-SELECTION-INVALID). A headline limited by "Applies to" is not
applicable, with its reason, for every other material.

The price is calculated (`prices.js`, D113): a listing's regular CAD/kg is its list price, less the VAT its page states,
over its net mass, times the Bank of Canada rate in force for its currency (CAD: 1), to the cent. A product's is the
median of its own headline-sample listings, its Canadian ones where it has any and its converted foreign ones only
where it has none, and a material's is its products' spread, as for any headline (where none of its plain products is
priced, the median of its own listings). A material's grades are its active procurement
grades; its environmental evidence is its own exposure, solubility and moisture records; its nozzle,
bed and chamber guidance is its first cited profile's text. None of these is stored, so none can
disagree with what it summarises. Editorial citations (printing, H2C status, use, durability, safety)
are rows in `material_links.csv`.

Compile also derives, each tagged with its origin so the interface can tell them apart:

- **Process gates** per material, aggregated across its profiles. Precedence is
  `within > within-low-end > edge > exceeds-recommended > exceeds > unknown` (D151). A known exceedance outranks an
  unknown, because silence is not counter-evidence. PEEK publishes two profiles demanding 390–480 °C
  against the printer's 350 °C plus one that publishes nothing; letting the silent profile decide
  would have reported PEEK as "unknown". Among unknowns, a profile that said something in words
  supplies the reason.
- **Related evidence** for headlines with no value: the real measurements of the same property that are no product's
  value, in the headline's unit: how many, the closest one, and up to ten, each with why (another direction or
  endpoint, a moulded, film, filament or off-recipe specimen, an annealed twin, another load or one not stated, a notch
  not stated, another standard or test temperature, a physically implausible value). Never pooled into a range.
- **Implied bounds** for headlines with no value: the material's own printed measurements that bound the headline from
  below (a yield or break strength under the ultimate, a strain at yield under the strain at break, HDT at 1.8 MPa
  under 0.45 MPa), at their published value. They veto a screen that would be wrong and limit the estimate (D55).
  A printed bar bounds it, in any direction, and so does one whose source states no specimen (D126); a moulded, film,
  filament or off-recipe specimen, an annealed twin beside an as-printed value and a conditioned elongation bound
  nothing. `lower-bounds.js` is the one rule, and `physical_relations.csv` is the list of orderings it projects.
- **The evidence ledger** (`evidence-ledger.js`, D153, D154), at the end of the product step: for each product state with
  no deciding value, what its records measured another way and its kind's physics limits bound each headline to
  (`grades[].states[i].bounds`), each contribution naming its row (`conversions.csv`, `class_limits.csv`) and record, a
  reported row's listed and never deciding; a PLA or PET HDT from an undescribed bar marked a ceiling; each row's band
  re-measured on same-sheet pairs (`db.conversions[].pairs`, `build/snapshot/ledger.csv`). The implied bounds above stay
  the frozen estimate stage's; LEDGER-LB-DRIFT keeps them equal to the ledger's factor-1 floor rows.
- **Facets** the Materials table does not carry directly, marked `derived`.
- **What a material's headline values represent**, and the sentence describing its price sample. Both were columns
  of `materials.csv` until m45: the first is now one of three sentences chosen by Scope and whether any of its
  products publishes a comparable value, the second counts the observations compile already counts (D70).
- **Coverage rows for what a material's own records show**, one per (material, domain) pair no stored row speaks
  for, marked `derived`: evidence, naming what proves it (the measurement count, the profile IDs, the price
  observations), or its absence, naming what is missing, and for price a converted price as limited (D113). A stored
  row is somebody's judgement and always wins. 541 templated "Evidence recorded" rows left the table when this began
  (D74), and 145 templated Gap rows when absence was derived too (D114).
- **A print summary** per material: the widest published nozzle, bed and chamber window across its
  profiles, with the number of profiles behind each. It answers "what do I set it to", which was otherwise only in
  free text one tab deep. Where the chamber is answered in words, the strongest statement across the
  profiles is kept as `chamberGuidance`: not required, then recommended, then no setpoint.
- **A buy summary** per material: one offer chosen from the price observations, ranked by in stock,
  then the observation behind the headline, then anything with a price. Quarantined observations are skipped. The retailer URLs were in the data from the start and were
  rendered nowhere.
- **The registry** (`db.registry`): every property's domain, units and applicability, and every
  headline's definition and labels, so the interface builds its filters, axes, table, export and
  drawer tabs from data.
- **Environment category names**, carried through from the mapping file in a heading form ("Acid
  resistance") and a sentence form ("acids"), so the engine can name a category in a reason string
  without importing anything from the interface, and so there is one place to change a name.

### Stage 4: Estimates — `estimate/` and `chamber-estimates.js`

Runs after every headline is known; it is almost all of the build's time (see Scale, below). For each headline it rejects physically
impossible values, converts every observation of every in-scope material to the headline's semantics
(conversions documented in `build/mappings/estimate-model.json`, refined by grades that publish both),
measures the spread between products of one material directly, estimates the remaining spreads from
the data above documented floors, and fits one Gaussian model. It then hides each measured headline,
predicts it, and scales the likely (80%) and plausible (95%) ranges to the coverage actually achieved.
Declared grade variants get their own covariate, conditioned values convert to dry through the documented wet
offset, published bounds enter with a half-width and limit their own material, and physical limits bound every
range softly (D53). The physics of printing shapes it (D56): a polymer that prints amorphous deflects near its glass
transition and learns nothing from annealed values; an annealed value is never averaged with its as-printed twin, and
repeats under different schedules keep their spread; the wet offset follows water uptake; density is bounded by the
neat polymer and the rule of mixtures; an unfilled bar is capped by its own Vicat; an elastomer has no heat deflection
estimate; an unknown direction never converts upwards past its documented offset; a material's only evidence is never
down-weighted; its implied bounds limit its range from below (D55). Film, filament, off-recipe (D95) and physically
implausible values enter nothing. Every build then back-tests screening: each measured headline is hidden as far as an
evidence class requires (this grade, this material, family) and predicted honestly with the production ranges, the
conversions refitted without it, and each end of the class's screening range is set at a distribution-free tolerance limit of where
the true values fell (at most 10% beyond it, with 90% confidence; never inside the plausible range). A class with fewer
than 22 cases screens an end only where the family model agrees, and no end screens against the material's own
evidence (D48, D59). A missing headline the registry marks Estimated (density, stiffness, strength, stretch, heat
deflection) gets an estimate with its evidence, precision and the range it may screen on, or a not-applicable reason;
the layer strength, the two notched impact strengths and the glass transition are not estimated. A material declared
not estimated (Estimate identity Not applicable, D87) is listed as HEADLINE-UNESTIMATED, not an error. Diagnostics
(calibration, conversions, spreads, rejected values, conflicting
evidence, outlying headlines) go to `meta.estimateModel`. `docs/DATA-MODEL.md` explains the model
under "Estimates"; DECISIONS D43 says why. The selector reads a material's estimate for a requirement only where the
material has no product on record: every other material is judged by its products, each on its own prediction (D137,
D148).

**Floors (D126).** What a product's own measurements prove a headline is at least (`lower-bounds.js`: the ultimate
strength is at least the yield and break stress, a strain at break at least the strain at yield, HDT at 0.45 MPa at
least HDT at 1.8 MPa) floors the estimates built on it. A grade's range is floored at the highest floor its own
formulation proves. A material's range is the spread of its products, so it must contain every product's floor: its upper
ends reach the highest product floor, and its lower ends are floored at the lowest only when every active product has one.
Flooring a material at the highest product floor was tried first and broke calibration; `floors.js` back-tests each rule
on the hidden headlines (`meta.estimateModel.properties.*.floors`, the validation report, and
`docs/audits/2026-10-04-reader-round/estimate-order/backtest.md`). A semicrystalline polymer's heat deflection is held
under its melting point (`bounds.js`).

`estimate/print.js` then infers a nozzle or bed window for a material whose profiles publish none on that axis, from
the same polymer or its chemical group, shifted for fibre and kept above the melting point.

Chamber bands are not computed. They are read from `data/tables/chamber_bands.csv`, one row per material by MaterialID, where
the 2026-09-13 research's bands are authored with its basis and caution, and attached only to a
material with no published window and no statement that no heated chamber is needed. Every name is
checked against the snapshot, and a name that is not there stops the build. They change no verdict;
see `docs/DATA-MODEL.md` under "Chamber evidence".

### Stage 5: Validate — `validate.js`

Errors stop the build. Warnings do not: they record what the compiled database cannot support, so
the interface can say so rather than implying a certainty it does not have. Every issue carries a code from
`rules.js` (`docs/RULES.md`), and warnings name their records, which the review snapshot commits (D50, D53). A
per-record warning (EST-OUTLIER, EST-WIDE, EST-FAMILY-ORDER, NO-MEASUREMENTS) must be fixed or
accepted with a reason in `data/review/accepted-findings.csv`; `npm run audit:data` fails otherwise (D57). Summaries
that only describe the snapshot (EST-SUMMARY, FAMILY-ENTRIES, IMPACT-UNITS, EST-CALIBRATION-FEW) are level info.

Checked: identifier uniqueness; referential integrity across every table; every measurement of a
registered property that no other property replaces, in one of its units, of a material the property applies to;
raw value, uncertainty and upper bound each reconciled with the conversion factor; quarantined measurements
staying out of every numeric summary; XY never merging with Z; impact in J/m never reconciled with
kJ/m² without specimen geometry; an excluded material (Scope, the one place exclusion is recorded) carrying the excluded scope gate; a product value that decides as XY being an XY measurement; every estimated headline of an
in-scope material that names an Estimate identity carrying a value, an estimate or a not-applicable reason
(HEADLINE-BLANK); every estimate nesting its likely range inside its plausible
range and citing only its own material's or its products' measurements; each headline's
likely range holding 80% (±10 points) and its plausible range at least 90% of the hidden values of materials'
typical products; grade roles agreeing with the -R#
ID suffix; every chamber band naming a real material that is neither out of scope nor a family entry or alias,
once, with a basis and a real range; and every free-text value that failed to parse, including
enclosure wording, reported by value and count so the mapping files can absorb it deliberately.

It also checks that every property name the code relies on and every name the estimate model uses still
resolves (D51); flags an estimate left imprecise beside a usable published value (EST-WIDE), reports one that is
wide because the evidence is thin (EST-THIN, D73), and flags reinforced materials estimated below
their unfilled sibling (EST-FAMILY-ORDER); and lists measured headlines far from their prediction (EST-OUTLIER).

It checks the physical order of the numbers a reader is shown (D126, `estimate/order.js`). EST-ORDER is an error when a
grade's or a material's estimate (its centre or an end of either range) lies under what its own measurements prove it is
at least, when a material's range does not reach its highest product floor or, where every product has a floor, starts
under the lowest, or when a heat deflection estimate lies above its polymer's melting point. PRODUCT-ORDER is
informational: a product's published value lies under another of its own measurements from a different source,
direction, specimen or state, two tests and not the endpoints of one; the value stays the product's until a re-read says
which sheet is wrong. RELATIONS-HEADLINE-DRIFT (`registry.js`) is an error when a headline's lower bounds and
`physical_relations.csv` name different pairs.

It also checks **cross-record consistency**, not just whether referenced identifiers exist:

- every measurement, profile, price and use record is filed under the material its grade belongs to;
- a material's grade list is its active procurement grades; study and resin-reference grades (Role,
  and an `-R#` suffix) remain outside it;
- every product value cites a measurement of that product, or of its twin where it reads its twin (D89), not
  quarantined, and a material's typical product is one of its own;
- each cited record exists and belongs to the material, except deliberately labelled family context
  in use, durability and safety notes;
- each material link cites the right kind of record: a profile or evidence for printing, a source
  for H2C status, evidence for use, durability and safety;
- coverage does not claim absence beside the material's own records or claim evidence it does not
  have, and each Grades coverage row states the true procurement-manufacturer count.

These checks use `coverage-rules.js`, the same domain definitions compile derives coverage rows from (D74). A derived
row and the validator therefore cannot disagree about what “has data” means.

The report counts each gate's verdicts, a window at its low end and one on the line among them, and breaks chamber evidence down
by kind: a published window, a statement in words, no setpoint, nothing, and how many materials carry
a band. It lists every band the evidence superseded.

`build/reports/validation-report.md` is regenerated every build and is a deliverable in its own
right. It tells you what the tool cannot yet see.

An estimated headline left blank says why: a material whose Estimate identity has no row in
`data/tables/polymers.csv` stops the build with that fix (HEADLINE-BLANK). A material declared not estimated
(Estimate identity Not applicable, D87) is not an error: what none of its products publishes is Not published, judged
unknown, and listed as HEADLINE-UNESTIMATED. The layer strength, the two notched impact strengths, the glass transition
and the price are never estimated.

### Stage 6: Contract — `contract.js`

`dist/db.json` and `dist/reference.json` are checked against `schema/db.schema.json` and
`schema/reference.schema.json` (JSON Schema 2020-12). A field the compiler renamed, dropped, retyped
or added without declaring stops the build, reported at its JSON path.

### Stage 7: Bundle — `bundle.js`

Inlines the two stylesheets (`app/css/tokens.css`, the tokens the material pages share, then `app/css/app.css`) as one
style element, after the material pages' Inter subset (`app/pages/assets/fonts/`) as a data: URI with its licence, so the
selector draws text in the pages' face (D147); then the plotting library and the application, and embeds both compiled
databases gzipped and base64-encoded.

Replacements use a **function**, never a string. `String.replace` interprets `$&`, `` $` `` and `$1`
in a string replacement, and minified library source is full of such sequences; passing the payload
as a string scattered the matched placeholder tag through the output thirty times. The bundler also
asserts that no source path survived into the output, which is how that failure is caught now.

The build date is the commit date (or `SOURCE_DATE_EPOCH`), never the clock, so the same commit
builds the same bytes. `dist/manifest.json` records the snapshot, build date, commit, whether the tree
was clean, hashes of the data manifest, schema, build rules, mappings and app, and hashes of every
output, the material pages among them (`outputs['materials/']`). Pages publishes it beside the page.

### Stage 8: Material pages — `app/pages/stage.js`

After the bundle, because the pages link back to the selector's file by its name: a page of its own for every material
the page rule admits (`app/js/ui/page-rule.js`: at least three products and twenty measured values; D142), its Overview
and its Products page (D145) and a stub at its old records address, the index, the method page and the shared assets,
into `dist/materials/`. The renderer is loaded only for this stage, and is
skipped with `--validate-only` and `--no-estimates`; `--no-pages` builds everything else and removes
`dist/materials/`, so no page of an earlier build is left beside a database it does not match (`build:diff` builds so).

- **From the published database.** The pages are rendered from `dist/db.json`'s own text, parsed again, so a page is a
  function of that file alone: `test/pages.check.js` renders it afresh and compares every byte (P14).
- **Through the build cache.** The result is stored in `.cache/build/` under the digest of the renderer's code
  (`digestFiles` over `app/pages`, `app/js/ui`, `app/js/engine` and `app/css`, with the same guard as the build's own
  code digest), the database's SHA-256 and the selector's file name; a hit writes the stored files.
- **Whole or not at all.** Written to `dist/.materials-<pid>/` and renamed into place, so no reader sees half a folder.
- **Weighed.** Each Overview, Products page, stub, the stylesheet, the script and the set against `app/pages/budget.js`: over budget is a
  warning printed as `[PAGE-BUDGET]` (a word of the stage's own, not in the rule catalogue), over twice it stops the
  build, and `pages.check.js` fails over budget.
- **Recorded.** `dist/manifest.json` gets `outputs['materials/']`, the SHA-256 over the sorted
  `"<sha256>  materials/<path>"` lines, and `pages` (the count of Overviews, of Products pages (the key `recordsPages`), and their bytes), so the
  reproducible-build check covers the pages too.

It prints one line, for example `pages  76 Overviews, 76 Products pages, the index and the method page, 26.8 MB in all, in 1308 ms` (MiB, as the
bundle's line), or `read from the build cache in … ms`. Rendering every page takes about a second; a cache hit about a tenth of that.

### Verifying a build

```bash
npm run verify                   # verify:fast, import tests, the campaign page, audit, context audit, review
                                 # snapshot, the material pages, links, packets, interface views, 300 rendered
                                 # scenarios, scale and reproducible-build checks
npm run build:diff               # what the change did to dist/db.json
open dist/H2C_Material_Selector_*.html
npm run trace -- PETG            # any headline back to its measurement, grade and source
```

The end-to-end check is the worked example from the architecture brief: H2C-relevant and within the H2C's
temperature limits (D101), HDT at least 100 °C, modulus at least 3 GPa, density at most 1500 kg/m3, Strict mode: the "Outdoor structural part" template, which
adds a build material and an optional price. Its candidates are that template's Strict rows in
`build/snapshot/templates.csv`, nearly all fibre-reinforced engineering polymers. Every one should explain itself and
trace to a MeasurementID, a GradeID and a SourceID.

One more check is worth running by hand, because it fails silently rather than loudly. Set several
criteria of different kinds, open every tab, and read the text. No screen may show an internal key
such as `hdt045` or `tensileModulusXY`. Those are how a property is stored, never how it is named,
and every one of them that reached a screen did so because a second code path described a constraint
instead of calling `describeConstraint` in `app/js/ui/labels.js`.

To prove the offline requirement, open the file with the network disabled. It must work fully. The
plotting library contains CDN strings for map traces the application never renders, so grepping for
URLs is not a substitute for actually running it without a network.

### Systematic data audit

`npm test` always builds current inputs before the database tests. `npm run audit:data` also builds,
then reuses the production loader/compiler/validator and writes `build/reports/data-audit/`.
Pass an output directory to archive a review. The audit independently reconciles numeric raw values,
checks explicit source-grade scope, recompiles both payloads from the tables, and decompresses the HTML
to prove it embeds those exact payloads. It produces a full record index and a matrix of every material and
family. It does not assert that all external documents were re-read; live checks belong in the
review's source log. `measurement-rules.js` adds build-stopping numeric and endpoint checks. It also reviews every
per-record build finding against `data/review/accepted-findings.csv` (AUDIT-REVIEW-FINDING, AUDIT-REVIEW-STALE).

`npm run audit:sources` goes further on demand (it needs the network once): it fetches every PDF source cited
by measurements into `.cache/sources/`, checks its SHA-256, and lists every published number and every named
property that has no row, into `docs/audits/2026-09-14-transfer-verification/source-completeness*.csv`. Its first
run found hundreds of values the original transcription had dropped (migrations m13 to m17).

### Review snapshot and interface views

`npm run snapshot` writes `build/snapshot/`: every headline (value, or estimate with its likely and plausible
ranges and the range that may screen), process gates, each template's candidates in Strict, Explore and Explore
with estimates, and every build warning by record, with the products, spreads, states, print gates, environment
verdicts, claims, screening ends and pages the head of `scripts/snapshot.mjs` lists, one file each. `npm run ui:check` drives the built page in headless Chrome
through the default view, every template in both modes, each shared link reopened, and Compare, and compares what
a reader sees with `build/snapshot/ui/`. The default, template, ranked and family views record each results table as
a summary (its headers, one line per row, the first eight rows in full), so a data change does not rewrite whole tables;
the rendered-scenario run compares every cell with the engine. Both are checked by `verify`; a change commits its diff.
The material pages have their own: `build/snapshot/pages.csv` (every listed material's page or what it falls short
on, its products, values, makers and documents, its sections, figures, dots and the sizes of its Overview and Products
page, and the five alternatives it is compared with), the probe's `50-page-<screen>-<page>` views of ten pages (the
Overview and the Products page of PLA, PETG, PPS-CF and PCTG-GF, the index and the method page) on three
screens (layout, contents, fonts, lighting, every anchor's landing, the Products list's sorting and search) and a return
trip from the selector's drawer and back, and
`npm run pages:check` (every number on every page against the build, in `verify`'s data group).

`npm run ui:fuzz`, the last of `verify`'s interface steps (300 scenarios; 2,000 on a new seed weekly in CI), runs seeded random scenarios through the built page (every
requirement kind and operator, thresholds at the evidence itself, assumptions, searches, templates) in Strict and
Explore with estimates on and off, reads the table and the Ashby chart, and compares rows, verdicts, count, chips,
points, envelopes, front, legend, rounding, reasons and link round trips with the engine run in Node. Each scenario is
rendered in four settings and two lenses, so the run is the page's own drawing time: 300 scenarios took 341 s and 2,000
took 40 minutes on CI's runner (2026-10-15 and 10-17), which runs them in parts side by side (`--shard K/N`, D144);
`--n 3000 --seed N` runs more. Examples of any violation, each with its seed, scenario and link, go to
`$TMPDIR/h2c-ui-fuzz/violations.jsonl`. The method is in `docs/audits/2026-09-15-filtering-estimates-data/ui-fuzz/NOTES.md`.

`npm run audit:data` also reviews the per-record build findings against `data/review/accepted-findings.csv`
(AUDIT-REVIEW-FINDING, AUDIT-REVIEW-STALE), as `npm run data:lint` reviews lint findings.

The Verify workflow's data group runs the audit, and the Pages workflow builds and publishes only after Verify has
passed on main. Conversion factors are stored at
full precision in `measurements.csv`, so the raw-value reconciliation reads exactly the factor applied.

### Scale

**The build cache.** `buildDatabase` stores its result in `.cache/build/` under a SHA-256 of everything it can depend
on: the loaded tables as they are in memory (so a test that edits them gets its own key), the bytes of every file
under `build/src/`, `build/mappings/` and `schema/`, the dependency tree, the Node and ICU versions and collation
locale, and the options. A hit returns a private copy, so the build, the lint, the snapshot and the test files
that compile the same tables run the estimate stage once, not once each. A key that cannot be computed safely (a
code file changed after the process started, a table holding anything but plain data) turns the cache off for that
call. `H2C_NO_BUILD_CACHE=1` or `buildDatabase(wb, { cache: false })` bypass it; the scale check, the audit's
independent rebuild and the reproducibility test do, and CI starts with it empty.

`test/scale.check.js` (`npm run scale`) doubles the data (every material and its records cloned under new IDs) and runs the
gate, compile and validate; it asserts correctness and writes the timings to `build/reports/scale.json`, which
`scripts/scale-budget.mjs` judges last in `verify` (where a miss can fail, on CI or with `--enforce-budget`, it is re-run
once; elsewhere it is a warning from one run, D144). On 2026-09-21 the build was 0.07 s to compile, 13.5 s for the estimate stage and 0.06 s
to validate at 158 materials and 11,096 measurements; doubled, the estimate stage took about 59 s against a budget of
150 s (`test/scale.check.js` keeps the history). What the database holds today is in `build/snapshot/counts.md`. The
estimate model dominates. Its Gaussian process is cubic in the size of each chemical group rather than in all the
observations, because `estimate/solver.js` solves the kernel block by block, so the largest group sets the pace (D77,
D79).

**Where the design holds, and what changes first.** Judged on 2026-10-14 (the architecture review), the sizes measured
again on 2026-10-17. Each first change keeps the page one file on GitHub Pages; none is needed at today's size.

| What grows | Today | Holds to about | First change when it does not |
|---|---|---|---|
| The page | 8.4 MB: the database 3.6 MB embedded, the plotting library 4.3 MB | three times the data (Pages allows 100 MB a file) | the measurements as a second static file beside the page, read when a drawer opens; then a lighter chart for the one view that uses the plotting library |
| The database in the browser | 39 MB parsed, half of it measurements | three times (a parse of 100 MB takes seconds and about 1 GB on a laptop) | the same split; a long string repeated on every row (the print parameters) stored once and referred to |
| The estimate stage | 14 s, and 85 s at twice the data on the owner's machine; 140 s at twice the data on CI's runner (2026-10-15) | not much past twice the data on CI, whose weekly trend job enforces the 150 s budget; CI builds it cold on every push | CI keeps the stage's result keyed by its inputs, as the local build cache does; the result is the same |
| `verify:fast` | about a minute | at its 90 s budget | the import fixtures' build and the 23 tests that read `dist/db.json` |
| The tables | 15,400 measurement rows and 1,180 grade rows (the active ones are counted in `build/snapshot/counts.md`) | tens of thousands of rows; the schema gate takes a second | nothing: CSV under a schema scales further than a person can review it |
| The results table | 152 materials | about 400 | rows drawn as they scroll into view |
| Adding a data sheet | a batch at a time | bounded by reading, not code | the page-read path (IMPORTING.md), with the text reader as its check |

## Further reading

- "The build, stage by stage", above — what each build stage does and what it refuses to do
- `docs/DATA-MODEL.md` — the tables, the registry, the compiled shape, the three kinds of number
- `AGENTS.md` — how to change data: the rules for people and agents
- `docs/INTERFACE.md` — the workflow, the lenses, the visual vocabulary
- `docs/DECISIONS.md` — the decisions that are not obvious, and the bugs that forced them

The systematic audit uses `build/src/measurement-rules.js` for independent raw-value, unit,
applicability and headline checks and `scripts/audit-data.mjs` for reproducible source-to-HTML
verification and record inventories. Both reuse the established pipeline. Retirement is an explicit
grade Status, never a hardcoded exclusion. Estimates never pass (D43); a material's own estimate may screen only a
material with no product on record, a product's only with a back-test certificate none has yet, and a property that
does not apply hides a material whatever the estimates switch says (D137, D148).

## D137 product screening path

The observed compiler and D81 displayed estimator are unchanged. `estimate/product-screening.js` builds a separate fit without the calibration/evaluation formulations' target values or conversion pairs, sets bounds on calibration cases, then gates them on independent complete-scenario evaluation. It reuses the Gaussian fit, tolerance machinery and configured risk budget. Product certificates are additive compiled-schema fields; unsupported scopes have no permission. `engine/products.js` projects the exact product prediction; `constraints.js` guards the complete context and aggregates AND requirements / OR routes / OR products. The engine's `group` and `likely` (D155, replacing D137's `shortlistGroup`) drive the grouped table order, the CSVs' Candidate group and Likely columns and the folded "Unlikely to meet" list. A property that does not apply (D56) is UNKNOWN and hides the material under Include whether "Use estimates and resin data" is on or off (D148); `explainExclusions` counts a hide only where the whole question hides the material and names that requirement, by its kind (does not apply, estimate, resin data). Counts include collapsed rows; plot and brief decisions retain the same evaluated product/state. No CSV data, scenario wire fields or engineering ranking formulas change. The old-generation fallback remains readable.
