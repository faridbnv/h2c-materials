# Reader prompt (quality round 2026-10-07, batch b45)

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

You transcribe five filament documents into the row specifications the import's builder reads. Work in
/Users/farid/Documents/h2c-materials-branch. Write ONLY `{OUT}` (one JSON file) and scratch files under `{SCRATCH}`.
No git, no npm, never touch data/ or code.

The documents are the rows of docs/audits/2026-10-07-quality-round/ingest/ledger.csv (column sha256). For each:
- text: `.cache/text/<sha256>.json` (pages[].lines[].text). An HTML page's text is long: find the product's own blocks
  (specifications, print settings) and ignore the shop's menus.
- image of a PDF page: `pdftoppm -r 130 -f N -l N -png .cache/sources/by-sha/<sha256>.pdf {SCRATCH}/<sha8>-pN`, then Read
  the png. Judge every digit from the image.
- data/tables/properties.csv lists the property names and their units; schema/vocab/directions.csv the directions.

For each document write an object:
```
{ "sha256": "...", "title": "<the document's own title as printed>", "revision": "<as printed, or Not published>",
  "published": "<date as printed, or Not published>", "product": "<the product name as printed>",
  "identity": "<the words that say what the product is made of, quoted>", "identityLine": "<the text-layer line holding them>",
  "values": [ ... ], "profiles": [ ... ], "skipped": [ "<each printed number or setting you did not record, and why>" ] }
```
Each value (one per printed cell):
```
{ "page": 1, "property": "<a properties.csv name>", "label": "<the row label as printed>", "unit": "<the unit as printed>",
  "raw": "<the cell exactly as printed, e.g. 51.6±0.3 MPa>", "num": 51.6, "op": "=" | ">" | "<" | "≤" | "≥",
  "line": "<the ONE text-layer line that holds the number, copied exactly>", "std": "<the test method as printed, or empty>",
  "direction": "XY" | "Z" | "XZ" | "ZX" | "Unstated" | "Not applicable", "notch": "Notched" | "Unnotched" | (omit),
  "testTemp": "<as printed, or omit>", "moisture": "<as printed, or omit>", "post": "<treatment as printed, or omit>",
  "specimenType": "Printed specimen" | "Raw material value" | "Not published (do not assume printed)",
  "params": "<the column or table the cell sits in, and the bar's print conditions the page states, e.g. 'Classic printing speed column: 0.4 mm nozzle, 0.2 mm layer, 50 mm/s, 210 °C'>",
  "locator": "p. N: <label> (<column>)", "notes": "<anything a reviewer must know, or omit>" }
```
- `direction`: Not applicable for density, melt flow, thermal properties and hardness; XY / Z / XZ / ZX only where the
  row or column names it; Unstated for a mechanical value whose orientation the page does not give.
- `specimenType`: Printed specimen only where the page says the bars were printed (a print-speed column, "printed
  specimen", a layer height); Raw material value where it says injection moulded; otherwise Not published.
- A range "39-47" gives num 39 and raw "39-47"; a bound "> 400" gives op ">".
- A cell printing "N/A" or "-" is no value: list it in skipped.
- If two columns print one row (e.g. classic and high printing speed), write one value per column, with the column in
  `params` and `locator`.
Each profile (the maker's recommended print settings block):
```
{ "page": N, "locator": "<the block's heading as printed>", "cells": { "nozzle": "<as printed>", "bed": "...", "chamber": "...",
  "enclosure": "...", "drying": "...", "nozzleMaterial": "...", "plate": "..." },
  "lines": { "nozzle": "<the text line>", ... }, "evidence": "<the nozzle line>", "notes": [["Speed", "..."], ["Cooling", "..."]] }
```
Only the cells the block prints; the words as printed. A printing-speed/flow table or a gloss table is not a profile:
list it in skipped.

Copy, never convert or infer. Be strict. When done, reply in at most 80 words: values and profiles per document, and
anything doubtful.
