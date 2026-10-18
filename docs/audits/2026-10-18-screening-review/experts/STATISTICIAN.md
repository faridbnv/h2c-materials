# What an engineering statistician would build: pass, fail and "can't tell"

> **Historical record** (2026-10-18): an independent opinion written for the screening review on release 9ca94d31fc5d, from the data alone, without seeing the tool's current rules.

## In short

This is an outside opinion, from the raw records only, on how the tool should decide whether a filament meets a
requirement. Firm answers are possible only where a product publishes the value asked for (a printed bar, pulled in the
print plane, dry, as printed): a quarter of products do for tensile modulus, a sixth for HDT. Any other kind of value
should decide only in the direction its measured bias makes safe: a moulded modulus that fails shows a fail, one that
passes shows nothing. Sibling estimates should order the "can't tell" list, and may hide a product only where a
hold-out test shows they are wrong less than 5 % of the time, which needs at least two other makers. A material passes
when at least one product you can buy is shown to meet every requirement, never by combining different products' best
values. Of the ten cases: pass for PEBA, PA6-CF and PET-CF; ruled out for ASA-GF and TPU 95A; "can't tell" for PLA,
PETG, PLA-CF and LCP; no answer for PA612, which has no filament to buy.

## What do the data look like?

Most products publish something, but few publish exactly what a requirement asks. I counted the 1,053 products you can
buy (active, in the 132 materials that have at least one).

| Property | Products with any value | Measured the way a requirement asks |
|---|---|---|
| Tensile modulus | 689 (65 %) | 264 (25 %): printed bar, print plane, not annealed or conditioned |
| Elongation at break | 844 (80 %) | 303 (29 %) |
| HDT at 0.45 MPa | 554 (53 %) | 175 (17 %): printed bar, not annealed |
| Density | 954 (91 %) | 954: the kind of specimen hardly matters |
| Printer settings | 945 (90 %) state a nozzle and bed window | only 177 (17 %) state a chamber temperature |

HDT is the thinnest: 227 products publish both loads, 71 publish only 1.8 MPa and 428 (41 %) publish neither. About 4 in
10 published tensile modulus values (487 of 1,211) do not say what kind of bar they come from.

Small materials are thin. 30 materials have one product, 30 have two, 44 have three to nine and 28 have ten or more. Of
the 60 materials with one or two products, only 27 have a printed in-plane tensile modulus from any product. Of the 28
with ten or more, 25 do.

### Each kind of evidence is biased in a known direction

Products that publish two kinds of value let the data measure these biases. Each row is the first kind ÷ the second.

| Compared | Typical | Range seen | Products |
|---|---|---|---|
| Unstated bar ÷ printed flat bar, tensile modulus (material medians) | ×1.21 | ×0.86 to ×2.16 | 27 materials |
| Moulded bar ÷ printed flat bar, tensile modulus, same product | ×1.12 | ×1.04 to ×4.1 | 6 |
| Moulded bar ÷ printed flat bar, elongation (material medians) | ×1.8 | ×0.84 to ×3.7 | 11 materials |
| Unstated bar ÷ printed flat bar, elongation, same product | ×1.0 | ×0.31 to ×17.5 | 18 |
| Upright (Z) ÷ flat (XY): modulus / strength / elongation | ×0.86 / ×0.57 / ×0.48 | max ×1.07 / ×1.11 / ×2.5 | 108 / 128 / 117 |
| Tensile ÷ flexural modulus, both printed flat | ×1.00 | 90 % within ×0.75 to ×1.42 | 173 |
| HDT at 0.45 minus HDT at 1.8 MPa | +7 °C | −5 to +115 °C | 181 |
| Annealed ÷ as printed: modulus; HDT difference | ×1.06; +52 °C | ×0.79 to ×1.12; +39 to +88 °C | 6; 3 |
| Conditioned ÷ dry, tensile modulus | ×0.8 | ×0.27 to ×1.0 | 4 |

The direction matters more than the size. Unstated and moulded bars overstate printed stiffness in most materials
(PETG ×1.55, PA6-CF ×1.77, PETG-CF ×1.81), but not all (ABS ×0.95). Upright bars are never meaningfully stiffer than
flat ones. HDT at 0.45 MPa is never more than 5 °C below HDT at 1.8 MPa, and is above it by 2 °C for PLA, 6 °C for
ABS and 90 °C for PA6-CF. Annealing raises HDT a lot; humid air lowers stiffness in nylons and not at all in PET.

A product's figure also moves between its own sheets: two-thirds of products seen in two sources print the same figure,
and the 90th percentile gap is 17 % for tensile modulus, 6.6 °C for HDT, 6 % for density and 65 % for elongation.
colorFabb PLA-HP's tensile modulus went from 3.77 to 4.24 GPa between its 2022 and 2024 sheets.

### Products of one material spread widely and disagree near the line

Within a material, one standard deviation between products (printed flat bars) is a factor of 1.5 for tensile modulus
(PC ×1.11, ABS ×1.14, PLA ×1.49, PLA-CF ×1.86), ×1.28 for flexural modulus, ×1.31 for tensile strength, ×2.1 for
elongation and 18 °C for HDT (PCTG 0.4 °C, PPA-CF 68 °C). Printed tensile modulus is much noisier than flexural modulus
on the same products (PLA ×1.49 against ×1.17). Some makers probably measure strain from the machine rather than with
an extensometer, so a printed tensile modulus is a weaker figure than it looks.

Near the requirement, products of one material often disagree. For "tensile modulus XY at least 3 GPa", 13 of the 41
materials with two or more measured products have both passing and failing products. For "HDT at least 100 °C" it is
17 of 57; for "density at most 1,250 kg/m³", 30 of 99. A single number for a material cannot carry these answers.

## 1. How should pass, fail and "can't tell" be decided?

### For one product and one requirement: decide only on evidence, with a tolerance band

I would define three answers, and let only shown evidence produce the first two.

- **Pass:** a value measured the way the requirement asks clears it by more than a tolerance band, or a value of
  another kind clears it even after the least favourable allowance for its kind (section 2).
- **Fail:** the same, the other way round, or a physical bound of the material class (an elastomer cannot be stiff).
- **Can't tell:** everything else, named after what is missing (section 4).

The tolerance band is the size by which a product's own figure moves between sheets: ±10 % for modulus and strength,
±25 % for elongation, ±5 °C for HDT and ±2 % for density. A typical value inside the band is "at the line": the data
cannot say which side the product is on. 3DXTECH CarbonX CF-PLA publishes 4.95 GPa against a 5 GPa requirement; that is
not a fail, it is a coin toss.

As a rule, for an "at least t" requirement and one published value v of a kind whose allowance runs from lo to hi (the
range of "value asked for ÷ value published" in the pairs above):

```text
shows a pass   if  v × lo ≥ t × (1 + band)
shows a fail   if  v × hi ≤ t × (1 − band)
otherwise      it only informs (at the line, if v is of the kind asked for)
product: pass if some value shows a pass and none a fail; fail the reverse;
         "sheets disagree" if both; otherwise can't tell
```

For the kind asked for, lo = hi = 1. For an "at most" requirement the roles swap. For example, BASF Ultrafuse PET CF15
publishes 6.18 GPa on a printed flat bar after 72 h at 23 °C and 50 % humidity. Conditioning lowers modulus or leaves
it unchanged, so the ratio dry ÷ conditioned is at least 1 (lo = 1), and the dry value is at least 6.18 GPa: a pass.

Makers publish typical values, not minimums, so a pass means a typical part meets the requirement, not every part.

### For a set of requirements: all of them, inside one product

A product passes a set only if it passes each requirement, fails if it fails any, and is "can't tell" otherwise. The
tool must never meet one requirement with one product's value and another with a second product's. The data show why:
for the Lightweight structure set (density at most 1,250 kg/m³, modulus XY at least 2.5 GPa), 31 materials have some
product that meets each requirement, but in 10 of them (PETG, PC, PLA-CF and PA6 among them) no single product is shown
to meet both.

To order "can't tell" products, multiply the chances of each requirement. To hide one, use the worst single
requirement only: hide when one requirement alone is below 5 %. Properties move together (fibres raise modulus, HDT
and density at once), so a product of chances can be far too small.

### What a material's answer should mean: one product shown, and a count

A material answer is meaningful only as a statement about its products. I would define it this way:

- **Pass:** at least one product you can buy is shown to pass the whole set.
- **Fail:** every product is shown to fail (its own value, a safe-side allowance or a class bound).
- **Unlikely:** every product fails or is unlikely (section 3). Hidden with the fails, but counted apart.
- **Can't tell:** otherwise, named after its best product.

Always add the count: "3 of 14 products shown to pass, 10 likely, 1 with conflicting sheets". A material-wide median or
range must not decide: it hides the disagreement measured above. Declared variants (metal-filled PLA at 1,850 to
4,000 kg/m³, foamed, soft grades) must be judged on their own and never pooled with the base material.

### How the cost of each error should set the thresholds

If hiding a good option is R times as costly as a wasted check, a "can't tell" product is worth showing whenever its
chance of passing exceeds 1 / (1 + R). With R = 10 that is 9 %; with R = 20 it is 5 %. I recommend hiding only below
5 %, and showing the hidden ones as a count that opens. The uneven data push the same way: a product's own values
decide, the material's other products supply estimates, and each kind of source gets its own allowance.

## 2. What may evidence that is not exactly what was asked decide?

Each kind of evidence may decide only in the direction its measured bias makes safe. "Clears" below means after the
tolerance band.

| Evidence | What the data show | May show a pass | May show a fail |
|---|---|---|---|
| Moulded or unstated bar, modulus or strength | Usually above printed (×0.86 to ×2.2) | Never in practice | If v ÷ 0.86 still falls short |
| Moulded or unstated bar, elongation | ×0.31 to ×17.5 on one product | Never | Only if v is below t ÷ 3.3 |
| Moulded or unstated bar, HDT | Equal within ±5 °C for amorphous polymers | Amorphous polymers only (ABS, ASA, PC, PETG) | Yes: for a polymer that can crystallise, the moulded bar is the ceiling |
| Printed bar, direction unstated | Most are flat; upright bars are weaker | Yes, for modulus and strength | No ("likely fail" at most) |
| Upright (Z) bar only | Not meaningfully stiffer or stronger than flat (max ×1.11) | Yes, for modulus and strength | No |
| Annealed bar, part judged as printed | HDT +39 to +88 °C; modulus ×0.79 to ×1.12; elongation lower | Elongation; modulus if v ÷ 1.12 clears | HDT; modulus if v ÷ 0.79 falls short |
| Conditioned bar, part judged dry | Modulus ×0.27 to ×1.0; elongation rises | Modulus and strength | Elongation; modulus only for polymers that take up little water |
| Flexural for tensile modulus | ×0.75 to ×1.42 | If flexural × 0.75 clears | If flexural × 1.42 falls short |
| HDT at 1.8 for 0.45 MPa | 0.45 is never more than 5 °C below 1.8 | If HDT 1.8 clears | Amorphous only, if HDT 1.8 + 30 °C falls short |
| A bound ("> 500 %") | A floor | If the floor clears an "at least" | If the floor exceeds an "at most" |
| Maker's window partly reachable | (printer check) | If the printer reaches at least 5 °C of it | If it reaches none; edge only is "at the line" |
| Chamber temperature not stated | 83 % of products state none | If at most 1 in 10 other makers of the polymer ask above 65 °C | No; otherwise can't tell |

Four of these rows need a word.

**HDT on a moulded bar** depends on whether the polymer can crystallise. ABS, ASA, PC and PETG cannot, and their HDT is
set by the glass transition, so moulded and printed bars agree. PLA, PET and the nylons can, and a moulded or annealed
bar is much more crystalline than a printed one. PLA is the trap here: the polymers table records it as amorphous
because it prints amorphous, yet a moulded PLA bar can be crystalline. colorFabb PLA-HP's 134 °C is such a figure.

**HDT at 1.8 MPa standing in for 0.45 MPa** can show a fail only for amorphous polymers, where the two loads stay
close: the largest gap seen there is 25 °C (PC-PBT), hence the 30 °C allowance. Filled nylons reach 115 °C.

**A setting the maker never states** is silence, not a requirement. Silence counts as "no chamber needed" only where the
polymer's other makers confirm it. For elastomers, 23 profiles state a chamber need, and none asks above 50 °C. For
polycarbonate, 4 of 6 makers ask above 65 °C, so an unstated chamber stays "can't tell". For the styrenics, 2 of 12
makers (Nanovia and UltiMaker) ask above 65 °C, so an ABS without a chamber statement is "likely", not a pass.

**A maker's window the printer reaches only in part** passes when the printer covers a usable stretch of it. When the
printer reaches only the window's edge (LCP's bed at 120 to 150 °C on a 120 °C bed), there is no margin for a bed
surface that runs cooler than its setting: "at the line".

## 3. What may an estimate do?

Estimates should order and group the "can't tell" list, may hide a product only where a back-test supports it, and
should never pass or fail one.

### The model, in plain words

For one property and one material, each product's value (on a log scale) is the material's typical value, plus the
product's own deviation, plus an allowance for the kind of bar. Partial pooling fills the gaps: let a product with few
data borrow from its material's other products, more when it has less of its own, and let a material with few products
borrow its spread from materials of the same polymer type and filler, more when it has fewer products. I tried the
simplest version:

```text
m  = mean of ln(value) over other makers' products (one per maker, twins sharing a sheet left out)
s² = ((n − 1) · s_material² + 3 · s_pooled²) / (n − 1 + 3)      the pooled spread counts as 3 products
P(meets "at least t") = 1 − Φ( (ln t − m) / (s · √(1 + 1/n)) )   Φ: the normal curve's cumulative share
```

HDT works the same way in °C, but its spread must depend on the polymer type (0.4 °C for PCTG, 68 °C for PPA-CF).

### How well it works: a back-test that holds out one maker at a time

I held out each product with a printed value, predicted it from other makers' products of its material, and counted
how often the true value lay above the one-sided 95 % bound. That count is the rate at which hiding would be wrong.

| Other makers available | Tensile modulus | Elongation | HDT 0.45 MPa | Density |
|---|---|---|---|---|
| 1 | 12.5 % of 24 | 9.4 % of 32 | 5.7 % of 35 | 8.3 % of 48 |
| 2 to 3 | 1.9 % of 52 | 5.1 % of 39 | 10.0 % of 60 | 2.5 % of 81 |
| 4 to 9 | 1.6 % of 61 | 4.5 % of 66 | 3.4 % of 118 | 3.1 % of 196 |
| 10 or more | 4.3 % of 70 | 5.3 % of 95 | 5.9 % of 187 | 4.2 % of 526 |

With two or more other makers the error sits near the 5 % it promises, except HDT with two or three. With one other
maker it is two to three times too high. So:

- **Rank:** always.
- **Show as "likely":** when the chance is at least 50 %. Never as a pass.
- **Hide as unlikely:** only when the chance is below 5 %, from at least two other makers (four for HDT), for a product
  that is not a declared variant, on one requirement alone. Show the count.
- **Pass or fail:** never, except by a physical bound of the class. An elastomer of Shore 95A has a modulus near
  0.04 GPa by Gent's relation. An unfilled, non-variant polymer's density lies in its neat range: 155 unfilled PLA
  products publish 1,000 to 1,329 kg/m³.

Few materials can support an estimate: 41 of 132 have two or more makers publishing a printed in-plane modulus
(tensile or flexural), 37 for elongation, 41 for HDT and 93 for density. 47 have no such modulus from anyone.

"Every measured product fails" is weaker than it looks. If n products are measured and all fail, up to about 3 ÷ n of
the material's products could still pass (the "rule of three", 95 % confidence). PETG has 22 products measured for
elongation as printed and none reaches 100 %, yet that still allows up to 14 % of PETG products to pass.

### How to validate as the data grow

Hold out by maker and by shared formulation (twins share one sheet). Report the error per property and per number of
other makers; let an estimate hide anything only once its error is at most 5 % on 30 or more held-out products, and
re-test every release. Calibrate allowances from products publishing both kinds: only 6 moulded-and-printed pairs exist.

## 4. How should the "can't tell" materials be grouped, ordered and named?

Group them by the action that would settle them, order each group by the best product's chance, and name the one thing
to check. I would show six groups in this order.

1. **At the line:** a value of the kind asked for sits within the band. "PLA-CF: 3DXTECH CarbonX CF-PLA publishes
   4.95 GPa on a printed flat bar, 1 % under 5 GPa. Ask 3DXTECH, or print and test a bar."
2. **Shown only on another kind of bar:** it passes on a moulded, annealed or unstated bar, which cannot show a pass.
   "PLA: colorFabb PLA-HP quotes 134 °C HDT from an injection-moulded bar. Ask for an as-printed figure."
3. **Sheets disagree:** "PA6-CF: Extrudr DuraPro PA6 CF's two sheets give 1.1 and 6 GPa."
4. **Not published, similar products pass ("likely").**
5. **Not published, nothing to compare with.**
6. **Unlikely:** hidden by default, shown as a count that opens.

Each line gives the material, its best product, its value and kind of bar, what is missing, and how to settle it (ask
the maker, re-read the sheet, print a test bar). A rough run of these rules over the presets, with my own script:

| Preset | Pass | Fail | Can't tell (likely; at the line or disagree; other; unlikely) |
|---|---|---|---|
| Outdoor structural part | 11 | 36 | 85 (7; 4; 63; 11) |
| Lightweight structure | 15 | 33 | 84 (13; 14; 51; 6) |
| Warm environment | 35 | 4 | 93 (34; 13; 41; 5) |
| High-stiffness fixture | 8 | 49 | 75 (10; 6; 41; 18) |
| Flexible component | 11 | 33 | 88 (13; 3; 47; 25) |
| Indoor prototype | 99 | 1 | 32 (28 likely; 4 at the line) |

"Other" gathers materials whose best product has a 5 to 50 % chance, or nothing to compare with. These counts are
rough: my script leaves out the class bounds and simplifies the printer check. The shape is the point: for any property
preset, about half the materials will be "can't tell", and the page must make that list workable rather than short.

## 5. The ten cases

| Case | My answer | Group or reason | Confidence |
|---|---|---|---|
| C-A ASA-GF, modulus XY ≥ 5 GPa | Ruled out (unlikely, hidden) | 4 products fail, 2 unlikely | High |
| C-B PLA, outdoor set | Can't tell | Shown only on another kind of bar | High that pass is unsafe |
| C-C PETG, elongation XY ≥ 100 % | Can't tell | At the line (one product at 90–91 %) | Medium |
| C-D PEBA, elongation ≥ 100 % and printable | Pass | 5 products shown | High |
| C-E TPU 95A, modulus XY ≥ 5 GPa | Fail | All 27, by own values or class bound | Certain |
| C-F PLA-CF, modulus XY ≥ 5 GPa | Can't tell | At the line (4.95 GPa) | High |
| C-G PA6-CF, outdoor set | Pass | 3 products shown | High |
| C-H LCP, printable | Can't tell | At the line (bed window starts at 120 °C) | Medium |
| C-I PA612, modulus XY ≥ 5 GPa | No answer | No filament to buy | High |
| C-J PET-CF, modulus XY ≥ 5 GPa | Pass | BASF PET CF15 shown, conditioned value | High |

**C-A, ASA-GF.** Four of six products fail on their own values: IPCON ASA GF publishes 2.76 GPa and Eryone 1.86 GPa on
printed flat bars, Extrudr DuraPro 3.1 GPa on an unstated bar and Spectrum 2.55 GPa on a moulded one, all more than 30 %
short on kinds of bar that overstate printed stiffness. Flashforge ASAGF10 (3.36 GPa flexural, printed flat) and
iSANMATE (2.77 GPa flexural) would need a tensile modulus 1.5 to 1.8 times their flexural one, beyond 95 % of the 173
products that publish both. They are unlikely, so the material is hidden with the fails: "no product reaches 5 GPa;
the highest figure any of them publishes is 3.5 GPa".

**C-B, PLA, outdoor set.** One product is the question. colorFabb PLA-HP passes modulus on its own printed flat bar
(4.24 GPa) and density by class (155 unfilled PLA products sit at 1,000 to 1,329 kg/m³). Its HDT of 134 °C comes from
the 2022 sheet, which says "only injection molded data available"; the 2024 sheet repeats 135 °C with "optimal
temperature resistance is obtained after annealing the sample". For PLA a moulded or annealed HDT is the ceiling;
printed bars from 28 PLA products have a median of 55 °C. Six more PLA products reach 105 to 116 °C, but only annealed
or on moulded or unstated bars. Answer: "can't tell, shown only on another kind of bar"; ask colorFabb for an
as-printed HDT-B, or test a printed bar at 100 °C. A pass would rest on a moulded figure; a fail would hide the one
product made for this job. If the team can anneal, an "as annealed" option would let the annealed figures decide.

**C-C, PETG, elongation.** 22 products publish elongation on printed flat bars, from 4 to 91 %. The best, colorFabb
PETG Economy at 90 to 91 %, sits inside the ±25 % band, so the material is "at the line" rather than failed. 11 more
products quote 120 to 400 % on bars of unstated kind (MatterHackers Build Series 280 %, Spectrum PET-G FX120 400 %, a
declared soft variant). For PETG such figures run about 3.6 times the printed ones, so they can show nothing either
way. Wording: "No PETG product is shown to stretch 100 % as printed; the best reaches 91 %. 11 quote more on bars whose
kind they do not state, which for PETG usually means resin data." I would list it low, not hide it: the rule of three
still allows up to 14 % of PETG products to pass.

**C-D, PEBA.** Four products publish printed flat elongation of 375 to 1,110 % (colorFabb PEBA 40D 616 to 1,110 %,
QIDI PEBA 95A 1,107 %), and eSUN PEBA90A publishes "> 520 %" on a printed flat bar. Nozzle windows of 200 to 270 °C and
bed windows up to 100 °C are within the printer's limits. No PEBA sheet states a chamber temperature, but no elastomer
profile that states one asks above 50 °C, so silence means none is needed. Pass, with five products shown; the other
five quote 500 % or more on unstated or moulded bars and are "likely".

**C-E, TPU 95A.** Twelve of 27 products publish 0.006 to 0.065 GPa, at least 77 times short of 5 GPa. The other 15 are
Shore 95A by name, and that hardness means about 0.04 GPa. Fail for all 27, the 15 by class bound.

**C-F, PLA-CF.** 3DXTECH CarbonX CF-PLA publishes 4.95 GPa on a printed flat bar, 1 % short and inside the band. Its
flexural 6.32 GPa allows 4.7 to 9.0 GPa tensile, which does not settle it. Four other products with printed flat values
fail (1.1 to 4.02 GPa), and Bambu Lab's annealed 2.79 GPa fails even after the allowance for annealing. Extrudr PLA
Basic CF (5.6 GPa) and Spectrum PLA Carbon (12.5 GPa) quote unstated bars, which for PLA-CF run about 1.6 times the
printed values. iSANMATE PLA CF's 25 GPa moulded figure is implausible for a short-fibre PLA and should be checked.
Answer: "at the line"; ask 3DXTECH or test a bar.

**C-G, PA6-CF, outdoor set.** Three products are shown to pass all three requirements. Flashforge PA6CF10 publishes
4.3 GPa, an HDT of 200 °C and 1,200 kg/m³, all on printed bars. 3DXTECH CarbonX PA6 Gen3 publishes 3.8 GPa, 147 °C and
1,170 kg/m³. SUNLU PA6-CF publishes a flexural 8.6 to 11 GPa (so at least 6.5 GPa tensile), 203 °C and 1,120 to
1,200 kg/m³. Ten more are "likely": six publish HDT only on unstated or annealed bars (140 to 215 °C), and four
publish no HDT, where every PA6-CF product that does clears 100 °C at 0.45 MPa. Extrudr's two sheets disagree. Pass.
Tell the engineer that outdoors PA6 takes up water: in the products that publish both, conditioning cut modulus to
between 0.27 and 1.0 of the dry value.

**C-H, LCP.** The only product, Fabru purefil LCP, asks for a 280 to 300 °C nozzle (fine) and a 120 to 150 °C bed.
The printer's 120 °C maximum is the window's lowest point. No LCP maker states a chamber temperature. "At the line":
print a test part before buying more.

**C-I, PA612.** The material has no filament to buy. Its only record is DuPont's Zytel 151L injection-moulding resin,
whose 2.4 GPa dry moulded modulus would fail anyway, since a moulded bar is the ceiling. It should not be listed as a
material at all. The useful pointer is PA612-CF, where QIDI PA612-CF publishes 4.88 GPa on a printed flat bar, at the
line for 5 GPa.

**C-J, PET-CF.** BASF Ultrafuse PET CF15 publishes 6.18 GPa on a printed flat bar after 72 h at 23 °C and 50 %
humidity. Conditioning never raised modulus in the data, and PET takes up little water (Raise3D Industrial PET CF:
6.03 GPa annealed dry, 6.23 GPa annealed conditioned). So the dry value is at least 6.18 GPa: pass. Raise3D Industrial
PET CF passes on modulus too (5.73 GPa as printed, conditioned), but its profile records no nozzle or bed numbers.
Raise3D Hyper Speed PET CF (5.0 GPa) is at the line, Flashforge (3.6 GPa) fails, and the annealed Bambu Lab (4.73 GPa)
and Polymaker (5.48 GPa) figures are "can't tell".

## 6. What else would I tell the owner?

**The biggest risks.** First, counting a value from an unstated bar as if it came from a printed one: 4 in 10 modulus
values are of that kind, and they run about 20 % high, up to 80 % for PETG-CF and PA6-CF. Second, meeting a set of
requirements across different products of one material. Third, treating a single-product material as if its one sheet
were the material: 60 materials have one or two products, and 33 of those have no printed modulus.

**What to collect first.** As-printed HDT at 0.45 MPa (17 % of products have it); the kind of bar behind unstated
values; products publishing two kinds of value, to calibrate allowances; chamber needs for polycarbonate and styrenics.

**What not to attempt.** One model across every property; borrowing between filled and unfilled materials (carbon fibre
roughly doubles modulus); estimating elongation from anything but printed bars; hardness as a modulus estimate.

**Records worth a second read.** colorFabb PLA-HP's 2024 HDT row is recorded as a printed bar, but it sits outside the
sheet's "3D Printed" table and the 2022 sheet calls the same figure injection moulded. Also iSANMATE PLA CF's 25 GPa,
Extrudr DuraPro PA6 CF's 1.1 against 6 GPa, and SIDDAMENT PET CF's "X-Z" flexural bar at 2.0 GPa, which looks upright.

## Glossary

- **Value of the kind asked for:** a printed bar, pulled in the print plane, dry, as printed.
- **Tolerance band:** how far a typical value may sit from the requirement before the data can say which side it is on.
- **Allowance for a kind of bar:** the range of "value asked for ÷ value published", from products publishing both.
- **Partial pooling:** let a product with few data borrow from its material's other products, more when it has less.
- **One-sided 95 % bound:** a value that 95 % of comparable products are expected to stay below.
- **Back-test (hold-out):** hide a known value, predict it from the rest, and count how often the prediction was wrong.
- **Rule of three:** if n tries all fail, the true success rate can still be up to about 3 ÷ n.
- **Class bound:** a limit set by what the material is (a Shore 95A elastomer cannot be stiff), not by an estimate.

## Evidence and where to check

My scripts lived in the session's scratch folder and are not kept. Each figure can be re-derived with
`npm run sql -- --snapshot "…"` (columns in snake_case). Products are active grades of Role procurement in materials
of Scope H2C-relevant; values have Data status "Published value" or "transcription corrected"; a page_context row
supplies a specimen, moisture or direction a measurement leaves unstated. The back-test keeps one value per other
maker, leaves out twins (same Shared formulation key) and declared variants, and pools log spreads of 0.42 (modulus),
0.73 (elongation), 0.05 (density) and 12 °C (HDT).

- Bar kinds of tensile modulus values: `select specimen_type, count(*) from measurements where property='Tensile
  modulus' and data_status like 'Published value%' group by 1`.
- Best printed elongation of PETG: `select g.manufacturer, g.product_name, m.normalized_value v from measurements m
  join grades g on g.gradeid=m.gradeid where m.materialid='M020' and m.property='Elongation at break' and
  m.specimen_type='Printed specimen' and m.direction='XY' order by v desc limit 3` (V005875, V006297).
- C-A: V001985 (IPCON 2.758 XY), V004983 (Eryone 1.858 XY), V013042 (Extrudr 3.1 unstated), V001998 (Spectrum 2.55
  moulded), V002204 (Flashforge flexural 3.359 XY), V002221 (iSANMATE flexural 2.765).
- C-B: G001-58; V005792 (HDT 134, R-COLORFABB-TDS-E-ColorFabb-PLA-HP-5210c3, "*only injection molded data
  available"); V005853 (HDT-B 135, …-7a500b, "*Optimal temperature resistance is obtained after annealing"); V005847
  (4.24 GPa XY). Other PLA at 105 to 116 °C: V002780, V015384, V013473, V012917, V007602, V002876.
- C-C: V008990 (MatterHackers Build Series 280 %), V014132 (Spectrum PET-G FX120 400 %).
- C-D: V012719, V012720 (colorFabb PEBA 40D), V008145 (QIDI 1,106.8 %), V000845 (eSUN > 520 %).
- C-E: V005939 (colorFabb TPU95A, 0.065 GPa, the highest). C-H: profile P1467 (bed 120 to 150 °C, no chamber).
- C-F: V003304 (4.95 GPa XY), V003307 (flexural 6.32 XY), V012068 (Extrudr 5.6), V003097 (Spectrum 12.5), V009912
  (iSANMATE 25 moulded).
- C-G: V005168, V005171, V005163 (Flashforge); V006448, V006453, V006446 (3DXTECH); V004526, V008616, V004530 (SUNLU);
  V004325 and V013080 (Extrudr 1.1 and 6 GPa).
- C-I: grade G058-R1 (reference role), V002044 (2.4 GPa dry moulded); V009354 (QIDI PA612-CF 4.88 GPa XY).
- C-J: V007692 (6.178 GPa XY, "conditioned in standard climate (23°C, 50% RH 72h)"), V007694 (flexural 5.452 XY);
  V007059, V011555, V011546 (Raise3D Industrial 6.03, 6.228, 5.731); V013877 (Raise3D Hyper Speed 5.0).
