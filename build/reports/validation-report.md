# Validation report

Database snapshot 2026-09-21 · build 2026-10-21

**No errors.**

## Contents

| Entity | Records |
|---|---:|
| materials | 175 |
| h2cRelevant | 138 |
| familyEntries | 23 |
| retiredDuplicates | measurements 614, evidence 23, profiles 80 |
| excluded | 14 |
| grades | 1189 |
| measurements | 15235 |
| numericMeasurements | 15035 |
| quarantined | 43 |
| profiles | 1916 |
| evidence | 868 |
| prices | 376 |
| sources | 2127 |
| coverage | 958 |
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
| tensileModulusXY | 106 |
| tensileModulusZ | 55 |
| tensileStrengthXY | 115 |
| tensileStrengthZ | 59 |
| elongationXY | 106 |
| elongationZ | 58 |
| flexuralModulusXY | 98 |
| flexuralModulusZ | 37 |
| flexuralStrengthXY | 98 |
| flexuralStrengthZ | 39 |
| charpyNotched | 59 |
| izodNotched | 39 |
| hdt045 | 89 |
| hdt18 | 58 |
| glassTransition | 95 |
| shoreA | 15 |
| shoreD | 46 |
| priceCADkg | 114 |

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
| CN02 | Family: ASA | within | deciding | 20 | 2 | yes | 2 |
| CN03 | Family: Acetals | unknown | reported | 1 | 1 | no | 0 |
| CN04 | Family: Copolyesters | unknown | reported | 9 | 0 | no | 0 |
| CN05 | Family: Flexible Elastomers | within | deciding | 18 | 0 | yes | 43 |
| CN06 | Family: Fluoropolymers | unknown | reported | 1 | 0 | no | 0 |
| CN07 | Family: High-Performance Engineering | unknown | reported | 11 | 0 | yes | 0 |
| CN08 | Family: Industrial High-Temperature | unknown | reported | 11 | 9 | no | 0 |
| CN10 | Family: Nylon / Polyamide | unknown | reported | 18 | 2 | no | 0 |
| CN11 | Family: PET Engineering | unknown | reported | 7 | 0 | no | 0 |
| CN12 | Family: PETG | within | deciding | 22 | 0 | yes | 5 |
| CN13 | Family: PLA | within | deciding | 26 | 0 | yes | 38 |
| CN14 | Family: PVB / Specialty Polymers | unknown | reported | 7 | 0 | no | 0 |
| CN15 | Family: Polycarbonate | unknown | reported | 11 | 3 | no | 0 |
| CN16 | Family: Polymer Blends | unknown | reported | 7 | 3 | no | 0 |
| CN17 | Family: Polyolefins | within | deciding | 10 | 0 | yes | 9 |
| CN18 | Family: Styrenics | unknown | reported | 4 | 1 | no | 0 |
| CN19 | Family: Support / Interface | unknown | reported | 2 | 0 | no | 0 |
| CN20 | Family: Support / Soluble | unknown | reported | 7 | 0 | no | 0 |

## Evidence ledger

Per row of data/tables/conversions.csv and class_limits.csv: the product states it bounds where they hold no deciding
value, the values it would demote or that contradict it, and its same-sheet pairs (the ratio, or the difference in C,
each pair implies, and how many break the row). Only a deciding row decides (D153, D154).

| Row | Target | Kind | Status | Factors | Products | Demoted | Contradicted | Disagree | Pairs | Implied | Breaking |
|---|---|---|---|---|---:|---:|---:|---:|---:|---|---:|
| CV01 | hdt045 | floor | deciding | 1 | 184 | 0 | 0 | 0 | 183 | difference -4 to 119.5 | 1 |
| CV02 | tensileModulusXY | equal | deciding | 1 to 1 | 5 | 0 | 0 | 0 | 0 |  | 0 |
| CV03 | hdt045 | ceiling | deciding | 1 | 55 | 0 | 0 | 0 | 9 | difference -101 to -2.5 | 0 |
| CV04 | tensileModulusXY | ceiling | deciding | 1.28 | 51 | 0 | 0 | 0 | 13 | ratio 0.756593169045 to 1.27292046145 | 0 |
| CV05 | hdt045 | demote-to-ceiling | deciding | 1 | 160 | 107 | 0 | 0 | 1 | difference -5 to -5 | 0 |
| CV06 | tensileModulusXY | floor | deciding | 0.79 | 175 | 0 | 0 | 0 | 206 | ratio 0.791747011184 to 5.15974842767 | 0 |
| CV07 | tensileModulusXY | floor | deciding | 1 | 9 | 0 | 0 | 0 | 13 | ratio 1 to 3.73342541436 | 0 |
| CV08 | tensileModulusXY | band | deciding | 0.46 to 1.93 | 609 | 0 | 5 | 0 | 311 | ratio 0.460233638667 to 1.93 | 0 |
| CV09 | tensileStrengthXY | floor | deciding | 0.86 | 225 | 0 | 0 | 0 | 249 | ratio 0.864583333333 to 9.88943488943 | 0 |
| CV10 | elongationXY | floor | reported | 1 | 39 | 0 | 0 | 0 | 18 | ratio 1.03846153846 to 70 | 0 |
| CV11 | elongationXY | floor | reported | 1 | 25 | 0 | 0 | 0 | 5 | ratio 1.03448275862 to 20.9333333333 | 0 |
| CV12 | tensileStrengthXY | equal | deciding | 1 to 1 | 5 | 0 | 0 | 0 | 0 |  | 0 |
| CV60 | tensileModulusXY | demote-to-ceiling | reported | 1.16 | 363 | 299 | 0 | 0 | 0 |  | 0 |
| CV61 | tensileStrengthXY | demote-to-ceiling | reported | 1.16 | 294 | 408 | 8 | 0 | 0 |  | 0 |
| CV63 | hdt045 | floor | deciding | 1 | 69 | 0 | 1 | 0 | 0 |  | 0 |
| CL01 | tensileModulusXY | ceiling | deciding | 0.5 | 91 |  | 0 | 0 |  | 0.0053 to 0.4 |  |
| CL02 | density | neat-density range | deciding | polymers.csv | 548 |  | 7 | 0 |  | ABS 1020 to 1120; ASA 1040 to 1130; BVOH 1138 to 1140; COC 1020 to 1020; CoPE 1300 to 1300; CPE 1180 to 1270; … |  |
| CL03 | tensileModulusXY | ceiling | deciding | 0.5 | 1 |  | 0 | 0 |  |  |  |

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
| density | 916 | 121 | 80% | 95% | ×1.09 | 0.0255 (17008 pairs) |
| tensileModulusXY | 1296 | 74 | 81% | 96% | ×1.53 | 0.27 (2155 pairs) |
| tensileStrengthXY | 1375 | 60 | 80% | 95% | ×1.44 | 0.224 (3740 pairs) |
| elongationXY | 1097 | 74 | 81% | 96% | ×5.93 | 0.708 (2982 pairs) |
| hdt045 | 1222 | 65 | 80% | 95% | 12.5 °C | 4 (5287 pairs) |

By stratum (D158): the same hidden headlines, by the classes a change to a polymer's class or a fill column moves. The signed error is the median of the hidden value less its prediction, on the model's scale (ln, or °C).

| Headline | Stratum | Hidden | Likely holds | Plausible holds | Signed error |
|---|---|---:|---:|---:|---:|
| density | PLA unfilled | 1 | 100% | 100% | -0.0217 |
| density | PLA filled | 15 | 60% | 80% | -0.00611 |
| density | other | 90 | 82.2% | 96.7% | -0.00538 |
| density | semicrystalline filled | 15 | 86.7% | 100% | -0.000566 |
| tensileModulusXY | PLA unfilled | 1 | 100% | 100% | 0.0269 |
| tensileModulusXY | PLA filled | 11 | 90.9% | 100% | -0.0713 |
| tensileModulusXY | other | 51 | 82.4% | 94.1% | 0.01 |
| tensileModulusXY | semicrystalline filled | 11 | 63.6% | 100% | 0.208 |
| tensileStrengthXY | PLA unfilled | 1 | 100% | 100% | -0.0551 |
| tensileStrengthXY | PLA filled | 10 | 80% | 90% | -0.143 |
| tensileStrengthXY | other | 39 | 76.9% | 94.9% | 0.0491 |
| tensileStrengthXY | semicrystalline filled | 10 | 90% | 100% | 0.0476 |
| elongationXY | PLA unfilled | 1 | 100% | 100% | -0.149 |
| elongationXY | PLA filled | 10 | 100% | 100% | 0.111 |
| elongationXY | other | 53 | 77.4% | 94.3% | -0.122 |
| elongationXY | semicrystalline filled | 10 | 80% | 100% | -0.174 |
| hdt045 | PLA unfilled | 1 | 100% | 100% | 2.57 |
| hdt045 | PLA filled | 10 | 100% | 100% | 0.758 |
| hdt045 | other | 46 | 73.9% | 95.7% | 2.16 |
| hdt045 | semicrystalline filled | 8 | 87.5% | 87.5% | -6.4 |

| Headline | Missing | From its one product | From its products | Family model only | Not applicable | None | May screen |
|---|---:|---:|---:|---:|---:|---:|---:|
| density | 5 | 1 | 2 | 2 | 0 | 0 | 5 |
| tensileModulusXY | 45 | 11 | 21 | 3 | 4 | 6 | 35 |
| tensileStrengthXY | 36 | 11 | 13 | 2 | 4 | 6 | 26 |
| elongationXY | 45 | 12 | 20 | 3 | 4 | 6 | 34 |
| hdt045 | 62 | 15 | 16 | 8 | 20 | 3 | 39 |

Which estimates may screen, end by end (DECISIONS D59). Each end of an evidence class's screening range is set where a new true value lies beyond it at most 10% of the time with 90% confidence, from where the honestly predicted true values of the class fell; never inside the plausible range. A class with too few cases cannot set an end and screens only where the family model agrees.

| Headline | Class | Held | Top: beyond plausible | Top taken at | Bottom: beyond plausible | Bottom taken at |
|---|---|---:|---:|---:|---:|---:|
| density | this-grade | 7 | 0 | cannot screen | 0 | cannot screen |
| density | this-material | 94 | 0 | 97.5% point | 4 | 2.5% point |
| density | family | 121 | 8 | 97.85% point | 3 | 2.5% point |
| tensileModulusXY | this-grade | 69 | 2 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | this-material | 61 | 1 | 97.5% point | 0 | 2.5% point |
| tensileModulusXY | family | 74 | 1 | 97.5% point | 2 | 2.5% point |
| tensileStrengthXY | this-grade | 52 | 2 | 97.5% point | 1 | 2.5% point |
| tensileStrengthXY | this-material | 53 | 0 | 97.5% point | 0 | 2.5% point |
| tensileStrengthXY | family | 60 | 0 | 97.5% point | 2 | 2.5% point |
| elongationXY | this-grade | 36 | 0 | 97.5% point | 2 | 0.97% point |
| elongationXY | this-material | 60 | 2 | 97.5% point | 1 | 2.5% point |
| elongationXY | family | 74 | 2 | 97.5% point | 1 | 2.5% point |
| hdt045 | this-grade | 48 | 2 | 98.7% point | 1 | 2.5% point |
| hdt045 | this-material | 55 | 4 | 99.99% point | 2 | 2.5% point |
| hdt045 | family | 65 | 7 | 98.54% point | 2 | 2.5% point |

Floors (D126): the shown ranges of the same hidden headlines, floored by what the material's other measurements prove (a yield or break stress under the ultimate strength, a strain at yield under the strain at break, HDT at 1.8 MPa under HDT at 0.45 MPa); build/src/estimate/floors.js says what each row floors by. "containment" is a material's rule and "formulation" a grade's, each with the specimens its headline names (D161: elongation, printed bars only); "…Unstated" is the same with an undescribed bar too (D126), "…Converted" with an undescribed bar read as moulded.

| Headline | Floors | Hidden | Ranges moved | Likely holds | Plausible holds | Median likely width | Hidden values under the plausible range |
|---|---|---:|---:|---:|---:|---:|---:|
| tensileModulusXY | none | 74 | 0 | 81.1% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | printed | 74 | 0 | 81.1% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | printedXY | 74 | 0 | 81.1% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | unstated | 74 | 0 | 81.1% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | containment | 74 | 0 | 81.1% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | sameSource | 74 | 0 | 81.1% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | lowestOfProducts | 74 | 0 | 81.1% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | formulation | 74 | 0 | 81.1% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | containmentUnstated | 74 | 0 | 81.1% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | formulationUnstated | 74 | 0 | 81.1% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | formulationCeilings | 74 | 6 | 79.7% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | formulationBoth | 74 | 6 | 79.7% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | containmentConverted | 74 | 0 | 81.1% | 95.9% | ×1.53 | 1 |
| tensileModulusXY | formulationConverted | 74 | 0 | 81.1% | 95.9% | ×1.53 | 1 |
| tensileStrengthXY | none | 60 | 0 | 80% | 95% | ×1.44 | 1 |
| tensileStrengthXY | printed | 60 | 44 | 56.7% | 73.3% | ×1.43 | 14 |
| tensileStrengthXY | printedXY | 60 | 11 | 70% | 88.3% | ×1.43 | 5 |
| tensileStrengthXY | unstated | 60 | 56 | 20% | 23.3% | ×1.16 | 46 |
| tensileStrengthXY | containment | 60 | 4 | 76.7% | 91.7% | ×1.44 | 3 |
| tensileStrengthXY | sameSource | 60 | 45 | 56.7% | 73.3% | ×1.42 | 15 |
| tensileStrengthXY | lowestOfProducts | 60 | 56 | 70% | 81.7% | ×1.43 | 10 |
| tensileStrengthXY | formulation | 60 | 29 | 73.3% | 90% | ×1.43 | 4 |
| tensileStrengthXY | containmentUnstated | 60 | 11 | 83.3% | 91.7% | ×1.74 | 5 |
| tensileStrengthXY | formulationUnstated | 60 | 37 | 73.3% | 88.3% | ×1.43 | 7 |
| tensileStrengthXY | formulationCeilings | 60 | 6 | 78.3% | 93.3% | ×1.44 | 1 |
| tensileStrengthXY | formulationBoth | 60 | 34 | 71.7% | 88.3% | ×1.43 | 4 |
| tensileStrengthXY | containmentConverted | 60 | 11 | 80% | 95% | ×1.48 | 3 |
| tensileStrengthXY | formulationConverted | 60 | 37 | 73.3% | 93.3% | ×1.43 | 4 |
| elongationXY | none | 74 | 0 | 81.1% | 95.9% | ×5.93 | 2 |
| elongationXY | printed | 74 | 46 | 58.1% | 70.3% | ×4.07 | 21 |
| elongationXY | printedXY | 74 | 19 | 77% | 87.8% | ×4.49 | 8 |
| elongationXY | unstated | 74 | 61 | 31.1% | 40.5% | ×2.54 | 44 |
| elongationXY | containment | 74 | 3 | 81.1% | 94.6% | ×5.84 | 3 |
| elongationXY | sameSource | 74 | 49 | 55.4% | 66.2% | ×3.71 | 24 |
| elongationXY | lowestOfProducts | 74 | 61 | 66.2% | 82.4% | ×4.26 | 13 |
| elongationXY | formulation | 74 | 25 | 74.3% | 90.5% | ×5.16 | 6 |
| elongationXY | containmentUnstated | 74 | 10 | 81.1% | 90.5% | ×8.24 | 6 |
| elongationXY | formulationUnstated | 74 | 36 | 68.9% | 85.1% | ×4.41 | 10 |
| elongationXY | containmentConverted | 74 | 10 | 81.1% | 91.9% | ×7.69 | 5 |
| elongationXY | formulationConverted | 74 | 36 | 74.3% | 86.5% | ×4.41 | 9 |
| hdt045 | none | 65 | 0 | 76.9% | 90.8% | 11.6 °C | 2 |
| hdt045 | printed | 65 | 38 | 64.6% | 75.4% | 10.4 °C | 12 |
| hdt045 | printedXY | 65 | 5 | 72.3% | 84.6% | 11.5 °C | 6 |
| hdt045 | unstated | 65 | 47 | 55.4% | 66.2% | 10.4 °C | 18 |
| hdt045 | containment | 65 | 2 | 80% | 90.8% | 12.2 °C | 2 |
| hdt045 | sameSource | 65 | 37 | 64.6% | 75.4% | 10.6 °C | 12 |
| hdt045 | lowestOfProducts | 65 | 37 | 72.3% | 86.2% | 11.5 °C | 5 |
| hdt045 | formulation | 65 | 18 | 78.5% | 90.8% | 11.6 °C | 2 |
| hdt045 | containmentUnstated | 65 | 4 | 80% | 90.8% | 13.1 °C | 2 |
| hdt045 | formulationUnstated | 65 | 19 | 78.5% | 90.8% | 11.6 °C | 2 |

Unstated directions (D159): the kinds whose offset is learned across products as well as from the products that publish both. Target: each product with only an unstated-direction value, beside measured siblings, its centre against their median (a ratio) and how many centres sit above every sibling. Guard: each product that publishes both, as different numbers, its headline hidden and predicted.

| Headline | Kinds | Target products | Centre ÷ siblings' median | Above every sibling | Guard cases | Guard signed error | Guard plausible holds |
|---|---|---:|---:|---:|---:|---:|---:|
| tensileModulusXY | flexural unk -0.144 (48 materials); tensile unk -0.152 (53 materials) | 256 | ×0.978 | 32 | 27 | 0.0699 | 92.6% |
| tensileStrengthXY | ultimate unk -0.128 (43 materials); break unk -0.153 (40 materials); yield unk -0.161 (38 materials) | 207 | ×1.01 | 32 | 6 | 0.0122 | 83.3% |
| elongationXY | break unk -0.143 (53 materials) | 249 | ×1.08 | 42 | 24 | 0.0998 | 91.7% |

Grade estimates (D81): each grade predicted at its own row and calibrated by hiding its own published values.

| Headline | Hidden values | Likely scale | Plausible scale | Likely coverage | Plausible coverage | Shipped |
|---|---:|---:|---:|---:|---:|---|
| density | 836 | 1.43 | 2.05 | 0.795 | 0.95 | yes |
| tensileModulusXY | 300 | 1.1 | 1.32 | 0.8 | 0.95 | yes |
| tensileStrengthXY | 307 | 1.29 | 1.27 | 0.788 | 0.941 | yes |
| elongationXY | 337 | 1.07 | 1.13 | 0.798 | 0.95 | yes |
| hdt045 | 415 | 1.22 | 1.55 | 0.81 | 0.959 | yes |

By matrix as printed (D162): the hidden grade values of each matrix, the coverage the shared scales give them, the scales they alone would need, and the spread between two products of one material measured in that matrix (the one used where the headline sets it per matrix).

| Headline | Matrix | Hidden values | Likely coverage | Plausible coverage | Scales it would need | Product spread measured (pairs) | Used |
|---|---|---:|---:|---:|---:|---:|---:|
| density | amorphous | 619 | 0.796 | 0.948 | 1.42 / 2.1 | 0.0255 (16623) | 0.0255 |
| density | elastomer | 93 | 0.957 | 0.989 | 0.659 / 0.925 | – | – |
| density | semi-filled | 73 | 0.671 | 0.959 | 1.85 / 2.02 | 0.0506 (248) | 0.0255 |
| density | semi-unfilled | 51 | 0.667 | 0.882 | 1.89 / 2.78 | 0.0407 (137) | 0.0255 |
| tensileModulusXY | amorphous | 238 | 0.803 | 0.95 | 1.05 / 1.36 | 0.271 (2128) | 0.27 |
| tensileModulusXY | elastomer | 20 | 0.95 | 1 | 0.888 / 0.721 | – | – |
| tensileModulusXY | semi-filled | 30 | 0.667 | 0.9 | 1.55 / 1.4 | 0.149 (26) | 0.27 |
| tensileModulusXY | semi-unfilled | 12 | 0.833 | 1 | 1.07 / 1.15 | 0.224 (1) | 0.27 |
| tensileStrengthXY | amorphous | 240 | 0.808 | 0.958 | 1.2 / 1.21 | 0.223 (3696) | 0.224 |
| tensileStrengthXY | elastomer | 31 | 0.613 | 0.839 | 1.62 / 1.84 | – | – |
| tensileStrengthXY | semi-filled | 27 | 0.815 | 0.926 | 1.17 / 1.29 | 0.374 (40) | 0.224 |
| tensileStrengthXY | semi-unfilled | 9 | 0.778 | 0.889 | 1.44 / 1.13 | 0.226 (4) | 0.224 |
| elongationXY | amorphous | 261 | 0.805 | 0.946 | 1.05 / 1.13 | 0.708 (2946) | 0.708 |
| elongationXY | elastomer | 31 | 0.839 | 0.968 | 0.973 / 1.04 | – | – |
| elongationXY | semi-filled | 34 | 0.824 | 0.971 | 1.01 / 0.937 | 0.635 (32) | 0.708 |
| elongationXY | semi-unfilled | 11 | 0.455 | 0.909 | 1.48 / 1.2 | 1.15 (4) | 0.708 |
| hdt045 | amorphous | 336 | 0.81 | 0.955 | 1.13 / 1.52 | 3.14 (5149) | 4 |
| hdt045 | semi-filled | 52 | 0.808 | 0.962 | 1.24 / 1.72 | 31.4 (106) | 31.4 |
| hdt045 | semi-unfilled | 27 | 0.815 | 1 | 1.38 / 1.2 | 17.5 (32) | 17.5 |

Grade plausible coverage by fold of materials: density 0.903, 0.988, 1, 0.929, 0.978; tensileModulusXY 0.958, 0.915, 0.974, 0.945, 0.961; tensileStrengthXY 0.943, 0.938, 0.974, 0.863, 1; elongationXY 0.955, 0.971, 0.938, 0.947, 0.925; hdt045 0.979, 0.979, 0.915, 0.945, 0.934. Median grade plausible width: density 1.24, tensileModulusXY 1.92, tensileStrengthXY 1.73, elongationXY 10, hdt045 21.5.

A product's own values as its anchor (D167): hidden grades that publish the property another way too; how often their own bands (as the conversions state them) and anchors (widened by the band scale) hold the hidden value; where the model's centre lay outside the anchor (its estimate withheld), how often the band and the model held it; and the anchored ranges' coverage before and after.

| Headline | Cases | Sheets disagree | Band / anchor coverage | Band scale (low / high side) | Withheld (band right / model right) | Anchored | Likely before → after | Plausible before → after | Used | Shipped: anchored, withheld, disagree |
|---|---:|---:|---|---:|---|---:|---|---|---|---|
| density | 18 | 0 | 0.722 / 0.833 | 1.3 / 1.3 | 0 (0 / 0) | 18 | 0.667 → 0.667 | 1 → 0.833 | no | 0, 0, 0 |
| tensileModulusXY | 157 | 1 | 0.853 / 0.968 | 1 / 2.97 | 5 (0 / 4) | 151 | 0.848 → 0.848 | 0.974 → 0.974 | yes | 317, 1, 7 |
| tensileStrengthXY | 197 | 2 | 0.872 / 0.969 | 1 / 1.67 | 9 (6 / 6) | 186 | 0.823 → 0.817 | 0.946 → 0.941 | yes | 460, 4, 3 |
| elongationXY | 177 | 0 | 0.898 / 0.96 | 1.38 / 1.42 | 2 (0 / 2) | 175 | 0.783 → 0.771 | 0.949 → 0.926 | yes | 381, 0, 1 |
| hdt045 | 186 | 0 | 0.898 / 0.973 | 1 / 1.48 | 5 (2 / 4) | 181 | 0.823 → 0.823 | 0.961 → 0.956 | yes | 216, 14, 1 |

Conversions that learn from several makers only and keep their documented offset (D167): hdt045 HDT 0.45 annealed -52 (4 pairs of 2 makers); hdt045 HDT 0.45 annealed glassy -5 (4 pairs of 2 makers).

EST-GRADE-OUTLIER, 22 grades: PLA 8, PLA Wood 3, PLA Aero 3, ABS 2, PLA Marble 1, PP 1, POM / Acetal 1, TPU 85A class and softer 1, PETG 1, ABS-CF 1.

Evidence that contradicts everything else and was down-weighted (EST-CONFLICT, 200 observations):

By material: PLA 23, TPU 95A class 13, PLA Aero 12, PETG 8, PPA-CF 8, PLA Wood 7, ABS 7, PC 6, PAHT-CF 5, PA6-CF 5, PA6/66-CF 5, PLA Metal 4, PA12-CF 4, PPA-GF 4, CPE-CF 4, PPS-CF 4, TPU harder than 95A 4, nGen FLEX 4, CPE 4, PLA-CF 3, PP-CF 3, ASA Aero 3, nGen / Amphora 3, ABS-CF 3, TPC / TPEE 2, PA6 2, PA6-GF 2, PA12-GF 2, PA66 2, PLA-EC 2, PAHT-CE 2, PETG-CF 2, PET-CF 2, PPS-GF 2, PET-LW 2, OBC 2, TPC-ESD 2, PBAT 2, TPU-GF 2, TPU 85A class and softer 2, TPU 90A class 2, ASA 2, COC 2, PLA Marble 1, PLA Sparkle 1, PVA 1, PP 1, POM / Acetal 1, PLA-NF 1, ASA-CF 1, PC-GF 1, ASA-GF 1, HIPS 1, PVDF 1, BVOH 1, ABS-GF 1, PC FR 1, PC-ABS 1, PC-PBT 1.

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
- PA6/66-CF, tensileModulusXY: tensile XY 2.16 (V014713)
- PA6/66-CF, tensileModulusXY: tensile unk 0.95, 0.61 (V014714, V014715)
- PA6/66-CF, tensileModulusXY: tensile Z 0.48 (V014716)
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
- PA6/66-CF, tensileStrengthXY: ultimate XY 55.9 (V014709)
- PA6/66-CF, tensileStrengthXY: flexural unk 38.4, 23.1 (V014722, V014723)
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
- PC, hdt045: HDT 0.45 101, 101 (V004707, V008720)
- PC, hdt045: HDT 1.8 amorphous 141 (V005612)
- PC, hdt045: HDT 0.45 144 (V007724)
- PC, hdt045: HDT 1.8 amorphous 93 (V013670)
- PC, hdt045: HDT 1.8 amorphous 121 (V015185)
- PC, hdt045: HDT 0.45 144 (V015187)
- PC FR, hdt045: Tg amorphous 145 (V000700)
- PAHT-CF, hdt045: HDT 0.45 145 (V002464)
- PA6, hdt045: HDT unstated 186 (V007868)
- PA6-CF, hdt045: HDT 1.8 semi-filled 65 (V002731)
- PA6-GF, hdt045: HDT 1.8 semi-filled 65 (V002720)
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
- PAHT-CF, hdt045: 145 °C, expected about 187
- PET-CF, hdt045: 100 °C, expected about 78.1
- PPS-ESD, hdt045: 93 °C, expected about 194

## Consistency

Every one of the 175 materials was checked, and any failure below stops the build:

- each measurement, profile, price and use record sits under the material its grade belongs to;
- GradeIDs lists every procurement grade;
- every product value cites a measurement of that product that is not quarantined (7324 checked), and a material's typical product is one of its own;
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
- `PARSE-UNREAD` **Print setup row 1470** — Enclosure text not parsed: "Wir empfehlen die Verarbeitung von PVC-P ausschliesslich auf geschlossenen 3D-Druckern mit integriertem Aktivkohlefilter."
- `PARSE-UNREAD` **Print setup row 1994** — Enclosure text not parsed: "Type of printer: Enclosed"
- `PARSE-UNREAD` **Print setup row 1995** — Chamber text not parsed: "Unser Material braucht keinen temperierten Bauraum für den Druckvorgang."
- `PARSE-UNREAD` **Print setup row 1996** — Chamber text not parsed: "without the heating chamber"
- `PARSE-UNREAD` **Print setup row 2001** — Enclosure text not parsed: "This material can be printed without an enclosed printer but we strongly recommend using an enclosure or enclosed 3D printer."
- `PARSE-UNREAD` **Print setup row 2002** — Enclosure text not parsed: "One of the best options is to place the printer inside an enclosure."
- `CONVERSION-PAIRS` **conversions CV01** — CV01 (floor on hdt045): 1 of 183 same-sheet pair(s) break it: G165-04 V014653 58 against V014656 62
- `LEDGER-CONTRADICTS-VALUE` **grades** — 6 comparable value(s) outside their own deciding bounds by more than the test scatter, so doubtful: G008-06 tensileModulusXY 1.2154 (V004808) against CV08 V004814; G001-44 tensileModulusXY 1.1323 (V004950) against CV08 V004956; G001-46 tensileModulusXY 1.3455 (V005061) against CV08 V005067; G018-09 tensileModulusXY 1.7327 (V005075) against CV08 V005081; …
- `CLASS-LIMIT-CONTRADICTED` **grades** — 7 comparable value(s) beyond their kind's limit by more than the test scatter: G087-03 density 1140 (V002322) against CL02; G035-12 density 1150 (V004709) against CL02; G087-04 density 1340 (V005605) against CL02; G094-06 density 1070 (V006114) against CL02; …
- `PARSE-UNREAD` **profiles** — 2 process temperature cells were not parsed: P1994 chamber: "Unser Material braucht keinen temperierten Bauraum für den Druckvorgang." | P1995 chamber: "without the heating chamber"
- `NO-MEASUREMENTS` **materials** — 2 materials have no property measurements at all: PA66-CF, PA612-GF
- `EST-REJECTED` **measurements** — 6 values are physically impossible for their property and were kept out of the estimate model: V009245 PLA Density 3130 kg/m³; V009254 PLA Density 3900 kg/m³; V009486 PLA Density 4000 kg/m³; V009522 PLA Metal Density 2780 kg/m³; V009638 PLA Metal Density 3400 kg/m³; V009775 PLA Metal Density 3500 kg/m³
- `EST-OUTLIER` **materials** — 7 measured headlines sit far outside what every other observation predicts; check the source and the grade: ASA Aero density 460 (expected about 1040); PLA-EC density 1240 (expected about 1520); PAHT-CE density 1250 (expected about 1440); PBAT tensileModulusXY 0.006 (expected about 1.01); PAHT-CF hdt045 145 (expected about 187); PET-CF hdt045 100 (expected about 78.1); PPS-ESD hdt045 93 (expected about 194)
- `EST-FAMILY-ORDER` **materials** — 4 reinforced materials sit below their unfilled sibling: ABS-AF tensileModulusXY 1.89 < ABS 2.2; ASA-AF tensileModulusXY 1.74 (estimate) < ASA 2.1; TPU-CF tensileModulusXY 0.128 (estimate) < TPU harder than 95A 0.3964487; PA6/66-CF tensileModulusXY 2.16 < PA6/66 2.3415
