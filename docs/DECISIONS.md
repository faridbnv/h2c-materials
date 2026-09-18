# Decisions

The choices that are not obvious, and the bugs that forced several of them. Each says what would
break if it were reversed, because that is the part that gets lost.

<!-- index: npm run docs:decisions -->

| | Decision | Status |
|---|---|---|
| D1 | Excel is the authoring format; JSON is the runtime | Authoring superseded by D45 |
| D2 | Headline values are verified, never recomputed | In force |
| D3 | Missing data is four states, never zero | In force |
| D4 | INDETERMINATE is not UNKNOWN | In force |
| D5 | Evidence outranks silence in gate aggregation | In force |
| D6 | A recommendation is not a requirement | In force |
| D7 | Only gates that can discriminate become filters | In force |
| D8 | Related evidence reports one measurement, never a cross-grade range | In force |
| D9 | No cross-property fallback | In force |
| D10 | A family estimate may rule out, never rule in | Superseded by D40, D42, then D43 |
| D11 | Estimates never pool across behaviour classes | Narrowed by D40, D42 and D43 |
| D12 | Peers sharing a formulation key count once | In force |
| D13 | The reference layer is separate and off by default | In force |
| D14 | The engine never imports from the interface | In force |
| D15 | Tabulator was dropped; Plotly kept | In force |
| D16 | The data is embedded gzipped | In force |
| D17 | One vocabulary module, and no second way to name anything | In force |
| D18 | The familiar baseline is a reference, never a candidate | In force |
| D19 | No sampled offer is UNKNOWN, not FAIL | In force |
| D20 | Category names are authored with the rules that create them | In force |
| D21 | One control for how much evidence the chart draws | In force |
| D22 | Search matches words, never substrings | In force |
| D23 | An estimate is drawn as a range, never as a point | In force |
| D24 | A relaxed condition and an unstated fact are different things | In force |
| D25 | In the measurement plot, a dot is a test and must say so | In force |
| D26 | The verdict describes the evidence; the policy decides eligibility | In force |
| D27 | The nozzle question asks what the user lacks | In force |
| D28 | Limited resistance is not resistance | In force |
| D29 | A template names what it cannot check | In force |
| D30 | The snapshot date comes from the workbook (now `data/tables/method.csv`) | In force |
| D31 | A quarantined observation backs nothing | In force |
| D32 | A chamber window the printer only partly reaches is partial, and only the chamber has one | In force |
| D33 | "Enclosure not needed" clears the chamber; "enclosure recommended" does not | In force |
| D34 | An estimated chamber band decides nothing | In force |
| D35 | A research report is re-read against its sources, never transcribed | In force |
| D36 | Referential integrity includes ownership, not just existence | In force |
| D37 | A headline belongs to the representative grade; study grades are not procurement grades | In force |
| D38 | Environmental evidence is owned by the material; family evidence stays context | In force |
| D39 | Coverage is terminal, but it must agree with the records | In force |
| D40 | Peer observations are context, not exclusion bounds | Superseded by D42, then D43 |
| D41 | Raw values, endpoints and archived identities are enforced | In force |
| D42 | An estimate is a prediction interval from like-for-like evidence, and may only screen | Superseded by D43 |
| D43 | An estimate is a calibrated model of every observation, and says how far to trust it | In force |
| D44 | Each product has one home; a family is an entry, not a material | In force |
| D45 | The source of truth is CSV tables under a declared schema | In force |
| D46 | A property is a registry row, and may apply to some filaments only | In force |
| D47 | What can be calculated is not stored | In force |
| D48 | Evidence screens only where a back-test shows it screens reliably | Amended by D55, D59 |
| D49 | The values the build decides on are typed columns; raw text stays, and the parsers check it | In force |
| D50 | Every check has a code, and quality findings are fixed or accepted with a reason | In force |
| D51 | Hand-maintained mappings are keyed by ID and checked at the gate; so are names the code relies on | In force |
| D52 | The transfer is proven cell by cell; every later correction is re-read, guarded and replayable | In force |
| D53 | The estimate model reads declared states, not wording; and every change shows its downstream effect | In force |
| D54 | A published mean ± band is judged on its mean; the band flags a result close to the limit | In force |
| D55 | A value physics rules out is kept, flagged and decides nothing; only a printed part bounds a printed headline | In force |
| D56 | The estimate model follows printing physics: crystallisation, water uptake, mixing, and what an elastomer cannot have | In force |
| D57 | Identity is a record's job: compounds are declared, a replaced name keeps its record, and every build finding is reviewed | In force |
| D58 | Estimates are an overlay on a complete core, and grow by data, not by special cases | In force |
| D59 | A screen rests on an end the back-test has shown, one end at a time, never against the material's own evidence | In force |
| D60 | What the estimate model knows about a polymer, a variant or a product's hardness is data, in tables | In force |
| D61 | No meaning lives only in a tooltip | In force |
| D62 | A narrow screen scrolls what does not fit inside its own box, and never squeezes it | In force |
| D63 | A source's Title is what the publisher printed, and a specimen's print parameters are the tested conditions, not the guide | In force |
| D64 | Polymer-level behaviour is shown and may screen, never passes | In force |
| D65 | A test method that defines its load states that load; the typed value says so in Parse review | In force |
| D66 | A templated safety data sheet is evidence only where it speaks about the product | In force |
| D67 | A property is a row, not a pair of columns: the reference envelopes are long | In force |
| D68 | A datasheet sentence is data, not a vocabulary: the state is a column on the row | In force |
| D69 | A profile's qualitative notes are rows, and an empty column is not a fact | In force |
| D70 | A constant is not a per-material fact, and a summary of the data is not data | In force |
| D71 | How a source was classed and how it was reached are states, not sentences | In force |
| D72 | A record may leave a table only where the build derives it, and only through a ledger | In force |

<!-- end index -->

---

## D1. Excel is the authoring format; JSON is the runtime (authoring superseded by D45)

A browser can parse XLSX, but doing so couples the interface to workbook layout, pushes validation
failures into the user's session, and makes output non-deterministic. The workbook is never written
by anything here.

Since 2026-09-14 the authoring format is CSV tables under a declared schema (D45). The second half
stands: JSON is the runtime, and the build is the only thing that produces it.

## D2. Headline values are verified, never recomputed

The Materials sheet already cites the MeasurementID behind each headline. The build checks the
number equals its citation rather than deriving a headline itself. All 361 reconcile. A price
headline must also cite only the observations its median was built from.

This converts a class of judgement calls into build errors. Corrupting one density cell produces a
named error and no output.

Amended by D47: the number is no longer typed twice. `headlines.csv` selects the measurement and the
value is read from it, so there is nothing left to reconcile; the build checks the selection instead.

## D3. Missing data is four states, never zero

Not published, insufficient comparable data, not applicable, quarantined. They mean different things
and are different engineering answers. A tool that renders them all as blank invites the reader to
assume the value is low.

## D4. INDETERMINATE is not UNKNOWN

UNKNOWN means no comparable evidence exists. INDETERMINATE means evidence exists and the threshold
cuts through it. Collapsing them would turn "the source cannot settle this" into "nobody has
measured this", which sends the reader looking for the wrong thing.

## D5. Evidence outranks silence in gate aggregation

A material's process gate aggregates across its profiles with precedence
`within > partial > exceeds-recommended > exceeds > unknown`. `partial` exists for the chamber only
(D32).

PEEK publishes two profiles demanding 390–430 and 400–480 °C against the printer's 350 °C, plus one
that publishes nothing. Letting the silent profile decide reported PEEK as "unknown" and discarded
real evidence. With the precedence corrected, all six excluded materials trip the envelope gate on
their own published requirements, independently agreeing with the workbook's own `Scope` column.
PPS-GF still reports "within", because one of its grades genuinely fits.

## D6. A recommendation is not a requirement

"Recommended 70-140C if possible" exceeds the 65 °C chamber but does not make the material
unprintable. Treating it as a hard requirement would wrongly exclude printable materials; ignoring
it would hide a real caveat. It returns `exceeds-recommended`, which warns without excluding.

## D7. Only gates that can discriminate become filters

Section 8.2A of the brief lists eleven process gates and says they should come first. The Print setup
sheet does not support that: routing and AMS read "verify the exact grade" on 140 of 167 profiles,
enclosure is unpublished on 148, difficulty on all 167.

Five gates ship: scope, H2C status, the three parsed temperatures against the baseline, plus
abrasion and drying. The rest appear as evidence in a material's Printing tab. A filter that passes
everything is worse than no filter, because it teaches the reader to trust a check that checked
nothing.

## D8. Related evidence reports one measurement, never a cross-grade range

PEBA's three grades measure 7.5, 25 and 30 MPa. "7.5 to 30" reads as one material's uncertainty
rather than three different products, and the Method sheet forbids cross-grade family ranges.

## D9. No cross-property fallback

An earlier version fell back to Vicat or glass transition where a material had no HDT. For TPE that
put a glass transition of −35 °C in a column headed "HDT at 0.45 MPa" — a different physical
quantity, and actively dangerous for anyone screening on heat resistance. Same-property only.

## D10. A family estimate may rule out, never rule in (superseded by D40, D42, then D43)

The asymmetry is the whole design. Knowing every measured unreinforced PLA falls between 2.8 and
15.3% elongation is enough to say PLA Lite is not an elastomer. It is not enough to certify PLA Lite
clears a 5% floor, because the bound is drawn from its relatives.

Reversing this would let inference satisfy a requirement, which the brief forbids outright. Before
estimates, a search for elongation at least 100% returned 35 materials including PLA Lite and the
nylons; it now returns 14, of which 8 are genuine elastomers and 6 are supports that honestly have
no peers.

## D11. Estimates never pool across behaviour classes (narrowed by D40, D42 and D43)

"All unreinforced materials" spanned TPU at 0.0053 GPa and PLA at 2.88 GPa. Three orders of
magnitude rules nothing out and implies a support material might be as stiff as a structural one.
Elastomers, supports and rigid thermoplastics are separate populations.

## D12. Peers sharing a formulation key count once

PA, PA6/66 and CoPA all draw their headline from a single PolyMide datasheet. Counting them as three
peers produced an "estimate" of 2.223 to 2.223 GPa: a precise value dressed as a range, claiming
three corroborations where there is one. The Method sheet states the rule directly.

## D13. The reference layer is separate and off by default

114 generic materials compile to their own file and never enter the candidate set, counts, Pareto
fronts, search or exports. They are bulk and molded values while the candidates are printed and
anisotropic, which is exactly the silent condition-mixing guardrail 4 forbids. On by explicit choice,
with a banner.

## D14. The engine never imports from the interface

It is what makes the decision logic testable without a browser, and it is enforceable by inspection.

## D15. Tabulator was dropped; Plotly kept

The brief names both. At 102 rows a data grid's virtues do not apply, every cell needs custom
rendering for the provenance typography, and sorting plus export came to about a hundred lines. That
removed 430 KB and a dependency.

Plotly earns its size on log axes, error bars, shapes and lasso. Its parallel-coordinates trace does
not: it needs WebGL, which fails outright on many machines, so that lens is hand-drawn in SVG.

## D16. The data is embedded gzipped

Raw `db.json` is about 3 MB, almost all repeated condition strings; gzipped it is under 200 KB,
inflated at boot with `DecompressionStream`. No schema change, no interning, and the plotting
library rather than the data becomes what the file weighs.


## D17. One vocabulary module, and no second way to name anything

`app/js/ui/labels.js` owns what every property and every criterion is called. Before it, three code
paths described the same property three ways: the drawer said "Stiffness", the table said "Tensile
modulus XY", and the explain panel printed `hdt045 >= 100` because it formatted the raw constraint
object itself.

The leak is the point. A second describe function does not look wrong when you write it; it looks
wrong three screens away, months later, to a reader who now doubts the number next to it. Anything
that names a constraint calls `describeConstraint`, and a new constraint kind without a case there
puts its internal key on screen.

Reversing this reintroduces the class of bug rather than any one instance of it.

## D18. The familiar baseline is a reference, never a candidate

4.43 GPa means nothing to someone who has only printed PLA. PLA, PETG, ABS, ASA and PC can each be
set as an anchor, drawn as a row in the table, a labelled cross on the chart and a grey bar in
Compare.

It is off until chosen, and while it is on it is excluded from the counts, the Pareto front, the
shortlist and the exports. Putting it in the results would mean the filters returned a material
nobody asked for, which is exactly the trust problem the rest of this document is about. It shares
that treatment with the generic reference layer (D13) and nothing else: the baseline is real data
out of `db.json` with its own citations, while the reference layer is uncited bulk values.

## D19. No sampled offer is UNKNOWN, not FAIL

The availability criterion answers "only show me what I can buy". A material that no sampled
retailer listed reports UNKNOWN; one that was listed and out of stock reports FAIL.

The asymmetry is the same one that governs estimates. Three Canadian retailers on a single day is
evidence that something *is* purchasable when it appears, and no evidence at all when it does not.
Failing the unsampled ones would assert a market fact the snapshot cannot support, and would do it
in the one part of the tool a user is most likely to act on immediately.

Practically this changes little: in Strict mode both are removed, which is what was asked for. In
Explore the unsampled ones stay visible and flagged, which is the honest reading.

## D20. Category names are authored with the rules that create them

Environment category display names live in `build/mappings/environment-topics.json` (since m09, `schema/vocab/environment-categories.csv`), next to the
topic patterns, and compile into the snapshot in two forms: a heading ("Acid resistance") and a
sentence noun ("acids").

The app previously built a name by appending "resistance" to the internal key, which produced "water
solubility resistance". The obvious fix is a lookup table in the interface, and it is the wrong one:
the engine also names categories in its reason strings, and the engine may not import from `ui/`
(D14). Authoring the name where the category is defined gives both one source and keeps the layer
rule intact.

## D21. One control for how much evidence the chart draws

The Ashby lens had two switches, "Points" (headline against measurements) and "Comparability"
(strict against broad). That reads as four combinations and is three: comparability can do nothing
in headline mode, because a headline is a single fixed value with no measurement conditions left to
match. The two duplicate combinations gave no sign they were duplicates.

Worse, its "Strict" meant measurement conditions while the top bar's "Strict" means missing data,
two unrelated ideas under one word on one screen.

They are now one ordered choice of three, each with a line saying what it does. Nothing was removed:
every state the old pair could reach is still reachable.


## D22. Search matches words, never substrings

A bare substring test for "PLA" matches "Thermoplastic Polyurethane". Searching for the most common
filament on earth returned every TPU and TPE in the database, and nothing about the result looked
wrong: it looked like the tool believed TPU was a kind of PLA.

Each field is split into words and a query term has to begin one. Every search a person actually
types still works — "pa6" finds PA6-CF, "cf" finds the carbon-filled grades, "95" finds TPU 95A,
"support" finds the support materials via their family — and "PLA" can no longer surface a material
because the letters sit inside a longer word.

Slashes are separators, so "Support for PLA/PETG" answers to either name, which is right: it is
genuinely about both.

## D23. An estimate is drawn as a range, never as a point

The chart plotted only measured headlines, so on density against stiffness 25 of the 96 in-scope
materials simply were not there. The table two tabs away listed them with their estimated span, and
in Explore an estimate can screen a material out of a filter (D43), so a reader could see a material
screened by an estimate and find no trace of that estimate on the chart.

They are drawn as a lightly outlined range. Not a dot: a dot needs a value, and the centre of an estimate
is a number nobody measured, which is the one thing this tool refuses to put on a chart. Where the
other axis is measured the range collapses to a thin capped line; when both axes are estimated it is
an almost transparent outlined box. Its outline follows the material family's colour, and measured
points render above it. Each range remains in ordinary data coordinates, so Plotly applies linear
and logarithmic scales consistently.

The layer is off by default because 25 overlapping boxes are less readable than none, but the count
is in the footer whether the layer is on or off. That is the part that matters: the reader is never
left to infer that a quarter of the set does not exist.

Estimated materials never join the Pareto front and never count as plotted candidates. Inference
cannot dominate evidence.

## D24. A relaxed condition and an unstated fact are different things

The measurement plot marked a point hollow, and announced "mixed conditions are included here",
whenever a measurement carried any remark at all. One of those remarks is that the source did not
name the specimen form, which on an axis with no direction requirement — density — is the ordinary
case and not a mismatch with anything.

So strict mode, whose whole purpose is to admit nothing questionable, displayed a warning that it
had mixed conditions and drew perfectly comparable points as if they were suspect.

`measurementMatches` now returns `relaxed` separately from `notes`. Only a relaxation, something
strict would have rejected, makes a point hollow or reaches the banner. The rest is context on
hover. A warning that fires when nothing is wrong is worse than no warning, because it teaches the
reader to ignore the one that matters.

## D25. In the measurement plot, a dot is a test and must say so

The mode draws one point per grade per measurement, which is the evidence behind the headline and
the only place anisotropy is visible. It was also unreadable: a field of anonymous dots, each
labelled with its own grade and direction until the labels covered the data, and no way to tell six
measurements of one material from six different materials.

Three changes, no loss of information. The dots of one material are joined by a faint line, so a
cluster reads as one thing measured repeatedly. The name goes on the leftmost dot of each material
rather than on every dot, with grade and direction on hover. And the footer leads with the sentence
the mode cannot work without: a dot is not a material.

The footer first said each dot was "one test result". It is a pair of measurements of one grade under
compatible conditions, which the source rarely ties to a single specimen, so the sentence now says
that. The index card counts materials, not dots, for the same reason.

## D26. The verdict describes the evidence; the policy decides eligibility

A material whose requirement cannot be checked is UNKNOWN in both modes. Strict holds it out of the
results and Explore keeps it flagged, but neither changes what the verdict says.

Strict used to turn "could not be checked" into FAIL. The FAIL count then mixed materials that failed
a test with materials nobody had measured, the excluded list and the export said "does not work" for
both, and the four-state vocabulary the rest of this document defends collapsed into three at the
one level a user reads. Reversing this makes a missing measurement look like a bad material again.

## D27. The nozzle question asks what the user lacks

"I have a hardened nozzle" removed materials: 75 have no abrasion guidance, and Strict held them all
out. More hardware can never make fewer materials printable. The criterion is now "I don't have a
hardened nozzle". It fails a recorded requirement, holds a fibre-filled material with no guidance as
UNKNOWN because the filler is the known cause, and passes the rest with a reason saying no
requirement was recorded. A `hardenedAvailable: true` constraint from an old link passes everything.

This is a deliberate exception to "absence is not evidence", made visible in its wording: the
criterion screens on a recorded requirement, and the rail says a missing record is not proof a
filament is safe for brass. Treating every unrecorded material as UNKNOWN would leave Strict with no
material at all, because no source in the snapshot states "no special nozzle concern".

## D28. Limited resistance is not resistance

An environment criterion passes only on an unqualified positive record: "resistant", or "insoluble"
for water. "Limited" is INDETERMINATE on its own and alongside a positive record. The rail used to
request `['resistant', 'limited']`, which passed PLA on a solvent screen because one record said its
resistance was limited; and "insoluble" was never accepted, so the water criterion could not pass at
all. Old links carrying the `require` override have it removed on load.

A pass still means resistance to the exposures a source tested, not to every chemical in the class,
and the reason says so. Choosing the exact agent first needs data most records do not carry.

## D29. A template names what it cannot check

Each template carries `notChecked`, shown beside the result count, and screens out support
materials. The descriptions used to promise outcomes no criterion tested: "survives a hot day in the
sun", "springs back", "prints without a heated chamber". The last was simply false, since the chamber
gate compares against the H2C's own actively heated 65 °C. The indoor template also dropped its
chamber gate, which tested nothing about ease of printing and held out PLA Basic for not publishing
a chamber temperature.

## D30. The snapshot date comes from the workbook (now `data/tables/method.csv`)

The build used to carry the snapshot date as a constant. The 2026-09-13 manufacturer audit moved the
Method sheet to a new snapshot, and every filename, "data" label and export would have kept naming
the old one. The date is now read from the Method sheet's Scope / Snapshot row, and the build stops
if that row does not start with a date.

Prices keep their own date. The audit re-sampled no prices, so "sampled 2026-09-10" beside a price
is true and "2026-09-13" would not be. `meta.pricesSampled` carries it.

## D31. A quarantined observation backs nothing

The workbook marks a wrong-product price listing by starting its price basis with "Quarantined" and
clearing its CAD/kg. The build keeps the row, so the audit trail survives, and excludes it from the
buy link and from the evidence that a material is in stock. The Price tab shows it struck through.

A price headline must cite only observations in its headline sample. When CA0069 was quarantined the
ABS median moved to 25.99, but the Materials row still cited CA0069 and still said "2 observations",
and the build did not notice because it checked only the value. It checks the citation now.

## D32. A chamber window the printer only partly reaches is partial, and only the chamber has one

A process window was read by its upper end, because the question is whether a material needs more
than the printer gives. For a chamber that failed materials whose own window starts below 65 °C:
ABS-CF publishes 50–70 °C, 50–65 °C of it is reachable, and it failed the chamber criterion outright.
Bambu PPS-CF publishes 60–90 °C and would have failed the same way once its window was recovered.

Such a window is now `partial`, which the engine reports as INDETERMINATE. It is not `within`: most of
the window is out of reach, and Bambu says the upper part improves Z strength. It is not a failure
either, because a setting inside the manufacturer's own window is available.

Nozzle and bed keep the upper-end rule. There the bottom of a window sits at the hardware's rated
maximum, 350 °C or 120 °C, which is not a margin anyone should run at by default, and the six
out-of-scope materials trip the gate on exactly those rows: PEKK's nozzle is 345–375 °C, PSU's
350–380 °C. Applying `partial` everywhere would turn three of those exclusions into caveats.

## D33. "Enclosure not needed" clears the chamber; "enclosure recommended" does not

Five Spectrum data sheets answer the chamber question only in their enclosure row. A material that
does not need to be enclosed does not need a heated chamber, so "not necessary" clears the chamber
gate, and the Printing tab says the answer was read from the enclosure row.

The reverse inference is not made. An enclosure being recommended says nothing about whether 65 °C is
enough, and an enclosure is not an actively heated chamber, so it leaves the chamber unknown. The same
goes for "Recommended" with no number in the chamber row, and for a data sheet that prints "-", which
is its own state: not zero, and not "not required".

## D34. An estimated chamber band decides nothing

The 2026-09-13 research proposed chamber bands for materials that publish no chamber temperature.
They are kept, in `build/mappings/chamber-estimates.json` (since m09, `data/tables/chamber_bands.csv`), and shown marked †, but unlike a property
estimate (D43) a band cannot even screen a material out.

A property estimate is built from verified measurements of the same property. A chamber band is a
researcher's judgement of a plausible setpoint, and a setpoint is at most a recommendation, which
never removes a candidate (D6). The evidence agrees: of the bands that met a real value, Support for
PA/PET publishes 45–60 °C against a band of 20–45, and PPA-CF 50–80 °C against 80–120. A band that
excluded PPA-CF would have excluded a material whose own data sheet says it partly fits.

A band is attached only where no source publishes a window and none says no heated chamber is needed.
The superseded bands are listed in the validation report, so a reader can see which inferences the
evidence has already overtaken.

## D35. A research report is re-read against its sources, never transcribed

The 2026-09-13 research was careful, and still wrong in four places that mattered: it said the Bambu
PPA-CF data sheet had no chamber range (it has 50–80 °C), that PET-GF15 recommends a chamber (its data
sheet says room temperature), that PLA-Lite's HDT was at 0.45 MPa (no load is stated), and it did not
mention that the PET-GF15 mechanical specimens were annealed. It also missed that the three chamber
windows it recovered were three of fourteen, all dropped at the same page break.

So nothing enters the workbook from a report. Each value is re-read from its source, each fetched
file's SHA-256 is recorded, and a source that cannot be retrieved contributes nothing, however
plausible the value attributed to it. The edit is a script with a changelog, and it refuses to run on
any workbook but the one it was written against.

Since D45 the same rule holds for the tables. A scripted edit goes through `scripts/data/table-io.mjs`
and states the value it expects to replace, so it refuses to run on data that has moved;
`npm run data:diff` produces the record-level changelog from the commit itself.

## D36. Referential integrity includes ownership, not just existence

A `MaterialID`, `GradeID` and `SourceID` can each exist and still describe the wrong relationship.
A measurement filed under PC FR while naming a PLA grade passes three ordinary foreign-key checks
and then puts PLA data on a PC screen.

The validator therefore checks every measurement, profile, price and use record against the
material that owns its grade. It also checks every cited record belongs to the material presenting
it. Mutation tests deliberately create valid-but-wrong relationships and require named errors.

## D37. A headline belongs to the representative grade; study grades are not procurement grades

The Materials row is a labelled single-grade observation. If density comes from one grade and
strength from another, the row looks like a property set for a formulation that does not exist.
Every measured headline must therefore cite the representative grade.

`GradeIDs` lists commercial grades that can be selected or procured. Supplemental research grades
carry an `-R#` suffix and stay outside it. PA12's fatigue study grade is useful context, but it does
not make a PA12 product available and cannot become the representative grade.

## D38. Environmental evidence is owned by the material; family evidence stays context

The Environmental evidence column had become a copy of family application notes for 31 materials.
That made PC FR look chemically evidenced by records written for another polycarbonate material,
while other materials omitted records from their own data sheets.

Environmental evidence now means exactly the material's own exposure, solubility and moisture
records. Use, durability and safety may still cite explicitly labelled family context, because those
fields are narrative and the relationship is visible. Family context cannot settle a grade-level
environment criterion.

## D39. Coverage is terminal, but it must agree with the records

Coverage never feeds selection, so an inconsistency cannot change the candidate list. It can still
send the next researcher in the wrong direction: PC-GF said Print setup was a gap beside two
profiles, while several environmental rows claimed evidence that belonged only to their family.

`coverage-rules.js` defines “own data” once for mechanical, thermal, print, environmental and price
domains. The audit planner and validator both use it. A `Gap` beside data, an evidence claim without
own records, or an incorrect procurement-manufacturer count now stops the build.

---

# Bugs worth remembering

Each is pinned by a test. They are listed because all of them produced plausible-looking wrong
answers rather than failing.

| Bug | What it did | Pinned by |
|---|---|---|
| Leading minus in the number pattern | Read the dash in `255-275C` as the sign of -275, which failed the plausibility window and collapsed the range to 255 | `normalize.test.js` |
| Annealing text scraped as a chamber requirement | `Room Temp. Annealing temp. and time 100 °C/16H` wrongly excluded four printable support materials | `normalize.test.js` |
| Silence outranking evidence in gates | Reported PEEK as "unknown" despite two profiles demanding 430 and 480 °C | `database.test.js` |
| Excel booleans | SheetJS renders them `TRUE`/`FALSE` while the stored XML holds `1`/`0`; every price headline failed to verify | `normalize.test.js` |
| `String.replace` with a string payload | `$&` in minified library source scattered the placeholder tag through the bundle 30 times | asserted in `bundle.js` |
| Plotly shape coordinates on log axes | Are in log space; passing raw values put the steel reference rectangle at 10^215 | visual |
| Policy drift | An unrecognised policy made verdict and eligibility disagree, so a shared Explore link rendered as Strict | `constraints.test.js` |
| `text-overflow: ellipsis` on table cells | Clipped the UNKNOWN chip to a stray dot and "Not published" to "Not publis…" | visual |
| Cross-grade estimate ranges | Turned one PolyMide datasheet into "2.223 to 2.223 GPa" | `database.test.js` |
| Compare bar fill was a `span` | An empty inline element ignores width and height, so the lens whose entire purpose is aligned bars drew empty tracks for every material, for as long as it existed | visual |
| Search ran over the filtered set | Setting a heat requirement and searching "PLA" returned nothing, which reads as "PLA is not in this database" | visual |
| A second path describing a constraint | Printed `hdt045 >= 100` in the explain panel while the pill beside it read "Heat resistance at least 100 °C". Found twice more after the first fix | visual, swept per `PIPELINE.md` |
| Degree symbols dropped in gate reasons | "Needs up to 290 C" beside every other temperature in the app written "°C" | `normalize.test.js` |
| Substring search | "PLA" matched "thermo**pla**stic", so searching the most common filament returned every TPU and TPE | `search.test.js` |
| Estimates absent from every chart | A quarter of the in-scope set vanished from the Ashby lens, and Compare printed "Not published" for a value the engine was actively using to exclude the material | visual |
| Any remark treated as a relaxation | Strict measurement mode warned that it had mixed conditions, and drew comparable points hollow, because the source had not named a specimen form | visual |
| Unmatched search diagnosed as hidden results | Searching a name the database does not hold reported "102 materials match, but you have hidden them" and offered a button that changed nothing | visual |
| Scenario import skipped half the state | Loading a file set the requirements but not the lens, columns, baseline or estimates switch, so the screen and the file disagreed | `scenario.test.js` |
| Invalid scenario committed before rendering | `{"constraints":null}` replaced the session and then threw | `scenario.test.js` |
| `location.origin` on a file | Is the string "null", so every link copied from a local file was unusable | visual |
| Compare evidence dots | Rendered by the shared value renderer and never wired, so the dot did nothing exactly where a difference needed checking | visual |
| Chamber rows dropped at a page break | Fourteen Bambu data sheets carry a chamber window as the first row of page 2, and none was transcribed, so PC FR, PAHT-CF and every Bambu PLA and PETG reported "no chamber requirement published" | `database.test.js` |
| A chamber window read by its upper end | ABS-CF's 50–70 °C failed the chamber criterion, though 50–65 °C is reachable | `normalize.test.js` |
| A class envelope used for screening | Would have screened CPE out of "elongation at least 100%" though its data sheet reports 150%; found in the prototype, never shipped | `constraints.test.js` |
| Another grade's value taken as the material's | One PLA grade at 46 MPa screened generic PLA out of "strength at least 60 MPa"; found while building D42, never shipped | `database.test.js` |
| Hardcoded rail counts | "45 of 102 state an abrasion requirement" counted profiles, not materials; the true figure is 27 | derived from data now |
| Bambu chemical table rows omitted | The shared “Other Physical and Chemical Properties” table disappeared for 19 exact grades, leaving 98 source-backed findings out of the database | `database.test.js`, coverage-consolidation plan |
| Environmental evidence copied from family notes | 31 materials appeared to own another material's exposure evidence, while some exact-grade records were omitted | `database.test.js`, `validate.js` |
| Coverage contradicted the records | Rows said `Gap` beside measured/profile data or `Evidence recorded` with no record owned by the material | `database.test.js`, `coverage-rules.js` |
| Existence-only referential checks | A valid measurement and a valid grade could be joined under the wrong material without an error | mutation tests in `database.test.js` |
| Estimates blind to the material's own related evidence | PA-CF strength shown as 38–204 MPa beside its own 72 MPa break strength; the table then showed the 72* and hid the estimate the filter was using | `database.test.js`, D43 |
| A heat load lost at a line break | 22 3DXTECH values printed "at 0.45 MPa (66psi)" were recorded as load not stated, so PLA, PP, PA12-CF, PVDF and 14 more could neither pass nor fail a heat requirement | `database.test.js` |
| A standard number read into its value | iSANMATE's "ISO 11357 80°C" became a glass transition of 1135780 °C | `database.test.js`, plausibility screen in `estimates.js` |
| A decimal comma and a film method | iSANMATE PLA "110,3 MPa" under ASTM D882, a thin-film test, was recorded as 3 MPa for a printed part | `database.test.js` |
| A method designation read as the value | iSANMATE PETG-GF "Vicat A/120 … 72" was recorded as 120 °C | `database.test.js` |
| An unstated heat load read as open-ended | PLA Lite's 53 °C stayed a candidate for "heat resistance at least 100 °C": a value at an unknown load was bounded below only, though the 0.45 and 1.8 MPa values of an amorphous polymer sit within about 10 °C | `constraints.test.js`, `database.test.js` |
| A conditioned value read as dry | The wet conversion matched the word "wet", so 84 "Conditioned: 70% RH" rows counted as dry; dry nylon stiffness was estimated about 10% low | `database.test.js` (kindOf), D53 |
| Two tables of one data sheet given one set of conditions | PolyMide PA6-GF's dry values said "Conditioned" and its conditioned values carried the dry note; the lint's "duplicate" was the dry and the conditioned result | lint MEAS-CONDITIONS-INDISTINCT, `lint.test.js` |
| Un-notched impacts filed as notched | Every Fiberon block prints notched, then un-notched X-Y and Z; 18 un-notched rows said Notched | m13; source audit |
| Values printed after a separator never transcribed | Bambu's "32.0 kJ/m²; 8.2 kJ/m² (notched)" kept only the first; no Bambu melt index and many Spectrum and Fiberon heat deflections were entered | `npm run audit:sources` |
| A bound treated as an exact value | "> 16.5 MPa" pinned PEBA's strength estimate to 16.4–16.6 MPa; excluding bounds instead dropped OBC's elongation from 868% to 38% | `database.test.js`, D53 |
| A lightweight grade pulling its family | HyperLite PP's 0.81 g/cc was a model outlier and lifted nothing but noise into polypropylene | `database.test.js` (grade variant), D53 |
| HDT load spellings missed | "1.81 MN/m²", "1.820 MPa", "ISO 75-2, HDT A" and "0,45 MPa" read as load not stated | `normalize.test.js`, D49 |
| Moulded values filed as printed | Spectrum PPS AM230 and PEBA values marked "*injection moulding" entered the model as printed specimens | m14; source audit |
| A single bracket gap for every matrix | The unstated-load bracket's top missed 4 of 54 true values, all semicrystalline | screening back-test, D48 |
| Number-only completeness scan | Values printed "ISO 527 MPa 48" or "Specific Gravity 1.22" were invisible; iSANMATE CF-ABS had one of its eight values | label pass in `audit:sources` |
| A resin reference vetoing a screen | Zytel 101L's moulded 3.1 GPa kept PA66, estimated at 1.5–2.6 GPa, among candidates for "stiffness at least 3 GPa" | `database.test.js` |
| One data sheet under two or three materials | PolyMide CoPA's numbers shown for PA, PA6/66 and CoPA; PA-CF's headline was PA12-CF's; PLA Silk and CoPE shared one formulation key, so the estimate model read CoPE's evidence as PLA Silk's product | `database.test.js`, D44 |
| Heat-deflection physics learned backwards | With too few unfilled nylons, the model's melting-point slope fitted negative and put PA66 at 15–91 °C; found in development, never shipped | `database.test.js` |
| Z results coded as unknown direction | 18 IPCON rows printed "Z" taught the unknown-direction conversions offsets of +0.31 to +0.46; PA6 strength was estimated 88 MPa beside its sheet's 78 | m20, lint MEAS-LOCATOR-DIRECTION, offset cap (D56) |
| Annealed and as-printed values averaged as repeats | PET-GF15's 81.6 and 133.7 °C became one precise 107.65 °C, an outlier warning and a conflict | `database.test.js`, post-processing State (D56) |
| An annealed value as the headline | PPA's heat headline was the "(annealed)" 131 °C; the as-printed 103 °C was never entered, so PPA passed Strict for 104–131 °C | m20, m21, HEADLINE-SELECTION-INVALID |
| A film strength as a lower bound | iSANMATE's ASTM D882 film values (110, 145 MPa) kept PLA a candidate for strength at least 140 MPa | `database.test.js` (implied bounds), D55 |
| Value + SD as a lower bound | 30 ± 23 % read as "at least 53 %"; an unstated moulded-looking 125 MPa kept PA12-CF in searches for 95 MPa | `database.test.js`, D55 |
| A physically impossible value deciding a requirement | TPU for AMS's 1.19 GPa on a 68D elastomer passed Strict for rigid-part stiffness; PC's HDT at 0.45 MPa sat below its HDT at 1.8 MPa | m24, lint MEAS-PHYSICS-*, D55 |
| A heat deflection estimated for an elastomer | TPU's 74 °C, from a 26 MPa sheet, gave an estimate of 70–85 °C that could screen | `database.test.js`, D56 |
| Slow crystallisers treated as crystallised | PET's heat deflection estimate reached 132 °C beside its own Vicat of 65.9 °C | `database.test.js` (printing physics), D56 |
| A material's only evidence down-weighted | PP's own 0.39 GPa and 460 % gave way to PP-CF, PP-GF and two variants: 1.5–4.5 GPa | `database.test.js`, D56 |
| A mean ± spread read as hard limits | "35 ± 4 MPa" never passed 33 MPa; 128 of 362 headlines decided nothing near their own value | `constraints.test.js`, D54 |
| Display rounding across a threshold | PC's price of 50.99 read "51" while passing "price < 51"; 300 contradictions in 174,159 checks | `format.test.js`, UI fuzz |
| An assumption read as published | A scenario assumption's reason said "Published" and its point could lead the Pareto front; a `*` assumption gave an elastomer a passing heat deflection | `scenario.test.js`, UI fuzz |
| A Plotly listener per redraw | 800 chart renders held 1,408 resize listeners and 569 MB; the first fix, purging, raced Plotly's redraw and threw in 187 of 200 fuzz scenarios | UI fuzz, heap probe |
| Replacing a headline refused as a deletion | The no-deletion guard keyed headline rows on every column, so the AGENTS.md recipe "replace the old value row" failed the pre-commit hook | `data-check.test.js` (identity, replacedWithin) |
| Unreviewed build warnings | Outliers, wide estimates and unstated loads were summed into warnings, so a new one never failed verify | `lint.test.js`, `audit:data` (D57) |

## D40. Peer observations are context, not exclusion bounds (superseded by D42, then D43)

The systematic data audit found OBC borrowing PP and reinforced PP mechanical spans, flexible
families pooling TPU with PEBA/TPC, and HDT estimates borrowing unstated loads. Even within a
correct family, the observed extremes of a small sample do not bound an unmeasured formulation.
Peer estimates now require the same base polymer and modifier, preserve intervals, and never
determine eligibility. This supersedes D10 and the exclusion claims in historical audits.

## D41. Raw values, endpoints and archived identities are enforced

Four decimal-comma values were truncated; two maximum-force strain observations were mislabelled
as break strain; a qualitative No Break result carried numeric status. Raw-to-normalized checks
now stop the build on these inconsistencies. Headline matches must agree in property and unit as
well as value and ownership. Explicitly retired grade mappings are archival, never active procurement.
Tests rebuild the inputs every time; the audit command independently checks the HTML payload.

See [systematic data audit](audits/2026-09-13-systematic-data/REPORT.md) for all findings, cell edits,
source checksums, before/after compiled changes, every filament and every family.


## D42. An estimate is a prediction interval from like-for-like evidence, and may only screen (superseded by D43)

Estimates failed twice, in opposite directions. The first model (D10, D11) pooled display families
and then whole filler classes, took the sample's minimum and maximum, and let that span fail a
material: OBC borrowed polypropylene's elongation, TPU pooled with PEBA, and a handful of peers'
extremes were treated as a bound. The second (D40) kept three same-polymer spans and let none decide
anything, which gave up the reason estimates exist: keeping a PLA out of an elastomer search.

The model now separates which evidence from how wide, and both from what an estimate may do.

**Which evidence.** A ladder, strongest first: the material's own other grades with the headline's
exact test semantics; then other materials of the same polymer identity and reinforcement class;
then a declared close-analogue group, reviewed like code in `build/mappings/estimate-model.json`.
Nothing pools a display family or a behaviour class. A prototype class envelope would have screened
CPE out of "elongation at least 100%" although its own data sheet reports 150%.

**How wide.** Every rung gives a 95% prediction interval for one more formulation, never a sample's
extremes. That includes the material's own other grades: a generic PLA grade at 46 MPa does not
bound the representative grade, and an early version of this model screened PLA out of "strength
at least 60 MPa" on exactly that basis. The spread is a documented, conservative between-formulation
prior, or a sample's own spread where wider (TPU's hardness grades are), on a log scale for
stiffness, strength and elongation. The spread actually seen across the snapshot is computed every
build, and the build fails if the median group exceeds the prior.

**What it may do.** Never pass: the verdict stays UNKNOWN, so the FAIL count stays evidence (D26).
In Explore with Estimates on, it may screen a material out, only when its whole interval fails the
requirement, only from the material's own grades or from peers with at least five independent
formulations, and never when any of the material's own measurements of that property, in any
direction or at any endpoint, could meet the requirement. A screened material is counted under
UNKNOWN, marked "screened", and brought back by the SCREENED chip. Strict never consults estimates.

Reversing any part reintroduces one of the three failures: pooling brings back OBC and TPU,
extremes as bounds bring back over-confident exclusions, and no screening brings back PLA Lite among
the elastomers. The user chose screening, the evidence rungs and the 95% level when this was designed.

## D43. An estimate is a calibrated model of every observation, and says how far to trust it

D42 was honest and too wide to use: PA-CF strength 38–204 MPa beside its own 72 MPa break strength,
TPE elongation 73–4695%, and nothing at all for PA66, PA612 or POM. It had two blind spots. It used
only measurements with the headline's exact semantics, so the break strength, flexural modulus,
Z-direction value or glass transition most gaps already had counted for nothing. And it treated
each material alone, so estimates made no sense side by side: nothing tied PA66-CF to PA66, or PA66
to PA12.

**One model per headline.** A Gaussian model on the scale the property varies on (natural log for
density, stiffness, strength and elongation; °C for heat deflection) takes every observation in the
snapshot. A product's value is its polymer identity, pulled towards its chemical group, plus its
reinforcement by matrix (fibre lifts a semicrystalline bar's heat deflection towards its melting
point, an amorphous one's only a little past Tg), a declared variant, its test house, and for the
heat deflection of polymers that crystallise while printing, its melting point with a documented
positive slope; plus the material's and the product's own deviations.

**Every observation, converted.** A related measurement enters converted to the headline's semantics
with an offset and a spread: documented in `build/mappings/estimate-model.json`, refined by the
median and MAD of grades that publish both. A break strength converts tightly, a Z value loosely, a
moulded resin value very loosely. On each product only the most direct kinds are used, because
3DXTECH's flexural and break strengths disagree with Bambu's ratio and stacking both double-counted.
Hardness informs an elastomer's stiffness through Gent (1958) and Qi et al. (2003). Values outside a
physical range are rejected and reported; evidence that contradicts everything else is down-weighted
and reported.

**Spreads, measured where they can be.** The spread between two products of one material is measured
directly from materials with several products, by the median pairwise difference, so one test house
reporting on another basis does not set it for everyone. The remaining spreads are estimated from
the data (empirical Bayes) above documented floors. The melting-point slope's spread is fixed:
unfilled nylons are too few to learn it, and letting them reverse it put PA66 at 15–91 °C.

**Calibrated, and labelled.** Each measured headline is hidden in turn and predicted from everything
else. The likely range (80%, what the tool shows) and the plausible range (95%, what may screen) are
scaled until they hold the hidden value that often, and the build fails if they drift by more than
0.1 or 0.05. Melting point and glass transition cap heat deflection as soft limits, never a hard
truncation that would pile a range against the cap. Each estimate says what it rests on (this grade's
related measurements, the material's other grades, or the family model alone) and how precise it
is (good, fair, poor, per property). One product has one value: a representative product filed under
two materials, like CarbonX CF PA12 under PA-CF and PA12-CF, gets one estimate.

**Nothing left blank.** Every in-scope headline has a value, an estimate, or a reason it does not
apply: heat deflection of an elastomer (a rigid-bar test; Bambu lists it N/A) and any value of a
support product, unless its own sources publish one. The build fails otherwise. Where no source
characterises an identity, a resin supplier data sheet is recorded as a study grade to anchor it
(Zytel 101L for PA66, Zytel 151L for PA612, Delrin 100P for POM), never as a headline. Nozzle and bed
windows nobody publishes are estimated from same-polymer or same-group products, above the melting
point; like a chamber band, they decide nothing.

**What it may do.** (Which estimates may screen, and what vetoes a screen, are decided by D48.) Unchanged in principle from D42. Never pass. In Explore with Estimates on, screen a
material out only when the plausible range wholly fails, no own measurement could meet the
requirement, and the estimate rests on the material's own evidence or an identity measured on at
least two products. Not applicable screens the same way. Strict neither shows nor uses estimates.

Reversing any part brings back a failure seen in this snapshot: exact-semantics-only brings back
38–204 MPa; no shared structure lets PA66-CF sit below PA66; learned physics slopes reverse; no
calibration makes every width a guess; hard caps collapse ranges to a point.

## D44. Each product has one home; a family is an entry, not a material

The canonical list mixes materials with families and aliases. PA, PA-CF, PA-GF and TPE name families;
CoPA names the copolymer the database calls PA6/66. Their rows had been filled with products that
belong to specific rows, so the tool showed one product as several candidates with identical
numbers: the same PolyMide CoPA data sheet under PA, PA6/66 and CoPA, and CarbonX CF PA12 as both
PA-CF's and PA12-CF's headline. Selection counted each copy, and the estimate model had to invent a
"shared product" rule to keep the copies from disagreeing.

A product is now recorded once, under the most specific material it is. A family or an alias has
Scope `Family entry`, owns nothing, carries no value and is never a candidate; it stays in the list
because its name is how people search (Bambu lists PA, PA-CF and PA-GF as H2C families), and search
answers with its members. Duplicates are retired, never deleted, after the script proves each record
has an identical twin, so the data keeps its audit trail and nothing is lost.

Reversing it brings back double counting, which is worse than a gap because it looks like evidence
agreeing with itself. See [the duplicate-products audit](audits/2026-09-13-duplicate-products/REPORT.md).

## D45. The source of truth is CSV tables under a declared schema

The workbook had become hard to govern, not too big. Git saw each audited change as a binary blob, so
a 25-cell correction needed a 70,000-line evidence package to be reviewable. Relationships were
semicolon lists inside cells, headline values were typed twice, formula ranges stopped at row 1809
while data ran to 2052, 139 formula caches were stale, and every appended row needed an XML patch
script and a hand edit to an expected row count.

The records now live in `data/tables/*.csv`, one table per entity, and `schema/tables/` declares every
column: type, role, required values, the missing states it accepts, patterns, vocabularies and
references, including identifiers inside lists and prose. `build/src/schema.js` checks all of it before
compile in about 200 ms and names the file, line, record and field. Files are kept in one canonical
form, so a diff shows only what changed, and `data/manifest.json` makes every row-count change
visible in its commit. `npm run verify` is the one gate for people, agents, the pre-commit hook and CI.

No database sits in the build path. SQLite was the assessment's recommendation; for one person and
two agents editing a few thousand rows, a schema over text files gives the same integrity checks
without a second representation to keep in step. The same schema can generate one later if concurrent
editing is ever needed. Excel remains a generated, read-only review view (`npm run data:export-xlsx`)
with no import path, so there is still exactly one place data is changed.

The conversion was proven, not assumed: the first CSV build reproduced the workbook build byte for byte,
and every later step either left the compiled database unchanged or listed each difference with its
reason. The replay, and the workbook reader it used, are in `archive/workbook-conversion/`; they stopped running when the workbooks were deleted with the cutover. See
[the migration record](audits/2026-09-14-csv-source-migration/REPORT.md).

Reversing it brings back unreviewable changes and errors found only at build time, by a message that
names a sheet row rather than a field.

## D46. A property is a registry row, and may apply to some filaments only

A property's meaning was hardcoded in about a dozen places across the build and the app, differently:
the drawer's Mechanical tab and the coverage rules disagreed about five properties, and the Overview
told users elongation "high means tough" while the filter rail said it is not toughness. Adding one
property meant 12 to 16 coordinated edits.

`data/tables/properties.csv` and `data/tables/headline_definitions.csv` now say what every property and
headline means, and the build and the interface derive their lists from them. A new property is a row;
a new selectable headline is a row plus its selections. `test/new-property.test.js` adds an
elastomer-only Shore A hardness with data alone and follows it to every view.

"Applies to" makes sparsity a statement. Outside it a property is not applicable, with a reason, not
missing: the drawer does not report it unmeasured, the filter rail counts availability only against
the materials it applies to, and a measurement recorded against any other material stops the build.

The estimate model stays in code, because conversions between properties are physics, not labels. A
registry row cannot switch estimation on for a headline the model does not know.

Reversing it brings back the drift: a label, unit or tab list that one screen changes and the next does
not.

## D47. What can be calculated is not stored

The workbook stored conclusions beside the evidence for them and then checked they agreed: headline
values beside their measurements, price medians beside their observations, per-kg prices beside list
price and mass, each material's grade list beside its grades, environmental evidence beside the
records it had to equal, and printing guidance beside the profile it quoted. Every pair was a place to
forget one half.

Each is now calculated from its evidence, and only the editorial choice is stored: which measurement a
headline shows, which observations a price sample holds, which records a material cites. A stored list
became derived only after a migration proved the derivation equal for every row. Where it was not equal,
the difference was kept as data, not smoothed over: four materials cite a thermal measurement that is
not their HDT value, so `headlines.csv` records them as context.

Two compiled values moved, and both are listed in the migration record. PAHT-CF's price is 124.49
(the median 124.485 rounded half up, where the typed 124.48 was a floating-point display). Two materials
list the same environmental records in table order rather than typed order.


## D48. Evidence screens only where a back-test shows it screens reliably

D42 and D43 decided by rule which estimates may screen: the material's own evidence, or an identity
measured on at least two products. The rule was a judgement, and the leak sweep of the 2026-09-14
filtering audit showed its cost: 1,266 (material, requirement) pairs where a range that wholly failed
left the material in, because the rule forbade the screen; and 789 more where any raw related value of
the material, of any endpoint or direction, vetoed it. Neither was measured. The owner asked for the most
reliable method, over earlier rulings.

**A back-test, every build.** For every measured headline the build hides what an evidence class lacks
and predicts it with the production ranges and limits (`build/src/estimates.js`): this grade (the
headline hidden, the grade's other published kinds kept), this material (the whole grade hidden, other
grades kept), and the family model (everything of the material and its product hidden). A screen is wrong
only when the true value lies beyond the plausible range on the side the requirement tests, which a 95%
range allows 2.5% of the time per side. A class is **certified** when it has at least 20 held cases and
neither side misses significantly more often (exact one-sided binomial test at 5%). A calibrated class is
not revoked by sampling noise; a class whose ranges are too narrow is. The result travels in
`meta.estimateModel.properties.*.screening`.

**What screens.** A certified class screens on its plausible range. A class the back-test cannot certify
(too few held cases) screens only where the certified family model agrees: on the union of its range and
the family-only range with the material's own evidence hidden, which is never narrower than a certified
family screen. An estimate carries the range that decides (`screenRange`) and why (`screenBasis`).

**The unstated-load bracket is certified per matrix.** Read as a 1.8 MPa value, a heat deflection with no
stated load brackets the 0.45 MPa value up to the gap grades publishing both loads show. One Gaussian gap
for all matrices failed its back-test (4 of 54 true values above the top): the gap is a few degrees for
an amorphous bar and up to 120 °C for an unfilled semicrystalline one. Each matrix is certified on its
own pairs; today only amorphous (38 pairs) screens, which keeps PLA Lite's case (D43's regression).

**Vetoes are implied bounds.** A measurement vetoes a screen only when it logically bounds the headline
from below and meets the requirement (`estimate-model.json impliedBounds`): ultimate strength is at least
the yield and break stress in any printed direction; strain at break is at least the strain at yield or at
maximum stress; heat deflection at 0.45 MPa is at least the value at 1.8 MPa. A bound never passes. Other
endpoints, flexural values and moulded resin values no longer veto: the estimate carries them through
documented conversions, and the back-test judges the result.

**Measured 2026-09-15** (held cases, true values above and below the plausible range, certified):

| Headline | Class | Held | Above | Below | Certified |
|---|---|---|---|---|---|
| density | this-grade | 0 | 0 | 0 | no (only 0 held cases (20 needed)) |
| density | this-material | 24 | 1 | 0 | yes |
| density | family | 84 | 4 | 1 | yes |
| tensileModulusXY | this-grade | 65 | 2 | 1 | yes |
| tensileModulusXY | this-material | 21 | 1 | 2 | yes |
| tensileModulusXY | family | 68 | 1 | 0 | yes |
| tensileStrengthXY | this-grade | 52 | 1 | 2 | yes |
| tensileStrengthXY | this-material | 10 | 0 | 0 | no (only 10 held cases (20 needed)) |
| tensileStrengthXY | family | 53 | 1 | 1 | yes |
| elongationXY | this-grade | 51 | 1 | 0 | yes |
| elongationXY | this-material | 24 | 2 | 2 | yes |
| elongationXY | family | 69 | 1 | 1 | yes |
| hdt045 | this-grade | 53 | 1 | 1 | yes |
| hdt045 | this-material | 18 | 1 | 1 | no (only 18 held cases (20 needed)) |
| hdt045 | family | 61 | 3 | 2 | yes |
| hdt045 bracket | amorphous | 38 | 2 | 1 | yes |
| hdt045 bracket | semi-unfilled | 3 | 0 | 0 | no (only 3 held cases (20 needed)) |
| hdt045 bracket | semi-filled | 12 | 2 | 0 | no (only 12 held cases (20 needed)) |
| hdt045 bracket | elastomer | 1 | 0 | 0 | no (only 1 held cases (20 needed)) |

The leak sweep that motivated this is a permanent test (`test/screening.test.js`): no material stays a
candidate for a requirement its defended range wholly fails, except by a verified implied bound; the
structural invariants hold; and the certification rule revokes ranges made too narrow. Estimates still
never pass, and Strict still neither shows nor uses them (D43).

*Amended by D55 (2026-09-15):* an implied bound comes only from a printed specimen at its published value, never
from a film, filament, moulded or unstated specimen, value + SD, an annealed twin or a conditioned elongation, and it
also limits the estimate's own range. The certification table above is the 2026-09-14 snapshot; the build records
the current one in `meta.estimateModel.properties.*.screening`.

*Amended by D59 (2026-09-15):* a class is no longer certified by failing to disprove it. Each end of its screening
range is a distribution-free tolerance limit of honest hold-outs (at most 10% beyond it, with 90% confidence; 22 cases
at least), an end the material's own evidence lies beyond never screens, and the unstated-load bracket's top is set
the same way.

## D49. The values the build decides on are typed columns; raw text stays, and the parsers check it

The build read decisions out of free text on every run: a nozzle window from "Classic: 190 - 210 °C", an HDT
load from about twenty spellings, a drying schedule from a sentence. A parser change could move a verdict with no
data change and no diff, and a mis-parse looked like data.

Migration m08 stores what the parsers read in typed columns beside the raw text: for each profile axis the state,
minimum, maximum and whether it is a requirement; the enclosure and drying state, drying temperature and hours; the
hardened-nozzle requirement; and each measurement's Test load MPa. Compile reads the typed columns. The parsers
still run, as a check: if a parser reads the raw text differently from the typed value, the build stops
(PARSE-MISMATCH), unless Parse review explains a deliberate override. m08 was proven to leave the compiled database
byte-identical.

The raw text is kept verbatim, cleaned only of extraction artefacts (m07: ligatures, full-width punctuation in
non-Chinese text, dashes between numbers, run-together words, whitespace), with every parsed value proven unchanged.
Raw columns may therefore spell one thing several ways ("25 - 45 °C", "25-45°C"); the near-duplicate spelling lint
skips them, because their typed columns are what is checked.

Improving a parser is now a visible change. On 2026-09-15 the HDT load parser learned 1.81 and 1.820 MPa, MN/m²,
a decimal comma beside the unit, and ISO 75-2's method letters; the check showed exactly two stored rows affected,
and both were synced in the same migration. The letters are read as loads because ISO 75-2 defines them (A 1.80 MPa,
B 0.45 MPa, C 8.00 MPa); a bare standard with no load stays unstated.

Reversing it lets a parser edit change verdicts silently and hides a mis-parse behind a plausible number.

## D50. Every check has a code, and quality findings are fixed or accepted with a reason

Issues were messages. A test asserted on wording, a reader could not look a message up, and warnings could not be
baselined, so a doubling of the data would bury a new problem among old ones.

Every schema, build, validation, audit, contract and lint issue now carries a stable code from one catalogue
(`build/src/rules.js`, generated into `docs/RULES.md` and checked current by verify), with its level, meaning and
fix. Codes never change meaning; a retired check keeps its code out of use.

The data lint (`build/src/lint-rules.js`, `npm run data:lint`) reports what the schema cannot express: extraction
artefacts, near-duplicate spellings outside raw columns, duplicate measurements, rows from one place in one source
with different values and identical conditions (the two-table error, MEAS-CONDITIONS-INDISTINCT), printed mechanical
rows with no direction, uncited sources, local paths, and duplicate or overlapping coverage. `npm run verify` fails
on any finding not in `data/review/accepted-findings.csv`, where each accepted finding has a reason per record, and
on an acceptance that no longer occurs.

Two classes keep deliberate records from reading as defects. A source's Citation role says why it is registered
(cited, corroboration, register, provenance, not-retrieved), and a source recorded as not retrieved may never be
cited. A coverage finding that a later row replaces takes the status Superseded, keeps its text after
"Superseded by C#####", and leaves the views, the coverage checks and the lint; nothing is deleted.

Build warnings are baselined by the review snapshot (D53): each warning is a row with its record.

Reversing it brings back message-matching tests, and warnings nobody can tell apart from last month's.

## D51. Hand-maintained mappings are keyed by ID and checked at the gate; so are names the code relies on

Three mappings were JSON keyed by material name: family entries and their members, chamber bands, and the
environment topic vocabulary. A renamed material broke them, and only the build noticed, by a name.

Migration m09 moved them to `family_entries.csv`, `family_members.csv` and `chamber_bands.csv` keyed by MaterialID,
and to `schema/vocab/environment-categories.csv` and `environment-topics.csv`, which `evidence.Topic` must match. The
schema gate now reports a wrong reference with its file and line, and m09 was proven to leave the compiled database
byte-identical. The estimate model stays configuration (`build/mappings/estimate-model.json`), because conversions
between properties are physics, not data.

Some code is about a specific property by name (HDT's load, the strength endpoints, elongation's locator rule). Every
such name is declared in `build/src/property-references.js`; the build fails if one is not a registered property
(REGISTRY-CODE-REFERENCE), a test fails if code uses a registered name not declared there, and every material, grade
and property the estimate model names is checked the same way (EST-MODEL-REFERENCE).

Reversing it makes a rename a silent break.

## D52. The transfer is proven cell by cell; every later correction is re-read, guarded and replayable

The migration proved the first CSV build equal to the workbook build. That proved the conversion, not that the
workbook matched its sources, and not that every cell reached the tables.

**The transfer.** The transfer ledger (`archive/workbook-conversion/transfer-ledger.mjs`, which ran against the workbooks in git history) read the retired workbook with native cell values and classed
every one of its 99,538 cells against its CSV cell or the derivation that replaced it: equal, a named mechanical
change, a stale formula cache kept as the build read it, a reproduced derivation, precision lost, or unexplained. It
found one precision loss (`V000731`, restored) and leaves 0 unexplained. The ledger proves the state at the end of
the mechanical conversion (`CONVERSION_END_COMMIT`); later edits are classed from the record-level data diff, so a
correction never needs a ledger rule of its own.

**The sources.** `npm run audit:sources` fetches every PDF source cited by measurements, checks its SHA-256, and
lists every printed "number unit" with no matching value in the tables, and every property the document names that
the source has no row of (values printed unit-first or without a unit escape a number search). Doubtful layouts are
checked on the rendered page, not the extracted text. Its first run found 173 published values never transcribed,
and the defects in the bug table below.

**The corrections.** Each batch is a migration (m10 to m18) that writes through `scripts/migrate/source-edits.mjs`:
every edit names the value it replaces, so a re-run is a no-op and a run after the data moved stops; every changed
measurement gets a dated note saying what changed and where the source says so. A value is never typed from a
report. Where a sheet contradicts itself (iSANMATE ESD-ABS pairs Method A with 0.45 MPa, and by its loads the higher
load gives the higher temperature), the rows are recorded quarantined with the reason. Where a label and a value
disagree (Eryone's and Flashforge's "X-Z" results at half the X-Y value), the direction is recorded as not published
with the reason.

Reversing it lets a transcription error that looks like data stand, and makes a correction unrepeatable.

## D53. The estimate model reads declared states, not wording; and every change shows its downstream effect

**Moisture.** A value was converted from wet to dry only if its moisture label contained "wet", so 84 rows labelled
"Conditioned: 70% RH", nylons among them, were read as dry. Each Moisture condition value now declares its State
(dry, conditioned, not-stated) in its vocabulary, `build/src/normalize/moisture.js` reads it, and an undeclared
wording stops the build.

**Variants.** A product its material's Modifier / filler does not describe (3DXTECH HyperLite PP, with an additive
for 0.75 g/cc; Spectrum HDPE, whose 1.1 g/cm³ is beyond unfilled polyethylene) pulled its family's estimates. A
grade's Variant now gives its product a covariate with a fixed, loose spread (`gradeVariants`), so its offset is its
own. Its values stay its own, and it may still be a representative grade, because a headline is a single-grade
observation; whether such a product deserves its own material is a scope decision (settled for HyperLite PP in
D57: it is PP Lightweight).

**Bounds.** A published bound ("> 16.5 MPa") had no spread and became the most precise observation there was;
leaving bounds out lost the only evidence that elastomers stretch hundreds of percent. A bound now enters at its
value with a documented half-width (`bounds.oneSided`), never calibrates a conversion or the between-product spread,
and limits its own material's estimate; a lower bound in an unstated direction also bounds XY strength and strain.

**Physical limits.** Every estimate is softly bounded by its property's physical range, and heat deflection by a
45 °C floor, published only where a limit moves the plausible range. Estimates too wide to guide a choice
(EST-WIDE) and reinforced materials estimated below their unfilled sibling (EST-FAMILY-ORDER) are warnings with
records.

**Downstream effects.** `npm run snapshot` commits every headline (value, likely and plausible ranges, the range that
may screen), process gate, template result and warning under `build/snapshot/`, and `npm run ui:check` commits what
a reader sees in headless Chrome (every template in Strict and Explore with estimates, each shared link reopened,
Compare) under `build/snapshot/ui/`. Verify fails if either is stale, so a data or rule change carries its effect in
its own diff. `npm run data:new` and `npm run data:retire` make complete records and finished retirements the easy
path.

Reversing any part brings back a failure seen in this snapshot: wet nylon read as dry, a lightweight PP pulling
polypropylene's density, PEBA's strength pinned to its bound, or a change whose effect nobody saw until a user did.

## D54. A published mean ± band is judged on its mean; the band flags a result close to the limit

A measured headline with a band ("35 ± 4 MPa") was compared as the hard interval 31 to 39, so it never passed a
requirement of 33 MPa and decided nothing within its own spread. 128 of 362 headlines carry a band, mostly a specimen
standard deviation from Bambu Lab, Polymaker and Fiberlogy sheets, not a tolerance. The owner ruled (audit
2026-09-15, C-04) that such a value is judged on its mean, as a value without a band is. When the threshold lies
within the band the verdict stands and the result says it is close to the limit (`closeToLimit`, "≈" in the table).
A published range ("42-52") and a one-sided bound ("> 16.5 MPa") are still judged as the intervals they are, and a
bound that vetoes a screen is the published value, never value + SD.

A number in a column that carries a requirement is shown with the digits that keep it on its own side of the
threshold: PC's price of 50.99 read "51" while passing "price < 51".

Reversing it makes a quarter of the measured headlines undecidable next to their own values again, and a table that
rounds a pass into a visible failure.

## D55. A value physics rules out is kept, flagged and decides nothing; only a printed part bounds a printed headline

Some sheets publish what cannot be: PC's HDT at 0.45 MPa below its HDT at 1.8 MPa, a 1.19 GPa modulus on a 68D
elastomer that stretches 650 %, a PA12 glass transition of 158 °C, an HDT on a 26 MPa TPU. They are faithful
transcriptions, so correcting them would invent data (D35), and using them made a TPU pass a rigid-part stiffness
requirement in Strict. The owner ruled (audit 2026-09-15) that they are recorded, flagged, and excluded or
down-weighted. Data status "Published value (physically implausible)" keeps the number with its reason in Notes and
a chip in the drawer; it backs no headline, estimate, conversion, implied bound or plot point, and a headline that
selected one is estimated from the evidence that remains (m24). Lint rules check what one sheet can contradict
within one grade and state (HDT load order, Z above XY, strain below stress / modulus); a finding is flagged or
accepted with a reason.

Implied bounds, which veto a screen and limit an estimate from below, come only from printed specimens at their
published value, never from a moulded bar, a drawn film, a filament strand, an unstated specimen, an annealed value
beside its as-printed twin or a conditioned elongation (D48 amended). ASTM D882 film strengths had kept PLA a
candidate for 140 MPa; Spectrum PA12-CF's unstated 125 MPa kept it in searches for 95 MPa. The same bounds now cut
the material's own estimate: no plausible range reaches below a value its own printed data prove (58 did).

Reversing it lets a sheet's impossible number decide a requirement, and a stronger specimen than a printed part keep
a material in searches its printed parts fail.

## D56. The estimate model follows printing physics: crystallisation, water uptake, mixing, and what an elastomer cannot have

The owner asked for any correction that makes the estimates more reliable for engineering decisions (audit
2026-09-15). Each is a declared, documented piece of `build/mappings/estimate-model.json`:

- **Crystallisation while printing.** PET, BVOH and PVA, and unfilled PPA, crystallise too slowly to crystallise in a
  print (`printsAmorphous`): their as-printed heat deflection converts with the amorphous class, is capped at the glass
  transition plus a lift, and learns nothing from annealed values. PET's estimate reached 132 °C against its own
  Vicat of 65.9 °C. PPS is not one: printed hot it reaches 241-264 °C unannealed.
- **States.** Post-processing and Specimen type declare a State and a Form in their vocabularies, as Moisture condition
  does (D53). An annealed value beside its as-printed twin is another state, not a repeat (PET-GF15's 81.6 and
  133.7 °C had averaged to a precise 107.65 °C), and repeats under different annealing schedules keep a spread that
  spans them. A headline is never a moulded, film, filament, conditioned or annealed-beside-as-printed value.
- **Water uptake.** The conditioned-to-dry offset follows the polymer: high for PA6, PA66, PA6/66 and PPA (dry modulus
  about twice the conditioned), low for PA12, PA612 and PAHT, none elsewhere.
- **Density.** An unfilled estimate is bounded by the neat polymer's handbook range, a filled one by the rule of
  mixtures at 35 wt% fibre and 5 % porosity; PA12 was estimated 1040-1180 kg/m³ against its own 1010.
- **Elastomers.** Heat deflection is never estimated (ISO 75 ends at 0.2 % outer-fibre strain, which needs a modulus
  near 225 MPa); yield does not convert to an elastomer's ultimate values; Shore A and Shore D have separate offsets.
  This reverses "a published value beats the rule" for TPU.
- **Direction.** A source's orientation label is an unknown direction (Method, Comparison / Directions), and an
  unknown-direction conversion may move below its documented offset, never above: 18 Z results coded unknown had
  taught it offsets that inflated estimates 1.35-1.6x.
- **Own evidence.** A material's only evidence for a headline is never down-weighted as a conflict: PP's own 0.39 GPa
  had given way to PP-CF, PP-GF and two variants (1.5-4.5 GPa).
- **The Vicat cap, not a melting margin.** An unfilled bar is capped by the highest Vicat its own grades publish. A
  cap at the melting point less 20 °C was tried and dropped: PVDF publishes 158 °C, 12 °C under its melting point,
  and the heat deflection back-test lost certification.

Calibration holds (plausible coverage 95-97 % for every headline) and the D48 certifications are unchanged. Reversing
any item brings back a failure seen in this snapshot.

## D57. Identity is a record's job: compounds are declared, a replaced name keeps its record, and every build finding is reviewed

- **Compounds and variants.** HyperLite PP is its own material, PP Lightweight, as PLA Aero is (m25); PP describes
  iSANMATE PP. Spectrum PA6 Neat (1.25 g/cm³) is declared an undisclosed dense filler, as Spectrum HDPE is, and both
  materials say their values are a compound's ("About this entry" in the drawer). PC-GF's representative grade is BASF's
  printed, dry data set rather than a sheet stating no specimen (m26).
- **Replaced properties.** "Izod strength" and "Izod impact strength" are one test. properties.csv gains "Replaced by":
  the replaced record stays (nothing is deleted), its replacement must be current, and no measurement or headline may
  use it (m22). A headline or material link re-pointed at another record is an edit, not a deletion
  (`replacedWithin`).
- **Build findings.** Outliers, imprecise estimates, family-order breaks, unstated loads and materials with no
  measurements are reviewed per record in data/review/accepted-findings.csv, and `npm run audit:data` fails on an
  unaccepted or stale one; informational summaries are level info.
- **The rendered app.** `npm run ui:fuzz`, in verify, runs 2,000 seeded random scenarios through the built page in
  every Strict/Explore/estimates setting and compares table, chart, counts, chips and links with the engine. It found
  what the 14-view probe could not: a plot purge that threw in 187 of 200 scenarios.

Reversing any of these lets a lightweight or filled product speak for its polymer, a duplicate property name split
evidence, a new outlier reach the page unreviewed, or an interface defect pass every unit test.

## D58. Estimates are an overlay on a complete core, and grow by data, not by special cases

The estimate model absorbed every data discovery as code. Of the eight revisions to estimates and screening between
2026-09-13 and 2026-09-15 (D40 to D56), four were forced by classes of data nobody had declared: Z results coded
unknown, annealed twins, moulded resin sheets, conditioned nylons. Each fix was a branch in a 901-line file, a block in
its configuration, a decision and an accepted finding, and the compiler, the validator and the model's configuration
had grown into one another: compile read the model to find implied bounds, and the validator read it to check
headlines.

**A stage.** `build/src/estimate/` is applied to the compiled database and only adds to it: estimates, not-applicable
statements the model makes, load brackets, estimated print windows and their diagnostics. `build/src/pipeline.js` runs
compile, the stage and validation for every caller. Built with `--no-estimates`, the core database validates and meets
the contract (`test/contract.test.js`), so no headline, gate or check of the core rests on inference. Which measurements
bound a headline from below is a fact about the headline, so it is a registry column (`headline_definitions.csv`
Lower bound, m27), not model configuration. The model's judgements (conflict threshold, calibration clamps, prior
weight of a documented conversion) are named in `estimate-model.json` with their reasons, not literals in code.

**Growth by data.** A case the model cannot express becomes a not-applicable reason, a declared state or class in the
data, or a reviewed finding that says more data is needed. A new conversion kind or physical rule needs its own
decision saying why the data cannot carry it, and a back-test showing it helps.

Reversing it lets a data defect become a model branch again, and lets the core's verdicts depend on inference nobody
can switch off to check.

## D59. A screen rests on an end the back-test has shown, one end at a time, never against the material's own evidence

The owner kept screening and asked that its weaknesses be resolved (2026-09-15). D48's back-test certified an evidence
class unless it could *disprove* it: over at least 20 hidden headlines, neither side missed significantly more than
2.5%. With few cases that test cannot reject much. The stiffness estimates resting on a material's other grades missed
on 4 of 21 held cases (19%) and screened; a class with a true 10% miss rate passed about two times in three; and one
case more or less flipped a class on or off. It had three further gaps:

- **The hold-outs saw what they hid.** A hidden headline had helped learn the conversion offsets that turned its own
  product's other values into its prediction, so calibration and the back-test were optimistic (audit C-09).
- **Both ends were judged together.** A screen on a minimum requirement is wrong only if the true value lies above the
  top; one on a maximum, only below the bottom. A class too narrow on one side lost both, or kept both.
- **The model could overrule the material's own sheet.** PP's elongation screened on 14–118 % against its own 460 %.

**Honest hold-outs.** A hold-out of a material is predicted with spreads refitted without its fold of materials (one in
five; the between-product spread too), and with the conversions refitted without the hidden products (for the family
class, every product of the material), the prediction corrected exactly for the shift in every observation of a changed
kind (`build/src/estimate/calibration.js`, `makeHoldOut`). An independent review checked the algebra. Fitted once on all data, the spreads
had made elongation's hold-out errors 25% narrower in the tail. Every spread now has a documented floor
(`estimate-model.json` floors): without TPU and PEBA, an elastomer's product-to-product spread fell to 0.003 and a
hold-out claimed near-certainty. The corrections widened elongation's plausible ranges by 9%, heat deflection's likely
ranges by 8% and stiffness's by 3%, the size of the leak; calibration still holds. Conflict down-weighting is still
decided once, on all data.

**An end is shown, not merely not disproved.** For each class and each end, the build records where every honestly
predicted true value fell in its prediction, and takes the end at a distribution-free tolerance limit of those positions:
the r-th most extreme, with r the largest count for which a new true value lies beyond the end at most 10% of the time
with 90% confidence (`estimate-model.json screening`). The end is never inside the plausible range the reader sees, and
moves outwards only where the tail proved too thin. It needs no distribution to be right, and no fixed level: a
calibrated class screens where it did, a class with a thin tail screens further out, and with fewer than 22 cases no end
can be shown at all. The unstated-load bracket's top is set the same way from the gaps grades publishing both loads show
(amorphous: 15.8 °C, the second largest of 38), which keeps PLA Lite out of "at least 100 °C".

A 10% bound on how often the true value lies beyond an end is a bound on how often a screen on that end is wrong, and a
loose one: the screen is wrong only if the requirement also lies between the end and the true value. The guarantee
assumes a material whose headline is missing is like the measured ones its class was back-tested on, and it holds per
end at 90% confidence: of the thirty or so ends a build sets, about three may be expected to exceed 10%. Five percent at
90% confidence was considered; it needs 45 cases, which only the family classes have, and it would have reopened the
unstated-load PLA Lite case.

**Open ends.** An end its class cannot show screens only where the family model's end, shown on its own, agrees (their
union), else it is open (`null`) and screens nothing on that side. An end the material's own evidence, converted to the
headline, lies beyond is open too, and the estimate says why (`screenLimit`). The bottom of an unstated-load bracket is
the published value, which the 0.45 MPa value cannot lie below, so a maximum requirement below it now screens for every
matrix, not only a certified one.

**Measured 2026-09-15.** Of 94 estimates, 77 screen on both ends, 13 on one and 4 on neither. Twenty ends no longer
screen against the material's own evidence (PP's elongation among them). One template result changed: PA12 stays a
flagged candidate for the flexible component's 100% elongation, because its class set its top at 174%. Three measured
headlines the honest hold-outs flag as far from their prediction (OBC's density, TPU's elongation, PPS's heat
deflection) are accepted for review with their physical reasons. The per-end table is `build/snapshot/screening.csv`.

The estimate display was also corrected: evidence converted to a heat deflection headline omitted the melting-point
term, so PA12's own 94.7 °C read as "about 108 °C as this headline".

Reversing it lets a thin class screen on the strength of a test that cannot fail it, lets a material's own data sheet be
overruled by its family, and lets calibration grade itself on values it has seen.

## D60. What the estimate model knows about a polymer, a variant or a product's hardness is data, in tables

D51 moved hand-kept mappings keyed by name into tables and left the estimate model's configuration alone, because
conversions between properties are physics. But the configuration also held records: 36 polymer identities matched to
materials by the text of their base polymer, nine grades' Shore hardness keyed by GradeID with their quotes, and two
lists of material names. A renamed material or polymer broke them silently until a check written for the purpose
noticed, and no schema, lint, diff or source register covered them.

- **polymers.csv** (m28) holds each identity's group, morphology, melting point, how it solidifies in a print (crystallises
  while printing, prints amorphous, prints amorphous unless fibre-filled, crystallises without following its melting
  point), water uptake and neat density range, with its source or the basis for its numbers. `materials.csv` Estimate
  identity is a foreign key to it and Variant class a vocabulary, so a wrong name fails at the schema gate by file and
  line. The values moved unchanged and no estimate moved.
- **Shore hardness** is a measurement (m29). Every source was re-read from its hash-matched copy: PolyFlex TPU95, TPU for
  AMS and Ultrafuse TPC 45D print theirs, and are published values never transcribed; Bambu TPU 95A HF, 90A and 85A and
  eSUN PEBA-90A print none, and carry Data status "Nominal from product designation". Reading measurements, the model
  now uses every published Shore hardness, including four the configuration's list had missed (I-TPU, a second PolyFlex
  TPU90 record, Spectrum and Kimya PEBA), and elastomer stiffness estimates moved by 1 to 3%. TPC / TPEE's coverage no
  longer calls its mechanical data a gap.
- **What stays configuration** is what is physics or judgement, not a record: conversions and their documented offsets,
  physical limits, spread floors, calibration and screening settings. It names no material, grade or polymer
  (`test/references.test.js`), and EST-MODEL-REFERENCE is retired.

Reversing it puts records back where no schema, diff or source register can see them.

## D61. No meaning lives only in a tooltip

An interface assessment on 2026-09-16 counted 175 elements on the desktop table, and 540 on a tablet, whose meaning was a
native `title` of 25 characters or more and nothing else: what an estimate rests on and which of its ends may screen,
why a measured value is not the headline, which kind of absence a dash is, why a row was screened, what a gate chip
decided, why a price listing is quarantined. The legend above the table told the reader to hover, and the drawer said
"click any number" when only a six-pixel dot beside it was a button.

A native title is not enough, for reasons that do not depend on taste. It never appears on a touch screen. It cannot
be reached from the keyboard, and a screen reader may or may not announce it. On a desktop it arrives after a delay
the page cannot control, disappears when the pointer moves, cannot be selected or copied, and is cut short or wrapped
by the browser: the estimate's is about 600 characters. An engineer on a tablet at the printer had no way to learn what
`~1.9–5.29†` meant.

So a title may repeat what is on screen, and may not be the only place a meaning is said. Every such mark is a real
`<button>` that opens one reused explanation popover (`app/js/ui/popover.js`) by click, tap, Enter or Space, closes on
Escape, a second press, the close button or a click elsewhere, returns focus to the mark, and stays inside the viewport
at 390 px. Where there is a natural next step it offers one: open the estimate, the measurement or the Printing tab. The
text comes from the functions that wrote the titles, and the titles stay, so the wording cannot fork and a mouse still
gets it on hover. The same rule put on screen what had been only a title elsewhere: the lens tabs' purposes, the column
chooser's, the mode control's label below 1100 px, Use estimates under Confirmed only (disabled with its reason instead
of hidden), and the on/off state of the result chips (a ticked or empty box, "Show in table").

The listeners sit on the document, in the capture phase, so a renderer that draws a mark has nothing to wire and
cannot forget to, and a mark inside a table row does its own job without opening the row's drawer. The table's
legend is one line of the same marks, always present in the same order, each opening its definition.

Out of this decision's reach for now: the column headers' technical names, the retailer and date on a buy link, and
the values on the Ashby chart, which are read by pointing at a mark. Each is still a tooltip-only meaning, and each is a
case of this rule, not an exception to it. The Parallel lines chart has since come within it: a tap or Tab reads a line
in a readout above the chart.

Reversing it makes the tool's most important distinctions, measured against estimated against absent, invisible to
anyone not holding a mouse.

## D62. A narrow screen scrolls what does not fit inside its own box, and never squeezes it

The interface was laid out for a desktop and wrapped below it. An assessment on 2026-09-16 at 1180, 820 and 390 px found
the results table the worst of it: a fixed-layout table shared the width out by percentages, so at 820 px 46 of 207
cells overprinted their neighbours (estimate ranges ran into the next column, "UNKNOWN" over a density) and at 390 px
132 did, with names broken a letter per line and headings cut to "Res / Der / Stif". The Ashby legend beside the plot
took 60% of a tablet's width and lay over a phone's points. The top bar was two rows at every laptop width and four on
a phone; the view tabs two rows, the drawer's nine tabs three. The drawer covered a tablet or phone screen but Tab walked
out of it into a page nobody could see, and the fixed-height page put the status bar and the shortlist under a phone
browser's toolbar with no way to scroll to them. The probe's layout record (`build/snapshot/ui/30-*.txt`) counted 29
layout failures.

- **Tables scroll sideways in a box, with the name column held, rather than becoming cards.** Each kind of column has a
  minimum width, the table lays out automatically so no cell is narrower than what it holds, and where the minimums do
  not fit the table scrolls in its box with the material's name stuck at the left, as the Data coverage lens already did.
  Cards per row were the other way. They would have made a table of numbers into a list of labelled values: columns
  could no longer be compared down the page, sorting by a column would have no column to show it, and the fuzz and the
  probe, which read rows and cells, would have had two renderings to check. An engineer comparing densities reads down a
  column; the sideways scroll keeps that and costs a swipe. The box scrolls only when its table overflows (it is marked
  after drawing and on resize), because a box that can scroll sideways is also a vertical scroll container and the
  column headings would otherwise stop sticking on a wide screen, where the table fits.
- **The Ashby legend goes below the plot under 900 px, and lists colours only.** Beside the plot it cost the plot most of
  a narrow chart; below it, in rows, it costs height, which the chart gets back (its height follows its width, plus the
  legend's rows). Plotly reserves the legend's real height under an automargined axis, so a wrong estimate of its rows
  shrinks the plot a little and never overlaps the axis title. Shape, hollow and estimate marks moved out of the legend
  into one HTML key under the chart that lists what is drawn: 40-odd family and filler rows had explained neither a
  hollow point nor a dotted box.
- **Below 600 px the page scrolls as a whole.** Fitting the page into one screen, as a desktop does, left the results a
  slot a few rows tall between a two-row top bar, the tabs, a two-row status bar and a two-row shortlist, and a phone's
  dynamic toolbar could cover the last two. Scrolling the page makes everything reachable and gives the results the
  screen. Above 600 px the layout is unchanged, at `100dvh` with a `100vh` fallback.
- **Below 1100 px the drawer is a modal dialog**: it covers the screen there, so the page behind it is inert, Tab cycles
  inside it, a backdrop closes it, and focus returns to its opener. A wider screen keeps it a side panel beside usable
  results, not modal.
- **Strips instead of wrapped rows** for the view tabs and the drawer's tabs, with the active tab kept in view, and a top
  bar of one row from 1101 px (the theme button an icon below 1600 px, keeping its words as its name and title) and two
  on a phone (the title left to the browser tab, Save / share and the theme as named icons).

`npm run ui:check` now fails on a layout failure without a flag; the drawer steps measure the drawer's own tables, since
counting the table behind the drawer again had charged the drawer with the table's failures.

Reversing it brings back overprinted numbers on every screen narrower than a laptop, a legend that hides a phone's
chart, and a full-screen panel that keyboard and screen reader users can walk out of.

## D63. A source's Title is what the publisher printed, and a specimen's print parameters are the tested conditions, not the guide

Two text columns had been filled with whatever the transcription had to hand. Seventy-eight source Titles were not
titles: 22 product pages carried the page's `<title>` with the store's payment footer glued on ("CARBONX™ ABS+CF Ach
Direct Debit Amazon American Express Apple Pay ... Visa"), 40 Bambu Lab sheets a file-name stub ("B pla basic
filament", "B PC"), 15 PDFs an `.xlsx` or underscore file name, one was "untitled". The drawer cites the Title beside
every value, so a reader was told a measurement came from "Amazon American Express". And 140 measurement rows of
eight sources held, in "Specimen / print parameters", a marketing paragraph ("... 50 ºC bed temperature, having
excellent interlayer adhesion which greatly improve the strength ...") or a description of the source ("Manufacturer
TDS v1.0; standard deviations in parentheses") where the other rows hold the sheet's Specimen Printing Conditions.

- **A Title is the document's own title as the publisher printed it**: a sheet's heading ("Bambu Filament Technical
  Data Sheet - PLA Basic", "Technical Data Sheet: CarbonX™ PP+CF 3D Printing Filament"), a page's `<title>` or main
  heading with the store's name stripped ("CARBONX™ ABS+CF"). It is never a file name, a placeholder or the chrome
  around a page, and it says what is printed even when that differs from what the source is filed under (the PLA
  Basic Gradient sheet is titled "PLA Basic"; the Revision column tells them apart). Lint `SOURCE-TITLE-NOT-TITLE`
  flags payment and store words, a file-name pattern (`B pla`, an underscore, `.xlsx`, `.pdf`) and "untitled" (m34).
- **"Specimen / print parameters" holds only what the sheet ties to its test values**: the Specimen Printing
  Conditions table, the print orientation heading of a results table ("Print direction XY, Flat"; "Print Orientation
  45/45"), in the sheet's words. A recommended printing range, a Print Recommendation table or a PROCESSING block the
  sheet does not say was used for the specimens is a printing guide and belongs in `profiles.csv`, not here: written
  here it reads as the tested condition, and `npm run audit:sources` counts its numbers as transcribed values. Where
  the sheet states nothing for its values the cell is Not published, and a remark worth keeping (the sheet's
  standard deviations, its caveat that properties depend on production conditions) goes to Notes with its page
  (m33).

Reversing it puts payment footers back into citations and lets a marketing paragraph stand where an engineer reads
the print conditions of the bar that was tested.

## D64. Polymer-level behaviour is shown and may screen, never passes

Environment criteria answer from a material's own evidence records, and most materials have none in most categories: a
"resists solvents" requirement returned UNKNOWN for the great majority of the database, including every PLA whose data
sheet says nothing about acetone, while a resin producer's reference for the neat polymer has said for decades that PLA
is attacked by it. That reference is real evidence, but about the resin, not the filament: fillers, pigments,
plasticisers and printing change how a grade behaves, and a table that let it pass a material would present a handbook
paragraph as a test of a product nobody tested.

- **The behaviour lives in a table, keyed by polymer.** `data/tables/polymer_environment.csv` holds one row per base
  polymer (a `polymers.csv` identity, the one materials name as their Estimate identity), category and agent, with the
  conditions, a verdict from `schema/vocab/polymer-verdicts.csv`, the finding in the reference's words, and a retrieved
  source. Only a filterable category may be used, and never fatigue or creep: a resin reference cannot speak for a
  printed part under load. The build refuses an unknown polymer, a source that was not retrieved, a category outside
  that set, a verdict outside the vocabulary and a repeated (polymer, category, agent) (`POLYMER-ENV-*`).
- **The build attaches it where the material has nothing of its own, and nowhere else.** For every candidate material
  with an Estimate identity, for every category the polymer publishes in which the material has no `evidence.csv`
  record (narrative ones included), the compiler writes one inferred record, `evidenceType` "Polymer-level reference",
  `inferred: true`, with the agent rows behind it (`db.polymerEvidence`, cited from `evidenceIds.polymer`). Grade-level
  evidence always takes precedence, and the validator proves it (`POLYMER-ENV-PRECEDENCE`). With an empty table the
  compiled database is byte for byte what it was: the layer leaves no key behind, so it is removable.
- **One verdict per category, by one rule.** Every agent `resistant` makes the category `resistant`. The category
  screens only where the reference finds the polymer resistant to nothing in it: at least one agent attacks or
  dissolves it (`not-resistant`, `soluble`) and none is rated `resistant`; `soluble` where an agent dissolves it,
  `not-resistant` otherwise. Anything else is `limited`. Not "any attacked agent screens": a grade-level sheet passes a
  material on the mild exposures it tests (INTERFACE, the filter rail), and a reference that rates PETG resistant to
  30% sulfuric acid and attacked by concentrated sulfuric acid says of the class what that sheet says. Screening PETG
  out of "Resists acids" on the concentrated row would hold it to a harsher test than any measured material faces; on
  the first rule 27 of 32 polymer-covered materials were screened out of acids, most on a concentrated or oxidising
  row beside resistant dilute ones. PA6, attacked at 2%, screens. The rule is `categoryVerdict` in
  `build/src/polymer-environment.js`, and the vocabulary's Screens column, not code, says which verdicts screen.
- **It never passes.** In a requirement's evaluation a polymer-level `resistant` or `limited` leaves the material
  UNKNOWN, with a reason that names the polymer, what the reference says of it and the reference. A polymer-level
  `not-resistant` or `soluble` screens the material out under Include uncertain with inference on, exactly as an
  estimate does (D43, D48): the verdict stays UNKNOWN, `screened` is true, `screenedBy` names the criterion, the
  SCREENED chip brings it back, and Why excluded counts it apart from an estimate's screen. Under Confirmed only it is
  UNKNOWN, as every unresolved criterion is.
- **One switch governs all inference.** "Use estimates" is now "Use estimates and polymer data"; its element ids and
  the scenario field keep their names so links and the fuzz keep working. The reader sees what a result rests on
  (D61): the screened chip says "Screened by the base polymer's published behaviour: Resists solvents", the drawer's
  Environment tab lists the records under "From the base polymer", with a line saying they are the neat resin's
  behaviour and not a test of this grade, and the filter rail counts them apart, "N more from the base polymer, shown
  but never passing". A category with polymer-level records is offered as a filter even where no grade-level record
  states a verdict: it cannot pass there, and the rail says so, but it can screen.

Reversing it either hides evidence an engineer would want to see, or lets a paragraph about a resin pass a filament
nobody tested. Letting it fail a material would be the same mistake in the other direction: the verdict describes the
evidence, and the evidence is not about this grade.

## D65. A test method that defines its load states that load; the typed value says so in Parse review

Two Siraya Tech sheets print heat deflection as `93 ℃ / 97 ℃ Method A/B` and `73.5 ℃ / 81 ℃ Method A/B`, naming the
method and never the load. Read literally, neither row carries a load, and `hdt045` cannot use a value whose load is
unknown: both would join the seven headlines `HDT-LOAD-UNSTATED` already warns about, presented as nothing more than
"an HDT". Read as the standards define them, both are unambiguous — ISO 75 and ASTM D648 agree that Method A is the
high load (1.80 and 1.82 MPa) and Method B the low (0.45 and 0.455 MPa), and no third convention exists.

**The load a named method defines is a stated load.** `Test load MPa` is typed to what the method means, and the row's
`Parse review` says that the raw text names the method rather than the load, which standard defines it, and who
decided. The parser reads the raw text and finds no load, so the typed value and the parser disagree on purpose;
`PARSE-MISMATCH` is an error precisely so that this disagreement cannot happen silently, and `Parse review` is where
it is defended. Nothing is inferred about a value the sheet did not print: only about what the words it did print
mean.

- **The method must be named, not guessed.** "ISO 75" alone is not a method; "Method A", "Method B", "HDT A" and
  "ISO 75-2/A" are. A sheet naming a standard without a method keeps `Test load MPa` at `Not published` and stays in
  the `HDT-LOAD-UNSTATED` count, which is what that warning is for.
- **Within-publisher evidence strengthens it but is not the reason.** The same publisher's PPA-CF, PPA-CF Core and
  PPA-GF sheets print "Method A @ 1.80 MPa" and "Method B 0.45 MPa" in full, so its `Method A/B` is demonstrably the
  same mapping. The ruling would hold without that, because the standards agree; the sister sheets are why this
  particular publisher's shorthand needed no owner judgement beyond confirming the rule.
- **A sheet that contradicts the standard is transcribed, not corrected.** One source on file prints "Method A with
  0.45 MPa and Method B with 1.80 MPa", inverting them. Its rows keep the loads the sheet printed, with the
  disagreement in `Standard / load`. The method names the load only where the sheet does not name a different one.

Reversing it would throw away a load the source does state, in the one class the screening back-test had to reach:
`hdt045` would lose the cases these rows carry, and a reader would be told the load is unknown when the sheet named
the test that fixes it. Extending it — typing a load from a bare standard, or from a temperature that looks like a
0.45 MPa result — would be the real error, and is what the "method must be named" clause forbids.

## D66. A templated safety data sheet is evidence only where it speaks about the product

Siraya Tech's four filament safety data sheets are word-for-word identical in sections 5, 7, 10, 12 and 13, across
three different polymers and two different fibres. Only section 3, the composition, differs. Two of the shared
statements are false of the products carrying them: 10.4 "Avoid temperatures above 240 ºC" appears on three sheets
whose own technical data sheets specify a 300-320 °C nozzle, and 5.3 and 10.6 name acetic acid among the
decomposition products of all four, which is what a vinyl-acetate or cellulose-acetate polymer releases and not an
ABS or a polyphthalamide.

A safety data sheet is a `Manufacturer statement`, and the rule for those has always been to record what the
publisher published. But `evidence.csv` rows are read per grade, and a row saying a material must stay below its own
printing temperature is read as a design limit. Transcribing that faithfully would put a false limit on a product,
sourced and page-cited, which is worse than not recording it.

- **Composition is recorded, always.** It is the fact no technical data sheet prints, it is why the class exists, and
  it is per-product on every sheet seen so far. It goes in `grades.Composition / filler` naming the SDS.
- **A shared statement is recorded where it is true of any filament** — ventilation, dust, storage, disposal — with
  `Exposure / conditions` saying it is identical across the publisher's sheets, so a reader knows it is a statement
  about the publisher's filaments generally and not a measurement of this one.
- **A shared statement that contradicts the product's own data sheet is not recorded**, and the migration header says
  which statement, which sheets, and what contradicts it. The finding belongs in the audit record, not in a grade.
- **The test is the contradiction, not the repetition.** A publisher whose sheets repeat a true statement is not
  penalised. 3DXTECH's sheet names hydrogen cyanide, which is what an acrylonitrile polymer does produce, and its
  flammability and stability rows are recorded in full.

Reversing it would let boilerplate become per-grade evidence: a PPA-CF that "must not exceed 240 °C" beside the
profile telling the reader to print it at 320 °C, each with a page citation. Dropping the whole document instead
would lose the composition, which is the only reason this source class was added.

## D67. A property is a row, not a pair of columns: the reference envelopes are long

`reference.csv` held a `min` and a `max` column for each of eight properties. Adding a ninth meant two new columns,
a schema change, an edit to the loader's column-pair walk, and 114 rows widened for a value most of them would not
have. That is the shape D46 had already rejected for measured properties, kept here only because the reference layer
is a drawing layer nobody was extending.

- **The envelopes are rows.** `reference_envelopes.csv` holds one row per reference material and property (Name,
  Property, Min, Max), 912 of them. `reference.csv` keeps the identity it owns: Category and Name.
- **The property list is data.** `schema/vocab/reference-properties.csv` declares each property and its unit, and
  `build/src/reference-properties.js` reads it. A ninth reference property is a vocabulary row and its envelope
  rows; no column, no schema change, no code change.
- **The unit is declared once.** It was a literal in the code beside the column names; it is now the vocabulary's
  `Unit` column, which is what the compiled `dist/reference.json` carries into the chart.
- **The order is the vocabulary's.** Every material presents its properties in the declared order, whatever order
  its rows are written in, so a hand-appended envelope cannot reorder a compiled file.
- **Proven, not assumed.** m42 refuses to drop a column unless every one of the 912 envelopes is a numeric pair.
  `npm run build:diff` reports no difference, and `dist/reference.json` is byte-identical to the build before it.

The legacy `offset` on each property is the retired reference workbook's column position. Nothing reads it, and it
stays in code, not in the data, only because `schema/reference.schema.json` still requires it in `meta.properties`.

Reversing it brings back a schema change for a number, and a loader that knows the shape of a spreadsheet.

## D68. A datasheet sentence is data, not a vocabulary: the state is a column on the row

*Amends D53 and D56, which put the state in the vocabulary.*

D53 fixed a real bug by giving each Moisture condition wording a declared State, and D56 did the same for
Post-processing: the build had been reading "wet" out of the words, so 84 conditioned rows, nylons among them, were
read as dry. Declaring the state was right. Declaring it *in the vocabulary* meant the wording was the key, so every
new datasheet sentence was a schema change. By this snapshot `post-processing.csv` held 33 sentences, 25 of them one
manufacturer's annealing paragraph in its own punctuation, and a sheet whose sentence differed by a word stopped the
build until someone added the sentence and declared its state again. m38 and m39 each carried that instruction in
their headers.

- **The state is a typed column.** `Moisture state` and `Post-processing state` sit beside the source's own words in
  `Moisture condition` and `Post-processing`, and the build reads only the columns. This is D49's rule, which every
  other decided value already followed: the profile windows, the drying schedule, the HDT load.
- **The words are still checked.** `readMoistureState` and `readPostProcessingState` read what a wording plainly
  says. Where the words say plainly and the column disagrees, the build stops (PARSE-MISMATCH) unless Parse review
  explains it. "Not annealed" and "unannealed" are read before "anneal", so a sentence that denies annealing is
  never read as annealing.
- **Where the words say nothing, the column decides.** Four wordings in this snapshot say nothing about the state
  of the specimen at test: storage humidity, a drying recommendation, a vacuum-sealing instruction, and resting at
  room temperature, which is not a heat treatment. The reader has no opinion on those, and nothing is inferred.
- **A new wording is data.** Adding a measurement whose sheet phrases its annealing differently is now a row, not a
  vocabulary entry and a second declaration of a state that is already in the row.
- **Specimen type keeps its vocabulary.** Its ten wordings are the database's own, not a publisher's, so declaring
  the Form there still makes a new one a deliberate act.

Reversing it brings back a build that stops on a sentence, and the pressure that creates to reuse a wording that is
close enough rather than record what the sheet says.

## D69. A profile's qualitative notes are rows, and an empty column is not a fact

`profiles.csv` was 56 columns wide. Eleven of them held free text about how a material prints, 363 notes spread
across 172 profiles, so most were empty on most rows. Three — Stringing, Volumetric limit and Difficulty — were
empty on every row of every profile, and had been since the workbook. A twelfth topic meant a column on all 172.

Worse, the notes were not reaching anyone. Only Storage humidity was compiled at all, and nothing rendered it; the
other ten were in the table and nowhere else, so a reader looking for what a manufacturer says about cooling or
overhangs could not see it, and a curator had no reason to record any more of it.

- **A note is a row.** `profile_notes.csv` holds one per profile and topic, the shape used everywhere else here
  (`headlines.csv`, `material_links.csv`, `fatigue_tests.csv`). A topic a source says nothing about has no row.
- **The topic is a vocabulary.** `schema/vocab/profile-topics.csv` names the eleven. A new one is a row there and
  the notes that use it; it was a column on every profile and a schema change.
- **The notes are shown.** The Printing tab renders each profile's notes under its typed fields, so all 363 reach
  the reader. That is the point of recording them.
- **An empty column is not a fact.** The three that were never once filled are gone. If a source ever publishes a
  volumetric limit it is a topic and a row, not a column that 171 profiles leave blank to say nothing.
- **A constant is a rule, not a per-profile value.** Temperature-group conflict was one sentence repeated on all 172
  rows. It is a rule of the database, so it belongs in `method.csv`, and its one clause the Method row did not
  already carry (the 45 °C low-temperature chamber guide limit) was added there.

`profiles.csv` keeps what the build decides on: the typed temperature axes, drying, enclosure, abrasion and routing.
Reversing it brings back a table that has to be widened to record a sentence, and evidence nobody can read.

## D70. A constant is not a per-material fact, and a summary of the data is not data

*Extends D47, which this snapshot had drifted from.*

D47 moved the stored conclusions out of the workbook: headline values, price medians, grade lists. Nine columns of
`materials.csv` had survived it, and three of them contradicted D47 outright. Price basis was a sentence counting a
material's own price observations, which `compilePriceHeadline` counts anyway. Headline basis was three sentences
chosen by the material's Scope and Representative grade, 102 of 103 rows derivable by that rule. Measurement
conditions was two measurement columns joined by a slash, compiled and rendered nowhere.

Four more were constants: Identity source said `LOCAL-CANON` on all 103 rows, Printability rubric `R-PRINT` on all
103, Normalized name repeated Original name on all 103, and Fatigue / creep said one sentence on 99, where the other
four are exactly the four materials with `fatigue_tests.csv` rows. The ten printability ratings were already ten
`evidence.csv` rows, with the same ratings and the same rubric.

- **Derived where the build can derive it.** `headlineBasis` and the price basis are computed, and m45 asserted the
  derivation row by row before dropping the column. `build:diff` shows one difference in 103 for headline basis and
  none at all for the price basis, which is the proof.
- **A constant is a rule, and rules live in `method.csv`.** Two Method rows were added, Scope / Headline basis and
  Scope / Transferable allowables.
- **The caveat that is true of everything is shown once, on everything.** "No transferable long-term allowable" sat
  on 82 materials, which reads as if the other 21 have one. It is true of every material here, so the drawer shows
  it on every material, from the Method row, and a material's own Limitations now record only what it adds.
- **Editorial prose the data contradicts is dropped, not kept.** Impact / toughness said "see distinct impact
  records" on 52 materials while 84 have impact measurements, and two of the 52 have none. m45 prints that cross-tab
  before dropping it. It was not rendered anywhere, so nobody had been reading a wrong thing; nobody had been
  reading it at all.

One sentence was lost text rather than a constant: M077, Support for PLA, said "mechanical values not published".
That is true and specific, so it moved to its Identity notes, which the drawer shows as "About this entry".

`materials.csv` is 16 columns. Reversing this brings back a table where a reader cannot tell which cells are facts
about the material and which are the same sentence 103 times.

## D71. How a source was classed and how it was reached are states, not sentences

`sources.csv` described both in prose. Source class held 21 wordings for nine real classes: "Manufacturer TDS",
"Manufacturer TDS (web)", "Manufacturer TDS indexed at authorized distributor" and "Manufacturer TDS hosted by
current brand owner" are one class and three facts about one document. Access status held 17 wordings for four real
states and had no vocabulary at all, so a twelfth spelling of "Retrieved" would have passed the gate, nothing could
be counted, and the one piece of code that had to know — whether a source was reached — tested prose with a regular
expression (`/^not retrieved/i`) that a rewording would have silently defeated.

- **The class is a vocabulary of nine.** Manufacturer TDS, Manufacturer product page or guide, Manufacturer SDS,
  Resin supplier data sheet, Retailer catalogue, Printer documentation, Peer-reviewed study, Safety guidance,
  Reference or register.
- **The state is a vocabulary of four.** `retrieved`, `retrieved-copy` (read from a copy the owner supplied and
  checked against what the publisher serves), `read-only`, `not-retrieved`. D50's rule that nothing may cite a
  source that was not retrieved now reads a declared state, not a sentence.
- **Nothing is paraphrased away.** What each wording carried beyond its class moves to Source note, and Access note
  keeps the retrieval sentence exactly as it was written. Both are shown in the Sources tab, where they were not
  shown before: a reader can now see that a sheet is hosted by the current brand owner, or that the served revision
  differs from the copy that was read.
- **The distinction that mattered survived.** Four sources say the currently-served revision differs from the copy
  the owner supplied. What was read there is the served file, so they are `retrieved`, not `retrieved-copy`, and the
  note says which. The migration's reader is anchored so "the copy the owner supplied" is never mistaken for
  "owner-supplied".

Reversing it brings back a register that cannot be counted, and a check on prose.

## D72. A record may leave a table only where the build derives it, and only through a ledger

*Narrows "nothing is deleted" (D45, D50).*

Records are retired, never deleted, and the pre-commit hook and CI enforce it by failing on any removed row. That
rule is right, and it is why a retired grade keeps its ID and a superseded finding keeps its text. But it also makes
one legitimate change impossible: moving a record out of a table because the build can now derive it. There was no
way to do that except to disable the check, which would have disabled it for everything in the same commit.

- **The exception is a ledger, not a flag.** `data/review/removed-records.csv` names the table, the record, the
  migration that moved it and where it went. A removal a row covers passes; every other removal still fails, with
  the same message as before.
- **The ledger is read from the version being checked.** The commit that removes a record is the commit that
  authorises it, so a removal cannot be waved through by a ledger row added later, and a reviewer sees both halves
  in one diff.
- **A dropped column is still not a deleted record.** It never was, and the ledger does not change that: moving a
  column's content into a child table is the shape m31, m42 and m44 used, and it needs no ledger row.
- **The ledger accumulates.** A row that covers nothing in today's diff authorised a removal in an earlier commit,
  which is history, not a defect. It is the audit trail the deleted rows no longer are.

Reversing it leaves only the blunt instrument: `--no-verify`, which turns off every check at once and leaves no
record of what was removed or why.
