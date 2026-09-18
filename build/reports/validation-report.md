# Validation report

Database snapshot 2026-09-16 · build 2026-09-18

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 103 |
| h2cRelevant | 92 |
| familyEntries | 5 |
| retiredDuplicates | [object Object] |
| excluded | 6 |
| grades | 189 |
| measurements | 2577 |
| numericMeasurements | 2416 |
| quarantined | 4 |
| profiles | 183 |
| evidence | 481 |
| prices | 104 |
| sources | 310 |
| coverage | 674 |
| polymerEnvironment | 353 |
| polymerEvidence | 223 |
| coverageDerived | 494 |

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
| flammability | verdict | 42 | 36 | 41 | 10 |
| food-contact | indicator | 2 | 0 | 2 | 0 |
| uv-outdoor | verdict | 7 | 0 | 6 | 15 |
| moisture | verdict | 12 | 0 | 10 | 21 |
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
| density | 156 | 86 | 80% | 95% | ×1.13 | 0.033 (89 pairs) |
| tensileModulusXY | 324 | 69 | 81% | 96% | ×1.48 | 0.177 (21 pairs) |
| tensileStrengthXY | 269 | 54 | 82% | 96% | ×1.7 | 0.183 (25 pairs) |
| elongationXY | 226 | 70 | 80% | 96% | ×2.53 | 0.613 (24 pairs) |
| hdt045 | 232 | 59 | 81% | 97% | 15.4 °C | 9.12 (42 pairs) |

| Headline | Missing | From its own grade | From its other grades | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 6 | 1 | 3 | 2 | 0 | 0 | 6 |
| tensileModulusXY | 23 | 12 | 3 | 3 | 5 | 0 | 18 |
| tensileStrengthXY | 38 | 26 | 5 | 2 | 5 | 0 | 29 |
| elongationXY | 22 | 9 | 5 | 3 | 5 | 0 | 16 |
| hdt045 | 29 | 9 | 5 | 2 | 13 | 0 | 16 |

Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most 10% of the time with 90% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.

| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |
|---|---|---:|---:|---:|---:|---:|
| density | this-grade | 0 | 0 | cannot screen | 0 | cannot screen |
| density | this-material | 41 | 1 | 97.5% point | 0 | 2.5% point |
| density | family | 86 | 3 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-grade | 66 | 3 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 36 | 0 | 97.5% point | 2 | 1.56% point |
| tensileModulusXY | family | 69 | 1 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-grade | 52 | 1 | 97.5% point | 2 | 2.5% point |
| tensileStrengthXY | this-material | 24 | 0 | 97.5% point | 0 | 2.5% point |
| tensileStrengthXY | family | 54 | 0 | 97.5% point | 1 | 2.5% point |
| elongationXY | this-grade | 51 | 0 | 97.5% point | 0 | 2.5% point |
| elongationXY | this-material | 35 | 2 | 99.34% point | 1 | 0.01% point |
| elongationXY | family | 70 | 2 | 97.5% point | 0 | 2.5% point |
| hdt045 | this-grade | 51 | 2 | 98.84% point | 0 | 2.5% point |
| hdt045 | this-material | 28 | 3 | 100% point | 1 | 0.13% point |
| hdt045 | family | 59 | 3 | 97.79% point | 1 | 2.5% point |

- Unstated-load bracket, amorphous: top at the published value + 15.8 °C (47 grades publish both loads; at 90% confidence at most 10% of grades show a gap larger than 15.8 °C, the second largest gap observed).
- Unstated-load bracket, semi-unfilled: its top cannot screen (only 3 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).
- Unstated-load bracket, semi-filled: its top cannot screen (only 17 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).
- Unstated-load bracket, elastomer: its top cannot screen (only 0 grades publish both loads; 22 are needed to show at 90% confidence that at most 10% of gaps are larger).

Evidence that contradicts everything else and was down-weighted:

- PPS-CF, tensileModulusXY: tensile Z 2.85 (V001362)
- TPU for AMS, elongationXY: break Z 31 (V000780)
- BVOH, elongationXY: break XY 14.8 (V002264)
- BVOH, elongationXY: break Z 0.6 (V002265)
- PLA-GF, hdt045: HDT 1.8 amorphous 59.7 (V000349)
- PLA-GF, hdt045: HDT 0.45 75.5 (V000350)
- PAHT-CF, hdt045: Tm semi-filled 234 (V002459)
- PAHT-CF, hdt045: HDT 0.45 145 (V002464)
- PA6-CF, hdt045: HDT 1.8 semi-filled 65 (V002731)
- PA6-GF, hdt045: HDT 1.8 semi-filled 65 (V002720)
- PPA-CF, hdt045: HDT 0.45 227 (V001308)
- PPA-CF, hdt045: Tm semi-filled 232 (V002570)
- PPA-CF, hdt045: HDT 0.45 84.5 (V002574)
- PPA-CF, hdt045: Tm semi-filled 239 (V002596)
- PPA-CF, hdt045: HDT 0.45 97 (V002600)
- PPA-GF, hdt045: HDT 0.45 227 (V001326)
- PPA-GF, hdt045: Tm semi-filled 232 (V002625)
- PPA-GF, hdt045: HDT 0.45 84 (V002629)
- PPS, hdt045: HDT 0.45 90 (V001346)
- PC-PBT, hdt045: HDT 1.8 amorphous 90.8 (V001588)
- PC-PBT, hdt045: HDT 0.45 107.4 (V001589)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- TPU, elongationXY: 330.1 %, expected about 572
- PPA-CF, hdt045: 227 °C, expected about 183
- PPS, hdt045: 90 °C, expected about 188

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
- `EST-OUTLIER` **materials** — 3 measured headlines sit far outside what every other observation predicts; check the source and the grade: TPU elongationXY 330.1 (expected about 572); PPA-CF hdt045 227 (expected about 183); PPS hdt045 90 (expected about 188)
- `EST-FAMILY-ORDER` **materials** — 1 reinforced materials sit below their unfilled sibling: PLA-CF tensileModulusXY 2.79 < PLA 2.865
