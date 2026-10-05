# Test-bar statement reader (gap round 2, phase 7: the blind draw's measurement families)

> **Historical record** (2026-10-05): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../../README.md) and [OPEN-PROBLEMS](../../../../../docs/OPEN-PROBLEMS.md).

You read, on data sheets of 3D-printing filaments, the statement of how the TEST SPECIMENS were printed and conditioned,
and say which values it speaks for. Work in /Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}` and scratch
files under `/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/8ceac304-b627-4cec-9ff1-5537e29bbfb5/scratchpad/{ID}/`.
No git changes, no npm scripts, never touch data/. Use Python's csv module to write CSV.

Input: `{IN}`, one row per sheet: source, SHA256, families, sentence_page, values_pages (page(count of rows waiting)),
sentence (where a detector found it). Open each sheet: text `.cache/text/<SHA256>.json` (pages[].lines[].text), page
images `.cache/readings/r1/<source>/p-N.png` if present, else render `.cache/sources/by-sha/<SHA256>.pdf` with
`pdftoppm -r 130 -f N -l N -png`. The values are in data/tables/measurements.csv (SourceID = source; their Locator
names the page and row). Read the statement whole, as printed (it may run over several lines: "Infill: 100%", "layer
height 0.2 mm", the printer, the speed), and decide:

- **scopes**: which test families it speaks for, from: tensile, flexural, impact, thermal. tensile/flexural/impact
  when it speaks for the test specimens generally or names them; thermal ONLY where it names the heat-deflection (HDT)
  or other thermal specimens or plainly heads a table that holds them. Never physical (density, melt flow).
- **values_page**: the page whose values it speaks for (one output row per values page); **table**: where that page
  holds two tables of one scope (a dry and a conditioned, as-printed and annealed) and the statement heads one, the
  heading text of that table as the Locators write it; else empty.
- **print_parameters**: the statement's settings in the sheet's own words, joined with "; " (e.g. `Printing speed 45
  mm/s; Printing temperature 270 °C; Infill: 100%`, `0.25 mm (0.010 in.) layer height on the F900`). Leave out words
  that are not settings (a disclaimer, "typical values").
- **moisture_condition**: if the sheet states how the specimens were conditioned before testing ("All specimens were
  conditioned at room temperature for 24h prior to testing", "conditioned at 23 °C / 50 % RH for 48 h"), that sentence as
  printed, without a leading "*"; else empty.
- **specimen_type**: `Printed specimen` when the statement says the specimens were printed; if the sheet says its values
  come from injection-moulded specimens, write `Raw material value` and leave print_parameters empty.
- **quote**: 1–3 short pieces copied EXACTLY from the text layer joined with " | ", that prove the statement.

Write `{OUT}` with columns: source, page (the statement's page), scopes (";"-joined), specimen_type, print_parameters,
quote, maker, values_page, table, moisture_condition, note. `note` says what the statement heads and anything a
reviewer should know (a footnote marker the values carry, a second table it does not head). Write the file after each
sheet so the work survives an interruption; skip sheets already in it. When done, reply in at most 80 words: sheets
read, rows written, anything that did not fit.
