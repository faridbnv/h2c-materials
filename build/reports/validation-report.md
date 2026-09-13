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
| evidence | 380 |
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
| density | 8 | 6 | 1 | 1 | 0 |
| tensileModulusXY | 27 | 7 | 12 | 2 | 6 |
| tensileStrengthXY | 44 | 11 | 17 | 10 | 6 |
| elongationXY | 26 | 7 | 11 | 2 | 6 |
| hdt045 | 32 | 5 | 12 | 1 | 14 |

## Reference layer

114 generic entries, 10 shown by default. Never part of the candidate set.

## Warnings

These are not defects. They record what the compiled database cannot support, so the
interface can say so rather than implying a certainty it does not have.

- **measurements** — Impact data uses two incompatible units. 9 rows are J/m (energy per width) and cannot be compared with the kJ/m² rows without specimen geometry. They must not share a chart axis.
- **materials** — 25 of 69 HDT headlines cite a source that names the standard but not the load. They carry loadStated:false and must not be presented as confirmed 0.45 MPa values.
- **materials** — 105 family estimates were derived for headlines with no measurement. They are inference, not evidence: Strict mode never sees them, and in Explore they can only rule a material out of a requirement it clearly cannot meet.
- **materials** — 5 materials have no property measurements at all: PA66, PA66-CF, PA612, PA612-GF, POM / Acetal
