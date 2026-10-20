# Second reading: does anything on the document indicate these test values are the printed filament's?

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../../../README.md) and [OPEN-PROBLEMS](../../../../../../docs/OPEN-PROBLEMS.md).

You classify groups of values from filament makers' documents (data sheets, product pages). Each group is one page of one
document and lists values (tensile, flexural, impact, heat deflection) whose test bar the database records as "not
described": the row does not say whether the bar was 3D printed or injection moulded, and gives no build direction.

The owner ruled (2026-10-20): such a value counts as the filament's (a printed part's) value **if there is EVEN an implicit
indication that it is correct for the filament**; otherwise it is set apart for good. A first reading of these pages leaned
the other way (it told its readers to choose "nothing" when in doubt, and to let any moulding or melt word win). This
reading follows the owner's word: look for the indication first and report it; a counter-indication sets a value apart only
when it is about those same values.

## What keeps a value (verdict KEEP)

Any of these, quoted exactly:

- `labels`: in the same table or list of properties, another row or column names a print direction or orientation (XY,
  XZ, ZX, Z, X-Y, Z-X, flat, upright, on edge, horizontal/vertical meaning how the bar was printed, "Layer Adhesion" or
  "interlayer" rows, a column headed by a print direction). Unlabelled rows of that table are printed bars too. The rows
  under "OTHER ROWS OF THIS PAGE ALREADY TYPED" show where the database already read such labels; check they are in the
  same table as the values.
- `heading`: a heading or caption of the table names the printed part ("Properties of 3D printed parts", "Printed").
- `settings`: print settings are given for the test specimens ("HOW TO MAKE SPECIMENS", "Specimen printing conditions",
  "Test sample printing conditions", layer height or infill or raster said to be how the test bars were made).
- `words`: the document says in words that the test specimens were printed ("printed specimens", "3D printed test bars",
  "printed, non-injection molded", "All data are based on printed test samples").
- `document`: a statement elsewhere on the same document about how its test specimens or test data were made, which it
  does not scope to other tests (quote it and give its page). A statement the document scopes to named tests or a section
  ("the mechanical properties were tested on printed specimens", a footnote under one table) does not reach values it
  leaves out.
- `sentence`: a sentence that ties this property to the printed part. Fillamentum's "great temperature resistance after 3D
  printing, there is no need for annealing!" counts for its heat deflection; "printed parts have high stiffness" counts for
  a stiffness value. A general sentence about printing that names no property of the values does not.

## What sets a value apart

- **COUNTER**, only when it is about the same values or the same table:
  - `injection`: "injection moulded" (molded) said of those bars or that table.
  - `iso294` / `iso3167`: ISO 294 (or ISO 3167) moulding of those bars or that table's specimens. ISO 3167 alone names a
    bar shape, not how it was made: not a counter.
  - `mould-shrinkage`: a mould (mold) shrinkage row **with a value** in the same table ("Mold Shrinkage ISO 294-4 0.5 %").
    A blank row ("Mold Shrinkage ISO294 … /", "-", nothing printed) is not a counter.
  - `resin-values`, `supplier-data`, `reference-materials`, `compression`: "typical resin values", "supplier test data",
    "literature value", standard reference materials, compression moulded, for those values or that table.
  - `resin-grade`: the values are a named resin grade's (the base polymer's data, a resin maker's grade name heading them).
  - `typical-table`: the document sets this table apart in its own words beside a table it says is of printed specimens
    ("Typical material properties" beside "Mechanical properties of 3D printed testing specimens").
- **NONE**: genuinely nothing indicates printing, and no counter-indication either.

## What does not count, either way

- **A melt flow rate or melt volume rate, anywhere on the document: never a counter.** It is measured on the melt, and
  makers that say their bars were printed print it too. Report it nowhere; read on for the indication.
- A blank mould shrinkage row; a counter-indication in another, separate table of the page.
- A test standard named alone (ISO 527, ASTM D638); "ISO 3167 type A specimen" alone.
- The document being a filament data sheet, on its own; recommended print settings for using the product (nozzle, bed,
  speed) that the document does not say were used for the test specimens.
- Marketing about printed parts that names no property ("strong and durable prints").

## Order

Most specific first: a value's own row label (its own "(X-Y)") speaks for that value whatever its table holds. Then its
table: a counter-indication about the table wins over an indication from the table or the document. Then the document.

**When in doubt with any indication present, KEEP and set `doubt` to yes**, saying in `notes` what is uncertain. When a
counter-indication about the same table and an indication both speak, write COUNTER and set `doubt` to yes if the
indication is strong. When genuinely nothing indicates, NONE.

## Output

Write one CSV file (UTF-8, comma-separated, every field in double quotes, a header row) to the path you are given, with
these columns:

`group,verdict,kind,quote,quotePage,scope,table,ids,doubt,notes`

- `group`: the group ID (G0123 or U0012).
- `verdict`: KEEP, COUNTER or NONE.
- `kind`: for KEEP one of `labels`, `heading`, `settings`, `words`, `document`, `sentence`; for COUNTER one of
  `injection`, `iso294`, `iso3167`, `mould-shrinkage`, `resin-values`, `supplier-data`, `reference-materials`,
  `compression`, `resin-grade`, `typical-table`; empty for NONE.
- `quote`: for KEEP and COUNTER, the exact words from the PAGE TEXT or from a line of another page, copied character for
  character as extracted, at most about 200 characters. Words on two lines: both pieces joined by ` | ` (space, pipe,
  space). For `labels`, quote the label with a few words around it (`Tensile strength (X-Y) 48 MPa`). Never paraphrase.
  Empty for NONE.
- `quotePage`: the page number the quote is on.
- `scope`: `page` (all listed values of the group), or `tensile`, `flexural`, `impact`, `thermal` when only one kind is
  covered.
- `table`: where the page has more than one table and the verdict speaks for one, a few words of its heading as printed;
  otherwise `Not applicable`.
- `ids`: the measurement IDs this row speaks for, separated by `; ` (always fill it).
- `doubt`: `yes` or `no`.
- `notes`: one short sentence: why (for NONE, what you looked for; if the text is garbled or cut, say so).

If different values of one group get different verdicts, write one row per verdict, each with its IDs. Every listed value
of every group must appear in exactly one row.

Work through the whole batch file (read it in chunks with offset/limit; it is long), then write the CSV. Report back how
many groups you classified, the count per verdict, and how many rows you marked doubtful.
