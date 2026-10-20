# The clean-up round (2026-10-19)

> **Historical record** (2026-10-19): the round that worked the fixable list's priorities 5 to 7. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** The owner asked for the fixable list's priorities 5 (data clean-up), 6 (the interface fixes the reviews
> left) and 7 (tooling) to be done efficiently and pushed. Four tracks ran in parallel: the data by migration (m459,
> m460), the material pages, the selector, and the import tools, each by a Claude Opus agent in its own worktree,
> merged and checked together with one review. What it left, and why, is in OPEN-PROBLEMS beside each item.

## Data (priority 5)

| Item | What changed | Where |
|---|---|---|
| Makers and publishers spelt one way (§36.1) | Fabru's 21 "Fabru / purefil" products are Fabru's; Zytel 101L's maker is Celanese; MakerBot's sheets UltiMaker's, Airtech's Kimya documents Kimya's; Trinity3DS named as the distributor it is | m459 |
| Source titles (§37.19) | Two PubMed Central titles lose " - PMC Lock"; Bambu Lab's "Filamant" is its page's own title and stays | m459 |
| POM's filler (§37.8) | "Unfilled / unspecified": its products are plain acetal | m459 |
| Statements (§37.6) | 48 table cells read "Dry box recommended: No"; nine benefits filed as pitfalls moved to Benefits; two duplicate Chinese paragraphs retired | m459 |
| Flashforge nozzle sizes (§12) | 30 profiles hold the recommended row their sheet prints ("φ0.4/0.6mm (φ0.4mm recommended)") | m459 |
| An inclusive bound (§29a) | The operators vocabulary takes "<=" and ">="; PC-Max's "≤ 0.1%" moisture is one | m459 |
| Two Charpy rows citing a tensile standard (§18) | Re-read: the sheets' template prints that standard on every row; recorded as printed | m459 |
| Stratasys PC-ABS and PC elongations (§33.3) | Read on the page images: each held value is its table's; the other table's XZ values added, each row's Locator naming its table | m460 |
| YOUSU PC's "19 / 900" (§34.1), the negation candidates (§32.11) | Read; nothing to change (the YOUSU cell does not say which line is which) | — |

**Left, with the reason in OPEN-PROBLEMS:** the large re-read backlogs (§11's outliers, §31.6 and §33.10's digit
suspects, §32.3's unconfirmed records, §12's test-bar print parameters, §10's deferrals, §30.4's held readings, §13's
know-how); Stratasys PC-ABS's UV table (§33.2, no state for weathering); the two ledger rows filed under another
product's source (§33.7, an import step); what needs a design or the owner (a foamed filament's density, §37.10; a
fibre-basis column, §38.3; a state for a sentence copied from another product's page, §37.7).

## Tooling (priority 7)

Built by a Claude Opus agent and recorded as D169 (the import's sheet reader is frozen since D138, so its change carries
a back-test):

| Item | What changed | Measured |
|---|---|---|
| Later copies read as their source (§34.3) | The record tier keeps a cached document under a source only where `sources.csv` records its digest; a copy filed under another source's name says so (`filed_under`) | 141 copies (5,279 lines) no longer carry the sheet's source; 22 copies that print the sheet's text in other bytes stay its |
| LEHVOSS's split rows (§34.7) | An orientation code ("XY") is not a word when the reader joins a split row | 24 of 24 cells (19 before); every cached document re-read: only that sheet differs, +5 values, none lost |
| A number inside a name, "approximately" (§38.3) | The reconciler confirms a figure a name prints where the reading quotes the name; the proposals record an approximate composition from its number, a name's figure as nominal | The fibre stage's readings: visual-only 20 → 3, second reads 15 → 2, held as claims 4 → 0 |

Not done: splitting the reader into per-layout adapters (§34.7), several days of work that changes what each maker's
sheets are read with.

## Interface (priority 6)

Built by two Claude Opus agents, one on the material pages and one on the selector; the rules they changed are D170.

| Where | What changed for a reader |
|---|---|
| Material pages (§37.17 to §37.19, §38.3) | PETG's layers figure names the products its Z median counts without a share; a twin's mark says whose sheet it reads; a melting point only for a polymer that melts (PETG's "190 °C" was a median of processing temperatures); one Z label, "Z (ZX)"; long product cards fold (PEKK's 5,300 → about 890 px); the Conditions cell shows the standards the build reads; an open card stacks above the sticky head; a condition a group shares said once; "64 products, 29 in the median"; Shore A and Shore D drawn; no overlap from 390 to 1,440 px |
| Selector (§37.20, §37.21, §37.8, §19, §38.10) | The two H2C pills say what each checks; one wording for counts and log scales (C49); the table's column heads say "median · range" and the drawer's median explanation adds up; a long tag no longer breaks a product's head; three table rows on the cold page at 1280 × 800; Parallel lines with "↑ better", real ticks, the line's products' spread and far outliers parked (C45 to C47); named fillers filtered and drawn by name (36 undisclosed → 17); the first candidate in a phone's first screen; a withheld estimate says why where it would have been |

Left: C48 (Compare in the pages' glyph) and C30 (one search-field style); a shared sheet's value drawn once (it would
leave a median counting a product the figure does not show) and QIDI PETG RAPIDO's Z bar (D143), both the owner's; the
selector layout calls §37.20 names as the owner's.

## Review

One independent review (Claude Opus) found the round's moves right and these to fix, all fixed before the push (m461
and the code): the two POM densities CL02 now reads, accepted with their reasons (F1); the drawer printing PC-Max's
inclusive bound without its sign (F2); the record tier detaching 22 copies that print their sheet's text (F3); the
name rule reading "PA12" or "F900" as a filler's load (F4); one answer moved to Benefits that is a limitation (F5); four
"Drybox" cells (F6); a second Fabru row in the manufacturers vocabulary (F7); two document wordings (F8); a missing layer
height and the Flashforge locators' page (F9).

## What moved

[The decision diff](DECISION-DIFF.md) against main: no material verdict, listing or pass/fail moved in the 138 census
cases. 58 product answers moved between the unknown groups (not enough data, unlikely to meet, likely), all from the
estimates refitting after Fabru's two spellings became one maker (COC, SAN and PVC are Fabru products) and POM's filler.

## Checks

`verify:fast` and `npm run verify` before the push; one independent review.
