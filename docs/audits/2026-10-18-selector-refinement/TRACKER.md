# The round's measures, tracked

> **Working record** (2026-10-18) of the selector-refinement round ([README](README.md)): each measure at baseline, after
> the build and at the final review. M2 to M6 re-derive with `node docs/audits/2026-10-18-selector-refinement/measure.mjs`
> (after `npm run build`; about 70 s), M8's reachability with `drawer-ids.mjs`. Baseline: main at 3de5db23, release
> 7f3f14384dab, `measure-baseline.json` and `drawer-ids-baseline.txt` beside this file.

| # | Priority | Measure | Baseline | After build | Final | Target |
|---|---|---|---|---|---|---|
| M1 | P1 | Keep register: kept or reproduced of all items | (KEEP.md, compiled at step 1) | | | 100 %; any loss approved by the owner |
| M2a | P2 | Cold page 1280×800: table bar above the fold; table rows visible | no (bar at 761 px); 0 rows | | | yes; ≥ 3 rows |
| M2b | P2 | Cold page 1180×760: the same | no (bar at 891 px); 0 rows | | | yes; ≥ 3 rows |
| M2c | P2 | Cold page 1280×800: visible words / numbers / controls | 402 / 47 / 47 | | | fewer words and numbers; controls unchanged |
| M2d | P2 | Cold page: "within H2C temperature limits" repeated | 6 | | | 1 |
| M3a | P2 | Drawer first screen, numbers (PLA / ABS-CF / PEEK / PCTG-GF), no template | 56 / 45 / 35 / 22 | | | ≤ about 20 each |
| M3b | P2 | Drawer first screen, numbers, Indoor prototype | 31 / 27 / 22 / 24 | | | ≤ about 20 each |
| M3c | P2 | Drawer first screen: the lede repeats the status chip; each H2C axis stated twice; pointers to Products | yes; yes (counts, then gate rows); 1–3 | | | no; once; ≤ 1 |
| M4 | P3 | Drawers (of 2,800: 175 materials × 8 tabs × 2 situations) carrying: | | | | 0, or kept with a reason |
| | | tally "Of the N results below…" | 394 | | | |
| | | "n counts …" | 652 | | | |
| | | "Also drawn, not in the median" | 212 | | | |
| | | "Not used as a filter" and its two variants | 430 | | | |
| | | grammar "1 data sheet say" and the like | 144 | | | |
| | | "special formulation" (the pages say "added filler or additive") | 698 | | | |
| | | "comparable basis" | 596 | | | |
| | | "not one product's scatter" | 596 | | | |
| | | pointers "Products shows which / gives each one" | 304 | | | |
| | | "On file: N measurements …" | 304 | | | |
| | | "(n of M profiles)" | 40 | | | |
| | | a decision, ruling or migration name (D57, R078, m374) | 264 | | | |
| | | "SCREENED chip" | 90 | | | |
| | | "User-supplied reference" | 8 | | | |
| | | "reference grade" | 22 | | | |
| | | a paragraph or item with 2+ semicolons (quotations left out) | 411 | | | |
| M5a | P4/P1 | Drawer ↔ page key figures: value, bound sign, count or range disagreeing (389 cells, 76 pages) | 0 in value, sign or count; 5 ranges printed at another precision | | | 0 |
| M5b | P4 | The same value printed two ways (33.7 against 34) | 22 cells | | | 0, or one stated rule |
| M5c | P4 | Vocabulary and marks checklist (coherence lead's list) | (step 2) | | | 0 mismatches |
| M6 | P2–P5 | Small text under 4.5:1 contrast (light / dark), cold page | 405 / 114 elements (`--ink-3` 3.47–3.72:1 light, 4.34:1 dark) | | | 0 / 0, `tokens.css` unchanged |
| M7 | all | Engineer review (of 100); the baseline's 10 costliest findings resolved | (step 1) | — | | reported; ≥ 8 resolved |
| M8 | guard | `build:diff`; drawer records reached (`drawer-ids.mjs`); `ui:fuzz` 300; `pages:check`; `verify:fast` | 0 differences; 28,950 of 30,992 (the rest are coverage rows and price listings the drawer summarises); —; —; — | | | 0; the same set; 0 violations; 16/16; ≤ 90 s |
