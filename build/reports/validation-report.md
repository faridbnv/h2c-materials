# Validation report

Database snapshot 2026-09-10 · build 2026-09-11

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 102 |
| h2cRelevant | 96 |
| excluded | 6 |
| grades | 136 |
| measurements | 1807 |
| numericMeasurements | 1668 |
| quarantined | 2 |
| profiles | 156 |
| evidence | 362 |
| prices | 104 |
| sources | 214 |
| coverage | 1106 |

## Headline coverage

What a selection criterion can actually decide, out of 102 canonical materials.

| Headline | Materials with a value |
|---|---:|
| density | 88 |
| tensileModulusXY | 70 |
| tensileStrengthXY | 52 |
| elongationXY | 72 |
| hdt045 | 66 |
| priceCADkg | 40 |

## H2C envelope gate

Baseline 350 C nozzle, 120 C bed, 65 C chamber.

| Axis | within | exceeds | exceeds (recommendation only) | unknown |
|---|---:|---:|---:|---:|
| nozzle | 82 | 6 | 0 | 14 |
| bed | 83 | 7 | 0 | 12 |
| chamber | 47 | 5 | 3 | 47 |

## Environment evidence

A verdict category has findings that reduce to resistant, limited or not resistant, so it
can answer a pass/fail question. An indicator category has records but no reducible verdict
among them, so it can only show evidence and must never be offered as a hard constraint.

| Category | Kind | Records | With a verdict | Materials |
|---|---|---:|---:|---:|
| alkali | verdict | 47 | 45 | 34 |
| acid | verdict | 51 | 43 | 35 |
| flammability | verdict | 36 | 34 | 36 |
| organic-solvent | verdict | 43 | 27 | 36 |
| oil-grease | verdict | 39 | 27 | 36 |
| water-solubility | verdict | 24 | 22 | 24 |
| food-contact | indicator | 2 | 0 | 2 |
| uv-outdoor | indicator | 6 | 0 | 6 |
| moisture | indicator | 6 | 0 | 6 |
| creep | indicator | 2 | 0 | 2 |
| fatigue | indicator | 5 | 0 | 5 |
| hydrolysis | indicator | 4 | 0 | 4 |

## Reference layer

114 generic entries, 10 shown by default. Never part of the candidate set.

## Warnings

These are not defects. They record what the compiled database cannot support, so the
interface can say so rather than implying a certainty it does not have.

- **measurements** — Impact data uses two incompatible units. 8 rows are J/m (energy per width) and cannot be compared with the kJ/m² rows without specimen geometry. They must not share a chart axis.
- **materials** — 24 of 66 HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.
- **materials** — 12 materials have no property measurements at all: PLA Lite, PLA Silk, PA66, PA66-CF, PA612, PA612-GF, PET-GF, Support for PLA, POM / Acetal, CPE, CoPE, nGen / Amphora
