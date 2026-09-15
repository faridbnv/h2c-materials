# The data model

## The source tables

The database is relational, not a flat table, and the tool preserves that. It is kept as CSV tables in
`data/tables/`, each declared by a schema in `schema/tables/` (DECISIONS D45). Until 2026-09-14 the
same records lived in an Excel workbook; the conversion and its proof are in
[audits/2026-09-14-csv-source-migration/](audits/2026-09-14-csv-source-migration/REPORT.md).

**Records**

| Table | Rows | What it holds |
|---|---:|---|
| `materials.csv` | 102 | Canonical identities: name, family, base polymer, modifier, role, scope, H2C status, representative grade, prose |
| `grades.csv` | 155 | Exact commercial, study and resin-reference grades, each with a Role and a Status |
| `profiles.csv` | 171 | Processing guidance and H2C routing, per grade |
| `measurements.csv` | 2,222 | Individual property measurements, the unit of quantitative evidence |
| `evidence.csv` | 478 | Chemical, environmental and application evidence |
| `prices.csv` | 104 | Canadian price observations |
| `sources.csv` | 244 | The source register, with access dates, hashes and a Citation role |
| `coverage.csv` | 1,188 | Gaps, conflicts and unresolved items; a replaced finding is Superseded, not deleted |
| `method.csv` | 48 | The rules the database was built under |
| `reference.csv` | 114 | Generic reference envelopes, a drawing layer only |

**Selections and citations**

| Table | Rows | What it holds |
|---|---:|---|
| `headlines.csv` | 366 | Which measurement each headline shows (Use `value`), and measurements cited for a headline without being its value (Use `context`) |
| `material_links.csv` | 702 | A material's citations, in order: printing (profiles, evidence), h2c-status (sources), use, durability, safety (evidence) |

**Registry**

| Table | Rows | What it holds |
|---|---:|---|
| `properties.csv` | 32 | Every measured property: domain (mechanical, thermal, physical), the canonical units a usable measurement may carry, and which materials it applies to |
| `headline_definitions.csv` | 6 | Every headline: kind, unit, value and related properties, direction, test load, labels, filter, axis, table column, export header, whether it is estimated, and which materials it applies to |

**Mappings**

| Table | Rows | What it holds |
|---|---:|---|
| `family_entries.csv` | 5 | Canonical names that are families or aliases, not materials (D44), with why |
| `family_members.csv` | 22 | The materials each family entry stands for, in search order |
| `chamber_bands.csv` | 43 | Research chamber bands for materials whose sources publish no window, or why none is given |

`data/review/accepted-findings.csv` is not data: it holds each accepted lint finding with its reason (D50).
Every column of every table, and every vocabulary, is listed in [DATA-DICTIONARY.md](DATA-DICTIONARY.md).

Counts are for snapshot 2026-09-13 after the 2026-09-15 source corrections; `data/manifest.json` holds the current count and SHA-256 of every
table, and the build refuses to run when a table and the manifest disagree, so a count change is
always visible in the commit that makes it.

### One fact, one home

Nothing a table can derive is stored. A headline value lives only in its measurement; the price
headline is the median of the flagged observations; per-kg prices are list price over net mass; a
material's grade list is its active procurement grades; its environmental evidence is its own
exposure records; its nozzle, bed and chamber guidance is its first cited profile. No table holds a
list of identifiers inside a cell, except a profile's `H2C SourceID`, whose items are checked like
any reference; `sources.csv` "Applicable grades" is prose, and every grade ID it mentions is checked.

### The schema is the contract

Every column is declared with a type, a **role** and a meaning:

| Role | Meaning |
|---|---|
| `key` | A stable identifier. Never reused; a retired record keeps it. |
| `raw` | Exactly what the source published. |
| `canonical` | The reviewed, typed interpretation the build relies on. |
| `editorial` | A choice made by the curator: a selection, a citation, a rating. |
| `derived` | Calculated; kept only where the build checks it against what it summarises. |
| `prose` | Words for a reader. |

A field also names the explicit missing states it accepts ("Not published", "Not applicable" and the
others in `schema/vocab/missing-states.csv`), so a blank cell is never a value: nothing becomes zero,
and nothing is silently empty.

### Raw text and typed values

What the build decides on is a typed column beside the raw text it came from (D49). A profile carries, per axis,
the source's words ("Classic: 190 - 210 °C") and the state, minimum, maximum and requirement read from them; drying,
enclosure and the hardened-nozzle requirement likewise; a measurement carries its Standard / load text and Test load
MPa. The parsers check every typed value against its raw text on every build, and Parse review explains a deliberate
difference. A vocabulary can carry what the build needs about a wording: each Moisture condition declares its State.

### Classes that record intent

- **Grade Variant** (`grade-variants.csv`): the product is a variant its material's Modifier / filler does not
  describe (a lightweight additive; an undisclosed dense filler). Composition / filler says why. Its values stay
  its own; the estimate model keeps them from pulling the family (D53).
- **Source Citation role** (`citation-roles.csv`): cited, corroboration, register, provenance or not-retrieved
  (D50). Nothing may cite a source that was not retrieved.
- **Coverage Superseded**: a finding a later row for the same material and domain replaces; its text starts
  "Superseded by C#####", and it leaves the views and the checks.
- **Quarantined measurements** (Data status "Unresolved unit / layout"): kept with the reason, never a number, for
  example a heat deflection pair whose methods and loads contradict each other.
- **Physically implausible measurements** (Data status "Published value (physically implausible)"): a number the source
  really publishes that physics rules out, with the reason in Notes. It is shown, flagged, and backs no headline,
  estimate, conversion, implied bound or plot point (D55).
- **Declared states** (D53, D56): each Moisture condition declares a State (dry, conditioned, not-stated), each
  Post-processing wording a State (as-printed, annealed, not-stated), and each Specimen type a Form (printed,
  not-stated, moulded, film, filament). The build reads the declaration, never the words.
- **Replaced properties** (`properties.csv` Replaced by): two names that are one test. The replaced record stays, names
  its current replacement, and no measurement or headline may use it (D57).
- **Reviewed build findings** (`data/review/accepted-findings.csv`): lint findings and the per-record build findings
  (EST-OUTLIER, EST-WIDE, EST-FAMILY-ORDER, HDT-LOAD-UNSTATED, NO-MEASUREMENTS), each with its reason (D57).

### Properties that apply to some filaments only

"Applies to" in `properties.csv` or `headline_definitions.csv` limits a property to some materials,
tested on Family, Base polymer, Modifier / filler, Role, Scope or H2C status:

```
Family: Flexible Elastomers
Modifier / filler: Carbon fibre | Glass fibre; Role: Structural / functional / appearance
```

Clauses separated by `;` must all hold; values separated by `|` are alternatives. The rule is checked
against the values materials actually have, and needs a Not applicable reason. Outside it, a headline
is `not-applicable` with that reason (not a gap), the drawer does not list the property as unmeasured,
the filter rail counts availability only against the materials it applies to, and a measurement
recorded against another material stops the build.

The validator checks both ordinary referential integrity and ownership. A `MaterialID`, `GradeID`
or `SourceID` must exist, and the grade named by a measurement, profile, price or use record must
belong to that same material. This second check matters because valid identifiers can still be
combined into a valid-looking but wrong record.

### The Method table is executable

It is not prose. Its Scope / Snapshot row dates the database, and the build reads the date from
there for every label and filename. It defines the H2C hardware baseline (350 °C nozzle, 120 °C bed, 65 °C chamber),
the unit conversions, the quarantine rule, the price median rule, the direction rule, and the
distinction between shared commercial evidence and independent tests. The build implements it, the
code cites it by section, and it is compiled into `db.json` so the application can quote it.

## The compiled database

`dist/db.json`, checked against `schema/db.schema.json` on every build. Entities keep their relational
shape; nothing is flattened into one wide table.

```
meta         snapshot, build, price sampling date, counts, H2C baseline, coverage
             summaries, environment category names and what each can decide,
             which chamber bands were used and which the evidence superseded
materials    103   the selection-level object
grades       156   materials 1 -- N grades
measurements 2078  materials 1 -- N, grades 1 -- N, sources N -- 1 (155 retired duplicates excluded;
                   1,920 numeric, 4 quarantined, 10 flagged physically implausible)
profiles     172   print setup, with parsed temperatures, enclosure wording and gate verdicts
evidence     462   use and durability, classified (16 retired duplicates excluded)
prices       104   quarantined observations kept as an audit trail, backing nothing
sources      244
coverage     1199  terminal: reports gaps, never feeds selection
method        48   the rules, verbatim
registry           { properties, headlines }: what every property and headline means
```

### A material

```js
{
  id, name, fullName, abbreviation, normalizedName,
  family, basePolymer, modifier, role, scope, h2cStatus, excluded,
  familyEntry,                   // null, or { kind: 'family' | 'alias', members: [{ id, name }], why }
  representativeGrade, gradeIds: [],
  headline: { density, tensileModulusXY, tensileStrengthXY, elongationXY, hdt045, priceCADkg },
  headlineBasis,                 // the data's own statement of what the headline is
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
every profile that published one, with the count behind it. 94 materials have a nozzle window, 94 a
bed window and 58 a chamber window. The four with no product at all (PA66, PA66-CF, PA612, PA612-GF)
carry an estimated nozzle and bed window (below); a chamber the sources answer only in words is
shown in words.

`buy` answers "where do I get it". The price observations carry a retailer URL, and this picks one:
in stock first, then the observation behind the headline, then whatever carries a price. 46 of 103
materials have one and 40 had stock on the price sampling date, 2026-09-10. A quarantined observation,
such as CA0069 (a PLA Pure listing once filed under ABS), is never the buy link or the evidence of
stock.

**Neither is evidence about the material.** `print` is a machine setting recovered from free text
and `buy` is a market observation on a single day. They are shown because they decide whether
someone can act on a result, and they are never used to rank or to satisfy a property criterion.

`facets` are partly derived. Each carries `origin: 'source' | 'derived'` and, when derived, what it
was derived from. Flame retardancy is the weakest: there is no such field in the data, so it is
inferred from the name and marked accordingly.

### A headline value

Measured:

```js
{
  known: true, value: 1090, unit: 'kg/m³',
  origin: 'source', verified: true,        // verified against the citation below
  measurementId: 'V000922', gradeId: 'G050-01', sourceId: 'B-pa6-cf-TDS',
  direction: 'not-applicable', specimenType: '…', moisture: '…', postProcessing: '…',
  interval: { lo: 1090, hi: 1090, kind: 'point' }, uncertainty: null
}
```

Not measured:

```js
{
  known: false, missing: 'not-published', unit: '%',
  related: { … } | null,      // a real measurement of this property, never promoted, with why
  impliedBounds: [ … ],       // its own printed values that bound it from below (D55)
  estimate: { … } | null      // the calibrated estimate (below)
}
```

`interval` is what the measurement actually asserts, and is what constraint evaluation works on.
An unbounded end is `null`, never `Infinity`. A value with a published uncertainty is judged on the value, and the
interval says whether a threshold lies within its spread (D54).

A measured headline is always a printed or unstated specimen, dry or unstated, and as printed where the grade
publishes both states; a moulded, film, filament, conditioned, annealed-beside-as-printed or physically implausible
measurement is refused as a headline at build time (D55, D56).

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

It reports **one** measurement, never a range across grades. The Method table's rule is that a
material's headlines are labelled single-grade observations and not cross-grade family ranges. PEBA is
the case that forced it: its three grades measure 7.5, 25 and 30 MPa, and "7.5 to 30" reads as one
material's uncertainty rather than three different products.

A value the source itself marks as raw-material supplier data, such as nGen's density and HDT,
is related evidence and says so. It is not a printed or product specimen, whatever its standard. So, with their own
reason, are a film or a filament-strand test, an annealed value whose grade publishes the as-printed one, and a value
flagged physically implausible.

There is deliberately **no cross-property fallback**. An earlier version fell back to Vicat or glass
transition when a material had no HDT, which surfaced TPE's glass transition of −35 °C in a column
headed "HDT at 0.45 MPa". The Method table keeps those quantities distinct.

### Estimates

Where a headline is missing, the build attaches an estimate. Its design is DECISIONS D43, its code
`build/src/estimate/`, and its structure, conversions and limits are reviewed like code in
`build/mappings/estimate-model.json`.

The physics it follows since audit 2026-09-15 (D56): a polymer that prints amorphous (PET, BVOH, PVA, unfilled PPA)
deflects near its glass transition and learns nothing from annealed values; an annealed value is never averaged with
its as-printed twin; conditioned values convert to dry by the polymer's water uptake; density is bounded by the neat
polymer's range and the rule of mixtures; an unfilled bar is capped by its own highest Vicat; an elastomer has no heat
deflection estimate and no yield-to-ultimate conversion; an unknown direction never converts upwards past its
documented offset; a material's only evidence is never down-weighted as a conflict; and what its own printed data
prove (implied bounds) limits its range from below (D55). A physically implausible value informs nothing.

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
| Direction not stated, or only the source's own label | centred, spread 0.3 to 0.9; data may lower the offset, never raise it above the documented value |
| Measured after conditioning | dry equals conditioned plus a wet offset by water uptake: high (PA6, PA66, PA6/66, PPA; modulus ×2) or low (PA12, PA612, PAHT); other polymers read as dry |
| Moulded resin value | printed stiffness about 85%, strength 70 to 85%, elongation a small fraction; semicrystalline heat deflection about 30 °C lower, amorphous about the same |
| Heat deflection at 1.8 MPa | +24 °C fibre-filled semicrystalline, +8 °C amorphous |
| Glass transition (amorphous), Vicat, melting point (fibre-filled semicrystalline) | −3, −8 and −38 °C, spreads 14 to 25 °C |
| Shore hardness (elastomers) | Gent (1958) for Shore A, Qi et al. (2003) for Shore D, each with its own offset (about 45% of the relation), spread 0.6 to 0.7 |
| Yield strength or strain of an elastomer | not converted: an elastomer strain-hardens after it yields |
| Film, filament strand, physically implausible value | not used |

Each documented offset is refined by the median of grades that publish both, and each spread by their
MAD; the documented value counts as three pairs. On each product only the most direct kinds are kept. An annealed
value of a grade that publishes the as-printed one is left out; repeats under different annealing schedules keep a
half-width that spans them and calibrate no conversion. A polymer that prints amorphous (`printsAmorphous`: PET,
BVOH, PVA, unfilled PPA) converts heat values with the amorphous class and learns nothing from annealed ones.

**How wide, and how it is checked.** The spread between two products of the same material is
measured directly from materials with several products (median pairwise difference). The rest are
estimated from the data above documented floors. Then each measured headline is hidden and predicted
from everything else, and both ranges are scaled until they hold the hidden value as often as they
claim. On this snapshot:

| Headline | Hidden headlines | Likely (80%) holds | Plausible (95%) holds | Median likely width |
|---|---:|---:|---:|---:|
| Density | 86 | 80% | 95% | ×1.13 |
| Stiffness | 68 | 81% | 96% | ×1.54 |
| Strength | 53 | 81% | 96% | ×1.58 |
| Elongation | 69 | 81% | 96% | ×2.48 |
| Heat deflection | 59 | 81% | 97% | 8.7 °C |

The build fails if a likely range drifts more than 0.1 from 80%, or a plausible range falls more than
0.05 below 95%. Heat deflection is softly capped by the melting point of a semicrystalline polymer, by Tg plus
10 °C (20 °C with fibre) for an amorphous one or one that prints amorphous, and for an unfilled bar by the highest
Vicat its own grades publish. Density is softly bounded by the neat polymer's handbook range, and for a filled
compound by the rule of mixtures at 35 wt% fibre and 5 % porosity (not for a declared variant). Values outside a
physical range are rejected and listed; evidence that contradicts everything else is down-weighted and listed, unless
it is the material's only evidence for that headline; measured headlines far from their prediction (PPA-CF stiffness
of 11.8 GPa, PC-ABS elongation of 75%, both re-read and correct) are listed in the validation report and accepted
with their reasons.

**What each estimate carries.** `centre`, `lo`/`hi` (likely), `plausible.lo`/`plausible.hi`,
`strength` (`this-grade`, `this-material` or `family`: what it rests on), `precision` (`good`, `fair`
or `poor`, by per-property width thresholds), every piece of its own evidence with the converted value
and the reason for the conversion, the soft limits applied, `sharedWith` where its representative
product is filed under another material (both then show one estimate), `canScreen`, and where it may screen, `screenRange` (the range that decides) and `screenBasis` (why).

**Unstated heat loads.** A heat deflection headline whose source names no load was measured at
0.45 MPa or at 1.8 MPa, so its 0.45 MPa value lies between the value and the value plus the largest
(95%) gap between the two loads its matrix shows: about 10 °C for an amorphous polymer (38 grades), 37 °C
for a fibre-filled semicrystalline one. `hdt045.loadBracket` carries it. It never passes a requirement;
in Explore with estimates on, a requirement the whole bracket fails screens the material out.

**Nothing blank.** Every in-scope headline carries a value, an estimate or `notApplicable` with a
reason. Heat deflection of an elastomer is not applicable and never estimated (ISO 75 ends at 0.2 % outer-fibre
strain, which needs a modulus near 225 MPa); a value its own source publishes is shown only as that measurement. Any
value of a support product is not applicable unless the material's own sources publish one. On this snapshot: 94
estimates (60 from the grade's own related measurements, 18 from other grades or resin references, 16 from the family
model alone; 17 imprecise) and 28 not applicable. 94 estimates may screen.

**What it may do.** An estimate never passes a requirement; the verdict stays UNKNOWN. Which estimates may
screen is measured every build (D48): each measured headline is hidden as far as an evidence class requires
(this grade, this material, family) and predicted, and a class is certified when its plausible ranges are not
significantly too narrow on either side over at least 20 cases (`meta.estimateModel.properties.*.screening`).
In Explore with Estimates on, an estimate screens a material out when the range it may screen on wholly fails
(its plausible range if its class is certified, else the union with the certified family-only range), and no
printed measurement of the material bounds the headline from below and meets the requirement (`impliedBounds`: yield or
break strength under ultimate strength, yield strain under break strain, HDT at 1.8 MPa under 0.45 MPa, each at its
published value; D55). The same bounds limit the estimate's own range from below. Not
applicable screens the same way; the unstated-load bracket screens only for matrix classes whose bracket is
certified (today amorphous). Strict neither shows nor uses estimates. The earlier models are recorded in D10,
D11, D40, D42 and D43.

**Moisture, variants and bounds.** A value measured after conditioning (the Moisture condition vocabulary's
State says which) converts to dry through the wet offset for its polymer's water uptake. A grade whose Variant is set gets its own
covariate with a loose documented spread, so a lightweight or densely filled product does not pull its family.
A one-sided bound ("> 700 %") enters at the bound with a documented half-width, never calibrates a conversion,
and limits its own material's estimate.

### Resin references

Three identities have no filament source that characterises them: PA66, PA612 and, until Tarfuse POM,
POM. A resin supplier data sheet is recorded for each as a reference grade (Role `reference`) with an `R` suffix (G055-R1
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

Strict mode sees none of this. Estimates exist only in Explore, and only while the Use estimates toggle
is on. `n/a` is a statement, not inference, and shows in both modes.

A chamber band is marked the same way, `~80–120†` in the Printing table while estimates are on and as
a card in the drawer's chamber line, but unlike a property estimate it never screens: it rules nothing out
and nothing in. It appears in the CSV's estimated-fields column with "decides nothing" beside it.

An estimated nozzle or bed window (`build/src/estimate/print.js`) is marked the same way and decides
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

Of the 97 in-scope materials, 54 publish a window, 16 say no heated chamber is needed, 3 recommend
one without a temperature, 1 lists no setpoint and 23 publish nothing. 20 carry a band.

A **partial** window (DECISIONS D32) is chamber-only. PPS-CF publishes 60–90 °C; the H2C reaches 60–65 °C
of it, which is neither within nor a failure, so a chamber requirement reports INDETERMINATE.

"Enclosure not necessary" counts as not required, because a material that need not be enclosed needs
no heated chamber. "Enclosure recommended" does not count as anything (D33). A data sheet's "-" is its
own state: not zero, and not "not required".

**Bands** come from the 2026-09-13 research, authored in `data/tables/chamber_bands.csv` with
the basis and caution the research wrote. A band is attached only where no window is published and
no source says no heated chamber is needed; the validation report lists the 23 the evidence
superseded. Unlike a property estimate, a band cannot even screen a material out (D34, D42): it describes a
plausible setpoint, and a setpoint is a recommendation at most.

## Family entries and one home per product

Every commercial product is recorded once, under the most specific material it is. Five canonical names
are not materials: PA, PA-CF, PA-GF and TPE are families, and CoPA is another name for PA6/66. Their
Scope is `Family entry`, their members are in `data/tables/family_entries.csv` and `family_members.csv`, and they
carry no grade, value, estimate or print window. They are never candidates. Searching a family's name
lists its members and says what the family is; its drawer links them.

Until 2026-09-13 these rows held other rows' products: one PolyMide CoPA data sheet appeared under PA,
PA6/66 and CoPA with the same numbers three times, and PA-CF's headline was PA12-CF's. The fix retired
each duplicate grade with the retirement marker and marked its measurements and evidence `Retired
duplicate record`, after proving each has an identical twin under the grade that keeps the product.
Those records stay in the tables as an audit trail and never reach `db.json`. Products filed under a
generic row but belonging to a specific one moved there with every record (PA6-CF, PA6-GF, TPU).

The build fails if a family entry owns an active grade, if the mapping and the materials table disagree, or
if a member is not an in-scope material; a test fails if any data sheet is filed under two materials.

## Evidence ownership and coverage

A valid identifier is not enough to establish ownership. Every measurement, print profile, price
observation and use record names both a `MaterialID` and a `GradeID`; the grade must belong to that
same material. Every measured headline must cite its material's **representative grade**, because a
single Materials row cannot present several formulations' values as if they described one product.

A material's grade list (`gradeIds`) is its procurement list: every grade with Role `procurement` and
Status `active`. Study and resin-reference grades (Role `study` or `reference`, and an `-R#` ID suffix
the build keeps in agreement with the role) deliberately stay outside it: they can provide clearly
labelled context, but they are not products a reader can procure or use as the representative grade.

The evidence lists do not have identical ownership rules:

| List | Where it comes from | What it may cite |
|---|---|---|
| use | `material_links.csv`, Link `use` | The material's records and explicitly labelled family context |
| environmental | derived | Exactly this material's own exposure, solubility and moisture records |
| durability | `material_links.csv`, Link `durability` | The material's records and explicitly labelled family context |
| safety | `material_links.csv`, Link `safety` | The material's records and explicitly labelled family context |

Family context is useful background, but it cannot make a grade appear chemically tested, which is why
environmental evidence is never authored: it is always the material's own records.

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
A published mean with its spread is not a range (D54): 2.98 ± 0.09 GPa against a 3 GPa floor fails on its mean and is
marked close to the limit, and 35 ± 4 MPa against 33 MPa passes, also close. A physically implausible value decides
nothing: the headline it would have backed is estimated.

## The reference layer

`dist/reference.json` is separate from `db.json` and must stay that way. 114 generic engineering
materials as uncited min/max envelopes, ten shown by default.

The Method table's Legacy crosswalk maps column for column onto the original reference and sets the governing
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

- 7 of 67 HDT headlines cite a source naming the standard but not the load: PLA Lite, PP, and PEEK, PEKK, PEI, PSU
  and PPSU, whose 3DXTECH sheets were not re-read because they are outside the estimate model.
- 10 impact measurements are in J/m and cannot share an axis with the kJ/m² rows without specimen
  geometry the sources never published. Izod results are one property, "Izod impact strength", since m22.
- 2 materials have no property measurements at all: PA66-CF and PA612-GF. Neither has a defensible exact commercial
  grade.
- 10 published values are flagged physically implausible (m24), and 4 are quarantined; each keeps its reason.
- PA6 and PE are represented by compounds (Spectrum PA6 Neat, Spectrum HDPE) declared as variants: their values are
  those products', not the neat polymers'. HyperLite PP is its own material, PP Lightweight.
- Whether a published density is of the filament, a printed part or the resin is not recorded; several filled
  grades publish densities below their neat polymer.
- Where a polymer has little data of its own, its screens rest on family-driven ranges (PP's elongation, 14–118 %,
  excludes its own 460 %, which states no direction or specimen).
- PLA Lite and PLA Silk carry third-party technical grade samples, not the original products their
  entries were opened for. Their grade rationale says so.
- A property the source states in words, such as "No break" for a Charpy test, has the data status
  "Published qualitative result". It is shown in its own words and is never a number.
- UV and outdoor evidence is seven records across six materials, none reducible to a verdict, so it is
  an evidence indicator and never a filter.

## Retired identity mappings

A grade with Status `retired` compiles to `retired: true`; its Availability reads "Retired mapping; audit
trail only", and the build flags a retirement finished on one field and not the other.
The grade and its profiles remain identifiable in the archival data, but cannot appear in active
a material's grade list, print summaries/gates, the Grades or Printing drawer, or procurement counts.
G091-01 / P0115 is the retired CPE-HG100-to-CoPE mapping; active CoPE uses only G091-02.

## Raw-value reconciliation

`build/src/measurement-rules.js` independently checks all 1,913 numeric observations against raw
values and unit conversions, including each uncertainty and upper bound. Decimal commas are retained, thousands-separated cycle counts remain
integers, and qualitative outcomes use their own status. Headline verification also enforces property,
unit, value, direction and representative-grade ownership. An unstated HDT load is indeterminate
for both apparent passes and apparent failures of a load-specific criterion.
