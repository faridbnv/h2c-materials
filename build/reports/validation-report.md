# Validation report

Database snapshot 2026-09-21 · build 2026-09-25

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 163 |
| h2cRelevant | 128 |
| familyEntries | 21 |
| retiredDuplicates | [object Object] |
| excluded | 14 |
| grades | 1119 |
| measurements | 10879 |
| numericMeasurements | 10704 |
| quarantined | 18 |
| profiles | 1158 |
| evidence | 542 |
| prices | 104 |
| sources | 1435 |
| coverage | 864 |
| knowHow | 4502 |
| polymerEnvironment | 353 |
| polymerEvidence | 345 |
| coverageDerived | 667 |

## Headline coverage

What a selection criterion can actually decide, out of 163 canonical materials.

| Headline | Materials with a value |
|---|---:|
| density | 131 |
| tensileModulusXY | 88 |
| tensileStrengthXY | 92 |
| elongationXY | 90 |
| hdt045 | 94 |
| priceCADkg | 33 |

## H2C envelope gate

Baseline 350 C nozzle, 120 C bed, 65 C chamber.

| Axis | within | partial window | exceeds | exceeds (recommendation only) | unknown |
|---|---:|---:|---:|---:|---:|
| nozzle | 116 | n/a | 14 | 0 | 33 |
| bed | 110 | n/a | 14 | 0 | 39 |
| chamber | 71 | 5 | 9 | 2 | 76 |

A partial window is chamber-only: part of the published window is reachable at 65 C, never all of it.
Nozzle and bed are read by the upper end of the window.

## Chamber evidence

What the 149 in-scope materials publish about the chamber, strongest kind first. A statement
in words is manufacturer evidence but never a temperature. An estimated band is inference from
data/tables/chamber_bands.csv; it is shown beside the chamber question and changes no verdict.

| Kind | Materials |
|---|---:|
| Published temperature window | 58 |
| No heated chamber needed, in words | 22 |
| Chamber recommended, no temperature | 1 |
| Data sheet lists no setpoint | 1 |
| Nothing published | 67 |
| Carrying an estimated band (any of the last three) | 17 |

26 research bands are superseded by evidence and not used: PLA Metal (20-45 °C; publishes 25-45 °C), PLA Marble (20-45 °C; publishes 25-45 °C), PLA Sparkle (20-45 °C; publishes 25-45 °C), PLA Galaxy (20-45 °C; publishes 25-45 °C), PLA Silk (20-45 °C; publishes 0-45 °C), Support for PA/PET (20-45 °C; publishes 45-60 °C), PETG-CF (20-50 °C; publishes 20-65 °C), PETG-GF (20-50 °C; publishes 20-20 °C), PEBA (20-50 °C; a source says no heated chamber is needed), PP (20-50 °C; a source says no heated chamber is needed), CPE (20-50 °C; a source says no heated chamber is needed), CPE-CF (20-50 °C; a source says no heated chamber is needed), CoPE (20-50 °C; a source says no heated chamber is needed), PVB (20-50 °C; a source says no heated chamber is needed), ABS-ESD (45-70 °C; publishes 25-90 °C), ASA-GF (45-70 °C; publishes 25-60 °C), PC FR (45-70 °C; publishes 45-100 °C), PC-CF (45-70 °C; publishes 25-100 °C), PAHT-CF (45-70 °C; publishes 45-60 °C), PA6 (45-70 °C; publishes 20-60 °C), PET (45-70 °C; a source says no heated chamber is needed), PET-GF (45-70 °C; publishes 25-50 °C), PPS-CF (60-90 °C; publishes 25-90 °C), PPA-CF (80-120 °C; publishes 25-80 °C), PPA-GF (80-120 °C; publishes 25-80 °C), POM / Acetal (45-80 °C; publishes 70-140 °C).

## Environment evidence

A verdict category has findings that reduce to resistant, limited or not resistant, so it
can answer a pass/fail question. An indicator category has records but no reducible verdict
among them, so it can only show evidence and must never be offered as a hard constraint.

| Category | Kind | Records | With a verdict | Materials | From the base polymer |
|---|---|---:|---:|---:|---:|
| alkali | verdict | 63 | 61 | 40 | 53 |
| acid | verdict | 67 | 59 | 41 | 53 |
| organic-solvent | verdict | 63 | 45 | 43 | 57 |
| oil-grease | verdict | 57 | 45 | 42 | 51 |
| water-solubility | verdict | 42 | 41 | 34 | 35 |
| flammability | verdict | 42 | 36 | 34 | 13 |
| food-contact | indicator | 2 | 0 | 2 | 0 |
| uv-outdoor | verdict | 7 | 0 | 6 | 23 |
| moisture | verdict | 12 | 0 | 10 | 18 |
| creep | indicator | 2 | 0 | 2 | 0 |
| fatigue | indicator | 5 | 0 | 5 | 0 |
| hydrolysis | verdict | 4 | 0 | 4 | 42 |

## Polymer-level behaviour

353 rows of published base-polymer behaviour, attached as 345 inferred records to 83 materials
with no grade-level record in the category (D64). A record is shown in the drawer, counted apart in the filter rail, may screen a
material out under inference where the polymer is attacked or dissolved, and never passes a requirement.

| Category | Polymers | Agent rows | Materials covered | Of which may screen |
|---|---:|---:|---:|---:|
| acid | 21 | 94 | 53 | 16 |
| alkali | 20 | 43 | 53 | 14 |
| flammability | 4 | 4 | 13 | 11 |
| hydrolysis | 12 | 19 | 42 | 10 |
| moisture | 2 | 2 | 18 | 0 |
| oil-grease | 20 | 78 | 51 | 0 |
| organic-solvent | 23 | 87 | 57 | 19 |
| uv-outdoor | 8 | 8 | 23 | 1 |
| water-solubility | 15 | 18 | 35 | 1 |

## Estimates

A headline none of a material's products publishes comparably carries an estimate from one Gaussian model per
property that takes every observation in the snapshot, each converted to the headline's semantics
(build/mappings/estimate-model.json, DECISIONS D43). The likely range is 80% and the plausible range 95%. Both are
calibrated by hiding each material's typical product's value and predicting it from everything else; the build
fails if that coverage drifts. An estimate never passes a material; in Explore it may screen one out only when
its plausible range wholly fails.

| Headline | Observations | Hidden headlines | Likely range holds | Plausible range holds | Median likely width | Spread between products |
|---|---:|---:|---:|---:|---:|---:|
| density | 857 | 116 | 80% | 96% | ×1.1 | 0.0253 (15933 pairs) |
| tensileModulusXY | 1148 | 74 | 81% | 96% | ×1.53 | 0.315 (1079 pairs) |
| tensileStrengthXY | 1272 | 55 | 80% | 96% | ×1.42 | 0.256 (2269 pairs) |
| elongationXY | 916 | 76 | 80% | 96% | ×4 | 0.703 (2154 pairs) |
| hdt045 | 1256 | 80 | 79% | 95% | 19.2 °C | 4.77 (4084 pairs) |

| Headline | Missing | From its one product | From its products | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 11 | 1 | 2 | 8 | 0 | 0 | 11 |
| tensileModulusXY | 53 | 16 | 29 | 4 | 4 | 0 | 49 |
| tensileStrengthXY | 49 | 15 | 26 | 4 | 4 | 0 | 45 |
| elongationXY | 51 | 15 | 24 | 8 | 4 | 0 | 45 |
| hdt045 | 47 | 10 | 12 | 8 | 17 | 0 | 30 |

Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most 10% of the time with 90% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.

| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |
|---|---|---:|---:|---:|---:|---:|
| density | this-grade | 6 | 1 | cannot screen | 0 | cannot screen |
| density | this-material | 85 | 0 | 97.5% point | 1 | 2.5% point |
| density | family | 116 | 8 | 97.55% point | 2 | 2.5% point |
| tensileModulusXY | this-grade | 65 | 2 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 61 | 0 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | family | 74 | 0 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-grade | 49 | 2 | 97.76% point | 0 | 2.5% point |
| tensileStrengthXY | this-material | 51 | 0 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | family | 55 | 0 | 97.5% point | 1 | 2.5% point |
| elongationXY | this-grade | 35 | 0 | 97.5% point | 0 | 2.5% point |
| elongationXY | this-material | 65 | 2 | 97.5% point | 2 | 2.5% point |
| elongationXY | family | 76 | 1 | 97.5% point | 2 | 2.5% point |
| hdt045 | this-grade | 56 | 3 | 97.98% point | 1 | 2.5% point |
| hdt045 | this-material | 62 | 5 | 99.94% point | 1 | 2.5% point |
| hdt045 | family | 80 | 4 | 97.5% point | 0 | 2.5% point |

Grade estimates (D81): each grade predicted at its own row and calibrated by hiding its own published values.

| Headline | Hidden values | Likely scale | Plausible scale | Likely coverage | Plausible coverage | Shipped |
|---|---:|---:|---:|---:|---:|---|
| density | 773 | 1.44 | 2.18 | 0.798 | 0.951 | yes |
| tensileModulusXY | 234 | 1.06 | 1.24 | 0.799 | 0.944 | yes |
| tensileStrengthXY | 257 | 1.06 | 1.13 | 0.794 | 0.953 | yes |
| elongationXY | 303 | 1.04 | 1.1 | 0.799 | 0.944 | yes |
| hdt045 | 376 | 1.74 | 3 | 0.787 | 0.939 | no: its grade scales reach the calibration clamp: a product's published value scatters about its material more than the model can say, so no grade range is shown |

EST-GRADE-OUTLIER, 31 grades: PLA 8, PLA Metal 5, PLA Wood 3, PLA Aero 3, PA12-CF 3, PP 1, POM / Acetal 1, ABS 1, PEBA 1, PA6-CF 1, PVA 1, PET-GF 1, PPA-CF 1, PPA-GF 1.

Evidence that contradicts everything else and was down-weighted (EST-CONFLICT, 218 observations):

By material: PLA 36, PA12-CF 12, PPA-CF 10, PLA Aero 9, PLA-CF 7, PAHT-CF 7, PLA Metal 6, PA6-GF 6, PA6-CF 6, PA12 6, TPU 95A class 6, ABS 5, PA6 5, PPA-GF 5, PLA Wood 4, PETG 4, PLA-NF 4, PLA Silk 3, nGen FLEX 3, TPU 85A class and softer 3, ABS-GF 3, ABS-CF 3, PC 3, PET-GF 3, PPA 3, PP 2, PP-CF 2, CPE-CF 2, PLA-EC 2, PAHT-CE 2, PPS-CF 2, PEBA 2, TPC / TPEE 2, OBC 2, TPC-ESD 2, PBAT 2, CPE-LW 2, PCL 2, TPU, hardness not stated 2, BVOH 2, TPU-CF 2, PLA-GF 2, PA12-GF 2, PET-CF 2, Support for PA/PET 2, PC-PBT 2, COC 2, PLA Sparkle 1, ASA 1, PVA 1, POM / Acetal 1, PETG-CF 1, ASA-GF 1, PPS 1, TPU harder than 95A 1, PC FR 1, PET 1, HIPS 1, PC-PBT-CF 1.

- PLA, density: density 1240 (V008736)
- PLA, density: density 1240 (V009024)
- PLA, density: density 1200 (V009118)
- PLA, density: density 2300 (V009181)
- PLA, density: density 1660 (V009217)
- PLA, density: density 1850 (V009267)
- PLA, density: density 2300 (V009282)
- PLA, density: density 1340 (V010204)
- PLA Metal, density: density 1250 (V000184)
- PLA Metal, density: density 2360, 2360 (V004044, V004066)
- PLA Metal, density: density 2330, 2330 (V004048, V004062)
- PLA Metal, density: density 2280, 2280 (V004058, V004070)
- PLA Metal, density: density 1225 (V007387)
- PLA Metal, density: density 1200 (V009065)
- PLA Sparkle, density: density 1410 (V009182)
- PLA Wood, density: density 1020 (V005557)
- PLA Wood, density: density 700 (V009165)
- PLA Wood, density: density 970 (V010031)
- PLA Wood, density: density 1300 (V011067)
- PLA Aero, density: density 1210 (V000303)
- PLA Aero, density: density 1240 (V002975)
- PLA Aero, density: density 900 (V003554)
- PLA Aero, density: density 900 (V003652)
- PLA Aero, density: density 840 (V004522)
- PLA Aero, density: density 1210 (V004816)
- PLA Aero, density: density 1200 (V006763)
- PLA-CF, density: density 1300 (V008790)
- PLA-CF, density: density 1300 (V009084)
- PLA-CF, density: density 1420 (V009909)
- PETG, density: density 1180 (V002844)
- ABS, density: density 1130 (V009059)
- ABS, density: density 1100 (V010441)
- ASA, density: density 1150 (V008987)
- PA6, density: density 1250 (V000917)
- PA6-GF, density: density 1140 (V000943)
- PA12-CF, density: density 1230 (V006956)
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
- PLA Silk, tensileModulusXY: tensile XY 0.597 (V004369)
- PLA Silk, tensileModulusXY: tensile Z 0.363 (V004370)
- PLA Silk, tensileModulusXY: flexural XY 2.473 (V004375)
- PLA Aero, tensileModulusXY: tensile Z 0.254 (V009907)
- PETG, tensileModulusXY: tensile XY 0.5 (V004389)
- PETG, tensileModulusXY: tensile Z 0.3 (V004390)
- PETG, tensileModulusXY: flexural XY 1.9 (V004395)
- PETG-CF, tensileModulusXY: flexural unk 0.065 (V007718)
- ABS, tensileModulusXY: tensile XY 0.21716 (V005140)
- PAHT-CF, tensileModulusXY: tensile Z 3.532 (V002470)
- PAHT-CF, tensileModulusXY: tensile Z 2.75 (V009943)
- PA6-CF, tensileModulusXY: tensile unk 1.1 (V004325)
- PA6-GF, tensileModulusXY: flexural XY 0.2, 0.0575 (V005395, V005396)
- PA12-CF, tensileModulusXY: tensile unk 0.5 (V010096)
- PPA-CF, tensileModulusXY: tensile Z 4.3 (V001311)
- PPS-CF, tensileModulusXY: tensile Z 2.85 (V001362)
- PPS-CF, tensileModulusXY: tensile Z 2.72 (V001867)
- PLA, tensileStrengthXY: ultimate XY 32.7, 8.7 (V005060, V005063)
- PLA, tensileStrengthXY: ultimate moulded 13.58 (V006634)
- PLA, tensileStrengthXY: ultimate XY 28.004 (V008589)
- PLA, tensileStrengthXY: flexural XY 85.809 (V008591)
- ABS, tensileStrengthXY: ultimate XY 27 (V008933)
- ABS, tensileStrengthXY: flexural XY 92.38 (V008936)
- ASA-GF, tensileStrengthXY: flexural unk 27.2 (V002205)
- PEBA, tensileStrengthXY: break XY 32.58 (V008144)
- PEBA, tensileStrengthXY: ultimate XY 9.17, 8.98, 9.69 (V008146, V008147, V008148)
- TPC / TPEE, tensileStrengthXY: ultimate unk 4.4129925, 5.3936575, 6.3743225 (V007463, V007464, V007465)
- TPC / TPEE, tensileStrengthXY: flexural unk 1.96133 (V007467)
- PAHT-CF, tensileStrengthXY: ultimate XY 103.2 (V002465)
- PAHT-CF, tensileStrengthXY: flexural unk 50.8 (V007627)
- PA12, tensileStrengthXY: yield XY 49.3 (V002006)
- PA12, tensileStrengthXY: break XY 33.4 (V002010)
- PA12-CF, tensileStrengthXY: ultimate XY 58, 14 (V004843, V004844)
- PA12-CF, tensileStrengthXY: flexural XY 96 (V004847)
- OBC, tensileStrengthXY: break XY 14 (V007765)
- OBC, tensileStrengthXY: flexural XY 7.8 (V007768)
- TPC-ESD, tensileStrengthXY: break XY 70 (V003135)
- TPC-ESD, tensileStrengthXY: flexural XY 50 (V003137)
- PBAT, tensileStrengthXY: ultimate XY 27 (V005365)
- PBAT, tensileStrengthXY: flexural XY 7 (V005368)
- CPE-LW, tensileStrengthXY: break unk 28 (V005545)
- CPE-LW, tensileStrengthXY: ultimate unk 2, 4 (V005546, V005547)
- nGen FLEX, tensileStrengthXY: flexural unk 8.9 (V005863)
- PCL, tensileStrengthXY: ultimate unk 45 (V010316)
- PCL, tensileStrengthXY: flexural unk 18 (V010319)
- PLA-NF, tensileStrengthXY: flexural unk 30 (V010249)
- TPU 85A class and softer, tensileStrengthXY: ultimate unk 30 (V005838)
- TPU 85A class and softer, tensileStrengthXY: flexural unk 1.55 (V005841)
- TPU 85A class and softer, tensileStrengthXY: ultimate moulded 50 (V005844)
- TPU 95A class, tensileStrengthXY: ultimate XY 27 (V005374)
- TPU 95A class, tensileStrengthXY: flexural XY 7 (V005377)
- TPU 95A class, tensileStrengthXY: flexural unk 2.9 (V005943)
- TPU 95A class, tensileStrengthXY: ultimate moulded 32 (V005946)
- TPU 95A class, tensileStrengthXY: ultimate unk 34.4 (V007895)
- TPU 95A class, tensileStrengthXY: flexural unk 4.26 (V007898)
- TPU, hardness not stated, tensileStrengthXY: ultimate unk 21.7 (V008723)
- TPU, hardness not stated, tensileStrengthXY: flexural unk 4.26 (V008726)
- PLA, elongationXY: break XY 34.5, 27.8 (V003649, V003863)
- PLA, elongationXY: break Z 0.9 (V003864)
- PLA-CF, elongationXY: break XY 13.2 (V003424)
- PLA-CF, elongationXY: break moulded 0.6 (V009911)
- PPS, elongationXY: break moulded 2 (V001350)
- BVOH, elongationXY: break XY 14.8 (V002264)
- BVOH, elongationXY: break Z 0.6 (V002265)
- PP, elongationXY: break unk 12 (V005640)
- TPU-CF, elongationXY: break moulded 15 (V004076)
- TPU-CF, elongationXY: break unk 380 (V008379)
- TPU harder than 95A, elongationXY: break Z 31 (V000780)
- PLA, hdt045: Vicat amorphous 85 (V002779)
- PLA, hdt045: HDT 0.45 116 (V002780)
- PLA, hdt045: HDT 1.8 amorphous 66 (V002781)
- PLA, hdt045: Vicat amorphous 140 (V002877)
- PLA, hdt045: Tg amorphous 55 (V003211)
- PLA, hdt045: HDT 0.45 80 (V003212)
- PLA, hdt045: Vicat amorphous 156.2, 152 (V003528, V003572)
- PLA, hdt045: Tg amorphous 59.15 (V003899)
- PLA, hdt045: Vicat amorphous 148.3 (V003900)
- PLA, hdt045: HDT 0.45 90 (V005586)
- PLA, hdt045: HDT 0.45 135 (V005853)
- PLA, hdt045: HDT 0.45 115 (V006190)
- PLA, hdt045: Vicat amorphous 160 (V006191)
- PLA, hdt045: HDT 0.45 55 (V006337)
- PLA, hdt045: HDT 0.45 80 (V007474)
- PLA, hdt045: HDT 0.45 80 (V007533)
- PLA, hdt045: HDT 0.45 110 (V007602)
- PLA, hdt045: Vicat amorphous 140 (V007603)
- PLA, hdt045: HDT 0.45 moulded amorphous 50 (V009246)
- PLA, hdt045: HDT 0.45 moulded amorphous 48 (V009255)
- PLA, hdt045: Tg amorphous 55 (V010210)
- PLA, hdt045: HDT 0.45 89 (V010211)
- PLA Aero, hdt045: HDT 0.45 moulded amorphous 135 (V005974)
- PLA-CF, hdt045: Tg amorphous 60 (V003308)
- PLA-CF, hdt045: HDT 0.45 91 (V003309)
- PLA-GF, hdt045: Vicat amorphous 148.9, 148.9 (V000348, V003544)
- PLA-GF, hdt045: HDT 0.45 75.5 (V000350)
- ABS-GF, hdt045: HDT 0.45 97 (V002535)
- ABS-GF, hdt045: Tg amorphous 135 (V004463)
- ABS-GF, hdt045: HDT 0.45 82 (V005111)
- ABS-CF, hdt045: Tg amorphous 105 (V000593)
- ABS-CF, hdt045: HDT 0.45 76 (V000594)
- ABS-CF, hdt045: HDT 0.45 78 (V002175)
- PC, hdt045: HDT 0.45 101, 101 (V004707, V008720)
- PC, hdt045: Tg amorphous 161 (V009442)
- PC, hdt045: Tg amorphous 160 (V010693)
- PC FR, hdt045: Tg amorphous 145 (V000700)
- PAHT-CF, hdt045: HDT 0.45 194 (V000902)
- PAHT-CF, hdt045: Tm semi-filled 234, 234 (V002459, V007639)
- PAHT-CF, hdt045: HDT 0.45 145 (V002464)
- PA6, hdt045: HDT unstated 60 (V002348)
- PA6, hdt045: HDT unstated 60 (V002994)
- PA6, hdt045: HDT 0.45 140 (V007666)
- PA6, hdt045: HDT unstated 186 (V007868)
- PA6-CF, hdt045: HDT 0.45 203, 209 (V004530, V008619)
- PA6-CF, hdt045: HDT 0.45 200 (V005171)
- PA6-CF, hdt045: HDT 0.45 147 (V006453)
- PA6-CF, hdt045: HDT 0.45 215 (V006543)
- PA6-CF, hdt045: HDT 0.45 140 (V007553)
- PA6-GF, hdt045: HDT 0.45 205.2, 205 (V004592, V008235)
- PA6-GF, hdt045: HDT 0.45 210 (V005579)
- PA6-GF, hdt045: HDT 0.45 161 (V009369)
- PA6-GF, hdt045: HDT 1.8 semi-filled 35 (V009370)
- PA12, hdt045: HDT 0.45 94.7 (V002003)
- PA12, hdt045: HDT 0.45 100 (V005723)
- PA12, hdt045: HDT 0.45 135, 135 (V010790, V010909)
- PA12, hdt045: HDT 0.45 135 (V011063)
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
- PET, hdt045: Tg amorphous 67.6 (V005816)
- PET-CF, hdt045: HDT 0.45 74 (V007698)
- PET-CF, hdt045: Vicat amorphous 203, 243 (V007699, V007700)
- PET-GF, hdt045: Tg amorphous 59.5 (V001927)
- PET-GF, hdt045: HDT 0.45 81.6 (V001931)
- PET-GF, hdt045: HDT 0.45 200 (V005260)
- PPA, hdt045: HDT 0.45 103 (V002224)
- PPA, hdt045: Vicat amorphous 230 (V002544)
- PPA, hdt045: HDT 0.45 81 (V002549)
- PPA-CF, hdt045: HDT 0.45 227 (V001308)
- PPA-CF, hdt045: Vicat semi-filled 230 (V002566)
- PPA-CF, hdt045: Tm semi-filled 232 (V002570)
- PPA-CF, hdt045: HDT 0.45 84.5 (V002574)
- PPA-CF, hdt045: Vicat semi-filled 238 (V002592)
- PPA-CF, hdt045: Tm semi-filled 239 (V002596)
- PPA-CF, hdt045: HDT 0.45 97 (V002600)
- PPA-CF, hdt045: HDT 0.45 240, 240 (V003220, V003236)
- PPA-CF, hdt045: HDT 0.45 220 (V005246)
- PPA-GF, hdt045: HDT 0.45 227 (V001326)
- PPA-GF, hdt045: Vicat semi-filled 235 (V002621)
- PPA-GF, hdt045: Tm semi-filled 232 (V002625)
- PPA-GF, hdt045: HDT 0.45 84 (V002629)
- PPA-GF, hdt045: HDT 0.45 220 (V005306)
- Support for PA/PET, hdt045: Vicat amorphous 171 (V010147)
- Support for PA/PET, hdt045: HDT 1.8 amorphous 53 (V010148)
- HIPS, hdt045: HDT 0.45 80 (V001477)
- PP-CF, hdt045: HDT 0.45 88 (V007762)
- PC-PBT, hdt045: Tg amorphous 140, 140 (V001584, V003683)
- PC-PBT, hdt045: Vicat amorphous 139, 139 (V001587, V003684)
- PC-PBT-CF, hdt045: HDT 1.8 amorphous 89 (V008289)
- COC, hdt045: Vicat amorphous 156 (V005675)
- COC, hdt045: Vicat amorphous 64 (V010403)
- nGen FLEX, hdt045: HDT 0.45 moulded amorphous 100 (V005870)
- nGen FLEX, hdt045: Vicat amorphous 170 (V006009)
- PLA-NF, hdt045: HDT 0.45 80 (V010287)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- PLA Metal, density: 1250 kg/m³, expected about 1750
- PLA-EC, density: 1240 kg/m³, expected about 1510

## Consistency

Every one of the 163 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade;
- every product value cites a measurement of that product that is not quarantined (3310 checked), and a material's typical product is one of its own;
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

- `NO-MEASUREMENTS` **materials** — 2 materials have no property measurements at all: PA66-CF, PA612-GF
- `EST-REJECTED` **measurements** — 8 values are physically impossible for their property and were kept out of the estimate model: V009231 PLA Density 3900 kg/m³; V009245 PLA Density 3130 kg/m³; V009254 PLA Density 3900 kg/m³; V009275 PLA Density 3130 kg/m³; V009486 PLA Density 4000 kg/m³; V009522 PLA Metal Density 2780 kg/m³; V009638 PLA Metal Density 3400 kg/m³; V009775 PLA Metal Density 3500 kg/m³
- `EST-OUTLIER` **materials** — 2 measured headlines sit far outside what every other observation predicts; check the source and the grade: PLA Metal density 1250 (expected about 1750); PLA-EC density 1240 (expected about 1510)
- `EST-FAMILY-ORDER` **materials** — 4 reinforced materials sit below their unfilled sibling: ASA-GF tensileModulusXY 2.30795 < ASA 2.317; ABS-AF tensileModulusXY 2 (estimate) < ABS 2.2466; ASA-AF tensileModulusXY 1.85 (estimate) < ASA 2.317; PA12-AF hdt045 113 (estimate) < PA12 135
