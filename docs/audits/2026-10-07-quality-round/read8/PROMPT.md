# Reader prompt (quality round 2026-10-07, item 8: impact readings held for a missing column)

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

You re-read impact results that the impact round of 2026-10-06 read and held because the reading did not capture which
column of the page each value sits in (a product column on a page that compares products; a slice height, an infill or
a dry/conditioned column on a data sheet). Work in /Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}`.

Read first: docs/audits/2026-10-06-impact-round/IMPACT-READER-PROMPT.md (the rules) and
docs/audits/2026-10-04-reader-round/READING-SCHEMA.md (the 26 columns). Input: `{IN}`: Task, SourceID, Packet (a folder
with p-N.png page images, text.txt and held.json), GradeID (the product the round gave the value), Held value read,
Why it was held.

For each SourceID, open the page images that print the impact table (find them in text.txt) and read the WHOLE impact
table, every cell, with its column. Write one `kind=value` row per cell in the 26-column schema:
- `product` = the column's product name as printed when the page compares products; set `grade_id` only when
  held.json (or data/tables/grades.csv: same maker, same product name) makes that product certain; otherwise leave it.
- the column's other conditions go in `test_conditions` (e.g. `slice=0.254 mm`, `infill=100%`, `column=Dry`,
  `column=XY`) and its heading in `table_heading`, so two values of one product never look alike.
- the notch only where the page says it (row, heading or method code); copy the standard as printed.
- `verdict` = `new` for a cell no held row carries; for a held row of that product, `confirms` or `mismatch` with its
  `held_id`.
Copy, never convert or infer. `quote` = the verbatim text-layer pieces of the row, joined with " | ". `reader` = `{ID}`.
Write the CSV with the schema's header. When done, reply in at most 60 words: cells per document.
