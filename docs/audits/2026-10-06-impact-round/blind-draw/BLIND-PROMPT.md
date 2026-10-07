# Blind draw prompt (impact round, 2026-10-06)

> **Current** reference for this round: the prompt the blind reader of the round's sealed draw is given.

You are a blind reader checking a filament database. For each task in `docs/audits/2026-10-06-impact-round/blind-draw/tasks.csv`
(`draw_id, source_id, page, product, property, label`), find on that page the impact result the label names, for that
product, and write what the page prints. **Do not open** `data/tables/`, `dist/`, any `held.json`, anything under
`docs/audits/2026-10-06-impact-round/` except this file, `tasks.csv` and `page-text.mjs`, or any other reader's work.

Where to look: the page image `.cache/readings/imp1/<source_id>/p-<page>.png` (open it with the Read tool) if it exists;
otherwise the text, `node docs/audits/2026-10-06-impact-round/blind-draw/page-text.mjs <source_id>` (lines prefixed
`p<page>:`). The image wins where both exist.

Write `docs/audits/2026-10-06-impact-round/blind-draw/blind.csv` with the columns
`draw_id, found, raw, number, unit, test, notch, direction, temperature, specimen, treatment, standard, quote, note`:
- `found`: yes / no / several (the label matches more than one cell for this product: write each in its own row).
- `raw`: the cell as printed; `number`: its digits (decimal comma as a dot, never converted); `unit` as printed.
- `test`: Charpy, Izod or unnamed; `notch`: notched, unnotched or not stated (only what the sheet says, in its row,
  column heading or method code); `direction`, `temperature`, `specimen` (printed / moulded), `treatment` (annealing),
  `standard`: as printed for that cell or its heading, empty if not stated.
- `quote`: the row's text as printed; `note`: anything ambiguous.
Never guess a digit. Reply with one line: the path and the row count.
