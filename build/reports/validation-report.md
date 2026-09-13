# Validation report

Database snapshot 2026-09-13 · build 2026-09-13

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 102 |
| h2cRelevant | 96 |
| excluded | 6 |
| grades | 140 |
| measurements | 1899 |
| numericMeasurements | 1740 |
| quarantined | 2 |
| profiles | 160 |
| evidence | 380 |
| prices | 104 |
| sources | 224 |
| coverage | 1116 |

## Headline coverage

What a selection criterion can actually decide, out of 102 canonical materials.

| Headline | Materials with a value |
|---|---:|
| density | 89 |
| tensileModulusXY | 70 |
| tensileStrengthXY | 52 |
| elongationXY | 72 |
| hdt045 | 66 |
| priceCADkg | 40 |

## H2C envelope gate

Baseline 350 C nozzle, 120 C bed, 65 C chamber.

| Axis | within | exceeds | exceeds (recommendation only) | unknown |
|---|---:|---:|---:|---:|
| nozzle | 84 | 6 | 0 | 12 |
| bed | 84 | 7 | 0 | 11 |
| chamber | 49 | 5 | 3 | 45 |

## Environment evidence

A verdict category has findings that reduce to resistant, limited or not resistant, so it
can answer a pass/fail question. An indicator category has records but no reducible verdict
among them, so it can only show evidence and must never be offered as a hard constraint.

| Category | Kind | Records | With a verdict | Materials |
|---|---|---:|---:|---:|
| alkali | verdict | 48 | 46 | 35 |
| acid | verdict | 52 | 44 | 36 |
| flammability | verdict | 37 | 35 | 37 |
| organic-solvent | verdict | 45 | 28 | 38 |
| oil-grease | verdict | 40 | 28 | 37 |
| water-solubility | verdict | 25 | 23 | 25 |
| food-contact | indicator | 2 | 0 | 2 |
| uv-outdoor | indicator | 7 | 0 | 6 |
| moisture | indicator | 7 | 0 | 7 |
| creep | indicator | 2 | 0 | 2 |
| fatigue | indicator | 5 | 0 | 5 |
| hydrolysis | indicator | 4 | 0 | 4 |

## Family estimates

Where a material has no measurement of its own, the span of its closest measured relatives
is recorded as a bound. Peers sharing one commercial source count once. These never appear
in Strict mode, and can only exclude, never confirm.

| Headline | Missing | From family and filler | From family | From behaviour and filler | No peers |
|---|---:|---:|---:|---:|---:|
| density | 13 | 7 | 5 | 1 | 0 |
| tensileModulusXY | 31 | 7 | 10 | 8 | 6 |
| tensileStrengthXY | 49 | 11 | 15 | 17 | 6 |
| elongationXY | 29 | 6 | 9 | 8 | 6 |
| hdt045 | 35 | 4 | 10 | 7 | 14 |

## Reference layer

114 generic entries, 10 shown by default. Never part of the candidate set.

## Warnings

These are not defects. They record what the compiled database cannot support, so the
interface can say so rather than implying a certainty it does not have.

- **measurements** — Impact data uses two incompatible units. 8 rows are J/m (energy per width) and cannot be compared with the kJ/m² rows without specimen geometry. They must not share a chart axis.
- **materials** — 24 of 66 HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.
- **materials** — 125 family estimates were derived for headlines with no measurement. They are inference, not evidence: Strict mode never sees them, and in Explore they can only rule a material out of a requirement it clearly cannot meet.
- **materials** — 11 materials have no property measurements at all: PLA Lite, PLA Silk, PA66, PA66-CF, PA612, PA612-GF, PET-GF, POM / Acetal, CPE, CoPE, nGen / Amphora
