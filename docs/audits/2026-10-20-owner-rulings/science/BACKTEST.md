# The materials-science rulings: what was back-tested

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../OPEN-PROBLEMS.md).

> **In short.** Two changes touched the estimate model's frozen inputs (D58, D138), and each was measured the way stage 4
> measured its changes ([stage-4-backtests.md](../../2026-10-18-screening-build/stage-4-backtests.md)): build with and
> without the change on the same data, and compare how often the likely (80 %) and plausible (95 %) ranges held the values
> the build hid. **SBC's row in polymers.csv** was kept: calibration holds on every headline and its product's estimates
> hold its own values. **PET as "prints amorphous unless fibre-filled"** was rejected: calibration held, but only by
> giving a PET fill a range about 106 °C wide, centred 40 to 90 °C above every as-printed bar its makers state.
> After the round's review, two more were measured: SBC's row again on the merged data (it moves no crystalline-filled
> stiffness coverage; §1), and the other track's "cosmetic dense filler" variant (m470, D175; calibration holds; §3).
> The numbers are the build's own (`meta.estimateModel`), read by [calibration.mjs](calibration.mjs).

How to read the tables. **Held** is how many hidden values were predicted; **likely** and **plausible** are how often the
80 % and 95 % ranges held them. EST-CALIBRATION, the build's check, asks about 80 % (70 to 90) and at least 90 %.

## 1. SBC gets a polymers.csv row (m475, D176; kept)

**The change.** `polymers.csv` gains SBC (styrenic, amorphous, neat density 1010 to 1020 kg/m³ from INEOS Styrolution's
Styrolux 656C and K-Resin KR03) and FormFutura's Crystal Flex material (M174) names it as its Estimate identity, so the
model estimates it. "Without" is the same data with M174's identity Not applicable (release 31e19d934e55); "with" is m475's
build (release ef15ddef056d).

| Headline | Materials held, without → with | Likely / plausible, without → with | Products held | Products' likely / plausible, without → with |
|---|---:|---|---:|---|
| density | 120 → 121 | 80.0 / 95.0 → 80.2 / 95.0 % | 832 | 79.8 / 95.1 → 79.8 / 95.1 % |
| tensileModulusXY | 74 → 74 | 81.1 / 95.9 → same | 296 | 80.1 / 95.3 → 80.1 / 94.9 % |
| tensileStrengthXY | 59 → 59 | 81.4 / 96.6 → same | 303 | 79.2 / 93.7 → 78.5 / 94.1 % |
| elongationXY | 79 → 79 | 81.0 / 96.2 → same | 334 | 79.6 / 94.9 → 79.6 / 95.2 % |
| hdt045 | 72 → 72 | 80.6 / 95.8 → same | 412 | 80.1 / 95.1 → 80.1 / 95.1 % |

One hidden case joins (SBC's density, held). The product calibration moves by refitting the spreads it shares with the
other groups, within a point; by matrix, the crystalline-filled stiffness plausible coverage moved 92.9 → 89.3 % (28
products, a stratum the check does not hold to 90 %) and heat deflection's 92.3 → 90.4 % (52, still above 90 %).

**Again on the merged data (the round's review, F6b).** The review asked whether SBC's row causes the crystalline-filled
stiffness stratum's 89.3 %. Built again with and without the row on the round's merged data after m479 ("with" release
18f3fc84c331; "without" the same data with M174's identity Not applicable, release 1f0d98ee6951, thrown away):

| Headline | Materials held, without → with | Likely / plausible | Products held | Products' likely / plausible, without → with |
|---|---:|---|---:|---|
| density | 120 → 121 | 80.0 / 95.0 → 80.2 / 95.0 % | 832 | 79.6 / 95.0 → 79.4 / 95.1 % |
| tensileModulusXY | 74 | 81.1 / 95.9 %, both | 296 | 79.7 / 95.3 → 80.1 / 95.3 % |
| tensileStrengthXY | 59 | 81.4 / 96.6 %, both | 303 | 79.2 / 94.1 %, both |
| elongationXY | 79 | 81.0 / 96.2 %, both | 334 | 79.6 / 94.9 → 79.3 / 94.9 % |
| hdt045 | 72 | 80.6 / 95.8 %, both | 414 | 80.2 / 95.2 → 80.0 / 95.2 % |

The crystalline-filled products' stiffness reads 67.9 / 92.9 % (28 products) with the row and without it, and heat
deflection's crystalline-filled 80.8 / 92.3 % (52) and unfilled 74.1 / 100 % (27) both ways. So the row does not cause
the 89.3 %: that figure is m475's build before the merge, where one product of 28 (3.6 points) crossed its range's edge as
the spreads every group shares were refit. The stratum sits on that edge whatever moves the refit: stage 4 measured it
at 67.9 / 89.3 % with the pooled spread before SBC existed ([stage-4-backtests.md](../../2026-10-18-screening-build/stage-4-backtests.md),
"Stiffness keeps one spread"). Nor is it held to 90 %: EST-CALIBRATION holds each matrix to 80 / 90 % only for a headline
whose product spread is set per matrix (D162, `build/src/estimate/validate.js`), which is heat deflection alone; stiffness
keeps one spread because its own per-matrix spread held that matrix worse (53.6 / 85.7 %). Its likely 67.9 %, under the
70 % tolerance, is the same with and without the row. Nothing to do for SBC; the stratum is the estimate stage's, as stage
4 left it.

**Crystal Flex's estimates against what it and its resins print.**

| Headline | Its own value | Estimate (likely; plausible) | What INEOS prints |
|---|---|---|---|
| tensileModulusXY | none (flexural 1.795 GPa) | 1.6 GPa (1.06–2.41; 0.75–3.42) | Styrolux 656C 1.8 GPa; K-Resin KR03 240 ksi (1.65 GPa) |
| tensileStrengthXY | 26 MPa (yield) | 27.9 MPa (26.1–31.3; 26–33.5) | 656C 35 MPa; KR03 3800 psi (26 MPa) |
| elongationXY | 230 % | 108 % (69–185; 60.5–252) | KR03 230 % |
| hdt045 | none (Vicat 82 °C) | 78 °C (69.5–85.6; 61.4–90.1) | 656C HDT B 77 °C |

**Verdict.** Kept. EST-CALIBRATION holds on every headline, material and product; its product's own values and its resins'
figures lie inside its ranges.

## 2. PET as "prints amorphous unless fibre-filled" (rejected; the model kept)

**The change tested.** PET's row of polymers.csv set to "prints amorphous unless fibre-filled", as PPA's is, so PET-CF and
PET-GF products are modelled as crystallising in the print (their heat deflection driven by PET's 252 °C melting point).
Built on m474's data and thrown away; "kept" is m474's build.

**Calibration** (all hidden values): heat deflection's material ranges 80.6 / 95.8 % either way (scales 1.27 / 1.66 →
1.05 / 1.25, median likely width 13.0 → 11.5 °C); products 80.1 / 95.1 % either way, the crystalline-filled matrix 80.8 /
92.3 → 78.6 / 94.6 % (52 → 56 products). EST-CALIBRATION holds both ways: the check cannot tell them apart, because the
hidden PET-fill values are few and partly annealed.

**What it does to PET fills.** The makers that state their bar's treatment print, as printed: Polymaker PET-GF15 81.6 °C,
Raise3D Industrial PET CF 87 °C, Flashforge PET-CF 100 °C, BASF Ultrafuse PET CF15 74 °C (and 120 to 205 °C only after
annealing). The estimates for PET fills that publish no as-printed value:

| Product | Kept: as-printed estimate (likely; plausible) | "Unless fibre-filled" |
|---|---|---|
| Bambu Lab PET-CF | 87.4 °C (79.8–94.7; 73–99.8) | 177 °C (154–200; 139–215) |
| Polymaker Fiberon PET-CF17 | 84.2 °C (77.9–90.3; 72.5–95) | 155 °C (132–177; 117–189) |
| Spectrum PET CF15 | 88.7 °C (81.2–95.9; 74.4–101) | 131 °C (79.8–186; 57.1–219) |
| Raise3D Hyper Speed PET CF | 85.3 °C (77.5–92.9; 70.6–98.2) | 104 °C (73.7–135; 57.1–156) |
| SIDDAMENT PET CF | 85.3 °C (77.2–93; 70.2–98.4) | 129 °C (77.9–183; 55.3–217) |
| Flashforge PET-GF | 75.4 °C (67.4–82.9; 59.7–87.2) | 119 °C (70.2–173; 52.8–209) |

The kept model's ranges hold every stated as-printed PET-fill bar (74 to 100 °C); the alternative's centres sit 40 to
90 °C above them, its ranges are up to 106 °C wide, and Bambu Lab PET-CF's is the annealed figure D167 removed. Over the
decision census it moved 193 product answers and tagged Bambu Lab PET-CF and Polymaker PET-CF17 "likely" for heat limits
their own makers' as-printed bars miss.

**Verdict.** Rejected: it fails physics and the makers' own as-printed figures while passing a check that cannot see
them. PET's row is unchanged; the four crystallised-looking bars were read again and recorded for what they are (m473).

## 3. A filler for looks gets a term of its own (m470, D175; the round's review, F6a)

**The change.** The round's small-rules track (D175, m470) re-filed eleven matte and glitter products (Spectrum PET-G MATT,
eSUN PETG-Matte, Extrudr XPETG MATT, FormFutura Matt PLA, AzureFilm PLA Matte (HS), SUNLU High Speed Matte PLA, PLA Lite
and PLA Classic, Eryone PLA-Lite, eSUN eTwinkling, Recreus PLA) from "undisclosed dense filler" to a new Variant,
"cosmetic dense filler". The estimate model gives each Variant a term of its own, so these eleven left the metal fills'
term, and the review counted 607 product estimates moved, with no calibration record. "Before" is the round's merged data
with the eleven mapped back to "undisclosed dense filler" (release ed19b35658f8, thrown away); "after" is the merged data
as committed after m479 (release 18f3fc84c331).

| Headline | Materials held | Likely / plausible, before → after | Products held | Products' likely / plausible, before → after |
|---|---:|---|---:|---|
| density | 121 | 80.2 / 95.0 %, both (scales 1.10/1.46 → 1.13/1.48) | 832 | 79.8 / 95.1 → 79.4 / 95.1 % |
| tensileModulusXY | 74 | 81.1 / 95.9 %, both | 296 | 80.1 / 94.9 → 80.1 / 95.3 % |
| tensileStrengthXY | 59 | 81.4 / 96.6 %, both (scales 1.24/1.46 → 1.21/1.37) | 303 | 79.2 / 94.4 → 79.2 / 94.1 % |
| elongationXY | 79 | 81.0 / 96.2 %, both (width ×5.10 → ×4.51) | 334 | 79.3 / 95.2 → 79.3 / 94.9 % |
| hdt045 | 72 | 80.6 / 95.8 %, both | 414 | 80.2 / 95.2 → 80.0 / 95.2 % |

**By matrix (products).** Heat deflection, the one headline held per matrix: crystalline-filled 80.8 / 92.3 % both ways,
unfilled 70.4 → 74.1 % / 100 %, glassy 80.9 → 80.3 % / 95.2 %; it holds. The strata the check does not hold move through
the shared refit, not through the eleven (all PLA and PETG, which print glassy): density's crystalline-unfilled products
72.5 / 90.2 → 66.7 / 88.2 % (51), strength's 100 → 88.9 % plausible (9, under the 20 the check counts), stretch's 90.9 →
81.8 % (11), and the elastomers' stretch 76.7 → 80.0 % likely (30). The materials' strata are unchanged but for signed
errors in the third decimal; filled PLA's density stays 60 / 80 % (OPEN-PROBLEMS §38.10, as stage 4 left it).

**Verdict.** Calibration holds: EST-CALIBRATION passes before and after on every headline, material, product and heat
matrix, and no headline's coverage moves by more than half a point. The 607 moved estimates are the refit of a grid the
whole model shares (median 0.2 % each, D175), the kind of move every Variant change makes. One stratum the check does not
hold drops below 90 %, the crystalline-unfilled products' density (88.2 %, 51 products, its likely 66.7 % under the 70 %
tolerance): it is noted in OPEN-PROBLEMS §38.10 beside filled PLA's density. What the refit moved in answers is D175's
decision diff: 16 product answers between "not enough data", "unlikely" and "likely", no material verdict.

