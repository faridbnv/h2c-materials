# The Ashby makeover, built (2026-09-29)

The owner asked for the external review and plan of 2026-09-28 (the package `ASHBY-MAKEOVER-2026-09-28`: its review,
specification, data and mathematics contract, backlog B01 to B15 and acceptance) to be built on the branch
`Ashby-makeover`, with the Ashby tab kept coherent with the rest of the page. GOALS steps 3 and 4, scorecard C7. This is
the record: what changed, what it moved, the evidence, and what is left. The decision is D107. Built by Claude (an agent);
no person has reviewed it, and the plan's engineering trial has not been run.

## Starting point

The branch starts at `509f6ef` (main), release `03663e0b6e97`: the revision the package's pure recheck read. The
compiled database here was byte-identical to the recheck's (`cbf26cb7…`), and the five files the review named had no
diff, so the recheck's counts were this checkout's before-numbers; they were not refreshed from memory. `npm run verify`
passed on the untouched clone (`verify:fast` cold: 113.1 s, over its 90 s budget as OPEN-PROBLEMS §19 records).

## What changed

**The engine** (`app/js/engine/`)

- `products.js` — `stateOf` reads a named state back without borrowing another: a state a product does not publish is
  that state with no values; only no name at all is the first state (A01). `valueStateOf` says which state a value is
  read from, so a registry-invariant density beside an annealed stiffness is labelled.
- `workspace.js` (new) — the one model the Ashby lens reads: each product in the state its answer is in, both
  coordinates from that state (and a derived material cost per volume from its own price and density), its bucket, the
  gaps and why, the line's count, the front, material spans, estimate context, and the objective stages.
- `indices.js` — each index's member, free geometry and whether its strength is a proxy; the line on direct or swapped
  axes; the one ranking over an objective stage's kept product states.
- `scenario.js` — version 2: one goal (`rankBy`), the chart's view, layers, line and focus, and `stages`; version 1 read
  without losing its question (`migrateV1`).

**The interface** (`app/js/ui/`, `app/css/app.css`, `app/index.html`)

- `ashby.js` — the lens: the question strip, the starter, and the catalogue and evidence views of before, marked as not
  the decision. `decision.js` (new) — Decision products and Material overview, the line's control, the result list, the
  inspector, the chart data and image exports. `chart.js` (new) — what every view shares, moved from `ashby.js`.
- `axes.js` — strict test pairs agree on moisture, treatment, specimen, direction and document (A03).
- `table.js`, `compare.js`, `brief.js`, `start.js`, `main.js` — one goal for every lens; the stage in the count line,
  the table's header, Compare, the exports and the decision brief; a column order that no longer drops the goal; the
  filter rail's **Hide** on a wide screen; a lasso that focuses instead of filtering.

**Checks** — `test/workspace.test.js` (T01 to T12, hand-worked), `test/workspace-acceptance.test.js` with
`test/acceptance/ashby-workspace.json` (source-read, hash-bound), `test/evidence-pairs.test.js`,
`test/ashby-export.test.js`, four scenario tests; `scripts/ui-fuzz.mjs` I10 (the decision view against the engine);
`scripts/ui-probe.mjs` the workspace's viewport targets and keyboard path (views 40 and 41).

**Documents** — DECISIONS D107 (amending D21, D99, D102, and two bugs worth remembering), INTERFACE's Ashby section,
ARCHITECTURE's module tables, OPEN-PROBLEMS §20, GOALS (a dated note and C7's text, not its score), the fuzz NOTES.

## What it moved

| Diagnostic (the package's, re-asked) | Before (03663e0b6e97) | After |
|---|---:|---:|
| H2C beam, dry: materials PASS / UNKNOWN / FAIL | 8 / 101 / 44 | 8 / 101 / 44 |
| H2C beam: what the product chart drew | 73 points, 42 of failing products, "73 of 8 candidates" | 14 product states across 8 materials; failing products a layer, off |
| Conditioned beam: marks not at their judged state's value | 247 | 0 |
| Estimate shapes collapsing a measured product span to its median | 13 | 0 (40 ranges) |
| Strict test pairs with an explicit condition conflict | 27 of 352 | 0 of 297 |
| Scope only, conditioned: materials ranked / resting on a state not published | 78 / 77 | 1 / 0 |
| Beam line at the fifth-ranked median: its count against the ranking | 4 points against 5 ranked | 8 product states across 5 materials; 5 ranked |
| Constrained beam by cost: ranked / unranked | 0 / 8, no cost axis | 0 / 8, drawable axis, 14 unpriced listed |
| Fiberon PET-GF15, oven off / to 120 °C | drawn at 81.6 / 81.6 °C | unresolved (context, 81.6 as printed) / PASS at 133.7 °C (V001933) |

`evidence/after-probe.json` (`tools/probe.mjs`); the before column is the package's `recheck-509f6ef` evidence.

**Answers** (`evidence/rank-diff.json`, `tools/rank-diff.mjs`): 64 question and mode answers (the six templates, scope
only and the review's H2C beam; Strict and Explore; dry and conditioned; with and without annealing), compared material by
material: **0 verdicts moved**. Of 512 rankings (those 64 under each of the eight goals), **64 moved, all in conditioned
modes**; each lost exactly the materials that had ranked on a state their best product does not publish, and the order of
those remaining is unchanged. `build/snapshot/` is unchanged; `npm run build:diff`: 0 differences in the compiled
database (the release moves with the engine: 03663e0b6e97 → 9d6f90101518 at the time of writing).

## Layout and performance

| Screen | Before: plotting area, where it starts | After |
|---|---|---|
| 1440 × 900, filters shown | 770 × 488 at y 448, the line under the chart | 676 × 466 at y 407, the line above it |
| 1440 × 900, filters hidden | (no way to hide them) | 808 × 450 at y 349, the whole plot on screen |
| 1024 × 768 | 695 × 488 at y 524 | 912 × 395 at y 481, results under the chart |
| 390 × 844 | 276 × 308 at y 1010 | 286 × 308 at y 881 |

`evidence/layout-before.json`, `evidence/layout-after.json` (`tools/capture.mjs`, headless Chrome with the network
offline: 0 requests beyond the file). `npm run ui:check` now fails if the 1440 × 900 (filters hidden) plot is under
700 × 450 or the 1024 × 768 one under 520 × 360, or if the line's control is not above the chart.

Redraws on this laptop, a scale button pressed back and forth 40 times (`tools/perf.mjs`; `evidence/perf-*.json`):

| Run | Marks | Median | p95 | Resize listeners | Plots | Heap, MB |
|---|---:|---:|---:|---|---|---|
| before: beam, one product per point | 82 | 33.5 ms | 36.0 ms | 3 → 3 | 1 → 1 | 37.7 → 39.1 |
| before: scope, materials with estimates | 635 | 98.1 ms | 101.2 ms | 3 → 3 | 1 → 1 | 38.1 → 39.5 |
| before: scope, mixed test pairs | 3,951 | 430.4 ms | 493.9 ms | 3 → 3 | 1 → 1 | 38.8 → 40.4 |
| after: beam, decision products | 20 | 33.5 ms | 50.7 ms | 3 → 3 | 1 → 1 | 39.8 → 41.2 |
| after: scope, decision, every layer and estimates | 396 | 115.4 ms | 135.2 ms | 3 → 3 | 1 → 1 | 40.6 → 42.1 |
| after: scope, material overview with estimates | 509 | 83.8 ms | 101.7 ms | 3 → 3 | 1 → 1 | 40.5 → 42.0 |
| after: scope, mixed test pairs | 3,951 | 455.7 ms | 550.5 ms | 3 → 3 | 1 → 1 | 41.8 → 43.6 |

Nothing accumulates. The largest evidence view is about 6 % slower (the shared question strip and result list); a
list of product states is written only when opened, and the evidence views keep the chart's full width, which took an
earlier 680 ms back to 456 ms.

## Visuals

`visuals/`: the same tasks before and after, at 1440 × 900 unless named: the H2C beam (`*-beam-*`), its conditioned
service, the warm annealed fixture, the cost goal, and the beam at 1024 × 768 and on a phone. A version 1 link opens
its saved catalogue view, said so; `after-beam-products-*` shows one.

## Acceptance

[ACCEPTANCE.md](ACCEPTANCE.md) goes through the package's ACCEPTANCE.json (T01 to T13) and its functional gates, case by
case, with the evidence for each and what was not run. In short: the hand-worked and source-grounded cases pass; the
formative trial with five engineers (B14), screen-reader, other-browser and physical touch checks were not run.

## Verification

`npm run verify` after the change: see [evidence/verify-after.txt](evidence/verify-after.txt) (the tail of the run, with
its timings). The full-text index test in `test/sqlite.test.js` runs only where `.cache/text` exists; `npm run
test:ingest` writes a fixture there, so a second `npm test` after `verify` fails it in any fresh clone, before this change
as after (OPEN-PROBLEMS §19). It was cleared before the run recorded here.

## Reproduce

```bash
node docs/audits/2026-09-29-ashby-makeover/tools/probe.mjs                      # the diagnostics, after
node docs/audits/2026-09-29-ashby-makeover/tools/rank-diff.mjs <before app/js> <before db.json> app/js dist/db.json
node docs/audits/2026-09-29-ashby-makeover/tools/capture.mjs dist/<page>.html <out> after
node docs/audits/2026-09-29-ashby-makeover/tools/perf.mjs dist/<page>.html after
```

The before page, database and app code are release 03663e0b6e97's: `git show 509f6ef:app/js/...` and a build of that
commit, or the package's `recheck-509f6ef` copy.

## Left open

OPEN-PROBLEMS §20: no engineer has used it; the source readings are an agent's; one state per product; one requirement
per property; cost is Canadian and thin; no estimated context under Confirmed only (kept so, for coherence with the rest
of the page); relative performance only against the first-ranked; strict pairs now need one document; the largest
evidence view is slightly slower; cold `verify:fast` is still over budget. Nothing was pushed, merged or published.
