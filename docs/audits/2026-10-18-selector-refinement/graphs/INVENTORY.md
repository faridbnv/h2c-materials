# Graphs: inventory (Part A)

> Graphs expert, selector-refinement round, 2026-10-18. What is drawn, what each mark means, and what must survive.
> Shots: `shots/base/` (baseline) and `graphs/shots/` (mine: comparison headings opened; `page-*` = material pages).

## What the drawer draws

| Where | Form | Evidence |
|---|---|---|
| Mechanical: *Tensile*, *Flexural*, *Impact tests*; Thermal: *Heat deflection and glass transition* | HTML dot strips (`detail.js` dotRow, `scales.js` stripScale/stack). Rows of one unit share one scale (XY above Z); ticks and unit under the last row ("%, log scale"). Band = middle half (`--accent-soft`), 2 px line = median. Then the key, a hint line, an n/median/middle half/range table with "Also drawn, not in the median: …" under each row, closed notes, the tally, every record | `graphs/shots/pla-mech-01..05`, `abs-impact-01`, `abs-heat-01` |
| Printing: *Print temperatures across products* | The same strips: nozzle/bed/chamber lowest and highest, drying. H2C limit = red dashed line (`--fail`) when near, otherwise said on the axis ("H2C limit 350 °C, above the scale") | `pla-print-01..02`, `abs-print-01` |
| Overview: Key properties | Text, no graph: "1,240 kg/m³ 1,170–1,329 · 158", the table's cell form | `base/drawer-pla-overview-02` |

All headings are **closed** by default: the Mechanical tab's first screen shows no graph (`base/drawer-pla-mechanical-01`).
The **key sits under the last graph** of a heading: in PLA's tensile heading it is ~500 px below the first dot row, off
the first screen of the opened heading (`pla-mech-01` has no key; `pla-mech-02` does).
**Stacking saturates** at 6 rows (`scales.js` MAX_ROWS): PLA's 106 modulus dots pile into a solid block, and print
temperatures (5 °C steps) form equal columns, so a column's height stops counting products (`pla-print-01`).
**Two counts per row**: label "106 products" (drawn) beside table n = 55 (in the median), with no word linking them.
**Dark**: the middle-half band (`#1b3346` on `--surface-2`) nearly vanishes (`abs-impact-dark-01`).

## Marks with more than one meaning

- **Hollow**: drawer Mechanical = no stated orientation; Thermal = no stated test load; Printing = *from the Bambu Lab
  Filament Guide* (a source, not a test condition). Ashby: could not be settled (`decision.js:560`), sold as toughened
  (`:631`), mixed conditions (test pairs). Pages: as published (light grey, not the drawer's accent outline).
- **Filled dot**, keyed four ways: "orientation stated (XY or Z)", "(XY)", "compared", "the product's data sheet".
- **Square / diamond**: drawer and pages = annealed / special formulation; Ashby = glass fibre / carbon fibre (`format.js:509`).
- **Same mark, other words, drawer vs page**: diamond "special formulation" vs "added filler or additive, kept out of the
  median"; "in the median / compared" vs "ranked"; H2C limit red dashed vs solid ink line with the range beyond washed.
- Pages too: `KEY.peerCell` and `KEY.pubCell` (kit.js) are one graphic for "an alternative" and "as published".

## Table and lenses

Table legend, one line above the rows: "— not published · 2.3 1.0–3.0 · 27 median and range · 1.2 ● one measurement
· \* published, not comparable · ≈ close to the limit · ¤ converted · n/a". Cell: median large, `lo–hi · n` small, at
times a third line ("annealed median", even on ABS density) (`base/main-indoor-table-01`). Ashby: colour = family,
shape = filler, key under the chart (`base/lens-ashby-01`). Parallel: axis chips carry "64/87" counts.

## How the pages draw the same things (`app/pages/charts/`)

The key is **above** the plot and the title states the finding ("PLA's products spread most in elongation…"). There is
one scale per property, zoomed with chevrons past its ends. Marks are 7 px, hollow ones light, and the lowest and
highest products are named. The label carries one count, "71 ranked of 139 shown" (`page-pla-products-mechanical-01`).
Temperatures: windows are shaded by the share of products that accept each degree, the most-accepted span is outlined,
and the limit is a solid line with the range beyond it washed (`page-pla-temperatures-01`).

## Keep candidates

| # | What, where | Why good | Loss noticed by |
|---|---|---|---|
| G1 | **One scale per unit, XY above Z** (also Charpy above Izod; HDT 0.45, 1.8, Tg) | The XY–Z gap reads at a glance (45.5 vs 30.6 MPa) | `pla-mech-01` after shot |
| G2 | **Every dot opens its record; hover lights the product's other dots** | The graph is a way into the evidence (K11) | `drawer-comparisons.test.js`, hand test |
| G3 | **What is left out is counted and ranged**: "Also drawn, not in the median: 39 with no stated orientation (1.44–4.78)…" | Exclusions visible, never silent | `13-drawer-*.txt` |
| G4 | **A key only for the marks drawn**; no band/median/graph without the values for one ("No median: …") | No empty legend, no spread from one point | text views |
| G5 | **Log scale named on the axis**, 1-2-5 ticks, only for wide spans | Elongation and impact are readable | `pla-mech-02`, `abs-impact-01` |
| G6 | **H2C limit drawn only where it is near the values**, otherwise said on the axis | PLA's windows are not squeezed against 350 °C | `pla-print-01` |
| G7 | **Cell form `median` / `lo–hi · n`** in the table *and* the drawer's Key properties; legend said once | One number form across the main screens (P4) | ui-fuzz cell check |
| G8 | **Toughened in its own claim colour, also in words**, distinct in dark | Never colour alone | `abs-impact-dark-01` |
