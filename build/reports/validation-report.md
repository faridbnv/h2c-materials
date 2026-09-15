# Validation report

Database snapshot 2026-09-13 · build 2026-09-15

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 103 |
| h2cRelevant | 92 |
| familyEntries | 5 |
| retiredDuplicates | [object Object] |
| excluded | 6 |
| grades | 156 |
| measurements | 2078 |
| numericMeasurements | 1920 |
| quarantined | 4 |
| profiles | 172 |
| evidence | 462 |
| prices | 104 |
| sources | 244 |
| coverage | 1199 |

## Headline coverage

What a selection criterion can actually decide, out of 103 canonical materials.

| Headline | Materials with a value |
|---|---:|
| density | 92 |
| tensileModulusXY | 73 |
| tensileStrengthXY | 58 |
| elongationXY | 74 |
| hdt045 | 67 |
| priceCADkg | 38 |

## H2C envelope gate

Baseline 350 C nozzle, 120 C bed, 65 C chamber.

| Axis | within | partial window | exceeds | exceeds (recommendation only) | unknown |
|---|---:|---:|---:|---:|---:|
| nozzle | 88 | n/a | 6 | 0 | 9 |
| bed | 87 | n/a | 7 | 0 | 9 |
| chamber | 63 | 4 | 5 | 2 | 29 |

A partial window is chamber-only: part of the published window is reachable at 65 C, never all of it.
Nozzle and bed are read by the upper end of the window.

## Chamber evidence

What the 97 in-scope materials publish about the chamber, strongest kind first. A statement
in words is manufacturer evidence but never a temperature. An estimated band is inference from
data/tables/chamber_bands.csv; it is shown beside the chamber question and changes no verdict.

| Kind | Materials |
|---|---:|
| Published temperature window | 54 |
| No heated chamber needed, in words | 16 |
| Chamber recommended, no temperature | 3 |
| Data sheet lists no setpoint | 1 |
| Nothing published | 23 |
| Carrying an estimated band (any of the last three) | 20 |

23 research bands are superseded by evidence and not used: PLA Basic (20-45 °C; publishes 25-45 °C), PLA Matte (20-45 °C; publishes 25-45 °C), PLA Lite (20-45 °C; a source says no heated chamber is needed), PLA Metal (20-45 °C; publishes 25-45 °C), PLA Marble (20-45 °C; publishes 25-45 °C), PLA Sparkle (20-45 °C; publishes 25-45 °C), PLA Galaxy (20-45 °C; publishes 25-45 °C), PLA Silk (20-45 °C; a source says no heated chamber is needed), Support for PA/PET (20-45 °C; publishes 45-60 °C), PETG Basic (20-50 °C; publishes 35-50 °C), PETG HF (20-50 °C; publishes 35-50 °C), PETG-CF (20-50 °C; publishes 35-50 °C), PEBA (20-50 °C; a source says no heated chamber is needed), CPE (20-50 °C; a source says no heated chamber is needed), CPE-CF (20-50 °C; a source says no heated chamber is needed), CoPE (20-50 °C; a source says no heated chamber is needed), ASA-GF (45-70 °C; publishes 25-60 °C), PC FR (45-70 °C; publishes 45-60 °C), PAHT-CF (45-70 °C; publishes 45-60 °C), PET-GF (45-70 °C; a source says no heated chamber is needed), PPS-CF (60-90 °C; publishes 60-90 °C), PPA-CF (80-120 °C; publishes 50-80 °C), POM / Acetal (45-80 °C; publishes 70-140 °C).

## Environment evidence

A verdict category has findings that reduce to resistant, limited or not resistant, so it
can answer a pass/fail question. An indicator category has records but no reducible verdict
among them, so it can only show evidence and must never be offered as a hard constraint.

| Category | Kind | Records | With a verdict | Materials |
|---|---|---:|---:|---:|
| alkali | verdict | 63 | 61 | 50 |
| acid | verdict | 67 | 59 | 51 |
| organic-solvent | verdict | 63 | 45 | 53 |
| oil-grease | verdict | 57 | 45 | 52 |
| water-solubility | verdict | 42 | 41 | 41 |
| flammability | verdict | 41 | 36 | 41 |
| food-contact | indicator | 2 | 0 | 2 |
| uv-outdoor | indicator | 7 | 0 | 6 |
| moisture | indicator | 7 | 0 | 7 |
| creep | indicator | 2 | 0 | 2 |
| fatigue | indicator | 5 | 0 | 5 |
| hydrolysis | indicator | 4 | 0 | 4 |

## Estimates

A missing headline carries an estimate from one Gaussian model per property that takes every observation
in the snapshot, each converted to the headline's semantics (build/mappings/estimate-model.json, DECISIONS
D43). The likely range is 80% and the plausible range 95%. Both are calibrated by hiding each measured
headline and predicting it from everything else; the build fails if that coverage drifts. An estimate never
passes a material; in Explore it may screen one out only when its plausible range wholly fails.

| Headline | Observations | Hidden headlines | Likely range holds | Plausible range holds | Median likely width | Spread between products |
|---|---:|---:|---:|---:|---:|---:|
| density | 124 | 86 | 80% | 95% | ×1.13 | 0.0371 (38 pairs) |
| tensileModulusXY | 260 | 68 | 81% | 96% | ×1.54 | 0.156 (12 pairs) |
| tensileStrengthXY | 211 | 53 | 81% | 96% | ×1.58 | 0.19 (14 pairs) |
| elongationXY | 182 | 69 | 81% | 96% | ×2.48 | 0.6 (14 pairs) |
| hdt045 | 170 | 59 | 81% | 97% | 8.65 °C | 8.6 (18 pairs) |

| Headline | Missing | From its own grade | From its other grades | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 6 | 1 | 3 | 2 | 0 | 0 | 6 |
| tensileModulusXY | 24 | 13 | 3 | 3 | 5 | 0 | 19 |
| tensileStrengthXY | 39 | 27 | 4 | 3 | 5 | 0 | 34 |
| elongationXY | 23 | 10 | 3 | 5 | 5 | 0 | 18 |
| hdt045 | 30 | 9 | 5 | 3 | 13 | 0 | 17 |

Evidence that contradicts everything else and was down-weighted:

- PPS-CF, tensileModulusXY: tensile Z 2.85 (V001362)
- PPS-CF, tensileModulusXY: tensile Z 2.72 (V001867)
- TPU for AMS, elongationXY: break Z 31 (V000780)
- PA612-CF, hdt045: HDT 0.45 175 (V001054)
- PA612-CF, hdt045: HDT 1.8 semi-filled 114 (V002058)
- PPS, hdt045: HDT 0.45 90 (V001346)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- PPA-CF, tensileModulusXY: 11.8 GPa, expected about 7.35
- PC-ABS, elongationXY: 75 %, expected about 7.72

## Consistency

Every one of the 103 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade, and the representative grade is one of them;
- every headline cites a measurement of its own material and of the representative grade (364 checked);
- every cited measurement, profile and use record exists and belongs to that material, except use, durability and safety notes, which may cite family context;
- nozzle, bed and chamber guidance quote the profile the row cites;
- Environmental evidence cites exactly the material's own exposure, solubility and moisture records;
- no coverage row says Gap beside the material's own data or claims evidence it does not have, for mechanical, thermal, print setup, environmental and price, and a Grades row quotes the true manufacturer count.

## Reference layer

114 generic entries, 10 shown by default. Never part of the candidate set.

## Warnings

These are not defects. They record what the compiled database cannot support, so the
interface can say so rather than implying a certainty it does not have.

- `IMPACT-UNITS` **measurements** — Impact data uses two incompatible units. 10 rows are J/m (energy per width) and cannot be compared with the kJ/m² rows without specimen geometry. They must not share a chart axis.
- `HDT-LOAD-UNSTATED` **materials** — 7 of 67 HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.
- `EST-SUMMARY` **materials** — Missing headlines: 60 estimated from the grade's own related measurements, 18 from the material's other grades, 16 from the family model alone (17 of all estimates imprecise), 28 not applicable. 94 estimates may screen a material out in Explore; none can pass one.
- `EST-OUTLIER` **materials** — 2 measured headlines sit far outside what every other observation predicts; check the source and the grade: PPA-CF tensileModulusXY 11.8 (expected about 7.35); PC-ABS elongationXY 75 (expected about 7.72)
- `EST-WIDE` **materials** — 17 estimates are too imprecise to guide a choice: PLA Silk elongationXY 1.32-9.07 % (plausible 0.945-12.7, family); TPU for AMS tensileModulusXY 0.0206-0.116 GPa (plausible 0.0148-0.161, this-grade); PEBA tensileModulusXY 0.0384-0.138 GPa (plausible 0.0301-0.176, this-grade); TPC / TPEE tensileModulusXY 0.00856-0.0487 GPa (plausible 0.00615-0.0677, this-grade); TPC / TPEE tensileStrengthXY 10.4-41.8 MPa (plausible 8.62-50.8, family); TPC / TPEE elongationXY 196-1030 % (plausible 147-1370, family); PA6 tensileModulusXY 1.96-5.15 GPa (plausible 1.63-6.18, this-grade); PA6 elongationXY 6.16-43.7 % (plausible 4.38-61.4, this-grade); PA-ESD elongationXY 2.46-12.9 % (plausible 1.85-17.1, this-grade); BVOH elongationXY 3.83-29.3 % (plausible 2.69-41.7, this-grade); PE elongationXY 5.1-34.7 % (plausible 3.65-48.4, this-grade); PE hdt045 55.1-117 °C (plausible 46-131, family); OBC tensileModulusXY 0.0109-0.214 GPa (plausible 0.00625-0.376, family); POM / Acetal hdt045 84.4-149 °C (plausible 53.2-163, this-material); CoPE elongationXY 4.95-38.9 % (plausible 3.47-55.5, family); PVB tensileModulusXY 1.2-3.03 GPa (plausible 1-3.61, this-grade); PVB elongationXY 6.24-40 % (plausible 5.06-56.8, this-grade)
- `EST-FAMILY-ORDER` **materials** — 1 reinforced materials sit below their unfilled sibling: PLA-CF tensileModulusXY 2.79 < PLA 2.865
- `FAMILY-ENTRIES` **materials** — 5 canonical names are family entries with no product of their own and are not candidates: TPE (TPU, TPU for AMS, TPU 95A HF, TPU 90A, TPU 85A, PEBA, TPC / TPEE, OBC); PA (PA6, PA6/66, PA66, PA12, PA612); CoPA (PA6/66); PA-CF (PA6-CF, PA66-CF, PA12-CF, PA612-CF, PAHT-CF); PA-GF (PA6-GF, PA12-GF, PA612-GF)
- `NO-MEASUREMENTS` **materials** — 2 materials have no property measurements at all: PA66-CF, PA612-GF
