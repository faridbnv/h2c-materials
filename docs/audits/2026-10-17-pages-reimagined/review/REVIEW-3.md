# Review 3: the reimagined material pages, the engineer's final read

> 2026-10-17. An independent reviewer, briefed by [REVIEW-BRIEF.md](../REVIEW-BRIEF.md), time-boxed to about 20 minutes.
> Read: the frozen copy in the session scratchpad (`review3/materials/` and the selector beside it), as `file://` URLs.
> Pages: the Overviews of PLA (M001), PETG (M020), PCTG-GF (M110) and PEI-CF (M118) at 1280 light and 390 dark; PLA's
> Products page at 1280 with one card open (Polymaker HT PLA) and one sort (HDT at 0.45 MPa); the hub at 1280; one return
> trip (selector, PLA's drawer, *Full page*, PETG through a link, *Back to your results*). Screenshots in
> [shots-3/](shots-3/). No code and no other review was read before scoring.

## Scores

| # | Line | Score | What holds it back |
|---|---|---|---|
| 1 | The first screen | 8 | It answers almost everything (six medians with their middle half, the H2C box, a trust line), but the trust line is a small grey paragraph under the summary, and on PEI-CF the plate's "> 200 °C" disagrees with the sheets below it. |
| 2 | The writing | 6 | The arc is coherent and there are no placeholders, but one chart title states something its own data contradicts, sentences repeat verbatim between the plate and the sections, and bookkeeping phrasing ("29 ranked of 64 shown", "Described without a verdict, in all 6 statements") keeps breaking the account. |
| 3 | Figures, insight | 7 | The alternatives grid, the XY-against-Z plots and the one-axis H2C chart answer real questions; the strip titles fall back on a formula ("spreads most in elongation at break") that tells an engineer nothing new. |
| 4 | Figures, craft | 7 | Clean and good in dark mode, but the HDT-against-price scatter piles the material and its alternatives on the 50 °C floor with labels on top of points, and the H2C chart's row labels run to four cramped lines. |
| 5 | Alignment | 7 | One left edge and one grid at 1280, but the PCTG-GF printing table's headers run into each other, and glyphs push numbers off their right edge in the Products table. |
| 6 | Tables | 7 | The Products table is good (grouped headers with units, right-aligned numbers, the sort in step with the menu); the product card is too long and its Conditions column prints raw strings. |
| 7 | Visual eye flow | 7 | The first screen reads from answer to detail; below it, long sections in a left column leave the right 40 % empty, and a lone "Compare the products" button in mid-page breaks the rhythm. |
| 8 | Choosing a product | 8 | Search, thirteen sorts and the marks find the stiffest, hottest or best documented product in two actions, and every value names its page; annealed values sort among the as-printed ones (marked, but on top). |
| 9 | Navigation and the way back | 8 | The bar, the section menu, the tabs and *Back to your results* all work and keep the selector's state; the selector comes back with the drawer of the last material visited, not the one you left from (defensible, but unexplained). |
| 10 | Thin pages and trust | 7 | PCTG-GF and PEI-CF read short, with per-sheet tables in place of strips and the caveat said once, but PEI-CF's plate and its print table contradict the sheets they quote. |
| | **Total** | **72** | |

## The owner's critique, line by line

1. **Coherent texts, no placeholder: partly.** No placeholders anywhere, and summary, *Among the materials*, sections
   and footer follow one line of thought. But PLA's alternatives title says PLA "softens 15–40 °C lower" than PLA-CF,
   PLA-GF and ABS when its own table gives PLA-CF 56 °C against PLA's 55 °C ([M001-1280-02](shots-3/M001-1280-02.png)).
   The same sentences come twice: PLA's "amorphous … glass transition … the heavier load gives the same" in the summary
   and again in Thermal, and the nozzle-type sentence word for word in the plate and the printing table
   ([M001-1280-01](shots-3/M001-1280-01.png), [M001-1280-07](shots-3/M001-1280-07.png)).
2. **"All I need to know", amazingly: partly.** The first screen is close to that ([M001-1280-01](shots-3/M001-1280-01.png),
   [M020-1280-01](shots-3/M020-1280-01.png)). What lets it down is trust in the details: PEI-CF's "> 200 °C" plate and
   its "nozzle type: not stated" column for a sheet that recommends a reinforced nozzle
   ([M118-1280-01](shots-3/M118-1280-01.png), [M118-1280-04](shots-3/M118-1280-04.png)).
3. **Links, navigation, the way back: resolved.** The button reads *Back to your results* once you arrive from the
   selector. It survives a hop to PETG and returns the selector with its state and an open drawer
   ([trip-01](shots-3/trip-01.png), [trip-02](shots-3/trip-02.png), [trip-04](shots-3/trip-04.png)). The footer
   repeats the way out. The only open question: the returning drawer is PETG's (the last page), not PLA's.
4. **Plots lively, helpful, careful: partly.** The alternatives grid and the H2C temperature axis are genuinely helpful.
   The HDT-against-price scatter's floor crowding, the stacked ray labels on the log-log XY/Z plot, the four-line row
   labels of the H2C chart and the formula titles keep the figures short of careful ([M001-1280-03](shots-3/M001-1280-03.png),
   [M001-1280-04](shots-3/M001-1280-04.png), [M001-1280-06](shots-3/M001-1280-06.png)).
5. **The hub is clear: resolved.** It has one search, families in three columns with dotted leaders, one selector
   button and one method link ([hub-1280-01](shots-3/hub-1280-01.png)). Small points: the counts carry no label (they
   are products), and "Without a page yet" is a long grey list ([hub-1280-03](shots-3/hub-1280-03.png)).
6. **The Products page is sound: partly.** It has no filters to misbehave: a search, a sort menu and sortable headers
   that agree ([M001p-sort-01](shots-3/M001p-sort-01.png)). It is not yet graphically sound:
   - A second line of the row above peeks out under the sticky header ("6.0", [M001p-1280-02](shots-3/M001p-1280-02.png)).
   - The sticky header's property columns sit over an open card that has its own different columns
     ([M001p-card-01](shots-3/M001p-card-01.png)).
   - The card prints raw condition strings ([M001p-card-03](shots-3/M001p-card-03.png)).

## Findings, ranked by what they cost the reader

1. **Words (a chart title).** The figure's title contradicts its own data. On PLA's Overview at 1280 light (both
   themes), the title of the alternatives grid reads "PLA is stronger across the layers than PLA-CF, PLA-GF and ABS but
   softens 15–40 °C lower". The figure-as-table gives HDT 0.45 MPa: PLA 55, PLA-CF 56, PLA-GF 76, ABS 95, so the range
   should name PLA-GF and ABS only. Screenshot: [M001-1280-02](shots-3/M001-1280-02.png). An engineer who checks one
   claim and finds it wrong stops trusting the rest. Fix: the title's "softens … lower" clause must name only the
   alternatives it is true of ("… but softens 21–40 °C below PLA-GF and ABS").
2. **Words and figures (a thin page's trust).** PEI-CF at 1280 light and 390 dark contradicts itself in two places:
   - The plate gives HDT at 0.45 MPa as "> 200 °C" with "3 products 165–205". The Thermal table prints 205, 165 and
     200 °C with no bound, and the summary says "165–205 °C". Screenshots: [M118-1280-01](shots-3/M118-1280-01.png),
     [M118-1280-03](shots-3/M118-1280-03.png).
   - In the print table, Nozzle type reads "not stated" for Nanovia PEI CF, and the plate says "one of 3 products'
     sheets asks for one; the rest are silent". Yet the quote just below, from Nanovia's own data sheet, p. 1, reads
     "A reinforced nozzle, suitable for abrasive materials is recommended." Screenshot:
     [M118-1280-04](shots-3/M118-1280-04.png).

   On a three-product page, each contradiction is a third of the evidence. Fix: show a bound only when a sheet prints
   one, and in the table cell say which sheet it comes from. Read the nozzle statement from the same record as the quote.
3. **Frame (the product card).** PLA Products at 1280, with Polymaker HT PLA open, has four problems. Screenshots:
   [M001p-card-01](shots-3/M001p-card-01.png) to [-03](shots-3/M001p-card-03.png).
   - One product's card runs about 2,700 px.
   - The same chip, "annealed at a temperature its sheet does not state for a time its sheet does not state", repeats
     on about ten rows.
   - The Conditions column prints raw strings: "1183 ISO1183 GB/T1033", "0.45MPa 75 as printed ISO 75", "306 as
     printed ISO 306 GB/T 1633".
   - The sticky table header (XY, Z, Charpy, 0.45 MPa …) stays over a card whose columns are Property, As published,
     Conditions and On the Overview.

   Fix:
   - State a shared condition once at the head of its document group, as "Unless a row says otherwise" already does.
   - Show the standard in Conditions and keep the raw locator text on hover.
   - Release the sticky header while a card is open.
4. **Words (repeats, bookkeeping, slips).** These run across all pages at both widths:
   - Sentences repeated between the summary and Thermal, and between the plate and the printing table.
   - Three identical Bambu Lab "not recommended to anneal prints of PETG …" quotes in a row on PETG
     ([M020-1280-07](shots-3/M020-1280-07.png)).
   - "29 ranked of 64 shown" under every strip.
   - "UV and outdoor: Described without a verdict, in all 6 statements" ([M001-1280-10](shots-3/M001-1280-10.png)).
   - A resin-reference paragraph that ends by saying it "does not stand for these products".
   - "1 give one end only" (PEI-CF, PCTG-GF).
   - "H2C Filamant Printing Guide" in Sources.
   - Two lines of AI-drafting provenance in every footer.

   Fix: say each fact once where it belongs, and quote one of three identical quotes ("… and the same for PETG HF and
   Translucent"). Drop the rows that carry no verdict, the resin paragraph and the per-strip counts; the counts can go
   in the figure-as-table. If "Filamant" is the source's own spelling, mark it [sic].
5. **Frame (table alignment).** PCTG-GF at 1280 light: the printing table's product headers run together as
   "FormFutura AthenaX GF10Fiberlogy PCTG+GF10", because the columns are left-aligned with no gutter, unlike the
   right-aligned per-sheet tables above them ([M110-1280-04](shots-3/M110-1280-04.png)). At 390 dark, the per-sheet
   tables right-align the product names beside right-aligned values, and the property heading wraps in a half-width
   cell with a half-width rule ([M110-390d-05](shots-3/M110-390d-05.png)). Fix:
   - Give the printing table the same column treatment as the per-sheet tables.
   - On the phone, left-align the names and give the property heading the full width.
6. **Figures (craft).** These are on PLA and PETG at 1280 light and 390 dark:
   - The "HDT at 0.45 MPa against price" scatter starts its y axis at 50 °C. PLA, PLA-CF and PETG sit on the floor,
     and their labels overlap the points ([M001-1280-03](shots-3/M001-1280-03.png),
     [M001-390d-05](shots-3/M001-390d-05.png)).
   - The labels "100 %, 75 %, 50 %, 25 %" stack at the top right of the log-log elongation plot
     ([M001-1280-04](shots-3/M001-1280-04.png)).
   - The H2C chart wraps "°C" under "300", and its row labels run to three or four lines
     ([M001-1280-06](shots-3/M001-1280-06.png)).
   - Vicat is drawn as a wide grey bar, 52–156 °C, that dominates the In-service rows.

   Fix:
   - Start the HDT axis below the lowest median.
   - Place the ray labels along each ray.
   - Put the unit in the axis title.
   - Shorten the row notes to one line.
   - Draw Vicat as a range tick.
7. **Figures (insight).** The strip titles on PLA and PETG, both widths, follow a template: "PLA's products spread most
   in elongation at break" and "PETG's products spread most in elongation at break"
   ([M001-1280-03](shots-3/M001-1280-03.png), [M020-390d-06](shots-3/M020-390d-06.png)). Elongation always spreads
   most, so the title wastes the most-read line on the figure. Fix: title it with the finding that differs by material
   (which products stand out and why).
8. **Frame (alignment detail).** PLA Products at 1280:
   - The hardened-nozzle glyph pushes "190–230" about 18 px off the Nozzle column's right edge (Raise3D Hyper Speed PLA
     Pro, [M001p-sort-02](shots-3/M001p-sort-02.png)).
   - The shared-sheet glyph floats at the cell's right edge, away from a wrapped name (Eryone Dual Color Burnt Titanium
     PLA, [M001p-1280-02](shots-3/M001p-1280-02.png)).
   - Drying reads "50 8 h", which scans as one number.

   Fix: hang the glyphs outside the number's edge, keep them after the name's last word, and print the drying cell as
   "50 °C · 8 h".
9. **Frame (rhythm).** PLA and PCTG-GF at 1280: below the first screen, every section is a 740 px column with the right
   40 % empty, and the Overview's "Products" section is a sentence and one button set between Printing and Uses
   ([M110-1280-05](shots-3/M110-1280-05.png), [M118-1280-05](shots-3/M118-1280-05.png)). Fix: move the button to the
   end, or fold it into the tabs it duplicates. On PEI-CF, the phone's three tiles leave a hole in the 2-column grid,
   and "Not published:" is printed three times ([M118-390d-01](shots-3/M118-390d-01.png)).

## What is genuinely good, and should be kept

- **The plate.** Each tile gives the median, a strip on a fixed scale, the count and the middle half, and the tiles
  share one baseline. At 390 they fold to two columns without breaking.
- **"On the H2C" beside the summary.** The value, how many products back it, and the printer's limits in one line. It
  is the box an engineer looks for first.
- **The alternatives grid.** One row per material and one column per property, with every material's median as ticks
  on top. It answers "what would I buy instead" better than any table.
- **Per-sheet tables on thin pages.** Products as columns, "not published" spelled out and "orientation not stated"
  under the value. They make PCTG-GF and PEI-CF honest and short.
- **The Products page's restraint.** One search, one sort menu, headers that sort, and no filter panel. Each card value
  has its page and locator ("p. 4: Young's modulus (X-Y)").
- **The return trip.** It keeps the selector's state across a hop between materials, and the button names what it
  does.
- **The hub.** It is quiet and complete.

## What I could not test

- Print (skipped by instruction).
- PPS-CF and the method page (not in this review's set).
- Products pages other than PLA's, and the Products page at 390.
- The selector's status-bar *Material pages* link.
- Keyboard use and screen readers.
- Hover states on the figures. I read the strips and charts as static images.
- Whether the selector kept a requirement across the trip. My attempt to tick a family chip did not register, so I
  verified only the drawer and the URL state, which came back intact.
