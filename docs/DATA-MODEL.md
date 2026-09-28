# The data model

## The source tables

The database is relational, not a flat table, and the tool preserves that. It is kept as CSV tables in
`data/tables/`, each declared by a schema in `schema/tables/` (DECISIONS D45). Until 2026-09-14 the
same records lived in an Excel workbook; the conversion and its proof are in
[audits/2026-09-14-csv-source-migration/](audits/2026-09-14-csv-source-migration/REPORT.md).

**Records**

| Table | What it holds |
|---|---|
| `materials.csv` | Canonical identities: name, family, base polymer, modifier, role, scope, H2C status, and the prose that is true of this material alone |
| `grades.csv` | Exact commercial, study and resin-reference grades, each with a Role and a Status |
| `profiles.csv` | Processing guidance and H2C routing, per grade: the typed temperature axes, drying, enclosure, abrasion |
| `profile_notes.csv` | What a source says about a qualitative side of printing a grade, one row per profile and topic (D69) |
| `measurements.csv` | Individual property measurements, the unit of quantitative evidence |
| `evidence.csv` | Chemical, environmental and application evidence; and makers' know-how, a maker's statements about printing and using its product in its own words (Domain "Makers' know-how"), which the build keeps out of everything that screens (below, "Makers' know-how") |
| `know_how_reads.csv` | Which sources were read for makers' know-how, how (a document held, or the maker's site searched), when and by whom: the one fact about know-how the build cannot derive |
| `prices.csv` | Canadian price observations |
| `sources.csv` | The source register: what kind of document each is, how it was reached, with access dates, hashes and a Citation role (D71) |
| `coverage.csv` | Gaps, conflicts, judgements and unresolved items; a replaced finding is Superseded, not deleted. The build adds a row of its own for each domain a material's records prove and no stored row speaks for (D74) |
| `method.csv` | The rules the database was built under |
| `reference.csv` | Generic reference materials, a drawing layer only: category and name |
| `reference_envelopes.csv` | Each reference material's min/max envelope, one row per property (D67); the properties and their units are `schema/vocab/reference-properties.csv` |

**Selections and citations**

| Table | What it holds |
|---|---|
| `headlines.csv` | Pins one product's value for one headline where the rule chooses wrongly, with its Reason; empty since m137 retired its 493 rows, the 477 hand picks and 16 citations that were not values |
| `material_links.csv` | A material's citations, in order: printing (profiles, evidence), h2c-status (sources), use, durability, safety (evidence) |

**Registry**

| Table | What it holds |
|---|---|
| `properties.csv` | Every measured property: domain (mechanical, thermal, physical), the canonical units a usable measurement may carry, and which materials it applies to |
| `headline_definitions.csv` | Every headline: kind, unit, value and related properties, direction and what a value with none is to it, test load, notch and test temperature, a comparison note, labels, filter, axis, table column, export header, whether it is estimated, and which materials it applies to |
| `plausibility_windows.csv` | The range a published value can credibly fall in, per property, unit and class of material: outside a hard bound it is impossible, outside a soft bound a person looks at it (D82, MEAS-PHYSICS-WINDOW) |

**Mappings**

| Table | What it holds |
|---|---|
| `family_entries.csv` | Canonical names that are families or aliases, not materials (D44), with why |
| `family_members.csv` | The materials each family entry stands for, in search order |
| `chamber_bands.csv` | Research chamber bands for materials whose sources publish no window, or why none is given |
| `fatigue_tests.csv` | The loading of each Fatigue life measurement: stresses, frequency, load ratio, run-out (m31) |
| `polymers.csv` | The polymer identities the estimate model knows: group, morphology, melting point, how it solidifies in a print, water uptake, neat density, and where they come from (D60). `materials.csv` Estimate identity names one |
| `polymer_environment.csv` | A base polymer's published environmental behaviour, one row per polymer, category and agent, from a retrieved reference (D64). The build attaches it, marked polymer-level and inferred, to each material whose Estimate identity it is and that has no `evidence.csv` record in the category; shown, may screen, never passes |
| `print_guide.csv` | What a printer maker's filament guide states for printing a material type, one row per type it heads a column with, in a print profile's columns (D88): no product's profile |
| `print_guide_materials.csv` | Which material each guide type is, with why and who mapped it: the same material type only (D88) |

`data/review/accepted-findings.csv` is not data: it holds each accepted lint finding with its reason (D50).
`data/review/removed-records.csv` is not data either: it is the ledger of records that left a table because the
build derives them instead, each naming its migration and where it went (D72). Nothing else may be deleted.
Every column of every table, and every vocabulary, is listed in [DATA-DICTIONARY.md](DATA-DICTIONARY.md).

`data/manifest.json` holds the current count and SHA-256 of every table, and the build refuses to run when a table and
the manifest disagree, so a count change is always visible in the commit that makes it. What each build holds is in
`build/reports/validation-report.md` and `build/snapshot/`; the counts are not repeated here, where they would go stale.

### One fact, one home

Nothing a table can derive is stored. A product's value lives only in its measurement, chosen by rule, and a
material's headline is its products' spread; a product's price is the median of its flagged observations, and a
material's the median of its products'; per-kg prices are list price over net mass; a material's grade list is its
active procurement grades; what its headline values represent follows from its Scope and whether its products publish
(D70); its environmental
evidence is its own exposure records; its nozzle, bed and chamber guidance is its first cited profile. No table holds a
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
MPa, and its Test temperature text and Test temperature °C (m175: the number the wording states, Not published where it
states none or only in words). The parsers check every typed value against its raw text on every build, and Parse
review explains a deliberate difference. A vocabulary carries what the build needs only about a wording the database
itself owns: each Specimen type declares its Form. A source's sentence is data, not a vocabulary: Moisture condition
and Post-processing are the source's words, and Moisture state and Post-processing state beside them are what the
build reads (D68).

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
- **Declared states** (D53, D56, D68): a measurement carries its Moisture state (dry, conditioned, not-stated) and
  Post-processing state (as-printed, annealed, not-stated) as typed columns beside the source's own words, and each
  Specimen type declares a Form (printed, not-stated, moulded, film, filament, off-recipe) in its vocabulary, because
  those wordings are the database's own. The build reads the state, never the words; where the words plainly say
  otherwise the build stops (PARSE-MISMATCH), and where they say nothing the column decides.
- **Replaced properties** (`properties.csv` Replaced by): two names that are one test. The replaced record stays, names
  its current replacement, and no measurement or headline may use it (D57).
- **Reviewed build findings** (`data/review/accepted-findings.csv`): lint findings and the per-record build findings
  (EST-OUTLIER, EST-WIDE, EST-FAMILY-ORDER, NO-MEASUREMENTS), each with its reason (D57). An
  estimate that is wide only because the evidence is thin is EST-THIN, informational, and needs no reviewer (D73).

### Properties that apply to some filaments only

"Applies to" in `properties.csv` or `headline_definitions.csv` limits a property to some materials,
tested on Family, Base polymer, Modifier / filler, Role, Scope, H2C status or Morphology (the material's polymer's, in
`polymers.csv` through its Estimate identity; "not modelled" where it names none):

```
Family: Flexible Elastomers
Modifier / filler: Carbon fibre | Glass fibre; Role: Structural / functional / appearance
Morphology: amorphous | semicrystalline | not modelled
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
meta               snapshot, build, price sampling date, counts, H2C baseline, headline and estimate coverage,
                   environment category names and what each can decide, which chamber bands were used and which
                   the evidence superseded, the estimate model's diagnostics and screening ends, the estimated print
                   windows, know-how counts
materials          the selection-level object (below)
grades             materials 1 -- N grades; each with its own headline values, print recipe, grade estimate and
                   know-how state (below)
knowHow            makers' know-how: each statement in the maker's words, by product and topic, shown in the
                   panel and read by nothing that screens; grades[].knowHow and materials[].knowHow carry the state
measurements       materials 1 -- N, grades 1 -- N, sources N -- 1 (retired duplicates excluded;
                   quarantined and physically implausible values flagged)
printGuide         a printer maker's guide rows, each read as a recipe, with the materials it speaks for (D88)
profiles           print setup, with parsed temperatures, enclosure wording and gate verdicts
evidence           use and durability, classified (retired duplicates and makers' know-how excluded)
prices             every sampled observation; a quarantined one is kept as an audit trail and backs nothing
sources
coverage           terminal: reports gaps, never feeds selection; the stored rows and the ones the build derives (D74)
method             the rules, verbatim
polymers           the polymer identities the estimate model knows (polymers.csv, D60)
polymerEnvironment a base polymer's published environmental behaviour, per category and agent (D64)
polymerEvidence    those rows attached to each material with no record of its own in the category: one inferred,
                   polymer-level verdict per category; shown, may screen, never passes (D64)
registry           { properties, headlines }: what every property and headline means
```

`dist/h2c.sqlite` (`npm run sql`, D75) holds the same tables for queries. It also holds the **record tier** (D85),
which `db.json` never does. `source_facts` has every line the import reader read without it becoming data: the text as
printed, its page, the reader's reason, the document's source and grades, and the known property it names.
`documents_fts` is a full-text index of every cached document's text, one row per page, built only where
`.cache/text` is present. For example:
`select sourceid, page, text from source_facts where text like '%shrinkage%'`, or
`select doc_key, sourceid, page from documents_fts where documents_fts match 'anneal*'`.

### A material

```js
{
  id, name, abbreviation, fullName,
  family, basePolymer, modifier, role, scope, h2cStatus, excluded,   // excluded is Scope "Excluded", the one place
                                 // exclusion is recorded; h2cStatus says how it relates to the printer (m146)
  estimateIdentity,              // its row of polymers.csv, or null: declared not estimated (D60, D87)
  variantClass,                  // a commercial variant class (silk, particle-filled), or null
  familyEntry,                   // null, or { kind: 'family' | 'alias', why, members: [{ id, name }] }
  gradeIds: [],                  // its active procurement grades
  headline: { density, tensileModulusXY, tensileStrengthXY, tensileStrengthZ, elongationXY, charpyNotched, izodNotched,
              hdt045, glassTransition, priceCADkg },   // one per row of headline_definitions.csv, then the price
                                 // its products' spread where they publish comparably (below); decides nothing
  summary:  { [headline]: { products, n, min, q1, median, q3, max, typical, twins, asPublished, variants } },
  headlineBasis,                 // what its headline values represent, one sentence chosen by rule (D70)
  facets: { reinforcement, esd, flexible, supportMaterial, flameRetardant, family, polymer },
                                 // each { value, origin: 'source' | 'derived', from? }
  guidance: { nozzle, bed, chamber },    // the words of the first profile it cites
  print:  { nozzleC, bedC, chamberC,     // the widest published window across its profiles
            chamberGuidance,             // what a source says about the chamber in words, or null
            chamberEstimate,             // a research band where nothing better exists; decides nothing
            nozzleEstimate, bedEstimate }, // a window inferred from peers where none is published; decides nothing
  buy:    { … } | null,                  // the best sampled Canadian offer
  gates:  { scope, nozzle, bed, chamber, abrasive, drying },
  profileIds: [], printingEvidence: [],  // its profiles; its printing citations (material_links.csv)
  bestUses, limitations,                 // prose true of this material alone
  identity: { notes, h2cEvidence },      // identity notes; its h2c-status citations
  evidenceIds: { use, environmental, durability, safety, polymer },
  knowHow                                // makers' know-how across its products (below); absent for a family entry
}
```

`schema/db.schema.json` (`$defs.material`) is the contract, and says which fields a family entry leaves out.

`print` answers "what do I set it to". It is the union of the material's profiles, so a range spans
every profile that published one, with the count behind it. A material whose profiles publish no nozzle or bed window,
such as the four with no product at all (PA66, PA66-CF, PA612, PA612-GF), carries an estimated one (below); a chamber
the sources answer only in words is shown in words. How many materials publish each is in the validation report.

`buy` answers "where do I get it". The price observations carry a retailer URL, and this picks one:
in stock first, then the observation behind the headline, then whatever carries a price. A quarantined observation,
such as CA0069 (a PLA Pure listing once filed under ABS), is never the buy link or the evidence of
stock.

**Neither is evidence about the material.** `print` is a machine setting recovered from free text
and `buy` is a market observation on a single day. They are shown because they decide whether
someone can act on a result, and they are never used to rank or to satisfy a property criterion.

`facets` are partly derived. Each carries `origin: 'source' | 'derived'` and, when derived, what it
was derived from. Flame retardancy is the weakest: there is no such field in the data, so it is
inferred from the name and marked accordingly.

### A product's own values, and a material as the spread of its products

Added in re-center phase 1 (docs/GOALS.md, D83 and D84 decided 2026-09-25; `build/src/products.js`). Since phase 2 the
engine judges each product on its own values and recipe, and a material by how many of its products pass; since phase 4
a material's headline is derived from them, and no product stands for a material.

- **`grades[].headline[key]`**: the product's own value for each headline, chosen by rule from its own measurements.
  The rule accepts a printed or unstated specimen,
  the headline's direction, not conditioned, not implausible, not annealed where the product publishes it as printed,
  at the headline's load, and where the headline sets them its notch and its test temperature (23 ± 2 °C, or none
  stated; D92). A value is `comparable`, or `as-published` with a `caveat` where the source leaves the
  direction (`unstated-direction`) or the load (`load-not-stated`) unstated; a headline whose Unstated direction is
  `excluded` (the layer strength) takes no value without a stated direction at all. Several candidates are ordered: comparable,
  printed, as printed, dry, the product's own data sheet, the headline's first value property, a point, then the
  lowest ID. A row of `headlines.csv` on the product pins it (`pinned`), with its Reason; on 2026-09-25 the rule alone
  reproduced all 477 hand picks (`docs/audits/2026-09-25-re-center/rule-vs-hand-picks.md`), which m137 retired. A value measured on an
  annealed part carries the schedule (`anneal`). `priceCADkg` is the median of the product's own sample listings.
  Where the product has no value of its own for a headline and a **twin** does, it reads the twin's own value, marked
  `from: { origin: "twin", gradeId, label }` (D89). A twin is another active product of the same material under the
  same Shared formulation key: the products whose sheets print one table the import recorded once (R053). It is
  derived; no table holds it. A price is never read from a twin, and a product that reprints another material's table
  (R166) has no twin.
- **`grades[].print`**: the product's own recipe from its own profiles, never a union across a material: per axis the
  gate against the H2C and the window of the profile that decided it, the enclosure, whether it wants a hardened
  nozzle, drying, and the annealing its sheets state. Where its own profiles say nothing on a part, its twin's own
  (D89) are read; where those say nothing either on a part of the print gate (nozzle, bed, chamber, enclosure, hardened
  nozzle), its material's printer maker's guide row (`print_guide.csv`, D88). `print.from[part]` and the gate's reason
  say which, with the label a reader is shown. What a product's own sheet says, even words the parser cannot read,
  always stands. A guide row that asks for an enclosure and gives no chamber temperature leaves the chamber unknown,
  unless it declares Chamber state `enclosed`: Bambu Lab's rows for the eleven types its guide asks an enclosure for,
  written for its own enclosed printers, whose enclosure the H2C's heated chamber is (D90; ASA-CF and PC FR since m209).
  Since D93 a maker's own profile may declare it too, for one of those types, where its sheet asks for an enclosure and
  prints no chamber temperature
  and no other profile of the product states its chamber (PROCESS-ENCLOSED says where it may stand).
  Null for a product with nothing on any part. `db.printGuide` holds the guide's rows, each with its materials.
- **`materials[].summary[key]`**: the spread across the material's procurement products that are not declared
  variants (a material whose every product is a variant, PP Lightweight, is its variants). `products` counts them, `n` those with a comparable value, whose range, median, quartiles (from four
  values) and `typical` product (nearest the median) these are. Values published without the direction or load
  (`asPublished`) and variants (`variants`) are counted apart. It is the spread of different products, never
  uncertainty about one: PEBA's tensile strengths are several products' values, not one PEBA's. A twin counts as the
  product it is, and `twins` says how many of the `n` values are a twin's; a twin reading a declared variant's sheet
  is set apart with it, and where a twin ties its sibling the typical product is the sibling.

- **`grades[].states`** (D99): the states the product can be judged in, each with the values its own sheets publish in
  it. The first is as printed and dry and holds every headline; then each annealing schedule its annealed values state
  (`annealed:120:16`, `x` for a part the sheet does not state), conditioned where it publishes conditioned values, and
  their combinations, each holding only the headlines that state changes (`headline_definitions.csv` "Changes with
  annealing", "Changes with moisture"). A value in one state is never another's: the engine judges a product in each
  state the scenario permits and answers with the best. `grades[].headline` stays the product's published value, which
  the table and the spread show, labelled with its annealing. Every value carries `admitted` (the conditions that could
  change it and its source left unstated) and `standards`.
- **`grades[].buy`** (D98): the product's own sampled offers; **`grades[].twins`**: the products that print its sheet.

`build/snapshot/products.csv` and `summaries.csv` hold every value (their From and Twins columns name a twin's reading),
`states.csv` every state value that is not the product's published one, and `print.csv` every product's print gates and
where each part came from; `npm run sql` has `products_compiled` and `summaries_compiled`.

### What each selectable property compares

A headline's row says what a value must be to be a product's value for it (the rule above). What that means for each
of the ten:

| Headline | Comparable | As published (counted apart) | Never its value |
|---|---|---|---|
| Density, heat deflection (0.45 MPa) | a printed or unstated specimen; heat deflection at 0.45 MPa | heat deflection with no load stated | a moulded, film or filament specimen; heat deflection at another load |
| Stiffness, strength, stretch (XY) | direction XY | no direction stated | Z, XZ, ZX or a source's own label |
| **Layer strength** (`tensileStrengthZ`) | direction Z, the source's own word | none | no direction stated (almost always a flat or moulded bar); XY; XZ or ZX, whose use by sheets is not settled |
| **Notched impact, Charpy** (`charpyNotched`) | Charpy (ISO 179, GB/T 1043), notched, kJ/m², XY, at 23 ± 2 °C or no temperature stated | no direction stated | Izod, in either unit; J/m; unnotched, or notch not stated; struck at another temperature |
| **Notched impact, Izod** (`izodNotched`, D94) | Izod, notched, kJ/m², XY, at 23 ± 2 °C or no temperature stated, to ISO 180 or no standard named | no direction stated | Charpy, in either unit; J/m; ASTM D256 printed in kJ/m² (a J/m value its maker converted); unnotched, or notch not stated; struck at another temperature |
| **Glass transition** (`glassTransition`) | the product's own value, any method (almost all DSC) | none: it has no direction or load | a resin supplier's value (Specimen type Raw material value) |

Every headline also leaves out a conditioned or implausible value, an annealed one where the product publishes it
as printed, and a bar printed at a setting the product is not meant for (Specimen type "Printed off the product's
recipe", Form off-recipe: colorFabb's lightweight PETs printed unfoamed, D95). The glass transition is a property of the plastic, not of a bar, which is why a printed and an unstated
specimen are the same to it; a raw material value is still not the product's, as for every headline. Each of the four
rows added since D92 carries a Comparison note, which the drawer shows above the values it leaves out (D92, D94); a row
may also name its test Standard, which a value naming only other standards does not meet (the Izod row's ISO 180, D94).

### A headline value

Measured (PLA's stiffness at the 2026-09-27 build):

```js
{
  known: true, value: 2.45, unit: 'GPa', origin: 'products', verified: true,
  interval: { lo: 2.45, hi: 2.45, kind: 'point' },
  spread:  { n: 38, products: 182, min: 0.95, max: 4.24, q1, q3,     // its products' comparable values
             asPublished: { n: 41, min, max } | null,                // counted apart (D84)
             variants: { n, min, max } | null,                       // declared variants, apart
             twins? },                                               // how many of the n are a twin's reading (D89)
  typical: { gradeId, measurementId, value },                        // the product nearest the median
  measurementId, gradeId                                             // one product only: its value is the material's
}
```

The price headline has the same shape, with `observations` and `priceIds` (the listings behind it). Where none of the
material's plain products has a sampled price but the material has listings, it is their median instead, `origin:
'source'`, with a `basis` sentence counting them (`$defs.headlinePrice`).

A product's own value (`grades[].headline[key]`) is `{ value, level, measurementId, caveat?, direction?, interval?,
uncertainty?, anneal?, pinned?, from? }`, where `from` names the twin whose value it reads (D89); its price is `{ value,
level, observations, priceIds }`, the median of its own sample listings. The engine judges each product through it
(app/js/engine/products.js).

Not measured:

```js
{
  known: false, missing: 'not-published', unit: '%',
  related: { … } | null,      // real measurements of this property that are no product's value: how many, the
                              // closest, and up to ten, each with why (below)
  impliedBounds: [ … ],       // its own printed values that bound it from below (D55)
  estimate: { … } | null      // the calibrated estimate (below)
}
```

`interval` is what the measurement actually asserts, and is what constraint evaluation works on.
An unbounded end is `null`, never `Infinity`. A value with a published uncertainty is judged on the value, and the
interval says whether a threshold lies within its spread (D54).

A product value is always a printed or unstated specimen, dry or unstated, and as printed where the product publishes
both states; a moulded, film, filament, off-recipe, conditioned, annealed-beside-as-printed or physically implausible
measurement is never one, and a pin on it stops the build (D55, D56, D95).

---

## Three kinds of number

The single most important thing to understand. The interface renders them differently on purpose,
and only the first is evidence.

| | What it is | Table | May satisfy a requirement? |
|---|---|---|---|
| **Measured** | Its products' comparable values: the median, with their range and count, each traceable to one measurement, grade and source | `4.43` | yes, product by product |
| **Related** | A real measurement of the same property that is not a comparable value | `46*` | no |
| **Estimated** | The likely (80%) range of a calibrated model of every observation | `~71.3–92.5†` | **no; in Explore it may screen a material out** |
| **Not applicable** | A property that does not apply, such as heat deflection of an elastomer | `n/a` | no; in Explore it may screen a material out |

### Related evidence

Many materials have a measurement on record that is no product's value for a headline, because the source stated no
direction, measured a different endpoint or tested a moulded bar. A blank cell hid that and implied nothing was known.

It shows **one** measurement, the closest to what the headline would be, with how many there are and up to ten of them,
each with why it is not comparable; it is never pooled into a range. A material's own value is the labelled spread of
its products (D83): PEBA's tensile strengths are several products', counted, and never read as one material's
uncertainty.

What stands in a headline's place is in the headline's unit and, for an impact headline, of its notch where the
source states one; for the layer strength it is only a value the source says is along Z (D92). An Izod value in J/m,
an unnotched bar or an in-plane strength is another quantity, not the nearest one, and shows in the drawer's
Mechanical tab under the headline's comparison note instead.

A value the source itself marks as raw-material supplier data, such as nGen's density and HDT,
is related evidence and says so. It is not a printed or product specimen, whatever its standard. So, with their own
reason, are a film or a filament-strand test, a bar printed off the product's recipe (D95), an annealed value whose
grade publishes the as-printed one, and a value flagged physically implausible.

There is deliberately **no cross-property fallback**. An earlier version fell back to Vicat or glass
transition when a material had no HDT, which surfaced TPE's glass transition of −35 °C in a column
headed "HDT at 0.45 MPa". The Method table keeps those quantities distinct.

### Estimates

Where a headline the registry marks Estimated (density, stiffness, strength, stretch and heat deflection) is missing, the
build attaches an estimate. Its design is DECISIONS D43, its code
`build/src/estimate/`, and its structure, conversions and limits are reviewed like code in
`build/mappings/estimate-model.json`.

The physics it follows since audit 2026-09-15 (D56): a polymer that prints amorphous (PET, BVOH, PVA, unfilled PPA)
deflects near its glass transition and learns nothing from annealed values; an annealed value is never averaged with
its as-printed twin; conditioned values convert to dry by the polymer's water uptake; density is bounded by the neat
polymer's range and the rule of mixtures; an unfilled bar is capped by its own highest Vicat; an elastomer has no heat
deflection estimate and no yield-to-ultimate conversion; an unknown direction never converts upwards past its
documented offset; a material's only evidence is never down-weighted as a conflict; and what its own printed data
prove (implied bounds) limits its range from below (D55). A physically implausible value informs nothing.

**Every grade has its own estimate too (D81).** The same model predicted at the grade's own row — its formulation
and its maker — gives `db.grades[].estimate[key]`: a centre, likely and plausible ranges calibrated at grade level,
how much of it rests on the grade's own values, and the values themselves. It decides nothing (screening reads the
material's), heat deflection ships none because its grade calibration does not hold, and the snapshot's
`grades.csv` shows every one.

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
| Flexural modulus, XY | about equal, spread 0.2 (learned from the grades publishing both; the validation report has the count) |
| Tensile value in Z | XY about 1.4 times Z for stiffness, 1.6 times for strength, spread 0.35 |
| Direction not stated, or only the source's own label | centred, spread 0.3 to 0.9; data may lower the offset, never raise it above the documented value |
| Measured after conditioning | dry equals conditioned plus a wet offset by the polymer's Water uptake in `polymers.csv`: high (PA, PA6, PA66, PA6/66, CoPA, PPA; modulus ×2) or low (PA11, PA12, PA612, PAHT, PPE-PS, PLA-PHB); other polymers read as dry |
| Moulded resin value | printed stiffness about 85%, strength 70 to 85%, elongation a small fraction; semicrystalline heat deflection about 30 °C lower, amorphous about the same |
| Heat deflection at 1.8 MPa | +24 °C fibre-filled semicrystalline, +8 °C amorphous |
| Glass transition (amorphous), Vicat, melting point (fibre-filled semicrystalline) | −3, −8 and −38 °C, spreads 14 to 25 °C |
| Shore hardness (elastomers) | Gent (1958) for Shore A, Qi et al. (2003) for Shore D, each with its own offset (about 45% of the relation), spread 0.6 to 0.7 |
| Yield strength or strain of an elastomer | not converted: an elastomer strain-hardens after it yields |
| Film, filament strand, bar printed off the product's recipe (D95), physically implausible value | not used |

Each documented offset is refined by the median of grades that publish both, and each spread by their
MAD; the documented value counts as three pairs. On each product only the most direct kinds are kept. An annealed
value of a grade that publishes the as-printed one is left out; repeats under different annealing schedules keep a
half-width that spans them and calibrate no conversion. A polymer that prints amorphous (`printsAmorphous`: PET,
BVOH, PVA, unfilled PPA) converts heat values with the amorphous class and learns nothing from annealed ones.

**How wide, and how it is checked.** The spread between two products of the same material is
measured directly from materials with several products (median pairwise difference). The rest are
estimated from the data above documented floors. Then each measured headline is hidden and predicted
from everything else, and both ranges are scaled until they hold the hidden value as often as they
claim. The current figures, per headline, are in `build/reports/validation-report.md`, which every build
rewrites; they are not copied here, where they would go stale.

The build fails if a likely range drifts more than 0.1 from 80%, or a plausible range falls more than
0.05 below 95%. Heat deflection is softly capped by the melting point of a semicrystalline polymer, by Tg plus
10 °C (20 °C with fibre) for an amorphous one or one that prints amorphous, and for an unfilled bar by the highest
Vicat its own grades publish. Density is softly bounded by the neat polymer's handbook range, and for a filled
compound by the rule of mixtures at 35 wt% fibre and 5 % porosity (not for a declared variant). Values outside a
physical range are rejected and listed; evidence that contradicts everything else is down-weighted and listed, unless
it is the material's only evidence for that headline; measured headlines far from their prediction (EST-OUTLIER) are
listed in the validation report and accepted with their reasons in `data/review/accepted-findings.csv`
([OPEN-PROBLEMS.md](OPEN-PROBLEMS.md) §6 names them).

**What each estimate carries.** `centre`, `lo`/`hi` (likely), `plausible.lo`/`plausible.hi`,
`strength` (`this-grade`, `this-material` or `family`: what it rests on), `precision` (`good`, `fair`
or `poor`, by per-property width thresholds), every piece of its own evidence with the converted value
and the reason for the conversion, the soft limits applied, `sharedWith` where its product is filed under another
material (both then show one estimate), `canScreen`, and where it may screen, `screenRange` (the range that decides, either end of which may be open: `null` screens nothing on that side), `screenBasis` (why each end screens) and `screenLimit` (why an end cannot).

**Unstated heat loads.** A heat deflection whose source names no load is its product's value only as published
(caveat `load-not-stated`, D84): counted apart, shown, and deciding only when the reader includes such values. Until
phase 4 a material headline in that state carried a bracket from its matrix's load gap (`hdt045.loadBracket`); no
material headline is in that state since a material's value is its products' comparable ones, and the bracket is gone.
Heat deflection does not apply to an elastomer at all (headline_definitions.csv Applies to, Morphology; D56).

**What is left blank.** For a material that names an Estimate identity, every estimated headline (density, stiffness,
strength, stretch, heat deflection) carries a value, an estimate or `notApplicable` with a reason; a blank one stops the
build (HEADLINE-BLANK). The layer strength, the two notched impact strengths, the glass transition and the price are
never estimated, nor is any headline of a material declared not estimated (Estimate identity Not applicable: a
family's "polymer not stated" home, or a polymer the model has no row for; D87, listed as HEADLINE-UNESTIMATED): where
none of its products publishes one, those show Not published and are judged unknown
([OPEN-PROBLEMS.md](OPEN-PROBLEMS.md) §5). Heat deflection of an elastomer is not applicable and never estimated (ISO
75 ends at 0.2 % outer-fibre strain, which needs a modulus near 225 MPa); a value its own source publishes is shown
only as that measurement. A support material with nothing of its own for an estimated headline is not applicable
there, not estimated. How many estimates there are, and what each rests
on (its own grade, its other grades, the family model alone), is in `build/reports/validation-report.md`. The review
snapshot's `screening.csv` lists which ends may screen.

**What it may do.** An estimate never passes a requirement; the verdict stays UNKNOWN. Where it may screen is set
every build, end by end (D48, D59). Each measured headline is hidden as far as an evidence class requires (this grade,
this material, family) and predicted honestly: the conversions that turn its product's other values into the headline
are refitted without it. Each end of the class's screening range is then a distribution-free tolerance limit of where
those true values fell: a new true value lies beyond it at most 10% of the time with 90% confidence. The end is never
inside the plausible range and moves outwards only where the tail proved too thin. A class needs 22 cases to set an
end; with fewer, an end screens only where the family model's end agrees. An end the material's own evidence lies beyond
never screens (`meta.estimateModel.properties.*.screening`, `build/snapshot/screening.csv`).
In Explore with Estimates on, an estimate screens a material out when the range it may screen on wholly fails, and no
printed measurement of the material bounds the headline from below and meets the requirement (`impliedBounds`: yield or
break strength under ultimate strength, yield strain under break strain, HDT at 1.8 MPa under 0.45 MPa, each at its
published value; D55). The same bounds limit the estimate's own range from below. Not
applicable screens the same way. (An unstated-load heat deflection bracket screened too until phase 4 removed it: a value
published without its load is now as published, D84.) Strict neither shows nor uses estimates. The earlier models are recorded in D10,
D11, D40, D42 and D43.

**Moisture, variants and bounds.** A value measured after conditioning (its Moisture state says which) converts to
dry through the wet offset for its polymer's water uptake. A grade whose Variant is set gets its own
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
nothing either. An in-scope material whose profiles publish no window on an axis gets the median window of the same
polymer's materials, or of its chemical group and matrix when the polymer has none, shifted for fibre by the
snapshot's median fibre offset (`meta.printEstimates.fibreOffset`), and a semicrystalline nozzle window starts above
the melting point. `meta.printEstimates.applied` lists every one.

## Chamber evidence

The chamber question has four kinds of answer, and only the first is a temperature.

| Kind | Example | Compiled as | Chamber gate |
|---|---|---|---|
| A published window | Bambu PC FR, 45–60 °C | `print.chamberC` | within, **partial** where only the bottom of the window is reachable, or exceeds |
| A statement in words | "Not required", "enclosure not necessary", "Recommended", a data sheet's "-" | `print.chamberGuidance`: `not-required`, `recommended` or `no-setpoint` | within for `not-required`; unknown for the other two |
| An enclosure asked for, with no temperature, for one of the eleven types Bambu Lab's guide asks an enclosure for | Bambu Lab's guide row for ABS (D90); Polymaker ABS's "Closure chamber \| Needed" (D93) | a guide row's or a profile's chamber state `enclosed` | within: the H2C's heated chamber is that enclosure |
| An estimated band | PPA, ~80–120 °C† | `print.chamberEstimate` | **none**: a band changes no verdict |

How many in-scope materials give each kind, and how many carry a band, is in the validation report's "Chamber
evidence" section (`build/reports/validation-report.md`), which every build rewrites.

A **partial** window (DECISIONS D32) is chamber-only. Bambu Lab's PPS-CF publishes 60–90 °C; the H2C reaches
60–65 °C of it, which is neither within nor a failure, so a chamber requirement reports INDETERMINATE.

"Enclosure not necessary" counts as not required, because a material that need not be enclosed needs
no heated chamber. "Enclosure recommended" alone does not count as anything (D33), with one exception: for the eleven
types Bambu Lab's guide asks an enclosure for (ABS, ABS-GF, ASA, ASA-CF, PC, PC FR, PAHT-CF, PA6-CF, PA6-GF, PPA-CF and
PPS-CF; ASA-CF and PC FR since m209), a
guide row (D90) or a maker's own profile (D93) that asks for an enclosure and states no temperature declares Chamber
state `enclosed`, and the gate reads it as within. Where it may be declared is checked across rows (PROCESS-ENCLOSED),
and a temperature the maker states still decides. A data sheet's "-" is its own state: not zero, and not "not
required".

**Bands** come from the 2026-09-13 research, authored in `data/tables/chamber_bands.csv` with
the basis and caution the research wrote. A band is attached only where no window is published and
no source says no heated chamber is needed; the validation report lists every band the evidence
superseded. Unlike a property estimate, a band cannot even screen a material out (D34, D42): it describes a
plausible setpoint, and a setpoint is a recommendation at most.

## Family entries and one home per product

Every commercial product is recorded once, under the most specific material it is. Twenty-one canonical names
are not materials: PA, PA-CF, PA-GF, TPE and, since m141, TPU are families (TPU over its five hardness classes); CoPA
is another name for PA6/66; and fifteen one-product rows named after a maker's product line (Bambu's PLA Basic, PETG
HF, TPU 90A and the rest, and eSUN's PLA Lite) are aliases of the material or class their product is (D86). Their
Scope is `Family entry`, their members are in `data/tables/family_entries.csv` and `family_members.csv`, and they
carry no grade, value, property estimate or print window. They are never candidates. Searching a family's name
lists its members and says what the family is; its drawer links them.

Until 2026-09-13 these rows held other rows' products: one PolyMide CoPA data sheet appeared under PA,
PA6/66 and CoPA with the same numbers three times, and PA-CF's headline was PA12-CF's. The fix retired
each duplicate grade with the retirement marker and marked its measurements and evidence `Retired
duplicate record`, after proving each has an identical twin under the grade that keeps the product.
Those records stay in the tables as an audit trail and never reach `db.json`. Products filed under a
generic row but belonging to a specific one moved there with every record (PA6-CF, PA6-GF, TPU).

Since m141 a product moves by its MaterialID (`scripts/data/records.mjs`, `moveGrade`; D86): the grade, every record
filed under it and the printing citations of its own profiles and evidence change material, and every ID stays. A
GradeID keeps the number of the material it was first filed under (G002-01, Bambu PLA Basic, is a PLA). The row it
left becomes an alias, whose live coverage findings are superseded by Not applicable rows.

The build fails if a family entry owns an active grade, if the mapping and the materials table disagree, or
if a member is not an in-scope material; a test fails if any data sheet is filed under two materials.

## Evidence ownership and coverage

A valid identifier is not enough to establish ownership. Every measurement, print profile, price
observation and use record names both a `MaterialID` and a `GradeID`; the grade must belong to that
same material. Every product value cites that product's own measurement, or its twin's where it reads its twin (D89),
and a material's range is its products', never one product's values presented as if they described the material
(D83).

A material's grade list (`gradeIds`) is its procurement list: every grade with Role `procurement` and
Status `active`. Study and resin-reference grades (Role `study` or `reference`, and an `-R#` ID suffix
the build keeps in agreement with the role) deliberately stay outside it: they can provide clearly
labelled context, but they are not products a reader can procure, and no material's value comes from them.

The evidence lists do not have identical ownership rules:

| List | Where it comes from | What it may cite |
|---|---|---|
| use | `material_links.csv`, Link `use` | The material's records and explicitly labelled family context |
| environmental | derived | Exactly this material's own exposure, solubility and moisture records |
| durability | `material_links.csv`, Link `durability` | The material's records and explicitly labelled family context |
| safety | `material_links.csv`, Link `safety` | The material's records and explicitly labelled family context |
| polymer | derived from `polymer_environment.csv` (D64) | Its base polymer's published behaviour, one inferred record per category in which the material has no record of its own, in `db.polymerEvidence`: shown, may screen, never passes |

Family context is useful background, but it cannot make a grade appear chemically tested, which is why
environmental evidence is never authored: it is always the material's own records. The polymer-level records are
labelled as the polymer's, never the product's. And since D98 a **product** is judged on its own records, or its twin's:
a sibling's record, or one filed under the material with no product, is context for it. A coverage finding may name the
product it is about (`coverage.csv` GradeID, m213), and a conflict about one product holds out that product only.

Coverage is terminal: it reports gaps and never feeds candidate selection. It still must describe
the records truthfully. `build/src/coverage-rules.js` defines what counts as own data for Mechanical,
Thermal, Print setup, Moisture / environmental and Canadian price coverage. The same definitions
drive both the coverage rows the build derives (D74) and validation, so a row cannot say `Gap` beside its own data,
claim `Evidence recorded` on another material's family notes, or quote the wrong manufacturer count.

An environment category is a **verdict** category where its findings reduce to resistant, limited or not resistant,
so it can answer a pass/fail question; an **indicator** category has records but no reducible verdict, so it only
shows evidence and is never offered as a requirement. A category with polymer-level records (D64) is offered as a
requirement even where no grade-level record states a verdict: there it can screen a material out and never pass one.
Per category, the records, those with a verdict, the materials they cover and the materials the polymer-level records
cover are in the validation report's "Environment evidence" and "Polymer-level behaviour" sections
(`build/reports/validation-report.md`), which every build rewrites.

## Makers' know-how

What a maker writes about printing and using its product beyond the numbers is recorded in `evidence.csv`, one
statement per row, in the maker's own words (spaces normalised, full-width punctuation written in ASCII, nothing else
changed), with its source and page (Locator `p. N`) and the exact product it was printed for. Domain is "Makers'
know-how"; Topic is one of twelve know-how topics in `schema/vocab/environment-topics.csv` (Good for, Benefits, Pitfalls
and limitations, Warping and shrinkage, Precision and tolerance, Surface finish, Adhesion between layers, Moisture
sensitivity, Nozzle wear, Odour and emissions, Supports and removal, Printing advice), all mapped to the category
`know-how`, which is not filterable. A statement from the maker's own product page is labelled by its source's class
("Manufacturer product page or guide") as the maker's marketing text, apart from a data sheet's.

They are the record tier (D85) made visible, and never decide anything. `build/src/know-how.js` moves them out of
`db.evidence` into `db.knowHow`, so the engine's evidence, the environment criteria, the polymer-level layer (D64),
coverage and the evidence counts are what they were without them; a scenario cannot name the category, because only
filterable categories reach `meta.environmentCategories`. `test/know-how.test.js` runs the six templates with the
statements put back beside the evidence and finds every answer unchanged.

**Where a product's documents are silent, the gap is a state, derived by the build** (D74), in `grades[].knowHow`:

| State | Means |
|---|---|
| `collected` | at least one statement is recorded on the product |
| `sheet-silent` | its documents were read (a `know_how_reads.csv` row, Scope `document`) and gave none; the maker's site not yet searched |
| `searched-nothing` | the maker's site was searched for it (Scope `maker site`, dated) and gave nothing |
| `no-document-read` | none of its documents was read: none is cached, or none was read yet |

A product's documents are the sources the tables already link to it: its own source, its profiles' and its
measurements', and a source naming it in Applicable grades. Which of them were read is not derivable (a document with
no statement may be silent, or unread), so it is recorded in `know_how_reads.csv`. The same states are given for three
parts of the print recipe a sheet may leave out, `recipe.chamber` (a chamber state or an enclosure need), `recipe.drying`
and `recipe.annealing` (a schedule from the product's measurements or an annealing statement). `materials[].knowHow` counts
its procurement products by state and, per topic, how many makers and products have a statement ("7 of 12 makers mention
warping"), and `sitesSearched`, how many of its products' makers' sites were searched; a material is collected when any
product is. The Products tab shows both, and a silent product says so in
place of an empty section, naming its maker. `npm run audit:know-how` writes the maker-site search worklist,
`docs/audits/2026-09-25-re-center/KNOW-HOW-WORKLIST.md`, from the same states.

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

Several are warnings in `build/reports/validation-report.md`, and each is surfaced in the interface where it applies.
The figures are not repeated here: [OPEN-PROBLEMS.md](OPEN-PROBLEMS.md) gives the query that re-derives each one.

- A value published without its direction or its load (a heat deflection naming the standard but not the load) is its
  product's value only as published (D84): counted apart, shown, and deciding only where the reader includes such
  values. OPEN-PROBLEMS §15 lists those that decide and that no cached sheet settles.
- Impact values in J/m cannot share an axis with the kJ/m² rows without specimen geometry the sources never
  published, so no impact headline takes one (IMPACT-UNITS). Izod results are one property, "Izod impact strength",
  since m22.
- PA66-CF and PA612-GF have no property measurements at all (NO-MEASUREMENTS). Neither has a defensible exact
  commercial grade.
- Published values flagged physically implausible (m24) and quarantined ones each keep their reason and back nothing
  (OPEN-PROBLEMS §2 and §3).
- A product declared a variant (Spectrum PA6 Neat and Spectrum HDPE, an undisclosed dense filler) keeps its own values,
  counted apart from its material's range. HyperLite PP is its own material, PP Lightweight, whose one product is its
  variant.
- Whether a published density is of the filament, a printed part or the resin is not recorded; several filled
  grades publish densities below their neat polymer.
- Where a polymer has little data of its own, its estimates rest on family-driven ranges. Such an estimate does not
  screen on the side its own evidence contradicts (D59).
- A property the source states in words, such as "No break" for a Charpy test, has the data status
  "Published qualitative result". It is shown in its own words and is never a number.
- UV and outdoor has no grade-level verdict (a handful of records, none reducible to one); it filters only through
  polymer-level records (D64), which may screen and never pass.
- `polymers.csv` records where most polymers' melting point, water uptake and neat density come from as "Not recorded"
  with a basis (handbook values compiled for the physics audit); the rows added since cite a resin producer's sheet
  (D60): `npm run sql -- "select polymerid, sourceid from polymers where sourceid <> 'Not recorded'"`.
- The measured headlines the honest hold-outs flag as far from their prediction (EST-OUTLIER) are products carrying a
  filler the model has no covariate for; each is accepted with its reason, and OPEN-PROBLEMS §6 says which were
  re-read.
- The build derives a coverage row for each domain a material's own records prove (D74), and checks a stored row's
  "Gap" or "Evidence recorded" against the records for mechanical, thermal, print setup, environmental and price data,
  and a Grades row's manufacturer count against its products (m32); the other coverage findings are prose a reviewer
  wrote, and the Post-processing / application domain cannot be derived (OPEN-PROBLEMS §7).

## Retired identity mappings

A grade with Status `retired` compiles to `retired: true`. Status is the one place a retirement is recorded;
Availability keeps what was recorded about buying the product, which a retirement of the grade record does not change
(m147, where "Retired mapping; audit trail only" left the column and GRADE-RETIREMENT-HALF with it).
The grade and its profiles remain identifiable in the archival data, but cannot appear in active
a material's grade list, print summaries/gates, the Grades or Printing drawer, or procurement counts.
G091-01 / P0115 is the retired CPE-HG100-to-CoPE mapping; active CoPE uses only G091-02.

## Raw-value reconciliation

`build/src/measurement-rules.js` independently checks every numeric observation against its raw
values and unit conversions, including each uncertainty and upper bound. Decimal commas are retained, thousands-separated cycle counts remain
integers, and qualitative outcomes use their own status. Product values are checked for property, unit, value,
direction and ownership (MEAS-HEADLINE-TYPE, HEADLINE-CITATION, HEADLINE-DIRECTION). An unstated HDT load decides
nothing unless the reader includes values published that way (D84).
