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

## Interface and tooling (priorities 6 and 7)

Filled in when the three tracks are merged.

## Checks

`verify:fast` and `npm run verify` before the push; one independent review.
