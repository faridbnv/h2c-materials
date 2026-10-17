# The checks of the reimagined pages: what fails, and whose

> **Current** (2026-10-17), working notes of the pages-reimagined round, for the executor: what `npm run pages:check`
> and `npm run ui:check -- --only pages` report on the pages as they stood at the end of the checks' rewrite, by track.
> Every figure re-derives with `PAGES_CHECK_ALL=1 node --test test/pages.check.js` (every failure, not the first twenty)
> and `node scripts/ui-probe.mjs --only pages`.

## Run times

`pages:check` 2.8 s (the old check: 2.7 s at HEAD), about 180,000 checks. `ui:check -- --only pages` 1 min 14 s for 31
views (the old pages part: 2 min 14 s for 24).

## Track A (frame, Products page, hub)

- **P9, 57 Products pages: a record ID in a card's words.** Locators and profile notes printed as recorded:
  "p. 1: Tensile Strength - Z (G020-44)", "Enclosure read with its row whole (m375)", a document with no title shown by
  its ID ("R-H2C-SPECS; H2C-WIKI", M038).
- **P9, Products pages: retired or project words in a card.** "Shown, not in the median: special formulation" (14
  pages, material-words.js outOfMedianWords), "Not shown: a reference grade, not a product" (M052, labels.js whyOne),
  "Excluded from ABS pricing and all headline calculations" (M001, a quarantined listing's note).
- **Probe, phone: card tables clip their cells** (`pc-t`): PLA 581 of 7,320, PETG 323 of 3,207, PPS-CF 41 of 378,
  PCTG-GF 6 of 60.

## Track B (sections and words)

- **REC, 76 + 6: a known gap shown on neither page.** `derived-<id>-sparse-properties` (every material) and
  `derived-<id>-canadian-price` (6) pass `shownGap`, so placement.js expects them, but Sources leaves them out
  (SAID_ELSEWHERE) and nothing else carries their `data-rec`.
- **P6, 76: the settings table names the hardened-nozzle row `nozzle-type`**; HOOKS.md says `hardened`.
- **P9, Overview words:** "Grade-specific fatigue observations…" quoted outside a `<q>` (M031, M035, M052, M094),
  "a printer maker's guide rates it easy to print" (PLA's summary draft).

## Track C (figures)

- **P5, 991: the layers' strip marks a share as a median.** In `fig-layers`, each material's mark carries
  `data-key="tensileStrengthZ"` (or `tensileModulusZ`, `elongationZ`) and `data-v` the median share of Z over XY
  (0.687); HOOKS.md says a material mark's `data-v` is its median. Carry the share in its own attribute (or give the
  mark a `data-stat`), and the check can hold it to `layerShareOf`.
- **Probe, phone, PCTG-GF: "PCTG-GF, as published" runs past the screen** in `fig-among-materials`.

## What the checks hold, and what they dropped

P4 (rank tracks) and CNT (one section's counts against another's) are gone with the old pages: the plate draws no peer
ticks, and every marked number (`data-stat`) is held to the facts directly. Two checks are deliberately tolerant: an
as-published key figure may go without its small drawing (the masthead draws none; where one is drawn its `data-n` is
held), and a figure's label is cut only by what clips it (the screen does not cut what a sideways-scrolling figure holds).
