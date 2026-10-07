# Validation report

Database snapshot 2026-09-21 · build 2026-10-07

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 175 |
| h2cRelevant | 135 |
| familyEntries | 23 |
| retiredDuplicates | measurements 601, evidence 21, profiles 80 |
| excluded | 17 |
| grades | 1180 |
| measurements | 14817 |
| numericMeasurements | 14624 |
| quarantined | 36 |
| profiles | 1835 |
| evidence | 868 |
| prices | 365 |
| sources | 2016 |
| coverage | 951 |
| knowHow | 4897 |
| polymerEnvironment | 353 |
| polymerEvidence | 314 |
| coverageDerived | 1137 |

## Headline coverage

What a selection criterion can actually decide, out of 175 canonical materials.

| Headline | Materials with a value |
|---|---:|
| density | 147 |
| tensileModulusXY | 101 |
| tensileStrengthXY | 107 |
| tensileStrengthZ | 57 |
| elongationXY | 104 |
| charpyNotched | 50 |
| izodNotched | 35 |
| hdt045 | 99 |
| glassTransition | 94 |
| priceCADkg | 108 |

## H2C envelope gate

Baseline 350 C nozzle, 120 C bed, 65 C chamber.

| Axis | within | partial window | exceeds | exceeds (recommendation only) | unknown |
|---|---:|---:|---:|---:|---:|
| nozzle | 133 | n/a | 11 | 0 | 31 |
| bed | 133 | n/a | 11 | 0 | 31 |
| chamber | 96 | 9 | 8 | 1 | 61 |

A partial window is chamber-only: part of the published window is reachable at 65 C, never all of it.
Nozzle and bed are read by the upper end of the window.

## Chamber evidence

What the 135 in-scope materials publish about the chamber, strongest kind first. A statement
in words is manufacturer evidence but never a temperature. An estimated band is inference from
data/tables/chamber_bands.csv; it is shown beside the chamber question and changes no verdict.

| Kind | Materials |
|---|---:|
| Published temperature window | 65 |
| No heated chamber needed, in words | 39 |
| Chamber recommended, no temperature | 6 |
| Data sheet lists no setpoint | 1 |
| Nothing published | 24 |
| Carrying an estimated band (any of the last three) | 6 |

32 research bands are superseded by evidence and not used: PLA Metal (20-45 °C; publishes 25-45 °C), PLA Marble (20-45 °C; publishes 25-45 °C), PLA Sparkle (20-45 °C; publishes 25-45 °C), PLA Galaxy (20-45 °C; publishes 25-45 °C), PLA Silk (20-45 °C; publishes 0-45 °C), BVOH (20-45 °C; a source says no heated chamber is needed), Support for PA/PET (20-45 °C; publishes 45-60 °C), PETG-CF (20-50 °C; publishes 20-65 °C), PETG-GF (20-50 °C; publishes 20-20 °C), PEBA (20-50 °C; a source says no heated chamber is needed), TPC / TPEE (20-50 °C; a source says no heated chamber is needed), PP (20-50 °C; a source says no heated chamber is needed), PP-GF (20-50 °C; a source says no heated chamber is needed), OBC (20-50 °C; a source says no heated chamber is needed), CPE (20-50 °C; a source says no heated chamber is needed), CPE-CF (20-50 °C; a source says no heated chamber is needed), CoPE (20-50 °C; a source says no heated chamber is needed), PVB (20-50 °C; a source says no heated chamber is needed), ABS-ESD (45-70 °C; publishes 25-90 °C), ASA-GF (45-70 °C; publishes 25-60 °C), PC FR (45-70 °C; publishes 45-100 °C), PC-CF (45-70 °C; publishes at least 25 °C), PAHT-CF (45-70 °C; publishes 45-60 °C), PA6 (45-70 °C; publishes 20-60 °C), PET (45-70 °C; a source says no heated chamber is needed), PET-GF (45-70 °C; publishes 25-50 °C), PPS-CF (60-90 °C; publishes 25-90 °C), PPA (80-120 °C; a source says no heated chamber is needed), PPA-CF (80-120 °C; publishes 25-80 °C), PPA-GF (80-120 °C; publishes 25-80 °C), POM / Acetal (45-80 °C; publishes 70-140 °C), PP Lightweight (20-50 °C; a source says no heated chamber is needed).

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
| density | 912 | 120 | 80% | 95% | ×1.1 | 0.0257 (16898 pairs) |
| tensileModulusXY | 1350 | 83 | 81% | 95% | ×1.48 | 0.288 (2141 pairs) |
| tensileStrengthXY | 1447 | 67 | 81% | 96% | ×1.39 | 0.22 (3627 pairs) |
| elongationXY | 1109 | 86 | 80% | 95% | ×3.65 | 0.689 (3175 pairs) |
| hdt045 | 1246 | 80 | 80% | 94% | 20.3 °C | 4.19 (6023 pairs) |

| Headline | Missing | From its one product | From its products | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 5 | 1 | 2 | 2 | 0 | 0 | 5 |
| tensileModulusXY | 47 | 12 | 23 | 3 | 4 | 5 | 37 |
| tensileStrengthXY | 41 | 11 | 19 | 2 | 4 | 5 | 32 |
| elongationXY | 44 | 11 | 21 | 3 | 4 | 5 | 33 |
| hdt045 | 49 | 12 | 9 | 7 | 19 | 2 | 27 |

Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most 10% of the time with 90% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.

| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |
|---|---|---:|---:|---:|---:|---:|
| density | this-grade | 7 | 0 | cannot screen | 0 | cannot screen |
| density | this-material | 93 | 0 | 97.5% point | 2 | 2.5% point |
| density | family | 120 | 8 | 97.5% point | 4 | 2.5% point |
| tensileModulusXY | this-grade | 78 | 3 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 69 | 3 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | family | 83 | 2 | 97.5% point | 2 | 2.5% point |
| tensileStrengthXY | this-grade | 57 | 1 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-material | 58 | 0 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | family | 67 | 0 | 97.5% point | 3 | 2.5% point |
| elongationXY | this-grade | 46 | 0 | 97.5% point | 2 | 2.11% point |
| elongationXY | this-material | 69 | 2 | 97.5% point | 2 | 2.5% point |
| elongationXY | family | 86 | 2 | 97.5% point | 2 | 2.5% point |
| hdt045 | this-grade | 61 | 4 | 99.48% point | 1 | 2.5% point |
| hdt045 | this-material | 66 | 6 | 99.92% point | 1 | 2.5% point |
| hdt045 | family | 80 | 1 | 97.5% point | 0 | 2.5% point |

Floors (D126): the shown ranges of the same hidden headlines, floored by what the material's other measurements prove (a yield or break stress under the ultimate strength, a strain at yield under the strain at break, HDT at 1.8 MPa under HDT at 0.45 MPa); build/src/estimate/floors.js says what each row floors by. "printed" is the rule before D126, "unstated" the rule now, "formulation" what a grade's range takes.

| Headline | Floors | Hidden | Ranges moved | Likely holds | Plausible holds | Median likely width | Hidden values under the plausible range |
|---|---|---:|---:|---:|---:|---:|---:|
| tensileStrengthXY | none | 67 | 0 | 80.6% | 95.5% | ×1.39 | 2 |
| tensileStrengthXY | printed | 67 | 50 | 56.7% | 73.1% | ×1.37 | 18 |
| tensileStrengthXY | printedXY | 67 | 11 | 73.1% | 92.5% | ×1.39 | 5 |
| tensileStrengthXY | unstated | 67 | 62 | 22.4% | 28.4% | ×1.16 | 48 |
| tensileStrengthXY | containment | 67 | 13 | 83.6% | 94% | ×1.64 | 4 |
| tensileStrengthXY | sameSource | 67 | 50 | 55.2% | 71.6% | ×1.37 | 19 |
| tensileStrengthXY | lowestOfProducts | 67 | 62 | 73.1% | 86.6% | ×1.38 | 9 |
| tensileStrengthXY | formulation | 67 | 40 | 76.1% | 91% | ×1.38 | 6 |
| elongationXY | none | 86 | 0 | 80.2% | 95.3% | ×3.65 | 3 |
| elongationXY | printed | 86 | 59 | 55.8% | 66.3% | ×2.9 | 28 |
| elongationXY | printedXY | 86 | 17 | 74.4% | 89.5% | ×3.65 | 8 |
| elongationXY | unstated | 86 | 73 | 33.7% | 39.5% | ×2 | 52 |
| elongationXY | containment | 86 | 14 | 79.1% | 88.4% | ×6.33 | 9 |
| elongationXY | sameSource | 86 | 59 | 53.5% | 64% | ×2.9 | 30 |
| elongationXY | lowestOfProducts | 86 | 73 | 67.4% | 81.4% | ×3.53 | 16 |
| elongationXY | formulation | 86 | 47 | 67.4% | 82.6% | ×3.35 | 14 |
| hdt045 | none | 80 | 0 | 77.5% | 92.5% | 17.3 °C | 1 |
| hdt045 | printed | 80 | 39 | 63.7% | 77.5% | 15.7 °C | 14 |
| hdt045 | printedXY | 80 | 5 | 73.8% | 88.7% | 17.1 °C | 4 |
| hdt045 | unstated | 80 | 58 | 55% | 70% | 11.9 °C | 21 |
| hdt045 | containment | 80 | 5 | 78.7% | 92.5% | 20.5 °C | 1 |
| hdt045 | sameSource | 80 | 45 | 62.5% | 77.5% | 15.1 °C | 15 |
| hdt045 | lowestOfProducts | 80 | 51 | 76.2% | 91.2% | 16.8 °C | 3 |
| hdt045 | formulation | 80 | 27 | 78.7% | 95% | 17.3 °C | 1 |

Grade estimates (D81): each grade predicted at its own row and calibrated by hiding its own published values.

| Headline | Hidden values | Likely scale | Plausible scale | Likely coverage | Plausible coverage | Shipped |
|---|---:|---:|---:|---:|---:|---|
| density | 832 | 1.34 | 1.97 | 0.799 | 0.95 | yes |
| tensileModulusXY | 315 | 1.12 | 1.29 | 0.8 | 0.949 | yes |
| tensileStrengthXY | 333 | 1.21 | 1.21 | 0.787 | 0.943 | yes |
| elongationXY | 364 | 1.14 | 1.16 | 0.794 | 0.948 | yes |
| hdt045 | 441 | 1.94 | 3 | 0.789 | 0.921 | no: its grade scales reach the calibration clamp: a product's published value scatters about its material more than the model can say, so no grade range is shown |

EST-GRADE-OUTLIER, 35 grades: PLA 8, PLA Wood 3, PLA Aero 3, PA12-CF 3, PPA-CF 3, PPA-GF 3, PA6-CF 2, PP-CF 2, PLA Marble 1, PP 1, POM / Acetal 1, ABS 1, TPU 85A class and softer 1, PETG 1, PA6 1, PET-GF 1.

Evidence that contradicts everything else and was down-weighted (EST-CONFLICT, 276 observations):

By material: PLA 36, PETG 13, TPU 95A class 13, PLA Aero 12, PPA-CF 11, PA12-CF 10, ABS 9, PA6-CF 9, PLA Wood 8, PLA-CF 7, PLA Silk 7, PPA-GF 7, PA6 6, PA6-GF 5, PP-CF 5, PPS-CF 5, TPU harder than 95A 5, PC 5, PETG-CF 4, PA12-GF 4, CPE-CF 4, nGen FLEX 4, PCL 4, CPE 4, ABS-GF 4, PET-GF 4, PLA Metal 3, PP 3, PLA-NF 3, ASA Aero 3, PAHT-CF 3, BVOH 3, nGen / Amphora 3, ABS-CF 3, PA12 3, TPC / TPEE 2, PA66 2, PLA-EC 2, PAHT-CE 2, PET-LW 2, OBC 2, TPC-ESD 2, PBAT 2, TPU 85A class and softer 2, TPU 90A class 2, ASA 2, ASA-CF 2, PA6/66 2, PA612-CF 2, PPA 2, PVDF 2, COC 2, PLA Marble 1, PLA Sparkle 1, PVA 1, POM / Acetal 1, PA612-ESD 1, PPS-GF 1, PC-CF 1, HIPS 1, PC-ABS 1, PC-PBT 1.

- PLA, density: density 1240, 1000 (V007470, V013434)
- PLA, density: density 1240 (V008736)
- PLA, density: density 1240 (V009024)
- PLA, density: density 1200 (V009118)
- PLA, density: density 2300 (V009181)
- PLA, density: density 1660 (V009217)
- PLA, density: density 1850 (V009267)
- PLA, density: density 2300 (V009282)
- PLA, density: density 800, 800 (V010164, V010344)
- PLA, density: density 1340 (V010204)
- PLA Metal, density: density 2360, 2360 (V004044, V004066)
- PLA Metal, density: density 2330, 2330 (V004048, V004062)
- PLA Metal, density: density 1200 (V009065)
- PLA Marble, density: density 1700 (V009757)
- PLA Sparkle, density: density 1410 (V009182)
- PLA Wood, density: density 1020 (V005557)
- PLA Wood, density: density 1254 (V006967)
- PLA Wood, density: density 700 (V009165)
- PLA Wood, density: density 970 (V010031)
- PLA Wood, density: density 1300 (V011067)
- PLA Aero, density: density 1210 (V000303)
- PLA Aero, density: density 1240 (V002975)
- PLA Aero, density: density 900, 900 (V003554, V003652)
- PLA Aero, density: density 840 (V004522)
- PLA Aero, density: density 1210 (V004816)
- PLA Aero, density: density 1200 (V006763)
- PLA-CF, density: density 1300 (V008790)
- PLA-CF, density: density 1300 (V009084)
- PLA-CF, density: density 1420 (V009909)
- PETG, density: density 1350 (V002955)
- PETG, density: density 1290, 1290 (V009089, V009103)
- PETG-CF, density: density 1100 (V015320)
- ABS, density: density 1100 (V010441)
- TPC / TPEE, density: density 1160 (V005542)
- PA6-GF, density: density 1140 (V000943)
- PA12-CF, density: density 1230 (V006956)
- PA12-GF, density: density 1230 (V001007)
- PA12-GF, density: density 1000 (V013408)
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
- PAHT-CE, density: density 1490, 1400 (V009738, V012259)
- PLA-NF, density: density 1450 (V010252)
- PLA-NF, density: density 1250 (V010283)
- PLA, tensileModulusXY: flexural XY 2.493 (V002691)
- PLA, tensileModulusXY: tensile unk 0.475737 (V008803)
- PLA, tensileModulusXY: tensile unk 0.39 (V008830)
- PLA, tensileModulusXY: flexural XY 2.49017 (V008923)
- PLA, tensileModulusXY: tensile unk 0.379426 (V008997)
- PLA, tensileModulusXY: tensile XY 0.4328 (V011510)
- PLA, tensileModulusXY: tensile XY 1.14606 (V012520)
- PLA Silk, tensileModulusXY: tensile XY 0.597 (V004369)
- PLA Silk, tensileModulusXY: tensile Z 0.363 (V004370)
- PLA Silk, tensileModulusXY: flexural XY 2.473 (V004375)
- PLA Silk, tensileModulusXY: tensile unk 0.411583 (V008977)
- PLA Silk, tensileModulusXY: tensile unk 0.400339 (V009131)
- PLA Wood, tensileModulusXY: tensile unk 0.369993 (V008789)
- PLA Aero, tensileModulusXY: tensile moulded 3.5 (V005766)
- PLA Aero, tensileModulusXY: tensile Z 0.254 (V009907)
- PLA Aero, tensileModulusXY: tensile XY 0.86 (V011573)
- PETG, tensileModulusXY: tensile XY 0.5 (V004389)
- PETG, tensileModulusXY: tensile Z 0.3 (V004390)
- PETG, tensileModulusXY: flexural XY 1.9 (V004395)
- PETG, tensileModulusXY: flexural XY 1, 1 (V005876, V006298)
- PETG-CF, tensileModulusXY: flexural unk 0.065 (V007718)
- PETG-CF, tensileModulusXY: tensile Z 1.4 (V015302)
- ABS, tensileModulusXY: tensile Z 0.21716 (V005140)
- ASA Aero, tensileModulusXY: tensile XY 0.824 (V005747)
- ASA Aero, tensileModulusXY: tensile moulded 2.2 (V011587)
- ASA Aero, tensileModulusXY: flexural moulded 2.3 (V011590)
- PAHT-CF, tensileModulusXY: tensile Z 2.75 (V009943)
- PA6-CF, tensileModulusXY: tensile moulded 1.1 (V004325)
- PA6-CF, tensileModulusXY: tensile unk 6 (V013080)
- PA6-GF, tensileModulusXY: flexural XY 0.2, 0.0575 (V005395, V005396)
- PA12-CF, tensileModulusXY: tensile unk 0.5 (V010096)
- PA612-ESD, tensileModulusXY: tensile Z 1.7844 (V001239)
- PPA-CF, tensileModulusXY: tensile Z 4.3 (V001311)
- PPS-CF, tensileModulusXY: tensile XY 8.23 (V001361)
- PPS-CF, tensileModulusXY: tensile Z 2.85 (V001362)
- PPS-CF, tensileModulusXY: tensile XY 7.46 (V001865)
- PPS-CF, tensileModulusXY: tensile Z 2.72 (V001867)
- PPS-GF, tensileModulusXY: tensile XY 5.764 (V001381)
- CPE-CF, tensileModulusXY: tensile XY 5.15 (V010336)
- CPE-CF, tensileModulusXY: flexural XY 2.7 (V010339)
- PET-LW, tensileModulusXY: tensile XY 1.5 (V011402)
- PET-LW, tensileModulusXY: flexural XY 0.5232 (V011408)
- TPU 95A class, tensileModulusXY: tensile XY 0.0502 (V012569)
- TPU 95A class, tensileModulusXY: flexural XY 0.0876 (V012572)
- TPU 95A class, tensileModulusXY: flexural XY 0.0876 (V014348)
- TPU harder than 95A, tensileModulusXY: tensile moulded 0.04, 0.04 (V004196, V008567)
- TPU harder than 95A, tensileModulusXY: tensile moulded 0.04, 0.04 (V004310, V008600)
- TPU harder than 95A, tensileModulusXY: tensile unk 0.4 (V012012)
- TPU harder than 95A, tensileModulusXY: tensile unk 0.12 (V012024)
- PLA, tensileStrengthXY: ultimate XY 28.004 (V008589)
- PLA, tensileStrengthXY: flexural XY 85.809 (V008591)
- PLA Silk, tensileStrengthXY: ultimate XY 49.8, 11, 12 (V004855, V011909, V011924)
- PLA Silk, tensileStrengthXY: flexural unk 66.7 (V004861)
- PLA Wood, tensileStrengthXY: ultimate XY 30.1, 8.9 (V012770, V012773)
- PLA Aero, tensileStrengthXY: yield unk 60 (V005595)
- PLA Aero, tensileStrengthXY: ultimate XY 10 (V011575)
- PLA Aero, tensileStrengthXY: ultimate XY 9 (V011581)
- PLA-CF, tensileStrengthXY: ultimate XY 39 (V009032)
- PLA-CF, tensileStrengthXY: flexural XY 103 (V009034)
- PETG, tensileStrengthXY: ultimate XY 50, 51.25 (V005874, V006294)
- PETG, tensileStrengthXY: break XY 28.67 (V006296)
- ABS, tensileStrengthXY: ultimate XY 27 (V008933)
- ABS, tensileStrengthXY: flexural XY 92.38 (V008936)
- TPC / TPEE, tensileStrengthXY: flexural unk 1.96133, 4.4129925 (V007467, V015166)
- PA6-CF, tensileStrengthXY: ultimate XY 53 (V005126)
- PA6-CF, tensileStrengthXY: flexural XY 140 (V005130)
- PP-CF, tensileStrengthXY: break XY 78 (V001503)
- PP-CF, tensileStrengthXY: flexural XY 68 (V001506)
- OBC, tensileStrengthXY: break XY 14 (V007765)
- OBC, tensileStrengthXY: flexural XY 7.8 (V007768)
- TPC-ESD, tensileStrengthXY: break XY 70 (V003135)
- TPC-ESD, tensileStrengthXY: flexural XY 50 (V003137)
- PBAT, tensileStrengthXY: ultimate XY 27 (V005365)
- PBAT, tensileStrengthXY: flexural XY 7 (V005368)
- nGen FLEX, tensileStrengthXY: ultimate XY 19.3 (V005860)
- nGen FLEX, tensileStrengthXY: flexural XY 8.9 (V005863)
- PCL, tensileStrengthXY: ultimate unk 45 (V010316)
- PCL, tensileStrengthXY: flexural unk 18 (V010319)
- PCL, tensileStrengthXY: ultimate unk 45 (V011835)
- PCL, tensileStrengthXY: flexural unk 18 (V011845)
- TPU 85A class and softer, tensileStrengthXY: ultimate XY 30 (V005838)
- TPU 85A class and softer, tensileStrengthXY: flexural XY 1.55 (V005841)
- TPU 90A class, tensileStrengthXY: ultimate XY 24, 12 (V012728, V012729)
- TPU 90A class, tensileStrengthXY: flexural XY 3, 2 (V012734, V012735)
- TPU 95A class, tensileStrengthXY: ultimate XY 31, 34.4 (V004770, V014344)
- TPU 95A class, tensileStrengthXY: ultimate XY 27 (V005374)
- TPU 95A class, tensileStrengthXY: flexural XY 7 (V005377)
- TPU 95A class, tensileStrengthXY: ultimate XY 17 (V005940)
- TPU 95A class, tensileStrengthXY: flexural XY 2.9 (V005943)
- TPU 95A class, tensileStrengthXY: ultimate unk 34.4 (V007895)
- TPU 95A class, tensileStrengthXY: flexural unk 4.26 (V007898)
- TPU 95A class, tensileStrengthXY: ultimate XY 34.4 (V012567)
- TPU 95A class, tensileStrengthXY: flexural XY 4.26 (V012571)
- TPU 95A class, tensileStrengthXY: flexural XY 4.26 (V014347)
- PLA, elongationXY: break XY 34.5, 27.8 (V003649, V003863)
- PLA, elongationXY: break Z 0.9 (V003864)
- PETG, elongationXY: break XY 90, 91.06 (V005875, V006297)
- PETG, elongationXY: break moulded 83 (V007974)
- PETG, elongationXY: break unk 280, 280 (V008990, V009134)
- BVOH, elongationXY: break XY 14.8, 14.8 (V002264, V011883)
- BVOH, elongationXY: break Z 0.6, 0.6 (V002265, V011884)
- CPE, elongationXY: break XY 6.2 (V010008)
- CPE, elongationXY: break unk 110 (V010216)
- nGen / Amphora, elongationXY: break XY 11, 11 (V001958, V005885)
- nGen / Amphora, elongationXY: break moulded 190, 190 (V001961, V005888)
- nGen / Amphora, elongationXY: break unk 193 (V005921)
- TPU harder than 95A, elongationXY: break Z 31 (V000780)
- PLA, hdt045: HDT 0.45 116 (V002780)
- PLA, hdt045: HDT 1.8 amorphous 66 (V002781)
- PLA, hdt045: HDT unstated 80, 85 (V002789, V012361)
- PLA, hdt045: HDT unstated 108 (V002876)
- PLA, hdt045: Vicat amorphous 140 (V002877)
- PLA, hdt045: Tg amorphous 55 (V003211)
- PLA, hdt045: HDT 0.45 80 (V003212)
- PLA, hdt045: HDT 0.45 90 (V005586)
- PLA, hdt045: HDT 0.45 135 (V005853)
- PLA, hdt045: HDT 0.45 80 (V007474)
- PLA, hdt045: HDT 0.45 80 (V007533)
- PLA, hdt045: HDT 0.45 110 (V007602)
- PLA, hdt045: Vicat amorphous 140 (V007603)
- PLA, hdt045: Tg amorphous 55 (V010210)
- PLA, hdt045: HDT 0.45 89 (V010211)
- PLA Wood, hdt045: HDT unstated 87 (V012651)
- PLA-CF, hdt045: Tg amorphous 60 (V003308)
- PLA-CF, hdt045: HDT 0.45 91 (V003309)
- PETG, hdt045: HDT unstated 100, 94 (V002853, V012391)
- PETG, hdt045: Vicat amorphous 170 (V012393)
- PETG-CF, hdt045: HDT 0.45 75 (V014061)
- ABS, hdt045: HDT 1.8 amorphous 83 (V005683)
- ABS, hdt045: HDT 0.45 90 (V006761)
- ABS, hdt045: HDT unstated 65 (V007083)
- ABS, hdt045: HDT 1.8 amorphous 70 (V010636)
- ABS, hdt045: HDT 0.45 118.1 (V013460)
- ABS-GF, hdt045: HDT 0.45 97 (V002535)
- ABS-GF, hdt045: Tg amorphous 135 (V004463)
- ABS-GF, hdt045: HDT 0.45 82 (V005111)
- ABS-GF, hdt045: HDT 0.45 88 (V005448)
- ABS-CF, hdt045: HDT 0.45 76 (V000594)
- ABS-CF, hdt045: HDT 0.45 78 (V002175)
- ABS-CF, hdt045: HDT 0.45 91 (V014073)
- ASA, hdt045: HDT 0.45 82 (V004829)
- ASA, hdt045: HDT 1.8 amorphous 68 (V009515)
- ASA-CF, hdt045: HDT 0.45 86 (V004880)
- ASA-CF, hdt045: HDT 0.45 130 (V013107)
- PC, hdt045: HDT 0.45 101, 101 (V004707, V008720)
- PC, hdt045: HDT unstated 144 (V007724)
- PC, hdt045: HDT 1.8 amorphous 93 (V013670)
- PC, hdt045: HDT 1.8 amorphous 121 (V015185)
- PC, hdt045: HDT 0.45 144 (V015187)
- PC-CF, hdt045: HDT unstated 144 (V007487)
- PAHT-CF, hdt045: HDT 0.45 194 (V000902)
- PAHT-CF, hdt045: HDT 0.45 145 (V002464)
- PA6, hdt045: HDT 0.45 60 (V002994)
- PA6, hdt045: HDT 0.45 140 (V007666)
- PA6, hdt045: HDT unstated 186 (V007868)
- PA6, hdt045: HDT 0.45 143 (V011191)
- PA6, hdt045: HDT unstated 90 (V012432)
- PA6, hdt045: HDT unstated 90 (V012433)
- PA6-CF, hdt045: HDT 0.45 203, 209 (V004530, V008619)
- PA6-CF, hdt045: HDT 0.45 200 (V005171)
- PA6-CF, hdt045: HDT 0.45 147 (V006453)
- PA6-CF, hdt045: HDT 0.45 215 (V006543)
- PA6-CF, hdt045: HDT 0.45 140 (V007553)
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
- PA612-CF, hdt045: HDT 0.45 175 (V001054)
- PA612-CF, hdt045: HDT 0.45 138.2 (V013807)
- PET-GF, hdt045: HDT 0.45 81.6 (V001931)
- PET-GF, hdt045: HDT 0.45 200 (V005260)
- PET-GF, hdt045: HDT 1.8 amorphous 99.1 (V008153)
- PET-GF, hdt045: HDT 1.8 amorphous 99 (V013951)
- PPA, hdt045: HDT 0.45 103 (V002224)
- PPA, hdt045: HDT 0.45 81 (V002549)
- PPA-CF, hdt045: HDT 0.45 227 (V001308)
- PPA-CF, hdt045: Vicat semi-filled 230, 230 (V002566, V014089)
- PPA-CF, hdt045: Tm semi-filled 232, 232 (V002570, V014093)
- PPA-CF, hdt045: HDT 0.45 84.5, 84.5 (V002574, V014097)
- PPA-CF, hdt045: Vicat semi-filled 238 (V002592)
- PPA-CF, hdt045: Tm semi-filled 239 (V002596)
- PPA-CF, hdt045: HDT 0.45 97 (V002600)
- PPA-CF, hdt045: HDT 0.45 240, 240 (V003220, V003236)
- PPA-CF, hdt045: HDT 0.45 220 (V005246)
- PPA-CF, hdt045: HDT unstated 200, 240 (V012645, V012647)
- PPA-GF, hdt045: HDT 0.45 227 (V001326)
- PPA-GF, hdt045: Vicat semi-filled 235 (V002621)
- PPA-GF, hdt045: Tm semi-filled 232 (V002625)
- PPA-GF, hdt045: HDT 0.45 84 (V002629)
- PPA-GF, hdt045: HDT 0.45 220 (V005306)
- PPA-GF, hdt045: HDT 0.45 196 (V013859)
- PPA-GF, hdt045: HDT 0.45 147 (V013955)
- PPS-CF, hdt045: HDT 1.8 semi-filled 133 (V006394)
- BVOH, hdt045: Vicat amorphous 90 (V001424)
- HIPS, hdt045: HDT 0.45 80 (V001477)
- PP, hdt045: HDT unstated 92 (V001501)
- PP, hdt045: HDT 0.45 51 (V012179)
- PP-CF, hdt045: HDT 0.45 88 (V007762)
- PP-CF, hdt045: HDT 0.45 158 (V013627)
- CPE, hdt045: HDT 0.45 99 (V005512)
- CPE, hdt045: HDT 0.45 100, 99 (V010766, V013127)
- PC-ABS, hdt045: HDT 1.8 amorphous 90 (V002097)
- PC-PBT, hdt045: Tg amorphous 145 (V012950)
- PVDF, hdt045: HDT 0.45 158 (V001610)
- PVDF, hdt045: HDT unstated 100 (V012206)
- COC, hdt045: HDT 0.45 160 (V011484)
- COC, hdt045: HDT 0.45 60 (V011485)
- nGen FLEX, hdt045: HDT 0.45 moulded amorphous 100 (V005870)
- nGen FLEX, hdt045: Vicat amorphous 170 (V006009)
- PLA-NF, hdt045: HDT 0.45 80 (V010287)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- ASA Aero, density: 460 kg/m³, expected about 1030
- PA6-GS, density: 1010 kg/m³, expected about 1310
- PLA-EC, density: 1240 kg/m³, expected about 1530
- PBAT, tensileModulusXY: 0.006 GPa, expected about 0.985
- PA6, hdt045: 140 °C, expected about 90.2
- PA12, hdt045: 135 °C, expected about 86.1

## Consistency

Every one of the 175 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade;
- every product value cites a measurement of that product that is not quarantined (5006 checked), and a material's typical product is one of its own;
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
- `PARSE-UNREAD` **Print setup row 1613** — Nozzle text not parsed: "75-85℃"
- `PARSE-UNREAD` **profiles** — 1 process temperature cells were not parsed: P1612 nozzle: "75-85℃"
- `NO-MEASUREMENTS` **materials** — 2 materials have no property measurements at all: PA66-CF, PA612-GF
- `EST-REJECTED` **measurements** — 6 values are physically impossible for their property and were kept out of the estimate model: V009245 PLA Density 3130 kg/m³; V009254 PLA Density 3900 kg/m³; V009486 PLA Density 4000 kg/m³; V009522 PLA Metal Density 2780 kg/m³; V009638 PLA Metal Density 3400 kg/m³; V009775 PLA Metal Density 3500 kg/m³
- `EST-OUTLIER` **materials** — 6 measured headlines sit far outside what every other observation predicts; check the source and the grade: ASA Aero density 460 (expected about 1030); PA6-GS density 1010 (expected about 1310); PLA-EC density 1240 (expected about 1530); PBAT tensileModulusXY 0.006 (expected about 0.985); PA6 hdt045 140 (expected about 90.2); PA12 hdt045 135 (expected about 86.1)
- `EST-FAMILY-ORDER` **materials** — 5 reinforced materials sit below their unfilled sibling: ABS-AF tensileModulusXY 1.89 < ABS 2.2; ASA-AF tensileModulusXY 1.79 (estimate) < ASA 2.1746; PBT-GF hdt045 172.5 < PBT 180; PA12-AF hdt045 97 (estimate) < PA12 135; Nylon-CF, maker-undisclosed polyamide tensileModulusXY 2.16 < Nylon, maker-undisclosed polyamide 3
