# Missed-claim draw prompt (impact round, 2026-10-06)

> **Current** reference for this round: the prompt the reader of the missed-claim draw is given.

The database marks a product "sold as toughened" only where its maker's own document presents it as a tougher or
impact-modified version of its polymer. You are checking 20 products that are **not** marked, to find any the marks
missed. For each row of `docs/audits/2026-10-06-impact-round/blind-draw/negative-tasks.csv` (`draw_id, grade, product,
material, sources`), read each listed source's text with `node docs/audits/2026-10-06-impact-round/blind-draw/page-text.mjs
<SourceID>` (the whole document; a page image `.cache/readings/imp1/<SourceID>/p-N.png` may also exist) and copy every
sentence or table cell, verbatim, in which the maker speaks about the product's toughness, impact resistance,
brittleness, breaking, shatter resistance, an impact modifier, or compares any of these with another grade or polymer.
Do not judge; copy. Do not open `data/tables/` or `dist/`.

Write `docs/audits/2026-10-06-impact-round/blind-draw/negative.csv` with columns `draw_id, grade, source_id, page, quote,
note`, one row per quote; a product whose documents say nothing of the kind gets one row with an empty quote and
`note=nothing found`. Reply with one line: the path and the row count.
