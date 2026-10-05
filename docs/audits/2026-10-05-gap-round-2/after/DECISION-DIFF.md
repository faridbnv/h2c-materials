# Gap round 2: what the round did to the tool's answers

Against the build before the round (`baseline/templates.csv`, a0f5a87) and its `build/snapshot/print.csv`. Re-derive with
`git show a0f5a87:build/snapshot/print.csv` beside the current one; every move below has its cause.

## Template answers (1,690 before, 1,701 now)

| Move | Answers | Materials | Cause |
|---|---:|---|---|
| UNKNOWN → PASS | 10 | PP-GF (M084), PET-CF (M067), PCL (M149) | FIBREX GF PP's and BioFil PCL's print settings from their makers' pages (b44); a PET-CF headline whose direction a page states (m359) |
| new → PASS | 9 | the same three | the material became a candidate in the strict modes once its product's gates were known |
| new → UNKNOWN | 2 | Nylon-CF, maker-undisclosed (M165) | Essentium PA-CF and PA, new products of b43 |

No answer moved from PASS or to FAIL. Product passes inside the answers: 3,610 → 3,602, fails 3,686 → 3,725, untested
8,953 → 9,076, products counted 16,249 → 16,403 (b43's new products). PLA's indoor-prototype answer stays PASS with
185 of its 197 products passing and 12 untested: those are the variants that no longer read the PLA guide's chamber
(D129).

## Print gates of the 1,099 products held before (1,111 now)

| Gate | Moved | Unknown before → now | Cause |
|---|---:|---|---|
| Nozzle | 12 | 40 → 33 | unknown → within: b43's sheets and b44's makers' pages |
| Bed | 11 | 37 → 33 | the same; one variant no longer reads the guide's bed |
| Chamber | 16 | 293 → 311 | 12 PLA variants no longer read the PLA guide (D129); 4 known from b44; new products state none |
| Enclosure | 20 | 358 → 382 | the same variants; 4 known from b44 |
| Hardened nozzle | 54 | 417 → 408 | statements on nozzle lines and in notes now read (58 cells, m365); twins with a profile of their own no longer read their twin's (D127); variants no longer read the guide's |
| Drying | 370 | 357 → 202 | the guide answers a silent product (unknown → optional 133, → required 59); "if wet", "in case the filament has become wet" read optional (required → optional 124); "not necessary" and "does not require drying" (→ not needed 22); a dry box's answer held as drying taken out (required → unknown 32) |

Screening certification (`build/snapshot/screening.csv`): no end changed whether it screens. EST-FAMILY-ORDER's one
finding moved from M166 to M165 (b43's Essentium values) and is accepted with its reason.
