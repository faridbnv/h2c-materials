# The reader round: every gap document read from its pages, makers' sites searched, physical order enforced

GOALS steps 2 and 5; C3, C4, C9, C11, C12, C13. Decisions D125 (the reader) and D126 (physical order). On 2026-10-04
the owner opened makers' sheets the tool called silent and found the values printed there: purefil's LCP sheet prints
"Printing temperature 280-300 °C", "Heated bed temperature 120-150 °C" and "Drying 150 °C / 4-6 h", and the material
had no print profile. The owner also saw ultimate-strength estimates below the same product's published break and yield
stress. The round was to find why, read the gaps again with a better reader, search the makers' sites where the sheets
stay silent, and keep every number shown in physical order; Claude Sonnet did the reading and coding to specification,
Claude Opus decided. The owner's answers are in GOALS, "Decided on 2026-10-04, the reader round".

## Why the values were missing

- **The text layer, not the OCR.** `pageLines()` grouped a page's spans by baseline with no model of columns. On a
  two-column sheet each baseline carries one column, so the right column's rows fell between a label and its value, and
  the reader never paired them; the value stayed in `source_facts` as skipped.
- **A product with no profile was never checked.** Every guard started from a profile and asked whether its sheet
  agreed; a product whose sheet the reader could not read got no profile, so nothing asked.
- **Fonts and pages.** purefil's fonts draw "ti" and "ft" as digits and "W" ("Prin5ng temperature"); web pages kept
  their spec grids in JSON-LD, Shopify product data, definition lists and div grids that the HTML reader dropped; 500
  cached web texts were from older reader versions; 187 pages of 138 documents had no usable text layer at all.
- **Estimates ignored physical order.** No floor came from a product's own yield or break stress, so 46 materials and 343
  products showed an ultimate strength below them, and LCP's HDT at 0.45 MPa was estimated under its published HDT at
  1.8 MPa.

## What was built

| Part | Where | What it does |
|---|---|---|
| Reading order | `scripts/lib/pdf-layout.mjs`, `readSheet` | XY-cut blocks beside the cached lines; on by default since this round |
| Ligatures | `repairLigatures` in `scripts/lib/pdf-text.mjs` | a read-time view; the cache is untouched |
| Web pages | `scripts/lib/html-text.mjs` v5, `capture.mjs` | structured product data, grids, `dl`, spans; tabs opened before capture |
| Broken text | `scripts/lib/text-quality.mjs`, `ingest:quality`, `ingest:ocr-pass` | flags, and an optical sidecar beside the text |
| Page reading | `ingest:read-packet`, `ingest:read-reconcile`, `ingest:read-proposals`, `read-proposals-apply.mjs` | page images read, checked against every view, gated, applied by migration |
| The guard | `audit:context`, CONTEXT-PROFILE-UNRECORDED | a product's own sheet whose settings no profile holds |
| Physical order | `physical_relations.csv`, lint, `lower-bounds.js`, `estimate/order.js`, `floors.js` | floors, containment, EST-ORDER, PRODUCT-ORDER |

## What was read

- **Targets** (`TARGETS.csv`, frozen by `targets.mjs`): 3,351 — every material and product missing a nozzle, bed,
  chamber or drying setting, or a mechanical or thermal headline; the 8 coverage conflicts; 136 sparse-property gaps;
  21 thin materials. `DOCS.csv`: the 1,474 documents tied to them.
- **Pages read**: 1,377 documents (1,079 PDF, 298 web pages), 2,621 pages, by 73 first-read batches and 20 second-read
  batches of Claude Sonnet readers (`readings/`). 37,679 readings were reconciled (`reconcile/final/summary.md`): 15,217
  new, 10,410 confirming a held row, 1,579 contradicting one, 2,044 page statements; 32,777 borne out by the text layer,
  217 by the reading-order view alone, 55 by the optical sidecar, 4,630 by the image alone.
- **Makers' sites**: b41, 10 documents for thin materials (m340); b42, 44 documents for products still missing a
  nozzle or bed (m352). `ingest/b42-packet.json` lists what was found and not admitted, with the reason.

## What changed in the tables

| Migration | What |
|---|---|
| m338 | physical-order flags on values the sheets print (a break above its own ultimate) |
| m340, m352 | the makers' pages (b41, b42): one profile each |
| m341 | 3DXTECH's "printer with an enclosure" sentence read as a recommendation |
| m342 | what the pages print: 2,588 values, 399 profiles, 1,403 profile cells, 101 value cells, 102 page statements |
| m343 | held rows the pages correct, decided row by row (373 cells, 16 profiles) |
| m344 | what physics rules out: 53 cells fixed or flagged, 53 findings accepted with reasons |
| m345 | what the mapping got wrong: test-bar settings off 13 profiles, 7 duplicates, moulded bars, conditioning words |
| m346 | seven cells the parsers now read |
| m351 | purefil's ligature-hidden settings (COC, TPV, TPS) |
| m353 | the guard's 222 findings: 98 cells, 36 profiles from own sheets no profile held, the rest accepted |
| m354 | the blind draw and its families: page statements, columns read into the wrong direction, schedules |

Against main before the round: 2,602 measurements added (1,643 mechanical, 539 thermal, 420 physical) and 100 changed,
490 profiles added and 795 profile cells filled or corrected, 112 page statements, 54 sources.

## What moved

`after/PROGRESS.md` (`node targets.mjs --after`): 847 of the 3,351 targets closed. Products missing a nozzle 83 → 28,
a bed 103 → 24, drying 520 → 335, a density 174 → 101, a tensile strength 302 → 217; materials with no nozzle 18 → 5,
no bed 19 → 5, no drying 29 → 10. The chamber moved least (products 299 → 267): makers rarely print one.

The decision diff against the frozen baseline (`baseline/templates.csv`): 11 materials became candidates under Strict
(ASA Aero, PP Lightweight, PVDF-ESD, PLA-PHB, PP-GF, TPC/TPEE, PLA-GR among them) and 4 answers left it (PPA-CF in
three templates and ASA-CF in one), because their makers' pages say "Heated Chamber: Recommended" with no temperature,
which reads unknown (D33, D93). LCP now fails the H2C's bed: its sheet's 120-150 °C window is read by its upper end
(D32). Strict candidates per template: indoor prototype 81 → 87, warm environment 33 → 38, outdoor structural part 6 → 5,
lightweight structure 15 → 14, high-stiffness fixture 6 → 4, flexible component 7 → 7.

## The eight coverage conflicts

Each was read again from its page images (C01106, C01108, C01409, C01411, C01412, C01413, C01414, C01540). Every one
stands as its sources print it, so none could be corrected from the page; each waits on what OPEN-PROBLEMS §4 names.

## Physical order, back-tested

`estimate-order/backtest.md`. Flooring a material at its highest product floor broke calibration (likely coverage of
tensile strength 29.7 %); containment kept it: likely 85.9 / 80.7 / 79.0 % for tensile strength, elongation and HDT at
0.45 MPa, against 81.3 / 80.7 / 77.8 % unfloored. EST-CALIBRATION and the screening certification are unchanged.

## Error rate, measured blind

`blind-draw/`: 40 facts the round recorded or changed, drawn at random (16 measurements, 16 profiles, 8 page statements;
`draw.py`), each checked on its page image by a Claude Sonnet reader that had not seen the readings, and decided by
Claude Opus.

| Draw | Correct | Partly | Wrong | What the errors were |
|---|---:|---:|---:|---|
| 1 (seed 20261005) | 36 | 2 | 2 | a "ZX, Flat" column recorded XY; page statements reaching tables they do not head |

The first draw named two families, and each was then read in full (`blind-draw/sweep/`): all 112 page statements the
round added, and all 110 groups of one product's rows that carry the same conditions and different values (281 rows:
68 fixed, 18 flagged; Raise3D PPS-CF's ZX column, QIDI PETG-CF's three directions, Stratasys's upright tensile bars,
Markforged's repeated rows). DRAW2

## What is left

OPEN-PROBLEMS §30: 28 products still have no nozzle or bed (`STILL-MISSING.csv`), the chamber gap, 13,909 readings
held with their reasons, pages that contradict themselves, and the rules only the owner can settle.
