# The data model

## The source workbook

`data/H2C_FDM_Material_Database.xlsx` is relational, not a flat table, and the tool preserves that. Nine
sheets, each an Excel table with declared columns.

| Sheet | Rows | What it holds |
|---|---:|---|
| Materials | 102 | Canonical identities and headline observations |
| Grades | 155 | Exact commercial formulations, tied to materials |
| Print setup | 171 | Processing guidance and H2C routing, per grade |
| Properties | 2,049 | Individual property measurements, the unit of quantitative evidence |
| Use & durability | 478 | Chemical, environmental and application evidence |
| Prices CA | 104 | Canadian price observations |
| Sources | 243 | The source register, with access dates and hashes |
| Coverage | 1,188 | Gaps, conflicts and unresolved items |
| Method | 48 | The rules the database was built under |

Counts are for snapshot 2026-09-13, after the manufacturer evidence audit in
[audits/2026-09-13-manufacturer-evidence/](audits/2026-09-13-manufacturer-evidence/) and the
missing-data research in [audits/2026-09-13-missing-data-research/](audits/2026-09-13-missing-data-research/),
then the [coverage consolidation](audits/2026-09-13-coverage-consolidation/) and the
[estimate evidence research](audits/2026-09-13-estimate-evidence/) and the
[duplicate-products fix](audits/2026-09-13-duplicate-products/). The build holds these
numbers in `build/src/extract.js` and refuses to run when the workbook moves, so a
changed workbook is always a deliberate, reviewed change to the tool.

The validator checks both ordinary referential integrity and ownership. A `MaterialID`, `GradeID`
or `SourceID` must exist, and the grade named by a measurement, profile, price or use record must
belong to that same material. This second check matters because valid identifiers can still be
combined into a valid-looking but wrong record.

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
             summaries, environment category names and what each can decide,
             which chamber bands were used and which the evidence superseded
materials    102   the selection-level object
grades       144   materials 1 -- N grades
measurements 1966  materials 1 -- N, grades 1 -- N, sources N -- 1
profiles     167   print setup, with parsed temperatures, enclosure wording and gate verdicts
evidence     478   use and durability, classified
prices       104   quarantined observations kept as an audit trail, backing nothing
sources      235
coverage     1146  terminal: reports gaps, never feeds selection
method        44   the rules, verbatim
```

### A material

```js
{
  id, name, fullName, abbreviation, normalizedName,
  family, basePolymer, modifier, role, scope, h2cStatus, excluded,
  familyEntry,                   // null, or { kind: 'family' | 'alias', members: [{ id, name }], why }
  representativeGrade, gradeIds: [],
  headline: { density, tensileModulusXY, tensileStrengthXY, elongationXY, hdt045, priceCADkg },
  headlineBasis,                 // the workbook's own statement of what the headline is
  measurementConditions,         // how the headline numbers were measured
  facets: { reinforcement, esd, flexible, supportMaterial, flameRetardant },
  gates:  { scope, nozzle, bed, chamber, abrasive, drying },
  print:  { nozzleC, bedC, chamberC,     // the widest published window across its profiles
            chamberGuidance,             // what a source says about the chamber in words, or null
            chamberEstimate,             // a research band where nothing better exists; decides nothing
            nozzleEstimate, bedEstimate }, // a window inferred from peers where none is published; decides nothing
  buy:    { … } | null,                  // the best sampled Canadian offer
  profileIds: [], evidenceIds: {...}, printingEvidence, guidance,
  printability, identity, bestUses, limitations, impactNote, fatigueCreep
}
```

`print` answers "what do I set it to". It is the union of the material's profiles, so a range spans
every profile that published one, with the count behind it. 93 materials have a nozzle window, 93 a
bed window and 58 a chamber window. The four with no product at all (PA66, PA66-CF, PA612, PA612-GF)
carry an estimated nozzle and bed window (below); a chamber the sources answer only in words is
shown in words.

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
| **Estimated** | The likely (80%) range of a calibrated model of every observation | `~71.3–92.5†` | **no; in Explore it may screen a material out** |
| **Not applicable** | A property that does not apply, such as heat deflection of an elastomer | `n/a` | no; in Explore it may screen a material out |

### Related evidence

31 materials have a tensile-strength measurement on record that never became the headline, because
the source stated no direction, or measured a different endpoint. A blank cell hid that and implied
nothing was known.

It reports **one** measurement, never a range across grades. The Method sheet's rule is that the
Materials sheet shows labelled single-grade observations and not cross-grade family ranges. PEBA is
the case that forced it: its three grades measure 7.5, 25 and 30 MPa, and "7.5 to 30" reads as one
material's uncertainty rather than three different products.

A value the source itself marks as raw-material supplier data, such as nGen's density and HDT,
is related evidence and says so. It is not a printed or product specimen, whatever its standard.

There is deliberately **no cross-property fallback**. An earlier version fell back to Vicat or glass
transition when a material had no HDT, which surfaced TPE's glass transition of −35 °C in a column
headed "HDT at 0.45 MPa". The Method sheet keeps those quantities distinct.

### Estimates

Where a headline is missing, the build attaches an estimate. Its design is DECISIONS D43, its code
`build/src/estimates.js`, and its structure, conversions and limits are reviewed like code in
`build/mappings/estimate-model.json`.

**One model per headline, over every observation.** The natural log of density, stiffness, strength
and elongation, and heat deflection in °C, are each modelled as

```
product value = identity (pulled towards its chemical group)
              + reinforcement, by matrix (amorphous, semicrystalline, elastomer)
              + declared variant (silk, particle-filled) + test house
              [+ melting point, for heat deflection of polymers that crystallise while printing]
              + the material's own deviation + the product's own deviation
```

Everything the snapshot holds about a material enters: its headline where it has one, its related
measurements, its other grades, and resin data sheets. Each is first converted to the headline's
semantics with an offset and a spread:

| Evidence | Converted as (headline minus evidence) |
|---|---|
| Break or yield strength, XY | about +5% and +2%, spread 0.1 and 0.08 |
| Flexural modulus, XY | about equal, spread 0.2 (learned from 70 grades publishing both) |
| Tensile value in Z | XY about 1.4 times Z for stiffness, 1.6 times for strength, spread 0.35 |
| Direction not stated | centred, spread 0.3 to 0.9 |
| Moulded resin value | printed stiffness about 85%, strength 70 to 85%, elongation a small fraction; semicrystalline heat deflection about 30 °C lower, amorphous about the same |
| Heat deflection at 1.8 MPa | +24 °C fibre-filled semicrystalline, +8 °C amorphous |
| Glass transition (amorphous), Vicat, melting point (fibre-filled semicrystalline) | −3, −8 and −38 °C, spreads 14 to 25 °C |
| Shore hardness (elastomers) | Gent (1958) or Qi et al. (2003), then about 45% of that, spread 0.6 |

Each documented offset is refined by the median of grades that publish both, and each spread by their
MAD; the documented value counts as three pairs. On each product only the most direct kinds are kept.

**How wide, and how it is checked.** The spread between two products of the same material is
measured directly from materials with several products (median pairwise difference). The rest are
estimated from the data above documented floors. Then each measured headline is hidden and predicted
from everything else, and both ranges are scaled until they hold the hidden value as often as they
claim. On this snapshot:

| Headline | Hidden headlines | Likely (80%) holds | Plausible (95%) holds | Median likely width |
|---|---:|---:|---:|---:|
| Density | 84 | 81% | 95% | ×1.14 |
| Stiffness | 68 | 81% | 96% | ×1.55 |
| Strength | 53 | 81% | 96% | ×1.56 |
| Elongation | 69 | 81% | 96% | ×2.60 |
| Heat deflection | 60 | 80% | 95% | 15 °C |

The build fails if a likely range drifts more than 0.1 from 80%, or a plausible range falls more than
0.05 below 95%. Heat deflection is softly capped by the melting point of a semicrystalline polymer and
by Tg plus 10 °C (20 °C with fibre) for an amorphous one. Values outside a physical range are rejected
and listed; evidence that contradicts everything else is down-weighted and listed; measured headlines
far from their prediction (PP's HyperLite density of 810 kg/m³, PC-ABS elongation of 75%) are listed
in the validation report for a second look.

**What each estimate carries.** `centre`, `lo`/`hi` (likely), `plausible.lo`/`plausible.hi`,
`strength` (`this-grade`, `this-material` or `family`: what it rests on), `precision` (`good`, `fair`
or `poor`, by per-property width thresholds), every piece of its own evidence with the converted value
and the reason for the conversion, the soft limits applied, `sharedWith` where its representative
product is filed under another material (both then show one estimate), and `canScreen`.

**Nothing blank.** Every in-scope headline carries a value, an estimate or `notApplicable` with a
reason. Heat deflection of an elastomer and any value of a support product are not applicable unless
the material's own sources publish one. On this snapshot: 93 estimates (54 from the grade's own related
measurements, 20 from other grades or resin references, 19 from the family model alone; 13 imprecise)
and 27 not applicable. 83 estimates may screen.

**What it may do.** An estimate never passes a requirement; the verdict stays UNKNOWN. In Explore with
Estimates on it screens a material out when its plausible range wholly fails, none of the material's
own measurements could meet the requirement, and it rests on the material's own evidence or an
identity measured on at least two products. Not applicable screens the same way. Strict neither shows
nor uses estimates. The earlier models are recorded in D10, D11, D40 and D42.

### Resin references

Three identities have no filament source that characterises them: PA66, PA612 and, until Tarfuse POM,
POM. A resin supplier data sheet is recorded for each as a study grade with an `R` suffix (G055-R1
Zytel 101L, G058-R1 Zytel 151L, G087-R1 Delrin 100P). Its values are `Raw material value`, never a
headline or a procurement grade, and exist only to anchor estimates through the moulded conversion.

---

### Where an estimate may and may not appear

An estimate is a range, so it is shown as one everywhere it is shown at all.

| Surface | What it does |
|---|---|
| Table cell | `~71.3–92.5†`, the likely range; imprecise ones in italic. With estimates on it replaces the related `*` value, which it already contains, converted |
| Detail drawer | The full record: both ranges and the centre, precision, what it rests on and its share, every measurement behind it with its converted value, and the limits applied |
| Filter | Always UNKNOWN. In Explore may screen the material out, as above; the SCREENED chip brings it back |
| Ashby lens | The likely range as a dotted box, off by default, always counted in the footer |
| Compare | The likely range as a hatched span, the plausible range faint behind it, a tick at the centre; never a filled bar |
| Parallel | Not drawn. A line commits to a value on every axis it crosses, so the affected materials are named and counted instead |
| CSV export | Its own column with both ranges, strength and precision, so a spreadsheet can never mistake inference for evidence |
| Pareto front, candidate counts, index tallies | Never. Inference cannot dominate evidence |

Strict mode sees none of this. Estimates exist only in Explore, and only while the Estimates toggle
is on. `n/a` is a statement, not inference, and shows in both modes.

A chamber band is marked the same way, `~80–120†` in the Printing table while estimates are on and as
a card in the drawer's chamber line, but unlike a property estimate it never screens: it rules nothing out
and nothing in. It appears in the CSV's estimated-fields column with "decides nothing" beside it.

An estimated nozzle or bed window (`build/src/print-estimates.js`) is marked the same way and decides
nothing either. It is the median window of the same polymer's materials, or of its chemical group and
matrix when the polymer has none, shifted by the snapshot's median fibre offset (9 °C nozzle), and a
semicrystalline nozzle window starts above the melting point. PA66 reads `~270–285†` °C.

## Chamber evidence

The chamber question has three kinds of answer, and only the first is a temperature.

| Kind | Example | Compiled as | Chamber gate |
|---|---|---|---|
| A published window | Bambu PC FR, 45–60 °C | `print.chamberC` | within, **partial** where only the bottom of the window is reachable, or exceeds |
| A statement in words | "Not required", "enclosure not necessary", "Recommended", a data sheet's "-" | `print.chamberGuidance`: `not-required`, `recommended` or `no-setpoint` | within for `not-required`; unknown for the other two |
| An estimated band | PPA, ~80–120 °C† | `print.chamberEstimate` | **none**: a band changes no verdict |

Of the 91 in-scope candidates, 54 publish a window, 16 say no heated chamber is needed, 3 recommend
one without a temperature, 1 lists no setpoint and 17 publish nothing. 19 carry a band.

A **partial** window (DECISIONS D32) is chamber-only. PPS-CF publishes 60–90 °C; the H2C reaches 60–65 °C
of it, which is neither within nor a failure, so a chamber requirement reports INDETERMINATE.

"Enclosure not necessary" counts as not required, because a material that need not be enclosed needs
no heated chamber. "Enclosure recommended" does not count as anything (D33). A data sheet's "-" is its
own state: not zero, and not "not required".

**Bands** come from the 2026-09-13 research, authored in `build/mappings/chamber-estimates.json` with
the basis and caution the research wrote. A band is attached only where no window is published and
no source says no heated chamber is needed; the validation report lists the 22 the evidence
superseded. Unlike a property estimate, a band cannot even screen a material out (D34, D42): it describes a
plausible setpoint, and a setpoint is a recommendation at most.

## Family entries and one home per product

Every commercial product is recorded once, under the most specific material it is. Five canonical names
are not materials: PA, PA-CF, PA-GF and TPE are families, and CoPA is another name for PA6/66. Their
workbook Scope is `Family entry`, their members are in `build/mappings/family-entries.json`, and they
carry no grade, value, estimate or print window. They are never candidates. Searching a family's name
lists its members and says what the family is; its drawer links them.

Until 2026-09-13 these rows held other rows' products: one PolyMide CoPA data sheet appeared under PA,
PA6/66 and CoPA with the same numbers three times, and PA-CF's headline was PA12-CF's. The fix retired
each duplicate grade with the retirement marker and marked its measurements and evidence `Retired
duplicate record`, after proving each has an identical twin under the grade that keeps the product.
Those records stay in the workbook as an audit trail and never reach `db.json`. Products filed under a
generic row but belonging to a specific one moved there with every record (PA6-CF, PA6-GF, TPU).

The build fails if a family entry owns an active grade, if the mapping and the workbook disagree, or
if a member is not an in-scope material; a test fails if any data sheet is filed under two materials.

## Evidence ownership and coverage

A valid identifier is not enough to establish ownership. Every measurement, print profile, price
observation and use record names both a `MaterialID` and a `GradeID`; the grade must belong to that
same material. Every measured headline must cite its material's **representative grade**, because a
single Materials row cannot present several formulations' values as if they described one product.

`GradeIDs` is the procurement list. It contains every commercial grade belonging to the material.
Supplemental study grades use an `-R#` suffix and deliberately stay outside that list: they can
provide clearly labelled context, but they are not products a reader can procure or use as the
representative grade.

The four evidence columns do not have identical ownership rules:

| Column | What it may cite |
|---|---|
| `Use evidence` | The material's records and explicitly labelled family context |
| `Environmental evidence` | Exactly this material's own exposure, solubility and moisture records |
| `Durability evidence` | The material's records and explicitly labelled family context |
| `Safety evidence` | The material's records and explicitly labelled family context |

Family context is useful background, but it cannot make a grade appear chemically tested. The
validator derives the expected Environmental evidence list from the material's own records and
fails if the authored list differs.

Coverage is terminal: it reports gaps and never feeds candidate selection. It still must describe
the records truthfully. `build/src/coverage-rules.js` defines what counts as own data for Mechanical,
Thermal, Print setup, Moisture / environmental and Canadian price coverage. The same definitions
drive both audit planning and validation, so a row cannot say `Gap` beside its own data, claim
`Evidence recorded` on another material's family notes, or quote the wrong manufacturer count.

The environment-category subset of the 478 use-and-durability records currently resolves to the
following counts. Application, safety and other non-environment records are outside this table.

| Category | Kind | Records | With a verdict | Materials |
|---|---|---:|---:|---:|
| Alkali | verdict | 67 | 65 | 54 |
| Acid | verdict | 71 | 63 | 55 |
| Organic solvent | verdict | 64 | 47 | 56 |
| Oil and grease | verdict | 59 | 47 | 56 |
| Water solubility | verdict | 43 | 41 | 42 |
| Flammability | verdict | 41 | 36 | 41 |
| Food contact | indicator | 2 | 0 | 2 |
| UV / outdoor | indicator | 7 | 0 | 6 |
| Moisture | indicator | 7 | 0 | 7 |
| Creep | indicator | 2 | 0 | 2 |
| Fatigue | indicator | 5 | 0 | 5 |
| Hydrolysis | indicator | 4 | 0 | 4 |

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

- 25 of 69 HDT headlines cite a source naming the standard but not the load.
- 9 impact measurements are in J/m and cannot share an axis with the kJ/m² rows without specimen
  geometry the sources never published.
- 5 materials have no property measurements at all: PA66, PA66-CF, PA612, PA612-GF and POM. None has
  a defensible exact commercial grade. PLA Lite, PLA Silk, PET-GF, CPE, CoPE and nGen left the list
  with the missing-data research.
- PLA Lite and PLA Silk carry third-party technical grade samples, not the original products their
  entries were opened for. Their grade rationale says so.
- A property the source states in words, such as "No break" for a Charpy test, has the data status
  "Published qualitative result". It is shown in its own words and is never a number.
- UV and outdoor evidence is seven records across six materials, none reducible to a verdict, so it is
  an evidence indicator and never a filter.

## Retired identity mappings

`Grades.Availability = Retired mapping; audit trail only` compiles to `retired: true`.
The grade and its profiles remain identifiable in the archival data, but cannot appear in active
`GradeIDs`, print summaries/gates, the Grades or Printing drawer, or procurement counts.
G091-01 / P0115 is the retired CPE-HG100-to-CoPE mapping; active CoPE uses only G091-02.

## Raw-value reconciliation

`build/src/measurement-rules.js` independently checks all 1,806 numeric observations against raw
values and unit conversions. Decimal commas are retained, thousands-separated cycle counts remain
integers, and qualitative outcomes use their own status. Headline verification also enforces property,
unit, value, direction and representative-grade ownership. An unstated HDT load is indeterminate
for both apparent passes and apparent failures of a load-specific criterion.
