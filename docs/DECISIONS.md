# Decisions

The choices that are not obvious, and the bugs that forced several of them. Each says what would
break if it were reversed, because that is the part that gets lost.

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
reason. `npm run migration:verify` replays it from the workbooks in git history. See
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

**The transfer.** `npm run migration:ledger` reads the retired workbook from git with native cell values and classes
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
