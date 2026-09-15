# The workbook conversion, 2026-09-14

Until 2026-09-14 the database was an Excel workbook. These files converted it to `data/tables/*.csv` and proved the
conversion: the workbook reader, the dump, migrations m01 to m09, the transfer ledger that classed all 99,538 workbook
cells, and the replay that rebuilt the tables from the workbook and compared them (DECISIONS D45, D52).

**They no longer run.** The workbooks they read (`data/H2C_FDM_Material_Database.xlsx`,
`data/Generic_Materials_Reference.xlsx`) were deleted with the cutover in commit `03e09e4`, together with the test that
replayed them. What they did is in git history and in
[the migration record](../../docs/audits/2026-09-14-csv-source-migration/REPORT.md); they are kept here so the reasoning
and the exact steps can still be read, not as tooling.

Later corrections against re-read sources (m10 onwards) are ordinary migrations and stay in `scripts/migrate/`.
