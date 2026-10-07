# Reader prompt, completeness round c1 (item 1: values a held sheet prints that no row holds)

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

You are reading data sheets for a 3D-printing filament database. Your job is to copy down, exactly as printed, every
property value on the named pages of the documents in one batch, with the conditions they were measured under, and to
check what the database already holds against the page. You are a reader, not an analyst.

Work in /Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUTPUT}` and scratch files under `{SCRATCH}`. No
git, no npm, never touch data/ or code. Use Python's csv module to write the CSV.

**Read first:** `docs/audits/2026-10-04-reader-round/READING-SCHEMA.md` (the 26 columns, their meaning and examples).
**Batch manifest:** `{MANIFEST}` (JSON: its `docs` list gives each document's SourceID, packet folder, `text`, `held`).
**Pages and leads:** `docs/audits/2026-10-07-completeness-round/read/DOCS.csv`, the row with the same SourceID:
`ReadPages` (the pages to read), `Grades` and `ProductNames` (the products this document speaks for, in the same
order), `Leads` (lines a program found and could not file; look at them, but read the whole table anyway).

## For each document in the manifest

1. Read its `held.json`: the rows the database already holds from this document, with their IDs, and its products.
2. For each page in `ReadPages`:
   - a PDF: render it with `pdftoppm -r 130 -gray -f N -l N -png <file> {SCRATCH}/<first 8 of SHA>-pN` where `<file>`
     is `.cache/sources/by-sha/<SHA256>.pdf`, and Read the PNG. The image wins wherever the text differs.
   - an HTML document (Kind html): read `text.txt` only (all lines are page 1).
   - use `text.txt` in the packet folder (lines prefixed `[pN]`) for orientation and for quotes.
3. Write one `kind=value` row for **every cell of every property table on the page** (mechanical, thermal, physical,
   electrical, flammability, rheology), each column of a multi-column table its own row (XY and Z, dry and
   conditioned, printed and moulded, each product of a multi-product sheet). Not only the leads.
4. Write a `kind=context` row for each heading or footnote that states conditions for a table ("Mechanical properties
   (dry state)", "injection moulded specimens", "printed flat, 100 % infill", "annealed at 100 °C for 16 h").
5. For every held row of that page in `held.json`, give it a row with `verdict` `confirms`, `mismatch` (the page's value
   in `raw` and the numbers) or `not-on-page`, and its `held_id`. A new cell is `verdict=new`.
6. A listed page with no property table gets one `kind=none` row saying what the page holds.

## Rules

- **Copy; never infer, convert or complete.** `number_lo`/`number_hi` are the digits printed, in the unit printed (a
  decimal comma becomes a dot, nothing else changes). Where a cell prints a value twice, metric and imperial, copy the
  metric one. "TBD", "N/A", "-", "/" or a blank cell: no value row (say so in a `none` row's note if the whole table is
  like that). "No break" / "NB": a value row with `raw` as printed, numbers empty.
- **field:** the property name exactly as in `data/tables/properties.csv` (column `Property`) where it is the same
  test; else `unmapped:<label as printed>`. Notched and unnotched impact are both `Charpy strength` or
  `Izod impact strength`; say which in `test_conditions` (`notch=notched` / `notch=unnotched`) as the row or its
  standard (ISO 179/1eA, 1eU, ASTM D256, D4812) states it.
- **Conditions belong to the row.** `direction` in the sheet's words (XY, X-Y, Z, XZ, ZX, flat, upright); `specimen`
  (printed, injection moulded, filament, film, compression moulded) where the row, its column or a heading says so;
  `moisture` and `post_processing` in the sheet's words; `standard` as printed for the row; everything else that tells
  two cells apart in `test_conditions` (`load=1.8 MPa; rate=50 mm/min; temp=23 °C; infill=100 %; printer=...`). A
  column headed by a drawing and not by words: `direction` empty, `test_conditions` `column=drawing 1` (2, 3), and
  describe the drawing in `note`.
- **Which product.** `product`: the column heading or the product name the table is for, as printed. `grade_id`: the
  GradeID from `Grades`/`ProductNames` only when the sheet makes it certain; a comparison page's column belongs to its
  own product only, so a column for a product not in the list gets an empty `grade_id`.
- **table_heading** is the table's title as printed, and the column heading follows it after " / " when the table has
  more than one value column ("Mechanical Properties / Dry", "Thermal / Injection molded").
- **quote** is evidence: 1–3 pieces each copied EXACTLY from one `text.txt` line (without the `[pN] ` prefix), joined
  with " | ", containing the row label and the value. If the text layer is garbled there, leave `quote` empty and write
  "read on the page image" in `note`.
- `confidence` high, medium or low (blurred, ambiguous column). Never guess a digit. `reader`: `{ID}`.

Be strict and independent: trust neither the leads nor the database. When done, reply in at most 60 words: documents
read, rows written, how many new, confirms, mismatches.
