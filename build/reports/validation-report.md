# Validation report

Database snapshot 2026-09-16 · build 2026-09-19

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 131 |
| h2cRelevant | 112 |
| familyEntries | 5 |
| retiredDuplicates | [object Object] |
| excluded | 14 |
| grades | 339 |
| measurements | 4188 |
| numericMeasurements | 4027 |
| quarantined | 4 |
| profiles | 395 |
| evidence | 481 |
| prices | 104 |
| sources | 486 |
| coverage | 683 |
| polymerEnvironment | 353 |
| polymerEvidence | 302 |
| coverageDerived | 604 |

## Headline coverage

What a selection criterion can actually decide, out of 131 canonical materials.

| Headline | Materials with a value |
|---|---:|
| density | 109 |
| tensileModulusXY | 89 |
| tensileStrengthXY | 75 |
| elongationXY | 89 |
| hdt045 | 81 |
| priceCADkg | 38 |

## H2C envelope gate

Baseline 350 C nozzle, 120 C bed, 65 C chamber.

| Axis | within | partial window | exceeds | exceeds (recommendation only) | unknown |
|---|---:|---:|---:|---:|---:|
| nozzle | 108 | n/a | 14 | 0 | 9 |
| bed | 105 | n/a | 16 | 0 | 10 |
| chamber | 73 | 4 | 5 | 2 | 47 |

A partial window is chamber-only: part of the published window is reachable at 65 C, never all of it.
Nozzle and bed are read by the upper end of the window.

## Chamber evidence

What the 117 in-scope materials publish about the chamber, strongest kind first. A statement
in words is manufacturer evidence but never a temperature. An estimated band is inference from
data/tables/chamber_bands.csv; it is shown beside the chamber question and changes no verdict.

| Kind | Materials |
|---|---:|
| Published temperature window | 54 |
| No heated chamber needed, in words | 26 |
| Chamber recommended, no temperature | 3 |
| Data sheet lists no setpoint | 1 |
| Nothing published | 33 |
| Carrying an estimated band (any of the last three) | 19 |

24 research bands are superseded by evidence and not used: PLA Basic (20-45 °C; publishes 25-45 °C), PLA Matte (20-45 °C; publishes 25-45 °C), PLA Lite (20-45 °C; a source says no heated chamber is needed), PLA Metal (20-45 °C; publishes 25-45 °C), PLA Marble (20-45 °C; publishes 25-45 °C), PLA Sparkle (20-45 °C; publishes 25-45 °C), PLA Galaxy (20-45 °C; publishes 25-45 °C), PLA Silk (20-45 °C; a source says no heated chamber is needed), Support for PA/PET (20-45 °C; publishes 45-60 °C), PETG Basic (20-50 °C; publishes 35-50 °C), PETG HF (20-50 °C; publishes 35-50 °C), PETG-CF (20-50 °C; publishes 35-50 °C), PEBA (20-50 °C; a source says no heated chamber is needed), CPE (20-50 °C; a source says no heated chamber is needed), CPE-CF (20-50 °C; a source says no heated chamber is needed), CoPE (20-50 °C; a source says no heated chamber is needed), ASA-GF (45-70 °C; publishes 25-60 °C), PC FR (45-70 °C; publishes 45-60 °C), PAHT-CF (45-70 °C; publishes 45-60 °C), PET (45-70 °C; a source says no heated chamber is needed), PET-GF (45-70 °C; a source says no heated chamber is needed), PPS-CF (60-90 °C; publishes 60-90 °C), PPA-CF (80-120 °C; publishes 50-80 °C), POM / Acetal (45-80 °C; publishes 70-140 °C).

## Environment evidence

A verdict category has findings that reduce to resistant, limited or not resistant, so it
can answer a pass/fail question. An indicator category has records but no reducible verdict
among them, so it can only show evidence and must never be offered as a hard constraint.

| Category | Kind | Records | With a verdict | Materials | From the base polymer |
|---|---|---:|---:|---:|---:|
| alkali | verdict | 63 | 61 | 50 | 45 |
| acid | verdict | 67 | 59 | 51 | 45 |
| organic-solvent | verdict | 63 | 45 | 53 | 48 |
| oil-grease | verdict | 57 | 45 | 52 | 43 |
| water-solubility | verdict | 42 | 41 | 41 | 31 |
| flammability | verdict | 42 | 36 | 41 | 12 |
| food-contact | indicator | 2 | 0 | 2 | 0 |
| uv-outdoor | verdict | 7 | 0 | 6 | 18 |
| moisture | verdict | 12 | 0 | 10 | 23 |
| creep | indicator | 2 | 0 | 2 | 0 |
| fatigue | indicator | 5 | 0 | 5 | 0 |
| hydrolysis | verdict | 4 | 0 | 4 | 37 |

## Polymer-level behaviour

353 rows of published base-polymer behaviour, attached as 302 inferred records to 82 materials
with no grade-level record in the category (D64). A record is shown in the drawer, counted apart in the filter rail, may screen a
material out under inference where the polymer is attacked or dissolved, and never passes a requirement.

| Category | Polymers | Agent rows | Materials covered | Of which may screen |
|---|---:|---:|---:|---:|
| acid | 21 | 94 | 45 | 12 |
| alkali | 20 | 43 | 45 | 9 |
| flammability | 4 | 4 | 12 | 10 |
| hydrolysis | 12 | 19 | 37 | 9 |
| moisture | 2 | 2 | 23 | 0 |
| oil-grease | 20 | 78 | 43 | 0 |
| organic-solvent | 23 | 87 | 48 | 14 |
| uv-outdoor | 8 | 8 | 18 | 1 |
| water-solubility | 15 | 18 | 31 | 1 |

## Estimates

A missing headline carries an estimate from one Gaussian model per property that takes every observation
in the snapshot, each converted to the headline's semantics (build/mappings/estimate-model.json, DECISIONS
D43). The likely range is 80% and the plausible range 95%. Both are calibrated by hiding each measured
headline and predicting it from everything else; the build fails if that coverage drifts. An estimate never
passes a material; in Explore it may screen one out only when its plausible range wholly fails.

| Headline | Observations | Hidden headlines | Likely range holds | Plausible range holds | Median likely width | Spread between products |
|---|---:|---:|---:|---:|---:|---:|
| density | 287 | 94 | 81% | 96% | ×1.16 | 0.0185 (746 pairs) |
| tensileModulusXY | 534 | 75 | 80% | 96% | ×1.48 | 0.147 (199 pairs) |
| tensileStrengthXY | 477 | 54 | 80% | 96% | ×1.61 | 0.17 (198 pairs) |
| elongationXY | 371 | 75 | 80% | 96% | ×2.5 | 0.727 (181 pairs) |
| hdt045 | 373 | 63 | 81% | 95% | 17.3 °C | 7.34 (136 pairs) |

| Headline | Missing | From its own grade | From its other grades | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 17 | 12 | 3 | 2 | 0 | 0 | 17 |
| tensileModulusXY | 36 | 23 | 4 | 4 | 5 | 0 | 31 |
| tensileStrengthXY | 50 | 39 | 4 | 2 | 5 | 0 | 39 |
| elongationXY | 36 | 19 | 7 | 5 | 5 | 0 | 31 |
| hdt045 | 43 | 20 | 5 | 3 | 15 | 0 | 27 |

Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most 10% of the time with 90% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.

| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |
|---|---|---:|---:|---:|---:|---:|
| density | this-grade | 0 | 0 | cannot screen | 0 | cannot screen |
| density | this-material | 50 | 2 | 98.88% point | 1 | 2.5% point |
| density | family | 94 | 2 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-grade | 72 | 3 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 42 | 1 | 97.5% point | 2 | 1.47% point |
| tensileModulusXY | family | 75 | 1 | 97.5% point | 0 | 2.5% point |
| tensileStrengthXY | this-grade | 52 | 1 | 97.5% point | 2 | 2.5% point |
| tensileStrengthXY | this-material | 31 | 0 | 97.5% point | 0 | 2.5% point |
| tensileStrengthXY | family | 54 | 0 | 97.5% point | 1 | 2.5% point |
| elongationXY | this-grade | 51 | 0 | 97.5% point | 0 | 2.5% point |
| elongationXY | this-material | 41 | 1 | 97.5% point | 1 | 2.5% point |
| elongationXY | family | 75 | 1 | 97.5% point | 1 | 2.5% point |
| hdt045 | this-grade | 53 | 3 | 97.97% point | 0 | 2.5% point |
| hdt045 | this-material | 33 | 4 | 99.81% point | 0 | 2.5% point |
| hdt045 | family | 63 | 4 | 99.09% point | 2 | 2.5% point |

- Unstated-load bracket, amorphous: top at the published value + 13 °C (62 grades publish both loads; at 90% confidence at most 10% of grades show a gap larger than 13 °C, the third largest gap observed).
- Unstated-load bracket, semi-unfilled: its top cannot screen (only 3 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).
- Unstated-load bracket, semi-filled: its top cannot screen (only 18 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).
- Unstated-load bracket, elastomer: its top cannot screen (only 0 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).

Evidence that contradicts everything else and was down-weighted:

- PLA Metal, density: density 1250 (V000184)
- PLA Metal, density: density 2360, 2360 (V004044, V004066)
- PLA Metal, density: density 2330, 2330 (V004048, V004062)
- PLA Metal, density: density 2280, 2280 (V004058, V004070)
- PLA Sparkle, density: density 1240 (V004026)
- PLA Aero, density: density 1210 (V000303)
- PLA Aero, density: density 1240 (V002975)
- PLA Aero, density: density 900 (V003554)
- PLA Aero, density: density 900 (V003652)
- PETG, density: density 1180 (V002844)
- ABS, density: density 1120 (V002349)
- PC-CF, density: density 1360 (V000719)
- PC-CF, density: density 1180 (V000733)
- PC-CF, density: density 1360 (V003361)
- PPA-CF, density: density 1250 (V001302)
- PAHT-CF, tensileModulusXY: tensile XY 8.386 (V002469)
- PAHT-CF, tensileModulusXY: tensile Z 3.532 (V002470)
- PA6-CF, tensileModulusXY: tensile unk 1.1 (V004325)
- PA612-ESD, tensileModulusXY: tensile Z 1.7844 (V001239)
- PPA-CF, tensileModulusXY: tensile XY 11.8 (V001310)
- PPA-CF, tensileModulusXY: tensile Z 4.3 (V001311)
- PPS-CF, tensileModulusXY: tensile XY 8.23 (V001361)
- PPS-CF, tensileModulusXY: tensile Z 2.85 (V001362)
- PPS-CF, tensileModulusXY: tensile Z 2.72 (V001867)
- PPS-GF, tensileModulusXY: tensile XY 5.764 (V001381)
- PPS-GF, tensileModulusXY: tensile Z 2.581 (V001382)
- PETG, tensileStrengthXY: flexural unk 171 (V000417)
- PLA, elongationXY: break XY 34.5, 27.8 (V003649, V003863)
- PLA, elongationXY: break Z 0.9 (V003864)
- PLA-CF, elongationXY: break XY 13.2 (V003424)
- TPU, elongationXY: break moulded 6.9 (V004124)
- TPU for AMS, elongationXY: break Z 31 (V000780)
- BVOH, elongationXY: break XY 14.8 (V002264)
- BVOH, elongationXY: break Z 0.6 (V002265)
- PLA, hdt045: Vicat amorphous 140 (V002877)
- PLA, hdt045: Tg amorphous 55 (V003211)
- PLA, hdt045: HDT 0.45 80 (V003212)
- PLA, hdt045: Tg amorphous 59.15 (V003899)
- PLA, hdt045: Vicat amorphous 148.3 (V003900)
- PLA-CF, hdt045: Tg amorphous 60 (V003308)
- PLA-CF, hdt045: HDT 0.45 91 (V003309)
- ABS-CF, hdt045: Tg amorphous 105 (V000593)
- ABS-CF, hdt045: HDT 0.45 76 (V000594)
- PAHT-CF, hdt045: Tm semi-filled 234 (V002459)
- PAHT-CF, hdt045: HDT 0.45 145 (V002464)
- PA6-CF, hdt045: HDT 1.8 semi-filled 65 (V002731)
- PA6-GF, hdt045: HDT 1.8 semi-filled 65 (V002720)
- PPA-CF, hdt045: HDT 0.45 227 (V001308)
- PPA-CF, hdt045: Tm semi-filled 232 (V002570)
- PPA-CF, hdt045: HDT 0.45 84.5 (V002574)
- PPA-CF, hdt045: Tm semi-filled 239 (V002596)
- PPA-CF, hdt045: HDT 0.45 97 (V002600)
- PPA-CF, hdt045: HDT 0.45 240, 240 (V003220, V003236)
- PPA-GF, hdt045: HDT 0.45 227 (V001326)
- PPA-GF, hdt045: Tm semi-filled 232 (V002625)
- PPA-GF, hdt045: HDT 0.45 84 (V002629)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- PLA Metal, density: 1250 kg/m³, expected about 2170
- PLA Aero, density: 1210 kg/m³, expected about 932
- TPU, elongationXY: 330.1 %, expected about 508

## Consistency

Every one of the 131 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade, and the representative grade is one of them;
- every headline cites a measurement of its own material and of the representative grade (443 checked);
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

- `HDT-LOAD-UNSTATED` **materials** — 7 of 81 HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.
- `NO-MEASUREMENTS` **materials** — 2 materials have no property measurements at all: PA66-CF, PA612-GF
- `EST-OUTLIER` **materials** — 3 measured headlines sit far outside what every other observation predicts; check the source and the grade: PLA Metal density 1250 (expected about 2170); PLA Aero density 1210 (expected about 932); TPU elongationXY 330.1 (expected about 508)
- `EST-FAMILY-ORDER` **materials** — 2 reinforced materials sit below their unfilled sibling: PLA-CF tensileModulusXY 2.79 < PLA 2.865; ASA-AF tensileModulusXY 2.25 (estimate) < ASA 2.45
