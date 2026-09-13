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
commas from Chinese-language datasheets. A load that was never stated stays unstated; 24 of 66 HDT
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
cites. All 349 reconcile, and all 40 price headlines equal the median of their flagged observations
and cite only those observations. A mismatch is a build error, not a judgement call.

Compile also derives, each tagged with its origin so the interface can tell them apart:

- **Process gates** per material, aggregated across its profiles. Precedence is
  `within > exceeds-recommended > exceeds > unknown`. A known exceedance outranks an unknown,
  because silence is not counter-evidence. PEEK publishes two profiles demanding 390–480 °C against
  the printer's 350 °C plus one that publishes nothing; letting the silent profile decide would have
  reported PEEK as "unknown".
- **Related evidence** for headlines with no value: one real measurement of the same property that
  was never promoted, with the reason. Never a cross-grade range.
- **Facets** the Materials sheet does not carry directly, marked `derived`.
- **A print summary** per material: the widest published nozzle, bed and chamber window across its
  profiles, with the number of profiles behind each. 88 materials have a nozzle window, 90 a bed
  window. It answers "what do I set it to", which was otherwise only in free text one tab deep.
- **A buy summary** per material: one offer chosen from the price observations, ranked by in stock,
  then the observation behind the headline, then anything with a price. 48 materials have one and
  42 had stock on the price sampling date. Quarantined observations are skipped. The retailer URLs were in the workbook from the start and were
  rendered nowhere.
- **Environment category names**, carried through from the mapping file in a heading form ("Acid
  resistance") and a sentence form ("acids"), so the engine can name a category in a reason string
  without importing anything from the interface, and so there is one place to change a name.

## 4. Estimates — `estimates.js`

Runs after every headline is known. Covered in `docs/DATA-MODEL.md` under "Three kinds of number".

## 5. Validate — `validate.js`

Errors stop the build. Warnings do not: they record what the compiled database cannot support, so
the interface can say so rather than implying a certainty it does not have.

Checked: identifier uniqueness; referential integrity across every sheet; quarantined measurements
staying out of every numeric summary; XY never merging with Z; impact in J/m never reconciled with
kJ/m² without specimen geometry; the six excluded materials tripping the envelope gate on their own
evidence; HDT loads either stated at 0.45 MPa or flagged; every family estimate citing a basis, at
least two independent peers and a real range; and every free-text value that failed to parse,
reported by value and count so the mapping files can absorb it deliberately.

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
npm test                         # 77 tests
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
