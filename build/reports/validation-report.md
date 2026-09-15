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
| measurements | 2085 |
| numericMeasurements | 1927 |
| quarantined | 4 |
| profiles | 172 |
| evidence | 462 |
| prices | 104 |
| sources | 244 |
| coverage | 1200 |

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
| tensileModulusXY | 261 | 68 | 81% | 96% | ×1.58 | 0.156 (12 pairs) |
| tensileStrengthXY | 211 | 53 | 81% | 94% | ×1.57 | 0.19 (14 pairs) |
| elongationXY | 182 | 69 | 81% | 96% | ×2.46 | 0.6 (14 pairs) |
| hdt045 | 170 | 59 | 81% | 97% | 9.56 °C | 8.6 (18 pairs) |

| Headline | Missing | From its own grade | From its other grades | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 6 | 1 | 3 | 2 | 0 | 0 | 6 |
| tensileModulusXY | 24 | 13 | 3 | 3 | 5 | 0 | 19 |
| tensileStrengthXY | 39 | 27 | 4 | 3 | 5 | 0 | 30 |
| elongationXY | 23 | 10 | 3 | 5 | 5 | 0 | 18 |
| hdt045 | 30 | 9 | 5 | 3 | 13 | 0 | 17 |

Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most 10% of the time with 90% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.

| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |
|---|---|---:|---:|---:|---:|---:|
| density | this-grade | 0 | 0 | cannot screen | 0 | cannot screen |
| density | this-material | 23 | 1 | 99.4% point | 0 | 2.5% point |
| density | family | 86 | 2 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-grade | 65 | 3 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 21 | 1 | cannot screen | 2 | cannot screen |
| tensileModulusXY | family | 68 | 2 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-grade | 52 | 2 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-material | 10 | 0 | cannot screen | 0 | cannot screen |
| tensileStrengthXY | family | 53 | 0 | 97.5% point | 1 | 2.5% point |
| elongationXY | this-grade | 51 | 0 | 97.5% point | 0 | 2.5% point |
| elongationXY | this-material | 23 | 2 | 99.94% point | 1 | cannot screen |
| elongationXY | family | 69 | 1 | 97.5% point | 0 | 2.5% point |
| hdt045 | this-grade | 51 | 2 | 97.55% point | 0 | 2.5% point |
| hdt045 | this-material | 17 | 0 | cannot screen | 1 | cannot screen |
| hdt045 | family | 59 | 1 | 97.5% point | 1 | 2.5% point |

- Unstated-load bracket, amorphous: top at the published value + 15.8 °C (38 grades publish both loads; at 90% confidence at most 10% of grades show a gap larger than 15.8 °C, the second largest gap observed).
- Unstated-load bracket, semi-unfilled: its top cannot screen (only 3 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).
- Unstated-load bracket, semi-filled: its top cannot screen (only 10 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).
- Unstated-load bracket, elastomer: its top cannot screen (only 0 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).

Evidence that contradicts everything else and was down-weighted:

- PPS-CF, tensileModulusXY: tensile Z 2.85 (V001362)
- PPS-CF, tensileModulusXY: tensile Z 2.72 (V001867)
- TPU for AMS, elongationXY: break Z 31 (V000780)
- PA612-CF, hdt045: HDT 0.45 175 (V001054)
- PA612-CF, hdt045: HDT 1.8 semi-filled 114 (V002058)
- PPS, hdt045: HDT 0.45 90 (V001346)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- OBC, density: 905 kg/m³, expected about 1120
- PPA-CF, tensileModulusXY: 11.8 GPa, expected about 7.36
- TPU, elongationXY: 330.1 %, expected about 572
- PC-ABS, elongationXY: 75 %, expected about 7.41
- PPS, hdt045: 90 °C, expected about 175

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

- `HDT-LOAD-UNSTATED` **materials** — 7 of 67 HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.
- `NO-MEASUREMENTS` **materials** — 2 materials have no property measurements at all: PA66-CF, PA612-GF
- `EST-OUTLIER` **materials** — 5 measured headlines sit far outside what every other observation predicts; check the source and the grade: OBC density 905 (expected about 1120); PPA-CF tensileModulusXY 11.8 (expected about 7.36); TPU elongationXY 330.1 (expected about 572); PC-ABS elongationXY 75 (expected about 7.41); PPS hdt045 90 (expected about 175)
- `EST-WIDE` **materials** — 18 estimates are too imprecise to guide a choice: PLA Silk elongationXY 1.32-9.07 % (plausible 0.846-14.2, family); TPU for AMS tensileModulusXY 0.0193-0.12 GPa (plausible 0.0151-0.153, this-grade); PEBA tensileModulusXY 0.0361-0.14 GPa (plausible 0.0302-0.167, this-grade); TPC / TPEE tensileModulusXY 0.00805-0.0506 GPa (plausible 0.00631-0.0645, this-grade); TPC / TPEE tensileStrengthXY 10.7-40.8 MPa (plausible 8.58-51, family); TPC / TPEE elongationXY 197-1030 % (plausible 134-1490, family); PA6 tensileModulusXY 1.9-5.29 GPa (plausible 1.66-6.06, this-grade); PA6 elongationXY 6.16-43.7 % (plausible 3.92-68.7, this-grade); PA-ESD elongationXY 2.47-12.9 % (plausible 1.68-18.8, this-grade); BVOH tensileModulusXY 1.4-3.69 GPa (plausible 1.23-4.2, this-grade); BVOH elongationXY 3.83-29.3 % (plausible 2.39-46.9, this-grade); PE elongationXY 5.1-34.7 % (plausible 3.27-54, this-grade); PE hdt045 54.5-118 °C (plausible 46.1-131, family); OBC tensileModulusXY 0.00896-0.203 GPa (plausible 0.00592-0.307, family); POM / Acetal hdt045 80.6-151 °C (plausible 52.5-163, this-material); CoPE elongationXY 4.96-38.8 % (plausible 3.08-62.5, family); PVB tensileModulusXY 1.17-3.11 GPa (plausible 1.02-3.54, this-grade); PVB elongationXY 6.24-39.9 % (plausible 5.04-65.6, this-grade)
- `EST-FAMILY-ORDER` **materials** — 1 reinforced materials sit below their unfilled sibling: PLA-CF tensileModulusXY 2.79 < PLA 2.865
