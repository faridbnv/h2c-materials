# What a materials scientist would build: pass, fail and "can't tell"

> **Historical record** (2026-10-18): an independent opinion written for the screening review on release 9ca94d31fc5d, from the data alone, without seeing the tool's current rules.

## In short

This is how I would have the tool decide, written from the raw records and the data sheets' own text. Judge each product,
never a "typical" material: the team buys a product, and products of one material differ by a factor of two to four. A
product passes or fails on its own value measured the way the requirement asks, on a hard physical bound, or on physics
that covers its whole class. Everything else is "can't tell", sorted by what would settle it. Of the ten cases, four
pass, four fail and two are "can't tell" (PLA for the outdoor part, PLA-CF at 5 GPa). The biggest risks I found are
values from moulded or annealed bars read as printed ones, makers' test labs that differ more than their materials, and
presets whose single number does not describe the job (elongation for a gasket).

## The ten cases at a glance

Each case is judged as printed and dry, on the H2C. The detail and the numbers are in "The ten cases in detail" below.

| Case | My answer | What decides it | Confidence |
|---|---|---|---|
| C-A ASA-GF, stiffness ≥ 5 GPa | Fail | Best printed value 2.76 GPa. 10-16 % glass cannot lift ASA near 5 GPa | High |
| C-B PLA, outdoor set | Can't tell: meets it only after annealing | PLA-HP's 135 °C is from a moulded or annealed bar. Printed PLA softens near 60 °C | Medium-high |
| C-C PETG, elongation ≥ 100 % | Fail | 22 printed bars, best 91 %. Every value above 100 % is from an unnamed bar or a film | High |
| C-D PEBA, elongation and printable | Pass | Four products 520-1,110 % on printed bars. All print windows inside the H2C | High |
| C-E TPU 95A, stiffness ≥ 5 GPa | Fail | Twelve products at 0.006-0.065 GPa. A rubber cannot be that stiff | Certain |
| C-F PLA-CF, stiffness ≥ 5 GPa | Can't tell: on the line | 3DXTECH CarbonX CF-PLA 4.95 GPa. Higher claims are doubtful | Medium |
| C-G PA6-CF, outdoor set | Pass dry. Recheck for humid air | Flashforge PA6CF10: 4.3 GPa, 200 °C, 1,200 kg/m³ | High dry, medium wet |
| C-H LCP, printable | Pass, at the edge | Bed 120 °C is the bottom of the maker's 120-150 °C. LCP barely shrinks | Medium |
| C-I PA612, stiffness ≥ 5 GPa | Fail, and no product to buy | Only a moulded resin reference exists, 2.4 GPa dry | High |
| C-J PET-CF, stiffness ≥ 5 GPa | Pass | BASF Ultrafuse PET CF15: 6.18 GPa printed, not annealed. Humid air barely affects PET | High |

## How should one product be judged against one requirement?

Turn every piece of evidence into a range for the quantity asked, then compare the range with the requirement.

The quantity asked is precise: for example, the tensile stiffness of a printed bar pulled in the print plane (XY), as
printed and dry. Each published number gives a range for that quantity. A comparable value (a printed bar, XY, not
annealed, dry or unstated moisture) gives a narrow range: the value plus or minus its test scatter. Other evidence gives
one-sided or wide ranges, by conversions measured on this database (next section). Several ranges for one product are
combined by taking their overlap. If two comparable values disagree across the line, the product is "can't tell".

The verdict follows from the range:

- **Pass:** the whole range is at or above the requirement. A comparable value that meets it passes even when close,
  because makers publish typical values and the engineer sets the safety margin. It is tagged "thin margin" within 10 %.
- **Fail:** the whole range is below the requirement, by more than the test scatter: 10 % for stiffness and strength,
  5 °C for heat deflection, 20 % for elongation, 2 % for density.
- **Can't tell:** anything else. A comparable value just under the line is "on the line", not a fail. This keeps a
  good option visible at the cost of one check.

For a set of requirements, a product passes when it passes all of them and fails when it fails any one. Otherwise it is
"can't tell", and the number of open requirements is shown ("1 of 3 open").

## How should products' answers become the material's answer?

A material answer is meaningful only as "does at least one product I can buy meet this?", shown with counts.

- **Pass:** at least one buyable product passes. The line says how many: "PA6-CF: 4 of 14 products meet all three".
- **Fail:** every buyable product fails, or physics rules out the whole class (then products with no data fail too).
- **Can't tell:** no product passes and at least one is open. The material takes the group of its best open product.

A material median should never decide. The products of one material range too widely, and much of the range is the
makers' test labs. PLA's printed XY stiffness runs from 0.95 to 4.24 GPa across 33 products. Flashforge's five PLAs
average 1.29 GPa and colorFabb's six average 3.30 GPa, for the same polymer. PETG-CF runs from 2.46 GPa (Bambu Lab,
annealed) to 5.23 GPa (3DXTECH) on printed bars, and three makers claim 9-9.5 GPa on unnamed bars. A "typical PETG-CF" answers
nothing the team can buy.

The two errors are not equal. A product wrongly ruled out is an option nobody sees again. A product wrongly kept costs a
look at the sheet or a test print. So exclusion needs strong evidence, while "can't tell" is cheap if it is sorted well.
The data are uneven in the same direction: one comparable value outweighs ten unnamed ones. Many products of a material
do not make any one product better documented.

## What may evidence that is not exactly what was asked decide?

Each kind of indirect evidence was checked against products that publish both values on one sheet. Strong one-sided
relations may decide in one direction. Loose ones may only inform.

| Evidence | What it bounds | Measured on this database | May decide |
|---|---|---|---|
| Z bar (pulled across layers) | XY is at least Z | Z/XY stiffness 0.22-1.07 over 84 pairs | Pass |
| Annealed bar | As printed is at most annealed | Stiffness ×1.01-1.32 (17 of 17 pairs), HDT ×1.11-2.27 (11 of 11) | Fail. Pass on stiffness only if annealed ÷ 1.32 meets it |
| HDT at 1.8 MPa | HDT at 0.45 MPa is at least it | 268 pairs, one lower by 1 °C | Pass |
| Glass transition (Tg) | HDT at 0.45 MPa of a glassy polymer is at most Tg + 15 °C | 118 pairs outside PLA. The one above is a PC-ABS that gives only its ABS phase's Tg | Fail |
| Flexural stiffness | Tensile is 0.70-1.59 × flexural | Middle 95 % of 482 pairs | Only with that margin |
| Moulded bar, elongation | Printed is far lower for rigid plastics | PETG 83 → 5 %, CPE 210 → 26 %, nGen 190 → 11 % | Never pass |
| Conditioned (humid air), nylons | Dry stiffness is at least the conditioned one | Conditioned/dry 0.27-0.30 (PA6/66), 0.60-0.70 (PAHT-CF) | Pass |
| A bound ("> 500 %") | One side only | | Pass if it clears the line |

Some notes on these rows:

- **Direction.** A sheet almost never prints a Z bar alone: 210 of 214 sheets with a Z stiffness also print another
  value. So a value with no direction stated is an XY bar or a moulded bar, not a Z bar.
- **Moulded or unnamed bars.** For unfilled plastics, printed stiffness is close to moulded (0.90-0.97 in the four
  pairs found). That is too few to decide a pass. For fibre-filled filaments a printed bar can beat a moulded one,
  because the nozzle lines the fibres up. Until pairs are collected I would allow up to 1.3 times the moulded value, so
  a moulded stiffness decides a fail only below the line by that margin. For elongation a moulded value never passes a
  printed part: a printed bar breaks at the seams between roads (the extruded lines) long before a moulded bar would.
- **Moulded heat deflection** carries over to a print for polymers that crystallise as they print (nylons, PP). For
  slow crystallisers (PLA, PET) a moulded bar, cooled in a hot tool, is crystalline and a print is not. There the
  moulded value is only a ceiling.
- **Annealing** (baking a print to crystallise it) only adds stiffness and heat resistance in these data. An annealed
  value is therefore a ceiling for the as-printed part. For elongation it is the reverse: annealed bars stretched less in
  15 of 18 pairs.
- **Humid air.** For polyesters, PLA, styrenics and PC a value "conditioned" at 50 % relative humidity equals a dry one
  for stiffness. For nylons it is a floor under the dry value.
- **The 0.45 and 1.8 MPa gap** is small for glassy plastics (about 7 °C) and large for crystalline ones (43-56 °C on
  average, up to 120 °C). So a 1.8 MPa value decides little for a nylon that misses the line.
- **Vicat** (the temperature at which a loaded needle sinks in) sits above HDT at 0.45 MPa in most pairs. It is a soft
  ceiling and may only inform.

### The printer check

Pass when the printer reaches some part of every window the maker states. Flag it when it reaches only the edge. A
window is the maker's statement that any setting in it works. A test print is cheap, so the printer check should
lean towards keeping products.

Where the maker states nothing, the printer maker's guide for the type comes next, then the polymer class. 448
candidate products say nothing about the chamber at all: no temperature, no enclosure, no statement that none is
needed. More than half are PLA (139), flexible (64) and PETG (46) products, which need none.

| Polymer class | What a heated chamber does for it | When the maker is silent |
|---|---|---|
| PLA, PETG, PCTG, TPU, PEBA, PVA | Nothing useful. Heat can soften the filament before the nozzle | Pass |
| ABS, ASA, HIPS, PC-ABS, nylons, PET-CF, PPA-CF, PPS-CF, PP | Cuts warping. Makers ask 40-65 °C | Pass: the H2C reaches 65 °C |
| Unfilled PC, PC-PBT | Large flat parts want 70-100 °C | Pass for small parts. Can't tell for large ones |
| PEI, PSU, PPSU, PEEK, PEKK | Needs 90-160 °C and a nozzle above 350 °C | Fail |
| LCP | Shrinks almost nothing | Pass |

## What may an estimate do?

Physics may decide. Statistics may rank and lean, and may exclude only after back-testing proves it safe.

**Hard physics may decide, with stated margins.** These rules hold in every pair or class in the data:

- **Rubbers are soft.** A thermoplastic elastomer (TPU, TPE, PEBA) is never stiffer than about 0.5 GPa unfilled. Shore
  hardness (an indenter's depth scale) maps to stiffness: 95 Shore A is about 0.04 GPa, 85 Shore A about 0.013 GPa.
- **Unfilled plastics stop near 4.3 GPa when printed.** No unfilled rigid plastic here exceeds 4.24 GPa on a printed XY
  bar, over about 350 products. Moulded or unnamed bars reach 5.1 GPa at most. LCP is the exception (11.7 GPa), and so
  is a product whose density shows a filler the maker does not name. With the rubber rule, it settles a 5 GPa
  requirement for about 88 of the 135 candidate materials (about 75 unfilled rigid ones and 13 rubbers).
- **Glassy plastics do not stretch 100 % when printed.** Of 211 glassy (amorphous) products with a printed XY elongation,
  one reaches 100 %: nGen FLEX, a soft grade at 0.15 GPa. Among the 210 rigid ones none does, which bounds the error
  rate below 1.4 % with 95 % confidence.
- **Heat deflection of a glassy polymer stops near its Tg.** HDT at 0.45 MPa stays within Tg + 15 °C, using the higher Tg
  of a blend. PLA is the exception, because PLA can crystallise (see "What else I would tell the owner").
- **Density follows the recipe.** The rule of mixtures (the filament's volume is the sum of its ingredients' volumes)
  predicts a filled product's density within a few percent from its fibre content. Without fillers, the neat polymer's
  range bounds it: unfilled PLA cannot exceed 1,330 kg/m³, so it passes "≤ 1,500" with no number published.
- **Fibre content caps stiffness.** A product's density gives its fibre fraction. A generous short-fibre formula then
  gives the most stiffness that fraction can add. This is what rules out ASA-GF at 5 GPa (case C-A). It also flags
  claims: FormFutura CarbonFil's 9.5 GPa comes with 1,190 kg/m³, less than unfilled PETG (1,220-1,300).

**Statistical estimates may only rank and lean.** This covers estimates from sibling products, from related properties
and from a model of the polymer. They sort "can't tell" products and add a word like "likely" or "unlikely". They never
make a pass. They may exclude only when a back-test shows the rule rarely hides a qualifying product: under 2-5 %, with
95 % confidence. That needs many held-out cases. No errors in 60 cases still allows 5 %, and no errors in 150 allows 2 %.

The data are biased, and the bias has a direction. Makers publish their best numbers and choose their test conditions.
Products that publish nothing are likely the weaker ones. Estimates built from publishers therefore run high. That makes
them safe-ish for exclusion and unsafe for inclusion. The test lab is the larger bias: the factor of 2.5 between
Flashforge's and colorFabb's PLA stiffness comes from how each measures, not from the polymer.

**How to validate.** Re-measure every conversion band on same-sheet pairs at each release, as in the table above. Hide
each product's own comparable value, predict it from the rest, and count wrong exclusions. Do it product by product and
also maker by maker (leave one maker out), because the test lab is the main bias. Check that the ranges shown contain
the hidden values as often as they claim, 80 % of the time for an 80 % range.

## How should the "can't tell" materials be grouped and worded?

Group them by what settles them, cheapest first, and say on each line which product to check and how.

| Group | What it means | What the engineer does | Example |
|---|---|---|---|
| On the line | Its own comparable value is within test scatter, below | Ask for the scatter or print a test bar | PLA-CF: CarbonX 4.95 GPa vs 5.0 |
| Number not from a printed part | A moulded, unnamed or annealed bar meets it. The printed range straddles | Ask the maker how the bar was made | PLA-HP's 135 °C |
| Meets it after annealing | Only annealed values meet it | Plan the anneal. Allow for shrinkage | Polymaker HT PLA, 107 °C annealed |
| No number published | Silent on the property. The polymer class can reach it | Ask the maker, or pick a sibling that publishes | |
| Doubtful number | It conflicts with the product's own other data or physics | Do not rely on it. Ask | Spectrum PLA Carbon, 12.5 GPa |
| Printer at its limit | A window touches the H2C's limit, or a heat-hungry class is silent | Test print | LCP's bed window |

Order the materials by their best product: passes first, then the groups in the order above. Within a group, put fewer
open requirements first, then the closest. Collapse the "unlikely" ones under one line rather than hiding them.

Each material line says what decides it and what to do, in one or two sentences:

> **PLA-CF — can't tell, on the line.** 3DXTECH CarbonX CF-PLA measures 4.95 GPa on a printed XY bar against 5.0.
> Seven others claim values near or above the line on bars they do not describe, and the three highest are doubtful for
> their fibre content. Eight fall short. Check: ask 3DXTECH for the scatter, or print one test bar.

A material with no product to buy is not "can't tell". It belongs in its own short list, outside the results (PA612).

## The ten cases in detail

**C-A: ASA-GF, stiffness XY ≥ 5 GPa. Fail, high confidence.** All six products carry evidence, and all fall short. IPCON
measures 2.76 GPa and Eryone 1.86 GPa on printed XY bars. Spectrum gives 2.55 GPa on a moulded bar and Extrudr 3.1 GPa
on an unnamed bar. Flashforge (10 % glass, 3.36 GPa) and iSANMATE (2.77 GPa) publish only flexural stiffness. The
densities, 1,100-1,180 kg/m³, put the glass at about 10-16 % by weight. Even a generous short-fibre estimate gives at
most about 4.7 GPa at 16 % glass, on ASA's 2.2 GPa base.

**C-B: PLA, outdoor set (HDT ≥ 100 °C, stiffness ≥ 3 GPa, density ≤ 1,500). Can't tell: meets it only after annealing.**
Stiffness and density are not the issue. colorFabb PLA-HP measures 4.24 GPa on a printed XY bar, and unfilled PLA cannot
exceed 1,330 kg/m³. Heat is the issue. PLA-HP's 134-135 °C comes from two sheets. The 2022 draft footnotes it "only
injection molded data available". The 2024 sheet footnotes "optimal temperature resistance is obtained after annealing".
A moulded bar of a crystallising polymer, cooled slowly in a hot tool, is crystalline. A print cooled by a fan on a 50 °C
bed mostly is not. So the figure is a ceiling for the printed part, not evidence it is met. As printed, PLA softens at its
Tg near 60 °C. 101 PLA products publish HDT at 0.45 MPa without annealing, and their values average 58 °C. Three reach
100 °C after annealing: Polymaker HT PLA (107 °C), HT PLA Pro (108 °C) and Spectrum PLA Matt (116 °C after 4 h at
90 °C). I would show PLA in "meets it after annealing", and PLA-HP under "number not from a printed part", with the
question to colorFabb. Outdoors, PLA also lacks UV resistance, which this set does not ask.

**C-C: PETG, elongation XY ≥ 100 % (a gasket). Fail, high confidence.** 22 products publish elongation on printed XY
bars, averaging 16 %. The best is colorFabb PETG Economy at 91 %. The 12 products claiming 100-400 % test a film or do
not say how the bar was made. Those are resin numbers: copolyester stretches far in a moulded bar and breaks at the seams
of a print. The class rule decides it: no glassy product here reaches 100 % on a printed bar. PETG, at about 2 GPa, is also
not a gasket material whatever its elongation.

**C-D: PEBA, elongation ≥ 100 % and printable. Pass, high confidence.** colorFabb PEBA 40D (1,110 %), QIDI PEBA 95A
(1,107 %), colorFabb PEBA 45D (1,050 %) and eSUN PEBA90A (above 520 %) all measured printed XY bars. Every PEBA print
window is inside the H2C: nozzle 200-270 °C, bed at most 100 °C. No sheet states a chamber temperature, and a soft
elastomer that barely shrinks needs none. Siraya Tech asks for an enclosure, which the H2C has. The practical check is
feeding a soft filament through the extruder, not temperature.

**C-E: TPU 95A class, stiffness ≥ 5 GPa. Fail, certain.** Twelve products publish 0.006-0.065 GPa. The rubber rule decides
it for every product, including those that publish nothing. One record reads 2.3 GPa (a flexural "23,500 kg/cm²" on a TPU
A95 sheet) and is already flagged as impossible. The rubber rule would catch it even unflagged.

**C-F: PLA-CF, stiffness XY ≥ 5 GPa. Can't tell, on the line, medium confidence.** 16 products publish a stiffness.
3DXTECH CarbonX CF-PLA measures 4.95 GPa on a printed XY bar, 1 % short, and 6.32 GPa in flexure. Eight fall short:
QIDI (4.02), Polymaker (3.28), CreatBot (2.8), Eryone, Flashforge, SUNLU and SIDDAMENT, plus Bambu Lab, whose 2.79 GPa
is annealed and so a ceiling. Seven claim values near or above the line on bars they do not describe. The three highest
are doubtful. Spectrum PLA Carbon claims 12.5 GPa at a stated 10 % fibre, about three times what other PLA-CF reach at
that loading. Extrudr PLA Basic CF claims 5.6 GPa, but its density (1,240-1,260 kg/m³) is that of unfilled PLA.
iSANMATE claims 25 GPa on a moulded bar. Physically, 5 GPa is reachable for a good PLA-CF printed along its roads. So
this is a real "check one product" answer.

**C-G: PA6-CF, outdoor set. Pass dry, high confidence. Recheck for humid air, medium.** Four products meet all three:

| Product | Stiffness XY | HDT at 0.45 MPa | Density |
|---|---|---|---|
| Flashforge PA6CF10 | 4.3 GPa, printed | 200 °C, printed, as printed | 1,200 kg/m³ |
| Nanovia PA-6 CF | 4.68 GPa, printed | 140 °C, unnamed bar | 1,210 kg/m³ |
| Eryone PA6-CF | 4.02 GPa, printed | 185 °C, unnamed bar | 1,090 kg/m³ |
| 3DXTECH CarbonX Carbon Fiber Nylon (Gen3) | 3.8 GPa, printed | 147 °C, printed | 1,170 kg/m³ |

Nylon crystallises while it prints, so its heat deflection holds far above 100 °C without annealing. But an outdoor
part is never dry. Nylon 6 takes up water from humid air, and stiffness falls. Conditioned/dry is 0.27-0.30 for an
unfilled PA6/66 here and 0.60-0.70 for PAHT-CF. At that rate 3.8-4.3 GPa dry may become 2.3-3 GPa. For an outdoor part
I would judge nylons conditioned, or show a second answer: "meets it dry; may fall below 3 GPa in humid air".

**C-H: LCP, printable on the H2C. Pass, at the edge, medium confidence.** Fabru's only LCP asks for a nozzle at 280-300
°C (fine) and a bed at 120-150 °C. The H2C's 120 °C is the bottom of that window. The sheet states no chamber
temperature, and it prints a shrinkage of 0.0 %. LCP's rigid chains barely shrink, so warping, the reason for chamber
heat, is small. I would pass it with the flag "bed at the cold end of the maker's window: check first-layer adhesion".
The sheet's drying at 150 °C needs an oven.

**C-I: PA612, stiffness XY ≥ 5 GPa. Fail, and no product to buy, high confidence.** The material holds one record: DuPont
Zytel 151L, an injection-moulding resin entered as a reference, at 2.4 GPa dry and 1.7 GPa conditioned. Unfilled PA612
cannot approach 5 GPa (the unfilled ceiling). More importantly nobody sells a PA612 filament here. The material should
not appear among results at all. Three candidate materials are in this state.

**C-J: PET-CF, stiffness XY ≥ 5 GPa. Pass, high confidence.** BASF Ultrafuse PET CF15 measures 6.18 GPa on a printed
XY bar. Its sheet states the bars were "conditioned in standard climate (23°C, 50% RH 72h)" and mentions no annealing.
Its own HDT of 74 °C, just under its 79 °C Tg, confirms an unannealed, glassy bar. PET takes up a few tenths of a
percent of water, so 50 % humidity barely changes its stiffness. Raise3D Industrial PET CF (5.73 GPa, conditioned, not
annealed) also passes. Raise3D Hyper Speed PET CF (5.0 GPa) passes with a thin margin. Polymaker Fiberon PET-CF17
(5.48 GPa annealed) is open. Bambu Lab PET-CF is open but unlikely: 4.73 GPa after annealing is a ceiling, 5 % under
the line. Flashforge PET-CF (3.6 GPa, printed) fails. An outdoor PET-CF part would need annealing for heat, since as
printed it softens near 75 °C.

## Are the presets' single numbers good proxies?

Two are fair. Four miss part of what the part needs, and the flexible one misses most.

- **Flexible component (elongation ≥ 100 %)** is the weakest. Elongation says how far a bar stretches before it breaks,
  not how soft it is. 25 materials outside the rubber families have a product claiming 100 % or more, among them PETG,
  PC and PEEK. A gasket needs softness and recovery: a Shore hardness of about 60-95 A (a stiffness under about 0.05
  GPa) and a low compression set (how much of a squeeze it keeps). A phone case needs 85-95 A. A strap needs elongation
  and tear strength. I would require stiffness ≤ 0.1 GPa or Shore ≤ 95 A, plus elongation ≥ 200 % on printed bars.
- **Outdoor structural part** covers heat well: HDT at 0.45 MPa ≥ 100 °C is a fair proxy for a dark part in summer sun.
  It ignores ultraviolet light and water. PLA and ABS degrade in sunlight, while ASA, PVDF and carbon-black-filled
  grades resist it. The data hold maker statements on UV for 27 materials. Nylons should be judged in humid air.
- **Warm environment (HDT 0.45 ≥ 80 °C)** misleads for two classes. Crystalline polymers (PP, nylons) score high at
  0.45 MPa but creep under a steady load well below it. For a loaded part, HDT at 1.8 MPa is the better proxy. For
  rubbers HDT means nothing, because the bar bends under the test load at room temperature. Use a service temperature.
- **Lightweight structure (density ≤ 1,250, stiffness ≥ 2.5 GPa)** caps density, but a light part needs stiffness per
  weight. PET-CF at 1,357 kg/m³ and 6.2 GPa is out, while a 2.5 GPa PLA is in. I would rank by stiffness ÷ density
  (or by its cube root ÷ density for a panel in bending) instead of a hard cap.
- **High-stiffness fixture (5 GPa XY)** is fair, but a fixture is often loaded across its layers. Fibre-filled crystalline
  products keep only half their stiffness in Z (Z/XY 0.50 on average, 10 pairs). Show Z where it is published.
- **Indoor prototype** needs only the printer check.

## What else I would tell the owner

**Reclassify PLA.** The polymer table calls PLA amorphous. Physically it is a slowly crystallising polymer, like PET. It
prints glassy, but nucleated grades, annealing or a hot mould crystallise it. That is why 7 PLA-family products show HDT
25-45 °C above their own Tg, and why PLA-HP's moulded 135 °C says little about a print. Give PLA the same "prints
amorphous" class as PET. Let crystallising PLA grades be a recorded variant, so they neither pull ordinary PLA up nor hide.

**Data to collect first**, in order of how many answers they move:

1. For each fibre-filled product, its fibre content by weight, typed as a number (from the sheet or its density). It
   makes the stiffness ceiling and the density rule work product by product.
2. For each "number not from a printed part" product near a line, how the bar was made. One email settles PLA-HP.
3. Conditioned values for nylons, for any outdoor or humid use.
4. The test method behind each maker's stiffness: an extensometer, or the machine's crosshead (which reads low). That
   explains most of the 2.5-fold lab gap and would let the tool correct it.
5. Shore hardness and compression set for flexible products, if the flexible preset changes as proposed.

**What not to attempt.** Do not convert moulded elongation to printed. Do not predict Z from XY. Do not use HDT for
rubbers. Do not predict the heat deflection of PLA, PET or PPA from Tg or melting point without knowing the
crystallinity. Do not let a material's median decide. Do not fit a large statistical model to about 300 printed XY
values that are confounded by the lab.

**Where the biggest risk is.** First, values from moulded, annealed or unnamed bars passing as printed ones: 487 of 1,211
published stiffness values do not say what bar was tested. Second, a single wrong number promoting a whole class, which
the class ceilings guard against. Third, preset proxies that admit plastics an engineer would never choose. Only 28 % of
products publish a printed XY stiffness, and 17 % a printed HDT. So most answers rest on indirect evidence, which is why
the conversion bands deserve the same care as the data.

## Glossary

- **HDT (heat deflection temperature):** the temperature at which a loaded bar bends a set amount, at 0.45 or 1.8 MPa.
- **Tg (glass transition):** the temperature at which a glassy plastic turns rubbery. A glassy plastic loses stiffness there.
- **Amorphous / crystalline:** glassy plastics soften at Tg. Crystalline ones keep strength up to their melting point.
- **XY / Z:** a bar printed flat and pulled along the print plane, or printed upright and pulled across the layers.
- **Moulded bar:** an injection-moulded test bar of the resin. It is not a print and has no layer seams.
- **Annealed:** baked after printing to crystallise it. **Conditioned:** stored in humid air before testing.
- **Elastomer:** a rubbery plastic (TPU, PEBA). **Shore A / D:** hardness scales for soft and firm rubbers.
- **Rule of mixtures:** a composite's density or stiffness estimated from its ingredients' shares.
- **Comparable value:** a value measured the way the requirement asks (a printed bar, direction stated, as printed).
- **Test scatter:** how much repeat tests of one product differ, about 10 % for stiffness.

## Evidence and where to check

All queries run on release 9ca94d31fc5d with `npm run -s sql -- --snapshot "<query>"`, on raw tables only.

- **Pair bands.** Each is a self-join of `measurements` on GradeID and SourceID, with Data status "Published value" or
  "(transcription corrected)" and Operator `=`. Z/XY: Direction `Z`/`ZX` against `XY`, printed specimens, not
  conditioned, not annealed: 84 pairs. Flexural/tensile: same grade, source, direction and specimen type: 482 pairs,
  2.5/50/97.5 % at 0.63/0.99/1.43. HDT: Test load MPa 1.8 against 0.45, same post-processing: 268 pairs, minimum -1 °C.
  Annealed against as-printed, same direction, load and moisture: stiffness 17, HDT at 0.45 MPa 11, elongation 18 pairs.
  Conditioned against dry: PA6/66 and PAHT-CF only. HDT 0.45 against Tg, joined to `polymers` on Estimate identity,
  amorphous outside PLA: 118 pairs. The one excess is Stratasys PC-ABS (G094-09: V014330 Tg 105.3 °C, ABS phase).
- **Glassy elongation.** Printed XY elongation joined to `polymers.Morphology`: amorphous 211 products, one ≥ 100 %.
- **Coverage.** 1,105 active procurement grades. Printed XY stiffness 305, any stiffness 733, tensile or flexural 920.
  Printed non-annealed HDT 0.45 191, any HDT 0.45 580, any heat property 905. Density 996.
- **Test labs.** PLA (M001) printed XY tensile modulus grouped by Manufacturer: Flashforge 5 products, mean 1.29 GPa.
  Eryone 6, 1.53. colorFabb 6, 3.30.
- **Chamber.** `profiles` of active procurement grades of candidate (H2C-relevant) materials, retired profiles left
  out. A product is silent when none of its profiles has Chamber state `range`, `not-required`, `ambient` or
  `enclosed`, or Enclosure state `not-needed` or `recommended`: 448 of 1,053. By family: PLA 139, Flexible Elastomers
  64, PETG 46, Nylon / Polyamide 40, ABS 40, ASA 27, Polycarbonate 20. Separately, 817 of the 1,068 products with a
  profile have one with Chamber state `unknown`.
- **C-A** (M034): V001985, V004983, V001998, V013042, V002204 (G034-04, 10 % glass), V002221. Densities V004112,
  V001993, V000673, V001980.
- **C-B** (M001): V005853 (R-COLORFABB-TDS-E-ColorFabb-PLA-HP-7a500b, p. 1 footnote on annealing), V005792
  (R-COLORFABB-TDS-E-ColorFabb-PLA-HP-5210c3, "only injection molded data available"), V005847 (4.24 GPa XY).
  Annealed: V015384, V013473, V002780. PLA neat density range: `polymers` row PLA.
- **C-C** (M020): V006297 (91.06 %). Film: V003085. Unnamed bars: V014132, V008990, V007295, V002848.
- **C-D** (M045): V012719, V008145, V012723, V000845. Profiles P0057, P0058, P0762, P0986, P1140.
- **C-E** (M161): tensile modulus range over 14 rows. V012518 is flagged physically implausible.
- **C-F** (M018): V003304, V003307, V008118, V003420, V009476, V000331 (annealed), V005075, V005465, V008503,
  V007921. Open: V010071, V006751, V009106, V009035. Doubtful: V003097 (S-SPECTRUM-en-tds-spectrum-pla-carbon, "Dodatek
  10% włókna węglowego", density V012354), V012068 (densities V008612, V012086), V009912.
- **C-G** (M050): G050-08 V005168, V005171, V005163. G050-12 V011373, V007553, V007549. G050-07 V005128, V005124,
  V005123. G050-10 V006448, V006453, V006446.
- **C-H** (M139): G139-01, profile P1467, R-FABRU-PUREFIL-4706-material-data-sheet-LCP-purefil p. 1 (shrinkage 0.0 %).
- **C-I** (M058): G058-R1 (Role reference), V002044, V011919. Candidate materials with no active procurement grade: 3.
- **C-J** (M067): V007692 and R-BASF-ExtendedTDS-Ultrafuse-PET-CF15-V1-4 p. 4, footnote 5, conditioning at 23 °C and
  50 % RH for 72 h. Same sheet: HDT 74 °C, Tg 79 °C. Also V011546, V013877, V001272 (annealed), V002423 (annealed),
  V005314, V003036.
- **Physics ceilings.** Unfilled stiffness above 4.3 GPa: V005729 (LCP 11.7), V011137 (Spectrum ThermaTech PA, 6.3,
  filler undisclosed), then PLA grades at 4.4-5.1 on unnamed bars. Elastomer stiffness above 0.3 GPa: 15 rows, all
  filled or flagged, except three hard, Shore D TPUs at 0.39-0.40 GPa (V007170, V012012, V012305).
  PETG-CF claim against density: FormFutura CarbonFil (G024-21) V009835, 9.495 GPa on an unnamed bar, and V009831,
  1,190 kg/m³.
