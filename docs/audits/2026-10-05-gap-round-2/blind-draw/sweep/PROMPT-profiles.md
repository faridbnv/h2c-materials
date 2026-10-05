# Profile sweep reader (gap round 2, phase 7: the blind draw's profile families)

> **Historical record** (2026-10-05): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../../README.md) and [OPEN-PROBLEMS](../../../../../docs/OPEN-PROBLEMS.md).

You read candidate print-profile cells of a 3D-printing filament database on their source pages. Work in
/Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}` and scratch files under
`/private/tmp/claude-501/-Users-farid-Documents-h2c-materials-branch/8ceac304-b627-4cec-9ff1-5537e29bbfb5/scratchpad/{ID}/`.
No git changes, no npm scripts, never touch data/. Use Python's csv module to write CSV.

Input: `{IN}` (family, table, record, SourceID, SHA256, page, grade, held, line, hint), grouped by source. For each
record read the full profile row in data/tables/profiles.csv (ProfileID) and open its source once: text
`.cache/text/<SHA256>.json` (pages[].lines[].text), page images `.cache/readings/r1/<SourceID>/p-N.png` if present,
else render `.cache/sources/by-sha/<SHA256>.pdf` page N with `pdftoppm -r 130 -f N -l N -png`; an HTML source from its
cached text. `line` is only where a detector looked: read the whole page. A profile is the product's own printing
guidance; a setting the sheet gives only for its TEST SPECIMENS is not guidance.

**Family `drying-need`.** The profile's Drying cell is typed "required". Decide what the sheet says about drying THIS
product before printing, in its own words:
- `optional`: drying advised for a condition ("Drying (if wet) recommended", "In case the filament has become wet, it
  should be dried", "If moisture absorption is suspected, dry…", "Only dry if…", "Predrying (optional)", a time window
  starting at 0 h).
- `not-needed`: the sheet says drying is not needed ("does not require drying", "no drying required").
- `required`: a drying step to do, with no condition ("Dry at 80 °C for 8 h before printing", "Drying: Recommended",
  "Drying conditions: 60°C / 4 hours").
- A dry box, a sealed bag or desiccant is storage, not drying: ignore it.
Propose the new Drying cell: the sheet's own words, joined with "; " where the condition and the schedule sit apart
(e.g. `Drying (if wet) recommended; at least 6h at 75°C using a hot dry air oven`). Keep the schedule the cell held.

**Family `hardened`.** The profile's Hardened nozzle is Not published. Does the sheet say, as guidance for this
product, that a hardened / wear-resistant nozzle is needed or recommended, or that none is needed ("No special
concerns", "brass is fine")? A test-specimen setup ("Test parameters: … Hardened Steel Nozzle") or a nozzle the sheet
says is NOT compatible is not that. A portfolio table with a "Ruby or hardened nozzle recommended" column: read this
product's row answer (Yes/No). Propose the new `Abrasion / clogging` cell: the sheet's own words for this product
(e.g. `Ruby or hardened nozzle recommended Yes`, `A wear-resistant nozzle, such as hardened steel and ruby nozzle, is
highly recommended`). Where the held Nozzle diameter dropped words the sheet prints in that cell (BASF's
`≥ 0,6 mm, hardened`), propose that cell too.

Write `{OUT}` with columns: family, record, SourceID, decision (change | keep), column, expect (the current cell), value
(the new cell), quote, reason. `quote` = 1–3 short pieces copied EXACTLY from the text layer joined with " | " that
prove it (each must be findable in the cached text; if the text layer is garbled say so and read the image). One line
per changed column. `keep` when the sheet does not support a change, with the reason. Be strict: do not assume the
detector is right. Write the file after each source so the work survives an interruption; skip records already in it.
When done, reply in at most 80 words with counts per decision and any pattern you saw.
