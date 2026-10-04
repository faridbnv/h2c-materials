# Validation report

Database snapshot 2026-09-21 · build 2026-10-04

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 175 |
| h2cRelevant | 136 |
| familyEntries | 22 |
| retiredDuplicates | measurements 310, evidence 21, profiles 79 |
| excluded | 17 |
| grades | 1163 |
| measurements | 11509 |
| numericMeasurements | 11328 |
| quarantined | 24 |
| profiles | 1313 |
| evidence | 868 |
| prices | 357 |
| sources | 1918 |
| coverage | 947 |
| knowHow | 4867 |
| polymerEnvironment | 353 |
| polymerEvidence | 314 |
| coverageDerived | 1144 |

## Headline coverage

What a selection criterion can actually decide, out of 175 canonical materials.

| Headline | Materials with a value |
|---|---:|
| density | 145 |
| tensileModulusXY | 100 |
| tensileStrengthXY | 104 |
| tensileStrengthZ | 52 |
| elongationXY | 100 |
| charpyNotched | 39 |
| izodNotched | 26 |
| hdt045 | 99 |
| glassTransition | 83 |
| priceCADkg | 101 |

## H2C envelope gate

Baseline 350 C nozzle, 120 C bed, 65 C chamber.

| Axis | within | partial window | exceeds | exceeds (recommendation only) | unknown |
|---|---:|---:|---:|---:|---:|
| nozzle | 120 | n/a | 9 | 0 | 46 |
| bed | 121 | n/a | 7 | 0 | 47 |
| chamber | 89 | 4 | 9 | 0 | 73 |

A partial window is chamber-only: part of the published window is reachable at 65 C, never all of it.
Nozzle and bed are read by the upper end of the window.

## Chamber evidence

What the 136 in-scope materials publish about the chamber, strongest kind first. A statement
in words is manufacturer evidence but never a temperature. An estimated band is inference from
data/tables/chamber_bands.csv; it is shown beside the chamber question and changes no verdict.

| Kind | Materials |
|---|---:|
| Published temperature window | 61 |
| No heated chamber needed, in words | 32 |
| Chamber recommended, no temperature | 1 |
| Data sheet lists no setpoint | 4 |
| Nothing published | 38 |
| Carrying an estimated band (any of the last three) | 9 |

29 research bands are superseded by evidence and not used: PLA Metal (20-45 °C; publishes 25-45 °C), PLA Marble (20-45 °C; publishes 25-45 °C), PLA Sparkle (20-45 °C; publishes 25-45 °C), PLA Galaxy (20-45 °C; publishes 25-45 °C), PLA Silk (20-45 °C; publishes 0-45 °C), Support for PA/PET (20-45 °C; publishes 45-60 °C), PETG-CF (20-50 °C; publishes 20-65 °C), PETG-GF (20-50 °C; publishes 20-20 °C), PEBA (20-50 °C; a source says no heated chamber is needed), PP (20-50 °C; a source says no heated chamber is needed), PP-GF (20-50 °C; a source says no heated chamber is needed), OBC (20-50 °C; a source says no heated chamber is needed), CPE (20-50 °C; a source says no heated chamber is needed), CPE-CF (20-50 °C; a source says no heated chamber is needed), CoPE (20-50 °C; a source says no heated chamber is needed), PVB (20-50 °C; a source says no heated chamber is needed), ABS-ESD (45-70 °C; publishes 25-90 °C), ASA-GF (45-70 °C; publishes 25-60 °C), PC FR (45-70 °C; publishes 45-100 °C), PC-CF (45-70 °C; publishes at least 25 °C), PAHT-CF (45-70 °C; publishes 45-60 °C), PA6 (45-70 °C; publishes 20-60 °C), PET (45-70 °C; a source says no heated chamber is needed), PET-GF (45-70 °C; publishes 25-50 °C), PPS-CF (60-90 °C; publishes 25-90 °C), PPA (80-120 °C; a source says no heated chamber is needed), PPA-CF (80-120 °C; publishes 25-80 °C), PPA-GF (80-120 °C; publishes 25-80 °C), POM / Acetal (45-80 °C; publishes 70-140 °C).

## Environment evidence

A verdict category has findings that reduce to resistant, limited or not resistant, so it
can answer a pass/fail question. An indicator category has records but no reducible verdict
among them, so it can only show evidence and must never be offered as a hard constraint.

| Category | Kind | Records | With a verdict | Materials | From the base polymer |
|---|---|---:|---:|---:|---:|
| acid | verdict | 155 | 131 | 45 | 50 |
| alkali | verdict | 101 | 87 | 44 | 50 |
| oil-grease | verdict | 81 | 61 | 46 | 48 |
| organic-solvent | verdict | 103 | 50 | 51 | 50 |
| water-solubility | verdict | 42 | 41 | 34 | 34 |
| flammability | verdict | 46 | 36 | 37 | 13 |
| food-contact | indicator | 4 | 0 | 4 | 0 |
| uv-outdoor | verdict | 85 | 0 | 31 | 16 |
| moisture | verdict | 17 | 0 | 15 | 18 |
| creep | indicator | 2 | 0 | 2 | 0 |
| fatigue | indicator | 5 | 0 | 5 | 0 |
| hydrolysis | verdict | 10 | 0 | 10 | 35 |

## Polymer-level behaviour

353 rows of published base-polymer behaviour, attached as 314 inferred records to 79 materials
with no grade-level record in the category (D64). A record is shown in the drawer, counted apart in the filter rail, may screen a
material out under inference where the polymer is attacked or dissolved, and never passes a requirement.

| Category | Polymers | Agent rows | Materials covered | Of which may screen |
|---|---:|---:|---:|---:|
| acid | 21 | 94 | 50 | 14 |
| alkali | 20 | 43 | 50 | 13 |
| flammability | 4 | 4 | 13 | 11 |
| hydrolysis | 12 | 19 | 35 | 10 |
| moisture | 2 | 2 | 18 | 0 |
| oil-grease | 20 | 78 | 48 | 0 |
| organic-solvent | 23 | 87 | 50 | 18 |
| uv-outdoor | 8 | 8 | 16 | 1 |
| water-solubility | 15 | 18 | 34 | 1 |

## Estimates

A headline none of a material's products publishes comparably carries an estimate from one Gaussian model per
property that takes every observation in the snapshot, each converted to the headline's semantics
(build/mappings/estimate-model.json, DECISIONS D43). The likely range is 80% and the plausible range 95%. Both are
calibrated by hiding each material's typical product's value and predicting it from everything else; the build
fails if that coverage drifts. An estimate never passes a material; in Explore it may screen one out only when
its plausible range wholly fails.

| Headline | Observations | Hidden headlines | Likely range holds | Plausible range holds | Median likely width | Spread between products |
|---|---:|---:|---:|---:|---:|---:|
| density | 830 | 118 | 81% | 96% | ×1.11 | 0.0255 (14342 pairs) |
| tensileModulusXY | 1155 | 83 | 81% | 95% | ×1.52 | 0.32 (1288 pairs) |
| tensileStrengthXY | 1124 | 64 | 81% | 95% | ×1.46 | 0.236 (2567 pairs) |
| elongationXY | 1008 | 83 | 81% | 95% | ×3.74 | 0.687 (2385 pairs) |
| hdt045 | 1003 | 81 | 80% | 95% | 20.1 °C | 4.51 (3714 pairs) |

| Headline | Missing | From its one product | From its products | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 8 | 1 | 2 | 5 | 0 | 0 | 8 |
| tensileModulusXY | 49 | 13 | 23 | 3 | 4 | 6 | 39 |
| tensileStrengthXY | 45 | 12 | 20 | 2 | 4 | 7 | 34 |
| elongationXY | 49 | 12 | 21 | 6 | 4 | 6 | 39 |
| hdt045 | 50 | 11 | 9 | 8 | 19 | 3 | 27 |

Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most 10% of the time with 90% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.

| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |
|---|---|---:|---:|---:|---:|---:|
| density | this-grade | 5 | 1 | cannot screen | 0 | cannot screen |
| density | this-material | 85 | 0 | 97.5% point | 1 | 2.5% point |
| density | family | 118 | 8 | 97.83% point | 2 | 2.5% point |
| tensileModulusXY | this-grade | 75 | 3 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 66 | 1 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | family | 83 | 0 | 97.5% point | 2 | 2.5% point |
| tensileStrengthXY | this-grade | 54 | 0 | 97.5% point | 2 | 2.5% point |
| tensileStrengthXY | this-material | 54 | 0 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | family | 64 | 0 | 97.5% point | 3 | 1.74% point |
| elongationXY | this-grade | 42 | 1 | 97.5% point | 0 | 2.5% point |
| elongationXY | this-material | 66 | 1 | 97.5% point | 2 | 2.5% point |
| elongationXY | family | 83 | 2 | 97.5% point | 1 | 2.5% point |
| hdt045 | this-grade | 56 | 3 | 98.21% point | 1 | 2.5% point |
| hdt045 | this-material | 60 | 5 | 99.82% point | 1 | 2.5% point |
| hdt045 | family | 81 | 2 | 97.5% point | 0 | 2.5% point |

Floors (D126): the shown ranges of the same hidden headlines, floored by what the material's other measurements prove (a yield or break stress under the ultimate strength, a strain at yield under the strain at break, HDT at 1.8 MPa under HDT at 0.45 MPa); build/src/estimate/floors.js says what each row floors by. "printed" is the rule before D126, "unstated" the rule now, "formulation" what a grade's range takes.

| Headline | Floors | Hidden | Ranges moved | Likely holds | Plausible holds | Median likely width | Hidden values under the plausible range |
|---|---|---:|---:|---:|---:|---:|---:|
| tensileStrengthXY | none | 64 | 0 | 81.3% | 95.3% | ×1.46 | 3 |
| tensileStrengthXY | printed | 64 | 46 | 64.1% | 78.1% | ×1.45 | 14 |
| tensileStrengthXY | printedXY | 64 | 7 | 78.1% | 92.2% | ×1.46 | 5 |
| tensileStrengthXY | unstated | 64 | 59 | 29.7% | 31.3% | ×1.22 | 44 |
| tensileStrengthXY | containment | 64 | 12 | 85.9% | 92.2% | ×1.73 | 5 |
| tensileStrengthXY | sameSource | 64 | 46 | 62.5% | 76.6% | ×1.45 | 15 |
| tensileStrengthXY | lowestOfProducts | 64 | 59 | 79.7% | 85.9% | ×1.45 | 9 |
| tensileStrengthXY | formulation | 64 | 33 | 78.1% | 87.5% | ×1.45 | 8 |
| elongationXY | none | 83 | 0 | 80.7% | 95.2% | ×3.74 | 2 |
| elongationXY | printed | 83 | 55 | 53% | 67.5% | ×2.86 | 25 |
| elongationXY | printedXY | 83 | 14 | 77.1% | 91.6% | ×3.74 | 5 |
| elongationXY | unstated | 83 | 70 | 32.5% | 38.6% | ×2.03 | 51 |
| elongationXY | containment | 83 | 13 | 80.7% | 89.2% | ×6.94 | 8 |
| elongationXY | sameSource | 83 | 56 | 50.6% | 65.1% | ×2.81 | 27 |
| elongationXY | lowestOfProducts | 83 | 70 | 67.5% | 83.1% | ×3.41 | 13 |
| elongationXY | formulation | 83 | 42 | 69.9% | 84.3% | ×3.18 | 12 |
| hdt045 | none | 81 | 0 | 77.8% | 92.6% | 18.1 °C | 1 |
| hdt045 | printed | 81 | 37 | 65.4% | 80.2% | 17.7 °C | 11 |
| hdt045 | printedXY | 81 | 0 | 77.8% | 92.6% | 18.1 °C | 1 |
| hdt045 | unstated | 81 | 53 | 54.3% | 69.1% | 13.7 °C | 21 |
| hdt045 | containment | 81 | 6 | 79% | 92.6% | 19.5 °C | 1 |
| hdt045 | sameSource | 81 | 40 | 63% | 77.8% | 16.8 °C | 13 |
| hdt045 | lowestOfProducts | 81 | 47 | 72.8% | 87.7% | 16.4 °C | 6 |
| hdt045 | formulation | 81 | 26 | 77.8% | 93.8% | 18.1 °C | 1 |

Grade estimates (D81): each grade predicted at its own row and calibrated by hiding its own published values.

| Headline | Hidden values | Likely scale | Plausible scale | Likely coverage | Plausible coverage | Shipped |
|---|---:|---:|---:|---:|---:|---|
| density | 751 | 1.36 | 1.82 | 0.796 | 0.951 | yes |
| tensileModulusXY | 263 | 1.06 | 1.22 | 0.798 | 0.951 | yes |
| tensileStrengthXY | 286 | 1.12 | 1.14 | 0.797 | 0.944 | yes |
| elongationXY | 320 | 1.04 | 1.21 | 0.797 | 0.947 | yes |
| hdt045 | 363 | 1.91 | 3 | 0.791 | 0.92 | no: its grade scales reach the calibration clamp: a product's published value scatters about its material more than the model can say, so no grade range is shown |

EST-GRADE-OUTLIER, 29 grades: PLA 8, PLA Aero 4, PLA Wood 3, PA12-CF 3, PLA Marble 1, PLA-CF 1, PA66 1, PP 1, POM / Acetal 1, ABS 1, TPU 85A class and softer 1, PA6 1, PET-GF 1, PPA-CF 1, PPA-GF 1.

Evidence that contradicts everything else and was down-weighted (EST-CONFLICT, 208 observations):

By material: PLA 29, PLA Aero 11, PA12-CF 10, PA6-CF 9, PPA-CF 8, PETG 7, TPU 95A class 7, ABS 6, PA6-GF 6, PA6 5, PP-CF 5, PLA Metal 4, PLA Wood 4, CPE-CF 4, PAHT-CF 4, PPS-CF 4, nGen FLEX 4, CPE 4, ABS-GF 4, PPA-GF 4, PLA-CF 3, ASA 3, PLA Silk 3, ASA Aero 3, ABS-CF 3, PA12 3, PET-GF 3, PA66 2, PP 2, PLA-EC 2, PAHT-CE 2, PLA-NF 2, PET-LW 2, OBC 2, TPC-ESD 2, PBAT 2, TPU-GF 2, TPU 85A class and softer 2, PC 2, BVOH 2, PCTG 2, nGen / Amphora 2, PA12-GF 2, PA6/66 2, PPA 2, PLA Marble 1, PLA Sparkle 1, PVA 1, POM / Acetal 1, PETG-CF 1, COC 1, ASA-GF 1, TPC / TPEE 1, PVDF 1, PPS-ESD 1, TPU harder than 95A 1, HIPS 1.

- PLA, density: density 1240 (V008736)
- PLA, density: density 1240 (V009024)
- PLA, density: density 1200 (V009118)
- PLA, density: density 2300 (V009181)
- PLA, density: density 1660 (V009217)
- PLA, density: density 1850 (V009267)
- PLA, density: density 2300 (V009282)
- PLA, density: density 1340 (V010204)
- PLA Metal, density: density 2360, 2360 (V004044, V004066)
- PLA Metal, density: density 2330, 2330 (V004048, V004062)
- PLA Metal, density: density 1225 (V007387)
- PLA Metal, density: density 1200 (V009065)
- PLA Marble, density: density 1700 (V009757)
- PLA Sparkle, density: density 1410 (V009182)
- PLA Wood, density: density 1020 (V005557)
- PLA Wood, density: density 700 (V009165)
- PLA Wood, density: density 970 (V010031)
- PLA Wood, density: density 1300 (V011067)
- PLA Aero, density: density 1210 (V000303)
- PLA Aero, density: density 1240 (V002975)
- PLA Aero, density: density 900, 900 (V003554, V003652)
- PLA Aero, density: density 840 (V004522)
- PLA Aero, density: density 1210 (V004816)
- PLA Aero, density: density 1200 (V006763)
- PLA-CF, density: density 1420 (V009909)
- ABS, density: density 1130 (V009059)
- ABS, density: density 1100 (V010441)
- ASA, density: density 1150 (V008987)
- PA6, density: density 1250 (V000917)
- PA6-GF, density: density 1140 (V000943)
- PA12-CF, density: density 1230 (V006956)
- PA66, density: density moulded 1140 (V002033)
- PA66, density: density 1300 (V011134)
- PVA, density: density 1370 (V010405)
- PP, density: density 750 (V010415)
- PP-CF, density: density 1100 (V001502)
- POM / Acetal, density: density 1140 (V002322)
- CPE-CF, density: density 1160 (V001676)
- CPE-CF, density: density moulded 1400 (V010343)
- PLA-EC, density: density 1350 (V003052)
- PLA-EC, density: density 1240 (V009037)
- PAHT-CE, density: density 1250 (V009726)
- PAHT-CE, density: density 1490 (V009738)
- PLA-NF, density: density 1450 (V010252)
- PLA-NF, density: density 1250 (V010283)
- PLA, tensileModulusXY: flexural XY 2.493 (V002691)
- PLA, tensileModulusXY: tensile XY 0.4328 (V011510)
- PLA Silk, tensileModulusXY: tensile XY 0.597 (V004369)
- PLA Silk, tensileModulusXY: tensile Z 0.363 (V004370)
- PLA Silk, tensileModulusXY: flexural XY 2.473 (V004375)
- PLA Aero, tensileModulusXY: tensile moulded 3.5 (V005766)
- PLA Aero, tensileModulusXY: tensile Z 0.254 (V009907)
- PLA Aero, tensileModulusXY: tensile XY 0.86 (V011573)
- PETG, tensileModulusXY: tensile XY 0.5 (V004389)
- PETG, tensileModulusXY: tensile Z 0.3 (V004390)
- PETG, tensileModulusXY: flexural XY 1.9 (V004395)
- PETG, tensileModulusXY: flexural XY 1, 1 (V005876, V006298)
- PETG-CF, tensileModulusXY: flexural unk 0.065 (V007718)
- ABS, tensileModulusXY: tensile Z 0.21716 (V005140)
- ASA Aero, tensileModulusXY: tensile XY 0.824 (V005747)
- ASA Aero, tensileModulusXY: tensile moulded 2.2 (V011587)
- ASA Aero, tensileModulusXY: flexural moulded 2.3 (V011590)
- PAHT-CF, tensileModulusXY: tensile Z 2.75 (V009943)
- PA6-CF, tensileModulusXY: tensile moulded 1.1 (V004325)
- PA6-GF, tensileModulusXY: flexural XY 0.2, 0.0575 (V005395, V005396)
- PA12-CF, tensileModulusXY: tensile unk 0.5 (V010096)
- PPA-CF, tensileModulusXY: tensile Z 4.3 (V001311)
- PPS-CF, tensileModulusXY: tensile Z 2.85 (V001362)
- PPS-CF, tensileModulusXY: tensile XY 7.46 (V001865)
- PPS-CF, tensileModulusXY: tensile Z 2.72 (V001867)
- CPE-CF, tensileModulusXY: tensile XY 5.15 (V010336)
- CPE-CF, tensileModulusXY: flexural XY 2.7 (V010339)
- COC, tensileModulusXY: tensile unk 0.05 (V010402)
- PET-LW, tensileModulusXY: tensile XY 1.5 (V011402)
- PET-LW, tensileModulusXY: flexural XY 0.5232 (V011408)
- PLA, tensileStrengthXY: ultimate XY 28.004 (V008589)
- PLA, tensileStrengthXY: flexural XY 85.809 (V008591)
- PLA, tensileStrengthXY: ultimate XY 23.2, 23.2 (V010173, V010349)
- PLA Aero, tensileStrengthXY: ultimate XY 10 (V011575)
- PLA Aero, tensileStrengthXY: ultimate XY 9 (V011581)
- ABS, tensileStrengthXY: ultimate XY 27 (V008933)
- ABS, tensileStrengthXY: flexural XY 92.38 (V008936)
- ASA-GF, tensileStrengthXY: flexural unk 27.2 (V002205)
- TPC / TPEE, tensileStrengthXY: flexural unk 1.96133 (V007467)
- PA6-CF, tensileStrengthXY: ultimate XY 53 (V005126)
- PA6-CF, tensileStrengthXY: flexural XY 140 (V005130)
- PP-CF, tensileStrengthXY: break XY 78 (V001503)
- PP-CF, tensileStrengthXY: flexural XY 68 (V001506)
- OBC, tensileStrengthXY: break XY 14 (V007765)
- OBC, tensileStrengthXY: flexural XY 7.8 (V007768)
- PVDF, tensileStrengthXY: flexural XY 50 (V001607)
- TPC-ESD, tensileStrengthXY: break XY 70 (V003135)
- TPC-ESD, tensileStrengthXY: flexural XY 50 (V003137)
- PPS-ESD, tensileStrengthXY: flexural XY 55 (V003314)
- PBAT, tensileStrengthXY: ultimate XY 27 (V005365)
- PBAT, tensileStrengthXY: flexural XY 7 (V005368)
- nGen FLEX, tensileStrengthXY: ultimate XY 19.3 (V005860)
- nGen FLEX, tensileStrengthXY: flexural XY 8.9 (V005863)
- TPU-GF, tensileStrengthXY: break XY 32 (V010101)
- TPU-GF, tensileStrengthXY: flexural unk 15 (V010104)
- TPU 85A class and softer, tensileStrengthXY: ultimate XY 30 (V005838)
- TPU 85A class and softer, tensileStrengthXY: flexural XY 1.55 (V005841)
- TPU 95A class, tensileStrengthXY: ultimate XY 31 (V004770)
- TPU 95A class, tensileStrengthXY: ultimate XY 27 (V005374)
- TPU 95A class, tensileStrengthXY: flexural XY 7 (V005377)
- TPU 95A class, tensileStrengthXY: ultimate XY 17 (V005940)
- TPU 95A class, tensileStrengthXY: flexural XY 2.9 (V005943)
- TPU 95A class, tensileStrengthXY: flexural unk 4.26 (V007898)
- TPU 95A class, tensileStrengthXY: flexural unk 4.26 (V008726)
- PLA, elongationXY: break XY 34.5, 27.8 (V003649, V003863)
- PLA, elongationXY: break Z 0.9 (V003864)
- PETG, elongationXY: break unk 210 (V002848)
- PETG, elongationXY: break unk 165 (V005570)
- PETG, elongationXY: break unk 250, 240 (V007295, V007305)
- PC, elongationXY: break unk 150 (V005610)
- BVOH, elongationXY: break XY 14.8 (V002264)
- BVOH, elongationXY: break Z 0.6 (V002265)
- PP, elongationXY: break unk 500, 637 (V002670, V002772)
- PCTG, elongationXY: break unk 220, 340, 220, 220, 220 (V001537, V007399, V007409, V007810, V011043)
- PCTG, elongationXY: break unk 220, 220 (V010648, V010807)
- CPE, elongationXY: break XY 6.2 (V010008)
- CPE, elongationXY: break unk 110 (V010216)
- nGen / Amphora, elongationXY: break XY 11, 11 (V001958, V005885)
- nGen / Amphora, elongationXY: break unk 193 (V005921)
- TPU harder than 95A, elongationXY: break Z 31 (V000780)
- PLA, hdt045: HDT 0.45 116 (V002780)
- PLA, hdt045: HDT 1.8 amorphous 66 (V002781)
- PLA, hdt045: Vicat amorphous 140 (V002877)
- PLA, hdt045: Tg amorphous 55 (V003211)
- PLA, hdt045: HDT 0.45 80 (V003212)
- PLA, hdt045: Tg amorphous 59.15 (V003899)
- PLA, hdt045: Vicat amorphous 148.3 (V003900)
- PLA, hdt045: HDT 0.45 90 (V005586)
- PLA, hdt045: HDT 0.45 135 (V005853)
- PLA, hdt045: HDT 0.45 80 (V007474)
- PLA, hdt045: HDT 0.45 110 (V007602)
- PLA, hdt045: Vicat amorphous 140 (V007603)
- PLA, hdt045: Tg amorphous 55 (V010210)
- PLA, hdt045: HDT 0.45 89 (V010211)
- PLA-CF, hdt045: Tg amorphous 60 (V003308)
- PLA-CF, hdt045: HDT 0.45 91 (V003309)
- ABS, hdt045: HDT 0.45 90 (V006761)
- ABS-GF, hdt045: HDT 0.45 97 (V002535)
- ABS-GF, hdt045: Tg amorphous 135 (V004463)
- ABS-GF, hdt045: HDT 0.45 82 (V005111)
- ABS-GF, hdt045: HDT 0.45 88 (V005448)
- ABS-CF, hdt045: Tg amorphous 105 (V000593)
- ABS-CF, hdt045: HDT 0.45 76 (V000594)
- ABS-CF, hdt045: HDT 0.45 78 (V002175)
- ASA, hdt045: HDT 0.45 82 (V004829)
- ASA, hdt045: Vicat amorphous 68 (V009515)
- PC, hdt045: HDT 0.45 101, 101 (V004707, V008720)
- PAHT-CF, hdt045: HDT 0.45 194 (V000902)
- PAHT-CF, hdt045: Tm semi-filled 234, 234 (V002459, V007639)
- PAHT-CF, hdt045: HDT 0.45 145 (V002464)
- PA6, hdt045: HDT 0.45 60 (V002994)
- PA6, hdt045: HDT 0.45 140 (V007666)
- PA6, hdt045: HDT unstated 186 (V007868)
- PA6, hdt045: HDT 0.45 143 (V011191)
- PA6-CF, hdt045: HDT 1.8 semi-filled 65 (V002731)
- PA6-CF, hdt045: HDT 0.45 203, 209 (V004530, V008619)
- PA6-CF, hdt045: HDT 0.45 200 (V005171)
- PA6-CF, hdt045: HDT 0.45 147 (V006453)
- PA6-CF, hdt045: HDT 0.45 215 (V006543)
- PA6-CF, hdt045: HDT 0.45 140 (V007553)
- PA6-GF, hdt045: HDT 1.8 semi-filled 65 (V002720)
- PA6-GF, hdt045: HDT 0.45 205.2, 205 (V004592, V008235)
- PA6-GF, hdt045: HDT 0.45 210 (V005579)
- PA6-GF, hdt045: HDT 0.45 161, 185 (V009369, V011591)
- PA12, hdt045: HDT 0.45 94.7 (V002003)
- PA12, hdt045: HDT 0.45 100 (V005723)
- PA12, hdt045: HDT 0.45 135, 135, 135 (V010790, V010909, V011063)
- PA12-CF, hdt045: HDT 0.45 170, 170 (V002094, V006516)
- PA12-CF, hdt045: HDT 0.45 175, 176 (V004504, V008197)
- PA12-CF, hdt045: HDT 0.45 185 (V004841)
- PA12-CF, hdt045: HDT 0.45 90 (V006964)
- PA12-CF, hdt045: HDT 0.45 48 (V007204)
- PA12-CF, hdt045: Tm semi-filled 170 (V007206)
- PA12-CF, hdt045: HDT 0.45 167 (V010200)
- PA12-CF, hdt045: HDT 0.45 170, 170 (V010714, V010798)
- PA12-GF, hdt045: HDT 0.45 150 (V001014)
- PA12-GF, hdt045: HDT 0.45 175, 172 (V010699, V010940)
- PA6/66, hdt045: HDT 0.45 140 (V001051)
- PA6/66, hdt045: HDT 0.45 102 (V011154)
- PET-GF, hdt045: HDT 0.45 81.6 (V001931)
- PET-GF, hdt045: HDT 0.45 200 (V005260)
- PET-GF, hdt045: HDT 1.8 amorphous 99.1 (V008153)
- PPA, hdt045: HDT 0.45 103 (V002224)
- PPA, hdt045: HDT 0.45 81 (V002549)
- PPA-CF, hdt045: HDT 0.45 227 (V001308)
- PPA-CF, hdt045: Tm semi-filled 232 (V002570)
- PPA-CF, hdt045: HDT 0.45 84.5 (V002574)
- PPA-CF, hdt045: Tm semi-filled 239 (V002596)
- PPA-CF, hdt045: HDT 0.45 97 (V002600)
- PPA-CF, hdt045: HDT 0.45 240, 240 (V003220, V003236)
- PPA-CF, hdt045: HDT 0.45 220 (V005246)
- PPA-GF, hdt045: HDT 0.45 227 (V001326)
- PPA-GF, hdt045: Tm semi-filled 232 (V002625)
- PPA-GF, hdt045: HDT 0.45 84 (V002629)
- PPA-GF, hdt045: HDT 0.45 220 (V005306)
- PPS-CF, hdt045: HDT 1.8 semi-filled 133 (V006394)
- HIPS, hdt045: HDT 0.45 80 (V001477)
- PP-CF, hdt045: HDT 0.45 124 (V001508)
- PP-CF, hdt045: HDT 0.45 88 (V007762)
- CPE, hdt045: HDT 0.45 99 (V005512)
- CPE, hdt045: HDT 0.45 100 (V010766)
- nGen FLEX, hdt045: HDT 0.45 moulded amorphous 100 (V005870)
- nGen FLEX, hdt045: Vicat amorphous 170 (V006009)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- PA6-GS, density: 1010 kg/m³, expected about 1400
- PLA-EC, density: 1240 kg/m³, expected about 1520
- PBAT, tensileModulusXY: 0.006 GPa, expected about 1.01
- nGen-CF, tensileStrengthXY: 44.7 MPa, expected about 54.4
- PA6, hdt045: 140 °C, expected about 93
- PA12, hdt045: 135 °C, expected about 89.6

## Consistency

Every one of the 175 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade;
- every product value cites a measurement of that product that is not quarantined (4351 checked), and a material's typical product is one of its own;
- every cited measurement, profile and use record exists and belongs to that material, except use, durability and safety notes, which may cite family context;
- nozzle, bed and chamber guidance quote the profile the row cites;
- Environmental evidence cites exactly the material's own exposure, solubility and moisture records;
- a polymer-level record (D64) is attached only where the material has no record of its own in the category, and names its own Estimate identity;
- no coverage row says Gap beside the material's own data or claims evidence it does not have, for mechanical, thermal, print setup, environmental and price, and a Grades row quotes the true manufacturer count.

## Reference layer

114 generic entries, 10 shown by default. Never part of the candidate set.

## Warnings

These are not defects. They record what the compiled database cannot support, so the
interface can say so rather than implying a certainty it does not have.

- `PARSE-UNREAD` **Print setup row 1284** — Enclosure text not parsed: "Enclosed-frame (rec.), open-frame"
- `PARSE-UNREAD` **Print setup row 1286** — Enclosure text not parsed: "Enclosed-frame (rec.), open-frame"
- `NO-MEASUREMENTS` **materials** — 2 materials have no property measurements at all: PA66-CF, PA612-GF
- `EST-REJECTED` **measurements** — 8 values are physically impossible for their property and were kept out of the estimate model: V009231 PLA Density 3900 kg/m³; V009245 PLA Density 3130 kg/m³; V009254 PLA Density 3900 kg/m³; V009275 PLA Density 3130 kg/m³; V009486 PLA Density 4000 kg/m³; V009522 PLA Metal Density 2780 kg/m³; V009638 PLA Metal Density 3400 kg/m³; V009775 PLA Metal Density 3500 kg/m³
- `EST-OUTLIER` **materials** — 6 measured headlines sit far outside what every other observation predicts; check the source and the grade: PA6-GS density 1010 (expected about 1400); PLA-EC density 1240 (expected about 1520); PBAT tensileModulusXY 0.006 (expected about 1.01); nGen-CF tensileStrengthXY 44.7 (expected about 54.4); PA6 hdt045 140 (expected about 93); PA12 hdt045 135 (expected about 89.6)
- `EST-FAMILY-ORDER` **materials** — 5 reinforced materials sit below their unfilled sibling: ABS-AF tensileModulusXY 1.89 < ABS 2.2; ASA-AF tensileModulusXY 1.91 (estimate) < ASA 2.1746; PBT-GF hdt045 175 < PBT 180; PA12-AF hdt045 109 (estimate) < PA12 135; Nylon-GF, maker-undisclosed polyamide tensileModulusXY 3.1 < Nylon, maker-undisclosed polyamide 3.16485
