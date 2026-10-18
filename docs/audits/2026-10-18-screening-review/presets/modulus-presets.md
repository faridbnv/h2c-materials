# Modulus presets: Lightweight structure and High-stiffness fixture

> **Historical record** (2026-10-18): written for the screening review on release 9ca94d31fc5d. Figures may have changed since; re-run [census.mjs](../census.mjs).

> **In short.** This file reviews the two stiffness presets: a lightweight structure (at most 1,250 kg/m³, at least
> 2.5 GPa) and a high-stiffness fixture (at least 5 GPa). Few products publish a modulus measured the way the requirement
> asks, so most answers rest on estimates, and that is where they go wrong. A material becomes an "estimated candidate"
> when one product's middle estimate meets the limit, though half of those estimates are coin flips and in 13 of 43
> cases every measured product fails. The estimates run high, because a product's unusable value (no test direction, or
> a moulded bar) is taken at face value and blended with its material's. At the other end, 44 of High-stiffness
> fixture's 94 "Insufficient evidence" materials are estimated wholly below 5 GPa, yet stay listed because no product
> estimate may hide anything. Two data faults matter too: carbon-fibre PETG densities lighter than plain PETG, and BASF's
> PET-CF modulus, set aside because it was tested at normal lab humidity.

## What the presets ask and what came out

Both presets lean on estimates, and both list more materials as estimated candidates than as meeting the requirement.
Every preset also has the same basic checks. The material must be one the H2C can print at all (scope), and a build
material rather than a support. Its nozzle, bed and chamber temperatures must pass the printer check. Each preset was
run over 152 materials.

**Lightweight structure.** It requires a density of at most 1,250 kg/m³ and a tensile modulus in the print plane (XY)
of at least 2.5 GPa. Of the 152 materials, 15 meet both, 18 are estimated candidates, 64 are under "Insufficient
evidence", none is hidden and 55 fail.

- The 18 estimated candidates rest on 39 estimated products and 40 estimated requirements. 30 of those 40 middle values
  are coin flips, and 31 wide ranges contain the limit.
- In 14 of the 18 materials, every estimated product is a coin flip. 11 rest on a single estimated product, 10 of them
  a coin flip.
- In 9 of the 18, the row's median fails the requirement the group heading says is met. In 7, every value measured the
  way the requirement asks fails it.

**High-stiffness fixture.** It requires a tensile modulus (XY) of at least 5 GPa, and it reports, without requiring, an
HDT of at least 90 °C. Of the 152 materials, 5 meet the requirement, 9 are estimated candidates, 94 are under
"Insufficient evidence", 1 is hidden as unlikely and 43 fail.

- The 9 estimated candidates rest on 27 estimated products, one requirement each. 16 middle values are coin flips, and
  13 wide ranges contain 5 GPa. 3 materials rest on one estimated product.
- In 6 of the 9, the row's median is below 5 GPa.
- Of the 94 under "Insufficient evidence", 52 have at least one product that fails, and in 45 of them every measured
  value is below 5 GPa. In 44, every unresolved product's own estimate lies wholly below 5 GPa.

## The materials we checked

The reviewer judged every material that looked questionable, plus two "Insufficient evidence" materials per preset drawn
at random, and re-ran every product's answer with its estimate and its own value beside it. "Right by the rule" means
the tool followed its own rules. "Misleading" means a reader is led to a wrong conclusion all the same.

### Lightweight structure (at most 1,250 kg/m³, at least 2.5 GPa)

| Material | Where the tool put it | Right? | Why, in one line |
|---|---|---|---|
| PLA Silk | Estimated candidate | Misleading | 9 products estimated just over 2.5 GPa, while all 11 measured values fail |
| ABS | Estimated candidate | Wrong | A resin sheet's flexural modulus, read as tensile, lifts one product over the limit |
| CPE-CF | Estimated candidate | Wrong | Fillamentum's own 2.2 GPa is pulled up to 2.53 GPa by a stiffer sibling |
| PA6-GF | Estimated candidate | Wrong | Predicted stiffer printed than its own moulded bar, on two coin flips at once |
| PETG-CF | Estimated candidate | Wrong | Every passing density is no higher than plain PETG's, and two are below it |
| TPU 85A class | Insufficient evidence | Wrong | Estimated at 0.0016 to 0.67 GPa against 2.5, but not allowed to be hidden |
| TPU-CF (random) | Insufficient evidence | Right by the rule | One product's 2.2 GPa makes its estimate straddle the limit |
| PA6/66-CF (random) | Insufficient evidence | Right by the rule, misleading | Meets both numbers and waits only on a chamber temperature |

**PLA Silk is offered on estimates that sit on the limit.** 9 of its 33 products are estimated candidates, with middle
values of 2.50 to 2.68 GPa and wide ranges of 1.7 to 3.9 GPa. FormFutura Silk Gloss PLA sits at exactly 2.50 GPa. The
estimates rest on values with no stated direction (2.58 to 2.76 GPa) and on SUNLU's printed XY flexural modulus (2.6 to
2.75 GPa). All 11 values measured the way the requirement asks (9 as printed, 2 after annealing), 1.15 to 2.40 GPa,
fail.

**ABS is offered on a misread resin sheet.** One of its 55 products carries it. Fabru's purefil ABS sheet is a resin
sheet: it prints melt flow rate and ISO 294-4 mould shrinkage. It gives "Tensile modulus (ASTM D790) 2700 MPa", and ASTM
D790 is a flexural test. The tool reads it as a tensile value with no direction, which gives a middle estimate of 2.59
GPa. All 13 measured products, 1.6 to 2.38 GPa, fail, and the row shows 2.2 GPa (1.77 to 2.38).

**CPE-CF is lifted by a sibling.** Fillamentum CPE CF112's own sheet prints 2.2 GPa (ISO 527), with no direction. Its
estimate of 2.53 GPa is pulled up by colorFabb XT-CF20's 5.15 GPa, a grade with 20 % carbon fibre (F-M2).

**PA6-GF is predicted stiffer than its own moulded bar.** Extrudr DURAPRO PA6 GF's resin sheet gives 2.4 GPa on a
moulded bar and 1.21 g/cm³. The tool predicts the printed part at 2.76 GPa and 1,220 kg/m³. Both are coin flips, and
the rule takes both as met (F-M1, F-M2).

**PETG-CF rests on densities that are too low.** Neat PETG is 1,220 to 1,300 kg/m³, and carbon fibre can only raise
it. So every PETG-CF that meets 1,250 kg/m³ publishes a density no higher than plain PETG's, which is suspect in itself.
Two sit below neat PETG's lowest value: FormFutura CarbonFil at 1,190, from a superseded sheet, and Recreus PET-G CF at
1,100 (F-M6). CarbonFil's 9.495 GPa,
with no direction, becomes an estimate of 7.12 GPa (5.73 to 8.85).

**TPU 85A class cannot be hidden.** Its 16 silent products are estimated at 0.0016 to 0.67 GPa (wide range), and two
measured ones publish 0.0068 and 0.025 GPa. No product estimate may hide a material (F-M5).

**The two random draws.** In TPU-CF, Spectrum S-Flex Carbon's sheet prints 2.2 GPa, a value the owner accepted (ruling
R042). Its estimate, 1.08 to 2.94 GPa, therefore straddles the limit, and the other two products are estimated at 0.02
to 0.31 GPa. PA6/66-CF has one product, eSUN ePA CF. Its density of 1,240 passes, and its modulus estimate of 3.97 to
7.1 GPa is wholly above 2.5. It waits only on a chamber temperature the sheet does not publish, in the same collapsed
list as TPUs at 0.03 GPa.

### High-stiffness fixture (at least 5 GPa)

| Material | Where the tool put it | Right? | Why, in one line |
|---|---|---|---|
| PLA-CF | Estimated candidate | Wrong | All six printed values fail, and the four candidates rest on weaker evidence |
| PA12-CF | Estimated candidate | Misleading | One product, on flexural values, while the row's median is 3.3 GPa |
| PA6-CF | Estimated candidate | Right | Stiff flexural and annealed values make 5 GPa worth verifying |
| PET-CF | Estimated candidate | Wrong (too low) | BASF's printed 6.18 GPa is set aside as "conditioned", though tested at normal lab climate |
| PA612 | Hidden as unlikely | Right, but inconsistent | No product to buy, and the only material hidden in this preset |
| TPU 85A class | Insufficient evidence | Wrong | Estimated at 0.0016 to 0.67 GPa against 5 |
| PCTG-GF (random) | Insufficient evidence | Right | Its estimates span 5 GPa, so it is genuinely open |
| PLA-NF (random) | Insufficient evidence | Right by the rule, misleading | Every estimate is wholly below 5 GPa, yet it is kept |

**PLA-CF is offered against six printed failures.** Six printed values, 1.1 to 4.95 GPa, all fail. Four products are
estimated candidates, each on weaker evidence:

- Spectrum THE FILAMENT PLA CF publishes nothing, and its estimate from its siblings (5.05 GPa) sits above every printed
  value.
- Spectrum PLA Carbon's 12.5 GPa and Extrudr PLA BASIC CF's 5.6 GPa state no direction.
- iSANMATE PLA CF's resin sheet (ISO 3167 moulded bars, 25 GPa, 0.6 % elongation) is predicted as a 15.1 GPa printed
  part.

**PA12-CF rests on one product's flexural values.** One of its 15 products carries it: SUNLU PA12-CF's printed XY
flexural moduli of 5.8 and 6.0 GPa give a middle estimate of 5.47 GPa (wide range 3.87 to 7.72). The row shows a median
of 3.3 GPa, and three of the four values behind it are annealed. A measured product is passed over: 3DXTECH CarbonX CF
PA12 prints 8 GPa as printed and waits only on a chamber "recommended" with no temperature (F-F3 in
[flexible-and-indoor.md](flexible-and-indoor.md)).

**PA6-CF is a fair candidate.** Four printed values, 3.8 to 4.7 GPa, fail. But SUNLU prints a 9.66 GPa XY flexural
modulus, and Polymaker's CF20 8.6 GPa after annealing. A dry PA6-CF at 5 GPa is worth verifying.

**PET-CF should meet the requirement.** BASF Ultrafuse PET CF15 prints 6,178 MPa in XY on printed bars "conditioned in
standard climate (23 °C, 50 % RH 72 h)". For PET that is the test climate, not a moisture state. The page shows "No
qualifying measurement. Estimated 6.17 to 6.18 GPa". Counted as dry, it would make PET-CF meet the requirement (F-M7).

**PA612 is hidden, though nothing about it can be bought.** It has no product at all, only DuPont's resin reference at
2.4 GPa moulded. Its material estimate, 0.92 to 4.51 GPa, hides it. It is the only material hidden in the preset, while
44 materials whose every open product is estimated below 5 GPa stay listed.

**TPU 85A class** is estimated at 0.0016 to 0.67 GPa against 5 GPa, as in Lightweight structure, and stays listed.

**The two random draws.** In PCTG-GF, the silent products are estimated from their siblings at 1.36 to 8.05 GPa, with
poor precision, and Fiberlogy's 3.4 GPa with no direction becomes 2.2 to 5.12 GPa. That is open, and rightly not a
candidate. In PLA-NF, Nanovia PLA Flax fails at 2.83 GPa. Extrudr FLAX's 3.8 GPa is from a moulded bar, by Extrudr's
information sheet (OPEN-PROBLEMS §15), and its estimate of 2.39 to 4.49 GPa is wholly below 5 GPa. The material is kept
all the same.

## What goes wrong, and why

Seven root causes explain the doubtful answers. Four are in how estimates promote a material (F-M1 to F-M4), one in
what may hide a material (F-M5), and two in the data (F-M6, F-M7). The tags are the reviewer's finding IDs, which the
review's README cites.

### Estimated candidates are chosen on the middle value alone, and half are coin flips (F-M1)

**What happens.** A product becomes an estimated candidate when the middle value of its estimate meets the limit. The
wide range decides only whether a material may be hidden. The group heading says "Predicted centres meet the missing
numerical requirements", which a reader takes as "likely meets".

**Example.** FormFutura Silk Gloss PLA is a candidate on a middle value of exactly 2.50 GPa. Extrudr DURAPRO PA6 GF needs
two coin flips at once: density 1,220 against 1,250 kg/m³ (wide range 1,150 to 1,300), and modulus 2.76 against 2.5 GPa
(wide range 1.82 to 4.17). The chance that both hold is near one half at best, and the rule takes each as met.

**How many.** Across the six presets, 43 materials are estimated candidates, on 104 products and 105 estimated
requirements. 53 of the 105 middle values are coin flips. 47 wide ranges and 37 shown ranges (80 %) contain the limit.
Lightweight structure carries 30 of its 40.

**How serious.** Misleading.

**Direction.** Test the wide or the shown range, not the middle value, and count requirements jointly (the review's
change C19).

### A product's estimate blends its own unusable value with its material's, and the blend crosses the limit (F-M2)

**What happens.** When a product publishes a modulus with no direction or from a moulded bar, the tool cannot use it
directly. It estimates the product instead, weighting the product's own observations about 70 % and its material's
typical value the rest. That pull toward the material suits a material's typical value. The engine, though, reads the
result as this product's own expected value.

**Example.** Of the 105 estimated requirements, 75 rest on the product's own value of the same test, with no direction
or from a moulded bar. 20 rest on its related values (flexural, Z, wet), 10 on its siblings alone, and none on the
family. Over the 316 modulus estimates built on such an own value (313 of them for products), the estimate is 0.99
times that value at the median, so there is no net drift. But 193 of 252 move toward their material's median, and 27
move by more than 20 % (CarbonFil, 9.495 to 7.12 GPa). The pull crosses the limit:

- In Lightweight structure, 9 products whose own value fails 2.5 GPa get a middle value that meets it. Five of them are
  estimated candidates, and two decide their material: Fillamentum CPE CF112 (2.2 to 2.53 GPa) and Extrudr DURAPRO PA6
  GF (moulded 2.4 to printed 2.76).
- 12 of 54 products with a moulded modulus are predicted stiffer printed than moulded. Extrudr DURAPRO PA6 CF has a
  moulded 1.1 GPa and 6 GPa on another Extrudr sheet. Its estimate, 5.28 GPa, makes it an estimated candidate at 5 GPa.

**How many.** 9 crossings in Lightweight structure (2 materials decided), 1 in High-stiffness fixture and 6 in Outdoor
structural part. 12 of 54 products are predicted above their own moulded bar.

**How serious.** Wrong answer for CPE-CF and PA6-GF.

**Direction.** Let a product's own published value bound or anchor its estimate, instead of being averaged away (change
C28).

### Values with no stated direction are taken at face value, so stiffness estimates run high (F-M3)

**What happens.** The model converts a tensile modulus with no stated direction at face value. A moulded bar's value is
lowered to about 85 %, since "a printed XY bar reaches roughly 85% of a moulded bar's stiffness". The build may lower the
no-direction offset only from pairs within one product, 24 of them, and it stayed at zero. Yet across products, a sheet
silent on direction is mostly a moulded or resin sheet.

**Example.** Across the 62 materials whose products publish both kinds, the no-direction median sits above the median of
values measured the way the requirement asks in 42. The gap is 21 % at the median (16 % for strength, 25 % for
elongation). That gap is the premise of decision D84: such values "read like moulded bars and flatter a printed part".
The estimates show the same lean:

- Silent products' estimates from their siblings sit above their material's measured median in 49 of 65 (median ratio
  1.16), and above every measured value in 16. Density (0.99) and strength (1.01) show no such drift.
- PLA-CF's silent Spectrum product is estimated at 5.05 GPa, above all six printed values.
- Resin sheets read as tensile values add to it. purefil's "Tensile modulus (ASTM D790)" carries ABS into the estimated
  group (makers' bar types: OPEN-PROBLEMS §15).

**How many.** 313 of 691 product modulus estimates rest on the product's own no-direction or moulded value, and so do
75 of the 105 estimated requirements. Elongation estimates sit at 1.33 times their own value (359 of 432 move by more
than 20 %), a pointer for the Flexible component review.

**How serious.** Wrong answer: PLA-CF at 5 GPa, ABS at 2.5 GPa.

**Direction.** Give a no-direction tensile value a moulded-like discount learned across products. This needs a decision
and a back-test, since the estimate stage is frozen (change C27).

### One product makes the material a candidate, and the row contradicts it (F-M4)

**What happens.** The material takes its reasons from its first estimated product. The row's values show the median and
range of all its products, and the row line counts products without naming the one that decided.

**Example.** ABS reads 2.2 GPa (1.77 to 2.38) under "Predicted centres meet the missing numerical requirements". Its
line says "13 products fail at least one requirement; 42 remain unresolved". The one product that put it there is not
named.

**How many.** Of the 43 estimated materials across the six presets:

- 24 rest on a single estimated product (22 of them in materials with two or more products), 16 of those on a coin flip.
- In 20, the row's median fails the requirement the group heading says is met.
- In 13, every measured value fails it: PLA Silk, Marble, Sparkle, Galaxy, Glow, ABS and PVB in Lightweight structure,
  PLA-CF in High-stiffness fixture, and PETG, PC, PCTG, CPE and PVB in Flexible component.

**How serious.** Misleading, and a wrong answer where F-M2 or F-M3 also holds (ABS, CPE-CF, PA6-GF).

**Direction.** Name the deciding product on the row and show its estimate, not the material median (change C05).

### "Insufficient evidence" is mostly materials the tool's own records place below the limit (F-M5)

**What happens.** No product estimate may hide a material, because none has proof from back-testing that it is safe for
exclusion. For modulus there are 25 calibration cases for products' own values and none for siblings, against 194
needed. Material estimates still hide, but they are read only for a material with no product. A product whose only
measured modulus is annealed gets no as-printed estimate at all, although decision D137 promises one for "every
catalogued product".

**Example.** In High-stiffness fixture, 44 of the 92 "Insufficient evidence" materials with products have every
unresolved product's wide range wholly below 5 GPa. They include six TPU materials (wide ranges topping out at 0.46 to
1.42 GPa), PP, PEBA, OBC, PETG-GF, PA12 and PCTG. ASA-GF, named in OPEN-PROBLEMS §35, is among them, its iSANMATE
product now topping out at 4.88 GPa. Counting products whose only modulus is an annealed value that fails, it is 56.
Bambu Lab PLA Silk+ is one: 2.13 GPa "annealed and dried at 55 °C for 8 h", below PLA's glass transition.

**How many.**

- The known pattern of OPEN-PROBLEMS §35, a measured product that fails with every measured value failing, holds for 45
  of 94 in High-stiffness fixture (51 of 86 on 2026-10-07) and 22 of 64 in Lightweight structure.
- Materials whose every unresolved product is estimated wholly to fail: 13 in Outdoor, 0 in Indoor, 14 of 61 with
  products in Lightweight, 0 in Warm, 44 in High-stiffness and 38 in Flexible, 109 in all. With the annealed-only
  failures, 148.
- In each modulus preset, 46 products in 29 materials are unresolved on an annealed-only modulus and have no estimate.
  41 of them are below 5 GPa.

**How serious.** Misleading: these materials are collapsed but counted, so High-stiffness fixture counts 94 open
materials against 14 shown as candidates.

**Direction.** Make product exclusion consistent with material screening, by proving it safe or relaxing the bar, and
estimate annealed-only products. The review keeps the bar and lists these materials apart instead (changes C18 and
C29).

### Carbon- and glass-filled densities below their base polymer decide the lightweight question (F-M6)

**What happens.** Some filled products publish a density below their neat polymer's lowest value, which fibre can only
raise. The density check in OPEN-PROBLEMS §17 covers unfilled products only, so nothing catches them.

**Example.** Two PETG-CF products sit below neat PETG's 1,220 to 1,300 kg/m³: FormFutura CarbonFil at 1.19 g/cc and
Recreus PET-G CF at 1.1 g/cm³. CarbonFil's records come from its 2021 sheet: 20 % fibre, 1.19, 9,495 MPa and 92 MPa. A
revision updated on 2024-08-23 is cached under the same source and is not registered. It prints 15 % fibre, a specific
gravity of 1.32, a flexural modulus of 4,250 MPa and no tensile modulus. OPEN-PROBLEMS §34.3 names seven such later
copies, but not this one.

These two are two of the three products that make PETG-CF an estimated candidate. The third, iSANMATE PETG CF, publishes
exactly 1,250 kg/m³ and is estimated at 2.90 GPa. On its own it would keep PETG-CF an estimated candidate, so correcting
the two densities does not by itself move the group.

**How many.** 11 carbon- or glass-filled products in 8 materials. It decides PETG-CF's group in Lightweight structure,
together with iSANMATE's density at the limit.

**How serious.** Wrong answer, as the reviewer judged it, since every PETG-CF that passes does so on a density no higher
than neat PETG's.

**Direction.** Extend the §17 density check to filled products, and register CarbonFil's later revision as a new source
(change C14).

### A standard test climate counts as a damp state for a polymer water barely changes (F-M7)

**What happens.** In a dry question, the engine sets aside a value measured after conditioning, by a rule set per
property ("Changes with moisture", decision D99). The estimate model decides per polymer instead. It treats PET, PLA and
ASA as taking up no water, so it pools the same value as dry, at full weight.

**Example.** BASF Ultrafuse PET CF15 (6,178 MPa) and Raise3D Industrial PET CF (5,731 MPa) read "No qualifying
measurement" for a dry question. PET-CF is therefore an estimated candidate, not supported. BASF's estimate is its own
value with a width of 0.01 GPa. Raise3D Hyper Speed PET CF publishes 5.0 GPa the same way, and its estimate of 4.91 GPa
puts it under "Insufficient evidence".

**How many.** 6 products for modulus. 13 modulus estimates are narrower than 2 %, as BASF's is.

**How serious.** Misleading.

**Direction.** Let the moisture state follow the polymer's water uptake (change C23).

## Words used in this file

- **Estimate of a product**: the model's value for a product that publishes nothing measured the way the requirement
  asks. **Material estimate**: the model's value for a material none of whose products publishes one.
- **Middle value**: the estimate's 50/50 guess (the page's "centre"). **Wide range (95 %)** and **range shown on the
  page (80 %)**: the estimate's two ranges (the page's "plausible" and "likely").
- **Coin flip**: a middle value closer to the limit than half the width of its wide range.
- **Measured the way the requirement asks** (the tool's "comparable" value): a value on a printed or unstated bar, with
  its direction (XY) stated. A value with **no stated direction** is published, but not measured that way.
- **Estimated candidate**: listed as "Estimated candidates to verify". **Insufficient evidence**: every other
  unresolved material, in a collapsed list. **Hidden as unlikely**: the page's "screened", behind the SCREENED chip.
- **Proof from back-testing**: the check that an estimate is safe to use for exclusion (the page's "certified").

## Evidence and where to check

### How the figures were produced

The presets were run as [census.mjs](../census.mjs) runs them
([lightweight-structure.json](../scenarios/lightweight-structure.json),
[high-stiffness-fixture.json](../scenarios/high-stiffness-fixture.json)): Include uncertain, estimates on, comparable
values, as printed, dry. Every product's answer was re-run through `runSelection` with each grade's prediction
(`grades[].estimate`) and own value (`grades[].states[0].values`) attached. Decisions were traced with
`npm run trace -- --scenario <file> --product <GradeID> --requirement tensileModulusXY`. Values were read on the cached
sheet text (`documents_fts`) where it exists. Random picks: the preset's "Insufficient evidence" material IDs sorted,
mulberry32 seeded 20261018, first two distinct draws (Lightweight M129, M156; High-stiffness M110, M152). "Coin flip" is
the brief's definition: the centre lies within half the plausible (95 %) range's width of the limit.

### Lightweight structure, material by material

- PLA Silk (M008): V002898, V009595, V008649, V004347, V008628 (the estimates' anchors); V001915, V005347. FormFutura
  Silk Gloss PLA is G008-28. The 11 comparable values are 9 as printed and 2 annealed (G009-01 2.13, G010-01 1.83 GPa).
- ABS (M027): V005563 (R-FABRU-PUREFIL-3-…-ABS-purefil p. 1), on G027-17; V003191, V008054.
- CPE-CF (M090): V001680 (S-CPECF p. 1) on G090-01; V010336 (colorFabb XT-CF20).
- PA6-GF (M051): V004302, V004299 (R-EXTRUDR-durapro-pa6-gf-TDS-en), on G051-05.
- PETG-CF (M024): V009831 (CarbonFil, G024-21), V009835, V015320 (Recreus, G024-24), V010607. iSANMATE PETG CF is
  G024-22 (density 1,250, centre 2.90 GPa).
- TPU 85A class (M159): V000826, V005837.
- TPU-CF (M129, random): V004078, and its row in `data/review/accepted-findings.csv` (owner ruling R042).
- PA6/66-CF (M156, random): V010359, V010363, V011525.

### High-stiffness fixture, material by material

- PLA-CF (M018): V003304 (CarbonX CF-PLA 4.95 GPa), V005465 (Flashforge 1.1 GPa), V003097 (Spectrum PLA Carbon, G018-03),
  V012068 (Extrudr PLA BASIC CF, G018-07), V009912 (I-PLA-PLA-CF-TDS p. 1, iSANMATE, G018-18). The silent product is
  G018-02.
- PA12-CF (M053): V004500, V008194, on G053-05. The passed-over measured product: G053-01, V000966 (8 GPa, XY, ISO 527).
  The material summary's four comparable values: G053-01 8 GPa, and G053-02, G053-08, G053-09 at 3.30 to 3.32 GPa
  annealed.
- PA6-CF (M050): V004526, V008616, V005128, V011373.
- PET-CF (M067): V007692 (BASF, G067-06), V011546 (Raise3D Industrial, G067-05).
- PA612 (M058): V002044 (DuPont resin, G058-R1).
- TPU 85A class (M159): V000826, V005837.
- PCTG-GF (M110, random): V010861.
- PLA-NF (M152, random): V010286, V012037.

### F-M1: the centre test

- Engine: `estimatedCandidate` compares the centre as a point
  ([constraints.js](../../../../app/js/engine/constraints.js) lines 615 to 618). The plausible range decides only
  screening (line 159). The heading is at [table.js](../../../../app/js/ui/table.js) line 559.
- Extrudr DURAPRO PA6 GF is G051-05. Counts: one-liner A.

### F-M2: the blend

- A grade's prediction is the model's estimate at the grade's row, with its own observations weighted about 0.7
  (`ownShare`) and the material's latent the rest ([grades.js](../../../../build/src/estimate/grades.js) lines 114 to
  131).
- Crossings: G090-01 (CPE-CF, 2.2 to 2.53), G051-05 (PA6-GF, 2.4 to 2.76). Above the moulded bar: G050-05 (Extrudr
  DURAPRO PA6 CF, centre 5.28).
- Counts: one-liners D (what the estimates rest on), E (crossings per preset) and F (centre against anchor).

### F-M3: no stated direction at par

- "tensile unk" converts at offset 0, "Direction not stated; may be a moulded bar"
  ([estimate-model.json](../../../../build/mappings/estimate-model.json) lines 190 to 194). "tensile moulded" takes
  −0.15. The build refines an unknown-direction offset downward only, from 24 within-product pairs
  ([conversions.js](../../../../build/src/estimate/conversions.js) lines 51 to 52).
- PLA-CF's silent product: G018-02. Counts: one-liners D and F, and the medians noted under the one-liners.

### F-M4: one product carries the material

- Engine: the material takes the first estimated product's reasons
  ([constraints.js](../../../../app/js/engine/constraints.js) line 692; D100, D137). The row line counts products only
  ([table.js](../../../../app/js/ui/table.js) lines 251 to 253).
- Counts: one-liners A and C.

### F-M5: what may hide a material

- Product predictions screen only with a certified class, and none is
  ([product-screening.js](../../../../build/src/estimate/product-screening.js) lines 146 to 156, read at
  [constraints.js](../../../../app/js/engine/constraints.js) line 159). D59's material estimates keep screening.
- A grade whose headline is an annealed comparable value gets no prediction for the as-printed state
  ([grades.js](../../../../build/src/estimate/grades.js) line 140).
- Bambu Lab PLA Silk+ is G009-01. Counts: one-liner B. The 45 of 94 here and the 47 of 94 in
  [hdt-presets.md](hdt-presets.md) (F-H4) count the same pattern by two queries.

### F-M6: densities below the matrix

- V009831 (CarbonFil 1.19), V015320 (Recreus 1.1). Neat densities from `polymers.csv`. The later CarbonFil sheet is
  document 7b525961687e2d89 under source S-PET-TDS-CarbonFil.
- Counts: one-liner G.

### F-M7: test climate as a state

- V007692 (BASF), V011546 (Raise3D Industrial). Raise3D Hyper Speed PET CF is G067-07. The state rule is per headline
  ("Changes with moisture", `headline_definitions.csv`). Water uptake is "Not applicable" for PET, PLA and ASA in
  `polymers.csv`.
- Counts: one-liner H.

### The reviewer's root-cause table

| ID | Layer | Reach | Severity |
|---|---|---|---|
| F-M1 | Engine rule | 53 of 105 estimated requirements are coin flips; 43 entries | Misleading |
| F-M2 | Estimate model | 9 crossings in Lightweight (2 materials decided); 12 of 54 predicted above their own moulded bar | Wrong answer |
| F-M3 | Estimate model | 313 of 691 modulus predictions; silent predictions 1.16 × the comparable median | Wrong answer |
| F-M4 | Engine roll-up, presentation | 24 of 43 single-product; 20 median fails; 13 every comparable value fails | Misleading |
| F-M5 | Engine rule, estimate model | 109 entries wholly predicted to fail (44 in High-stiffness); 46 annealed-only products per modulus preset | Misleading |
| F-M6 | Source data, lint | 11 products, 8 materials; PETG-CF in Lightweight | Wrong answer |
| F-M7 | Engine (D99) against estimate model | 6 products; PET-CF in High-stiffness | Misleading |

### Reproduce

`F` is the file `node docs/audits/2026-10-18-screening-review/census.mjs --full <F>` writes. Run from the repository
root against the built `dist/db.json`.

```bash
# A: estimated requirements, coin flips, single-product materials (105, 53, 47; 24, 16)
node -e 'const f=require(process.argv[1]);let n=0,c=0,s=0,m1=0,m1c=0,mats=0;for(const t of Object.values(f))for(const m of Object.values(t)){if(m.group!=="estimated")continue;mats++;const ps=m.products.filter(p=>p.group==="estimated");let near=false;for(const p of ps)for(const r of p.results)if(r.estimated&&r.prediction){const v=+r.criterion.split(" ").pop(),{lo,hi}=r.prediction.plausible;n++;if(Math.abs(r.prediction.centre-v)<(hi-lo)/2){c++;near=true}if(lo<=v&&v<=hi)s++}if(ps.length===1){m1++;if(near)m1c++}}console.log({mats,n,c,s,m1,m1c})' $F
# B: insufficient materials whose every unresolved product is predicted wholly to fail, per preset
node -e 'const f=require(process.argv[1]);const o={};for(const [tn,t] of Object.entries(f)){let n=0,a=0;for(const m of Object.values(t)){if(m.group!=="insufficient"||!m.products.length)continue;n++;if(m.products.filter(p=>p.verdict==="UNKNOWN").every(p=>p.results.some(r=>{if(!r.prediction)return false;const [,op,v]=r.criterion.split(" ");const {lo,hi}=r.prediction.plausible;return op.startsWith(">")?hi<+v:lo>+v})))a++}o[tn]=a+"/"+n}console.log(o)' $F
# C: estimated materials whose row contradicts the requirement (13 every comparable value fails; 20 median fails)
node -e 'const f=require(process.argv[1]),db=require("./dist/db.json"),M=new Map(db.materials.map(m=>[m.id,m]));let all=0,med=0;for(const t of Object.values(f))for(const [id,m] of Object.entries(t)){if(m.group!=="estimated")continue;let a=false,d=false;for(const p of m.products.filter(p=>p.group==="estimated"))for(const r of p.results.filter(r=>r.estimated)){const [k,op,v]=r.criterion.split(" ");const s=M.get(id).summary?.[k];if(!s?.n)continue;const ok=x=>op.startsWith(">")?x>=+v:x<=+v;if(!ok(s.max)&&!ok(s.min))a=true;if(!ok(s.median))d=true}if(a)all++;if(d)med++}console.log({all,med})' $F
# D: what the estimated requirements rest on (75 own not comparable, 20 own related, 10 siblings)
node -e 'const f=require(process.argv[1]),db=require("./dist/db.json"),G=new Map(db.grades.map(g=>[g.id,g]));const c={};for(const t of Object.values(f))for(const m of Object.values(t)){if(m.group!=="estimated")continue;for(const p of m.products.filter(p=>p.group==="estimated"))for(const r of p.results.filter(r=>r.estimated)){const k=r.criterion.split(" ")[0],e=G.get(p.gradeId).estimate?.[k];const a=!e?"material":e.strength!=="this-grade"?e.strength:(e.evidence||[]).some(x=>/ (unk|moulded)$/.test(x.kind)&&!/^(flexural|hardness)/.test(x.kind))?"own not comparable":"own related";c[a]=(c[a]??0)+1}}console.log(c)' $F
# E: own no-direction or moulded modulus fails the limit, centre meets it, per preset
node -e 'const f=require(process.argv[1]),db=require("./dist/db.json"),G=new Map(db.grades.map(g=>[g.id,g]));for(const [tn,t] of Object.entries(f)){const up=[];for(const m of Object.values(t))for(const p of m.products)for(const r of p.results.filter(r=>r.estimated&&r.prediction)){const [k,,v]=r.criterion.split(" ");if(k!=="tensileModulusXY")continue;const ev=(G.get(p.gradeId).estimate[k].evidence||[]).filter(x=>/^tensile (unk|moulded)$/.test(x.kind));if(!ev.length)continue;const a=Math.exp(ev.reduce((s,x)=>s+Math.log(x.converted),0)/ev.length);if(a<+v&&r.prediction.centre>=+v)up.push(p.gradeId+"("+p.group+")")}if(up.length)console.log(tn,up.length,up.join(" "))}' $F
# F: centre against its own no-direction or moulded anchor (316; median 0.99; 27 beyond 20 %; 193 of 252 toward the material)
node -e 'const db=require("./dist/db.json");const r=[];let tow=0,n=0;for(const g of db.grades){const e=g.estimate?.tensileModulusXY;if(!e||g.retired)continue;const ev=(e.evidence||[]).filter(x=>/^tensile (unk|moulded)$/.test(x.kind));if(!ev.length)continue;const a=Math.exp(ev.reduce((s,x)=>s+Math.log(x.converted),0)/ev.length);r.push(e.centre/a);const md=db.materials.find(m=>m.id===g.materialId).summary?.tensileModulusXY?.median;if(md){n++;if((e.centre-a)*(md-a)>0)tow++}}r.sort((x,y)=>x-y);console.log(r.length,r[r.length>>1],r.filter(x=>Math.abs(Math.log(x))>Math.log(1.2)).length,tow+"/"+n)'
# G: fibre- or glass-filled products lighter than their neat polymer (11)
npm run sql --silent -- "select p.gradeid, p.product, m.materialid, p.value, y.neat_density_min_kg_m3 from products_compiled p join materials m on m.materialid = p.materialid join polymers y on y.polymerid = m.estimate_identity where p.headline_key = 'density' and (m.modifier_filler like '%arbon%' or m.modifier_filler like '%lass%') and coalesce(p.variant, '') = '' and p.gradeid not like '%-R%' and p.value < y.neat_density_min_kg_m3"
# H: modulus predictions narrower than 2 % (13)
node -e 'const db=require("./dist/db.json");console.log(db.grades.filter(g=>!g.retired&&g.estimate?.tensileModulusXY?.plausible&&g.estimate.tensileModulusXY.plausible.hi/g.estimate.tensileModulusXY.plausible.lo<1.02).map(g=>g.id).join(" "))'
```

The as-published against comparable medians (62 materials, 42 higher, ratio 1.21) and the silent-product drift (49 of
65, ratio 1.16) come from the products' first-state values and `materials[].summary` in `dist/db.json`, grouped by
material. The material summary counts annealed values too, so the drift against as-printed values is if anything
larger.

The PETG-CF products that make it an estimated candidate in Lightweight structure (G024-21, G024-22, G024-24) are listed
under M024 in `$F`.
