# The Ashby makeover, built (2026-09-29)

*Revised five times the same day as the owner used it (D108 to D112): see the revisions at the end. The sections
before them record D107 as first built; the objective stage, the axis limits form, the Show menu and the catalogue view
they describe are gone (the catalogue is Material typicals since D110, one dot per material since D112), and each
revision records the lens as it was that day.*

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

## Revision after the owner's walkthrough (D108)

The owner opened the built page and found three things: the menus changed as they worked, so finding one item meant
thinking through hundreds of combinations; the requirements they had set in the filter rail were already drawn on the
chart, so the lens's own ways of narrowing the answer were redundant; and PLA's range covered nearly everything, which
they doubted. They asked for the lens to be reworked as a UI and UX expert would, a two-level menu allowed where it helps.
Walked again as a first-time reader (the H2C beam from the starter, every fold opened; headless Chrome), the lens showed:

| What the reader met (D107) | Where | Now (D108) |
|---|---|---|
| Axis options with live counts, "Stiffness (153 product states · 42 materials)", changing with every filter and cut off by the box | both axis menus, every view | the property's name alone, one fixed order, in every view, the evidence views included |
| Folds that opened and closed themselves (Axes by the goal) and pushed the chart down (Layers, More) | control row | one row: view, axes, Lin/Log, swap, and **Show** and **More**, menus over the chart; greyed items say why |
| Four ways to narrow one answer: the rail, Edit requirements, *Limits on these axes*, *Keep products above this line* | question strip, More, line | the rail alone; *Asked* reads it back with **Change in Filters**; a requirement's label on the chart opens the rail at it |
| Five counts of one picture ("84 shown", "682 product states, 84 materials", "10 … of 142", "33 of 78", the axis menus') | strip, line, Layers, menus | "N products from K materials" in the line, the count under the chart and the exports |
| PLA's band 800–1400 kg/m³ by 0.43–4.2 GPa over 32 products | Material overview, scope only, every judged product | box 1230–1250 kg/m³ by 1.5–2.8 GPa (middle half of 29), whiskers 1170–1310 and 0.43–4.2; PolyWood, PLA-Lite and SimuBone drawn apart as variants |

**Is PLA's range true?** Its numbers were real transcriptions, but the band was misleading. It ran from the lowest to the
highest of every PLA product the question judged, and three of them are declared variants: PolyWood (a lightweight
additive, 800 kg/m³) and Eryone PLA-Lite (an undisclosed dense filler, 1400 kg/m³) set the density ends. The build keeps
variants out of a material's spread, so the table said PLA's density runs 1170–1329 kg/m³ over 146 products while the chart
drew 800–1400. One sheet set each stiffness end. The box now follows the table's rule (D83): the middle half of the
material's own products, whiskers to the extremes, variants apart. What remains wide is the sheets' own spread: PLA's
lowest stiffness values are printed bars to GB/T 1040 at 50 mm/min, to ISO 527 with no print settings stated, and a
toughened grade to ASTM D638 at 0.43 GPa (OPEN-PROBLEMS §20).

The PLA figures are `evidence/revised-probe.json` (`tools/probe.mjs`, now with PLA's range in place of the stage); the
layout of every scenario after the revision is `evidence/layout-revised.json` (`tools/capture.mjs`).

**What moved.** `tools/rank-diff.mjs` against the D107 commit: 64 answers, 0 verdicts moved; 512 rankings, 0 moved (the
stage was the only other thing a ranking read). `npm run build:diff`: 0 differences. The release moved with the engine.
The objective stage went from the engine, the scenario (a saved one reopens as a line position, with a notice), the
table, Compare, the brief, the answer header and every export. The layout targets hold: `revised-*` in `visuals/` (the
beam, its material ranges, scope-only ranges, the Show menu, the starter, 1024 × 768 and a phone); the full set is in the
package's `implementation-2026-09-29/visuals-revised/`.

Not changed: the filter rail's family counts (they say what a click would leave, in one order), and the page-wide
Candidate confidence and estimates switches, which the Show menu names when an item needs them.


## Second revision: every option, planned (D109)

The owner used the D108 lens and found it still very confusing: they asked for every combination the menus make with the
filters and the top bar to be counted, and for a judgement of how a user would find the one they need; clicks still reset
their work; the list on the right behaved strangely; estimates meshed the chart. They then asked to keep the free choice,
with the flow, the effects and the look planned.

**The count.** The lens offers about 4.2 million discrete settings (goal 9 × view 5 × axes 11 × 11 × scales 4 × layers 8
× estimates 2 × references 2 × familiar filament 6); with the top bar and status chips (× 192), about 800 million, before
the rail's 86 controls. All of them are still reachable. What changed is how they are laid out, what each one does and what
it leaves alone (DECISIONS D109, with the table of effects).

**Measured before and after** (headless Chrome, the H2C beam; the same probe both times):

| A reader does | D108 | D109 |
|---|---|---|
| Types "PA" in the list's search, then changes a scale | search emptied, 7 materials became 41 | kept, 7 |
| Stars a material lower in the list | list thrown to the top (900 → 0) | kept |
| Opens a material's products, then steps the line | fold closed | kept open |
| Zooms the chart, then switches a layer | zoom lost (1100–1200 → 730–1634 kg/m³) | kept; "Zoomed in · Show all" on the chart |
| Presses a material's name in the list | chart zoomed to it; its way back under the chart, off screen | picked out, the rest fade; nothing moves; "Picked out: … ×" on the chart |
| Opens a product from the list | list to the top, the page shifted | list and its rows where they were; inspector under the list |
| Turns estimates on for the beam (Include uncertain) | 40 dashed boxes over 14 products, 6 of failing materials | 21 faint washes, none of a failing material; the picked one outlined |

`npm run ui:check` now holds the search, the open fold, the zoom and the pick ("ashby-keeps-place"); `evidence/layout-d109.json` is every scenario's
layout; `visuals/d109-*` the screens (the beam at 1440, 1024 and a phone, the rail hidden, material ranges, scope-only
ranges, estimates, a pick with a zoom); the full set is in the package's `implementation-2026-09-29/visuals-d109/`.

**Layout.** The controls are three rows (Draw, Also, Line) and the axes a bar across the top of the chart. At 1440 × 900
with the rail hidden the plotting area is 798 × 450 at y 390; at 1024 × 768, 902 × 395 with the results under it.

## Third revision: coarse to fine, one shape per filler, details in place (D110)

The owner asked for the published view to keep only the typical values, under a name that says what it is, with the test
pairs as a rarely used option; for the order typical, ranges, products; for shape to mean filler on every view; and for the
right-hand panel to stop getting messy when marks are pressed one after another.

Pressing six marks in a row on the D109 lens (headless Chrome, mouse events on the chart, scope and print gates, the beam
goal): each press left one more material's product list open (0, 1, 2, 3, 4, 5); the list's scroll went 1199, 1064,
2242, 278, 3372; the details sat in an 88 px box at the bottom of the panel, under the status bar. After D110 the same six
presses leave no fold open, the details replace the list and are swapped in place, and **← Ranking** returns the list with
the picked material's row in view. Draw now reads *Material typicals | Material ranges | Products*; the test pairs are under
More. `npm run ui:check` presses marks with the mouse and holds this. Screens: `visuals/d110-*`.

## Fourth revision: one rule for every view (D111)

A final pass over Material typicals (seven questions and settings, three screen sizes, both themes) found it still drawn
by the chart's pre-D107 rules: its list under the chart, its legend beside it, its own height, a frame stretched to the
whiskers, stray digit tick labels, two banners, notes always open, no Line row. Switching views now changes the marks and
nothing else: measured, the plot sits at the same place and size in all three views. Screens: `visuals/d111-*`.

## Fifth revision: one dot per material (D112)

The owner asked whether Material typicals and Material ranges differ and serve their purposes. They stand for different
things, and the drawing hid it: both drew a box and whiskers, typicals' over every product of the material, dry and as
printed, ranges' over the products that pass, in the state asked. In the H2C beam PLA's typical stiffness is 2.58 GPa,
its box 1.8 to 2.9 over 43 products, while the one PLA product passing 3 GPa is at 4.2. Material typicals now draws one
dot per material and nothing around it; pointing at a dot says it is the whole material, what the median rests on, and
how many of its products pass, "see Material ranges", and the line under the chart links there. `npm run ui:check`
fails if a typicals view draws more dots than materials, a spread around them, or a dot without that note. No verdict,
ranking or count moved.
