# The figures, reimagined: the data-visualisation proposal

> **Working proposal** (2026-10-17), the data-visualisation expert's part of the pages-reimagined round
> ([BRIEF](../BRIEF.md)). Prototypes from real data: [prototypes/M001.html](prototypes/M001.html) (PLA, the largest),
> [prototypes/M110.html](prototypes/M110.html) (PCTG-GF, the thinnest), [prototypes/M073.html](prototypes/M073.html)
> (PPS-CF, the median), made by [prototypes/make.mjs](prototypes/make.mjs) through the facts layer; screenshots in
> [shots/](shots/) (`now-*` today's pages, `proto-*` the prototypes, light and dark).

## In one screen

Today a page draws up to nine figures, and each restates the material's own spread in a different form (rank tracks,
zoomed maps, dumbbells, a beeswarm, a ladder, a histogram over bars, a price strip, a scatter). Each compares the
material with all ~100 materials or with the two that have the most products, never with what an engineer would buy
instead, and the marks for values *not* compared are drawn as loudly as those that are. It reads as bookkeeping.

The proposal: **five figures in one visual language**, each answering one question, all built from the same marks (a
tick for a median, a bar for the middle half, a hairline for lowest to highest, a dot for a product), one data colour
for this material, grey for everything else, and one rule for thin data.

| # | Figure | Question it answers | Replaces |
|---|---|---|---|
| 1 | **Against its alternatives** (top of the page) | How does it compare with what I'd buy instead, and where do those sit among all materials? | rank tracks 2.1; the "Against PETG / ABS" lines |
| 2 | **Among all materials**: two maps, fixed frames | Where is it in the landscape: stiffness against strength, heat resistance against price? | maps 3.1, 4.2; scatter 10.2 |
| 3 | **Its products**: linked dot strips | How do its products spread, and which stand out? | impact plot 3.3; price strip 10.1 |
| 4 | **Across the layers**: Z against XY | What does a part lose across the layers, and is that usual? | dumbbells 3.2 |
| 5 | **Every temperature on one axis** | What does printing it on the H2C take, and how hot can a part get? | heat ladder 4.1; print windows 5.1 |

The material is set against **five alternatives chosen by rule** (the same polymer filled or not, the most documented
materials of about the same heat resistance, one step above), named and linked to their pages, so the figures also
carry the navigation between materials. Hovering a product lights it in every figure; hovering a material lights it in
figures 1, 2 and 4. Every figure has a table twin.

**Constraints to revisit.** (1) The one scale rule (`scales.js stripScale`) starts a linear dot strip at zero, which
turns PLA's 1,170–1,330 kg/m³ densities into one blot; dots need no zero (add `dotScale`). (2) The toughened colour
`--claim` (purple) is indistinguishable from the accent for a deuteranope (CVD ΔE 1.9 light, 3.3 dark; the floor is 6);
replace it with a validated orange. (3) The alternatives rule is new (display only, by rule); its choices, such as
PLA's "PLA blend", deserve one owner read.

## 1. Today's figures

| Figure (PLA's numbers) | Question | Answers it? | Why not |
|---|---|---|---|
| 2.1 Rank tracks | Where does each value sit among materials? | Barely | A percentile axis with *values* at its ends (7 … 145) reads as a value scale and is not one; grey on grey; compared with TPUs and PEEK alike |
| 3.1, 4.2 Maps | Where does it sit, strength against stiffness? | Partly | The frame zooms per page, so nothing is learnt once; the named neighbours are arbitrary (PLA Marble, PLA-ESD); HDT against strength is not a selection chart |
| 3.2 Dumbbells | How much is lost across the layers? | Indirectly | A ratio shown as two positions; 38 named rows for PLA; three scales |
| 3.3 Impact plot | How tough are its products? | Confusingly | 45 marks drawn, 14 counted; seven legend entries; hollow and grey marks dominate |
| 4.1 Heat ladder | How hot can a part get? | Alone | Unrelated to the print temperatures or the chamber; one-product rungs on thin pages |
| 5.1 Print windows | Which settings do products agree on? | Hard to read | 169 one-pixel bars under a step histogram for PLA; a jagged six-window histogram for PPS-CF |
| 10.1 Price strip | What does it cost? | For 9 materials | The median material has **one** priced product |
| 10.2 Strength against price | Does paying more buy strength? | No | PLA's 26 points show no relation; one or two points elsewhere |

Throughout, one accent blue does every job (this material, its products, Z, bands, histograms), so nothing leads.

## 2. What the data holds (76 materials with a page)

- **Products per material:** median 7 (quartiles 4 and 12); 47 of 76 have 3 to 9; PLA 195.
- **Key properties with three or more compared products:** the median material has **4 of 17**. The figures must work
  at n = 1 to 5, not only at n = 70.
- **Medians known (of 76):** density 76; tensile strength XY 68 (n ≥ 3 for 44); elongation 68; price 68 (n ≥ 3 for
  **18**); Tg 67; HDT 0.45 65 (45); modulus XY 65 (36); strength Z 50 (20); notched Charpy 43 (**11**); notched Izod 33
  (4). Eight materials have tensile values only as published (orientation not stated); 13 have Charpy only so.
- **XY and Z on one product from one sheet** (`shareOf`'s rule): none for 29 materials, 1–2 products for 27, 3–9 for 17,
  ten or more for 3 (PLA 38, PETG 14, PLA Silk 11).
- **Print windows counted** (own or shared sheet): nozzle and bed for all 76 (median 6 products); chamber for 53
  (median 1); drying temperature for 74 (median 4).
- **Annealed against as-printed on one product:** three or more only for PLA (6), ABS and PPA-CF (3). **Conditioned
  against dry:** no material reaches three. Figures for either are **wishes**; they stay as marks and in tables.
- **Alternatives by the rule below:** PLA → PLA-CF, PLA-GF, PETG, PLA blend, ABS; PCTG-GF → PCTG, PCTG-CF, PETG-CF,
  ABS-CF, ASA-CF; PPS-CF → PPA-CF, PEEK-CF, PEI-CF, PPA-GF, PA6-GF; PC → PC-CF, PC-GF, ABS, ASA, PEI.

## 3. The five figures

All read `dist/db.json` through `materialContext(db, id, { showEstimates: true })` and its siblings, at build time, and
decide nothing.

### Figure 1. Against its alternatives

- **Form.** A range chart in small multiples: a row per material (this one first, on a pale accent band, then five
  alternatives), a column per key property on its own scale (`PEER_COLUMNS`: tensile modulus XY, tensile strength XY,
  strength Z, notched Charpy, HDT 0.45 MPa, price). A cell: hairline lowest to highest, a bar for the middle half, a
  3 px tick at the median; this material in the accent with its median printed, the alternatives in grey ink. A faint
  accent guide runs down each column at this material's median. Above the rows, a **rug** of every material's median
  (a hairline tick each, this one's in the accent, those off the scale counted at its ends) replaces the rank tracks.
- **Data.** `materials[].headline[key].{known, value, spread}` and `materials[].summary[key].{n, q1, q3, min, max,
  asPublished}`; `rankTable(db)[key].entries` for the rug; `peerSet` (new) for the rows; `pageOf` for the links.
- **Statistic and scale.** The build's medians and quartiles; `stripScale` over the rows (linear from zero, so "half as
  stiff" is half the distance; logarithmic past ten times).
- **Thin data.** n ≥ 4: hairline, bar, tick; 2–3: hairline and tick; 1: tick; only as published: hollow circles (grey for
  an alternative); nothing: an en dash; a column no row has is dropped. On PCTG-GF's page its modulus and strength are
  hollow circles, HDT and price ticks, and the alternatives fill the picture.
- **`peerSet` (display only).** Of the materials with a page, without special classes (`variantClass`), supports, ESD
  grades, and flexible with rigid (`facets.flexible`): up to two of the same `basePolymer`, the other fibre state first
  (`facets.fibre`); the two with the most products of the same fibre state whose HDT 0.45 median lies within
  max(20 °C, 20 %); the most documented one above that; filled to five by nearest HDT.
- **Interaction.** A cell or name lights that material in figures 1, 2, 4 (`data-mat`); the tooltip gives median, middle
  half, range, n; names link to pages.
- **Caption.** Title: "Against {alternatives}, {M} has the highest {p} and the lowest {q}", said only with a margin of
  5 % or 3 °C to the next (the `compareMedians` threshold), else "{M} against {alternatives}". One how-to-read line.
  Table twin: median (middle half) · n per cell.

### Figure 2. Among all materials

- **Form.** Two panels: (a) tensile strength against tensile modulus, the Ashby chart every materials engineer reads;
  (b) HDT 0.45 against price, which is where "cost against performance" can be answered (across materials, since the
  median material has one priced product). Every other material's median a small grey point; the alternatives larger,
  in ink, named; this material's median an accent dot with a surface ring, its middle halves as a cross, its products
  as pale accent points.
- **Data.** `rankTable(db)` for both keys, joined by material; `spreadEntries(m, c, key)` (level `comparable`, not
  `variant`) for the products; `summary[key].q1, q3` for the cross.
- **Fixed frames.** One frame per kind (rigid or flexible), the same on every page, so a reader learns it once: the scale
  rule over the kind's materials without the two furthest out at each end (pinned to the edge, values on hover), where
  that keeps the axis's kind. Today: modulus 0.5–10 GPa log, strength 5–200 MPa log, price 20–500 CAD/kg log, HDT
  50–250 °C.
- **Thin data.** Only as published on both axes: a hollow ring, "{M}, as published". One axis missing: the alternatives,
  and a line on what {M} lacks. Neither panel: the figure is dropped; figure 1 carries the comparison.
- **Labels.** This material first, then the alternatives, at the first of eight places that overlaps no name, point or
  cross (today's `placeLabels`).

### Figure 3. Its products

- **Form.** Small multiples of dot strips, one row per key property a product has a value for (`STRIP_KEYS`: strength
  XY, modulus XY, strength Z, elongation, notched Charpy and Izod, HDT 0.45, Tg, density, price), each on its own scale.
  One dot per product, stacked where they would touch; the compared products' middle half a pale band, their median a
  line; the lowest and highest compared products named (all of them under four). The drawer's grammar, with the
  emphasis moved to what is compared: compared values filled accent; no stated orientation hollow **grey**; special
  formulations grey diamonds, kept out of the scale and pinned at its end when far off; annealed squares; sold as
  toughened in the claim orange.
- **Data.** `spreadEntries(m, c, key)`, `dotMarks(h, e, c)`, `materials[].summary[key]`, `productNameOrId(g)`.
- **Scale.** `dotScale` (new): the scale rule, except that a linear strip whose lowest value is above half its highest
  starts at the round step below it.
- **Thin data.** "3 as published, not compared" where nothing is compared; no band under four compared.
- **Interaction.** The point of the figure: a hovered dot lights that product in every row, in figures 2 and 4 and in the
  Products table (`data-grade`, today's mechanism), so "strong but brittle" shows at once. The Products table is its twin.
- **Caption.** "{M}'s {n} products spread most in {p}: the middle half runs {q1}–{q3}" (largest q3/q1 among keys with
  four compared, `widestSpread`).

### Figure 4. Across the layers

- **Form.** Three square panels (tensile strength, modulus, elongation): each product that publishes both, from one
  sheet, at (XY, Z) on one scale for both axes; rays of equal share at 100, 75, 50, 25 %, so the loss is read as the
  distance below the 100 % ray; the median share as an accent ray. Under each, a 0–120 % strip with this material's
  median share and each alternative's, and the shares as a sorted line ("ABS 73 % · PETG 68 % · **PLA 62 %** · …").
- **Data.** `layerPairs(hXY, hZ, byKey, c)`; for alternatives, the median of `shareOf` (new `layerShareOf`).
- **Thin data.** Any pairs: the scatter (three or fewer named). None for a property: that panel shrinks to its strip.
  None at all (29 materials, PCTG-GF among them): one row of three strips, titled "No {M} product publishes values
  across the layers; its alternatives keep these shares".
- **Caption.** "Across the layers, {M} keeps {s} of its flat tensile strength (median of {n} products)". Today's XY/Z table
  is its twin and stays.

### Figure 5. Every temperature on one axis

- **Form.** One linear °C axis, two groups of rows. *Printing it on the H2C:* nozzle, bed, heated chamber, each a strip
  whose every degree is shaded by the share of counted products that accept it (one hue, light to dark), the span more
  than half accept outlined, the H2C's limit a solid ink line on that row with the range beyond washed grey; drying a dot
  per product with its median. *In service:* HDT 1.8 and 0.45, Tg, and Vicat and melting as published (grey), drawn as
  figure 1's cells. The relation is the insight: PLA's Tg of 59 °C against the chamber's 65 °C; PPS-CF's nozzle window
  running into the H2C's 350 °C.
- **Data.** `printWindows(products, axis)` (`runs[].k / n` is the shade; `most`, `ends`, `states`, `limit`),
  `dryingStats(products)`, `heatLadder(m, c, LADDER_EXTRA)`, `limitOnScale`. No new statistic.
- **Thin data.** Three or more windows: shade and outline. One or two: solid windows, no "most" (PCTG-GF's bed: one
  sheet's 90–110 °C, and two "at least 50 °C" drawn as hairlines from their end). None: the row says what products state
  ("none needed: 3 of 3 products"). A limit off the scale is written at the row's end.
- **Caption.** "{M} prints at {nozzle most} on a {bed most} bed, and a part softens near {HDT 0.45}" ("most" from three
  windows). Per-product windows stay in the Products table.

## 4. Tables and numbers

- **Display precision** (`fmtDisplay`, display only): whole °C (59 °C, not 58.9); whole CAD/kg and per cent from 10;
  otherwise three significant figures (1,240 kg/m³, not 1,221.75). Stored values are untouched and exact on the
  records page.
- **A median always carries its n** ("45.5 MPa · 71 products"); the range beside it is the middle half; lowest to highest
  goes to the tooltip and the twin.
- **Comparisons:** ratios for every unit but °C ("1.5 times", "50 % higher"), differences for °C ("15 °C lower"), "about
  the same" within 5 % or 3 °C.
- **Products table:** right-aligned tabular figures at the same precision; values not compared grey with the hollow
  mark; drop the "quarter in column" shading, which reads as an unasked heat map (figure 3, linked to the rows, does it).
- **Keep as tables:** the XY/Z table, "Other properties on file", sources and publishers, the guide row. A property with
  one or two values gets no figure.

## 5. Colour and mark tokens

Data tokens beside `app/css/tokens.css` (the shared tokens stay), checked with the dataviz validator
(`validate_palette.js`, Machado CVD model):

| Token | Light | Dark | Job |
|---|---|---|---|
| `--dv-self` | `#1d65a3` | `#3f8fd0` | this material. Today's accent `#1f5f8b` is under the chroma floor (0.096) and `#6fb3e0` above the dark lightness band (0.74) |
| `--dv-claim` | `#b4540a` | `#d4732f` | sold as toughened. Against `--dv-self`: CVD ΔE 20.6 light, 22.1 dark, every check passes |
| `--dv-self-band` | self 30 % on bg | same mix | this material's middle half |
| `--dv-peer`, `--dv-peer-band` | `--ink-2`; ink-3 34 % | same | an alternative; values as published |
| `--dv-ctx` | ink-3 48 % on bg | same | every other material; values not compared |
| `--dv-grid` | ink-3 20 % on bg | same | gridlines, rays: solid hairlines |
| `--dv-beyond` | ink-3 13 % on bg | same | past the H2C's limit |
| shade | `--dv-self` at 12–100 % | same | share of products accepting a temperature |

**Marks:** a 3 px rounded tick is a median, a 10 px bar the middle half, a 1 px hairline lowest to highest, a 7 px dot
with a surface ring a product; hollow is not compared, a square annealed, a diamond a special formulation; the H2C's
limits are solid lines with a wash beyond, not dashes. No status colour and no data-coloured text in a figure.

**Accessibility.** Each SVG is `role="img"` with a `<title>` (the finding) and `<desc>`, and a table twin; identity is never
colour alone (this material is first, labelled, bold; the claim is named in tooltip and twin; shapes for annealed and
special formulations); tooltips never gate a value; the alternatives' names are links, so focusing one lights that
material; under `forced-colors` marks fall back to `CanvasText` and shapes carry the meaning.

## 6. What to cut

Rank tracks (2.1); the zoomed maps and the HDT-against-strength map (3.1, 4.2); dumbbells (3.2); the impact plot as its
own figure (3.3); the heat ladder (4.1); the print histogram and bars (5.1); the price strip as its own figure (10.1); the
strength-against-price scatter (10.2); the "Against PETG / ABS" lines; the landmark ticks (PLA, PETG, ABS on every page);
the purple claim colour; the Products table's quartile shading; numbering like "Figure 10.2" (five figures, 1 to 5).

## 7. Implementation sketch

- **`app/js/ui/material-stats.js`** (display only): add `peerSet(db, m, ix, { max })`, `materialCell(m, key)`,
  `layerShareOf(db, mat, a, b)`, `peerContrast(m, peers, keys)`, `widestSpread(m, keys)`, `mapFrame(db, xKey, yKey,
  kind)`; retire `propertyProfile`, `percentileAmong`, `landmarkMaterials` and `materialMap`'s window once unused. The
  prototype's `make.mjs` holds working versions of each.
- **`app/js/ui/scales.js`:** `dotScale(values, unit)` beside `stripScale`.
- **`app/pages/figures.js`:** `PEER_COLUMNS`, `MAP_PANELS`, `STRIP_KEYS`, `LAYER_PAIRS`; keep `LADDER_EXTRA`; drop
  `MATERIAL_MAPS`, `FIGURE_PAIRS`, `PROFILE_GROUPS`.
- **`app/pages/charts/`:** new `peers.js` (1), `strips.js` (3, from `dotplot.js`), `layers.js` (4), `temperatures.js` (5);
  `map.js` reworked for fixed frames (2); `marks.js` takes the new classes; delete `profile.js`, `dumbbell.js`,
  `ladder.js`, `windows.js`, `scatter.js`. Production keeps the fluid drawing (x in per cent, y in px); the prototype's
  fixed viewBox is a shortcut.
- **`app/pages/sections/`:** 1 in `key-figures.js`; 2 beside it or in `mechanical.js`; 3 at the head of `products.js`;
  4 in `mechanical.js`; 5 joining `thermal.js` and `printing.js` (placement and order are UX's and content's);
  `price.js` keeps words and table, no figure.
- **`app/pages/assets/`:** `--dv-*` tokens in `pages.src.css`; `page.js light()` extended to `data-mat`.
- **Checks.** `pages:check`: figure 1's cells equal `materials[].headline` medians and n (`data-v`), figure 3's dots equal
  `spreadEntries`' count per key, figure 5's shades equal `printWindows` runs, every number in a title comes from the
  facts. The interface probe adds M001, M073, M110 in light and dark. CI runs the validator over the `--dv-*` pairs.
- **Split.** (a) statistics, `dotScale`, unit tests, first; then in parallel (b) figures 1–2, (c) 3–4, (d) 5; (e) tokens,
  linking, twins, checks. Weight: PLA's prototype is 300 KB without its font against today's 603 KB page; figure 3's
  tooltips should read names from the page's existing product-name map, not repeat them per mark.

**Wishes the data cannot feed today:** an annealing-gain figure (three materials qualify), dry against conditioned
(none), reference service temperatures on figure 5's axis (no table holds them), creep or fatigue curves (no PLA
product publishes either).
