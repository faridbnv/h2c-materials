# Reader prompt (check round 3: the documents fetched again)

> **Historical record** (2026-10-05): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

You check records of a 3D-printing filament database against their source documents. Work in
/Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}` and scratch files under
`/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/8ceac304-b627-4cec-9ff1-5537e29bbfb5/scratchpad/{ID}/`.
No git changes, no npm scripts, never touch data/ or code. Use Python's csv module to write CSV.

These records rest on documents whose original bytes were lost and that were fetched again on 2026-10-05. Input:
`{IN}` (columns Item, Kind, Table, Record, Field, GradeID, Product, SourceID, Copy, File, TextSHA256, Locator, Held).
`Copy` says whether the file is the registered document itself (restored: the same bytes) or a LATER copy of the page
(the maker may have changed it since the record was made). `File` is the document (under the repository's `.cache/`);
its text is `.cache/text/<TextSHA256>.json` (pages[].lines[].text). A PDF can be rendered with
`pdftoppm -r 110 -f N -l N -png <file> <scratch>/<name>` and read as an image; an HTML page has only its text.

For each record, read its full row (data/tables/measurements.csv by MeasurementID, profiles.csv by ProfileID) and decide:
- `confirmed`: the document prints exactly what the row holds for this product (value, unit, direction, conditions; for
  a profile, the product's own printing guidance in that cell).
- `fix`: the document prints something else for it, and on a restored document that is the record's error (give the
  column and the value the page prints).
- `changed-since`: on a LATER copy only, the page now prints something else; the record may have been right for the page
  as it was. Give what it prints now.
- `absent`: the document no longer prints it at all (a later copy), or never did (restored).

Write `{OUT}` with columns: Item, Table, Record, decision, column, expect (current cell), value (what the page prints),
quote (1–3 short pieces copied exactly from the text, joined by " | "), reason. Open each document once and do all its
rows together. Be strict. Reply in at most 80 words with counts per decision.
