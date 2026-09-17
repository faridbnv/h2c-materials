# Validation report

Database snapshot 2026-09-16 · build 2026-09-17

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 103 |
| h2cRelevant | 92 |
| familyEntries | 5 |
| retiredDuplicates | [object Object] |
| excluded | 6 |
| grades | 172 |
| measurements | 2361 |
| numericMeasurements | 2200 |
| quarantined | 4 |
| profiles | 172 |
| evidence | 462 |
| prices | 104 |
| sources | 287 |
| coverage | 1211 |
| polymerEnvironment | 353 |
| polymerEvidence | 223 |

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

| Category | Kind | Records | With a verdict | Materials | From the base polymer |
|---|---|---:|---:|---:|---:|
| alkali | verdict | 63 | 61 | 50 | 32 |
| acid | verdict | 67 | 59 | 51 | 32 |
| organic-solvent | verdict | 63 | 45 | 53 | 33 |
| oil-grease | verdict | 57 | 45 | 52 | 30 |
| water-solubility | verdict | 42 | 41 | 41 | 21 |
| flammability | verdict | 41 | 36 | 41 | 10 |
| food-contact | indicator | 2 | 0 | 2 | 0 |
| uv-outdoor | verdict | 7 | 0 | 6 | 15 |
| moisture | verdict | 7 | 0 | 7 | 21 |
| creep | indicator | 2 | 0 | 2 | 0 |
| fatigue | indicator | 5 | 0 | 5 | 0 |
| hydrolysis | verdict | 4 | 0 | 4 | 29 |

## Polymer-level behaviour

353 rows of published base-polymer behaviour, attached as 223 inferred records to 67 materials
with no grade-level record in the category (D64). A record is shown in the drawer, counted apart in the filter rail, may screen a
material out under inference where the polymer is attacked or dissolved, and never passes a requirement.

| Category | Polymers | Agent rows | Materials covered | Of which may screen |
|---|---:|---:|---:|---:|
| acid | 21 | 94 | 32 | 8 |
| alkali | 20 | 43 | 32 | 5 |
| flammability | 4 | 4 | 10 | 8 |
| hydrolysis | 12 | 19 | 29 | 7 |
| moisture | 2 | 2 | 21 | 0 |
| oil-grease | 20 | 78 | 30 | 0 |
| organic-solvent | 23 | 87 | 33 | 7 |
| uv-outdoor | 8 | 8 | 15 | 1 |
| water-solubility | 15 | 18 | 21 | 1 |

## Estimates

A missing headline carries an estimate from one Gaussian model per property that takes every observation
in the snapshot, each converted to the headline's semantics (build/mappings/estimate-model.json, DECISIONS
D43). The likely range is 80% and the plausible range 95%. Both are calibrated by hiding each measured
headline and predicting it from everything else; the build fails if that coverage drifts. An estimate never
passes a material; in Explore it may screen one out only when its plausible range wholly fails.

| Headline | Observations | Hidden headlines | Likely range holds | Plausible range holds | Median likely width | Spread between products |
|---|---:|---:|---:|---:|---:|---:|
| density | 139 | 86 | 80% | 94% | ×1.13 | 0.0373 (50 pairs) |
| tensileModulusXY | 300 | 69 | 81% | 96% | ×1.5 | 0.177 (19 pairs) |
| tensileStrengthXY | 241 | 54 | 82% | 96% | ×1.67 | 0.123 (22 pairs) |
| elongationXY | 208 | 70 | 79% | 96% | ×2.64 | 0.605 (21 pairs) |
| hdt045 | 201 | 59 | 81% | 97% | 13.9 °C | 7.02 (24 pairs) |

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
| density | this-material | 35 | 1 | 98.65% point | 0 | 2.5% point |
| density | family | 86 | 2 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-grade | 66 | 3 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 30 | 0 | 97.5% point | 2 | 1.33% point |
| tensileModulusXY | family | 69 | 1 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-grade | 52 | 1 | 97.5% point | 2 | 2.5% point |
| tensileStrengthXY | this-material | 19 | 0 | cannot screen | 1 | cannot screen |
| tensileStrengthXY | family | 54 | 0 | 97.5% point | 1 | 2.5% point |
| elongationXY | this-grade | 51 | 0 | 97.5% point | 0 | 2.5% point |
| elongationXY | this-material | 31 | 2 | 99.93% point | 1 | 0% point |
| elongationXY | family | 70 | 2 | 97.5% point | 0 | 2.5% point |
| hdt045 | this-grade | 51 | 0 | 97.5% point | 1 | 2.5% point |
| hdt045 | this-material | 23 | 2 | 99.99% point | 2 | 0.02% point |
| hdt045 | family | 59 | 1 | 97.5% point | 1 | 2.5% point |

- Unstated-load bracket, amorphous: top at the published value + 15.8 °C (44 grades publish both loads; at 90% confidence at most 10% of grades show a gap larger than 15.8 °C, the second largest gap observed).
- Unstated-load bracket, semi-unfilled: its top cannot screen (only 3 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).
- Unstated-load bracket, semi-filled: its top cannot screen (only 11 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).
- Unstated-load bracket, elastomer: its top cannot screen (only 0 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).

Evidence that contradicts everything else and was down-weighted:

- PPS-CF, tensileModulusXY: tensile Z 2.85 (V001362)
- TPU for AMS, elongationXY: break Z 31 (V000780)
- BVOH, elongationXY: break XY 14.8 (V002264)
- BVOH, elongationXY: break Z 0.6 (V002265)
- PLA-GF, hdt045: HDT 1.8 amorphous 59.7 (V000349)
- PLA-GF, hdt045: HDT 0.45 75.5 (V000350)
- PAHT-CF, hdt045: Tm semi-filled 234 (V002459)
- PAHT-CF, hdt045: HDT 1.8 semi-filled 92 (V002463)
- PAHT-CF, hdt045: HDT 0.45 145 (V002464)
- PA612-CF, hdt045: HDT 0.45 175 (V001054)
- PA612-CF, hdt045: HDT 1.8 semi-filled 114 (V002058)
- PPS, hdt045: HDT 0.45 90 (V001346)
- PC-PBT, hdt045: HDT 1.8 amorphous 90.8 (V001588)
- PC-PBT, hdt045: HDT 0.45 107.4 (V001589)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- TPU, elongationXY: 330.1 %, expected about 567
- PE, elongationXY: 208 %, expected about 9.96
- PPS, hdt045: 90 °C, expected about 169

## Consistency

Every one of the 103 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade, and the representative grade is one of them;
- every headline cites a measurement of its own material and of the representative grade (368 checked);
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

- `HDT-LOAD-UNSTATED` **materials** — 7 of 68 HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.
- `NO-MEASUREMENTS` **materials** — 2 materials have no property measurements at all: PA66-CF, PA612-GF
- `EST-OUTLIER` **materials** — 3 measured headlines sit far outside what every other observation predicts; check the source and the grade: TPU elongationXY 330.1 (expected about 567); PE elongationXY 208 (expected about 9.96); PPS hdt045 90 (expected about 169)
- `EST-WIDE` **materials** — 10 estimates are too imprecise to guide a choice: TPU tensileStrengthXY 32.5-85.7 MPa (plausible 30.5-111, this-material); TPU for AMS tensileModulusXY 0.0227-0.112 GPa (plausible 0.0152-0.167, this-grade); PEBA tensileModulusXY 0.0401-0.131 GPa (plausible 0.0297-0.177, this-grade); TPC / TPEE tensileModulusXY 0.0106-0.0525 GPa (plausible 0.00711-0.0785, this-grade); TPC / TPEE tensileStrengthXY 19.1-48.5 MPa (plausible 17.9-62.7, this-material); PA6 tensileStrengthXY 52.4-134 MPa (plausible 43.5-161, this-grade); PA6 elongationXY 4.59-30.5 % (plausible 2.07-67.5, this-grade); OBC tensileModulusXY 0.0119-0.191 GPa (plausible 0.00597-0.383, family); OBC tensileStrengthXY 12.3-32.9 MPa (plausible 10.1-39.9, this-grade); CoPE elongationXY 5.22-38.8 % (plausible 2.24-90.1, family)
- `EST-FAMILY-ORDER` **materials** — 1 reinforced materials sit below their unfilled sibling: PLA-CF tensileModulusXY 2.79 < PLA 2.865
