# The build pipeline

```
npm run verify         everything a commit needs: format, schema, lint, docs, build, tests, audit, review snapshot, interface views
npm run data:check     the schema gate alone, in under a second
npm run build          full build, ending in a distributable HTML file and its manifest
npm run validate       stops after the report; writes no dist artefacts
npm test               builds, then engine, data, registry, contract, scale and database tests
```

Everything runs from `build/src/index.js`. The build is deterministic and **fails on any validation
error**, so a database that has drifted cannot reach a distributable file.

---

## 0. Check — `schema.js`

Before anything is read for meaning, every table under `data/tables/` is checked against
`schema/tables/<table>.schema.json`: the columns and their order, each value's type, required values,
the explicit missing states a field accepts, patterns, controlled vocabularies (`schema/vocab/`),
uniqueness, and references between tables, including each item of a list and each grade ID written
into prose. Files must be in canonical CSV form and `data/manifest.json` (row count and SHA-256 per
table) must be current, so a count change is visible in the commit that makes it. Any violation stops
the build with the file, line, record and field. The whole check takes about 200 ms.

## 1. Load — `load.js`

Reads the tables into raw row objects, one set per table under the name the compiler addresses it by.
No interpretation happens here: a value is its trimmed text or null, so `"Not published"` and a number
remain distinguishable downstream. Each row carries its file and line for error messages.

## 2. Normalize — `normalize/`

Where the sources' free text becomes machine-readable. This is the largest and most error-prone
stage, and the one the architecture brief does not mention at all.

**Missing states** (`values.js`). Four states that must never collapse into each other or into zero:
not published, insufficient comparable data, not applicable, quarantined. Plus a fifth for price,
where "not available in the sampled Canadian market" is a different statement from "not published".

**Intervals** (`values.js`). What a measurement actually asserts: a point, a range, a value plus
uncertainty, or a bound from a `>` or `<` operator. Unbounded ends are `null`, not `Infinity`,
because this is serialised to JSON and `JSON.stringify` would turn Infinity into null anyway.

**Direction** (`direction.js`). Nine spellings onto canonical values. Three of them are the source's
own words rather than a confirmed build orientation, so `Horizontal (source label)` gets its own
value and never merges into XY. The Method table's rule: an unknown direction is not XY.

**Thermal** (`thermal.js`). About twenty spellings of HDT standard and load, including full-width
commas from Chinese-language datasheets. A load that was never stated stays unstated; 25 of 69 HDT
headlines are in that position and carry `loadStated: false`.

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

## 3. Compile — `compile.js`

Assembles the relational runtime database, and does the one thing that matters most:

> **A headline is a selected measurement, never a number typed a second time.**

`headlines.csv` names the MeasurementID behind each headline; the value is read from that
measurement. The build checks the selection against the headline's definition in
`headline_definitions.csv`: an active numeric measurement of this material, on its representative
grade, of an allowed property, in the headline's unit and direction. A selection that fails any of
these is a build error naming the material and the reason. A headline limited by "Applies to" is not
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
  was never promoted, with the reason. Never a cross-grade range.
- **Facets** the Materials table does not carry directly, marked `derived`.
- **A print summary** per material: the widest published nozzle, bed and chamber window across its
  profiles, with the number of profiles behind each. 93 materials have a nozzle window, 93 a bed
  window and 58 a chamber window. It answers "what do I set it to", which was otherwise only in free
  text one tab deep. Where the chamber is answered in words, the strongest statement across the
  profiles is kept as `chamberGuidance`: not required, then recommended, then no setpoint.
- **A buy summary** per material: one offer chosen from the price observations, ranked by in stock,
  then the observation behind the headline, then anything with a price. 48 materials have one and
  42 had stock on the price sampling date. Quarantined observations are skipped. The retailer URLs were in the data from the start and were
  rendered nowhere.
- **The registry** (`db.registry`): every property's domain, units and applicability, and every
  headline's definition and labels, so the interface builds its filters, axes, table, export and
  drawer tabs from data.
- **Environment category names**, carried through from the mapping file in a heading form ("Acid
  resistance") and a sentence form ("acids"), so the engine can name a category in a reason string
  without importing anything from the interface, and so there is one place to change a name.

## 4. Estimates — `estimates.js`, `print-estimates.js` and `chamber-estimates.js`

Runs after every headline is known, in about two seconds. For each headline it rejects physically
impossible values, converts every observation of every in-scope material to the headline's semantics
(conversions documented in `build/mappings/estimate-model.json`, refined by grades that publish both),
measures the spread between products of one material directly, estimates the remaining spreads from
the data above documented floors, and fits one Gaussian model. It then hides each measured headline,
predicts it, and scales the likely (80%) and plausible (95%) ranges to the coverage actually achieved.
Every missing headline gets an estimate with its evidence, precision and screening ability, or a
not-applicable reason. Diagnostics (calibration, conversions, spreads, rejected values, conflicting
evidence, outlying headlines) go to `meta.estimateModel`. `docs/DATA-MODEL.md` explains the model
under "Estimates"; DECISIONS D43 says why.

`print-estimates.js` then infers a nozzle and bed window for a material that publishes neither, from
the same polymer or its chemical group, shifted for fibre and kept above the melting point.

Chamber bands are not computed. They are read from `data/tables/chamber_bands.csv`, one row per material by MaterialID, where
the 2026-09-13 research's bands are authored with its basis and caution, and attached only to a
material with no published window and no statement that no heated chamber is needed. Every name is
checked against the snapshot, and a name that is not there stops the build. They change no verdict;
see `docs/DATA-MODEL.md` under "Chamber evidence".

## 5. Validate — `validate.js`

Errors stop the build. Warnings do not: they record what the compiled database cannot support, so
the interface can say so rather than implying a certainty it does not have.

Checked: identifier uniqueness; referential integrity across every table; every measurement of a
registered property, in one of its units, of a material the property applies to; quarantined measurements
staying out of every numeric summary; XY never merging with Z; impact in J/m never reconciled with
kJ/m² without specimen geometry; scope and H2C status agreeing about exclusion; HDT loads either stated at 0.45 MPa or flagged; every in-scope headline carrying a value,
an estimate or a not-applicable reason; every estimate nesting its likely range inside its plausible
range and citing only its own material's or representative product's measurements; each headline's
likely range holding 80% (±10 points) and its plausible range at least 90% of hidden measured
headlines; a retirement finished on both Status and Availability; grade roles agreeing with the -R#
ID suffix; every chamber band naming a real, in-scope material
once, with a basis and a real range; and every free-text value that failed to parse, including
enclosure wording, reported by value and count so the mapping files can absorb it deliberately.

It also checks **cross-record consistency**, not just whether referenced identifiers exist:

- every measurement, profile, price and use record is filed under the material its grade belongs to;
- a material's grade list is its active procurement grades; study and resin-reference grades (Role,
  and an `-R#` suffix) remain outside it;
- every measured headline belongs to its material and its representative grade;
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

An unestimated in-scope headline says why when the cause is known: a material whose identity (its base
polymer, or a blend's name) has no entry in `build/mappings/estimate-model.json` is reported with that
fix.

## 6. Contract — `contract.js`

`dist/db.json` and `dist/reference.json` are checked against `schema/db.schema.json` and
`schema/reference.schema.json` (JSON Schema 2020-12). A field the compiler renamed, dropped, retyped
or added without declaring stops the build, reported at its JSON path.

## 7. Bundle — `bundle.js`

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

## Verifying a build

```bash
npm run verify                   # format, schema, lint, docs, build, tests, audit, review snapshot, interface views
open dist/H2C_Material_Selector_2026-09-13.html
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

## Systematic data audit

`npm test` always builds current inputs before the database tests. `npm run audit:data` also builds,
then reuses the production loader/compiler/validator and writes `build/reports/data-audit/`.
Pass an output directory to archive a review. The audit independently reconciles numeric raw values,
checks explicit source-grade scope, recompiles both payloads from the tables, and decompresses the HTML
to prove it embeds those exact payloads. It produces a full record index and 102-filament / 19-family
matrix. It does not assert that all external documents were re-read; live checks belong in the
review's source log. `measurement-rules.js` adds build-stopping numeric and endpoint checks.

`npm run audit:sources` goes further on demand (it needs the network once): it fetches every PDF source cited
by measurements into `.cache/sources/`, checks its SHA-256, and lists every published number and every named
property that has no row, into `docs/audits/2026-09-14-transfer-verification/source-completeness*.csv`. Its first
run found hundreds of values the original transcription had dropped (migrations m13 to m17).

## Review snapshot and interface views

`npm run snapshot` writes `build/snapshot/`: every headline (value, or estimate with its likely and plausible
ranges and the range that may screen), process gates, each template's candidates in Strict, Explore and Explore
with estimates, and every build warning by record. `npm run ui:check` drives the built page in headless Chrome
through the default view, every template in both modes, each shared link reopened, and Compare, and compares what
a reader sees with `build/snapshot/ui/`. Both are checked by `verify`; a change commits its diff.

The Pages workflow runs `npm run verify`, which includes the audit. Conversion factors are stored at
full precision in `measurements.csv`, so the raw-value reconciliation reads exactly the factor applied.

## Scale

`test/scale.test.js` doubles the data (every material and its records cloned under new IDs) and runs the
gate, compile and validate: about 0.3 s and 10 s at 199 materials and 3,979 measurements, against 0.2 s
and 2 s today. The estimate model dominates, because its Gaussian process is cubic in observations.
