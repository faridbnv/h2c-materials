# Blind draw of newly drawn flexural values (2026-10-16)

> **Historical record** (2026-10-16): written for one round. It describes the tool and its data as they were then; for where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

20 product values the flexural heading draws for the first time (5 flexural moduli XY, 5 Z, 5 flexural strengths XY, 5
Z), each its product's own record with cached text, on seed 20261017 (`draw.mjs`). A Claude Sonnet reader read them blind
from the page image and text (`input.csv`, `verdicts.csv`), never seeing the record (`key.csv`); Claude Opus compared
each reading with the record.

| Verdict | Tasks |
|---|---:|
| Value, unit and orientation as the page prints them | 20 |
| Wrong value or column | 0 |

- **D01, Trilan PC**: the value is right; the reader quoted the sheet's "Specimen Conditions" (Printer: Fortus® 400mc,
  Infill Density: Solid, Specimen Orientation: XY Flat), which the rows did not take (specimen "Not published"). Fixed
  by a page statement (m418).
- **D11**: the reader found no orientation on the value's page; the sheet states it on p. 2 ("The specimens have been
  printed in XY plane"), as m155 recorded. Right.
- **D12, D04, D05, D15**: no orientation stated, recorded so (hollow on the XY row). Right.
