# Validation report

Database snapshot 2026-09-13 · build 2026-09-13

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 102 |
| h2cRelevant | 96 |
| excluded | 6 |
| grades | 144 |
| measurements | 1966 |
| numericMeasurements | 1806 |
| quarantined | 2 |
| profiles | 167 |
| evidence | 478 |
| prices | 104 |
| sources | 235 |
| coverage | 1146 |

## Headline coverage

What a selection criterion can actually decide, out of 102 canonical materials.

| Headline | Materials with a value |
|---|---:|
| density | 94 |
| tensileModulusXY | 74 |
| tensileStrengthXY | 57 |
| elongationXY | 75 |
| hdt045 | 69 |
| priceCADkg | 40 |

## H2C envelope gate

Baseline 350 C nozzle, 120 C bed, 65 C chamber.

| Axis | within | partial window | exceeds | exceeds (recommendation only) | unknown |
|---|---:|---:|---:|---:|---:|
| nozzle | 89 | n/a | 6 | 0 | 7 |
| bed | 89 | n/a | 7 | 0 | 6 |
| chamber | 69 | 4 | 4 | 2 | 23 |

A partial window is chamber-only: part of the published window is reachable at 65 C, never all of it.
Nozzle and bed are read by the upper end of the window.

## Chamber evidence

What the 96 in-scope materials publish about the chamber, strongest kind first. A statement
in words is manufacturer evidence but never a temperature. An estimated band is inference from
build/mappings/chamber-estimates.json; it is shown beside the chamber question and changes no verdict.

| Kind | Materials |
|---|---:|
| Published temperature window | 55 |
| No heated chamber needed, in words | 20 |
| Chamber recommended, no temperature | 3 |
| Data sheet lists no setpoint | 1 |
| Nothing published | 17 |
| Carrying an estimated band (any of the last three) | 20 |

22 research bands are superseded by evidence and not used: PLA Basic (20-45 °C; publishes 25-45 °C), PLA Matte (20-45 °C; publishes 25-45 °C), PLA Lite (20-45 °C; a source says no heated chamber is needed), PLA Metal (20-45 °C; publishes 25-45 °C), PLA Marble (20-45 °C; publishes 25-45 °C), PLA Sparkle (20-45 °C; publishes 25-45 °C), PLA Galaxy (20-45 °C; publishes 25-45 °C), PLA Silk (20-45 °C; a source says no heated chamber is needed), Support for PA/PET (20-45 °C; publishes 45-60 °C), PETG Basic (20-50 °C; publishes 35-50 °C), PETG HF (20-50 °C; publishes 35-50 °C), PETG-CF (20-50 °C; publishes 35-50 °C), PEBA (20-50 °C; a source says no heated chamber is needed), CPE (20-50 °C; a source says no heated chamber is needed), CPE-CF (20-50 °C; a source says no heated chamber is needed), CoPE (20-50 °C; a source says no heated chamber is needed), ASA-GF (45-70 °C; a source says no heated chamber is needed), PC FR (45-70 °C; publishes 45-60 °C), PAHT-CF (45-70 °C; publishes 45-60 °C), PET-GF (45-70 °C; a source says no heated chamber is needed), PPS-CF (60-90 °C; publishes 60-90 °C), PPA-CF (80-120 °C; publishes 50-80 °C).

## Environment evidence

A verdict category has findings that reduce to resistant, limited or not resistant, so it
can answer a pass/fail question. An indicator category has records but no reducible verdict
among them, so it can only show evidence and must never be offered as a hard constraint.

| Category | Kind | Records | With a verdict | Materials |
|---|---|---:|---:|---:|
| alkali | verdict | 67 | 65 | 54 |
| acid | verdict | 71 | 63 | 55 |
| organic-solvent | verdict | 65 | 47 | 57 |
| oil-grease | verdict | 59 | 47 | 56 |
| water-solubility | verdict | 42 | 41 | 41 |
| flammability | verdict | 41 | 36 | 41 |
| food-contact | indicator | 2 | 0 | 2 |
| uv-outdoor | indicator | 7 | 0 | 6 |
| moisture | indicator | 7 | 0 | 7 |
| creep | indicator | 2 | 0 | 2 |
| fatigue | indicator | 5 | 0 | 5 |
| hydrolysis | indicator | 4 | 0 | 4 |

## Family estimates

Missing headlines may carry a sample span from the same polymer and modifier. Peer intervals
are preserved, unknown HDT loads are excluded, and repeated formulation keys count once.
Peer context never confirms or excludes a material.

| Headline | Missing | Same polymer and modifier | No comparable peer span |
|---|---:|---:|---:|
| density | 8 | 0 | 8 |
| tensileModulusXY | 27 | 1 | 26 |
| tensileStrengthXY | 44 | 0 | 44 |
| elongationXY | 26 | 1 | 25 |
| hdt045 | 32 | 1 | 31 |

## Consistency

Every one of the 102 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade, and the representative grade is one of them;
- every headline cites a measurement of its own material and of the representative grade (369 checked);
- every cited measurement, profile and use record exists and belongs to that material, except use, durability and safety notes, which may cite family context;
- nozzle, bed and chamber guidance quote the profile the row cites;
- Environmental evidence cites exactly the material's own exposure, solubility and moisture records;
- no coverage row says Gap beside the material's own data or claims evidence it does not have, for mechanical, thermal, print setup, environmental and price, and a Grades row quotes the true manufacturer count.

## Reference layer

114 generic entries, 10 shown by default. Never part of the candidate set.

## Warnings

These are not defects. They record what the compiled database cannot support, so the
interface can say so rather than implying a certainty it does not have.

- **measurements** — Impact data uses two incompatible units. 9 rows are J/m (energy per width) and cannot be compared with the kJ/m² rows without specimen geometry. They must not share a chart axis.
- **materials** — 25 of 69 HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.
- **materials** — 3 peer spans were derived for missing headlines. Same polymer and modifier only; these observations never confirm or exclude a material.
- **materials** — 5 materials have no property measurements at all: PA66, PA66-CF, PA612, PA612-GF, POM / Acetal
