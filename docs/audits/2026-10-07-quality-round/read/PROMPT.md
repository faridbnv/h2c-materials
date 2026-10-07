# Reader prompt (quality round 2026-10-07, reading wave)

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

You check records of a 3D-printing filament database against their source pages. Work in
/Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}` and scratch files under
`/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/7fc06032-9b42-4bfa-828a-7789f0c2da5c/scratchpad/q7/{ID}/`.
No git changes, no npm scripts, never touch data/ or code. Use Python's csv module to write CSV.

Input: `{IN}`, one row per task, grouped by document. Columns: Task, Item, Kind, Tier, Table, Record, PairRecord, Field,
GradeID, Product, SourceID, SHA256, File, Page, Locator, Held, Question, Leverage. `Held` is what the database holds; the
`Question` says what to decide. Do not trust the database either way: read the page.

Open each document once and do all its rows together:
- text layer: `.cache/text/<SHA256>.json` (pages[].lines[].text);
- page image: render `.cache/sources/by-sha/<SHA256>.pdf` page N with
  `pdftoppm -r 120 -f N -l N -png <pdf> <scratch>/<sha8>-pN` and Read the png. An HTML document has no image: read its
  cached text, whose lines keep the page's table rows;
- the full record: data/tables/measurements.csv (MeasurementID), profiles.csv (ProfileID), sources.csv (SourceID); the
  product in grades.csv.

**Judge numbers from the page image**: the text layer can misprint digits (one sheet's text prints "55 - 69" where the
image shows 35-65). A task names a second document in `PairRecord` or in its Question when it compares two: open both.

Decide each row by its Kind:
- **value-check** (one measurement or profile cell): is `Held` exactly what the page prints for THIS product (the grade's
  product, or the one product the document covers), this property, unit, direction column (X-Y / Z / XZ / ZX), specimen,
  notch, test load, moisture and treatment column, in the row the Locator names?
  `keep`; `fix` with every column to change (one line per column: a misread digit, the neighbouring row's or column's
  value, a wrong direction, a dry/conditioned or as-printed/annealed column mixed up, a unit); `flag` when the page itself
  prints what cannot be (say why); `quarantine` when it is another product's value or unreadable.
  For Item 4 also give `class`: real, wrong-value, wrong-unit, wrong-property, wrong-condition, implausible or variant.
- **copy-pair** (Item 1): `Record` is a product's value whose specimen the database holds as not stated; `PairRecord`
  is a record of the same product (or of a product that prints the same table) filed as a moulded bar ("Raw material
  value"). Open both pages. decision: `same` (both pages print the same number, point or range alike, for this property,
  and nothing on the copy's page says the bar was printed), `differs` (the numbers or their form differ: say how),
  `states-specimen` (the copy's page says how its bar was made: quote it), or `not-covered` (the moulded statement does
  not cover the stay record's table or document: say why). Quote the moulded statement in `quote`.
- **source-pair** (Item 5): decision `revision` (one product's sheet, two editions), `same-content` (the same document
  registered twice, e.g. a retailer's copy), `twin` (one table printed under two product names by one maker),
  `reprint` (another maker prints the same table), or `distinct` (different values). Quote each document's product name.
- **identity**: which product the document names. Quote every product name it prints.
- **readings**: copy every row the Question names exactly as printed; one output line per row with decision `add`,
  `column` = the row's label, `value` = value, uncertainty and unit exactly as printed.

Write `{OUT}` with columns: Task, Item, Kind, Table, Record, decision, column, expect, value, quote, reason, cause, class,
confidence, reader. For `fix`, one line per changed column with `expect` = the current cell. `quote` = 1–4 short pieces
copied EXACTLY from the text layer (not the image) joined with " | " that prove the decision; each must be a verbatim
substring of one text-layer line, because the migration checks it against the cached text. Leave it empty only if the
text layer is garbled there and say so in reason ("read on the page image"). `cause` (for fix, flag, quarantine): digit,
row, column, label, negation, scope, unit, or other (say what). `confidence`: high, medium or low. `reader`: `{ID}`.
Every Task gets at least one line. Be strict and independent.

When done, reply in at most 80 words with counts per decision and the causes you saw.
