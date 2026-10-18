# Outdoor structural part and Warm environment

> **Historical record** (2026-10-18): written for the screening review on release 9ca94d31fc5d. Figures may have changed since; re-run [census.mjs](../census.mjs).

> **In short.** This file reviews the two heat presets: an outdoor bracket that needs a heat deflection temperature
> (HDT) at 0.45 MPa of at least 100 °C, and a warm-environment part that needs 80 °C. Most answers are sound, but four
> materials are offered on heat figures a printed part does not reach. PLA is offered for the outdoor bracket only
> because colorFabb PLA HP prints 135 °C, and that is an injection-moulded figure. PLA-CF, PLA-NF and PBAT are shown as
> meeting 80 °C on sheets whose own glass transition, maximum-use temperature or 6 MPa stiffness contradict it. The switch
> "Let estimates rule out materials" hides only elastomers in these presets. It never shortens their "Insufficient
> evidence" lists, although many materials there have measured products that all miss (19 of 68 in Warm environment).

## What the presets ask and what came out

In both presets the heat requirement is answered by published values only, because no product has an HDT estimate.
Every preset also has the same basic checks. The material must be one the H2C can print at all (scope), and a build
material rather than a support. Its nozzle, bed and chamber temperatures must pass the printer check. Each preset was
run over 152 materials.

**Outdoor structural part.** It requires an HDT at 0.45 MPa of at least 100 °C, a tensile modulus in the print plane
(XY) of at least 3 GPa and a density of at most 1,500 kg/m³. It also reports a price of at most 100 CAD/kg, without
requiring it. Of the 152 materials, 7 meet every requirement, 6 are estimated candidates, 81 are under "Insufficient
evidence", 14 are hidden as unlikely and 44 fail (the status bar reads PASS 7, UNKNOWN 101, FAIL 44).

- The 7 that meet every requirement (ASA-CF, PA6-CF, PA6-GF, PET-CF, PPA-GF, PP-CF, PP-GF) are sound engineering picks.
  They are judged dry, and the preset itself says it does not check UV.
- The 14 hidden materials are all elastomers, for which HDT does not apply.
- Of the 81 under "Insufficient evidence", 43 have a required number on which every measured product fails. 13 are held
  open only by product estimates that miss the limit entirely but are not allowed to hide anything.

**Warm environment.** It requires an HDT at 0.45 MPa of at least 80 °C. Of the 152 materials, 39 meet it, none is an
estimated candidate, 68 are under "Insufficient evidence", 16 are hidden as unlikely and 29 fail (the status bar reads
PASS 39, UNKNOWN 84, FAIL 29).

- The estimated group is empty by construction: no product carries an HDT estimate (see F-H3 below).
- The 16 hidden materials are all elastomers, for which HDT does not apply.
- Of the 68 under "Insufficient evidence", 19 have every measured HDT below 80 °C, ten of them at 62 °C or less.
- Of the 118 passing products, 66 pass on an HDT whose sheet does not say how the test bar was made. 13 of the 39
  passing materials rest on such values alone. PETG passes on one row of Spectrum's 2025 product portfolio, PET-G MATT at
  exactly 80 °C, and PP on two products at exactly 80 °C.

## The materials we checked

The reviewer judged every material that looked questionable, plus two "Insufficient evidence" materials per preset drawn
at random, and traced each product's decision to its sheet. "Right by the rule" means the tool followed its own rules.
"Misleading" means a reader is led to a wrong conclusion all the same.

### Outdoor structural part (at least 100 °C, 3 GPa, at most 1,500 kg/m³)

| Material | Where the tool put it | Right? | Why, in one line |
|---|---|---|---|
| PLA | Estimated candidate | Wrong | The one product that makes it a candidate, colorFabb PLA HP, rests on a moulded 135 °C |
| ABS-GF | Estimated candidate | Right by the rule, at the limit | One product passes at exactly 100 °C on a bar of unstated type |
| PETG | Insufficient evidence | Right by the rule, misleading | All 45 products that publish an HDT are below 100 °C |
| PP | Insufficient evidence | Misleading | Half its products fail HDT, and every stiffness estimate is wholly below 3 GPa |
| PC FR | Insufficient evidence | Misleading | Its only stiffness, 1.67 GPa after annealing, shows the printed part misses 3 GPa |
| TPU 95A class | Hidden as unlikely | Right | HDT does not apply to an elastomer |
| ASA-EC (random) | Insufficient evidence | Right by the rule | One product, no HDT, and a stiffness estimate that straddles 3 GPa |
| PE-GF (random) | Insufficient evidence | Right by the rule | One product fails at 85 °C, and the other publishes nothing |

**PLA is offered for a 100 °C bracket on a moulded figure.** colorFabb's current PLA HP sheet prints 135 °C under the
heading "Typical Properties – 3D Printed", so the tool records it as a printed bar. The same row carries a footnote:
"Optimal temperature resistance is obtained after annealing the sample". colorFabb's earlier sheet for the same product
prints "HDT 134*" with "*only injection molded data available", and the tool rightly records that one as a resin value.
PLA HP's stiffness passes, and its density is estimated at 1,190 to 1,300 kg/m³, which makes it an estimated candidate.
Without the 135 °C, PLA would be under "Insufficient evidence".

**ABS-GF passes on the limit itself.** Fabru's purefil ABS GF10 prints exactly 100 °C, with no test bar stated. purefil
is a maker whose bar types OPEN-PROBLEMS §15 lists as unsettled. Its stiffness is published without a direction, so it is
estimated (3.14 to 4.91 GPa). ABS-GF's other products print 82 to 100 °C.

**PETG cannot reach 100 °C, yet stays open.** 45 of its 73 products publish an HDT measured the way the requirement asks,
and all are below 100 °C, the highest 94 °C (Spectrum PET-G HT100). PETG prints amorphous, and this database's 37 PETG
sheets put HDT 4 °C below their own glass transition on average. The 28 products that publish nothing keep it listed.

**PP is held open by estimates that cannot hide it.** 6 of its 12 products fail HDT, at 51 to 85 °C. Every product's
stiffness estimate lies wholly below 3 GPa, with the wide ranges topping out at 0.95 to 1.67 GPa. None of these estimates
is allowed to hide the material.

**PC FR publishes its stiffness only annealed.** Bambu Lab PC FR prints 1.67 GPa after annealing at 80 °C for 12 h.
Annealing PC 65 °C below its glass transition does not lower its stiffness, so the printed part cannot reach 3 GPa
either. The material's other product, Polymaker PolyMax PC FR, fails.

**The two random draws** are right by the rules. ASA-EC has one product, Spectrum ASA Conductive, with no HDT and a
stiffness estimate of 1.83 to 4.52 GPa (wide range) that straddles 3 GPa. ASA's printed HDTs (82 to 103 °C) make 100 °C
unlikely, but nothing in the data shows it. In PE-GF, Fabru's HDPE GF20 fails at 85 °C (bar type unstated), and
iSANMATE HDPE Glass Fiber, with no print profile and no values, holds the material open alone.

### Warm environment (at least 80 °C)

| Material | Where the tool put it | Right? | Why, in one line |
|---|---|---|---|
| PBAT | Supported | Wrong | Passes on 90 °C beside a 6 MPa modulus, too soft for HDT to mean anything |
| PLA-CF | Supported | Wrong | One of 19 products passes, on 91 °C beside its own sheet's glass transition of 60 °C |
| PLA-NF | Supported | Wrong | Nanovia PLA Flax's 80 °C sits beside "Max temperature 55 °C" on the same sheet |
| PLA | Supported | Right by the rule, misleading | 7 of 195 products pass, and five of the seven are doubtful |
| PLA Silk | Insufficient evidence | Right by the rule, misleading | All 16 products that publish an HDT print 50 to 62 °C |
| PAHT | Insufficient evidence | Wrong group, wrong reason | A printed 80 °C at the harsher 1.8 MPa load proves it passes, yet reads "Not published" |
| PC-ESD (random) | Insufficient evidence | Right by the rule | Both products pass HDT and wait only on the printer check |
| PCTG-CF (random) | Insufficient evidence | Right by the rule, misleading | Two of three products miss at 78 and 76 °C, and the third publishes nothing |

**PBAT passes a heat test it cannot take.** Flashforge "Flexible" is a PBAT. Its sheet prints 90 °C at 0.455 MPa on a
printed bar, and on the same page a modulus of 6 to 7 MPa and 400 to 600 % elongation. The tool's own reason for calling
HDT not applicable to elastomers is that a bar softer than about 225 MPa has no meaningful HDT. HDT still "applies" here,
because the rule reads PBAT's polymer class, semicrystalline, instead of the product's stiffness (F-H2).

**PLA-CF passes on one product above its own glass transition.** 3DXTECH CarbonX CF-PLA prints 91 °C on a printed bar
from a 23 °C bed, and a glass transition of 60 °C on the same sheet. The material's eight other measured values are 54
to 65 °C (F-H1).

**PLA-NF passes on a range the sheet itself caps.** Nanovia PLA Flax prints "HDT B 80 – 90 °C (E2092)" beside
"Tg 55 – 60 °C" and "Max temperature 55 °C". The record takes 80 °C and passes. Extrudr FLAX prints 55 °C (F-H1).

**PLA passes, but mostly on doubtful values.** 7 of its 195 products pass. Volcano PLA 150C (110 °C, "without
annealing") would carry the material alone, since one passing product is enough. purefil PLA+ (90 °C, bar type
unstated) is the second. The other five are doubtful:

- colorFabb PLA HP, on its moulded 135 °C.
- 3DXTECH Tough PLA at 80 °C and SimuBone at 89 °C, each beside a glass transition of 55 °C and a 23 °C bed on its sheet.
- Nanovia PLA EF 3D850 and PLA VX at 80 to 90 °C, beside a glass transition of 55 to 60 °C and "Max temperature 55 °C".

The row shows the median of all PLA products, not the passing one.

**PLA Silk cannot reach 80 °C, yet stays open.** 16 of its 33 products publish an HDT, all 50 to 62 °C. The other 17 are
silent or published only after annealing. Bambu Lab PLA Silk+ prints 60 °C after 55 °C for 8 h, which bounds the
printed part below 80 °C (F-H4, F-H5).

**PAHT has the proof but is not credited.** LEHVOSS LUVOCOM 3F PAHT 9825 NT prints an HDT of 80 °C at 1.8 MPa on a
printed bar. A lighter load cannot deflect the bar sooner, so its HDT at 0.45 MPa is at least 80 °C and the product
passes. The page says "Not published in the sampled sources" (F-H5).

**The two random draws.** PC-ESD's two 3DXTECH products pass HDT at 135 and 141 °C. One is held by a chamber that is
"recommended" with no temperature, the other by a missing print profile: a printer question, not a heat one. In PCTG-CF,
FormFutura AthenaX CF10 prints 78 °C and Fiberlogy PCTG+CF10 76 °C (bar type unstated), while Nobufil PCTG CF publishes
no HDT and holds the material open.

**The 16 hidden materials** are the TPU classes, TPE, TPS, TPV, TPC, PEBA, OBC and their filled or conductive variants.
Hiding them is right, since HDT does not apply to an elastomer. One is arguable: Spectrum S-Flex Carbon's moulded bar
is 2.2 GPa with HDT 134 °C at 0.45 MPa, yet TPU-CF is hidden by its family (F-H2).

## What goes wrong, and why

Six root causes explain the doubtful answers. The first two put wrong materials on the list, the next three mislead,
and the last is a latent data error. Each tag names the reviewer's finding (F-H) and root cause (R-H), which the review's
README cites.

### Moulded heat-deflection values, and values far above the glass transition, are read as printed ones (F-H1, R-H1)

**What happens.** The tool counts an HDT as a printed part's value when the sheet does not say how the bar was made or
treated. A heading such as "3D Printed" outranks a footnote in the row that says otherwise. Nothing checks an HDT
against the same sheet's glass transition, so a figure far above it passes for printed PLA.

**Example.** colorFabb PLA HP's 135 °C, above, alone makes PLA an estimated candidate for the 100 °C bracket. In Warm
environment, six PLA-family products pass on an HDT 25 to 34 °C above the glass transition printed on their own sheet:

- 3DXTECH SimuBone at 89 °C against 55 °C, CarbonX CF-PLA at 91 against 60, and ECOMAX Tough PLA at 80 against 55.
  All three are printed on a 23 °C bed.
- Nanovia PLA EF 3D850, PLA VX and PLA Flax, 80 to 90 °C against 55 to 60 °C. Their sheets also print "Max temperature
  55 °C", and 3D850's says "pieces in direct sunlight should be avoided".

The database itself shows that this cannot be a printed bar of PLA, which prints amorphous. Over 97 PLA sheets that
print both values, HDT at 0.45 MPa sits 2 °C below the glass transition on average. PETG sits 4 °C below, ABS 12 and PC
8. These six are the only PLA pairs more than 16 °C above.

**Why.** Three gaps add up:

1. The rule for which values count admits a bar whose type and treatment are unstated as a printed one. That is the
   owner's policy (decision D84, and OPEN-PROBLEMS §15), and 794 of the 1,323 HDT rows state no bar type.
2. No physical relation ties HDT to the glass transition for a polymer that prints amorphous. The physical-relations
   table relates HDT only to HDT at the other load, and to the melting point of semicrystalline polymers. PLA is classed
   amorphous.
3. The plausibility window for amorphous HDT spans 30 to 180 °C for PC and PLA alike. Its stated basis, "glass
   transition plus 20 °C at 0.45 MPa", is the opposite of what the data show.

PLA HP's "unexplained asterisk" is already in OPEN-PROBLEMS §37.18. That the value is moulded and decides a group, and
the PLA values far above their glass transition, are new.

**How many.** 7 PLA-family products sit more than 15 °C above their own glass transition. The 6 at 25 °C or more all
pass Warm environment. It changes the answer for 3 materials: PLA in Outdoor (estimated candidate), and PLA-CF and PLA-NF
in Warm (supported). PLA in Warm stays supported through Volcano PLA 150C and purefil PLA+.

**How serious.** Wrong answer: three materials are shown as candidates that should not be.

**Direction.** Read the row's footnote before the heading, and add an HDT-against-glass-transition relation for
polymers that print amorphous (the review's change C11).

### Whether heat deflection applies follows the polymer's class, not the product's stiffness (F-H2, R-H2)

**What happens.** The tool decides that HDT does not apply from the material's polymer class. The reason for that rule
(decision D56) is a property of the product: a bar softer than about 225 MPa has no meaningful HDT. The rule never reads
the product's own stiffness.

**Example.** PBAT passes Warm environment on a 6 MPa product, as above, because its polymer is classed semicrystalline.
nGen FLEX prints a 150 MPa modulus and sits under "Insufficient evidence" instead of being hidden. Crystal Flex (an SBC)
and purefil PVC-P 94A are in the same position. The other way round, TPU-CF is hidden although its only sheet with a
stiffness prints a 2.2 GPa moulded bar, a figure OPEN-PROBLEMS §37.3 already questions.

**How many.** One wrong answer: PBAT in Warm environment, and in any heat question at 90 °C or less. Misleading
listings for three materials: PVC, nGen FLEX and SBC in Warm environment, and PVC and SBC in Outdoor. One arguable
hiding: TPU-CF. A search for products with both a modulus under 0.225 GPa and an HDT finds only PBAT and purefil COC
flex (60 °C, which fails anyway).

**How serious.** Wrong answer for one material, misleading for three.

**Direction.** Let a product's own modulus or Shore A hardness make HDT not apply. The review's change C12 does this as
data: it flags PBAT's value and adds the 225 MPa physics to the data checks.

### "Let estimates rule out materials" hides only elastomers and materials nobody sells (F-H3, R-H3)

**What happens.** The switch can hide a material in two cases only. The first is a property that does not apply, such
as an elastomer's HDT. The second is a material with no product at all, judged on its family estimate. No product
estimate is allowed to hide anything, and HDT has no product estimates at all.

**Example.** This is what the switch hid in each preset. No preset asks an environment requirement (resistance to a
chemical), so the screens on resin data never ran.

| Preset | Hidden as unlikely | Because a property does not apply | Material with no product | By a product estimate |
|---|---:|---:|---:|---:|
| Outdoor structural part | 14 | 14 | 0 | 0 |
| Indoor prototype | 0 | 0 | 0 | 0 |
| Lightweight structure | 0 | 0 | 0 | 0 |
| Warm environment | 16 | 16 | 0 | 0 |
| High-stiffness fixture | 1 | 0 | 1 (PA612) | 0 |
| Flexible component | 2 | 0 | 2 (PA66-CF, PA612-GF) | 0 |

**Why.** Four limits combine:

1. Product estimates have no proof from back-testing that they are safe to use for exclusion. Decision D137 asks for
   194 independent calibration groups per kind of evidence, and none has that many.
2. HDT's product-level calibration hits its limit, so no product gets an HDT estimate. A silent product in a heat
   question is plain "Not published", and cannot even become an estimated candidate.
3. A material estimate exists only where no product publishes a value, and the engine reads it only for a material with
   no product. That leaves PA66-CF, PA612 and PA612-GF (see F-F6 in [flexible-and-indoor.md](flexible-and-indoor.md)).
4. A material is hidden only when every one of its unresolved products is hidden.

These limits are recorded in OPEN-PROBLEMS §35. What they leave the switch doing is not.

**How many.** 33 materials hidden across the six presets: 30 because a property does not apply, 3 with no product.
There are 2,858 product estimates on required properties. None may hide a material, 1,393 lie wholly on the failing
side, and 109 "Insufficient evidence" listings are held open only by such estimates. That is 13 in Outdoor, 14 in
Lightweight, 44 in High-stiffness and 38 in Flexible. Warm has none, because HDT has no estimates.

**How serious.** Misleading: the switch's name promises exclusions it cannot make in any heat question.

**Direction.** Say so on the switch, or prove a class of estimate safe for exclusion. The review renames the switch
(change C02).

### Materials whose every measured product fails stay in "Insufficient evidence" (F-H4, R-H4)

**What happens.** A material fails only when every product fails (decision D100). One product that publishes nothing
keeps it unresolved, and a sibling's failure never counts against the silent product. The row does not say that every
measured product misses.

**Example.** In Outdoor, PETG's 45 measured products are all below 100 °C, and 28 silent ones keep it listed. In Warm,
ten materials top out at 51 to 62 °C against 80 °C: PLA Sparkle, Glow, Galaxy, Marble, Metal, Wood, Aero, Silk, PLA-ESD
and PCL. For heat there is not even an estimate to show beside them (F-H3).

**How many.** 181 of the 436 "Insufficient evidence" listings across the six presets have a required number on which
at least one product is measured and none passes:

| Preset | Listings where every measured product misses | Of all "Insufficient evidence" |
|---|---:|---:|
| Outdoor structural part | 43 | 81 |
| Indoor prototype | 0 | 39 |
| Lightweight structure | 23 | 64 |
| Warm environment | 19 | 68 |
| High-stiffness fixture | 47 | 94 |
| Flexible component | 49 | 90 |

The 2026-10-07 audit counted 51 such materials for the 5 GPa question. This count finds 47 of 94 now. The stiffness
review's own query finds 45, and the gap of two changes no conclusion.

**How serious.** Misleading. It is the known problem in OPEN-PROBLEMS §35, still open, at the same size.

**Direction.** List these materials apart, named by the fact, for example "every measured product misses HDT ≥ 100 °C:
45 of 73" (the review's change C18).

### Evidence that bounds a value one way is ignored, and reported as absent (F-H5, R-H5)

**What happens.** Two kinds of evidence settle a case one way, and the tool uses neither. A printed HDT at 1.8 MPa is a
lower bound for the HDT at 0.45 MPa on the same bar, since a lighter load cannot deflect the bar sooner. An annealed HDT
or modulus below a minimum shows that the printed part misses too. Heat treatment below the melt raises crystallinity
and relaxes the glass, and does not lower HDT or modulus.

**Example.** LUVOCOM PAHT's printed 80 °C at 1.8 MPa proves it meets 80 °C at 0.45 MPa, yet it reads "Not published in
the sampled sources". Bambu Lab PC FR's annealed 1.67 GPa and PLA Silk+'s annealed 60 °C already miss their limits, and
the products stay open.

**Why.** A bound never decides a pass (decision D48), so the 1.8 MPa value serves only to stop an estimate from hiding
a material. An annealed value counts as "another state" whichever way it points (decision D99), because "Changes with
annealing" is one flag per property. The reason text does not mention the published 1.8 MPa value. For HDT, the bound is
the test's own physics on the same product, not an inference.

**How many.**

- 51 products in 28 materials, across the database, hold an as-printed or unstated HDT at 1.8 MPa of 80 °C or more and
  no comparable value at 0.45 MPa. In Warm environment, 24 of them have nothing else open. Three materials would then
  meet the requirement: PA6-CE, PAHT, and ASA-AF, whose copy is disputed in the accepted findings.
- Annealed values below a required minimum (HDT or modulus) appear in 141 product results: 56 in Outdoor, 21 in
  Lightweight, 23 in Warm and 41 in High-stiffness. They decide 6 listings, in which every unresolved product carries
  such a value: PC FR and ABS-AF in Outdoor, PC FR in Lightweight, and PC FR, PA612-ESD and PPS-GF in High-stiffness.

**How serious.** Misleading: materials are listed lower than their evidence warrants, and one reason is untrue.

**Direction.** Let a printed HDT at 1.8 MPa pass an HDT-at-0.45 MPa minimum on the same product, labelled as such
(change C22). Back-test the annealed bound before making it a rule (change C24).

### One number is typed at two loads across a maker's two documents (F-H6, R-H6)

**What happens.** A maker prints one HDT on two documents with different loads, and the tool records both readings.
The check that compares HDT at the two loads looks within one document only, so it never sees the clash.

**Example.** Fiberlogy PP's data sheet prints 51 °C "@ 1.8 MPa", and its product page 51 °C "@ 0.45 MPa". The 0.45 MPa
reading fails Fiberlogy PP in both heat presets, though 51 °C is a typical PP figure at 1.8 MPa. colorFabb PA Blue Metal
Detectable prints "Heat Deflection temperature (amorphous) 60" above "Heat Deflection Temperature (A) 90". The record
reads "(A)" as ISO 75 method A (1.8 MPa). The pairing with "amorphous", and the other sheet's HDT-B of 90 °C, suggest a
crystallised bar at 0.45 MPa. Spectrum S-Flex Carbon's "HDT A - 134 °C" is already known (OPEN-PROBLEMS §37.3).

**How many.** 6 products carry one value at 1.8 MPa on one document and at 0.45 MPa on another. It changes one product's
answer (Fiberlogy PP) and no material's. If the 1.8 MPa bound of F-H5 were adopted, PA Blue Metal Detectable's "(A)"
reading would wrongly pass its material, the maker-undisclosed nylon.

**How serious.** Cosmetic now, with a latent wrong answer.

**Direction.** Extend the load check from one document to one product, and re-read the six products (change C15).

## Words used in this file

- **HDT**: heat deflection temperature, at 0.45 MPa unless a load is named. "HDT A" and "HDT B" are the ISO 75 methods
  at 1.8 and 0.45 MPa.
- **Measured the way the requirement asks** (the tool's "comparable" value): a value on a printed or unstated bar, with
  the direction and load the requirement needs.
- **Supported**: meets every requirement on published data. **Estimated candidate**: listed as "Estimated candidates to
  verify", because the middle value (a 50/50 guess) of an estimate meets the limit. **Insufficient evidence**: every
  other unresolved material, in a collapsed list.
- **Hidden as unlikely** (the page's "screened"): held out behind the SCREENED chip, counted as UNKNOWN, never as FAIL.
- **Wide range (95 %)** and **range shown on the page (80 %)**: the two ranges of an estimate.
- **Printer check**: the nozzle, bed and chamber temperatures a product needs, against the H2C's 350 °C nozzle, 120 °C
  bed and 65 °C chamber.
- **Listing**: one material in one preset's results.

## Evidence and where to check

### How the figures were produced

Every figure comes from `$F`, written by `node docs/audits/2026-10-18-screening-review/census.mjs --full $F` on release
9ca94d31fc5d (its `dist/db.json` and `dist/h2c.sqlite`, not rebuilt). One product's decision:
`npm run trace -- --scenario <file> --product <GradeID>` with [outdoor-structural-part.json](../scenarios/outdoor-structural-part.json)
and [warm-environment.json](../scenarios/warm-environment.json). The sheets' words come from `npm run sql` over
`documents_fts`. Random draws as in [flexible-and-indoor.md](flexible-and-indoor.md): the preset's Insufficient-evidence
material IDs sorted, mulberry32 seeded 20261018, the first two distinct draws (Outdoor: M105, M138; Warm: M116, M144).

### Outdoor structural part, material by material

- PLA (M001): G001-58 colorFabb PLA-HP. V005853 (R-COLORFABB-TDS-E-ColorFabb-PLA-HP-7a500b p. 1), V005792 recorded as a
  Raw material value (…-5210c3 p. 1). Density estimate 1,190 to 1,300 kg/m³.
- ABS-GF (M028): G028-11 Fabru ABS GF10, V013101 (R-FABRU-3491… p. 1). Modulus V005707, published without direction.
- PETG (M020): G020-08 Spectrum PET-G HT100, V012391. Count by the F-H4 one-liner below.
- PP (M082): G082-10 Fiberlogy PP, V012179; G082-06 purefil PP, V005642. G082-02 iSANMATE PP's modulus prediction 0.30
  to 0.97 GPa. No product prediction may screen (`canScreen` false).
- PC FR (M036): G036-01 Bambu Lab PC FR, V000706 (B-pc-fr-TDS). G035-08 Polymaker PolyMax PC FR, FAIL.
- TPU 95A class (M161): the census reason, 19 products (D56).
- ASA-EC (M105, random): G105-01 Spectrum ASA Conductive.
- PE-GF (M138, random): G138-02 Fabru HDPE GF20, V008436; G138-03 iSANMATE HDPE Glass Fiber.

### Warm environment, material by material

- PBAT (M133): G133-01 Flashforge Flexible, V005369 and V005367 (D-FLASH-PBAT-TDS-EN p. 1).
- PLA-CF (M018): G018-04 3DXTECH CarbonX CF-PLA, V003309 (X-ECOMAX-CarbonX-CF-PLA-TDS-v3 p. 1).
- PLA-NF (M152): G152-02 Nanovia PLA Flax, V010287 and V012276 (R-NANOVIA-PLA-Flax p. 1).
- PLA (M001): V007602 (Volcano PLA 150C), V005853, V003212, V010211, V007474, V007533. "Would carry it alone" is the rule
  that one passing product passes the material (D83).
- PLA Silk (M008): G008-10 purefil PLA Silk, V005669; G009-01 Bambu Lab PLA Silk+, V000149.
- PAHT (M147): G147-01, V011437 (R-COLORFABB-TDS-LUVOCOM-3F-Filaments-9825-NT p. 1).
- PC-ESD (M116, random): G116-01 3DXSTAT ESD-PC, V003156; G116-02 TriStat ESD-PC, V015103.
- PCTG-CF (M144, random): G144-01 AthenaX CF10, V007712; G144-03 Fiberlogy PCTG+CF10, V010932.
- PETG's single passing row: G020-09 Spectrum PET-G MATT, V012427 (R-COVERAGE-20261001-28aad1fe7597 p. 23, Spectrum's
  Product Portfolio 2025). PP's two: G082-03 Spectrum PP, V002675; G082-13 Fiberlogy R PP, V010743.
- TPU-CF (M129): Spectrum S-Flex Carbon (G129-01), V004078 and V004080.

### F-H1: moulded, annealed or Tg-inconsistent HDTs

- colorFabb PLA HP (G001-58) decides PLA's Outdoor group on V005853, recorded "Printed specimen" from the "Typical
  Properties – 3D Printed" heading. V005792, from the earlier sheet, is correctly a Raw material value.
- The six PLA-family products: V010211 SimuBone, V003309 CarbonX CF-PLA, V003212 ECOMAX Tough PLA, V007474 PLA EF 3D850,
  V007533 PLA VX, V010287 PLA Flax. The seventh product the query below returns, more than 15 °C but less than 25 °C
  above its Tg, is G019-01 Polymaker HT PLA GF (75.5 °C against 59.8 °C).
- Code and data: the comparability rule admits an unstated specimen and post-processing
  ([products.js:16-18](../../../../build/src/products.js)).
  [physical_relations.csv](../../../../data/tables/physical_relations.csv) relates HDT only to HDT (PR08) and to the melt
  for semicrystalline polymers (PR11). PLA is "amorphous" ([polymers.csv:2](../../../../data/tables/polymers.csv)). The
  amorphous HDT window is W0056 ([plausibility_windows.csv:57](../../../../data/tables/plausibility_windows.csv)).
- Known in part: [OPEN-PROBLEMS §37.18](../../../OPEN-PROBLEMS.md). Admitting unstated specimens: D84 and §15.
- One-liner:
  `npm run sql -- "with tg as (select gradeid,sourceid,min(normalized_value) tg from measurements where property='Glass transition temperature' and data_status not like '%implausible%' group by 1,2) select p.gradeid,p.value,tg.tg from products_compiled p join measurements m on m.measurementid=p.measurementid join tg on tg.gradeid=p.gradeid and tg.sourceid=m.sourceid join materials mt on mt.materialid=p.materialid join polymers pol on pol.polymerid=mt.estimate_identity where p.headline_key='hdt045' and p.level='comparable' and pol.morphology='amorphous' and m.post_processing_state<>'annealed' and p.value>tg.tg+15"`

### F-H2: HDT applicability by polymer class

- PBAT: V005369, V005367. nGen FLEX's modulus: V005859. Materials: PVC (M135, purefil PVC-P 94A), nGen FLEX (M143),
  SBC (M174, Crystal Flex), TPU-CF (M129).
- Code and data: hdt045's "Applies to" lists morphologies and families
  ([headline_definitions.csv:15](../../../../data/tables/headline_definitions.csv)). Compile marks a material not
  applicable from its polymer row ([compile.js:245-246](../../../../build/src/compile.js)), and the engine screens on it
  ([constraints.js:132-137](../../../../app/js/engine/constraints.js)). PBAT's row says semicrystalline
  ([polymers.csv:44](../../../../data/tables/polymers.csv)).
- One-liner (returns PBAT and purefil COC flex):
  `npm run sql -- "select a.gradeid,a.value modulus,b.value hdt045 from products_compiled a join products_compiled b on b.gradeid=a.gradeid and b.headline_key='hdt045' where a.headline_key='tensileModulusXY' and a.value<0.225"`

### F-H3: what the switch can hide

- Uncertified product exclusions: with no class at 194 calibration groups, `screenRange` is null and `canScreen` false
  ([product-screening.js:150-155](../../../../build/src/estimate/product-screening.js)).
- HDT's grade calibration reaches its clamp, so no product receives an HDT prediction
  ([estimate/index.js:105-113](../../../../build/src/estimate/index.js)). A silent product cannot be an estimated
  candidate ([constraints.js:614-617](../../../../app/js/engine/constraints.js)).
- A material estimate exists only where no product publishes
  ([estimate/index.js:118](../../../../build/src/estimate/index.js)) and reaches products only in pre-v2 snapshots
  ([products.js:169-175](../../../../app/js/engine/products.js)). Productless materials: M056, M058, M060.
- A material is screened only when every unresolved product is screened
  ([constraints.js:690-691](../../../../app/js/engine/constraints.js), D137). Limits recorded in
  [§35](../../../OPEN-PROBLEMS.md).
- One-liner (screens by kind):
  `node -e 'const d=require(process.argv[1]);for(const[p,ms]of Object.entries(d)){const k={};for(const m of Object.values(ms)){if(m.group!=="screened")continue;const t=!m.products.length?"no-product estimate":m.products.every(x=>!x.screened||x.results.some(r=>r.reason.startsWith("Not applicable")))?"not applicable":"other";k[t]=(k[t]||0)+1}console.log(p,JSON.stringify(k))}' $F`

### F-H4: every measured product fails

- Engine rule D100 ([constraints.js:681-691](../../../../app/js/engine/constraints.js)). Earlier count:
  [2026-10-07 audit](../../2026-10-07-uncertain-logic/README.md); open item [§35](../../../OPEN-PROBLEMS.md).
- The one-liner counts required numeric properties only (High-stiffness's reported HDT left out). It counts a material
  when at least one product fails a requirement and no product passes it:
  `node -e 'const d=require(process.argv[1]),rep={"High-stiffness fixture":"hdt045"};for(const[p,ms]of Object.entries(d)){let ins=0,hit=0;for(const m of Object.values(ms)){if(m.group!=="insufficient")continue;ins++;const req=[...new Set(m.products.flatMap(x=>x.results.filter(r=>r.status==="FAIL"&&/^(hdt045|tensileModulusXY|density|elongationXY) /.test(r.criterion)&&!r.criterion.startsWith(rep[p]||"~")).map(r=>r.criterion)))];if(req.some(q=>m.products.every(x=>x.results.some(r=>r.criterion===q))))hit++}console.log(p,hit,"of",ins)}' $F`

### F-H5: one-way bounds

- LUVOCOM PAHT: V011437. Bambu Lab PC FR: V000706. PLA Silk+: V000149. Materials that would pass: M104 PA6-CE, M113
  ASA-AF, M147 PAHT. Annealed-only listings: M036 and M106 (Outdoor), M036 (Lightweight), M036, M065 and M074
  (High-stiffness).
- Rules: D48 ("A bound never passes", [DECISIONS](../../../DECISIONS.md)) and D99. The 1.8 MPa lower bound serves only
  as a veto on estimate screens ([constraints.js:155-159](../../../../app/js/engine/constraints.js)). "Changes with
  annealing" is one flag per headline ([headline_definitions.csv:15](../../../../data/tables/headline_definitions.csv)).
- One-liners (1.8 MPa bounds; annealed values below a "≥" limit):
  `npm run sql -- "select count(*),count(distinct p.materialid) from products_compiled p join measurements m on m.measurementid=p.measurementid where p.headline_key='hdt18' and p.value>=80 and m.post_processing_state<>'annealed' and m.moisture_state<>'conditioned' and not exists (select 1 from products_compiled q join measurements mq on mq.measurementid=q.measurementid where q.gradeid=p.gradeid and q.headline_key='hdt045' and q.level='comparable' and mq.post_processing_state<>'annealed')"`
  `node -e 'const d=require(process.argv[1]),rep={"High-stiffness fixture":"hdt045"};for(const[p,ms]of Object.entries(d)){let n=0;const mv=[];for(const[id,m]of Object.entries(ms)){const hit=r=>{const[q,op,v]=r.criterion.split(" ");const a=r.reason.match(/^Published only after annealing.*?\(([\d.]+) /);return a&&/^(hdt045|tensileModulusXY)$/.test(q)&&q!==rep[p]&&op[0]===">"&&+a[1]<+v};for(const x of m.products)n+=x.results.filter(hit).length;const u=m.products.filter(x=>x.verdict==="UNKNOWN");if(m.group==="insufficient"&&u.length&&u.every(x=>x.results.some(hit)))mv.push(id)}console.log(p,n,mv.join(" "))}' $F`

### F-H6: one number at two loads

- Fiberlogy PP: V009228 ("@ 1.8 MPa", data sheet) and V012179 ("@ 0.45 MPa", product page), on G082-10. colorFabb PA
  Blue Metal Detectable (G164-02): V011126 read as method A, V011255 HDT-B 90. S-Flex Carbon: §37.3.
- The six grades: G001-77, G020-25, G031-13, G082-10, G129-01, G164-02. The load check is PR08 "grade;source"
  ([physical_relations.csv:9](../../../../data/tables/physical_relations.csv)).
- One-liner:
  `npm run sql -- "select a.gradeid,a.measurementid,b.measurementid from measurements a join measurements b on a.gradeid=b.gradeid and a.sourceid<>b.sourceid and a.normalized_value=b.normalized_value where a.property='HDT' and b.property='HDT' and a.test_load_mpa=1.8 and b.test_load_mpa=0.45 and a.data_status like 'Published value%' and b.data_status like 'Published value%' and a.data_status not like '%implausible%'"`

### The reviewer's root-cause table

As the reviewer wrote it, with the plain statements moved into the headings above. R-H5's reach is corrected: its 51
products are counted across the database, not in Warm environment alone.

| ID | Layer | Reach | Severity |
|---|---|---|---|
| R-H1 | Source data, build rules | 7 products; 3 groups (M001 Outdoor, M018 and M152 Warm) | Wrong answer |
| R-H2 | Template definition | M133 wrong; M135, M143, M174 misleading; M129 arguable | Wrong answer |
| R-H3 | Estimate model and engine | 33 screens (30 not applicable, 3 productless); 0 of 2,858 predictions; 109 listings held only by them | Misleading |
| R-H4 | Engine rule (D100) | 181 of 436 Insufficient listings (Warm 19, Outdoor 43) | Misleading |
| R-H5 | Engine rules (D48, D99) | 51 products in 28 materials database-wide, 24 of them open in Warm only on this, 3 materials; 141 annealed results, 6 listings | Misleading |
| R-H6 | Transcription and lint | 6 grades, 1 product verdict | Cosmetic (latent) |
