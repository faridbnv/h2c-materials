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
place; it exists because a question that spans records is a join, not a script.

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
Raw it is about 3 MB, almost all of it repeated condition strings; gzipped it is under 200 KB. The
plotting library, not the data, is what the file weighs.

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
| `compile.js` | Assemble the relational runtime database. Each headline is the measurement `headlines.csv` selects, checked against its definition and its state (printed, dry, as printed, not flagged implausible); implied bounds come from printed values only (D55). |
| `coverage-rules.js` | Define, once, what counts as a material's own mechanical, thermal, print, environmental and price data; used by planning and validation. |
| `pipeline.js` | The stages every caller runs (the build, the snapshot, the audit, the trace, the tests): compile, the estimate stage, validate. `estimates: false` builds the core database alone, and it must validate. |
| `estimate/` | The estimate stage, applied to the compiled database as an overlay (D58): one calibrated Gaussian model per headline over every observation, converted to the headline, configured by `build/mappings/estimate-model.json` (conversions, limits, the fit's judgements) and the tables it reads (`polymers.csv`, a material's Estimate identity and Variant class, Shore hardness measurements; D43, D53, D60), following printing physics (D56) and bounded by what the material's own printed data prove (D55); the screening back-test that decides which evidence may screen (D48); estimated nozzle and bed windows, which decide nothing. `model.js` configuration and shared names, `numerics.js`, `observations.js` conversion kinds and the snapshot, `conversions.js`, `gaussian.js` kernel, fit and prediction, `calibration.js`, `bounds.js` ranges and their limits, `screening.js`, `print.js`, `validate.js` its checks and report section, `index.js` the stage. |
| `chamber-estimates.js` | The research's chamber bands, from `data/tables/chamber_bands.csv`. Attached only where nothing better exists; they decide nothing. |
| `polymer-environment.js` | A base polymer's published environmental behaviour, from `data/tables/polymer_environment.csv` (D64): compiled with its refusals, one verdict per category by the documented rule, attached as inferred records (`db.polymerEvidence`, `evidenceIds.polymer`) only where a material has no record of its own. Core evidence, not the estimate stage, but marked inferred and removable: an empty table leaves the database untouched. |
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
| `docs-decisions.mjs` | The index at the head of `docs/DECISIONS.md`: every decision and whether it still holds. |
| `data/new.mjs`, `data/retire.mjs`, `data/records.mjs` | `npm run data:new`: a complete new row (next ID, template, missing states); `npm run data:retire`: a grade retired with every dependent record listed. |
| `data/lint.mjs` | `npm run data:lint`: quality findings (`build/src/lint-rules.js`) against the reasoned baseline `data/review/accepted-findings.csv`; `--accept` also accepts per-record build findings. |
| `data/review-findings.mjs` | The per-record build findings (EST-OUTLIER, EST-WIDE, EST-FAMILY-ORDER, HDT-LOAD-UNSTATED, NO-MEASUREMENTS) a reviewer must fix or accept; `audit-data.mjs` checks them (D57). EST-THIN is informational and is not among them (D73). |
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

`npm run verify:fast` runs format, schema, lint, generated docs, build and tests, in about 25 seconds, while you work.
`npm run verify` adds the audit, review snapshot, interface views and 300 rendered scenarios, before a commit. The
pre-commit hook (`npm run hooks` installs it) runs the data checks on any commit touching `data/` or
`schema/`, CI runs `verify` on every push and 2,000 rendered scenarios on a new seed every night, and
`npm run build:diff` shows what a change did to the compiled database. `AGENTS.md` is the editing guide.

### Engine, `app/js/engine/`

| Module | Responsibility |
|---|---|
| `constraints.js` | The four-state evaluator, the unknown-data policies, ranked exclusions. The heart of the tool. |
| `indices.js` | The Ashby performance-index library, their slopes and their caveats. |
| `pareto.js` | Non-dominated sets over the current candidates and axes. |
| `coverage.js` | What the database knows and does not, per material and per domain. |
| `scenario.js` | The user's question, serialised: shareable link, saved file, user assumptions. Validation leaves out, with a warning, what the build cannot evaluate. |
| `search.js` | Catalogue search. Its own module because the obvious implementation matches "PLA" inside "thermoplastic". |

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

**A new selectable property (headline).** A row in `data/tables/headline_definitions.csv`, then a
value row in `headlines.csv` for each material that has one. The filter rail, charts, table, export,
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

**A new gate verdict.** Add it to `GATE_PRECEDENCE` in `build/src/compile.js`, to the switch in
`evaluateGate` in `app/js/engine/constraints.js`, and to `GATE_VERDICT` in `ui/labels.js`, which is
where the table, drawer and Compare read its chip and its words. `partial` was the last one added, and
three screens each had their own copy of that table until then.

**A new word for something.** It goes in `ui/labels.js` and nowhere else. Environment category names
are the exception, and only because they belong with the topic rules: they are authored in
`schema/vocab/environment-categories.csv` and `environment-topics.csv` and compiled into the snapshot, so the engine can name a
category without importing anything from `ui/`.

**A new lens.** Add it to `renderLens` in `main.js` and to the lens bar in `app/index.html`. Read
`state.rows`; never re-filter.

## Further reading

- `docs/PIPELINE.md` — what each build stage does and what it refuses to do
- `docs/DATA-MODEL.md` — the tables, the registry, the compiled shape, the three kinds of number
- `AGENTS.md` — how to change data: the rules for people and agents
- `docs/INTERFACE.md` — the workflow, the lenses, the visual vocabulary
- `docs/DECISIONS.md` — the decisions that are not obvious, and the bugs that forced them

The systematic audit uses `build/src/measurement-rules.js` for independent raw-value, unit,
applicability and headline checks and `scripts/audit-data.mjs` for reproducible source-to-HTML
verification and record inventories. Both reuse the established pipeline. Retirement is an explicit
grade Status, never a hardcoded exclusion. Estimates may screen but never pass (D43).
