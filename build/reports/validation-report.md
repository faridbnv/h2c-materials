# Validation report

Database snapshot 2026-09-21 · build 2026-10-19

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 175 |
| h2cRelevant | 138 |
| familyEntries | 23 |
| retiredDuplicates | measurements 602, evidence 23, profiles 80 |
| excluded | 14 |
| grades | 1183 |
| measurements | 15093 |
| numericMeasurements | 14893 |
| quarantined | 43 |
| profiles | 1902 |
| evidence | 868 |
| prices | 374 |
| sources | 2106 |
| coverage | 955 |
| retired | 3 |
| knowHow | 7495 |
| polymerEnvironment | 353 |
| polymerEvidence | 314 |
| coverageDerived | 1137 |

## Headline coverage

What a selection criterion can actually decide, out of 175 canonical materials.

| Headline | Materials with a value |
|---|---:|
| density | 147 |
| tensileModulusXY | 103 |
| tensileModulusZ | 53 |
| tensileStrengthXY | 108 |
| tensileStrengthZ | 59 |
| elongationXY | 105 |
| elongationZ | 58 |
| flexuralModulusXY | 95 |
| flexuralModulusZ | 37 |
| flexuralStrengthXY | 94 |
| flexuralStrengthZ | 39 |
| charpyNotched | 53 |
| izodNotched | 36 |
| hdt045 | 79 |
| hdt18 | 48 |
| glassTransition | 94 |
| shoreA | 15 |
| shoreD | 46 |
| priceCADkg | 113 |

## H2C envelope gate

Baseline 350 C nozzle, 120 C bed, 65 C chamber.

| Axis | within | within, at the low end | on the line | exceeds | exceeds (recommendation only) | unknown |
|---|---:|---:|---:|---:|---:|---:|
| nozzle | 133 | 3 | 1 | 7 | 0 | 31 |
| bed | 134 | 1 | 4 | 5 | 0 | 31 |
| chamber | 95 | 9 | 0 | 8 | 1 | 62 |

A window whose upper end is beyond the H2C is read by how much of it the H2C covers (D151): 5 C or more from its bottom is
within, at the low end; less, only its bottom edge, is on the line; none of it exceeds. Nozzle, bed and chamber alike.

## Chamber evidence

What the 138 in-scope materials publish about the chamber, strongest kind first. A statement
in words is manufacturer evidence but never a temperature. An estimated band is inference from
data/tables/chamber_bands.csv; it is shown beside the chamber question and changes no verdict.

| Kind | Materials |
|---|---:|
| Published temperature window | 65 |
| No heated chamber needed, in words | 40 |
| Chamber recommended, no temperature | 6 |
| Data sheet lists no setpoint | 1 |
| Nothing published | 26 |
| Carrying an estimated band (any of the last three) | 5 |

33 research bands are superseded by evidence and not used: PLA Metal (20-45 °C; publishes 25-45 °C), PLA Marble (20-45 °C; publishes 25-45 °C), PLA Sparkle (20-45 °C; publishes 25-45 °C), PLA Galaxy (20-45 °C; publishes 25-45 °C), PLA Silk (20-45 °C; publishes 0-45 °C), BVOH (20-45 °C; a source says no heated chamber is needed), Support for PA/PET (20-45 °C; publishes 45-60 °C), PETG-CF (20-50 °C; publishes 20-65 °C), PETG-GF (20-50 °C; publishes 20-20 °C), PEBA (20-50 °C; a source says no heated chamber is needed), TPC / TPEE (20-50 °C; a source says no heated chamber is needed), PP (20-50 °C; a source says no heated chamber is needed), PP-GF (20-50 °C; a source says no heated chamber is needed), PE (20-50 °C; a source says no heated chamber is needed), OBC (20-50 °C; a source says no heated chamber is needed), CPE (20-50 °C; a source says no heated chamber is needed), CPE-CF (20-50 °C; a source says no heated chamber is needed), CoPE (20-50 °C; a source says no heated chamber is needed), PVB (20-50 °C; a source says no heated chamber is needed), ABS-ESD (45-70 °C; publishes 25-90 °C), ASA-GF (45-70 °C; publishes 25-60 °C), PC FR (45-70 °C; publishes 45-100 °C), PC-CF (45-70 °C; publishes at least 25 °C), PAHT-CF (45-70 °C; publishes 45-60 °C), PA6 (45-70 °C; publishes 20-60 °C), PET (45-70 °C; a source says no heated chamber is needed), PET-GF (45-70 °C; publishes 25-50 °C), PPS-CF (60-90 °C; publishes 25-90 °C), PPA (80-120 °C; a source says no heated chamber is needed), PPA-CF (80-120 °C; publishes 25-80 °C), PPA-GF (80-120 °C; publishes 25-80 °C), POM / Acetal (45-80 °C; publishes 70-140 °C), PP Lightweight (20-50 °C; a source says no heated chamber is needed).

## Chamber need by kind of plastic

Per row of data/tables/chamber_need.csv: the distinct makers whose own sheet (or a twin's) states a chamber for a
product of the kind, those asking above 65 C, and the silent chambers a deciding within row read as within (D151).

| Row | Applies to | Verdict | Status | Makers stating | Asking above 65 C | Supports within | Silent chambers filled |
|---|---|---|---|---:|---:|---|---:|
| CN01 | Family: ABS | within | deciding | 21 | 2 | yes | 7 |
| CN02 | Family: ASA | unknown | reported | 18 | 2 | no | 0 |
| CN03 | Family: Acetals | unknown | reported | 1 | 1 | no | 0 |
| CN04 | Family: Copolyesters | unknown | reported | 9 | 0 | no | 0 |
| CN05 | Family: Flexible Elastomers | within | deciding | 18 | 0 | yes | 44 |
| CN06 | Family: Fluoropolymers | unknown | reported | 1 | 0 | no | 0 |
| CN07 | Family: High-Performance Engineering | unknown | reported | 9 | 0 | no | 0 |
| CN08 | Family: Industrial High-Temperature | unknown | reported | 11 | 9 | no | 0 |
| CN10 | Family: Nylon / Polyamide | unknown | reported | 17 | 2 | no | 0 |
| CN11 | Family: PET Engineering | unknown | reported | 7 | 0 | no | 0 |
| CN12 | Family: PETG | within | deciding | 22 | 0 | yes | 5 |
| CN13 | Family: PLA | within | deciding | 26 | 0 | yes | 37 |
| CN14 | Family: PVB / Specialty Polymers | unknown | reported | 7 | 0 | no | 0 |
| CN15 | Family: Polycarbonate | unknown | reported | 11 | 3 | no | 0 |
| CN16 | Family: Polymer Blends | unknown | reported | 7 | 3 | no | 0 |
| CN17 | Family: Polyolefins | within | deciding | 10 | 0 | yes | 8 |
| CN18 | Family: Styrenics | unknown | reported | 4 | 1 | no | 0 |
| CN19 | Family: Support / Interface | unknown | reported | 2 | 0 | no | 0 |
| CN20 | Family: Support / Soluble | unknown | reported | 7 | 0 | no | 0 |

## Evidence ledger

Per row of data/tables/conversions.csv and class_limits.csv: the product states it bounds where they hold no deciding
value, the values it would demote or that contradict it, and its same-sheet pairs (the ratio, or the difference in C,
each pair implies, and how many break the row). Only a deciding row decides (D153, D154).

| Row | Target | Kind | Status | Factors | Products | Demoted | Contradicted | Disagree | Pairs | Implied | Breaking |
|---|---|---|---|---|---:|---:|---:|---:|---:|---|---:|
| CV01 | hdt045 | floor | deciding | 1 | 119 | 0 | 0 | 0 | 135 | difference -4 to 119.5 | 1 |
| CV02 | tensileModulusXY | equal | deciding | 1 to 1 | 4 | 0 | 0 | 0 | 0 |  | 0 |
| CV03 | hdt045 | ceiling | deciding | 1 | 52 | 0 | 0 | 0 | 7 | difference -88 to -2.5 | 0 |
| CV04 | tensileModulusXY | ceiling | deciding | 1.28 | 50 | 0 | 0 | 0 | 13 | ratio 0.756593169045 to 1.27292046145 | 0 |
| CV05 | hdt045 | demote-to-ceiling | deciding | 1 | 173 | 117 | 0 | 0 | 1 | difference -5 to -5 | 0 |
| CV06 | tensileModulusXY | floor | deciding | 0.79 | 173 | 0 | 0 | 0 | 206 | ratio 0.791747011184 to 5.15974842767 | 0 |
| CV07 | tensileModulusXY | floor | deciding | 1 | 9 | 0 | 0 | 0 | 13 | ratio 1 to 3.73342541436 | 0 |
| CV08 | tensileModulusXY | band | deciding | 0.46 to 1.93 | 605 | 0 | 5 | 0 | 305 | ratio 0.460233638667 to 1.93 | 0 |
| CV09 | tensileStrengthXY | floor | deciding | 0.86 | 223 | 0 | 0 | 0 | 249 | ratio 0.864583333333 to 9.88943488943 | 0 |
| CV10 | elongationXY | floor | reported | 1 | 38 | 0 | 0 | 0 | 18 | ratio 1.03846153846 to 70 | 0 |
| CV11 | elongationXY | floor | reported | 1 | 25 | 0 | 0 | 0 | 5 | ratio 1.03448275862 to 20.9333333333 | 0 |
| CV12 | tensileStrengthXY | equal | deciding | 1 to 1 | 4 | 0 | 0 | 0 | 0 |  | 0 |
| CV60 | tensileModulusXY | demote-to-ceiling | reported | 1.16 | 367 | 305 | 0 | 0 | 0 |  | 0 |
| CV61 | tensileStrengthXY | demote-to-ceiling | reported | 1.16 | 303 | 438 | 8 | 0 | 0 |  | 0 |
| CV63 | hdt045 | floor | deciding | 1 | 70 | 0 | 0 | 0 | 0 |  | 0 |
| CL01 | tensileModulusXY | ceiling | deciding | 0.5 | 91 |  | 0 | 0 |  | 0.0053 to 0.4 |  |
| CL02 | density | neat-density range | deciding | polymers.csv | 549 |  | 7 | 0 |  | ABS 1020 to 1120; ASA 1040 to 1130; BVOH 1138 to 1140; COC 1020 to 1020; CoPE 1300 to 1300; CPE 1180 to 1270; … |  |

## Environment evidence

A verdict category has findings that reduce to resistant, limited or not resistant, so it
can answer a pass/fail question. An indicator category has records but no reducible verdict
among them, so it can only show evidence and must never be offered as a hard constraint.

| Category | Kind | Records | With a verdict | Materials | From the base polymer |
|---|---|---:|---:|---:|---:|
| acid | verdict | 155 | 131 | 45 | 50 |
| alkali | verdict | 101 | 87 | 44 | 50 |
| oil-grease | verdict | 81 | 61 | 46 | 48 |
| organic-solvent | verdict | 103 | 50 | 51 | 50 |
| water-solubility | verdict | 42 | 41 | 34 | 34 |
| flammability | verdict | 46 | 36 | 37 | 13 |
| food-contact | indicator | 4 | 0 | 4 | 0 |
| uv-outdoor | verdict | 85 | 0 | 31 | 16 |
| moisture | verdict | 17 | 0 | 15 | 18 |
| creep | indicator | 2 | 0 | 2 | 0 |
| fatigue | indicator | 5 | 0 | 5 | 0 |
| hydrolysis | verdict | 10 | 0 | 10 | 35 |

## Polymer-level behaviour

353 rows of published base-polymer behaviour, attached as 314 inferred records to 79 materials
with no grade-level record in the category (D64). A record is shown in the drawer, counted apart in the filter rail, may screen a
material out under inference where the polymer is attacked or dissolved, and never passes a requirement.

| Category | Polymers | Agent rows | Materials covered | Of which may screen |
|---|---:|---:|---:|---:|
| acid | 21 | 94 | 50 | 14 |
| alkali | 20 | 43 | 50 | 13 |
| flammability | 4 | 4 | 13 | 11 |
| hydrolysis | 12 | 19 | 35 | 10 |
| moisture | 2 | 2 | 18 | 0 |
| oil-grease | 20 | 78 | 48 | 0 |
| organic-solvent | 23 | 87 | 50 | 18 |
| uv-outdoor | 8 | 8 | 16 | 1 |
| water-solubility | 15 | 18 | 34 | 1 |

## Estimates

A headline none of a material's products publishes comparably carries an estimate from one Gaussian model per
property that takes every observation in the snapshot, each converted to the headline's semantics
(build/mappings/estimate-model.json, DECISIONS D43). The likely range is 80% and the plausible range 95%. Both are
calibrated by hiding each material's typical product's value and predicting it from everything else; the build
fails if that coverage drifts. An estimate never passes a material; in Explore it may screen one out only when
its plausible range wholly fails.

| Headline | Observations | Hidden headlines | Likely range holds | Plausible range holds | Median likely width | Spread between products |
|---|---:|---:|---:|---:|---:|---:|
| density | 913 | 121 | 80% | 95% | ×1.1 | 0.0255 (16976 pairs) |
| tensileModulusXY | 1282 | 73 | 81% | 96% | ×1.51 | 0.272 (2139 pairs) |
| tensileStrengthXY | 1369 | 59 | 81% | 97% | ×1.46 | 0.225 (3722 pairs) |
| elongationXY | 1088 | 77 | 81% | 96% | ×5.31 | 0.707 (2980 pairs) |
| hdt045 | 1216 | 57 | 81% | 97% | 10.7 °C | 4 (5244 pairs) |

By stratum (D158): the same hidden headlines, by the classes a change to a polymer's class or a fill column moves. The signed error is the median of the hidden value less its prediction, on the model's scale (ln, or °C).

| Headline | Stratum | Hidden | Likely holds | Plausible holds | Signed error |
|---|---|---:|---:|---:|---:|
| density | PLA unfilled | 1 | 100% | 100% | -0.0217 |
| density | PLA filled | 15 | 60% | 80% | -0.00606 |
| density | other | 90 | 82.2% | 96.7% | -0.00535 |
| density | semicrystalline filled | 15 | 86.7% | 100% | -0.000687 |
| tensileModulusXY | PLA unfilled | 1 | 100% | 100% | 0.0258 |
| tensileModulusXY | PLA filled | 11 | 90.9% | 100% | -0.0708 |
| tensileModulusXY | other | 50 | 82% | 94% | 0.0109 |
| tensileModulusXY | semicrystalline filled | 11 | 63.6% | 100% | 0.244 |
| tensileStrengthXY | PLA unfilled | 1 | 100% | 100% | -0.0538 |
| tensileStrengthXY | PLA filled | 10 | 90% | 90% | -0.141 |
| tensileStrengthXY | other | 39 | 76.9% | 97.4% | 0.0496 |
| tensileStrengthXY | semicrystalline filled | 9 | 88.9% | 100% | 0.0503 |
| elongationXY | PLA unfilled | 1 | 100% | 100% | -0.154 |
| elongationXY | PLA filled | 10 | 100% | 100% | 0.121 |
| elongationXY | other | 55 | 76.4% | 94.5% | -0.134 |
| elongationXY | semicrystalline filled | 11 | 81.8% | 100% | -0.144 |
| hdt045 | PLA unfilled | 1 | 100% | 100% | 2.56 |
| hdt045 | PLA filled | 10 | 100% | 100% | 0.723 |
| hdt045 | other | 36 | 72.2% | 94.4% | 0.721 |
| hdt045 | semicrystalline filled | 10 | 90% | 100% | -4.55 |

| Headline | Missing | From its one product | From its products | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 5 | 1 | 2 | 2 | 0 | 0 | 5 |
| tensileModulusXY | 48 | 12 | 23 | 3 | 4 | 6 | 38 |
| tensileStrengthXY | 43 | 12 | 19 | 2 | 4 | 6 | 33 |
| elongationXY | 46 | 12 | 21 | 3 | 4 | 6 | 35 |
| hdt045 | 72 | 17 | 24 | 8 | 20 | 3 | 49 |

Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most 10% of the time with 90% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.

| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |
|---|---|---:|---:|---:|---:|---:|
| density | this-grade | 7 | 0 | cannot screen | 0 | cannot screen |
| density | this-material | 93 | 0 | 97.5% point | 4 | 2.5% point |
| density | family | 121 | 8 | 97.78% point | 3 | 2.5% point |
| tensileModulusXY | this-grade | 68 | 2 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 60 | 2 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | family | 73 | 0 | 97.5% point | 2 | 2.5% point |
| tensileStrengthXY | this-grade | 51 | 1 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-material | 51 | 0 | 97.5% point | 0 | 2.5% point |
| tensileStrengthXY | family | 59 | 0 | 97.5% point | 2 | 2.5% point |
| elongationXY | this-grade | 38 | 0 | 97.5% point | 2 | 1.56% point |
| elongationXY | this-material | 61 | 2 | 97.5% point | 1 | 2.5% point |
| elongationXY | family | 77 | 2 | 97.5% point | 2 | 2.5% point |
| hdt045 | this-grade | 39 | 0 | 97.5% point | 0 | 2.5% point |
| hdt045 | this-material | 50 | 1 | 97.5% point | 1 | 2.5% point |
| hdt045 | family | 57 | 1 | 97.5% point | 1 | 2.5% point |

Floors (D126): the shown ranges of the same hidden headlines, floored by what the material's other measurements prove (a yield or break stress under the ultimate strength, a strain at yield under the strain at break, HDT at 1.8 MPa under HDT at 0.45 MPa); build/src/estimate/floors.js says what each row floors by. "containment" is a material's rule and "formulation" a grade's, each with the specimens its headline names (D161: elongation, printed bars only); "…Unstated" is the same with an undescribed bar too (D126), "…Converted" with an undescribed bar read as moulded.

| Headline | Floors | Hidden | Ranges moved | Likely holds | Plausible holds | Median likely width | Hidden values under the plausible range |
|---|---|---:|---:|---:|---:|---:|---:|
| tensileModulusXY | none | 73 | 0 | 80.8% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | printed | 73 | 0 | 80.8% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | printedXY | 73 | 0 | 80.8% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | unstated | 73 | 0 | 80.8% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | containment | 73 | 0 | 80.8% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | sameSource | 73 | 0 | 80.8% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | lowestOfProducts | 73 | 0 | 80.8% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | formulation | 73 | 0 | 80.8% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | containmentUnstated | 73 | 0 | 80.8% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | formulationUnstated | 73 | 0 | 80.8% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | formulationCeilings | 73 | 5 | 79.5% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | formulationBoth | 73 | 5 | 79.5% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | containmentConverted | 73 | 0 | 80.8% | 95.9% | ×1.51 | 1 |
| tensileModulusXY | formulationConverted | 73 | 0 | 80.8% | 95.9% | ×1.51 | 1 |
| tensileStrengthXY | none | 59 | 0 | 81.4% | 96.6% | ×1.46 | 1 |
| tensileStrengthXY | printed | 59 | 42 | 57.6% | 76.3% | ×1.44 | 13 |
| tensileStrengthXY | printedXY | 59 | 11 | 71.2% | 89.8% | ×1.45 | 5 |
| tensileStrengthXY | unstated | 59 | 55 | 18.6% | 22% | ×1.16 | 46 |
| tensileStrengthXY | containment | 59 | 10 | 86.4% | 93.2% | ×1.79 | 4 |
| tensileStrengthXY | sameSource | 59 | 42 | 57.6% | 76.3% | ×1.44 | 13 |
| tensileStrengthXY | lowestOfProducts | 59 | 55 | 71.2% | 83.1% | ×1.45 | 9 |
| tensileStrengthXY | formulation | 59 | 35 | 74.6% | 89.8% | ×1.45 | 6 |
| tensileStrengthXY | containmentUnstated | 59 | 10 | 86.4% | 93.2% | ×1.79 | 4 |
| tensileStrengthXY | formulationUnstated | 59 | 35 | 74.6% | 89.8% | ×1.45 | 6 |
| tensileStrengthXY | formulationCeilings | 59 | 8 | 78% | 91.5% | ×1.46 | 1 |
| tensileStrengthXY | formulationBoth | 59 | 36 | 71.2% | 86.4% | ×1.45 | 6 |
| tensileStrengthXY | containmentConverted | 59 | 10 | 83.1% | 96.6% | ×1.5 | 2 |
| tensileStrengthXY | formulationConverted | 59 | 35 | 74.6% | 94.9% | ×1.45 | 3 |
| elongationXY | none | 77 | 0 | 80.5% | 96.1% | ×5.31 | 2 |
| elongationXY | printed | 77 | 48 | 59.7% | 71.4% | ×3.81 | 21 |
| elongationXY | printedXY | 77 | 21 | 74% | 85.7% | ×4.29 | 10 |
| elongationXY | unstated | 77 | 64 | 31.2% | 40.3% | ×2.53 | 46 |
| elongationXY | containment | 77 | 3 | 80.5% | 94.8% | ×5.67 | 3 |
| elongationXY | sameSource | 77 | 48 | 57.1% | 68.8% | ×3.81 | 23 |
| elongationXY | lowestOfProducts | 77 | 64 | 63.6% | 80.5% | ×4.1 | 15 |
| elongationXY | formulation | 77 | 25 | 75.3% | 92.2% | ×4.51 | 5 |
| elongationXY | containmentUnstated | 77 | 10 | 77.9% | 88.3% | ×7.83 | 8 |
| elongationXY | formulationUnstated | 77 | 38 | 67.5% | 81.8% | ×4.14 | 13 |
| elongationXY | containmentConverted | 77 | 10 | 80.5% | 92.2% | ×6.52 | 5 |
| elongationXY | formulationConverted | 77 | 38 | 75.3% | 87% | ×4.14 | 9 |
| hdt045 | none | 57 | 0 | 80.7% | 94.7% | 10.6 °C | 1 |
| hdt045 | printed | 57 | 33 | 66.7% | 78.9% | 9.25 °C | 10 |
| hdt045 | printedXY | 57 | 5 | 75.4% | 89.5% | 10.6 °C | 4 |
| hdt045 | unstated | 57 | 44 | 50.9% | 61.4% | 8.17 °C | 20 |
| hdt045 | containment | 57 | 1 | 80.7% | 94.7% | 10.8 °C | 1 |
| hdt045 | sameSource | 57 | 38 | 64.9% | 77.2% | 8.37 °C | 11 |
| hdt045 | lowestOfProducts | 57 | 36 | 73.7% | 87.7% | 9.36 °C | 5 |
| hdt045 | formulation | 57 | 17 | 80.7% | 94.7% | 10.6 °C | 1 |
| hdt045 | containmentUnstated | 57 | 2 | 82.5% | 94.7% | 12.1 °C | 1 |
| hdt045 | formulationUnstated | 57 | 17 | 80.7% | 94.7% | 10.6 °C | 1 |

Unstated directions (D159): the kinds whose offset is learned across products as well as from the products that publish both. Target: each product with only an unstated-direction value, beside measured siblings, its centre against their median (a ratio) and how many centres sit above every sibling. Guard: each product that publishes both, as different numbers, its headline hidden and predicted.

| Headline | Kinds | Target products | Centre ÷ siblings' median | Above every sibling | Guard cases | Guard signed error | Guard plausible holds |
|---|---|---:|---:|---:|---:|---:|---:|
| tensileModulusXY | flexural unk -0.15 (48 materials); tensile unk -0.154 (53 materials) | 261 | ×0.976 | 32 | 26 | 0.0825 | 92.3% |
| tensileStrengthXY | ultimate unk -0.131 (43 materials); break unk -0.146 (39 materials); yield unk -0.161 (38 materials) | 215 | ×1.01 | 30 | 6 | 0.00781 | 83.3% |
| elongationXY | break unk -0.149 (53 materials) | 259 | ×1.09 | 50 | 23 | 0.0602 | 91.3% |

Grade estimates (D81): each grade predicted at its own row and calibrated by hiding its own published values.

| Headline | Hidden values | Likely scale | Plausible scale | Likely coverage | Plausible coverage | Shipped |
|---|---:|---:|---:|---:|---:|---|
| density | 832 | 1.43 | 2.1 | 0.794 | 0.951 | yes |
| tensileModulusXY | 296 | 1.11 | 1.34 | 0.801 | 0.953 | yes |
| tensileStrengthXY | 303 | 1.32 | 1.28 | 0.792 | 0.941 | yes |
| elongationXY | 334 | 1.09 | 1.11 | 0.793 | 0.949 | yes |
| hdt045 | 413 | 1.22 | 1.53 | 0.801 | 0.952 | yes |

By matrix as printed (D162): the hidden grade values of each matrix, the coverage the shared scales give them, the scales they alone would need, and the spread between two products of one material measured in that matrix (the one used where the headline sets it per matrix).

| Headline | Matrix | Hidden values | Likely coverage | Plausible coverage | Scales it would need | Product spread measured (pairs) | Used |
|---|---|---:|---:|---:|---:|---:|---:|
| density | amorphous | 617 | 0.796 | 0.95 | 1.4 / 2.1 | 0.0255 (16591) | 0.0255 |
| density | elastomer | 91 | 0.956 | 0.989 | 0.652 / 0.927 | – | – |
| density | semi-filled | 73 | 0.671 | 0.959 | 1.84 / 2.02 | 0.0506 (248) | 0.0255 |
| density | semi-unfilled | 51 | 0.667 | 0.882 | 1.92 / 2.81 | 0.0407 (137) | 0.0255 |
| tensileModulusXY | amorphous | 237 | 0.806 | 0.949 | 1.07 / 1.36 | 0.272 (2114) | 0.272 |
| tensileModulusXY | elastomer | 19 | 0.947 | 1 | 0.994 / 0.906 | – | – |
| tensileModulusXY | semi-filled | 28 | 0.679 | 0.929 | 1.71 / 1.41 | 0.149 (24) | 0.272 |
| tensileModulusXY | semi-unfilled | 12 | 0.75 | 1 | 1.11 / 1.15 | 0.224 (1) | 0.272 |
| tensileStrengthXY | amorphous | 239 | 0.816 | 0.958 | 1.21 / 1.25 | 0.224 (3681) | 0.225 |
| tensileStrengthXY | elastomer | 30 | 0.6 | 0.833 | 1.65 / 1.85 | – | – |
| tensileStrengthXY | semi-filled | 25 | 0.8 | 0.92 | 1.02 / 1.29 | 0.365 (37) | 0.225 |
| tensileStrengthXY | semi-unfilled | 9 | 0.778 | 0.889 | 1.44 / 1.14 | 0.226 (4) | 0.225 |
| elongationXY | amorphous | 261 | 0.801 | 0.95 | 1.06 / 1.09 | 0.708 (2946) | 0.707 |
| elongationXY | elastomer | 30 | 0.8 | 0.967 | 0.967 / 1.03 | – | – |
| elongationXY | semi-filled | 32 | 0.844 | 0.969 | 1.02 / 0.993 | 0.631 (30) | 0.707 |
| elongationXY | semi-unfilled | 11 | 0.455 | 0.818 | 1.44 / 1.19 | 1.15 (4) | 0.707 |
| hdt045 | amorphous | 335 | 0.809 | 0.952 | 1.19 / 1.51 | 3.14 (5100) | 4 |
| hdt045 | semi-filled | 51 | 0.804 | 0.922 | 1.17 / 1.64 | 33.6 (112) | 33.6 |
| hdt045 | semi-unfilled | 27 | 0.704 | 1 | 1.37 / 1.13 | 17.5 (32) | 17.5 |

Grade plausible coverage by fold of materials: density 0.91, 0.988, 1, 0.929, 0.969; tensileModulusXY 0.958, 0.915, 1, 0.944, 0.959; tensileStrengthXY 0.943, 0.938, 0.974, 0.86, 1; elongationXY 0.955, 0.971, 0.936, 0.929, 0.942; hdt045 0.972, 0.968, 0.914, 0.943, 0.919. Median grade plausible width: density 1.25, tensileModulusXY 1.93, tensileStrengthXY 1.74, elongationXY 9.26, hdt045 21.3.

A product's own values as its anchor (D167): hidden grades that publish the property another way too; how often their own bands (as the conversions state them) and anchors (widened by the band scale) hold the hidden value; where the model's centre lay outside the anchor (its estimate withheld), how often the band and the model held it; and the anchored ranges' coverage before and after.

| Headline | Cases | Sheets disagree | Band / anchor coverage | Band scale (low / high side) | Withheld (band right / model right) | Anchored | Likely before → after | Plausible before → after | Used | Shipped: anchored, withheld, disagree |
|---|---:|---:|---|---:|---|---:|---|---|---|---|
| density | 18 | 0 | 0.722 / 0.833 | 1.3 / 1.3 | 0 (0 / 0) | 18 | 0.667 → 0.667 | 1 → 0.833 | no | 0, 0, 0 |
| tensileModulusXY | 153 | 1 | 0.855 / 0.967 | 1 / 2.85 | 4 (0 / 3) | 148 | 0.845 → 0.838 | 0.973 → 0.966 | yes | 325, 1, 7 |
| tensileStrengthXY | 193 | 2 | 0.874 / 0.974 | 1 / 1.71 | 8 (5 / 5) | 183 | 0.82 → 0.814 | 0.945 → 0.94 | yes | 470, 4, 19 |
| elongationXY | 174 | 0 | 0.891 / 0.96 | 1.38 / 1.47 | 2 (0 / 2) | 172 | 0.767 → 0.762 | 0.948 → 0.924 | yes | 390, 1, 1 |
| hdt045 | 186 | 0 | 0.876 / 0.973 | 1 / 1.68 | 5 (1 / 4) | 181 | 0.812 → 0.812 | 0.956 → 0.956 | yes | 213, 16, 1 |

Conversions that learn from several makers only and keep their documented offset (D167): hdt045 HDT 0.45 annealed -52 (3 pairs of 1 makers); hdt045 HDT 0.45 annealed glassy -5 (4 pairs of 2 makers).

EST-GRADE-OUTLIER, 19 grades: PLA 5, PLA Aero 3, PLA Wood 2, ABS 2, PLA Marble 1, PP 1, POM / Acetal 1, TPU 85A class and softer 1, PETG 1, ABS-CF 1, ASA-CF 1.

Evidence that contradicts everything else and was down-weighted (EST-CONFLICT, 202 observations):

By material: PLA 23, TPU 95A class 13, PLA Aero 12, PETG 9, PPA-CF 8, PLA Wood 7, ABS 7, PA6-CF 7, PC 6, PLA Metal 4, PA12-CF 4, PPA-GF 4, CPE-CF 4, PAHT-CF 4, PPS-CF 4, TPU harder than 95A 4, nGen FLEX 4, CPE 4, PLA-CF 3, TPC / TPEE 3, PA6-GF 3, PP-CF 3, ASA Aero 3, ASA-CF 3, nGen / Amphora 3, ABS-CF 3, PA6 2, PA12-GF 2, PA66 2, PLA-EC 2, PAHT-CE 2, PLA-NF 2, PETG-CF 2, PET-CF 2, PPS-GF 2, PET-LW 2, OBC 2, TPC-ESD 2, PBAT 2, TPU-GF 2, TPU 85A class and softer 2, TPU 90A class 2, ASA 2, COC 2, PLA Marble 1, PLA Sparkle 1, PVA 1, PP 1, POM / Acetal 1, PC-GF 1, ASA-GF 1, HIPS 1, PVDF 1, BVOH 1, ABS-GF 1, PC FR 1, PC-ABS 1, PC-PBT 1.

- PLA, density: density 1240, 1000 (V007470, V013434)
- PLA, density: density 1240 (V008736)
- PLA, density: density 1240 (V009024)
- PLA, density: density 1200 (V009118)
- PLA, density: density 2300 (V009181)
- PLA, density: density 1660 (V009217)
- PLA, density: density 1850 (V009267)
- PLA, density: density 2300 (V009282)
- PLA, density: density 800, 800 (V010164, V010344)
- PLA, density: density 1340 (V010204)
- PLA Metal, density: density 2360, 2360 (V004044, V004066)
- PLA Metal, density: density 2330, 2330 (V004048, V004062)
- PLA Metal, density: density 1225 (V007387)
- PLA Metal, density: density 1200 (V009065)
- PLA Marble, density: density 1700 (V009757)
- PLA Sparkle, density: density 1410 (V009182)
- PLA Wood, density: density 1020 (V005557)
- PLA Wood, density: density 1254 (V006967)
- PLA Wood, density: density 700 (V009165)
- PLA Wood, density: density 970 (V010031)
- PLA Wood, density: density 1300 (V011067)
- PLA Wood, density: density 1260 (V011495)
- PLA Aero, density: density 1210 (V000303)
- PLA Aero, density: density 1240 (V002975)
- PLA Aero, density: density 900, 900 (V003554, V003652)
- PLA Aero, density: density 840 (V004522)
- PLA Aero, density: density 1210 (V004816)
- PLA Aero, density: density 1200 (V006763)
- PLA-CF, density: density 1420 (V009909)
- PETG, density: density 1290, 1290 (V009089, V009103)
- ABS, density: density 1150, 1100 (V004699, V008588)
- ABS, density: density 1100 (V010441)
- TPC / TPEE, density: density 1160 (V005542)
- PA6, density: density 1250 (V000917)
- PA6-GF, density: density 1140 (V000943)
- PA12-CF, density: density 1230 (V006956)
- PA12-GF, density: density 1230 (V001007)
- PA12-GF, density: density 1000 (V013408)
- PA66, density: density moulded 1140 (V002033)
- PA66, density: density 1300 (V011134)
- PPA-GF, density: density 1160 (V015309)
- PVA, density: density 1370 (V010405)
- PP, density: density 750 (V010415)
- PP-CF, density: density 1100 (V001502)
- POM / Acetal, density: density 1140 (V002322)
- CPE-CF, density: density 1160 (V001676)
- CPE-CF, density: density moulded 1400 (V010343)
- PLA-EC, density: density 1350 (V003052)
- PLA-EC, density: density 1240 (V009037)
- PAHT-CE, density: density 1250 (V009726)
- PAHT-CE, density: density 1490, 1400 (V009738, V012259)
- PLA-NF, density: density 1450 (V010252)
- PLA-NF, density: density 1250 (V010283)
- PLA, tensileModulusXY: flexural XY 2.49017 (V008923)
- PLA, tensileModulusXY: tensile XY 1.14606 (V012520)
- PLA Aero, tensileModulusXY: tensile moulded 3.5 (V005766)
- PLA Aero, tensileModulusXY: tensile XY 0.893 (V009905)
- PLA Aero, tensileModulusXY: tensile Z 0.254 (V009907)
- PLA Aero, tensileModulusXY: tensile XY 0.86 (V011573)
- PETG, tensileModulusXY: tensile XY 1.9, 1.93 (V005873, V006291)
- PETG, tensileModulusXY: flexural XY 1, 1 (V005876, V006298)
- PETG-CF, tensileModulusXY: flexural unk 0.065 (V007718)
- PETG-CF, tensileModulusXY: tensile Z 1.4 (V015302)
- ASA Aero, tensileModulusXY: tensile XY 0.824 (V005747)
- ASA Aero, tensileModulusXY: tensile moulded 2.2 (V011587)
- ASA Aero, tensileModulusXY: flexural moulded 2.3 (V011590)
- ASA-CF, tensileModulusXY: tensile XY 0.85 (V005198)
- PC-GF, tensileModulusXY: tensile Z 1.231 (V001840)
- PAHT-CF, tensileModulusXY: tensile XY 8.386, 8.386 (V002469, V007626)
- PAHT-CF, tensileModulusXY: tensile XY 8.62 (V009940)
- PAHT-CF, tensileModulusXY: tensile Z 2.75 (V009943)
- PAHT-CF, tensileModulusXY: tensile XY annealed 6.588 (V011737)
- PA6-CF, tensileModulusXY: tensile moulded 1.1 (V004325)
- PA6-CF, tensileModulusXY: tensile unk 6 (V013080)
- PA12-CF, tensileModulusXY: tensile unk 0.5 (V010096)
- PET-CF, tensileModulusXY: tensile Z 2.822 (V011702)
- PPA-CF, tensileModulusXY: tensile XY 11.8 (V001310)
- PPA-CF, tensileModulusXY: tensile Z 4.3 (V001311)
- PPS-CF, tensileModulusXY: tensile XY 8.23 (V001361)
- PPS-CF, tensileModulusXY: tensile Z 2.85 (V001362)
- PPS-CF, tensileModulusXY: tensile XY 7.46 (V001865)
- PPS-CF, tensileModulusXY: tensile Z 2.72 (V001867)
- PPS-GF, tensileModulusXY: tensile XY 5.764 (V001381)
- PPS-GF, tensileModulusXY: tensile Z 2.581 (V001382)
- CPE-CF, tensileModulusXY: tensile XY 5.15 (V010336)
- CPE-CF, tensileModulusXY: flexural XY 2.7 (V010339)
- PET-LW, tensileModulusXY: tensile XY 1.5 (V011402)
- PET-LW, tensileModulusXY: flexural XY 0.5232 (V011408)
- TPU 95A class, tensileModulusXY: tensile XY 0.0502 (V012569)
- TPU 95A class, tensileModulusXY: flexural XY 0.0876 (V012572)
- TPU 95A class, tensileModulusXY: flexural XY 0.0876 (V014348)
- TPU harder than 95A, tensileModulusXY: tensile moulded 0.04, 0.04 (V004196, V008567)
- TPU harder than 95A, tensileModulusXY: tensile moulded 0.04, 0.04 (V004310, V008600)
- TPU harder than 95A, tensileModulusXY: tensile unk 0.4 (V012012)
- TPU harder than 95A, tensileModulusXY: tensile unk 0.12 (V012024)
- PLA, tensileStrengthXY: ultimate XY 28.004 (V008589)
- PLA, tensileStrengthXY: flexural XY 85.809 (V008591)
- PLA, tensileStrengthXY: ultimate XY 23.2, 23.2 (V010173, V010349)
- PLA Aero, tensileStrengthXY: ultimate XY 10 (V011575)
- PLA Aero, tensileStrengthXY: ultimate XY 9 (V011581)
- PLA-CF, tensileStrengthXY: ultimate XY 39 (V009032)
- PLA-CF, tensileStrengthXY: flexural XY 103 (V009034)
- PETG, tensileStrengthXY: ultimate XY 50, 51.25 (V005874, V006294)
- PETG, tensileStrengthXY: break XY 28.67 (V006296)
- ABS, tensileStrengthXY: ultimate XY 15.68 (V005136)
- ABS, tensileStrengthXY: ultimate XY 27 (V008933)
- ABS, tensileStrengthXY: flexural XY 92.38 (V008936)
- ASA-GF, tensileStrengthXY: flexural unk 27.2 (V002205)
- TPC / TPEE, tensileStrengthXY: flexural unk 1.96133, 4.4129925 (V007467, V015166)
- PA6-CF, tensileStrengthXY: ultimate XY 53 (V005126)
- PA6-CF, tensileStrengthXY: flexural XY 140 (V005130)
- HIPS, tensileStrengthXY: yield unk 16 (V001479)
- PP-CF, tensileStrengthXY: break XY 78 (V001503)
- PP-CF, tensileStrengthXY: flexural XY 68 (V001506)
- OBC, tensileStrengthXY: break XY 14 (V007765)
- OBC, tensileStrengthXY: flexural XY 7.8 (V007768)
- PVDF, tensileStrengthXY: flexural XY 50 (V001607)
- TPC-ESD, tensileStrengthXY: break XY 70 (V003135)
- TPC-ESD, tensileStrengthXY: flexural XY 50 (V003137)
- PBAT, tensileStrengthXY: ultimate XY 27 (V005365)
- PBAT, tensileStrengthXY: flexural XY 7 (V005368)
- nGen FLEX, tensileStrengthXY: ultimate XY 19.3 (V005860)
- nGen FLEX, tensileStrengthXY: flexural XY 8.9 (V005863)
- TPU-GF, tensileStrengthXY: break XY 32 (V010101)
- TPU-GF, tensileStrengthXY: flexural unk 15 (V010104)
- TPU 85A class and softer, tensileStrengthXY: ultimate XY 30 (V005838)
- TPU 85A class and softer, tensileStrengthXY: flexural XY 1.55 (V005841)
- TPU 90A class, tensileStrengthXY: ultimate XY 24, 12 (V012728, V012729)
- TPU 90A class, tensileStrengthXY: flexural XY 3, 2 (V012734, V012735)
- TPU 95A class, tensileStrengthXY: ultimate XY 31, 34.4 (V004770, V014344)
- TPU 95A class, tensileStrengthXY: ultimate XY 27 (V005374)
- TPU 95A class, tensileStrengthXY: flexural XY 7 (V005377)
- TPU 95A class, tensileStrengthXY: ultimate XY 17 (V005940)
- TPU 95A class, tensileStrengthXY: flexural XY 2.9 (V005943)
- TPU 95A class, tensileStrengthXY: flexural unk 4.26 (V007898)
- TPU 95A class, tensileStrengthXY: flexural unk 4.26 (V008726)
- TPU 95A class, tensileStrengthXY: ultimate XY 34.4 (V012567)
- TPU 95A class, tensileStrengthXY: flexural XY 4.26 (V012571)
- TPU 95A class, tensileStrengthXY: flexural XY 4.26 (V014347)
- PLA, elongationXY: break XY 34.5, 27.8 (V003649, V003863)
- PLA, elongationXY: break Z 0.9 (V003864)
- PETG, elongationXY: break XY 90, 91.06 (V005875, V006297)
- PETG, elongationXY: break XY 5.15 (V007048)
- PETG, elongationXY: break moulded 83 (V007974)
- TPC / TPEE, elongationXY: break unk 600 (V011174)
- BVOH, elongationXY: break Z 0.6, 0.6 (V002265, V011884)
- CPE, elongationXY: break XY 6.2 (V010008)
- CPE, elongationXY: break unk 110 (V010216)
- nGen / Amphora, elongationXY: break XY 11, 11 (V001958, V005885)
- nGen / Amphora, elongationXY: break moulded 190, 190 (V001961, V005888)
- nGen / Amphora, elongationXY: break unk 193 (V005921)
- PLA, hdt045: Vicat amorphous 140 (V002877)
- PLA, hdt045: HDT 0.45 90 (V005586)
- PLA, hdt045: HDT unstated moulded amorphous 134 (V005792)
- PLA, hdt045: HDT 0.45 110 (V007602)
- PLA, hdt045: Vicat amorphous 140 (V007603)
- PLA, hdt045: HDT 1.8 amorphous 75 (V008746)
- PLA Wood, hdt045: HDT unstated 87 (V012651)
- PETG, hdt045: Vicat amorphous 170 (V012393)
- ABS, hdt045: HDT unstated 65 (V007083)
- ABS, hdt045: HDT 0.45 118.1 (V013460)
- ABS-GF, hdt045: Tg amorphous 135 (V004463)
- ABS-CF, hdt045: Tg amorphous 105 (V000593)
- ABS-CF, hdt045: HDT 0.45 76 (V000594)
- ABS-CF, hdt045: HDT 0.45 78 (V002175)
- ASA, hdt045: HDT 0.45 82 (V004829)
- ASA, hdt045: HDT 1.8 amorphous 68 (V009515)
- ASA-CF, hdt045: HDT 0.45 86 (V004880)
- ASA-CF, hdt045: HDT 0.45 130 (V013107)
- PC, hdt045: HDT 0.45 139, 139 (V002884, V012389)
- PC, hdt045: HDT 0.45 101, 101 (V004707, V008720)
- PC, hdt045: HDT 1.8 amorphous 141 (V005612)
- PC, hdt045: HDT 1.8 amorphous 93 (V013670)
- PC, hdt045: HDT 1.8 amorphous 121 (V015185)
- PC, hdt045: HDT 0.45 144 (V015187)
- PC FR, hdt045: Tg amorphous 145 (V000700)
- PA6, hdt045: HDT unstated 186 (V007868)
- PA6-CF, hdt045: HDT 1.8 semi-filled 65 (V002731)
- PA6-CF, hdt045: HDT 0.45 180, 180 (V002732, V012387)
- PA6-CF, hdt045: HDT 1.8 semi-filled 50 (V007552)
- PA6-GF, hdt045: HDT 1.8 semi-filled 65 (V002720)
- PA6-GF, hdt045: HDT 0.45 180, 180 (V002721, V012388)
- PA12-CF, hdt045: HDT 0.45 48 (V007204)
- PA12-CF, hdt045: Tm semi-filled 170 (V007206)
- PET-CF, hdt045: HDT 0.45 100 (V005316)
- PPA-CF, hdt045: Vicat semi-filled 230, 230 (V002566, V014089)
- PPA-CF, hdt045: Tm semi-filled 232, 232 (V002570, V014093)
- PPA-CF, hdt045: HDT 0.45 84.5, 84.5 (V002574, V014097)
- PPA-CF, hdt045: Vicat semi-filled 238 (V002592)
- PPA-CF, hdt045: Tm semi-filled 239 (V002596)
- PPA-CF, hdt045: HDT 0.45 97 (V002600)
- PPA-GF, hdt045: Vicat semi-filled 235 (V002621)
- PPA-GF, hdt045: Tm semi-filled 232 (V002625)
- PPA-GF, hdt045: HDT 0.45 84 (V002629)
- CPE, hdt045: HDT 0.45 99 (V005512)
- CPE, hdt045: HDT 0.45 100, 99 (V010766, V013127)
- PC-ABS, hdt045: HDT 1.8 amorphous 90 (V002097)
- PC-PBT, hdt045: Tg amorphous 145 (V012950)
- COC, hdt045: Vicat amorphous 64 (V010403)
- COC, hdt045: HDT 0.45 160 (V011484)
- nGen FLEX, hdt045: HDT 0.45 moulded amorphous 100 (V005870)
- nGen FLEX, hdt045: Vicat amorphous 170 (V006009)

Measured headlines far outside their prediction (worth a second look at the source and the grade):

- ASA Aero, density: 460 kg/m³, expected about 1040
- PLA-EC, density: 1240 kg/m³, expected about 1520
- PAHT-CE, density: 1250 kg/m³, expected about 1440
- PBAT, tensileModulusXY: 0.006 GPa, expected about 1.01

## Consistency

Every one of the 175 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade;
- every product value cites a measurement of that product that is not quarantined (7274 checked), and a material's typical product is one of its own;
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

- `PROCESS-WINDOW-IMPLAUSIBLE` **profiles P0050** — Bed "30 -500 ºC" states 500 °C, outside the plausible 0–250 °C; it is typed as stated (30–30): check the cell against its page
- `CONVERSION-PAIRS` **conversions CV01** — CV01 (floor on hdt045): 1 of 135 same-sheet pair(s) break it: G165-04 V014653 58 against V014656 62
- `LEDGER-CONTRADICTS-VALUE` **grades** — 5 comparable value(s) outside their own deciding bounds by more than the test scatter, so doubtful: G008-06 tensileModulusXY 1.2154 (V004808) against CV08 V004814; G001-44 tensileModulusXY 1.1323 (V004950) against CV08 V004956; G001-46 tensileModulusXY 1.3455 (V005061) against CV08 V005067; G018-09 tensileModulusXY 1.7327 (V005075) against CV08 V005081; …
- `CLASS-LIMIT-CONTRADICTED` **grades** — 7 comparable value(s) beyond their kind's limit by more than the test scatter: G087-03 density 1140 (V002322) against CL02; G035-12 density 1150 (V004709) against CL02; G087-04 density 1340 (V005605) against CL02; G094-06 density 1070 (V006114) against CL02; …
- `NO-MEASUREMENTS` **materials** — 2 materials have no property measurements at all: PA66-CF, PA612-GF
- `EST-REJECTED` **measurements** — 6 values are physically impossible for their property and were kept out of the estimate model: V009245 PLA Density 3130 kg/m³; V009254 PLA Density 3900 kg/m³; V009486 PLA Density 4000 kg/m³; V009522 PLA Metal Density 2780 kg/m³; V009638 PLA Metal Density 3400 kg/m³; V009775 PLA Metal Density 3500 kg/m³
- `EST-OUTLIER` **materials** — 4 measured headlines sit far outside what every other observation predicts; check the source and the grade: ASA Aero density 460 (expected about 1040); PLA-EC density 1240 (expected about 1520); PAHT-CE density 1250 (expected about 1440); PBAT tensileModulusXY 0.006 (expected about 1.01)
- `EST-FAMILY-ORDER` **materials** — 4 reinforced materials sit below their unfilled sibling: ABS-AF tensileModulusXY 1.89 < ABS 2.2; ASA-AF tensileModulusXY 1.75 (estimate) < ASA 2.1373; TPU-CF tensileModulusXY 0.12 (estimate) < TPU harder than 95A 0.3964487; Nylon-CF, maker-undisclosed polyamide tensileModulusXY 2.4 < Nylon, maker-undisclosed polyamide 2.477
