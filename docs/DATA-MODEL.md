# The data model

## The source workbook

`data/H2C_FDM_Material_Database.xlsx` is relational, not a flat table, and the tool preserves that. Nine
sheets, each an Excel table with declared columns.

| Sheet | Rows | What it holds |
|---|---:|---|
| Materials | 102 | Canonical identities and headline observations |
| Grades | 140 | Exact commercial formulations, tied to materials |
| Print setup | 160 | Processing guidance and H2C routing, per grade |
| Properties | 1,899 | Individual property measurements, the unit of quantitative evidence |
| Use & durability | 380 | Chemical, environmental and application evidence |
| Prices CA | 104 | Canadian price observations |
| Sources | 224 | The source register, with access dates and hashes |
| Coverage | 1,116 | Gaps, conflicts and unresolved items |
| Method | 42 | The rules the database was built under |

Counts are for snapshot 2026-09-13, after the manufacturer evidence audit in
[audits/2026-09-13-manufacturer-evidence/](audits/2026-09-13-manufacturer-evidence/). The build
holds these numbers in `build/src/extract.js` and refuses to run when the workbook moves, so a
changed workbook is always a deliberate, reviewed change to the tool.

Referential integrity across all of it is perfect: sixteen cross-sheet checks over MaterialID,
GradeID and SourceID return zero unknown references. That is why the validator spends its effort on
text normalization instead.

### The Method sheet is executable

It is not prose. Its Scope / Snapshot row dates the database, and the build reads the date from
there for every label and filename. It defines the H2C hardware baseline (350 °C nozzle, 120 °C bed, 65 °C chamber),
the unit conversions, the quarantine rule, the price median rule, the direction rule, and the
distinction between shared commercial evidence and independent tests. The build implements it, the
code cites it by section, and it is compiled into `db.json` so the application can quote it.

## The compiled database

`dist/db.json`. Entities keep their workbook shape; nothing is flattened into one wide table.

```
meta         snapshot, build, price sampling date, counts, H2C baseline, coverage
             summaries, environment category names and what each can decide
materials    102   the selection-level object
grades       140   materials 1 -- N grades
measurements 1899  materials 1 -- N, grades 1 -- N, sources N -- 1
profiles     160   print setup, with parsed temperatures and gate verdicts
evidence     380   use and durability, classified
prices       104   quarantined observations kept as an audit trail, backing nothing
sources      224
coverage     1116  terminal: reports gaps, never feeds selection
method        42   the rules, verbatim
```

### A material

```js
{
  id, name, fullName, abbreviation, normalizedName,
  family, basePolymer, modifier, role, scope, h2cStatus, excluded,
  representativeGrade, gradeIds: [],
  headline: { density, tensileModulusXY, tensileStrengthXY, elongationXY, hdt045, priceCADkg },
  headlineBasis,                 // the workbook's own statement of what the headline is
  measurementConditions,         // how the headline numbers were measured
  facets: { reinforcement, esd, flexible, supportMaterial, flameRetardant },
  gates:  { scope, nozzle, bed, chamber, abrasive, drying },
  print:  { nozzleC, bedC, chamberC },   // the widest published window across its profiles
  buy:    { … } | null,                  // the best sampled Canadian offer
  profileIds: [], evidenceIds: {...}, printingEvidence, guidance,
  printability, identity, bestUses, limitations, impactNote, fatigueCreep
}
```

`print` answers "what do I set it to". It is the union of the material's profiles, so a range spans
every profile that published one, with the count behind it. 88 materials have a nozzle window and
90 a bed window; the rest published none and render as a dash rather than as zero.

`buy` answers "where do I get it". The price observations carry a retailer URL, and this picks one:
in stock first, then the observation behind the headline, then whatever carries a price. 48 of 102
materials have one and 42 had stock on the price sampling date, 2026-09-10. A quarantined observation,
such as CA0069 (a PLA Pure listing once filed under ABS), is never the buy link or the evidence of
stock.

**Neither is evidence about the material.** `print` is a machine setting recovered from free text
and `buy` is a market observation on a single day. They are shown because they decide whether
someone can act on a result, and they are never used to rank or to satisfy a property criterion.

`facets` are partly derived. Each carries `origin: 'source' | 'derived'` and, when derived, what it
was derived from. Flame retardancy is the weakest: there is no such field in the workbook, so it is
inferred from the name and marked accordingly.

### A headline value

Measured:

```js
{
  known: true, value: 1090, unit: 'kg/m³',
  origin: 'source', verified: true,        // verified against the citation below
  measurementId: 'V000922', gradeId: 'G050-01', sourceId: 'B-pa6-cf-TDS',
  direction: 'not-applicable', specimenType: '…', moisture: '…',
  interval: { lo: 1090, hi: 1090, kind: 'point' }, uncertainty: null
}
```

Not measured:

```js
{
  known: false, missing: 'not-published', unit: '%',
  related: { … } | null,      // a real measurement of this property, never promoted
  estimate: { … } | null      // the span of its closest measured relatives
}
```

`interval` is what the measurement actually asserts, and is what constraint evaluation works on.
An unbounded end is `null`, never `Infinity`.

---

## Three kinds of number

The single most important thing to understand. The interface renders them differently on purpose,
and only the first is evidence.

| | What it is | Table | May satisfy a requirement? |
|---|---|---|---|
| **Measured** | A verified headline, traceable to one measurement, grade and source | `4.43` | yes |
| **Related** | A real measurement of the same property that was never promoted to a headline | `46*` | no |
| **Estimated** | The span of the material's closest measured relatives | `~2.8–15.3†` | **no, but it may rule one out** |

### Related evidence

29 materials have a tensile-strength measurement on record that never became the headline, because
the source stated no direction, or measured a different endpoint. A blank cell hid that and implied
nothing was known.

It reports **one** measurement, never a range across grades. The Method sheet's rule is that the
Materials sheet shows labelled single-grade observations and not cross-grade family ranges. PEBA is
the case that forced it: its three grades measure 7.5, 25 and 30 MPa, and "7.5 to 30" reads as one
material's uncertainty rather than three different products.

There is deliberately **no cross-property fallback**. An earlier version fell back to Vicat or glass
transition when a material had no HDT, which surfaced TPE's glass transition of −35 °C in a column
headed "HDT at 0.45 MPa". The Method sheet keeps those quantities distinct.

### Family estimates

Where a material has no measurement at all, the span of its closest measured relatives is recorded
as a plausibility bound.

**The rule is asymmetric: a failing estimate fails; a passing one still reports UNKNOWN.** Knowing
that all fourteen measured unreinforced PLA grades fall between 2.8 and 15.3% elongation is enough
to say PLA Lite is not a 100%-elongation elastomer. It is not enough to certify it clears a 5%
floor, because the bound comes from its relatives and not from the material.

Construction:

- Built from compiled **headline values only**, so every contributing number is already verified,
  measured in XY where direction applies, and drawn from a single grade. Pooling raw measurements
  would mix directions and specimen types and produce a bound that means nothing.
- Tiered, most specific first, each needing at least two independent observations: family and filler
  class, then family, then behaviour class and filler class.
- **Elastomers, support materials and rigid thermoplastics are never pooled.** Without that split,
  "all unreinforced materials" spanned TPU at 0.0053 GPa and PLA at 2.88, a bound that rules nothing
  out and invites the reader to think a support material might be as stiff as a structural one.
- **Peers sharing one commercial formulation key count once.** PA, PA6/66 and CoPA all draw their
  headline from a single PolyMide datasheet; counting them separately produced an "estimate" of
  2.223 to 2.223 GPa, a precise value dressed as a range. The Method sheet calls shared formulation
  keys repeated commercial evidence, not independent tests.

Every estimate carries `tier`, `basis`, `peerCount`, the peers with their values, and how many
shared-source entries were collapsed. Strict mode never sees them. The CSV export puts them in their
own column so a spreadsheet cannot mistake inference for evidence.

---

### Where an estimate may and may not appear

An estimate is a range, so it is shown as one everywhere it is shown at all.

| Surface | What it does |
|---|---|
| Table cell | `~2.8–15.3†`, with the basis and peer count on hover |
| Detail drawer | The full record: the span, the basis, every peer behind it |
| Filter | Can rule a material out. A passing estimate still reports UNKNOWN |
| Ashby lens | A dotted range, off by default, always counted in the footer |
| Compare | A hatched span across the bar track, never a filled bar |
| Parallel | Not drawn. A line commits to a value on every axis it crosses, so the affected materials are named and counted instead |
| CSV export | Its own column, so a spreadsheet can never mistake inference for evidence |
| Pareto front, candidate counts, index tallies | Never. Inference cannot dominate evidence |

Strict mode sees none of this. Estimates exist only in Explore, and only while the Estimates toggle
is on.

## Missing data is information

Four states, which never collapse into each other and never become zero.

| State | Meaning |
|---|---|
| `not-published` | Absent from the sampled sources. Not proven absent from all literature. |
| `insufficient-comparable` | Evidence exists but cannot support this comparison. |
| `not-applicable` | The property does not apply to this material. |
| `quarantined` | An unresolved unit or layout problem in the source. Excluded from every numeric summary. |

Plus `not-available-in-market` for price, which is a different statement from "not published".

In the table these render as an em dash with the specific state in the tooltip, because the long
form does not fit a numeric column. The wording survives in the detail drawer, the comparison view
and every export.

## Constraint states

Four, and `INDETERMINATE` is not a synonym for `UNKNOWN`.

| State | Meaning |
|---|---|
| `PASS` | The evidence satisfies the criterion |
| `FAIL` | The evidence violates it |
| `UNKNOWN` | No comparable evidence exists |
| `INDETERMINATE` | Evidence exists and the threshold cuts through it, so the source cannot settle it |

A source range of 110–130 °C against "at least 100" passes. 70–90 fails. 90–120 is indeterminate.
So is a value of 2.98 ± 0.09 GPa against a 3 GPa floor.

## The reference layer

`dist/reference.json` is separate from `db.json` and must stay that way. 114 generic engineering
materials as uncited min/max envelopes, ten shown by default.

The Method sheet's Legacy crosswalk maps column for column onto that workbook and sets the governing
rule: *uncited numeric values are not imported*. So the reference set is a drawing layer. It is
excluded from the candidate set, all counts, the results table, Pareto fronts, index tallies, search,
the shortlist and every export of candidates. On the chart it draws as a ghosted envelope, off by
default, because these are bulk and molded values while the candidates are printed and anisotropic.

**The familiar baseline is a different thing, and the distinction matters.** PLA, PETG, ABS, ASA and
PC can each be set as a comparison anchor beside the results. Those are real materials out of
`db.json`, with their own measured headlines and citations, and they obey the same rules as any
other number here. What they share with the reference layer is only their treatment: while a
material is acting as the baseline it is drawn as a reference and excluded from the counts, the
Pareto front and the shortlist, so it can never be mistaken for a result the filters returned.

## Availability is not a property

A material with no sampled offer reports UNKNOWN, not FAIL. The price sample is three Canadian
retailers on one day, which is enough to say "here is where to buy this" and not enough to say
"this cannot be bought". An offer that was sampled and out of stock is different: that is positive
evidence, and it fails.

In Strict mode both are removed from the results, which is what someone asking to see only what
they can buy wants. In Explore the unsampled ones stay visible and flagged.

## Known limits of the snapshot

Carried as warnings in `build/reports/validation-report.md`, and surfaced in the interface:

- 24 of 66 HDT headlines cite a source naming the standard but not the load.
- 8 impact measurements are in J/m and cannot share an axis with the kJ/m² rows without specimen
  geometry the sources never published.
- 11 materials have no property measurements at all. Support for PLA left that list when the
  manufacturer audit recorded its density.
- A property the source states in words, such as "No break" for a Charpy test, has the data status
  "Published qualitative result". It is shown in its own words and is never a number.
- UV and outdoor evidence is seven records across six materials, none reducible to a verdict, so it is
  an evidence indicator and never a filter.
