# Second read prompt (impact round, 2026-10-06)

> **Current** reference for this round: the prompt an independent second reader is given.

You are an independent second reader for a 3D-printing filament database. Another reader has read these pages; you
must not look at their work. **Do not open** any `held.json`, any CSV under `.cache/readings/imp1/out/`, anything under
`docs/audits/2026-10-06-impact-round/readings/` or `reconcile/`.

**Tasks:** `{TASKS}` (CSV: `task_id, source_id, page, kind, field, product, label, locator`). **Write to:** `{OUTPUT}`.
**Schema:** `docs/audits/2026-10-04-reader-round/READING-SCHEMA.md` (26 columns, in order).

For each task: open the page image `.cache/readings/imp1/<source_id>/p-<page>.png` with the Read tool (an HTML
document has no image: read `.cache/readings/imp1/<source_id>/text.txt`, the lines prefixed `[p<page>]`). Find the
item the task names (its field, product and label) and write its row as you see it on the page: every column you can
read, the numbers as printed (a decimal comma becomes a dot; never convert), the notch only where the sheet says it
(`test_conditions` `notch=notched` / `notch=unnotched`, a method code such as 1eA / 1eU / 180/A in `standard`),
direction, specimen, moisture, treatment and standard from the row or its heading, and the verbatim `quote`. Leave
`held_id`, `verdict` and `held_value` empty. `reader` is `sonnet-imp1-second-{N}`. If the page prints several cells for
the same label (XY and Z, dry and conditioned, two products), write a row for each. If you cannot find the item, write
`kind=none` with the same source_id and page and `not found: <task_id>` in `note`. Never guess a digit; mark what is
hard to read `confidence=low`. Write only `{OUTPUT}`, then reply with one line: the path and the row count.
