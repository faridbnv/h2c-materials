# Validation report

Database snapshot 2026-09-13 · build 2026-09-16

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 103 |
| h2cRelevant | 92 |
| familyEntries | 5 |
| retiredDuplicates | [object Object] |
| excluded | 6 |
| grades | 165 |
| measurements | 2193 |
| numericMeasurements | 2033 |
| quarantined | 4 |
| profiles | 172 |
| evidence | 462 |
| prices | 104 |
| sources | 254 |
| coverage | 1211 |

## Headline coverage

What a selection criterion can actually decide, out of 103 canonical materials.

| Headline | Materials with a value |
|---|---:|
| density | 92 |
| tensileModulusXY | 74 |
| tensileStrengthXY | 59 |
| elongationXY | 75 |
| hdt045 | 68 |
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
| density | 133 | 86 | 80% | 95% | ×1.14 | 0.0371 (44 pairs) |
| tensileModulusXY | 278 | 69 | 81% | 96% | ×1.58 | 0.156 (12 pairs) |
| tensileStrengthXY | 226 | 54 | 80% | 96% | ×1.61 | 0.194 (15 pairs) |
| elongationXY | 194 | 70 | 80% | 96% | ×2.65 | 0.6 (14 pairs) |
| hdt045 | 178 | 59 | 81% | 97% | 9.88 °C | 8.39 (19 pairs) |

| Headline | Missing | From its own grade | From its other grades | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 6 | 1 | 3 | 2 | 0 | 0 | 6 |
| tensileModulusXY | 23 | 12 | 3 | 3 | 5 | 0 | 18 |
| tensileStrengthXY | 38 | 26 | 5 | 2 | 5 | 0 | 29 |
| elongationXY | 22 | 9 | 5 | 3 | 5 | 0 | 17 |
| hdt045 | 29 | 9 | 5 | 2 | 13 | 0 | 16 |

Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most 10% of the time with 90% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.

| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |
|---|---|---:|---:|---:|---:|---:|
| density | this-grade | 0 | 0 | cannot screen | 0 | cannot screen |
| density | this-material | 29 | 1 | 99% point | 0 | 2.5% point |
| density | family | 86 | 2 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-grade | 66 | 4 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 23 | 1 | 98.81% point | 3 | 0.86% point |
| tensileModulusXY | family | 69 | 1 | 97.5% point | 2 | 2.5% point |
| tensileStrengthXY | this-grade | 52 | 1 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-material | 12 | 0 | cannot screen | 0 | cannot screen |
| tensileStrengthXY | family | 54 | 0 | 97.5% point | 2 | 2.5% point |
| elongationXY | this-grade | 51 | 0 | 97.5% point | 0 | 2.5% point |
| elongationXY | this-material | 24 | 2 | 99.83% point | 1 | 0% point |
| elongationXY | family | 70 | 2 | 97.5% point | 0 | 2.5% point |
| hdt045 | this-grade | 51 | 2 | 97.55% point | 0 | 2.5% point |
| hdt045 | this-material | 18 | 0 | cannot screen | 2 | cannot screen |
| hdt045 | family | 59 | 1 | 97.5% point | 1 | 2.5% point |

- Unstated-load bracket, amorphous: top at the published value + 15.8 °C (39 grades publish both loads; at 90% confidence at most 10% of grades show a gap larger than 15.8 °C, the second largest gap observed).
- Unstated-load bracket, semi-unfilled: its top cannot screen (only 3 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).
- Unstated-load bracket, semi-filled: its top cannot screen (only 10 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).
- Unstated-load bracket, elastomer: its top cannot screen (only 0 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).

Evidence that contradicts everything else and was down-weighted:

- PPS-CF, tensileModulusXY: tensile Z 2.85 (V001362)
- PPS-CF, tensileModulusXY: tensile Z 2.72 (V001867)
- TPU for AMS, elongationXY: break Z 31 (V000780)
- BVOH, elongationXY: break XY 14.8 (V002264)
- BVOH, elongationXY: break Z 0.6 (V002265)
- PA612-CF, hdt045: HDT 0.45 175 (V001054)
- PA612-CF, hdt045: HDT 1.8 semi-filled 114 (V002058)
- PPS, hdt045: HDT 0.45 90 (V001346)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- PVDF, density: 1710 kg/m³, expected about 1200
- TPU, elongationXY: 330.1 %, expected about 573
- PPS, hdt045: 90 °C, expected about 172

## Consistency

Every one of the 103 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade, and the representative grade is one of them;
- every headline cites a measurement of its own material and of the representative grade (368 checked);
- every cited measurement, profile and use record exists and belongs to that material, except use, durability and safety notes, which may cite family context;
- nozzle, bed and chamber guidance quote the profile the row cites;
- Environmental evidence cites exactly the material's own exposure, solubility and moisture records;
- no coverage row says Gap beside the material's own data or claims evidence it does not have, for mechanical, thermal, print setup, environmental and price, and a Grades row quotes the true manufacturer count.

## Reference layer

114 generic entries, 10 shown by default. Never part of the candidate set.

## Warnings

These are not defects. They record what the compiled database cannot support, so the
interface can say so rather than implying a certainty it does not have.

- `HDT-LOAD-UNSTATED` **materials** — 7 of 68 HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.
- `NO-MEASUREMENTS` **materials** — 2 materials have no property measurements at all: PA66-CF, PA612-GF
- `EST-OUTLIER` **materials** — 3 measured headlines sit far outside what every other observation predicts; check the source and the grade: PVDF density 1710 (expected about 1200); TPU elongationXY 330.1 (expected about 573); PPS hdt045 90 (expected about 172)
- `EST-WIDE` **materials** — 10 estimates are too imprecise to guide a choice: TPU for AMS tensileModulusXY 0.0213-0.126 GPa (plausible 0.0153-0.175, this-grade); PEBA tensileModulusXY 0.0379-0.14 GPa (plausible 0.0296-0.179, this-grade); TPC / TPEE tensileModulusXY 0.00957-0.0561 GPa (plausible 0.00688-0.078, this-grade); PA6 tensileModulusXY 2.8-7.38 GPa (plausible 2.34-8.84, this-grade); PA6 elongationXY 4.14-28.4 % (plausible 1.68-69.9, this-grade); PA66-CF tensileModulusXY 3.64-9.57 GPa (plausible 3.04-11.5, family); PA612-GF tensileModulusXY 2.96-7.43 GPa (plausible 2.5-8.82, family); PA-ESD elongationXY 2.39-13.2 % (plausible 1.07-29.2, this-grade); OBC tensileModulusXY 0.01-0.226 GPa (plausible 0.00564-0.403, family); CoPE elongationXY 4.22-41.8 % (plausible 1.44-123, family)
- `EST-FAMILY-ORDER` **materials** — 1 reinforced materials sit below their unfilled sibling: PLA-CF tensileModulusXY 2.79 < PLA 2.865
