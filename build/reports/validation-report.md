# Validation report

Database snapshot 2026-09-16 · build 2026-09-20

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 143 |
| h2cRelevant | 124 |
| familyEntries | 5 |
| retiredDuplicates | [object Object] |
| excluded | 14 |
| grades | 643 |
| measurements | 7286 |
| numericMeasurements | 7125 |
| quarantined | 4 |
| profiles | 709 |
| evidence | 481 |
| prices | 104 |
| sources | 848 |
| coverage | 728 |
| polymerEnvironment | 353 |
| polymerEvidence | 313 |
| coverageDerived | 645 |

## Headline coverage

What a selection criterion can actually decide, out of 143 canonical materials.

| Headline | Materials with a value |
|---|---:|
| density | 119 |
| tensileModulusXY | 91 |
| tensileStrengthXY | 77 |
| elongationXY | 91 |
| hdt045 | 87 |
| priceCADkg | 38 |

## H2C envelope gate

Baseline 350 C nozzle, 120 C bed, 65 C chamber.

| Axis | within | partial window | exceeds | exceeds (recommendation only) | unknown |
|---|---:|---:|---:|---:|---:|
| nozzle | 115 | n/a | 14 | 0 | 14 |
| bed | 113 | n/a | 14 | 0 | 16 |
| chamber | 75 | 3 | 5 | 2 | 58 |

A partial window is chamber-only: part of the published window is reachable at 65 C, never all of it.
Nozzle and bed are read by the upper end of the window.

## Chamber evidence

What the 129 in-scope materials publish about the chamber, strongest kind first. A statement
in words is manufacturer evidence but never a temperature. An estimated band is inference from
data/tables/chamber_bands.csv; it is shown beside the chamber question and changes no verdict.

| Kind | Materials |
|---|---:|
| Published temperature window | 54 |
| No heated chamber needed, in words | 27 |
| Chamber recommended, no temperature | 3 |
| Data sheet lists no setpoint | 1 |
| Nothing published | 44 |
| Carrying an estimated band (any of the last three) | 18 |

25 research bands are superseded by evidence and not used: PLA Basic (20-45 °C; publishes 25-45 °C), PLA Matte (20-45 °C; publishes 25-45 °C), PLA Lite (20-45 °C; a source says no heated chamber is needed), PLA Metal (20-45 °C; publishes 25-45 °C), PLA Marble (20-45 °C; publishes 25-45 °C), PLA Sparkle (20-45 °C; publishes 25-45 °C), PLA Galaxy (20-45 °C; publishes 25-45 °C), PLA Silk (20-45 °C; a source says no heated chamber is needed), Support for PA/PET (20-45 °C; publishes 45-60 °C), PETG Basic (20-50 °C; publishes 35-50 °C), PETG HF (20-50 °C; publishes 35-50 °C), PETG-CF (20-50 °C; publishes 35-50 °C), PEBA (20-50 °C; a source says no heated chamber is needed), PP (20-50 °C; a source says no heated chamber is needed), CPE (20-50 °C; a source says no heated chamber is needed), CPE-CF (20-50 °C; a source says no heated chamber is needed), CoPE (20-50 °C; a source says no heated chamber is needed), ASA-GF (45-70 °C; publishes 25-60 °C), PC FR (45-70 °C; publishes 45-60 °C), PAHT-CF (45-70 °C; publishes 45-60 °C), PET (45-70 °C; a source says no heated chamber is needed), PET-GF (45-70 °C; a source says no heated chamber is needed), PPS-CF (60-90 °C; publishes 60-90 °C), PPA-CF (80-120 °C; publishes 50-80 °C), POM / Acetal (45-80 °C; publishes 70-140 °C).

## Environment evidence

A verdict category has findings that reduce to resistant, limited or not resistant, so it
can answer a pass/fail question. An indicator category has records but no reducible verdict
among them, so it can only show evidence and must never be offered as a hard constraint.

| Category | Kind | Records | With a verdict | Materials | From the base polymer |
|---|---|---:|---:|---:|---:|
| alkali | verdict | 63 | 61 | 50 | 47 |
| acid | verdict | 67 | 59 | 51 | 47 |
| organic-solvent | verdict | 63 | 45 | 53 | 50 |
| oil-grease | verdict | 57 | 45 | 52 | 45 |
| water-solubility | verdict | 42 | 41 | 41 | 32 |
| flammability | verdict | 42 | 36 | 41 | 12 |
| food-contact | indicator | 2 | 0 | 2 | 0 |
| uv-outdoor | verdict | 7 | 0 | 6 | 19 |
| moisture | verdict | 12 | 0 | 10 | 23 |
| creep | indicator | 2 | 0 | 2 | 0 |
| fatigue | indicator | 5 | 0 | 5 | 0 |
| hydrolysis | verdict | 4 | 0 | 4 | 38 |

## Polymer-level behaviour

353 rows of published base-polymer behaviour, attached as 313 inferred records to 84 materials
with no grade-level record in the category (D64). A record is shown in the drawer, counted apart in the filter rail, may screen a
material out under inference where the polymer is attacked or dissolved, and never passes a requirement.

| Category | Polymers | Agent rows | Materials covered | Of which may screen |
|---|---:|---:|---:|---:|
| acid | 21 | 94 | 47 | 12 |
| alkali | 20 | 43 | 47 | 10 |
| flammability | 4 | 4 | 12 | 10 |
| hydrolysis | 12 | 19 | 38 | 10 |
| moisture | 2 | 2 | 23 | 0 |
| oil-grease | 20 | 78 | 45 | 0 |
| organic-solvent | 23 | 87 | 50 | 14 |
| uv-outdoor | 8 | 8 | 19 | 1 |
| water-solubility | 15 | 18 | 32 | 1 |

## Estimates

A missing headline carries an estimate from one Gaussian model per property that takes every observation
in the snapshot, each converted to the headline's semantics (build/mappings/estimate-model.json, DECISIONS
D43). The likely range is 80% and the plausible range 95%. Both are calibrated by hiding each measured
headline and predicting it from everything else; the build fails if that coverage drifts. An estimate never
passes a material; in Explore it may screen one out only when its plausible range wholly fails.

| Headline | Observations | Hidden headlines | Likely range holds | Plausible range holds | Median likely width | Spread between products |
|---|---:|---:|---:|---:|---:|---:|
| density | 549 | 104 | 81% | 95% | ×1.13 | 0.0198 (5338 pairs) |
| tensileModulusXY | 902 | 77 | 81% | 96% | ×1.53 | 0.325 (597 pairs) |
| tensileStrengthXY | 927 | 56 | 80% | 96% | ×1.65 | 0.232 (1302 pairs) |
| elongationXY | 703 | 77 | 81% | 96% | ×2.76 | 0.74 (1256 pairs) |
| hdt045 | 719 | 66 | 80% | 96% | 19.2 °C | 5.24 (917 pairs) |

| Headline | Missing | From its own grade | From its other grades | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 19 | 12 | 3 | 4 | 0 | 0 | 19 |
| tensileModulusXY | 46 | 31 | 4 | 6 | 5 | 0 | 41 |
| tensileStrengthXY | 60 | 48 | 5 | 3 | 4 | 0 | 50 |
| elongationXY | 46 | 28 | 7 | 7 | 4 | 0 | 42 |
| hdt045 | 49 | 24 | 7 | 4 | 14 | 0 | 33 |

Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most 10% of the time with 90% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.

| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |
|---|---|---:|---:|---:|---:|---:|
| density | this-grade | 0 | 0 | cannot screen | 0 | cannot screen |
| density | this-material | 62 | 4 | 98.42% point | 2 | 2.5% point |
| density | family | 104 | 1 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-grade | 72 | 3 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 50 | 0 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | family | 77 | 1 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-grade | 54 | 2 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-material | 36 | 0 | 97.5% point | 0 | 2.5% point |
| tensileStrengthXY | family | 56 | 0 | 97.5% point | 0 | 2.5% point |
| elongationXY | this-grade | 51 | 1 | 97.5% point | 0 | 2.5% point |
| elongationXY | this-material | 49 | 2 | 98.91% point | 2 | 2.17% point |
| elongationXY | family | 77 | 1 | 97.5% point | 1 | 2.5% point |
| hdt045 | this-grade | 53 | 1 | 97.5% point | 0 | 2.5% point |
| hdt045 | this-material | 42 | 2 | 98.37% point | 1 | 2.5% point |
| hdt045 | family | 66 | 4 | 98.16% point | 1 | 2.5% point |

- Unstated-load bracket, amorphous: top at the published value + 15 °C (72 grades publish both loads; at 90% confidence at most 10% of grades show a gap larger than 15 °C, the 4th largest gap observed).
- Unstated-load bracket, semi-unfilled: its top cannot screen (only 4 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).
- Unstated-load bracket, semi-filled: top at the published value + 120 °C (23 grades publish both loads; at 90% confidence at most 10% of grades show a gap larger than 120 °C, the largest gap observed).
- Unstated-load bracket, elastomer: its top cannot screen (only 0 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).

Evidence that contradicts everything else and was down-weighted:

- PLA, density: density 1360 (V004368)
- PLA, density: density 1310 (V004621)
- PLA, density: density 1390 (V006192)
- PLA, density: density 1329 (V006557)
- PLA Metal, density: density 1250 (V000184)
- PLA Metal, density: density 2360, 2360 (V004044, V004066)
- PLA Metal, density: density 2330, 2330 (V004048, V004062)
- PLA Metal, density: density 2280, 2280 (V004058, V004070)
- PLA Metal, density: density 1225 (V007387)
- PLA Wood, density: density 1020 (V005557)
- PLA Wood, density: density 1254 (V006967)
- PLA Aero, density: density 1210 (V000303)
- PLA Aero, density: density 1240 (V002975)
- PLA Aero, density: density 900 (V003554)
- PLA Aero, density: density 900 (V003652)
- PLA Aero, density: density 840 (V004522)
- PLA Aero, density: density 1210 (V004816)
- PLA Aero, density: density 1200 (V005770)
- PLA Aero, density: density 1200 (V005973)
- PLA Aero, density: density 1200 (V006763)
- PETG, density: density 1180 (V002844)
- PETG, density: density 1350 (V007369)
- ABS, density: density 1150 (V004699)
- PAHT-CF, density: density 1060 (V000896)
- PAHT-CF, density: density 1250 (V007437)
- PA6-CF, density: density 1090 (V005123)
- PA6-GF, density: density 1140 (V000943)
- PA6-GF, density: density 1370 (V005580)
- PPA-CF, density: density 1250 (V001302)
- PPS-CF, density: density 1510 (V007156)
- PP-CF, density: density 1100 (V001502)
- PP-CF, density: density 910 (V006381)
- POM / Acetal, density: density 1140 (V002322)
- PLA Silk, tensileModulusXY: tensile XY 0.597 (V004369)
- PLA Silk, tensileModulusXY: tensile Z 0.363 (V004370)
- PLA Silk, tensileModulusXY: flexural XY 2.473 (V004375)
- PETG, tensileModulusXY: tensile XY 0.5 (V004389)
- PETG, tensileModulusXY: flexural XY 1.9 (V004395)
- ABS, tensileModulusXY: tensile XY 0.21708, 0.21716 (V005137, V005140)
- PAHT-CF, tensileModulusXY: tensile Z 3.532 (V002470)
- PA6-CF, tensileModulusXY: tensile unk 1.1 (V004325)
- PA6-GF, tensileModulusXY: flexural XY 0.2, 0.0575 (V005395, V005396)
- PA12-CF, tensileModulusXY: tensile XY 0.495 (V004845)
- PA12-CF, tensileModulusXY: flexural XY 3.193 (V004848)
- PPA-CF, tensileModulusXY: tensile Z 4.3 (V001311)
- PPS-CF, tensileModulusXY: tensile Z 2.85 (V001362)
- PPS-CF, tensileModulusXY: tensile Z 2.72 (V001867)
- PLA, tensileStrengthXY: ultimate XY 32.7, 8.7 (V005060, V005063)
- PLA, tensileStrengthXY: flexural unk 63.8 (V005066)
- PLA Silk, tensileStrengthXY: ultimate unk 11.1 (V007105)
- ASA-GF, tensileStrengthXY: flexural unk 27.2 (V002205)
- TPU, tensileStrengthXY: ultimate XY 27 (V005374)
- TPU, tensileStrengthXY: flexural XY 7 (V005377)
- TPU, tensileStrengthXY: ultimate unk 30, 50 (V005838, V005844)
- TPU, tensileStrengthXY: flexural unk 1.55 (V005841)
- TPU, tensileStrengthXY: ultimate unk 17, 32 (V005940, V005946)
- TPU, tensileStrengthXY: flexural unk 2.9 (V005943)
- PA12-CF, tensileStrengthXY: ultimate XY 58, 14 (V004843, V004844)
- PA12-CF, tensileStrengthXY: flexural XY 96 (V004847)
- PP, tensileStrengthXY: flexural unk 13.9 (V001498)
- PP-CF, tensileStrengthXY: break XY 78 (V001503)
- PP-CF, tensileStrengthXY: flexural XY 68 (V001506)
- TPC-ESD, tensileStrengthXY: break XY 70 (V003135)
- TPC-ESD, tensileStrengthXY: flexural XY 50 (V003137)
- PBAT, tensileStrengthXY: ultimate XY 27 (V005365)
- PBAT, tensileStrengthXY: flexural XY 7 (V005368)
- CPE-LW, tensileStrengthXY: break unk 28 (V005545)
- CPE-LW, tensileStrengthXY: ultimate unk 2, 4 (V005546, V005547)
- nGen FLEX, tensileStrengthXY: flexural unk 8.9 (V005863)
- PLA, elongationXY: break XY 34.5, 27.8 (V003649, V003863)
- PLA, elongationXY: break Z 0.9 (V003864)
- PLA-CF, elongationXY: break XY 13.2 (V003424)
- PLA-CF, elongationXY: break Z 0.9 (V003425)
- PETG, elongationXY: break unk 400 (V003085)
- TPU, elongationXY: break moulded 6.9 (V004124)
- TPU for AMS, elongationXY: break Z 31 (V000780)
- BVOH, elongationXY: break XY 14.8 (V002264)
- BVOH, elongationXY: break Z 0.6 (V002265)
- PLA, hdt045: HDT 0.45 116 (V002780)
- PLA, hdt045: HDT 1.8 amorphous 66 (V002781)
- PLA, hdt045: Vicat amorphous 140 (V002877)
- PLA, hdt045: Tg amorphous 55 (V003211)
- PLA, hdt045: HDT 0.45 80 (V003212)
- PLA, hdt045: Tg amorphous 59.15 (V003899)
- PLA, hdt045: Vicat amorphous 148.3 (V003900)
- PLA, hdt045: HDT 0.45 57 (V004933)
- PLA, hdt045: Tg amorphous 160 (V004934)
- PLA, hdt045: HDT unstated moulded amorphous 134 (V005792)
- PLA, hdt045: HDT unstated 135 (V005853)
- PLA, hdt045: Vicat amorphous 160 (V006191)
- PLA, hdt045: HDT unstated 55 (V006337)
- PLA Aero, hdt045: HDT unstated 135 (V005974)
- PLA-CF, hdt045: Tg amorphous 60 (V003308)
- PLA-CF, hdt045: HDT 0.45 91 (V003309)
- ABS, hdt045: HDT 0.45 90 (V006761)
- ABS-GF, hdt045: HDT 0.45 97 (V002535)
- ABS-GF, hdt045: Tg amorphous 135 (V004463)
- ABS-GF, hdt045: HDT 0.45 82 (V005111)
- ABS-CF, hdt045: HDT 0.45 76 (V000594)
- ASA, hdt045: HDT 0.45 82 (V004829)
- ASA, hdt045: HDT 0.45 94 (V006745)
- PC-GF, hdt045: Vicat amorphous 142 (V005700)
- PAHT-CF, hdt045: Tm semi-filled 234 (V002459)
- PAHT-CF, hdt045: HDT 0.45 145 (V002464)
- PA6-CF, hdt045: HDT 1.8 semi-filled 65 (V002731)
- PA6-CF, hdt045: HDT 0.45 203 (V004530)
- PA6-CF, hdt045: HDT 0.45 147 (V006453)
- PA6-CF, hdt045: HDT 0.45 215 (V006543)
- PA6-GF, hdt045: HDT 1.8 semi-filled 65 (V002720)
- PA6-GF, hdt045: HDT 0.45 205.2 (V004592)
- PA12-CF, hdt045: HDT 0.45 170, 170 (V002094, V006516)
- PA12-CF, hdt045: HDT 0.45 175 (V004504)
- PA12-CF, hdt045: HDT 0.45 185 (V004841)
- PA12-CF, hdt045: HDT 0.45 48 (V007204)
- PA12-CF, hdt045: Tm semi-filled 170 (V007206)
- PA6/66, hdt045: HDT 0.45 110.5 (V001021)
- PA6/66, hdt045: HDT unstated 50 (V006803)
- PET-GF, hdt045: HDT 0.45 81.6 (V001931)
- PET-GF, hdt045: HDT 0.45 200 (V005260)
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
- PC-ABS, hdt045: HDT 1.8 amorphous 90 (V002097)
- nGen FLEX, hdt045: Tg amorphous -40 (V005868)
- nGen FLEX, hdt045: Vicat amorphous 170 (V006009)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- PLA Metal, density: 1250 kg/m³, expected about 1880
- PLA Aero, density: 1210 kg/m³, expected about 1020
- TPU, elongationXY: 330.1 %, expected about 492

## Consistency

Every one of the 143 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade, and the representative grade is one of them;
- every headline cites a measurement of its own material and of the representative grade (465 checked);
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

- `HDT-LOAD-UNSTATED` **materials** — 10 of 87 HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.
- `NO-MEASUREMENTS` **materials** — 2 materials have no property measurements at all: PA66-CF, PA612-GF
- `EST-OUTLIER` **materials** — 3 measured headlines sit far outside what every other observation predicts; check the source and the grade: PLA Metal density 1250 (expected about 1880); PLA Aero density 1210 (expected about 1020); TPU elongationXY 330.1 (expected about 492)
- `EST-FAMILY-ORDER` **materials** — 2 reinforced materials sit below their unfilled sibling: PLA-CF tensileModulusXY 2.79 < PLA 2.865; ASA-AF tensileModulusXY 2.03 (estimate) < ASA 2.45
