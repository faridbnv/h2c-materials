# Audits

Every review of the tool or its database lives here, one folder each, named
`<date>-<subject>`. A folder holds the report exactly as it was delivered (`REPORT.md`) and what was
done about it (`RESPONSE.md`), plus any evidence files the reviewer supplied, in lower-case
kebab-case names.

Where an audit changed the workbook, its folder holds a changelog of what moved. From the missing-data
research on it also holds the script that made the edit, which refuses to run on any workbook but the
one it was written against.

A report is a record of what someone found on its date, not a description of the tool today. Read
the response beside it for what changed.

| Date | Audit | Reviewer's question | Outcome |
|---|---|---|---|
| 2026-09-11 | [First-time user](2026-09-11-first-time-user/REPORT.md) | Where does the tool fail a 3D printer owner who has never seen it? | 34 of 35 fixed; brand search set aside. Outcomes are recorded inline in the report |
| 2026-09-12 | [Product owner](2026-09-12-product-owner/REPORT.md) | Can a first-time user rely on the final screen without drawing a stronger conclusion than the evidence supports? | [38 fixed, 11 partly, 3 declined](2026-09-12-product-owner/RESPONSE.md); AMS, price-link and brand findings set aside |
| 2026-09-13 | [Manufacturer evidence](2026-09-13-manufacturer-evidence/REPORT.md) | Does the database match current manufacturer evidence for eleven brands? | [Implemented in the selector](2026-09-13-manufacturer-evidence/RESPONSE.md); two workbook citation defects corrected |
| 2026-09-13 | [Missing data research](2026-09-13-missing-data-research/REPORT.md) | What can be recovered for missing chamber temperatures and property headlines, and what may only be estimated? | [Implemented after re-reading every source](2026-09-13-missing-data-research/RESPONSE.md): four grades, CoPE separated from CPE, 14 chamber rows recovered, chamber bands kept as inference; four report claims contradicted by their sources |
| 2026-09-13 | [Coverage consolidation](2026-09-13-coverage-consolidation/REPORT.md) | Does every filament point to its own records, and does Coverage agree with those records? | [Completed](2026-09-13-coverage-consolidation/RESPONSE.md): 98 Bambu evidence rows recovered, 60 evidence lists and 34 coverage records corrected; ownership and coverage consistency now stop the build |
| 2026-09-13 | [Systematic data](2026-09-13-systematic-data/REPORT.md) | Are raw values, mappings, family relationships and HTML data consistent? | [11 findings corrected](2026-09-13-systematic-data/RESPONSE.md); 27 logged edits to 25 workbook cells, 112 tests, 1,806 numeric reconciliations, full filament/family matrix and HTML payload parity |
| 2026-09-13 | [Systematic data review](2026-09-13-systematic-data-review/REPORT.md) | Were the systematic data audit's changes valid and correct? | [All data corrections confirmed](2026-09-13-systematic-data-review/RESPONSE.md); five follow-ups fixed, and the estimate model replaced by like-for-like prediction intervals that may screen but never pass (D42) |
| 2026-09-13 | [Data architecture assessment](2026-09-13-data-architecture-assessment/REPORT.md) | Is the spreadsheet source of truth still fit to govern the database, and what should replace it? | Read-only assessment; recommends a SQLite source with the workbook as a generated view. No change made |
| 2026-09-13 | [Estimate evidence](2026-09-13-estimate-evidence/REPORT.md) | Estimates were too wide, sometimes wrong and sometimes absent. Fill the gaps with research and a model that holds across a family | Implemented: 8 sources, 7 grades, 83 measurements, 28 corrected records; one calibrated model per headline (D43); no in-scope headline left blank |
| 2026-09-13 | [Duplicate products](2026-09-13-duplicate-products/REPORT.md) | Are the generic nylon rows unique, or do they repeat other rows' products? Does any other family? | Six data sheets were filed under two or three materials and four products sat in the wrong row. Fixed: one home per product; PA, PA-CF, PA-GF, TPE and CoPA became family entries (D44) |
