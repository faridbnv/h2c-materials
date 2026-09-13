# Coverage consolidation audit

**Date:** 2026-09-13  
**Question:** Does every filament point to its own data, and does the Coverage sheet agree with the records actually held for that material?  
**Scope:** all 102 material rows, their grades, headline citations, print profiles, use and durability evidence, prices, and 1,146 coverage rows  
**Outcome:** four systemic consistency gaps found; all were corrected and converted into build-stopping validation rules

## Summary

The workbook was referentially intact before this pass: its identifiers existed and its headline
numbers reconciled. That did not prove that each record belonged to the right filament or that the
Coverage sheet described the evidence honestly. A valid `GradeID` could belong to a different
material, family notes could be cited as though they were exact-grade exposure evidence, and a
coverage row could say `Gap` beside data already present.

The consolidation found four related problems:

1. Ninety-eight chemical-table rows from 19 exact Bambu grades had not been transcribed.
2. Sixty Materials cells in `Environmental evidence` did not equal the material's own exposure,
   solubility and moisture records.
3. Thirty-four Coverage records contradicted, overstated or incompletely described the underlying
   data; correcting them required 15 status edits and 34 finding edits.
4. The validator checked identifier existence but did not fully check ownership relationships,
   representative-grade headlines, procurement-grade lists, guidance/profile agreement, or coverage
   assertions.

The corrected workbook contains 478 use-and-durability records. The build now checks all 102
materials and 369 measured headline citations for these relationships, and it stops on any future
contradiction.

## Finding 1 — source-backed Bambu chemical rows were missing

**Severity: high.** Nineteen Bambu technical data sheets contain an “Other Physical and Chemical
Properties” table. Ninety-eight rows were absent from the workbook even though the exact grade and
source were already registered.

The recovered rows comprise:

| Topic | Rows |
|---|---:|
| Solubility | 18 |
| Resistance to acid | 19 |
| Resistance to alkali | 19 |
| Resistance to organic solvent | 19 |
| Resistance to oil and grease | 19 |
| Flammability | 4 |
| **Total** | **98** |

The affected materials are PLA Tough+, PLA Translucent, PLA Silk+, PLA Silk Dual Color, PLA Sparkle,
PLA Galaxy, PLA Aero, PETG HF, ABS-GF, PC FR, TPU for AMS, TPU 90A, TPU 85A, PA6-GF, PET-CF,
PPS-CF, PVA, Support for PLA/PETG, and Support for PA/PET.

These are exact-grade manufacturer statements, but most do not state concentration, duration or
temperature. They support the database's coarse evidence verdicts and must carry the caution “not a
chemical design limit.” The values also cannot be replaced with a family default: ABS-GF and PPS-CF
publish different resistance results from the standard Bambu wording, and PVA is water-soluble.

## Finding 2 — Environmental evidence mixed exact records with family context

**Severity: high.** The `Environmental evidence` column had drifted into a copy of family-level
application notes for 31 materials. It could therefore make an exact grade appear tested when the
records belonged to another material. Conversely, some rows omitted evidence their own grades did
publish.

The correct rule is narrow: this column cites exactly the material's own acid, alkali, solvent,
oil/grease, solubility, moisture, UV and hydrolysis records. Family context remains permitted in
`Use evidence`, `Durability evidence` and `Safety evidence`, where it is presented as narrative
context rather than a grade-level result.

All 102 materials were recomputed under that rule. Sixty cells changed:

| Change | Materials cells |
|---|---:|
| Removed evidence where the material had none | 17 |
| Added evidence to a previously empty/not-applicable cell | 5 |
| Replaced an incomplete or wrong list with the exact own-record list | 38 |
| **Total** | **60** |

## Finding 3 — Coverage sometimes contradicted the database

**Severity: high for research planning; no direct candidate-selection effect.** Coverage is terminal
and does not feed selection, but researchers use it to decide what to investigate next. Several
rows therefore pointed work in the wrong direction.

The 34 corrected Coverage records break down as follows:

| Domain | Records corrected |
|---|---:|
| Moisture / environmental | 26 |
| Print setup | 4 |
| Mechanical | 2 |
| Thermal | 2 |

Examples:

- PC-GF's print-setup coverage said `Gap` although BASF profiles publish bed, nozzle and drying data.
- A TPU thermal row said `Gap` although two HDT values exist on a non-representative grade. The
  corrected row says evidence exists while explaining why it is not the headline.
- PA12's mechanical row now says `Limited comparability`: its 12 fatigue records belong to a study
  grade, not a procurement grade, and do not supply tensile, flexural or impact data.
- IPCON PPA and PPA-GF rows now say the source was reviewed and publishes nozzle and bed but no
  chamber temperature.
- Seven environmental rows that relied only on family context were changed from `Evidence recorded`
  to `Gap`.

The status transitions were:

| Before | After | Records |
|---|---|---:|
| Evidence recorded | Evidence recorded, finding corrected | 19 |
| Evidence recorded | Gap | 7 |
| Gap | Evidence recorded | 2 |
| Gap | Limited comparability | 2 |
| Gap | Partially resolved | 2 |
| Gap | Reviewed with limitations | 2 |

## Finding 4 — existence checks did not prove correct ownership

**Severity: systemic.** The old referential checks could prove that `M036`, `G036-01` and a
measurement ID existed. They could not prove that all three belonged together. The same weakness
applied to a material's `GradeIDs`, representative grade, cited profiles and evidence.

The validator needed the following additional invariants:

- a measurement, profile, price or use record's material must own its grade;
- every procurement grade belonging to a material must appear in `GradeIDs`;
- a supplemental `-R#` study grade is not a procurement grade;
- a representative grade must belong to its material;
- every measured headline must cite its material and its representative grade;
- cited measurement/profile/evidence records must exist and have permitted ownership;
- nozzle, bed and chamber guidance must quote the cited profile;
- Environmental evidence must equal the material's own environmental records;
- Coverage cannot claim a gap beside own data or evidence without own data;
- a Grades coverage row must quote the actual distinct-manufacturer count.

Seven mutation tests now break these relationships one at a time and require the validator to emit
the corresponding error. A clean snapshot must pass the same checks.

## Audit method

The audit was made deterministic:

1. `build/src/coverage-rules.js` defines what counts as a material's own data in each coverage
   domain.
2. `plan.mjs` compiles the exact workbook edit plan from `dist/db.json` and those shared rules.
3. `plan.json` records 98 evidence additions, 60 Materials edits and 34 Coverage-record edits.
4. `apply-workbook-changes.py` refuses any workbook whose SHA-256 differs from the plan's input hash.
5. `scripts/workbook_xml.py` preserves cell styles, appends table rows and records each touched cell.
6. `changelog.csv` contains the resulting 207 cell/row changes.
7. The normal build and mutation tests verify the output independently of the edit script.

Input workbook SHA-256: `31a1e17d394ad3552a035e80994decae2d4301d6b19a4ce2c7c9f8b0352dbe52`  
Consolidated workbook SHA-256: `9267c9a3b6197ab9a374f6e2b052b810bf3f352e5e5dd23faf502af58078363f`

## Residual limits

The consolidation repairs ownership and reporting; it does not manufacture missing evidence.
Current warnings remain meaningful:

- five materials have no property measurements at all: PA66, PA66-CF, PA612, PA612-GF and POM;
- 25 of 69 HDT headlines do not state the test load;
- nine impact measurements use J/m and cannot be compared with kJ/m² without specimen geometry;
- 105 family estimates remain inference and cannot confirm a requirement;
- most recovered chemical statements omit exposure concentration, duration and temperature.

## Verdict

**Complete.** Every compiled record now passes ownership-aware consistency checks, Environmental
evidence is exact-material evidence, Coverage agrees with the material's own records, and the
missing Bambu chemical tables are restored with their limitations. The result is guarded by the
build rather than depending on this one-time audit remaining remembered.
