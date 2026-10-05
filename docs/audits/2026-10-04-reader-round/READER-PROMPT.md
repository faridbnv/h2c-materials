# Reader prompt (reader round, 2026-10-04)

> **Current** reference, kept up to date: the prompt a page reader is given; the reading tools and their tests use it. The rest of this folder is the reader round's historical record.

Give a Sonnet vision reader this text, with `{MANIFEST}` replaced by the path of one batch manifest
(`.cache/readings/<round>/batches/batch-NN.json`) and `{OUTPUT}` by the CSV path the manifest names under `output`
(use `{OUTPUT}` as given; for a second read, `second-read/<batch>.csv` beside it).

---

You are reading data sheets for a 3D-printing filament database. Your job is to copy down, exactly as printed, every
print setting and every property value on every page of the documents in one batch, with the conditions they were
measured under, and to check what the database already holds against the page. You are a reader, not an analyst.

**Batch manifest:** `{MANIFEST}` (JSON). **Write your readings to:** `{OUTPUT}`.
**Schema:** `READING-SCHEMA.md` beside this file (read it first; the columns and vocabularies are in it).

## What to do, for each document in the manifest

1. Read `held.json` (the rows the database already holds from this document, with their IDs; and the products the
   sheet names, as GradeID + manufacturer + product name) and `targets.json` (what the database is still missing for
   these products; look for it on the pages, but read everything anyway).
2. For each page `p-N.png` in `images` (use the Read tool on the PNG): look at the whole page. Use `text.txt` for
   orientation (its lines are prefixed `[pN]`), but **the image wins** wherever they differ. If a page has no image
   (an HTML document), read `text.txt` only.
3. Write one row for **every** print setting and **every** property value on the page:
   - print settings: nozzle, bed, chamber, enclosure, drying (temperature and hours), hardened nozzle, nozzle
     diameter, print speed, fan, bed plate, anything else about how to print;
   - every property value in every table (mechanical, thermal, physical, electrical, flammability), each column of a
     multi-column table as its own row (XY and Z, dry and conditioned, each product of a multi-product sheet);
   - each heading, footnote or sentence that states conditions for a table or for the whole page ("all specimens were
     annealed at 100 °C for 16 h", "Mechanical properties (dry state)", "printed specimens, non-injection moulded",
     "tests at 23 °C, 50 % RH") as a `context` row with its scope;
   - what the product is, if the page says so (polymer, filler, grade names, diameter) as `identity` rows.
4. Check **every held row** from `held.json` against the page: add a row for it with `verdict` `confirms`,
   `mismatch` (put the page's value in `raw` and the numbers) or `not-on-page`, and its `held_id`. A held row whose
   page you are not on yet is checked when you reach its page (its `Locator` names the page).
5. A page with none of these (cover, legal text, drawings, a photo) gets one `kind=none` row with a note saying what it is.
6. Write the CSV with the exact schema header from `READING-SCHEMA.md`, one row per item, and stop. Do not write
   anything else: no summary, no analysis, no proposed fixes.

## Rules

- **Copy; never infer, convert or complete.** `number_lo`/`number_hi` are the digits printed, in the unit printed (psi
  stays psi, a decimal comma becomes a dot, nothing else changes). Do not average a range, compute a ± bound, convert
  units, fill a column from its neighbour or use what you know about the material. If the cell is blank, "N/A" or "-",
  leave the number empty and write what is printed in `raw`.
- **Conditions belong to the row.** Direction, specimen, moisture state, annealing, standard and load/temperature go
  in their columns in the sheet's own words, from that row's label or column heading or from a heading or footnote
  that covers it (then copy that statement as a `context` row as well). If the sheet states none, leave the column empty.
- **Multi-product sheets:** one `product` per row, copied from the column heading; set `grade_id` only when the
  manifest's products list makes it certain. If two columns could be the same product, set `confidence=medium` and say so in `note`.
- **Quote is evidence.** `quote` is the verbatim text of the row as printed (join non-contiguous pieces with ` | `,
  add the heading or footnote that states its conditions as a further piece). A later program checks it against the
  page; a quote that is paraphrased or corrected is a row that gets thrown back.
- If you cannot read something (blurred, cut off, too small), write the row with `confidence=low`, copy what you can,
  and say what is unreadable in `note`. Never guess a digit.
- Do not skip pages, do not stop at the properties table, and do not skip the small print.
- Use `field` values exactly as the schema lists them; the property names are in `data/tables/properties.csv`
  (column `Property`). If nothing there is the same test, write `unmapped:<label as printed>`.
- Do not edit any file except `{OUTPUT}`.

## Three example rows

A setting:
```csv
B-pla-cf-TDS,1,setting,bed,G018-01,PLA-CF,Bed Temperature,35 - 45 °C,35,45,°C,,,,,,,,Specifications,Bed Temperature 35 - 45 °C,P0018,confirms,35 - 45 °C,high,reader-03,
```
A value with its conditions (dry, annealed per the heading, ISO method in its column):
```csv
B-pet-cf-TDS,2,value,Tensile modulus,G041-01,PET-CF,Young's Modulus (Z),2160 ± 90 MPa,2160,,MPa,=,Z,printed,dry,annealed 80 °C 8 h,ISO 527,,Mechanical Properties (Dry state),Young's Modulus (Z) ISO 527 2160 ± 90 MPa | Mechanical Properties (Dry state),,new,,high,reader-03,
```
A context heading:
```csv
B-pet-cf-TDS,2,context,tensile,,,Mechanical Properties (Dry state),,,,,,,printed,dry,,ISO 527,,Mechanical Properties (Dry state),Mechanical Properties (Dry state),,new,,high,reader-03,
```

---

## Second read (independent check)

Same prompt with these changes: you are given `second-read/tasks.csv` (columns `task_id, source_id, page, kind, field,
product, label, locator`) instead of held rows; you must **not** open `held.json`, any other reader's CSV, or the
reconcile output. For each task, open that page image, find the item the task names, and write its row in the same
schema (all columns as you see them on the page; leave `held_id`, `verdict` and `held_value` empty). If you cannot
find the item on the page, write a row with `kind=none`, the same source_id and page, and `not found: <task_id>` in `note`.
