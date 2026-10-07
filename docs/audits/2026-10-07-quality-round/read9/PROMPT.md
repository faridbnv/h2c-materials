# Reader prompt (quality round 2026-10-07: mechanical tables a sheet prints and the tables hold only in part)

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

You read mechanical property tables from registered data sheets of 3D-printing filaments. Work in
/Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}` and scratch files under `{SCRATCH}`. No git, no npm,
never touch data/ or code. Use Python's csv module to write CSV.

Read first: docs/audits/2026-10-04-reader-round/READING-SCHEMA.md (the 26 columns and their meaning).
Input: docs/audits/2026-10-07-quality-round/read9/tasks.csv: Task, SourceID, SHA256, Pages, GradeID, Product. Each
document is about one product: set `grade_id` to the task's GradeID on every row.

For each task, for each page listed:
- render it: `pdftoppm -r 130 -f N -l N -png .cache/sources/by-sha/<SHA256>.pdf {SCRATCH}/<sha8>-pN` and Read the png;
- read the text layer: `.cache/text/<SHA256>.json` (pages[N-1].lines[].text);
- read EVERY cell of every mechanical table on the page (tensile, flexural, compressive, impact, and any other
  mechanical row): one `kind=value` row per cell. Judge digits from the image; the text layer can misprint.
- Metric only: where the page prints a value twice, metric and imperial (MPa and ksi/psi, J/m and ft·lb/in), copy the
  metric one (MPa, GPa, %, J/m, kJ/m²). Where a row prints only an imperial value, copy it as printed.
- `field`: the property as the page names it, mapped to one of: Tensile strength (endpoint unspecified), Tensile yield
  strength, Tensile break strength, Tensile modulus, Elongation at yield, Elongation at break, Flexural strength,
  Flexural modulus, Flexural elongation at break, Compression strength, Compression modulus, Izod impact strength,
  Charpy strength. If none fits, write the page's label and say so in `note`.
- `direction`: the column's orientation exactly as the column heading names it (XZ, ZX, XY, X-Y, X-Z, Z-X, Z). If a
  column is headed by a DRAWING and not by words, leave `direction` empty and put `column=drawing 1` (2, 3) in
  `test_conditions`, and describe the drawing in `note`.
- `test_conditions`: everything else that tells two cells of one product apart: printer, tip or hot end, layer height,
  colour, infill, notched/unnotched, yield/break, test speed (e.g. `printer=F900; tip=T14; layer_height=0.25 mm`).
- `table_heading`: the table's title as printed (e.g. "Table 4: ULTEM™ 1010 Resin Mechanical Properties - F900 - T14
  Tip"). `standard`: the test method as the page prints it for that row.
- `raw`: the value with its uncertainty exactly as printed (e.g. `81.4 (2.1)`), `number_lo` the value, `unit` the unit.
  A range "39-47" gives number_lo 39, number_hi 47.
- `held_id` and `verdict`: check data/tables/measurements.csv for rows of this SourceID (and grade) that hold the same
  cell; `confirms` with its MeasurementID where the held row has the same value, property, direction and conditions,
  `mismatch` with its MeasurementID where the held row is this cell but differs (say how in `note`), else `new`.
- `quote`: 1–3 pieces copied EXACTLY from one text-layer line each, joined with " | ", that contain the value and its
  row label (the migration checks each piece is a verbatim substring of a cached line). If the text layer is garbled
  there, leave quote empty and write "read on the page image" in `note`.
- `confidence`: high, medium or low. `reader`: `{ID}`.

Copy, never convert or infer. Be strict and independent: do not trust the database either way.
When done, reply in at most 60 words: cells per document, how many new, confirms, mismatches.
