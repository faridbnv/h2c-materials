# Verifier prompt (gap round 2, phase 3c)

You verify candidate errors in a 3D-printing filament database against the source documents. Work in
/Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}` and scratch files under
`/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/8ceac304-b627-4cec-9ff1-5537e29bbfb5/scratchpad/{ID}/`.
No git changes, no npm scripts, never touch data/. Use Python's csv module to write CSV.

Input: `{IN}` — one row per candidate, grouped by source (columns family, table, record, SourceID, SHA256, page, grade,
field, held, hint). Open each document once: text layer `.cache/text/<SHA256>.json` (pages[].lines[].text), page images
`.cache/readings/r1/<SourceID>/p-N.png` if present, else render `.cache/sources/by-sha/<SHA256>.pdf` page N with
`pdftoppm -r 120 -f N -l N -png` (HTML: read the cached text). Look up the record in data/tables/measurements.csv
(MeasurementID) or data/tables/profiles.csv (ProfileID) for its full row, and the product in data/tables/grades.csv
(GradeID → Manufacturer, Product name). Judge from the page image; the text layer can be garbled.

Decide each candidate by family:
- **test-bar** (a profile cell): is the value the product's own printing guidance, or the setting the TEST SPECIMENS
  were printed at (under a "sample/specimen printing conditions" block)? `keep` if guidance; `fix` to `Not published` if
  it is the specimens' (and give the guidance value instead if the page prints one in a recommended row).
- **same-cond** (rows of one product, source and property with the same recorded conditions and different values):
  for each row say which column/table/orientation/notch/state/print setting it is; `keep` if the recorded conditions are
  right and the Locator or Specimen / print parameters tells the rows apart; else `fix` the column (Direction: XY, XZ,
  ZX, Z, Unstated — an upright tensile bar pulled across its layers is Z; Notch: Notched / Unnotched; Locator: keep its
  text and add the table or column name in parentheses).
- **duplicate**: the same observation recorded twice (a table repeated on another page or in another language) →
  `retire-duplicate` with `twin` = the MeasurementID that stays; two different tests (other standard, other table) →
  `keep` and say what distinguishes them.
- **point-range**: what the page prints; `fix` to its range (column Raw upper bound) or `keep`.
- **far** (a value far from its material's others that backs a product's headline): is it exactly what the page prints
  for THIS product, property, unit, direction and specimen? `keep`; `fix` (column, value) for a misread; `flag` when the
  page itself prints what cannot be (reason); `quarantine` when it is another product's column or unreadable.
- **layout-only** (a setting or value only a reading-order reading finds): does the page print it for a product the
  database holds? `add` with table, GradeID, column, value; else `keep` (nothing to add) with the reason.

Write `{OUT}` with columns: family, table, record, decision (keep|fix|flag|retire-duplicate|quarantine|add), column,
expect (the current cell), value (the new cell), twin, grade, quote, reason. `quote` = 1–4 short pieces copied EXACTLY
from the text layer (not the image) joined with " | " that prove the decision; leave it empty only if the text layer is
garbled and say so in reason. One line per changed column. Be strict and independent: do not assume the database is
right or wrong without reading the page. When done, reply in at most 80 words with counts per decision and the main
error classes.
