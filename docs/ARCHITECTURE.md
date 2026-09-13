# Architecture

## The shape of the thing

Three layers, separated on purpose, each with a rule about what it may not do.

```
  data/H2C_FDM_Material_Database.xlsx     the frozen authoring source of truth
  data/Generic_Materials_Reference.xlsx   an Ashby baseline, never a candidate
            |
            |   BUILD   node, runs once, deterministic, fails loudly
            |           build/src/
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

## Why a build step, rather than reading the workbook in the browser

A browser can parse XLSX. Doing so would couple the interface to the workbook's layout, push
validation failures into the user's session, and make the output non-deterministic. Excel is an
authoring format; JSON is the compiled runtime representation. The workbook is never written by
anything in this repository.

The build is also where the project's discipline lives. It fails on any validation error, so a
database that has drifted cannot reach a distributable file at all.

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
| `extract.js` | Read both workbooks into raw row objects. No interpretation. |
| `normalize/values.js` | Numbers, missing states, operators, intervals. Everything downstream depends on these staying distinct. |
| `normalize/direction.js` | The nine spellings of build direction, and which may be compared with which. |
| `normalize/thermal.js` | HDT standard and load out of about twenty spellings of free text. |
| `normalize/process.js` | Nozzle, bed and chamber temperatures, nozzle diameters, drying, abrasion. |
| `normalize/chemical.js` | 73 environment topics onto canonical categories; findings onto verdicts. |
| `normalize/provenance.js` | The origin tag every derived value carries. |
| `compile.js` | Assemble the relational runtime database and verify every headline against its own citation. |
| `estimates.js` | Family bounds for materials with no measurement of their own. |
| `reference.js` | The generic-material baseline layer, compiled separately on purpose. |
| `validate.js` | Every invariant, plus the human-readable report. |
| `bundle.js` | One HTML file. |
| `index.js` | Runs the stages and decides whether the build may proceed. |

### Engine, `app/js/engine/`

| Module | Responsibility |
|---|---|
| `constraints.js` | The four-state evaluator, the unknown-data policies, ranked exclusions. The heart of the tool. |
| `indices.js` | The Ashby performance-index library, their slopes and their caveats. |
| `pareto.js` | Non-dominated sets over the current candidates and axes. |
| `coverage.js` | What the database knows and does not, per material and per domain. |
| `scenario.js` | The user's question, serialised: shareable link, saved file, user assumptions. |
| `search.js` | Catalogue search. Its own module because the obvious implementation matches "PLA" inside "thermoplastic". |

### Interface, `app/js/ui/`

| Module | Responsibility |
|---|---|
| `labels.js` | The single vocabulary. What every property and every criterion is called, in plain words with the technical name behind it. Nothing else names them. |
| `format.js` | The single place a value becomes text. Owns the visual distinction between measured, related and estimated. |
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

**A new lens that draws numbers.** Decide what it does with an estimate before you write it. Three
lenses drew only measured headlines and silently dropped a quarter of the candidates; an estimate is
a range, so it is drawn as a range, counted where it cannot be drawn, and never allowed to dominate
a measured value.

**A new selectable property.** Add it to the headline list in `compile.js`, to `PROPERTY` in
`ui/labels.js` with its plain name and unit, to `AXIS_DEFS` in `ui/axes.js` with its measurement
mapping, to the numeric controls in `ui/filters.js`, and to `ESTIMATE_KEYS` in `estimates.js` if a
family bound makes sense for it. The engine needs no change: it works off whatever headline keys
exist.

**A new constraint kind.** Add a branch in `evaluateConstraint` and a matching control. Return the
same result shape, including `criterion` and `reason`, or the explain panel will have nothing to
say. Then add a case to `describeConstraint` in `ui/labels.js`: that function is what the pills, the
explain panel, the why list, the excluded-search group and the CSV export all use, and a missing
case is how an internal key reaches the screen.

**A new word for something.** It goes in `ui/labels.js` and nowhere else. Environment category names
are the exception, and only because they belong with the topic rules: they are authored in
`build/mappings/environment-topics.json` and compiled into the snapshot, so the engine can name a
category without importing anything from `ui/`.

**A new lens.** Add it to `renderLens` in `main.js` and to the lens bar in `app/index.html`. Read
`state.rows`; never re-filter.

## Further reading

- `docs/PIPELINE.md` — what each build stage does and what it refuses to do
- `docs/DATA-MODEL.md` — the entities, the compiled shape, the three kinds of number
- `docs/INTERFACE.md` — the workflow, the lenses, the visual vocabulary
- `docs/DECISIONS.md` — the decisions that are not obvious, and the bugs that forced them
