# The round's measures, tracked

> **Historical record** (2026-10-18): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

> **Working record** (2026-10-18) of the selector-refinement round ([README](README.md)): each measure at baseline, after
> the build and at the final review. M2 to M6 re-derive with `node docs/audits/2026-10-18-selector-refinement/measure.mjs`
> (after `npm run build`; about 70 s), M8's reachability with `drawer-ids.mjs`. Baseline: main at 3de5db23, release
> 7f3f14384dab, `measure-baseline.json` and `drawer-ids-baseline.txt` beside this file.

| # | Priority | Measure | Baseline | After build | Final | Target |
|---|---|---|---|---|---|---|
| M1 | P1 | Keep register: kept or reproduced of all items | 45 items (K01–K45) | | | 100 %; any loss approved by the owner |
| M2a | P2 | Cold page 1280×800: table bar above the fold; table rows visible | no (bar at 761 px); 0 rows | yes; the column heads and 1 row | | yes; ≥ 3 rows |
| M2b | P2 | Cold page 1180×760: the same | no (bar at 891 px); 0 rows | yes (a probe check holds it); 0 rows | | yes; ≥ 3 rows |
| M2c | P2 | Cold page 1280×800: visible words / numbers / controls | 402 / 47 / 47 | 452 / 42 / 80: the rail opens on Mechanical's controls (none added) where 20 family boxes were; the results side has fewer words | | fewer words and numbers; controls unchanged |
| M2d | P2 | Cold page: "within H2C temperature limits" repeated | 6 | 0 (the clause once, in the intro's words) | | 1 |
| M3a | P2 | Drawer first screen, numbers (PLA / ABS-CF / PEEK / PCTG-GF), no template | 56 / 45 / 35 / 22 | 51 / 52 / 38 / 28: the screen now reaches the key figures and On the H2C (the tab counts went); each number said once, in the page's form | | ≤ about 20 each |
| M3b | P2 | Drawer first screen, numbers, Indoor prototype | 31 / 27 / 22 / 24 | 39 / 41 / 26 / 20 (the owner's choice at the gate: the page's form, about 30) | | ≤ about 20 each |
| M3c | P2 | Drawer first screen: the lede repeats the status chip; each H2C axis stated twice; pointers to Products | yes; yes (counts, then gate rows); 1–3 | no; once; 1 ("Products gives each one") | | no; once; ≤ 1 |
| M4 | P3 | Drawers (of 2,800: 175 materials × 8 tabs × 2 situations) carrying: | | | | 0, or kept with a reason |
| | | tally "Of the N results below…" | 394 | 0 | | |
| | | "n counts …" | 652 | 0 | | |
| | | "Also drawn, not in the median" | 212 | 0 | | |
| | | "Not used as a filter" and its two variants | 430 | 0 | | |
| | | grammar "1 data sheet say" and the like | 144 | 0 | | |
| | | "special formulation" (the pages say "added filler or additive") | 698 | 2 (a maker's own quote) | | |
| | | "comparable basis" | 596 | 0 | | |
| | | "not one product's scatter" | 596 | 0 | | |
| | | pointers "Products shows which / gives each one" | 304 | 298 (one closing line per Overview) | | |
| | | "On file: N measurements …" | 304 | 304 (the line kept, in documents, no negatives) | | |
| | | "(n of M profiles)" | 40 | 0 | | |
| | | a decision, ruling or migration name (D57, R078, m374) | 264 | 4 (230 at baseline by the corrected measure) | | |
| | | "SCREENED chip" | 90 | 90 (names a control by its label: kept) | | |
| | | "User-supplied reference" | 8 | 0 | | |
| | | "reference grade" | 22 | 0 | | |
| | | a paragraph or item with 2+ semicolons (quotations left out) | 411 | 381 (mostly the method explainers, K26: kept) | | |
| M5a | P4/P1 | Drawer ↔ page key figures: value, bound sign, count or range disagreeing (389 cells, 76 pages) | 0 in value, sign or count; 5 ranges printed at another precision (114 with the spread compared as the page prints it, middle half) | 0 | | 0 |
| M5b | P4 | The same value printed two ways (33.7 against 34) | 22 cells | 0 | | 0, or one stated rule |
| M5c | P4 | Vocabulary and marks checklist (coherence lead's list) | 21 items differ ([coherence/PROPOSAL.md](coherence/PROPOSAL.md)): 15 to move, 6 kept with a reason | 14 of 15 moved; open: #19, typical applications unattributed | | 0 mismatches |
| M6 | P2–P5 | Small text under 4.5:1 contrast (light / dark), cold page | 405 / 114 elements (`--ink-3` 3.47–3.72:1 light, 4.34:1 dark) | 0 / 0 on the cold page, a template's table and PLA's drawer (three tabs); `tokens.css` unchanged | | 0 / 0, `tokens.css` unchanged |
| M7 | all | Engineer review (of 100); the baseline's 10 costliest findings resolved | 62 ([REVIEW-0](review/REVIEW-0.md)); findings F1–F10 | — | | reported; ≥ 8 resolved |
| M8 | guard | `build:diff`; drawer records reached (`drawer-ids.mjs`); `ui:fuzz` 300; `pages:check`; `verify:fast` | 0 differences; 28,950 of 30,992 (the rest are coverage rows and price listings the drawer summarises); —; —; — | 0 against 3de5db23 (release 7f3f14384dab → 4bb15f825013, the template words); the same set, line for line; 0 violations; 16/16; passed in about 40 s warm | | 0; the same set; 0 violations; 16/16; ≤ 90 s |
