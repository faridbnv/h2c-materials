# Data-visualisation review: Parallel lines, and the graphs' visual language

> **Historical record** (2026-10-18): a review only. Nothing in the code or the data was changed. Screenshots are in
> this folder, taken from `dist/H2C_Material_Selector_2026-09-21_3cc2e5f2a439.html` and `dist/materials/M020.html` at
> 1280 px, light theme.

## The findings, on one screen

**Verdict on Parallel lines: keep it, and tune it. It is the right form for the wide set (30 to 90 candidates) and the
wrong one for the narrow set (5 to 15) where the trade-off is decided.** It is honest and accessible: the axis chips say
what each axis costs in candidates (`Density 87/87`, `Notched Izod 31/87`), nothing is invented for a gap, log axes follow
Compare's rule, and a line can be read by pointer, tap or Tab. As built, though, it does not answer the questions an
engineer brings to a shortlist:

1. **Lines sit below the requirement that let them in, and nothing says why.** Under *Warm environment* (HDT at 0.45 MPa
   at least 80 °C) 4 of the 33 lines are drawn under 80 °C: PLA at 55, PLA-CF at 56.3, PETG at 70, ASA Aero at 77.5. Under
   *High-stiffness fixture* (modulus at least 5 GPa) 2 of the 5 lines are under 5 GPa: PETG-CF at 3.4, PP-GF at 4.42.
   Each passes on some of its products (PETG-CF's run 1.77 to 5.23 GPa over 9 products), but the line is the median
   alone, and the requirement is not drawn on its axis (`pl-t3-02.png`, `pl-t4-01.png`). Compare draws the same
   requirement as a red upright line (`compare-t4-02.png`); Parallel lines draws nothing.
2. **The lines have no names.** With 5 candidates the reader must hover each line to learn which is which; PP-CF and PP-GF
   are both grey and cannot be told apart even then by colour (`pl-t4-02.png`).
3. **Colour carries little.** The family palette is ranked over all 152 materials, so its eight colours go to families
   such as Flexible Elastomers and Copolyesters that the rigid templates rarely draw, and ABS, ASA, Polycarbonate, PET
   Engineering, Styrenics and Polyolefins share one grey and get **six identical grey keys** in the legend (`pl-t1-02.png`).
   Ashby groups those as "Other families". PLA (`#c1622f`) and PETG (`#b5533f`) are almost the same orange-red.
4. **The axes do not follow the question.** Every template opens on the same four axes (density, modulus, elongation,
   HDT), in a fixed order. *Indoor prototype* asks only about price and opens without a price axis. Only the two ends of
   each axis are labelled, there is no cue that lower is better for density and price, and one elastomer at 0.006 GPa
   sets the *Indoor prototype* modulus axis, packing 53 rigid materials into its top third (`pl-t1-01.png`).
5. **Sparse data costs whole candidates.** Seven axes draw 25 of the 39 *Warm environment* candidates and 43 of the 87
   *Indoor prototype* ones (`pl-t3-7axes-02.png`, `pl-t1-7axes-01.png`). The counts are stated, which is right, but a
   third of the set disappears from the trade-off.
6. **The cross-lens link is missing.** INTERFACE.md says "a material highlighted in one is highlighted in all". Ashby has a
   selection (`state.selected`) and the shortlist exists; Parallel lines reads neither (`app/js/ui/parallel.js`).

**Is a parallel-coordinates plot the best form for this decision?** For narrowing 5 to 15 candidates on 4 to 8
properties with uneven data, no. How the alternatives fare:

| Form | Sparse, uneven data | Spread (range and typical) | Identity and exact reading | Verdict here |
|---|---|---|---|---|
| **Ranked strip table** (rows = candidates, columns = properties, each cell a median tick, middle-half bar and range hairline on a shared column scale, requirement as an upright line) | Best: a gap is an empty cell, nobody is dropped | Yes, natively | Yes: rows are named and sortable | **Best for 5 to 15.** The tool already draws it: the material page's "Against its alternatives" (`page-petg-02.png`) |
| Parallel coordinates | Poor: one gap drops the line | Only with extra marks | Weak above 5 lines without labels | Good for 30 to 90 lines: clusters and correlations between neighbouring axes |
| Heat table | Fair: a gap is a blank cell | No | Fair, but colour hides magnitude and needs per-column normalising | Only an overview of a large set; not needed beside Table and Coverage |
| Pareto / dominance | Poor: dominance on medians with gaps is fragile | No | Fair | Ashby already has the 2-D Pareto front; an N-property dominance count is at most a sort key |
| Radar | Worst: a gap breaks the polygon, area depends on axis order | No | Poor beyond 3 to 4 materials | Do not use |

So the narrowing job belongs to the strip table the pages already have. Bringing it into the selector, as the way Compare
draws its shortlist (rows by properties) rather than as a new lens, is the one larger move I would make later; it is
beyond this round's hour-or-two rule, so it is not in the list below. The tunings below make Parallel lines carry its
weight at both sizes. **Do not add brushing:** the filter rail owns the requirements, saves them in the scenario and
the link, and a brushed range would be a second, unsaved filter. Draw the rail's requirements on the axes instead (R1).

**Secondary: is the visual language coherent?** The drawer's dot graphs (`drawer-petg-mech-01.png`), the page's key
figures and its "Against its alternatives" strip (`page-petg-01.png`, `page-petg-02.png`) speak one language: a tick for
the median, a light bar for the middle half, a hairline for the range, hollow for "orientation not stated", "beyond the
scale ›" for outliers. **Keep that; it is the tool's best visual idea.** The lenses speak others: Compare shows the median
as the end of a filled navy bar with an outlined box for the range and no middle half (`compare-t4-01.png`); Parallel
lines shows the median alone; Ashby uses error bars. Blue means "this material" on the page and in the drawer, every
bar in Compare, and the Nylon family in Ashby and Parallel lines. The log label is written four ways ("log scale",
"GPa · log scale", "%, log scale", "GPa · log"), and the count three ("23 ranked of 44 shown", "23 products", "· 3").
None of this is wrong; aligning it is cheap (R9 to R12).

## Recommendations, ranked by benefit for effort

### R1. Draw the requirements on their axes
- **Place:** selector, Parallel lines (`app/js/ui/parallel.js`, `draw`).
- **Evidence:** `pl-t3-02.png` (PLA at 55 °C in an "at least 80 °C" set), `pl-t4-01.png` (PETG-CF at 3.4 GPa in an
  "at least 5 GPa" set); `compare-t4-02.png` for the mark to copy.
- **Change:** before, no mark. After, a short red bar across each constrained axis at the threshold, dashed when the
  requirement is reported and not required, with the failing side of the axis tinted faintly; a threshold outside the
  drawn range sits at the end with Compare's "past the end" chevron.
- **Benefit:** the engineer sees the margin each candidate has, which is the trade-off question, and a line below the
  bar visibly needs an explanation (R2 gives it). Same mark as Compare.
- **Effort:** S. **Risk:** low.

### R2. Show the products' spread for the line being read
- **Place:** Parallel lines, the raised line and the readout.
- **Evidence:** `pl-t4-01.png`; PETG-CF's products run 1.77 to 5.23 GPa (`dist/db.json`, `headline.tensileModulusXY.spread`).
- **Change:** before, the readout says "Modulus XY 3.4 GPa". After, on hover, tap or Tab, each crossing of the read line
  gets the page's glyph in the line's colour (light middle-half bar, range hairline), and the readout says "Modulus XY
  3.4 GPa (1.77 to 5.23, 9 products)" and "passes on 1 of 9 products" from the evaluation. With 8 lines or fewer, draw the
  glyphs for every line.
- **Benefit:** answers "why is this line below the requirement", and carries the tool's range-and-typical rule into the
  one lens that shows the median alone.
- **Effort:** S to M. **Risk:** clutter if drawn for every line in a large set; hence the read line only above 8.

### R3. Open on the scenario's properties
- **Place:** Parallel lines, `DEFAULT_AXES` (used only while `scenario.plot.parallelAxes` is unset).
- **Evidence:** `pl-t1-01.png` (*Indoor prototype* asks about price; no price axis), `pl-t4-01.png`.
- **Change:** before, the same four axes for every scenario, in registry order. After, the constrained properties first
  (required, then reported), in the rail's order, filled to four or five from the current defaults. A reader's own choice
  is kept as now.
- **Benefit:** the lens opens on the trade-off the engineer asked about, and adjacent axes (the only pairs a parallel plot
  shows well) are the ones that matter.
- **Effort:** S. **Risk:** none for saved scenarios that already name axes.

### R4. Name the lines in a small set, and raise the selected and shortlisted
- **Place:** Parallel lines.
- **Evidence:** `pl-t4-02.png` (five unnamed lines, two identical greys); INTERFACE.md "One candidate set, five lenses".
- **Change:** before, identity only by hover. After, with 15 lines or fewer, each line's name at its right end, nudged
  apart vertically; shortlisted materials at full weight with a ★ and the rest at 0.45 opacity once anything is
  shortlisted; `state.selected` from Ashby raises its line on arrival, and selecting a line here calls `actions.select`.
- **Benefit:** a five-line chart reads at a glance and survives a print or screenshot; the doc's cross-lens promise
  becomes true for this lens.
- **Effort:** S to M. **Risk:** label collisions in a tight cluster; stop labelling above 15.

### R5. Mark the better end and give each axis real ticks
- **Place:** Parallel lines, the axis group.
- **Evidence:** `pl-t1-01.png` (two numbers per axis; density and price unmarked).
- **Change:** before, the ends only. After, "↑ better" or "↓ better" under the unit from `AXIS_DEFS[].better`, and three
  to five ticks with faint gridlines (decades on a log axis, 1-2-5 steps on a linear one), as on the page's figures.
  Flipping density and price so that up is always better was considered and not recommended: an engineer reads the
  numbers, and an inverted axis is easily misread.
- **Benefit:** values can be read off the chart, and a crossing between neighbouring axes can be judged as a real
  trade-off or not.
- **Effort:** S. **Risk:** none.

### R6. One family colour across the lenses, one grey key, and PLA apart from PETG
- **Place:** Parallel lines (`buildFamilyColors(db.materials)`), the palette in `app/js/ui/format.js`.
- **Evidence:** `pl-t1-02.png`, `pl-t3-7axes-02.png` (six grey keys; PLA and PETG nearly the same).
- **Change:** before, Parallel lines ranks families without Ashby's promoted list and lists every grey family as its own
  key. After, the same call as Ashby (`[...asked, ...promotedFamilies]`), so a family has one colour in both; the grey
  families are one "Other families" key, as in Ashby; PETG's slot (`#b5533f`) takes a hue far from PLA's.
- **Benefit:** the legend stops showing six identical swatches, and colour means the same thing in both charts.
- **Effort:** S. **Risk:** the PETG colour changes in Ashby too, which is intended.

### R7. Park far outliers at the axis end
- **Place:** Parallel lines, `scales`.
- **Evidence:** `pl-t1-01.png` (one elastomer at 0.006 GPa sets the *Indoor prototype* modulus axis).
- **Change:** before, each axis spans every drawn value. After, the page's rule: the axis spans the drawn set without far
  outliers, and an outlier's line ends at the axis end with the "beyond the scale ›" chevron; the readout gives its value.
- **Benefit:** the 53 rigid materials use the axis instead of its top third.
- **Effort:** S to M. **Risk:** an extreme looks less extreme; the chevron and readout say so.

### R8. Draw incomplete candidates as broken lines instead of dropping them
- **Place:** Parallel lines, `usable`.
- **Evidence:** `pl-t3-7axes-02.png` (14 of 39 dropped), `pl-t1-7axes-01.png` (44 of 87).
- **Change:** before, a candidate missing one axis is not drawn. After, it is drawn between neighbouring axes that both
  have a value, thinner, with a hollow mark in a "not published" slot under each axis it lacks; the chips' counts stay.
  Nothing is invented: a segment joins only two published values.
- **Benefit:** the lens no longer hides a third of the set from the trade-off as axes are added.
- **Effort:** M. **Risk:** busier with many lines; offer it only at 30 lines or fewer if it clutters.

### R9. Encode the result as Ashby does when Unknown or Fail are shown
- **Place:** Parallel lines (`e.verdict` is computed and unused).
- **Evidence:** the "Show in table" chips add UNKNOWN and FAIL rows to every lens; Ashby fades them to 0.55
  (`app/js/ui/ashby.js`, line 592).
- **Change:** before, a failing line looks like a passing one. After, Unknown dashed, Fail faded, as in Ashby, with a
  key entry.
- **Effort:** S. **Risk:** none.

### R10. One glyph for "typical and spread" in Compare
- **Place:** selector, Compare (`app/js/ui/compare.js`).
- **Evidence:** `compare-t4-01.png` (filled bar to the median, outlined range box) against `page-petg-02.png` and
  `drawer-petg-mech-01.png` (tick, middle-half bar, hairline).
- **Change:** before, a navy bar from the track's start to the median and an outlined box for the range. After, the
  page's glyph on the same track: median tick, middle-half bar, range hairline. The track still spans all 152 materials,
  so "where it sits among everything" is kept; log tracks already use a tick.
- **Benefit:** an engineer who learnt the glyph on a page or in the drawer reads Compare without a key; the middle half,
  missing from Compare today, appears.
- **Effort:** M. **Risk:** low; the bar's length was its message, and the tick on a full-span track keeps it.

### R11. One wording for log scales and counts across the figures
- **Place:** Parallel lines (`· log`), Compare (`· 3`), drawer and page figures.
- **Evidence:** `pl-t1-01.png`, `compare-t4-01.png`, `drawer-petg-mech-01.png`, `page-petg-02.png`.
- **Change:** before, "log", "log scale", "GPa · log scale", "%, log scale"; "· 3", "23 products", "23 ranked of 44
  shown". After, "<unit> · log scale" everywhere, and a count always followed by its noun ("3 products").
- **Effort:** S. **Risk:** none; check the snapshot and the interface views.

### R12. Keep the accent blue for "this material"
- **Place:** the family palette (`app/js/ui/format.js`, slot 0 `#3a7ca5`, Nylon / Polyamide).
- **Evidence:** `page-petg-02.png` and `drawer-petg-mech-01.png` (blue is the material in hand) against `pl-t1-02.png`
  (blue is Nylon).
- **Change:** before, the first family colour is close to the accent. After, slot 0 takes a hue well away from it, so a
  blue mark always means the material being read or selected.
- **Benefit:** one meaning per colour across the drawer, the pages and the lenses.
- **Effort:** S. **Risk:** readers used to Nylon in blue; a small, one-time cost.

## What I would keep as it is
- The axis chips with their counts and "each one drops the candidates that lack it": the clearest statement of sparse
  data in any lens.
- Leaving out what is not published rather than drawing it at zero, and naming the estimate-only candidates.
- The readout with Open material, the tap-then-open behaviour, and Tab and Enter on each line.
- The log rule shared with Compare.
- No brushing (see above).
- The page and drawer figures' glyphs, which the lenses should borrow from, not the reverse.
