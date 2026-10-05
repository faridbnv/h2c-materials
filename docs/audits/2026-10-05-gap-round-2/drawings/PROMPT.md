# Drawing and other-page reader (gap round 2, phase 3e)

> **Historical record** (2026-10-05): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

You check, for rows of a 3D-printing filament database, whether the source document states a condition the row is
missing. Work in /Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}` and scratch files under
`/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/8ceac304-b627-4cec-9ff1-5537e29bbfb5/scratchpad/{ID}/`.
No git changes, no npm scripts, never touch data/. Use Python's csv module; write progressively (append per source) and
on restart skip MeasurementIDs already in the output.

Input `{IN}`: one row per measurement (MeasurementID, GradeID, Product, SourceID, SHA256, Property, Raw value, Direction,
Notch, Specimen type, Post-processing, Locator, Ask, Headline), grouped by source. Open each document once: text layer
`.cache/text/<SHA256>.json` (pages[].lines[].text); images `.cache/readings/r1/<SourceID>/p-N.png` if present, else render
every page of `.cache/sources/by-sha/<SHA256>.pdf` with `pdftoppm -r 110 -png` (HTML: cached text only). Look at EVERY
page, including drawings, legends, footnotes, "test conditions" sections, and diagrams of how bars were printed.

Answer the row's Ask:
- **direction**: the build orientation of the bar the value was measured on, if the document states or draws it for this
  row (XY flat; XZ on edge; ZX/Z upright). A tensile bar shown or said to stand upright and be pulled across its layers is
  Z. Give `Unstated` if nothing in the document says it.
- **specimen**: whether the document says the bars were 3D printed (Printed specimen) or injection moulded (Raw material
  value), for this row's table.
- **notch**: Notched or Unnotched if the row's label, footnote or method code (ISO 179/1eA notched, 1eU unnotched;
  ISO 180/1A notched) states it.
- **layer strength**: for a tensile row labelled XZ or ZX, does the document show or say the bar stood upright and was
  pulled across its layers (then Z), or lay on its edge (XZ)?
- **schedule**: the annealing temperature and time the document states for this annealed row (on any page).
- **digits**: what number the page image shows for this row.

Write `{OUT}` with columns: MeasurementID, decision (fix|none), column (Direction, Specimen type, Notch, Post-processing,
Raw value), expect (current cell), value (new cell, in the sheet's words for Post-processing, e.g. "annealed at 80 °C for
12 h"), quote, reason. `quote` = 1–4 short pieces copied EXACTLY from the text layer (not the image) joined with " | ";
if only a drawing shows it, leave quote empty and describe the drawing in reason. `none` when the document does not state
it. Be strict: never infer from what is typical. When done, reply in at most 80 words: counts of fix by column, none.
