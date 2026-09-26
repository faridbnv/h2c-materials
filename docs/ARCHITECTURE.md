# Architecture

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
  dist/H2C_Material_Selector_<snapshot>.html    one file, no server, works offline
```

Inside the application, the same separation again:

```
  app/js/engine/     pure decision logic. No DOM, no globals, no imports from ui/
  app/js/ui/         rendering and interaction. Imports engine freely
  app/js/main.js     the only place that holds state and wires the two together
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
its file, line and field in under a second (DECISIONS D45).

No database server or SQLite file sits in the build path. For one person and two agents editing a few
thousand rows, text files under a schema give the same integrity checks with none of the operations,
and the build is where those checks run anyway.

A SQLite file is generated beside it, for reading only: `npm run db:sqlite` writes `dist/h2c.sqlite`
from the same tables and the same schema, with numbers typed, missing states in a sibling column and
every CSV header recoverable from `_columns` (DECISIONS D75). `npm run sql -- "select ..."` queries it.
Nothing reads it back, and it is gitignored with the rest of `dist/`, so data still changes in one
place; it exists because a question that spans records is a join, not a script. It also carries the record tier
(D85): what the sources publish that no row holds, and a full-text index of the cached documents.

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
At the 2026-09-21 build it is 21 MB raw, most of it measurements, and about 1.3 MB gzipped (1.7 MB once
base64-encoded). The plotting library is still most of what the file weighs: 4.3 of the page's 6.3 MB.

## Module map

### Build, `build/src/`

| Module | Responsibility |
|---|---|
| `csv.js` | The canonical CSV format: parse, and write in the one form every table is kept in. |
| `schema.js` | Check every table against `schema/tables/`: columns, types, missing states, patterns, vocabularies, uniqueness, references (including IDs inside lists and prose), canonical format and `data/manifest.json`. |
| `load.js` / `source.js` | Read the tables into raw row objects. No interpretation. |
| `registry.js` | The property registry: what each property and headline means, which materials it applies to, and which property replaces a retired name (`properties.csv`, `headline_definitions.csv`; D57). |
| `normalize/values.js` | Numbers, missing states, operators, intervals. Everything downstream depends on these staying distinct. |
| `normalize/direction.js` | The ten spellings of build direction (a source's own label and a ±45° raster get their own values), and which may be compared with which. |
| `normalize/thermal.js` | HDT standard and load out of about twenty spellings of free text, MPa, psi and kgf/cm²; a text naming both loads states neither. |
| `normalize/process.js` | Nozzle, bed and chamber temperatures, enclosure wording, nozzle diameters, drying, abrasion. The chamber's partial window and its answers in words. |
| `normalize/chemical.js` | 73 environment topics onto canonical categories; findings onto verdicts. |
| `normalize/moisture.js` | The declared State (dry, conditioned, not-stated) of each Moisture condition wording, from its vocabulary (D53). |
| `normalize/specimen.js` | The declared Form of each Specimen type (printed, not-stated, moulded, film, filament) and State of each Post-processing wording (as-printed, annealed, not-stated), and whether an annealed value has an as-printed twin (D56). |
| `typed-values.js` | The typed profile and measurement columns the build decides on, and the parser check that they agree with the raw text (PARSE-MISMATCH, D49). |
| `normalize/provenance.js` | The origin tag every derived value carries. |
| `compile.js` | Assemble the relational runtime database. A material's headline starts missing, with its related evidence and implied bounds (from printed values only, D55); products.js fills each one its products publish comparably. |
| `products.js` | Every product's own value per headline and its print recipe, chosen by rule, every material's spread across its products, and the material headline that spread gives (D83; re-center phases 1 and 4). Checks the pins in `headlines.csv`. The engine judges the products. |
| `gates.js` | A gate across several print profiles (within beats partial beats exceeds beats unknown), for a material and for a product. |
| `coverage-rules.js` | Define, once, what counts as a material's own mechanical, thermal, print, environmental and price data; used by planning and validation. |
| `pipeline.js` | The stages every caller runs (the build, the snapshot, the audit, the trace, the tests): compile, the estimate stage, validate. `estimates: false` builds the core database alone, and it must validate. |
| `estimate/` | The estimate stage, applied to the compiled database as an overlay (D58): one calibrated Gaussian model per headline over every observation, converted to the headline, configured by `build/mappings/estimate-model.json` (conversions, limits, the fit's judgements) and the tables it reads (`polymers.csv`, a material's Estimate identity and Variant class, Shore hardness measurements; D43, D53, D60), following printing physics (D56) and bounded by what the material's own printed data prove (D55); the screening back-test that decides which evidence may screen (D48); estimated nozzle and bed windows, which decide nothing. `model.js` configuration and shared names, `numerics.js`, `observations.js` conversion kinds and the snapshot, `conversions.js`, `gaussian.js` kernel, fit and prediction, `calibration.js`, `bounds.js` ranges and their limits, `screening.js`, `print.js`, `validate.js` its checks and report section, `index.js` the stage. `grades.js` predicts every active grade at its own row and calibrates those ranges at grade level (D81); a grade estimate decides nothing. |
| `chamber-estimates.js` | The research's chamber bands, from `data/tables/chamber_bands.csv`. Attached only where nothing better exists; they decide nothing. |
| `polymer-environment.js` | A base polymer's published environmental behaviour, from `data/tables/polymer_environment.csv` (D64): compiled with its refusals, one verdict per category by the documented rule, attached as inferred records (`db.polymerEvidence`, `evidenceIds.polymer`) only where a material has no record of its own. Core evidence, not the estimate stage, but marked inferred and removable: an empty table leaves the database untouched. |
| `know-how.js` | Makers' know-how (D85, lane 3): moves the statements (evidence rows in the non-filterable `know-how` category) out of `db.evidence` into `db.knowHow`, so nothing that screens reads one, and derives each product's and material's know-how state (collected, sheet silent, searched, no document read) and the recipe's, from the statements and `data/tables/know_how_reads.csv`. The product panel is the one reader. |
| `reference.js` | The generic-material baseline layer, compiled separately on purpose. |
| `validate.js` | Every invariant, plus the human-readable report. |
| `rules.js` | The catalogue of every issue code, its level (error, warn, info, lint), meaning and fix (D50); generates `docs/RULES.md`. |
| `lint-rules.js` | Data quality the schema cannot express, as coded findings with a record each (D50): text artefacts, duplicates, indistinct conditions, directions named in locators, and physics one sheet must not contradict (MEAS-PHYSICS-*, D55). |
| `property-references.js` | Property names the code relies on, checked against the registry, and the estimate model's references (D51). |
| `measurement-rules.js` | Independent raw-value, uncertainty, upper-bound, unit and endpoint checks, and no use of a replaced property, used by validation and the systematic audit. |
| `contract.js` | Check `dist/db.json` and `dist/reference.json` against `schema/db.schema.json` and `schema/reference.schema.json`. |
| `review-workbook.js` | The generated, read-only Excel review workbook (`npm run data:export-xlsx`). |
| `bundle.js` | One HTML file. |
| `index.js` | Runs the stages, decides whether the build may proceed, and writes the release manifest. |

### Data tooling, `scripts/`

| Script | Responsibility |
|---|---|
| `data/table-io.mjs` | The scripted-edit API: open, find, set (with an expected-value guard), update a row of a keyless table by its fields, append, add or drop a column, save in canonical form with a fresh manifest. Nothing is deleted. |
| `data/fmt.mjs` | `npm run data:fmt`: rewrite tables and vocabularies canonically and refresh `data/manifest.json`; `--check` changes nothing. |
| `data/check.mjs` | `npm run data:check`: the schema gate on its own, in under a second. |
| `data/new-id.mjs` | `npm run data:new-id`: the next free ID for a table, or a material's next grade. |
| `data/new-material.mjs` | `npm run data:new-material`: a material and its first grade in one write, and a list of the records it still needs. |
| `lib/cdp.mjs` | Headless Chrome for `ui-probe.mjs` and `ui-fuzz.mjs`: where it is, how it is launched, the debugging port. |
| `docs-decisions.mjs` | The index at the head of `docs/DECISIONS.md`: every decision, its line in plain words, and whether it still holds. |
| `data/new.mjs`, `data/retire.mjs`, `data/records.mjs` | `npm run data:new`: a complete new row (next ID, template, missing states); `npm run data:retire`: a grade retired with every dependent record listed. |
| `data/lint.mjs` | `npm run data:lint`: quality findings (`build/src/lint-rules.js`) against the reasoned baseline `data/review/accepted-findings.csv`; `--accept` also accepts per-record build findings. |
| `data/review-findings.mjs` | The per-record build findings (EST-OUTLIER, EST-WIDE, EST-FAMILY-ORDER, NO-MEASUREMENTS) a reviewer must fix or accept; `audit-data.mjs` checks them (D57). EST-THIN is informational and is not among them (D73). |
| `audit/source-completeness.mjs` | `npm run audit:sources`: every PDF source re-read for values and properties the tables lack. |
| `build-diff.mjs` | `npm run build:diff`: builds HEAD (or `--ref`) in a temporary worktree and the working tree, and prints every difference in `dist/db.json`. |
| `snapshot.mjs`, `ui-probe.mjs` | `npm run snapshot`, `npm run ui:check`: the committed review snapshot and interface views. |
| `ui-fuzz.mjs` | `npm run ui:fuzz`: seeded random scenarios through the built page in headless Chrome, in every Strict/Explore/estimates setting, table and chart compared with the engine in Node (D57). |
| `docs-rules.mjs`, `docs-dictionary.mjs` | `docs/RULES.md` from the rule catalogue; `docs/DATA-DICTIONARY.md` from the schema. Both are checked by `verify:fast`, with the decisions index. |
| `data/diff.mjs` | `npm run data:diff`: a record-level changelog between two versions; `--fail-on-removed` refuses deletions. A keyless table's declared `identity` and `replacedWithin` make a re-pointed citation an edit. It replaces hand-written audit changelogs. |
| `trace.mjs` | `npm run trace`: a headline back to its measurement, grade and source, with file and line. |
| `data/synthesize.mjs` | A multiple of today's data under new IDs, for the scale test. |
| `data/export-xlsx.mjs` | The read-only review workbook. |
| `migrate/` | The source corrections and table changes, m10 onwards; each names the value it replaces through `source-edits.mjs`, so a re-run is a no-op. The 2026-09-14 workbook conversion (m01 to m09, its ledger and replay) is in `archive/workbook-conversion/`, which no longer runs: the workbooks were deleted with the cutover. |
| `audit-data.mjs` | Reproducible source-to-HTML verification and record inventories, and the review of per-record build findings. |
| `data/sqlite.mjs` | `npm run db:sqlite`, `npm run sql -- "..."`: the compiled database as a SQLite file with the schema's types, the compiled headlines, and a robust z-score per measurement against its material's others (`v_measurement_z`, D75). |
| `data/record-tier.mjs` | The record tier in the same file (D85): `source_facts`, the lines the import reader read without them becoming data, and `documents_fts`, a full-text index of the cached documents (built only where `.cache/text` is present). |
| `ingest/` | The import pipeline (`docs/audits/2026-09-18-v2-import/`): a ledger of every document, fetch, extract, propose, review, batch, apply through a migration, and the generated STATUS, BLOCKERS and READINGS. `second-read.mjs` draws an independent sample and keeps the findings register (R085, R165). The rules are in `docs/IMPORTING.md`. |

`npm run verify:fast` runs format, schema, lint, generated docs, build and tests while you work: about 75 seconds after a
change and 30 when nothing the build reads changed, because the build result is cached by content
(`build/src/build-cache.js`, `.cache/build/`); its budget is 90 seconds (docs/GOALS.md). The import pipeline's tests
run in `verify` (`npm run test:ingest`), not here, while imports are paused.
`npm run verify` adds the audit, review snapshot, interface views and 300 rendered scenarios, before a commit. The
pre-commit hook (`npm run hooks` installs it) runs the data checks on any commit touching `data/` or
`schema/`, CI runs `verify` on every push and 2,000 rendered scenarios on a new seed every night, and
`npm run build:diff` shows what a change did to the compiled database. `AGENTS.md` is the editing guide.

### Engine, `app/js/engine/`

| Module | Responsibility |
|---|---|
| `constraints.js` | The four-state evaluator, the unknown-data policies, ranked exclusions. The heart of the tool. |
| `products.js` | A material answered by its products (D83): a product view (the material with one product's values and print recipe), which `evaluateProducts` in `constraints.js` judges on every requirement at once and rolls up to all / some / none. Used when the context carries `productsByMaterial`; the page does from re-center phase 3. |
| `indices.js` | The Ashby performance-index library, their slopes and their caveats. |
| `pareto.js` | Non-dominated sets over the current candidates and axes. |
| `coverage.js` | What the database knows and does not, per material and per domain. |
| `scenario.js` | The user's question, serialised: shareable link, saved file, user assumptions. Validation leaves out, with a warning, what the build cannot evaluate. |
| `search.js` | Catalogue search, by a material's own words and its products' makers and names. Its own module because the obvious implementation matches "PLA" inside "thermoplastic". |

### Interface, `app/js/ui/`

| Module | Responsibility |
|---|---|
| `registry.js` | Builds the interface's property definitions from the database's registry at start-up: labels, filters, axes, table columns, export headers and the drawer's property tabs. |
| `labels.js` | The single vocabulary. What every property, criterion, gate verdict and chamber statement is called, in plain words with the technical name behind it. Nothing else names them. |
| `format.js` | The single place a value becomes text. Owns the visual distinction between measured, related and estimated, and never rounds a value across a requirement's threshold (D54). |
| `filters.js` | The requirement rail, including the data-availability line under every control. |
| `table.js` | The results grid and the client-side export. |
| `ashby.js` / `axes.js` | Property-property plots, constraint overlays, index lines, the reference layer. |
| `parallel.js` | Parallel coordinates, hand-drawn in SVG. |
| `heatmap.js` | The coverage lens. |
| `compare.js` | Two to six materials side by side, with their measurement conditions. |
| `detail.js` | One material's complete record. |
| `explain.js` | Why the list is what it is, ranked by what each criterion costs, and the zero-result screen. |
| `start.js` | The opening panel, and the active-requirements header that replaces it. |
| `templates.js` | Application templates. They populate controls and then get out of the way. |

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

**A new table.** Its schema in `schema/tables/<name>.schema.json`, and the four places the build learns
about it, in the same commit: `TABLE_ORDER` (`build/src/schema.js`), `TABLES` (`build/src/load.js`),
`inputs` (`build/src/source.js`) and `TEXT_TABLES` (`build/src/lint-rules.js`). A table missing from
`TABLE_ORDER` sorts to the front of the review workbook. If it is a child of a per-material table, add it
to `scripts/data/synthesize.mjs` too, or the scale test loses its rows. `reference_envelopes` (m42) and
`profile_notes` (m44) are the two worked examples.

**A typed column beside raw text.** The raw column keeps the source's words; the typed one is what the
build reads; a reader in `build/src/normalize/` says what the words plainly mean, and `typed-values.js`
stops the build where the two disagree with no Parse review (D49). Use it wherever a decision would
otherwise be read out of prose on every build. Moisture state, Post-processing state and Standards are
the recent ones (D68, D76).

**A new lens that draws numbers.** Decide what it does with an estimate before you write it. Three
lenses drew only measured headlines and silently dropped a quarter of the candidates; an estimate is
a range, so it is drawn as a range, counted where it cannot be drawn, and never allowed to dominate
a measured value.

**A new measured property.** A row in `data/tables/properties.csv` (domain, units, and "Applies to"
if it only means something for some filaments), then its measurements. It appears in the drawer's
tab for its domain, counts as coverage evidence, and is checked for unit and applicability. No code.

**A new selectable property (headline).** A row in `data/tables/headline_definitions.csv`; each product's
value is then chosen from its measurements by rule, and each material shows its products' spread. The filter rail, charts, table, export,
drawer and engine pick it up from the registry; materials outside "Applies to" show it as not
applicable with the reason. `test/new-property.test.js` does exactly this for an elastomer-only
Shore A hardness. Only estimation needs code: mark it Estimated only after adding `HEAD` (`estimate/model.js`) and `kindOf`
(`estimate/observations.js`) cases and its scale, floors, precision thresholds and conversions in
`build/mappings/estimate-model.json`; the build refuses the flag otherwise, and the calibration check
says at once whether the model holds.

**A new constraint kind.** Add a branch in `evaluateConstraint` and a matching control. Return the
same result shape, including `criterion` and `reason`, or the explain panel will have nothing to
say. Then add a case to `describeConstraint` in `ui/labels.js`: that function is what the pills, the
explain panel, the why list, the excluded-search group and the CSV export all use, and a missing
case is how an internal key reaches the screen.

**A new gate verdict.** Add it to `GATE_PRECEDENCE` in `build/src/gates.js`, to the switch in
`evaluateGate` in `app/js/engine/constraints.js`, and to `GATE_VERDICT` in `ui/labels.js`, which is
where the table, drawer and Compare read its chip and its words. `partial` was the last one added, and
three screens each had their own copy of that table until then.

**A new word for something.** It goes in `ui/labels.js` and nowhere else. Environment category names
are the exception, and only because they belong with the topic rules: they are authored in
`schema/vocab/environment-categories.csv` and `environment-topics.csv` and compiled into the snapshot, so the engine can name a
category without importing anything from `ui/`.

**A new lens.** Add it to `renderLens` in `main.js` and to the lens bar in `app/index.html`. Read
`state.rows`; never re-filter.

## The build, stage by stage

*Until 2026-09-25 this was `docs/PIPELINE.md`; it is here so a developer reads one document (re-center phase 5).*

```
npm run verify:fast    while you work: format, schema, lint, generated docs, build and tests
npm run verify         before a commit: verify:fast, audit, review snapshot, interface views, 300 rendered scenarios
npm run ui:fuzz:full   2,000 random scenarios through the built page, compared with the engine (nightly in CI)
npm run build:diff     every difference a change made to dist/db.json, against HEAD or --ref
npm run data:check     the schema gate alone, in under a second
npm run build          full build, ending in a distributable HTML file and its manifest
npm run validate       stops after the report; writes no dist artefacts
npm test               builds, then engine, data, registry, contract, scale and database tests
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
the build with the file, line, record and field. The whole check takes about 200 ms.

### Stage 1: Load — `load.js`

Reads the tables into raw row objects, one set per table under the name the compiler addresses it by.
No interpretation happens here: a value is its trimmed text or null, so `"Not published"` and a number
remain distinguishable downstream. Each row carries its file and line for error messages.

### Stage 2: Normalize — `normalize/`

Where the sources' free text becomes machine-readable. This is the largest and most error-prone
stage, and the one the architecture brief does not mention at all.

**Missing states** (`values.js`). Four states that must never collapse into each other or into zero:
not published, insufficient comparable data, not applicable, quarantined. Plus a fifth for price,
where "not available in the sampled Canadian market" is a different statement from "not published".

**Intervals** (`values.js`). What a measurement actually asserts: a point, a range, a value plus
uncertainty, or a bound from a `>` or `<` operator. The engine judges a value plus uncertainty on its value and
flags a threshold inside the spread (D54); a range and a bound stay intervals. Unbounded ends are `null`, not `Infinity`,
because this is serialised to JSON and `JSON.stringify` would turn Infinity into null anyway.

**Direction** (`direction.js`). Ten spellings onto canonical values. Three of them are the source's
own words rather than a confirmed build orientation, so `Horizontal (source label)` gets its own
value and never merges into XY, in the engine or in the estimate model; `45/45` is a ±45° raster, its own value.
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
declares a Form (printed, not-stated, moulded, film, filament) in its vocabulary, because those ten wordings are the
database's own. The build reads the state, never the words. Where the words plainly say otherwise the build stops
(PARSE-MISMATCH); where they say nothing the column decides, so a new datasheet sentence is data rather than a
schema change (D53, D56, D68).

**Typed values** (`typed-values.js`). The parsers above no longer feed compile directly: the typed columns do, and
the parsers check them (PARSE-MISMATCH unless Parse review explains the difference; D49).

**Process** (`process.js`). Temperatures, nozzle diameters, drying schedules, abrasion. Two bugs
here shipped and are now pinned by tests:

- A leading minus in the number pattern made the range dash in `255-275C` read as the sign of -275,
  which failed the plausibility window and collapsed the range to its lower end.
- `Room Temp. Annealing temp. and time 100 °C/16H PolyDissolve S1` is a room-temperature chamber
  plus a post-print anneal. Scraping its 100 °C as a chamber requirement wrongly excluded four
  printable support materials.

This stage also distinguishes a **requirement** from a **recommendation**. "Recommended 70-140C if
possible" exceeds the H2C's 65 °C chamber but does not make the material unprintable.

The chamber has two more answers the other axes do not (DECISIONS D32, D33):

- A window the chamber only partly reaches, such as 60–90 °C, is `partial`, not `exceeds`. Nozzle and
  bed keep the upper-end reading.
- A chamber answered in words stays words. "Not required" and room temperature are `not-required`;
  "Recommended" with no number is `recommended`; a data sheet's "-" is `no-setpoint`. The Enclosure
  column is parsed too, and "not necessary" there means no heated chamber is needed. An enclosure
  being recommended means nothing about 65 °C.

**Chemical** (`chemical.js`). 73 environment topics onto canonical categories, via a hand-maintained
vocabulary, `schema/vocab/environment-topics.csv`, that `evidence.Topic` must match, so an unmapped topic fails at the schema gate. `environment-categories.csv` carries
each category's display names, which is why it is the only place a category is named. The evidence runs
two overlapping source vocabularies for the same chemistry, `Resistance to Acid` alongside `Effect
of weak acids`; they merge but keep their strength qualifier, because a source that distinguished
weak from strong said more than one that did not.

### Stage 3: Compile — `compile.js`

Assembles the relational runtime database, and does the one thing that matters most:

> **A number is read from its measurement, never typed a second time, and nobody selects it.**

Each product's value for a headline is chosen by rule from its own measurements (`products.js`): an active numeric
measurement of an allowed property, in the headline's unit, from a printed or unstated specimen, not conditioned, not
flagged physically implausible, not annealed where the product publishes the property as printed, and in the
headline's direction and at its load ("comparable"), or with either unstated ("as published", D84). A material's
headline is its products' spread: the median of their comparable values, their range and count, and the typical
product (D83). `headlines.csv` only pins one product's value where the rule chooses wrongly, and the build checks a pin
against the same definition. Until m137 the table held 477 hand picks on each material's "representative grade"; the
rule reproduced every one, and they are archived in `docs/audits/2026-09-25-re-center/`.
A selection that fails any of these is a build error naming the material and the reason (HEADLINE-SELECTION-INVALID). A headline limited by "Applies to" is not
applicable, with its reason, for every other material.

The price headline is calculated: the median regular CAD/kg (list price over net mass, to the cent)
of the material's headline-sample observations. A material's grades are its active procurement
grades; its environmental evidence is its own exposure, solubility and moisture records; its nozzle,
bed and chamber guidance is its first cited profile's text. None of these is stored, so none can
disagree with what it summarises. Editorial citations (printing, H2C status, use, durability, safety)
are rows in `material_links.csv`.

Compile also derives, each tagged with its origin so the interface can tell them apart:

- **Process gates** per material, aggregated across its profiles. Precedence is
  `within > partial > exceeds-recommended > exceeds > unknown`. A known exceedance outranks an
  unknown, because silence is not counter-evidence. PEEK publishes two profiles demanding 390–480 °C
  against the printer's 350 °C plus one that publishes nothing; letting the silent profile decide
  would have reported PEEK as "unknown". Among unknowns, a profile that said something in words
  supplies the reason.
- **Related evidence** for headlines with no value: one real measurement of the same property that
  was never promoted, with the reason (another direction or endpoint, a moulded, film or filament specimen, an
  annealed twin, a physically implausible value). Never a cross-grade range.
- **Implied bounds** for headlines with no value: the material's own printed measurements that bound the headline from
  below (a yield or break strength under the ultimate, a strain at yield under the strain at break, HDT at 1.8 MPa
  under 0.45 MPa), at their published value. They veto a screen that would be wrong and limit the estimate (D55).
  A moulded, film, filament or unstated specimen, an annealed twin and a conditioned elongation bound nothing.
- **Facets** the Materials table does not carry directly, marked `derived`.
- **What a material's headline values represent**, and the sentence describing its price sample. Both were columns
  of `materials.csv` until m45: the first is now one of three sentences chosen by Scope and whether any of its
  products publishes a comparable value, the second counts the observations compile already counts (D70).
- **Coverage rows for the domains a material's own records prove**, one per (material, domain) pair no stored row
  speaks for, marked `derived` and naming what proves it: the measurement count, the profile IDs, the price
  observations. A stored row is somebody's judgement and always wins. 541 templated rows that only restated the
  records left the table for the audit record when this began (D74).
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
down-weighted; its implied bounds limit its range from below (D55). Film, filament and physically implausible values
enter nothing. Every build then back-tests screening: each measured headline is hidden as far as an evidence
class requires (this grade, this material, family) and predicted honestly with the production ranges, the conversions
refitted without it, and each end of the class's screening range is set at a distribution-free tolerance limit of where
the true values fell (at most 10% beyond it, with 90% confidence; never inside the plausible range). A class with fewer
than 22 cases screens an end only where the family model agrees, and no end screens against the material's own
evidence (D48, D59). Every missing
headline gets an estimate with its evidence, precision and the range it may screen on, or a not-applicable reason. Diagnostics (calibration, conversions, spreads, rejected values, conflicting
evidence, outlying headlines) go to `meta.estimateModel`. `docs/DATA-MODEL.md` explains the model
under "Estimates"; DECISIONS D43 says why.

`estimate/print.js` then infers a nozzle and bed window for a material that publishes neither, from
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
kJ/m² without specimen geometry; an excluded material (Scope, the one place exclusion is recorded) carrying the excluded scope gate; a product value that decides as XY being an XY measurement; every in-scope headline carrying a value,
an estimate or a not-applicable reason; every estimate nesting its likely range inside its plausible
range and citing only its own material's or its products' measurements; each headline's
likely range holding 80% (±10 points) and its plausible range at least 90% of the hidden values of materials'
typical products; grade roles agreeing with the -R#
ID suffix; every chamber band naming a real, in-scope material
once, with a basis and a real range; and every free-text value that failed to parse, including
enclosure wording, reported by value and count so the mapping files can absorb it deliberately.

It also checks that every property name the code relies on and every name the estimate model uses still
resolves (D51); flags an estimate left imprecise beside a usable published value (EST-WIDE), reports one that is
wide because the evidence is thin (EST-THIN, D73), and flags reinforced materials estimated below
their unfilled sibling (EST-FAMILY-ORDER); and lists measured headlines far from their prediction (EST-OUTLIER).

It also checks **cross-record consistency**, not just whether referenced identifiers exist:

- every measurement, profile, price and use record is filed under the material its grade belongs to;
- a material's grade list is its active procurement grades; study and resin-reference grades (Role,
  and an `-R#` suffix) remain outside it;
- every product value cites a measurement of that product, not quarantined, and a material's typical product is one of
  its own;
- each cited record exists and belongs to the material, except deliberately labelled family context
  in use, durability and safety notes;
- each material link cites the right kind of record: a profile or evidence for printing, a source
  for H2C status, evidence for use, durability and safety;
- coverage does not claim absence beside the material's own records or claim evidence it does not
  have, and each Grades coverage row states the true procurement-manufacturer count.

These checks use `coverage-rules.js`, the same domain definitions used by the coverage-consolidation
planner. A correction and its future validator therefore cannot disagree about what “has data” means.

The report counts the chamber gate with its partial-window column, and breaks chamber evidence down
by kind: a published window, a statement in words, no setpoint, nothing, and how many materials carry
a band. It lists every band the evidence superseded.

`build/reports/validation-report.md` is regenerated every build and is a deliverable in its own
right. It tells you what the tool cannot yet see.

An unestimated in-scope headline says why when the cause is known: a material with no Estimate identity, or one with no
row in `data/tables/polymers.csv`, is reported with that fix.

### Stage 6: Contract — `contract.js`

`dist/db.json` and `dist/reference.json` are checked against `schema/db.schema.json` and
`schema/reference.schema.json` (JSON Schema 2020-12). A field the compiler renamed, dropped, retyped
or added without declaring stops the build, reported at its JSON path.

### Stage 7: Bundle — `bundle.js`

Inlines the stylesheet, the plotting library and the application, and embeds both compiled databases
gzipped and base64-encoded.

Replacements use a **function**, never a string. `String.replace` interprets `$&`, `` $` `` and `$1`
in a string replacement, and minified library source is full of such sequences; passing the payload
as a string scattered the matched placeholder tag through the output thirty times. The bundler also
asserts that no source path survived into the output, which is how that failure is caught now.

The build date is the commit date (or `SOURCE_DATE_EPOCH`), never the clock, so the same commit
builds the same bytes. `dist/manifest.json` records the snapshot, build date, commit, whether the tree
was clean, hashes of the data manifest, schema, build rules, mappings and app, and hashes of every
output. Pages publishes it beside the page.

### Verifying a build

```bash
npm run verify                   # verify:fast, audit, review snapshot, interface views, 300 rendered scenarios
npm run build:diff               # what the change did to dist/db.json
open dist/H2C_Material_Selector_*.html
npm run trace -- PETG            # any headline back to its measurement, grade and source
```

The end-to-end check is the worked example from the architecture brief: H2C-relevant, HDT at least
100 °C, modulus at least 3 GPa, density at most 1500 kg/m3, Strict mode. It returns nine candidates,
all reinforced engineering polymers. Every one should explain itself and trace to a MeasurementID, a
GradeID and a SourceID.

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
to prove it embeds those exact payloads. It produces a full record index and 103-filament / 19-family
matrix. It does not assert that all external documents were re-read; live checks belong in the
review's source log. `measurement-rules.js` adds build-stopping numeric and endpoint checks. It also reviews every
per-record build finding against `data/review/accepted-findings.csv` (AUDIT-REVIEW-FINDING, AUDIT-REVIEW-STALE).

`npm run audit:sources` goes further on demand (it needs the network once): it fetches every PDF source cited
by measurements into `.cache/sources/`, checks its SHA-256, and lists every published number and every named
property that has no row, into `docs/audits/2026-09-14-transfer-verification/source-completeness*.csv`. Its first
run found hundreds of values the original transcription had dropped (migrations m13 to m17).

### Review snapshot and interface views

`npm run snapshot` writes `build/snapshot/`: every headline (value, or estimate with its likely and plausible
ranges and the range that may screen), process gates, each template's candidates in Strict, Explore and Explore
with estimates, and every build warning by record. `npm run ui:check` drives the built page in headless Chrome
through the default view, every template in both modes, each shared link reopened, and Compare, and compares what
a reader sees with `build/snapshot/ui/`. Both are checked by `verify`; a change commits its diff.

`npm run ui:fuzz`, the last step of `verify` (300 scenarios; 2,000 on a new seed nightly in CI), runs seeded random scenarios through the built page (every
requirement kind and operator, thresholds at the evidence itself, assumptions, searches, templates) in Strict and
Explore with estimates on and off, reads the table and the Ashby chart, and compares rows, verdicts, count, chips,
points, envelopes, front, legend, rounding, reasons and link round trips with the engine run in Node. 300 scenarios
take about 20 seconds and 2,000 about 2 minutes; `--n 3000 --seed N` runs more. Examples of any violation, each with its seed, scenario and link, go to
`$TMPDIR/h2c-ui-fuzz/violations.jsonl`. The method is in `docs/audits/2026-09-15-filtering-estimates-data/ui-fuzz/NOTES.md`.

`npm run audit:data` also reviews the per-record build findings against `data/review/accepted-findings.csv`
(AUDIT-REVIEW-FINDING, AUDIT-REVIEW-STALE), as `npm run data:lint` reviews lint findings.

The Pages workflow runs `npm run verify`, which includes the audit. Conversion factors are stored at
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
gate, compile and validate. On 2026-09-21 the build was 0.07 s to compile, 13.5 s for the estimate stage and 0.06 s
to validate at 158 materials and 11,096 measurements; doubled, the estimate stage took about 59 s against a budget of
150 s (`test/scale.check.js` keeps the history, and 66 s on 2026-09-25 after phase 5's taxonomy). What the database
holds today is in `build/snapshot/counts.md`. The estimate model dominates, because its Gaussian process is
cubic in observations (D77, D79).

## Further reading

- "The build, stage by stage", above — what each build stage does and what it refuses to do
- `docs/DATA-MODEL.md` — the tables, the registry, the compiled shape, the three kinds of number
- `AGENTS.md` — how to change data: the rules for people and agents
- `docs/INTERFACE.md` — the workflow, the lenses, the visual vocabulary
- `docs/DECISIONS.md` — the decisions that are not obvious, and the bugs that forced them

The systematic audit uses `build/src/measurement-rules.js` for independent raw-value, unit,
applicability and headline checks and `scripts/audit-data.mjs` for reproducible source-to-HTML
verification and record inventories. Both reuse the established pipeline. Retirement is an explicit
grade Status, never a hardcoded exclusion. Estimates may screen but never pass (D43).
