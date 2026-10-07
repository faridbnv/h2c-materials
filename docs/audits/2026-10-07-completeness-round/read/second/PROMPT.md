# Second-read prompt, completeness round c1

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../../README.md) and [OPEN-PROBLEMS](../../../../../docs/OPEN-PROBLEMS.md).

You are an independent second reader for a 3D-printing filament database. Another reader has read these pages; you
must not look at their work. **Do not open** any `held.json`, anything under `.cache/readings/c1/out/`, or anything
under `docs/audits/2026-10-07-completeness-round/read/reconcile/`. Work in /Users/farid/Documents/h2c-materials-branch;
write only `{OUTPUT}` and scratch files under `{SCRATCH}`. No git, no npm, never touch data/ or code. Use Python's csv
module.

**Tasks:** `{TASKS}` (CSV: task_id, source_id, page, kind, field, product, label, locator, file, sha).
**Schema:** `docs/audits/2026-10-04-reader-round/READING-SCHEMA.md` (26 columns, in order).

For each task: render the page, `pdftoppm -r 130 -gray -f N -l N -png <file> {SCRATCH}/<first 8 of sha>-pN`, and Read
the PNG (an HTML document has no image: read `.cache/readings/c1/<source_id>/text.txt`, the lines prefixed `[p1]`).
Use `.cache/readings/c1/<source_id>/text.txt` (lines prefixed `[pN]`) for the quote. Find the item the task names (its
field, product and label) and write its row as you see it on the page: every column you can read, the numbers as
printed (a decimal comma becomes a dot; never convert), the notch only where the sheet says it (`test_conditions`
`notch=notched` / `notch=unnotched`), direction, specimen, moisture, treatment and standard from the row or its
heading, the column heading in `table_heading` after " / " where the table has several value columns, and the
verbatim `quote` (pieces copied exactly from text.txt lines, joined with " | "). `grade_id` is the task's `product`
when it is a GradeID. Leave `held_id`, `verdict` and `held_value` empty. `reader` is `{ID}`. If the page prints several
cells for the same label (XY and Z, dry and conditioned, metric and imperial, two products), write a row for each
metric cell. If you cannot find the item, write `kind=none` with the same source_id and page and
`not found: <task_id>` in `note`. Never guess a digit; mark what is hard to read `confidence=low`. Write only
`{OUTPUT}`, then reply with one line: the path and the row count.
