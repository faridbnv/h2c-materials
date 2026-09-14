# The build pipeline

```
npm run build          full build, ending in a distributable HTML file
npm run validate       stops after the report; writes no dist artefacts
npm test               engine, parser, search and compiled-database tests
```

Everything runs from `build/src/index.js`. The build is deterministic and **fails on any validation
error**, so a database that has drifted cannot reach a distributable file.

---

## 1. Extract — `extract.js`

Reads both workbooks into raw row objects. No interpretation happens here: every cell arrives as the
string it displays, so that `"Not published"` and a number remain distinguishable downstream.

Header rows were confirmed against the workbook's own embedded table definitions. Materials declares
`A6:AQ108`; every other table starts at `A3`. Expected row counts are asserted, so if the frozen
source moves, the build says so rather than silently compiling less data.

The reference workbook needs its own reader: its sheet range does not start at column A, its
category column only repeats on the first row of each block, and its header is three deep. It
locates the `Name` cell and works in offsets from there rather than assuming positions.

## 2. Normalize — `normalize/`

Where the workbook's free text becomes machine-readable. This is the largest and most error-prone
stage, and the one the architecture brief does not mention at all.

**Missing states** (`values.js`). Four states that must never collapse into each other or into zero:
not published, insufficient comparable data, not applicable, quarantined. Plus a fifth for price,
where "not available in the sampled Canadian market" is a different statement from "not published".

**Intervals** (`values.js`). What a measurement actually asserts: a point, a range, a value plus
uncertainty, or a bound from a `>` or `<` operator. Unbounded ends are `null`, not `Infinity`,
because this is serialised to JSON and `JSON.stringify` would turn Infinity into null anyway.

**Direction** (`direction.js`). Nine spellings onto canonical values. Three of them are the source's
own words rather than a confirmed build orientation, so `Horizontal (source label)` gets its own
value and never merges into XY. The Method sheet's rule: an unknown direction is not XY.

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
map in `build/mappings/environment-topics.json` that is reviewed like code. That file also carries
each category's display names, which is why it is the only place a category is named. The sheet runs
two overlapping source vocabularies for the same chemistry, `Resistance to Acid` alongside `Effect
of weak acids`; they merge but keep their strength qualifier, because a source that distinguished
weak from strong said more than one that did not.

## 3. Compile — `compile.js`

Assembles the relational runtime database, and does the one thing that matters most:

> **Headline values are verified against their own citations, never recomputed.**

The Materials sheet already carries the MeasurementID behind each headline, the PriceIDs behind each
price, and a ProfileID for printing. The build checks that the number equals the measurement it
cites. All 380 reconcile, and all 40 price headlines equal the median of their flagged observations
and cite only those observations. A mismatch is a build error, not a judgement call.

Compile also derives, each tagged with its origin so the interface can tell them apart:

- **Process gates** per material, aggregated across its profiles. Precedence is
  `within > partial > exceeds-recommended > exceeds > unknown`. A known exceedance outranks an
  unknown, because silence is not counter-evidence. PEEK publishes two profiles demanding 390–480 °C
  against the printer's 350 °C plus one that publishes nothing; letting the silent profile decide
  would have reported PEEK as "unknown". Among unknowns, a profile that said something in words
  supplies the reason.
- **Related evidence** for headlines with no value: one real measurement of the same property that
  was never promoted, with the reason. Never a cross-grade range.
- **Facets** the Materials sheet does not carry directly, marked `derived`.
- **A print summary** per material: the widest published nozzle, bed and chamber window across its
  profiles, with the number of profiles behind each. 95 materials have a nozzle window, 96 a bed
  window and 59 a chamber window. It answers "what do I set it to", which was otherwise only in free
  text one tab deep. Where the chamber is answered in words, the strongest statement across the
  profiles is kept as `chamberGuidance`: not required, then recommended, then no setpoint.
- **A buy summary** per material: one offer chosen from the price observations, ranked by in stock,
  then the observation behind the headline, then anything with a price. 48 materials have one and
  42 had stock on the price sampling date. Quarantined observations are skipped. The retailer URLs were in the workbook from the start and were
  rendered nowhere.
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

Chamber bands are not computed. They are read from `build/mappings/chamber-estimates.json`, where
the 2026-09-13 research's bands are authored with its basis and caution, and attached only to a
material with no published window and no statement that no heated chamber is needed. Every name is
checked against the snapshot, and a name that is not there stops the build. They change no verdict;
see `docs/DATA-MODEL.md` under "Chamber evidence".

## 5. Validate — `validate.js`

Errors stop the build. Warnings do not: they record what the compiled database cannot support, so
the interface can say so rather than implying a certainty it does not have.

Checked: identifier uniqueness; referential integrity across every sheet; quarantined measurements
staying out of every numeric summary; XY never merging with Z; impact in J/m never reconciled with
kJ/m² without specimen geometry; the six excluded materials tripping the envelope gate on their own
evidence; HDT loads either stated at 0.45 MPa or flagged; every in-scope headline carrying a value,
an estimate or a not-applicable reason; every estimate nesting its likely range inside its plausible
range and citing only its own material's or representative product's measurements; each headline's
likely range holding 80% (±10 points) and its plausible range at least 90% of hidden measured
headlines; retired grades marked with the exact
Method phrase; every chamber band naming a real, in-scope material
once, with a basis and a real range; and every free-text value that failed to parse, including
enclosure wording, reported by value and count so the mapping files can absorb it deliberately.

It also checks **cross-record consistency**, not just whether referenced identifiers exist:

- every measurement, profile, price and use record is filed under the material its grade belongs to;
- `GradeIDs` contains every procurement grade, while supplemental study grades with an `-R#` suffix
  remain outside that procurement list;
- every measured headline belongs to its material and its representative grade;
- each cited record exists and belongs to the material, except deliberately labelled family context
  in use, durability and safety notes;
- nozzle, bed and chamber guidance quotes the cited print profile;
- `Environmental evidence` is exactly the material's own exposure, solubility and moisture records;
- coverage does not claim absence beside the material's own records or claim evidence it does not
  have, and each Grades coverage row states the true procurement-manufacturer count.

These checks use `coverage-rules.js`, the same domain definitions used by the coverage-consolidation
planner. A correction and its future validator therefore cannot disagree about what “has data” means.

The report counts the chamber gate with its partial-window column, and breaks chamber evidence down
by kind: a published window, a statement in words, no setpoint, nothing, and how many materials carry
a band. It lists every band the evidence superseded.

`build/reports/validation-report.md` is regenerated every build and is a deliverable in its own
right. It tells you what the tool cannot yet see.

## 6. Bundle — `bundle.js`

Inlines the stylesheet, the plotting library and the application, and embeds both compiled databases
gzipped and base64-encoded.

Replacements use a **function**, never a string. `String.replace` interprets `$&`, `` $` `` and `$1`
in a string replacement, and minified library source is full of such sequences; passing the payload
as a string scattered the matched placeholder tag through the output thirty times. The bundler also
asserts that no source path survived into the output, which is how that failure is caught now.

## Verifying a build

```bash
npm run build                    # must report 0 errors
npm test                         # 122 tests
open dist/H2C_Material_Selector_2026-09-13.html
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
then reuses the production extractor/compiler/validator and writes `build/reports/data-audit/`.
Pass an output directory to archive a review. The audit independently reconciles numeric raw values,
checks explicit source-grade scope, regenerates both workbook payloads, and decompresses the HTML
to prove it embeds those exact payloads. It produces a full record index and 102-filament / 19-family
matrix. It does not assert that all external documents were re-read; live checks belong in the
review's source log. `measurement-rules.js` adds build-stopping numeric and endpoint checks.

The Pages workflow runs the data audit after tests. Exact native conversion-factor values are retained
by extraction for formula checks; formatted display strings alone can round small factors.
