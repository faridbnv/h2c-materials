# Reader prompt (check round 3, phase 3)

> **Historical record** (2026-10-05): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

You check records of a 3D-printing filament database against their source pages. Work in
/Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}` and scratch files under
`/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/8ceac304-b627-4cec-9ff1-5537e29bbfb5/scratchpad/{ID}/`.
No git changes, no npm scripts, never touch data/ or code. Use Python's csv module to write CSV.

Input: `{IN}`, one row per record, grouped by source (columns Item, Tier, Kind, Table, Record, Field, GradeID, Product,
SourceID, SHA256, Page, Locator, Held, Check, Leverage). `Held` is what the database holds; `Check` is what an automatic
comparison of the text layer found (it could not confirm most of these, or they are a control sample: do not trust it
either way); `Leverage` says which answer of the tool the record can change.

Open each document once and do all its rows together: text layer `.cache/text/<SHA256>.json` (pages[].lines[].text);
page image: render `.cache/sources/by-sha/<SHA256>.pdf` page N with `pdftoppm -r 120 -f N -l N -png <pdf> <scratch>/<sha8>-pN`
and Read the png (an HTML document has no image: read its cached text, whose lines keep the page's table rows). Look up
the full record in data/tables/measurements.csv (MeasurementID), profiles.csv (ProfileID) or print_guide.csv
(PrintGuideID), and the product in grades.csv. **Judge from the page image**: the text layer can print digits wrongly
(one sheet's text layer prints "55 - 69" where the image shows 35-65).

For each row decide:
- **value** (a measurement): is `Held` exactly what the page prints for THIS product (the grade's product, or the one
  product the document covers), this property, unit, direction (X-Y / Z / XZ / ZX column), specimen, notch, test
  load, moisture and treatment column, in the row the Locator names? `keep`; `fix` with every column to change (a
  misread digit, a value from the neighbouring row or column, a wrong direction, a dry/conditioned or as-printed/annealed
  column mixed up); `flag` when the page itself prints what cannot be (reason); `quarantine` when it is another
  product's value or unreadable.
- **gate** (a profile's print cell: Nozzle °C, Bed °C, Chamber °C, Drying, Enclosure, Abrasion / clogging, Nozzle
  material): is the cell the product's own printing guidance as the page prints it, from the right row and column (not a
  test specimen's print setting, not a storage or dry-box line, not another product's row of a multi-product table, not
  a neighbouring column)? `keep`; `fix` the raw cell to the page's words for it (or `Not published` when the page states
  none for this product).
- **guide** (a printer maker's guide cell): is the cell what the guide prints in that type's column? `keep` or `fix`.

Write `{OUT}` with columns: Item, Table, Record, decision (keep|fix|flag|quarantine), column, expect (the current cell),
value (the new cell), quote, reason, cause. `quote` = 1–4 short pieces copied EXACTLY from the text layer (not the image)
joined with " | " that prove the decision; a quote must be a verbatim substring of one text-layer line, because the
migration checks it against the cached text; leave it empty only if the text layer is garbled there and say so in reason
("read on the page image"). For `fix`, one line per changed column. `cause` (for fix/flag/quarantine): one of
`digit` (a digit or decimal misread), `row` (the neighbouring row's value), `column` (another column: direction, state,
product), `label` (a label read as another field), `negation` (a negation or condition missed), `scope` (a statement
or value applied beyond what it covers), `unit`, `other` (say what). Be strict and independent: do not assume the
database or the automatic check is right or wrong without reading the page. When done, reply in at most 80 words with
counts per decision and the causes you saw.
