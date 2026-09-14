# CSV source migration

- **Date:** 2026-09-14
- **Asked by:** the tool's owner, after the [data architecture assessment](../2026-09-13-data-architecture-assessment/REPORT.md)
- **Goal:** a data source that is robust to implement, maintain, debug and scale. Scaling here means
  up to twice the entries, and many new properties, often valid only for some filaments. Editors are
  one person and two AI agents.
- **Branch:** `data/csv-source`, from `main` at `60f7392`. Workbook edits on `main` were frozen for
  the duration; none happened.
- **Status:** complete on the branch; not merged.

## Outcome

The Excel workbooks are replaced by 14 CSV tables under a declared schema. The build, the audit and the
application read nothing else. The compiled database is the workbook build's output with 24 listed
differences, each with its reason (below). The application looks and behaves the same, apart from two
deliberate corrections in the material drawer.

| Goal | What now provides it |
|---|---|
| Implementing | `npm run verify` is one gate for people, agents, the pre-commit hook and CI. `AGENTS.md` gives the rules and a recipe for every common change. The scripted-edit API refuses to overwrite data that has moved. |
| Maintaining | Each change is a readable row diff, and `npm run data:diff` writes the changelog. Each fact has one home: headline values, medians, per-kg prices, grade lists, environmental evidence and guidance are calculated. There are no ID lists inside cells and no expected row counts to edit. |
| Debugging | Every data error names file, line, record and field, in about 200 ms. `npm run trace` follows a headline to its measurement, grade and source. Builds are reproducible, and `dist/manifest.json` records inputs and outputs. |
| Scaling entries | A new material, grade or measurement is rows only. At twice today's data the gate takes 0.3 s and compile plus validate about 10 s (`test/scale.test.js`). |
| Scaling properties | A property or headline is a registry row, and "Applies to" limits it to some filaments. `test/new-property.test.js` adds an elastomer-only Shore A hardness with data alone and follows it through every view. |

Decisions: [D45](../../DECISIONS.md#d45-the-source-of-truth-is-csv-tables-under-a-declared-schema)
(the source), [D46](../../DECISIONS.md#d46-a-property-is-a-registry-row-and-may-apply-to-some-filaments-only)
(the registry) and [D47](../../DECISIONS.md#d47-what-can-be-calculated-is-not-stored) (derived values).

## How it was proven

1. **Byte-identical first.** The workbook was dumped through the production extractor. The first CSV
   build reproduced the baseline `db.json`, `reference.json`, HTML and validation report byte for byte
   (`.migration/baseline/HASHES.json`).
2. **Every later step against the oracle.** The baseline outputs are kept in
   `.migration/baseline/*.json.gz`. Each migration step had to reproduce them exactly, or add each
   difference to `scripts/migrate/explained-differences.json` with its step and reason. A stored value
   became derived only after its migration proved the derivation equal for every row.
3. **Replayable.** The conversion is code (`scripts/migrate/`: dump, then m01 to m06). `npm run
   migration:verify` reads the workbooks from git at `60f7392`, replays the chain, and confirms it
   reproduces `data/tables` at `35ba8d2` byte for byte. It also confirms the compiled tables still
   carry only the 24 explained differences. Result at cutover: both hold.
4. **In the browser.** Headless Chrome opened the baseline build and the branch build and compared the
   text of the filter rail, table, all six lenses and every drawer tab for four materials. Everything
   is identical except the two drawer corrections below.

## The steps

| Commit | Step |
|---|---|
| `2903425` | Workbooks dumped to CSV; loader returns the extractor's row objects; output byte-identical |
| `a633817` | Schemas, vocabularies and manifest; `data:fmt`, `data:check`, `data:new-id`, `data:diff`, `trace`, `verify`; pre-commit hook and CI |
| `f98fdf4` | m01: canonical numbers, dates and booleans (4,495 values) |
| `482045e` | m02: headline values replaced by `headlines.csv` selections |
| `575a836` | m03: per-kg prices and price headlines calculated |
| `278f10a` | m04: grade Role and Status; grade lists derived |
| `beefbe7` | m05: `material_links.csv`; environmental evidence and guidance derived |
| `d8d1e6c` | Grade IDs inside "Applicable grades" prose checked |
| `35ba8d2` | m06: property registry, read by the build |
| `f2ffeb7` | The interface built from the registry |
| `9ff4816` | Runtime contract, reproducible builds, release manifest, 2× scale check |
| `32e05c0` | Read-only review workbook |
| `03e09e4` | Cutover: workbooks and XML editor removed; migration tests become `migration:verify` |

Tests went from 131 to 169. None of the original tests was weakened. Four count pins that would break
on any legitimate addition now follow the data, and still guard against losing audited records.

## What changed in the output

| Step | Differences | Why |
|---|---:|---|
| m01 | 4 | Four source access dates stored by Excel as date-times (`2026-09-11 00:00:00`) are dates. |
| m03 | 1 | PAHT-CF's price is 124.49, not 124.48. The median of 127.98 and 120.99 is 124.485; the typed value was that median rounded down by floating point, and the old build accepted it within half a cent. |
| m05 | 18 | TPU (M039) and PA6-GF (M051) list the same environmental records in evidence-table order rather than the order they were typed. The set is unchanged, and this was checked. |
| m06 | 1 | The database gains a `registry` block. It is additive; its content is checked against the constants it replaced. |

In the interface, the drawer now uses the shared registry:

- The Overview hints for elongation and price match the filter rail. The drawer had said elongation
  "high means tough, low means brittle", which the shared label exists to correct.
- The Mechanical and Thermal tabs list five properties that coverage already counted in those
  domains: tensile strain at strength, flexural elongation at break, flexural stress at conventional
  deflection, Izod impact strength and continuous service temperature. They were previously visible
  only under Evidence.

## Found along the way

- **The build read stale formula caches.** 139 normalized-value cells cached "Not published" where their
  formula would give "Not applicable". The dump kept what the build had been reading; the formulas no
  longer exist.
- **An undocumented value shape.** A published bound (`>` or `<`) compiles to `{lo, hi, openLow}` or
  `{lo, hi, openHigh}` with no `kind`. The runtime contract now describes it, so the app's handling of
  it is pinned.
- **A silent scaling hazard in the estimate model.** A polymer blend is identified by its name, so a new
  blend had no identity and no estimate, reported only as "no value, no estimate". The build now names
  the missing identity and the fix.
- **Calibration cost.** The estimate model rebuilt an n×n inverse for every calibration hold-out. It now
  computes the two vectors it needs, with estimates unchanged; at twice the data this took compile from
  13.6 s to about 10 s.
- **A trace bug**, introduced and fixed during the work: `trace` crashed on price headlines.

## Where it deliberately differs from the plan

| Plan | Done instead | Why |
|---|---|---|
| Formatter sorts rows by key | Keeps row order | The compiled arrays, and the grade and profile lists in the app, follow file order; sorting would have changed them. |
| A temporary legacy-view adapter kept `compile.js` unchanged during the data-model steps | `compile.js` changed with each step | Each step's oracle proof covered it with less throwaway code. |
| Properties get slug IDs | The registry is keyed by the exact property name measurements use | No churn; names are unique and readable. Merging synonyms (Izod strength, Izod impact strength, Impact strength) is a data decision left for review, not a migration step. |
| A known-findings file for unit anomalies | Not needed | The one Izod row in °C is already quarantined, so the new unit rule exempts it. |
| `Applicable grades` becomes a link table | Stays prose, with every grade ID it mentions checked | Its text carries scope notes ("Family / scope guidance", "re-filed from ..."). A profile's `H2C SourceID` likewise stays a checked list. |
| Estimate property-name logic from the registry | Estimated keys come from the registry; conversions stay in code | Conversions between properties are physics. A registry row cannot switch estimation on without them. |
| Optional SQLite query tool | Not built | `trace` covers the debugging need, with no second representation. |
| Review workbook with frozen panes | Filters and column widths, no frozen panes | The pinned SheetJS community edition cannot write panes. |

## Limits and what to watch

- **Build time grows faster than the data.** The estimate model's Gaussian process is cubic in
  observations: compile takes about 2 s today and about 10 s at twice the data. Tests compile the data
  about a dozen times, so at twice the data the suite (31 s today) would take a few minutes. Sharing
  one compiled database between those tests is the first fix if that becomes a nuisance.
- **The pre-commit hook is per clone.** Run `npm run hooks` once; it sets `core.hooksPath` for the
  repository (it is set in this checkout). A commit made with `--no-verify` is still caught by CI.
- **`migration:verify` is historical.** Its oracle check holds only while the build code compiles the
  `35ba8d2` tables the same way. It is the evidence for this migration, not a standing test.
- **Excel is read-only.** Editing happens in the CSV tables, directly or through the edit API. If
  editing in Excel ever becomes necessary, an import with a diff and a base-hash guard is the safe
  design; it was not built.
- **Warnings and open items are unchanged.** The six standing validation warnings, and the open ruling in
  the [filtering robustness audit](../2026-09-14-filtering-robustness/REPORT.md), are as they were.

## To merge

Nothing is pushed. When the owner decides:

```bash
git switch main && git merge --no-ff data/csv-source    # in the main checkout
npm ci --prefix build && npm run hooks && npm run verify
```

`pages.yml` then runs `npm run verify` and publishes the page with its manifest.
