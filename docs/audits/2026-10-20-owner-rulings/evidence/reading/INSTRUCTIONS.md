# Reading task: does anything on the document say these test values are the printed filament's?

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../../README.md) and [OPEN-PROBLEMS](../../../../../docs/OPEN-PROBLEMS.md).

You classify groups of values from filament makers' documents (data sheets, product pages). Each group is one page of one
document and lists values (tensile, flexural, impact, heat deflection) whose test bar the database records as "not
described": the row does not say whether the bar was 3D printed or injection moulded, and most give no build direction.

The owner ruled (2026-10-20): such a value counts as the filament's (a printed part's) value **if there is even an implicit
indication on the document that it is correct for the filament as printed**; otherwise it is set apart for good. Your job
is to find, for each group, whether such an indication exists, or a counter-indication, and to quote it exactly.

## Verdicts

- **STATED**: the document says in words that the test bars or specimens for these values were 3D printed: "printed
  specimens", "test specimens were printed on a <printer>", "3D printed test bars", "FDM printed samples", "specimens
  printed with the following settings: ...", "printed, non-injection molded". (The import missed it.)
- **IMPLIED**: it does not say so in so many words, but something ties these values to printing:
  - `labels`: the same table (or the same list of properties) labels other rows or columns with a print direction (XY,
    XZ, ZX, Z, X-Y, flat, upright, on edge, horizontal/vertical meaning how the bar was printed), so its unlabelled rows
    are printed bars too. The rows listed under "OTHER ROWS OF THIS PAGE ALREADY TYPED" show where the database already
    read such labels. A label in another, separate table of the page does not count for this one.
  - `heading`: a heading or caption of the table names the printed part ("Properties of 3D printed parts",
    "Mechanical properties (printed)", "Printed part properties").
  - `settings`: print settings are given for the test specimens (layer height, nozzle, infill, raster angle, print speed,
    build orientation said to be how the specimens or test samples were made).
  - `other-document`: the maker says so for these values on another page of the same document (the "LINES FROM OTHER
    PAGES" may show it).
- **COUNTER**: something ties these values to moulding or to the base resin, in the same table or explicitly for them:
  "injection moulded", "ISO 294" or "ISO 3167" moulding, mould (mold) shrinkage in the same table, melt flow rate or
  melt volume rate in the same table, "typical resin values", "supplier test data", "standard reference materials",
  "compression moulded", the name of a resin grade the values are from. A counter-indication wins over an indication
  when both speak for the same values. Say which word it is.
- **NONE**: nothing either way.

## What does not count

- Marketing sentences about printed parts ("printed parts are strong and durable", "ideal for 3D printed tools"): not
  about the test bars.
- A recommended print settings section for using the product (nozzle 200-220 °C, bed 60 °C, print speed): not an
  indication unless the document says those settings were used for the test specimens.
- The document being a filament data sheet, on its own.
- A test standard named alone ("ISO 527", "ASTM D638"): a standard says how a bar is pulled, not how it was made.
- "ISO 3167 type A specimen" alone names a bar shape, not how it was made: NONE unless moulding is also said.
- "Horizontal" / "vertical" in a sense that is not a print direction.

## Output

Write one CSV file (UTF-8, comma-separated, every field in double quotes, a header row) to the path you are given, with
these columns:

`group,verdict,kind,quote,scope,table,ids,notes`

- `group`: the group ID (G0123).
- `verdict`: STATED, IMPLIED, COUNTER or NONE.
- `kind`: for STATED/IMPLIED one of `words`, `labels`, `heading`, `settings`, `other-document`; for COUNTER one of
  `injection`, `iso294`, `iso3167`, `mould-shrinkage`, `melt-flow`, `resin-values`, `supplier-data`,
  `reference-materials`, `compression`, `resin-grade`; empty for NONE.
- `quote`: for STATED, IMPLIED and COUNTER, the exact words from the PAGE TEXT (or from a line of another page, then say
  which page in `notes`), copied character for character as they appear in the extracted lines, at most about 200
  characters, enough to find it. If the words you need sit on two lines, give both pieces joined by ` | ` (space, pipe,
  space). For `labels`, quote the label(s) as printed with a few words around them (for example the column heading
  `XY | XZ | ZX` or `Tensile yield strength 68 MPa; Horizontal`). Do not paraphrase, do not fix spelling. Empty for NONE.
- `scope`: which values the verdict speaks for: `page` (all listed values of the group), or one of `tensile`,
  `flexural`, `impact`, `thermal` (heat deflection) when only one kind of value is covered.
- `table`: where the page has more than one table and the verdict speaks for one: a few words of that table's heading as
  printed (they should also appear in the values' locators); otherwise `Not applicable`.
- `ids`: the measurement IDs this row speaks for, separated by `; ` (always fill it, even when it is all of the group's).
- `notes`: one short sentence: why (for NONE, what you looked for and did not find; if the text is garbled, unreadable or
  cut off, say so).

If different values of one group get different verdicts (the tensile table is labelled XY, the heat deflection sits in a
separate thermal table with nothing), write one row per verdict, each with its IDs. Every listed value of every group must
appear in exactly one row.

Be strict and literal: when in doubt between IMPLIED and NONE, choose NONE and say what was ambiguous. A false IMPLIED lets
a moulded bar's number decide for a printed part, which is the error this ruling guards against; a false NONE only sets a
value aside.

Work through the whole batch file (read it in chunks with offset/limit; it is long), then write the CSV. Report back how
many groups you classified and the count per verdict.
