# Decisions

The choices that are not obvious, and the bugs that forced several of them. Each says what would
break if it were reversed, because that is the part that gets lost.

---

## D1. Excel is the authoring format; JSON is the runtime

A browser can parse XLSX, but doing so couples the interface to workbook layout, pushes validation
failures into the user's session, and makes output non-deterministic. The workbook is never written
by anything here.

## D2. Headline values are verified, never recomputed

The Materials sheet already cites the MeasurementID behind each headline. The build checks the
number equals its citation rather than deriving a headline itself. All 348 reconcile.

This converts a class of judgement calls into build errors. Corrupting one density cell produces a
named error and no output.

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
`within > exceeds-recommended > exceeds > unknown`.

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
sheet does not support that: routing and AMS read "verify the exact grade" on 133 of 156 profiles,
enclosure is unpublished on 142, difficulty on all 156.

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

## D10. A family estimate may rule out, never rule in

The asymmetry is the whole design. Knowing every measured unreinforced PLA falls between 2.8 and
15.3% elongation is enough to say PLA Lite is not an elastomer. It is not enough to certify PLA Lite
clears a 5% floor, because the bound is drawn from its relatives.

Reversing this would let inference satisfy a requirement, which the brief forbids outright. Before
estimates, a search for elongation at least 100% returned 35 materials including PLA Lite and the
nylons; it now returns 14, of which 8 are genuine elastomers and 6 are supports that honestly have
no peers.

## D11. Estimates never pool across behaviour classes

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

Environment category display names live in `build/mappings/environment-topics.json`, next to the
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
