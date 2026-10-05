# Blind-draw verifier prompt (gap round 2, phase 7)

> **Historical record** (2026-10-05): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

You check, blind, records a 3D-printing filament database holds against their source documents. Work in
/Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}` and scratch files under
`/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/8ceac304-b627-4cec-9ff1-5537e29bbfb5/scratchpad/{ID}/`.
No git changes, no npm scripts, never touch data/. Use Python's csv module to write CSV.

Input: `{IN}`, one row per drawn record, grouped by source (columns Draw, Table, Record, Change, Fact, SourceID, SHA256,
Locator, GradeID). `Fact` says what the record holds now (and, for a change, what it held before). For each record:

1. Read its full row: data/tables/measurements.csv (MeasurementID), profiles.csv (ProfileID) or page_context.csv
   (PageContextID); the product in grades.csv (GradeID → Manufacturer, Product name) and the source in sources.csv.
2. Open the document once per source: text layer `.cache/text/<SHA256>.json` (pages[].lines[].text); page images
   `.cache/readings/r1/<SourceID>/p-N.png` if present, else render `.cache/sources/by-sha/<SHA256>.pdf` page N with
   `pdftoppm -r 130 -f N -l N -png`. An HTML source: read its cached text (and `.cache/sources/by-sha/<SHA256>.html`).
   Judge from the page image where there is one; a text layer can print wrong digits or run columns together.
3. Check EVERY claim the row makes, not only the changed cell: the product it is filed under, property, value, unit,
   operator/bounds, direction (XY, XZ, ZX, Z; an upright tensile bar pulled across its layers is Z, D92), specimen type
   (printed, moulded, film, strand), notch, the test standard and load, moisture and post-processing (annealing and its
   schedule), the test bars' print parameters, and the Locator. Search EVERY page of the document for conditions it
   states elsewhere: an orientation drawing or legend, a specimen-printing block, a footnote, a schedule on another page.
   - A profile is the product's printing guidance: nozzle, bed and chamber temperature, enclosure, drying, plate, nozzle
     diameter, abrasion. A value the sheet gives only for how its TEST SPECIMENS were printed is wrong in a profile.
     Drying "not needed" / "optional" must read so.
   - A page statement (page_context) says something a page states once for a table or scope: is the statement on the
     page cited, does it speak for the scope (`Applies to`: all, tensile, flexural, impact, thermal, physical) and, where
     `Table` is set, only that table, and are its typed states (specimen, moisture, post-processing, anneal, standard,
     test temperature) what the words mean? Does `Page` name the page whose values it speaks for?
4. Verdict: `correct` (every claim matches the page), `wrong` (name the cell, what it holds, and what the page shows),
   or `unverifiable` (the document cannot be read; say why). A record that matches the page but whose page is itself
   ambiguous is `correct` with the ambiguity in Reason. Be strict and independent: do not assume the database is right.

Write `{OUT}` with columns: Draw, Table, Record, Verdict, Cell (empty when correct), Held, PageShows,
WhatThePagePrints (a short quote or description of the image, with page), Reason. When done, reply in at most 80 words:
counts per verdict and each wrong record in one line.
