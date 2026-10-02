# Validation report

Database snapshot 2026-09-21 · build 2026-10-02

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 175 |
| h2cRelevant | 136 |
| familyEntries | 22 |
| retiredDuplicates | measurements 310, evidence 17, profiles 79 |
| excluded | 17 |
| grades | 1163 |
| measurements | 11477 |
| numericMeasurements | 11296 |
| quarantined | 24 |
| profiles | 1286 |
| evidence | 770 |
| prices | 357 |
| sources | 1846 |
| coverage | 885 |
| knowHow | 4698 |
| polymerEnvironment | 353 |
| polymerEvidence | 325 |
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
| acid | verdict | 137 | 120 | 43 | 52 |
| alkali | verdict | 69 | 62 | 42 | 52 |
| organic-solvent | verdict | 85 | 45 | 46 | 55 |
| oil-grease | verdict | 63 | 45 | 44 | 50 |
| water-solubility | verdict | 42 | 41 | 34 | 34 |
| flammability | verdict | 44 | 36 | 36 | 13 |
| food-contact | indicator | 3 | 0 | 3 | 0 |
| uv-outdoor | verdict | 79 | 0 | 28 | 16 |
| moisture | verdict | 16 | 0 | 14 | 18 |
| creep | indicator | 2 | 0 | 2 | 0 |
| fatigue | indicator | 5 | 0 | 5 | 0 |
| hydrolysis | verdict | 10 | 0 | 10 | 35 |

## Polymer-level behaviour

353 rows of published base-polymer behaviour, attached as 325 inferred records to 79 materials
with no grade-level record in the category (D64). A record is shown in the drawer, counted apart in the filter rail, may screen a
material out under inference where the polymer is attacked or dissolved, and never passes a requirement.

| Category | Polymers | Agent rows | Materials covered | Of which may screen |
|---|---:|---:|---:|---:|
| acid | 21 | 94 | 52 | 15 |
| alkali | 20 | 43 | 52 | 13 |
| flammability | 4 | 4 | 13 | 11 |
| hydrolysis | 12 | 19 | 35 | 10 |
| moisture | 2 | 2 | 18 | 0 |
| oil-grease | 20 | 78 | 50 | 0 |
| organic-solvent | 23 | 87 | 55 | 18 |
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
| density | 829 | 118 | 81% | 96% | ×1.11 | 0.0255 (14326 pairs) |
| tensileModulusXY | 1156 | 83 | 81% | 95% | ×1.54 | 0.325 (1281 pairs) |
| tensileStrengthXY | 1124 | 65 | 80% | 95% | ×1.44 | 0.237 (2558 pairs) |
| elongationXY | 1006 | 83 | 81% | 95% | ×3.77 | 0.688 (2376 pairs) |
| hdt045 | 999 | 81 | 80% | 95% | 19.8 °C | 4.51 (3715 pairs) |

| Headline | Missing | From its one product | From its products | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 8 | 1 | 2 | 5 | 0 | 0 | 8 |
| tensileModulusXY | 49 | 13 | 23 | 3 | 4 | 6 | 39 |
| tensileStrengthXY | 45 | 12 | 20 | 2 | 4 | 7 | 34 |
| elongationXY | 49 | 12 | 21 | 6 | 4 | 6 | 39 |
| hdt045 | 50 | 11 | 9 | 8 | 19 | 3 | 28 |

Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most 10% of the time with 90% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.

| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |
|---|---|---:|---:|---:|---:|---:|
| density | this-grade | 5 | 1 | cannot screen | 0 | cannot screen |
| density | this-material | 85 | 0 | 97.5% point | 1 | 2.5% point |
| density | family | 118 | 8 | 97.76% point | 2 | 2.5% point |
| tensileModulusXY | this-grade | 75 | 3 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 66 | 0 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | family | 83 | 0 | 97.5% point | 2 | 2.5% point |
| tensileStrengthXY | this-grade | 55 | 1 | 97.5% point | 2 | 2.5% point |
| tensileStrengthXY | this-material | 55 | 0 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | family | 65 | 0 | 97.5% point | 3 | 2.5% point |
| elongationXY | this-grade | 42 | 0 | 97.5% point | 0 | 2.5% point |
| elongationXY | this-material | 66 | 2 | 97.5% point | 2 | 2.5% point |
| elongationXY | family | 83 | 2 | 97.5% point | 1 | 2.5% point |
| hdt045 | this-grade | 56 | 3 | 98.12% point | 1 | 2.5% point |
| hdt045 | this-material | 60 | 5 | 99.81% point | 1 | 2.5% point |
| hdt045 | family | 81 | 2 | 97.5% point | 0 | 2.5% point |

Grade estimates (D81): each grade predicted at its own row and calibrated by hiding its own published values.

| Headline | Hidden values | Likely scale | Plausible scale | Likely coverage | Plausible coverage | Shipped |
|---|---:|---:|---:|---:|---:|---|
| density | 750 | 1.35 | 1.83 | 0.796 | 0.951 | yes |
| tensileModulusXY | 263 | 1.05 | 1.19 | 0.798 | 0.947 | yes |
| tensileStrengthXY | 286 | 1.12 | 1.16 | 0.79 | 0.944 | yes |
| elongationXY | 320 | 1.04 | 1.21 | 0.8 | 0.944 | yes |
| hdt045 | 364 | 1.97 | 3 | 0.791 | 0.92 | no: its grade scales reach the calibration clamp: a product's published value scatters about its material more than the model can say, so no grade range is shown |

EST-GRADE-OUTLIER, 29 grades: PLA 8, PLA Aero 4, PLA Wood 3, PA12-CF 3, PLA Marble 1, PLA-CF 1, PA66 1, PP 1, POM / Acetal 1, ABS 1, TPU 85A class and softer 1, PA6 1, PET-GF 1, PPA-CF 1, PPA-GF 1.

Evidence that contradicts everything else and was down-weighted (EST-CONFLICT, 205 observations):

By material: PLA 28, PLA Aero 11, PA12-CF 10, PA6-CF 8, PPA-CF 8, PETG 7, TPU 95A class 7, ABS 6, PA6-GF 6, PA6 5, PP-CF 5, PLA Metal 4, PLA Wood 4, CPE-CF 4, PAHT-CF 4, PPS-CF 4, nGen FLEX 4, ABS-GF 4, PPA-GF 4, PLA-CF 3, ASA 3, PLA Silk 3, ASA Aero 3, PC 3, CPE 3, ABS-CF 3, PA12 3, PET-GF 3, PA66 2, PP 2, PLA-EC 2, PAHT-CE 2, PLA-NF 2, PET-LW 2, OBC 2, TPC-ESD 2, PBAT 2, TPU-GF 2, TPU 85A class and softer 2, BVOH 2, PCTG 2, nGen / Amphora 2, PA12-GF 2, PA6/66 2, PPA 2, PLA Marble 1, PLA Sparkle 1, PVA 1, POM / Acetal 1, PETG-CF 1, COC 1, ASA-GF 1, TPC / TPEE 1, PP Lightweight 1, TPU harder than 95A 1, HIPS 1.

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
- PP-CF, tensileStrengthXY: break XY 78 (V001503)
- PP-CF, tensileStrengthXY: flexural XY 68 (V001506)
- OBC, tensileStrengthXY: break XY 14 (V007765)
- OBC, tensileStrengthXY: flexural XY 7.8 (V007768)
- PP Lightweight, tensileStrengthXY: break XY 38 (V002227)
- TPC-ESD, tensileStrengthXY: break XY 70 (V003135)
- TPC-ESD, tensileStrengthXY: flexural XY 50 (V003137)
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
- PC, hdt045: Tg amorphous 161 (V009442)
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
- CPE, hdt045: HDT 0.45 100 (V010766)
- nGen FLEX, hdt045: HDT 0.45 moulded amorphous 100 (V005870)
- nGen FLEX, hdt045: Vicat amorphous 170 (V006009)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- PA6-GS, density: 1010 kg/m³, expected about 1400
- PLA-EC, density: 1240 kg/m³, expected about 1520
- PBAT, tensileModulusXY: 0.006 GPa, expected about 1.02
- PA6, hdt045: 140 °C, expected about 94
- PA12, hdt045: 135 °C, expected about 90

## Consistency

Every one of the 175 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade;
- every product value cites a measurement of that product that is not quarantined (4343 checked), and a material's typical product is one of its own;
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
- `EST-OUTLIER` **materials** — 5 measured headlines sit far outside what every other observation predicts; check the source and the grade: PA6-GS density 1010 (expected about 1400); PLA-EC density 1240 (expected about 1520); PBAT tensileModulusXY 0.006 (expected about 1.02); PA6 hdt045 140 (expected about 94); PA12 hdt045 135 (expected about 90)
- `EST-FAMILY-ORDER` **materials** — 5 reinforced materials sit below their unfilled sibling: ABS-AF tensileModulusXY 1.89 < ABS 2.2; ASA-AF tensileModulusXY 1.97 (estimate) < ASA 2.1746; PBT-GF hdt045 175 < PBT 180; PA12-AF hdt045 110 (estimate) < PA12 135; Nylon-GF, maker-undisclosed polyamide tensileModulusXY 3.1 < Nylon, maker-undisclosed polyamide 3.16485
