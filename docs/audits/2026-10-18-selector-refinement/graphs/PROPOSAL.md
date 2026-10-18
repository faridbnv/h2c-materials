# Graphs: proposal (Part B)

> Graphs expert, selector-refinement round, 2026-10-18. Answers REVIEW-0 line 8 and findings 8, 9 and 10, against the
> keep register. Mocks are made from CSS and scripts in `graphs/mocks/` and shot with `shots.mjs`. Nothing in the code
> or the data has changed.

## Vision

The drawer's graphs already use the right grammar. The reviewer calls them "how scatter between products should be
shown" (K18, K30–K35), so this proposal changes how they are drawn, not what they draw. Today a reader pays three
costs to read one:

- **They scroll to learn what a mark means.** The key sits under the last graph.
- **They reconcile two counts.** The label says "106 products" and the table says n = 55.
- **They are misled by column heights.** Past six stacked rows, dots overlap. PLA's 76 products at 190 °C and its 12
  at 180 °C draw columns of the same height.

The material pages already solved each of these: the key above the plot, one count ("55 ranked of 106 shown"), hollow
marks drawn light, the middle half outlined, and the H2C limit drawn as a solid line with the range beyond it washed.
The drawer should **borrow the pages' grammar** and keep its own strengths:

- one scale per unit with XY above Z;
- every dot is a button to its record;
- what is left out of a median is counted, with its range.

One mark then has one meaning from drawer to page. **Hollow means "shown, not ranked"**, and the key gives the reason:
no stated orientation or load, or a value from the Bambu Lab Filament Guide. A count becomes a shape you can trust.

**To cut or quiet:**
- **Cut**
  - the red dashed limit line: a fail colour on something that is not a failure;
  - the second count in each row label;
  - the four phrasings of the filled dot, replaced by the pages' words;
  - the table's third line, "annealed median";
  - the unreadable ¤.
- **Quiet** the hollow marks. They are half of PLA's dots and drown the ranked ones.

**Left alone:**
- **The comparison headings stay closed by default** (K17). Only Print temperatures opens, as the Printing tab's
  answer.
- **Ashby's shapes** (shape = filler, fill = status, D110). Ashby's square and diamond mean glass fibre and carbon fibre;
  in the drawer and on the pages they mean annealed and added filler. Changing either breaks K39 or D110. This round
  puts each graph's key in view of its plot. Whether one shape vocabulary should run across the lens, the drawer and
  the pages is for the owner (an OPEN-PROBLEMS entry).

**The main page** gets only fixes for what misleads: Compare's bars on a log track, Parallel's flattened axis, Ashby's
clipped title, and the table's caption and glyph.

## Changes, ranked

Mocks:

| Mock | Before | After | Changes |
|---|---|---|---|
| **M1**: strips | `graphs/shots/pla-mech-01.png`; dark: `graphs/shots/abs-impact-dark-01.png` | `graphs/shots/mock1-pla-tensile-after-01.png`; dark: `graphs/shots/mock1-abs-impact-dark-after-01.png` | 1–4 |
| **M2**: print temperatures | `graphs/shots/pla-print-01.png`, `-02.png`; `review/shots-0/drawer-pla-printtemps-01.png` | `graphs/shots/mock2-pla-print-after-01.png`, `-02.png` | 1, 2, 5 |
| **M3**: table marks | `shots/base/main-indoor-table-01.png` | `graphs/shots/mock3-table-after-01.png` | 7 |

To reproduce: `--css graphs/mocks/strips.css --eval "(async()=>{ $(cat graphs/mocks/strips.js); return await mock('M001','Mechanical','Tensile tests'); })()"`,
and `graphs/mocks/table.{css,js}` for M3.

### 1. Column heights that count (P3; REVIEW-0 line 8, overplotting; touches K18, K30) · M · M1, M2

- **What changes.** Stacking has no row cap. Where the rows would pass the track's height (about 80 px), the vertical
  pitch tightens, so a column's height stays in proportion to the number of products it holds. A column of identical
  values taller than its dots can show apart carries its count above it. This matters for print settings, which come
  in 5 °C steps.
- **What M2 shows.** PLA's nozzle, lowest is 76 products at 190 °C; its bed, highest is 110 products at 60 °C. Both had
  been equal 6-high columns.
- **What stays.** Dots shrink to 7 px, as on the pages. Every dot stays a `<button>` carrying its `data-row`,
  `data-profile` or `data-guide`; only `bottom` and the track height move.
- **Feeds.** `scales.js` `stack` (MAX_ROWS, DOT_GAP; used by the drawer alone, so no page moves) and `detail.js` `dotRow`.
- **Risk.** Low. The tests read classes and data attributes, not positions.
- **For the build.** M2 shows two artefacts to fix: give the count a backing so the median line does not cross it, and
  drop the stray dots after "Drying" in the head.

### 2. The key above the plot, in the pages' words; hollow has one meaning (P3, P4; line 8: key under the last graph, hollow's meanings; K32, K39) · S · M1, M2

- **Position.** Each heading's key moves above its first graph.
- **Words.** The key uses the pages' `KEY` words: "a product", "as published: orientation or load not stated",
  "measured after annealing", "added filler or additive, kept out of the median", "sold as toughened (maker's
  statement)", and "middle half and median" as one item.
- **Print temperatures.** "a product's data sheet", "from the Bambu Lab Filament Guide, not counted", and "the H2C's
  limit, and beyond it".
- **Unchanged.** The key still lists only the marks drawn (K32).
- **The diamond's words.** "Special formulation" becomes the pages' "added filler or additive"; the words expert
  confirms.
- **Feeds.** The `key` arrays in `drawerComparisons` and `printTemperatures`; `filledWords` and `asPublishedWords`
  stop reaching the key.
- **Risk.** `print-spread.test.js:499` splits on `<p class="imp-key` to find the axis text before it, so the test must
  change with the move. `drawer-comparisons.test.js:206` matches the key anywhere and keeps passing.

### 3. One count per row, the pages' form (P4; line 8, "106 products" against n = 55; K31) · S · M1

- **The label.** "106 products" becomes "55 ranked of 106 shown". Print temperatures read "169 counted of 194 shown".
- **The table.** The `n` column is headed "Ranked" ("Counted" for print).
- **Unchanged.** "Also drawn, not in the median: …" keeps its counts and ranges (K31). The words expert may make it
  "Shown, not ranked: …".
- **Feeds.** `m.summary[h.key].n` and `entries.length` in `dotRow`.
- **Risk.** None for the checks. "Ranked" is the pages' word for "in the median"; the words expert confirms it beside
  "a number nobody measured is never ranked".

### 4. Light hollow marks, an outlined band visible in dark, the pages' tokens (P4, P3; line 8, dark band; K35, K39) · S · M1

- **Marks drawn but not ranked.** Hollow and diamond marks are outlined in the pages' `--dv-light`, so ranked dots carry
  the eye.
- **Middle half.** A 13 % tint of `--accent` with 50 % edges, as on the pages. In dark it was `#1b3346` on
  `--surface-2` and nearly invisible; M1 dark shows it restored.
- **Unchanged.** The claim orange is untouched (K35).
- **Feeds.** The `.imp-*` rules in `app.css`.
- **Better still.** Move the pages' `--dv-*` data tokens from `figures.src.css` into `tokens.css` with the same values,
  so the drawer and the pages draw from one set.
- **Risk.** Guardrail 6: `tokens.css` is shared, so the pages' CSS bundle changes but their look does not. Run
  `pages:check`.

### 5. Print temperatures: open, one headed group per setting, the limit as the pages draw it (P3, P4; line 8, chamber limit unreadable, closed by default; K10, K33) · M · M2

- **Open by default.** The heading opens as the Printing tab's answer.
- **One headed group per setting.** Each group gets a head line, such as "Heated chamber · °C · the H2C reaches 65 °C,
  drawn", a rule and space before the next group. The reviewer read the chamber's limit against the bed axis directly
  above it; a group head removes that ambiguity.
- **The limit.** A solid ink line with the range beyond it washed, the pages' `KEY.limit`. It replaces the red dashed
  `--fail` line.
- **Unchanged.** "Above this scale" still applies when the limit is far (K33).
- **Feeds.** `printTemperatures`, `printAxisUnit` and the `open` argument of `makerBlock`.
- **Risk.** `print-spread.test.js:502–524` reads the axis text and the `imp-limit` and `imp-limit-key` classes. Keep
  the classes and move the test's axis read to the head line.

### 6. The graphs' tables print numbers as the pages do (P1, truth; coordinates with coherence on finding 7; K34) · M · no mock

- **The defect.** The pages print `fmtDisplay` (°C as integers, % and CAD/kg ≥ 10 as integers, otherwise 3
  significant digits). The drawer prints compiled values:
  - PLA elongation (XY), middle half: drawer "4.12–12.3" (`pla-mech-02`), page title "4.12–12 %";
  - ABS HDT at 0.45 MPa, range: "78.9–118" in the drawer, "79–118" on the page.
- **What changes.** The comparison and print tables' median, middle half and range use `fmtDisplay`/`spanDisplay`,
  moved verbatim into `format.js` so both surfaces import one function.
- **Unchanged.** The records ("every result, with its document") keep the sheet's own figures.
- **Guard.** A number is never rounded across a requirement on its property (`fmtAgainst`'s rule; `format.test.js`).
- **Risk.** Guardrail 6: the import changes, page output does not. The main table keeps its own rounding: ui-fuzz I5
  reads its range ends against thresholds.

### 7. The table's marks: annealed median as the square, currency named, legend on one line (P5, P4; F8, F10; K28, K34, K39) · S · M3

- **Annealed median.** The third line "annealed median" becomes a 6 px square on the median's line, the drawer's and
  the pages' annealed mark. The legend gains "2.2 ■ annealed median".
  - The rows lose a line, so ABS's row is 8 px shorter.
  - The legend's words, and the sentence for "Values judged: as printed, dry", are the words expert's.
  - The square is an empty span, so the cell's `innerText` loses "annealed median" and gains nothing. ui-fuzz's
    `lo–hi ·` read is untouched.
- **Converted prices.** ¤ becomes the currency it was converted from ("USD"), from `converted.currencies`, and is used
  the same way in the drawer's Price tab (`detail.js:1262`). This adds "USD" to the price cell's `innerText`: check
  ui-fuzz's price probe.
- **The legend on one line.** M3 shortens its words but still overflows by about 110 px ("n/a not applicable" is cut
  off). The words or UX expert finishes it: shorter words, or the rare marks behind one fold.
- **Feeds.** `typicalStateMark`, `convertedMark` (`format.js`; no page uses it) and the legend in `table.js`.

### 8. Compare: a value tick, not a bar, on a log track (P5; F9; K43 untouched) · S · no mock (before: `review/shots-0/lens-compare-3-01.png`)

- **What changes.** On `.cmp-prop.log-track`, `.fill` becomes a 3 px tick at the value, drawn over the products'
  range, which is already drawn as `.spread-bounds`. On a log track, length from the low end is not proportional to
  the value; PLA and PLA Silk looked alike.
- **Unchanged.** Linear tracks keep their bars (INTERFACE's reason holds there).
- **Feeds.** CSS, plus one line in INTERFACE "Compare".
- **Risk.** None for the checks.

### 9. Parallel lines: a log axis by the Compare rule (P5; F9) · S · no mock (before: `shots/base/lens-parallel-01.png`)

- **What changes.** An axis whose drawn values are all positive and span more than a hundredfold is logarithmic, as in
  Compare. Its label carries "log" under the unit. Elongation runs from about 0.8 to 400 %, and today it presses every
  other line to the floor.
- **Feeds.** `parallel.js` `scales` and `yAt`, and the tick labels.
- **Risk.** Low; a line's readout still prints the values.

### 10. Ashby: the y-axis title gets its room (P5; F9) · S · no mock (before: `shots/base/lens-ashby-01.png`)

- **What changes.** "nsile modulus (XY) (GPa)" is clipped. Give `yaxis.title` a `standoff` and the left margin it needs
  under `automargin`, then check at 1280 and 390.
- **Out of scope.** The plot starting about 440 px down is the UX expert's (the control rows).
- **Risk.** None. The legend "N of M candidates plotted…" that ui-fuzz reads is untouched.

## Not proposed

- **Mini strips for the drawer's Key properties.** If the coherence expert brings the pages' key-figure block into the
  Overview, its strip is an HTML track on the property's all-materials scale (`material-stats.js` `propertyScale`,
  the function the pages use). The drawer then draws the same band as the page, with no new statistic.
- **A new shape vocabulary for Ashby.** See the vision above.
