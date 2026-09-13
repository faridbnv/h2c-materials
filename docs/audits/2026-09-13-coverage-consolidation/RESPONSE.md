# Response to the coverage consolidation audit

All findings were implemented.

## Workbook changes

The audited edit changed 207 cells/rows, all recorded in [changelog.csv](changelog.csv):

| Sheet | Change |
|---|---:|
| Use & durability | 98 exact-grade Bambu manufacturer rows added |
| Materials | 60 `Environmental evidence` cells corrected |
| Coverage | 15 status cells and 34 finding cells corrected across 34 records |

The apply script accepted only the planned input hash and produced workbook SHA-256
`9267c9a3b6197ab9a374f6e2b052b810bf3f352e5e5dd23faf502af58078363f`.

## Enforcement added

- `build/src/coverage-rules.js` is now the shared definition of own data by coverage domain.
- `build/src/validate.js` checks record/grade/material ownership, procurement and representative
  grades, headline ownership, cited evidence, guidance/profile agreement, exact Environmental
  evidence lists, coverage assertions and manufacturer counts.
- `scripts/workbook_xml.py` provides the shared, style-preserving XML edit path for future audited
  workbook changes.
- Seven mutation tests prove that each new validator branch fires on a deliberately corrupted copy.
- The validation report has a Consistency section describing the build-stopping guarantees.

## Verification

| Check | Result |
|---|---|
| Full build | Passed; validation reports no errors |
| Test suite | 103 passed, 0 failed |
| Materials checked | 102 |
| Headline citations checked | 369 |
| Use & durability records | 478 |
| Workbook output hash | `9267c9a3b6197ab9a374f6e2b052b810bf3f352e5e5dd23faf502af58078363f` |

The remaining warnings are evidence limitations, not consolidation failures. They remain visible in
`build/reports/validation-report.md`.

## Documentation updated

The root README, architecture, pipeline, data model, decisions, audit index, this report and this
response now describe the consolidated counts, editing path, ownership rules and coverage
invariants.
