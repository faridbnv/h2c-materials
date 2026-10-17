# The engineer's review of the reimagined pages

> **Current** (2026-10-17). The independent review at step 4 of [PLAN.md](../PLAN.md), done to
> [REVIEW-BRIEF.md](../REVIEW-BRIEF.md). It scores only what the pages show on screen and on paper. I read no code and
> no other document of the round.

**What I reviewed.** Release `c844a6d3440a`, built 2026-10-17 11:35. The build in `dist/` was replaced while I was
working: my first PLA shots showed release `f4b5d1d2458f`. So I copied the new build into my scratchpad and reviewed
that copy, so nothing could move under me again. Every screenshot below is of `c844a6d3440a`. Shots are in
[`shots/`](../PACKETS.md), at 1280 px (height 1000) and 390 px (height 844), in light and dark. "y=" gives a position in page
pixels at 1280 px.

**What I could not test.** A real phone (touch scrolling, the hover-only tooltips on touch), Safari and Firefox,
keyboard and screen-reader use, a real printer (only Chrome's A4 PDF), and the pages served over http rather than
`file://`.

## The scores

| # | Line | Score | What holds it back |
|---|---|---:|---|
| 1 | The first screen | 7 | PLA's first screen answers every question. But PEI-CF's first screen says "standard (brass)" for a carbon-fibre material whose makers ask for a hardened nozzle. A "Draft" badge sits under the summary, and the name is said three times. |
| 2 | The writing, beginning to end | 5 | The summary, the thermal paragraph and the method page are good engineering prose. Around them are about 20 "What? Why is this here?" moments on PLA alone: bookkeeping, generated lists, counts that disagree, and project notes printed as quotes. |
| 3 | The figures, insight | 7 | Four figures earn their place: the alternatives grid, the one temperature axis, the Z/XY share and the strip plots with linked hover. On thin pages, though, figures are drawn with nothing in them. |
| 4 | The figures, craft | 5 | Values beyond an axis are pinned to its edge with no mark, and one H2C limit is drawn at the wrong temperature. Some log scales are not labelled, some tick sets are irregular or mislabelled, and labels float away from their marks. |
| 5 | Alignment | 5 | Measured: the Products table's group headers sit at two heights (16 px apart), one unit label is 8 px off, and the trust note is indented 4 px off the grid. Product-name headers overprint each other on PEI-CF, and the bars in a sorted column cut through digits. |
| 6 | Tables | 5 | The desktop tables read well. Four of the six Overview tables scroll sideways on a phone, with no fixed first column. A product card runs to 4,900 px (10,300 px on a phone) and leaves an L-shaped void. |
| 7 | Visual eye flow | 6 | The first screen leads well from the name to the numbers to print settings. Below it the page runs 14 screens; the printing message is said four times; and the hollow "left out" marks are louder than the counted ones. |
| 8 | Choosing a product | 7 | Search, sort, sticky headers and the "as published" group work, and every value traces to a document, a page and the sheet's own label. Strange states remain: an intro that doesn't change with the sort, ghost bars, and Izod drawn on the Charpy scale. |
| 9 | Navigation and the way back | 7 | The way back to the selector keeps the requirements and reopens a drawer. But it loses the scroll position, the method page can only be reached from inside closed disclosures, and the logo leads to the selector, not the index. |
| 10 | Thin pages and trust | 4 | The trust line is said once and said well. But PEI-CF reads as a full-length page with holes: 8,400 px (11,900 px on a phone), three "Not published" key figures, three empty Z plots, a table of dashes, and a drying schedule no maker gave. |
| | **Total** | **58 / 100** | |

## The owner's critique, line by line

1. **One coherent account with no placeholder to puzzle over: partly.** The summaries read as one engineer talking
   (`shots/pla-ov-1280-light-01.png`), and so do the thermal paragraph (`-06`) and the method page
   (`shots/method-1280-light-01..05.png`). Around them sit things a reader has to decode:
   - project markers: a "Draft" badge, and in the footer "The summary was written by Claude Opus (agent)… Draft, not
     yet reviewed" (`-15`);
   - counters nobody explains: "11 ›", "62 ›", "‹ 13" (`-02`, `shots/pctggf-ov-1280-light-02.png`);
   - bookkeeping: "71 of 139 products in the median" (`-04`), "in words:" (`-11`);
   - counts that disagree: Acid "25 of 33 statements" against 35 in the Statements column, and "2 of 2 makers"
     against 9 (`-11`);
   - a "quote" that is a reviewer's note: "Original study examines mineral-oil exposure… a generic oil-resistance label
     is insufficient", credited to Głowacki et al. "- PMC Lock" (`-11`).
2. **"I have all I need about this filament", amazingly: partly.** PLA and PETG come close. Everything an engineer
   asks is somewhere, and it is sourced. But "somewhere" is 14 screens and an 18-page printout, with the same message
   repeated. The thin pages fall well short (finding 2).
3. **Links and navigation at top and bottom, and the way back: mostly resolved.**
   - What works: selector → PLA drawer → *Full page* → PETG through the alternatives row → *Back to your results*.
     The selector comes back with the "Warm environment" requirements and 39 passing, with PETG's drawer open
     (`shots/trip-02-drawer.png` to `shots/trip-05-back.png`). The status-bar *Material pages* link carries the state:
     the index shows *Back to your results*, and so does every page opened from it (`shots/trip-06-hub-from-selector.png`).
   - What falls short: the table's scroll position is lost on the way back. The method page has no link in the bar,
     the footer, the index or the Products page. The logo goes to the selector rather than the index.
4. **Lively, helpful, carefully designed plots: partly.** They are lively and helpful: hovering one product lights it
   in every strip (`shots/pla-hover-mark.png`). Settings and service temperatures share one axis (`-07`), and the Z/XY
   rays are well drawn (`-05`). They are not yet careful. Values are pinned at the axis edge, some log scales are not
   labelled, tick sets are irregular, labels sit away from their marks, PEI-CF's chamber limit is drawn at 100 °C, and
   PEI-CF's Z plots are empty (findings 4, 5 and 9).
5. **A clear index, with no unneeded links or buttons: partly.** The layout is clean: families, dotted leaders,
   product counts (`shots/hub-1280-light-01.png`). Three things still confuse:
   - "No page yet" lines list materials with "(0)" products (`-02`);
   - searching "ultem" says "1 material matches" but shows all six of its family (`shots/hub-search-ultem.png`);
   - searching "polyamide" shows a "PA → PA6, PA6/66, PA66…" line that mixes links with plain text
     (`shots/hub-search-polyamide.png`).

   The index has no link to the method page, and it gives no information to choose by beyond a product count.
6. **A Products page with no buggy or over-extensive filters, no ghosting, no strange combinations, graphically sound:
   partly.** The filters are now just a search and a sort, and that is right. Ghosting remains:
   - sorted by price, the bar is a grey block floating apart from its number (`shots/pla-pr-sort-price.png`);
   - sorted by strength, the bar edge cuts through digits ("59.|7") (`shots/zoom-pla-pr-sortbars.png`).

   Strange combinations remain:
   - sorted by notched Charpy, Izod values get bars on the Charpy scale (`shots/ppscf-pr-sort-impact.png`);
   - one Drying cell says "yes" (`shots/pla-pr-sort-strxy-break.png`);
   - the intro still says "Sorted by how much each publishes" under any sort.

   The header is misaligned (`shots/zoom-pla-pr-header.png`), and the card's layout leaves a large void
   (`shots/pla-pr-card-mid2.png`).

## Findings, by what they cost the reader

Each finding is marked with who fixes it: **frame**, **words** or **figures**.

1. **PEI-CF tells you a brass nozzle is fine for a carbon-fibre filament.** **words**
   - Where: PEI-CF Overview, 1280 light; the On the H2C plate, y≈940, and the line under the printing figure.
   - Seen in: `shots/peicf-ov-1280-light-01.png`, `shots/peicf-ov-1280-light-06.png`.
   - What is wrong: the plate says "Nozzle type: standard (brass) — 1 of 3 products need a hardened one". The figure's
     line says "All but one product print with a standard nozzle". On the same page the summary says "Makers recommend
     a hardened or reinforced nozzle". Both makers are quoted asking for one ("Strongly recommend… hardened steel
     nozzle", "A reinforced nozzle, suitable for abrasive materials is recommended"), and the settings table shows
     "not stated" for two of the three.
   - Fix: "not stated" is not "standard". Say "hardened — both makers ask for one; one sheet is silent". At the least,
     never print "standard" for a CF or GF material when no product states it.
2. **Thin pages are full-length pages with holes.** **frame**
   - Where: PEI-CF and PCTG-GF Overviews; PEI-CF is 8,379 px at 1280 and 11,911 px at 390.
   - Seen in: `shots/peicf-ov-1280-light-01.png`, `-04`, `-08`; `shots/pctggf-ov-1280-light-04.png`.
   - What is wrong:
     - three of the six key figures say "Not published";
     - a whole Z/XY figure, "No PEI-CF product publishes values across the layers", draws three plots with only the
       alternatives' ticks;
     - the "Flat and across the layers" table is all dashes;
     - "How dense is it, and what does it cost?" draws three density dots, and there is no price.
   - Fix:
     - when a material has no Z pair, drop the Z figure and the table and write one line: "Not published for PEI-CF:
       strength across the layers, notched impact, price";
     - give a property with three products or fewer a "As each sheet publishes it" table, not a strip;
     - let a thin page be two or three screens long.
3. **Product-name headers overprint each other on the thin pages.** **frame**
   - Where: PEI-CF Overview, the "As each sheet publishes it" tables (mechanical y≈2905, thermal y≈4239); 1280, and on
     the phone too.
   - Seen in: `shots/zoom-peicf-sheet-table.png`, `shots/peicf-ov-1280-light-05.png`, `shots/peicf-ov-390-dark-06.png`.
   - What is wrong: the headers are set nowrap, so "3DXTECH CarbonX Carbon Fiber Ultem PEI" runs 67 px past its
     224 px column into "3DXTECH CarbonX Carbon Fiber Ultem 9085" and garbles both. On the phone the value column is
     cut mid-glyph ("145 I", "1.").
   - Fix: let headers wrap, or name the columns by maker and grade, "3DXTECH 9085", with the full name in the link title.
4. **Values beyond an axis sit at its edge without a mark, and one limit is drawn at the wrong temperature.**
   **figures**
   - Where and seen in:
     - PLA, the density strip: a stack of diamonds at 1,350 (`shots/pla-ov-1280-light-12.png`);
     - PLA, the HDT at 1.8 MPa strip: dots at 75 (`-06`);
     - PLA, the Price column of the alternatives figure: the whisker runs off at 80 (`shots/zoom-pla-alt-right.png`);
     - PEI-CF, the printing figure: the axis starts at 100 °C, so the chamber's 65 °C limit is drawn at 100 °C
       (`shots/peicf-ov-1280-light-05.png`).
   - What is wrong: a reader takes the edge for the value. On PEI-CF the drawn chamber limit is 35 °C too high.
   - Fix: give clipped values an arrow or "›" marker with the true value in its tooltip. Start the printing axis below
     every limit it draws, or mark the limit "65 °C ‹" at the edge.
5. **The same property is drawn on different scales from page to page, a log scale is not labelled, and ticks are
   irregular or mislabelled.** **figures**
   - Where and seen in:
     - PETG's key figures and alternatives figure draw Strength (Z) and Charpy on log axes ("2 … 50", "1 … 10 … 50")
       with no "log" note. PLA draws the same properties linear, 0–50 and 0–25 (`shots/petg-ov-1280-light-01.png`,
       `-02`; `shots/pla-ov-1280-light-02.png`).
     - The alternatives axes tick at 0/4/6, 0/30/50, 0/15/25, 50/200/300 and 0/200/300.
     - PEI-CF's density axis labels the 1,275, 1,325 and 1,375 positions as "1,280", "1,330" and "1,380". I measured
       this: 1,270 sits at x=406 and 1,310 at x=650, so the tick labelled "1,280" at x=437 is at 1,275
       (`shots/peicf-ov-1280-light-08.png`).
   - Fix:
     - one scale per property on every page;
     - say "log" in the column subtitle wherever an axis is logarithmic;
     - evenly spaced round ticks (0/2/4/6, 0/25/50), and never a rounded label on an unrounded position.
6. **A product card is 4,900 px long, with a void and jargon.** **frame**
   - Where: PLA Products, Bambu Lab PLA Basic's card; 4,931 px at 1280 and 10,277 px at 390.
   - Seen in: `shots/pla-pr-card-top.png`, `shots/pla-pr-card-mid1.png`, `shots/pla-pr-card-mid2.png`,
     `shots/pla-pr-390-card-1.png`.
   - What is wrong:
     - the same values are listed twice, once for each of Bambu's two data-sheet versions;
     - the footer's three columns end at about 350 px for Print settings and Price, while Maker's statements runs on
       alone for about 1,600 px, leaving a white L of roughly 700 × 1,600 px;
     - the "unnotched" and "tested at 25°C" chips stretch the full width of the column while the other chips are
       compact;
     - the status column speaks in project words: "Not shown: another value of a product already drawn";
     - on the phone the "Z" label of the second row is lost.
   - Fix:
     - fold a superseded sheet version into one line, "also in V3.0, same values";
     - let the statements flow full width under the two short columns;
     - write the status as "counted" / "not counted: no orientation stated" / "duplicate of the V3.0 value".
7. **The Products table's header is misaligned, and the sorted-column bars ghost.** **frame**
   - Where: every Products page at 1280.
   - Seen in: `shots/zoom-pla-pr-header.png`, `shots/zoom-pla-pr-sortbars.png`, `shots/pla-pr-sort-price.png`,
     `shots/ppscf-pr-sort-impact.png`.
   - What is wrong, measured:
     - the group labels "Strength and stiffness" and "Impact" sit at top=401; "HDT", "Cost" and "Printing on the H2C"
       at 417.3, so the group rules step by 16 px;
     - the "MPa" under Strength Z ends at 473.1, while every other unit ends at 481.3;
     - the row chevron is centred on two-line names while names and values sit at the top;
     - sorted by price, each bar is a grey block 50 px away from its right-aligned number;
     - sorted by strength, the bar ends inside the digits;
     - Izod "7" draws a longer bar than Charpy "6.2".
   - Fix:
     - bottom-align every column header and its unit, and put every group label on one row;
     - draw the sort bar as a thin rule under the number, or not at all;
     - give Izod no bar when sorting by Charpy.
8. **Text that is not what it claims, or does not add up.** **words**
   - Where: PLA Overview, Chemicals and environment and Sources; 1280.
   - Seen in: `shots/pla-ov-1280-light-11.png`, `-12`, `-14`.
   - What is wrong:
     - Acid resistance reads "25 of 33 statements; 7 resistant and 1 limited", but its Statements column says 35;
     - Alkali reads "2 of 2 makers", but Statements says 9;
     - quotations credited to Prusa and to a journal read like this project's commentary ("…is not a weathering-grade
       default", "Original study examines…"), and a link title ends in "- PMC Lock";
     - the Sources table credits Bambu Lab with "191 products" for PLA, and on PEI-CF with "0 values, 3 products";
     - a one-row "PLA resin" table says only that moisture sensitivity is limited.
   - Fix:
     - one unit per column (statements or makers);
     - quote only words that are on the cited page, and set a paraphrase as plain text with "after Prusa";
     - name the printer guide as "Bambu Lab's Filament Guide (print settings)" rather than counting it as a publisher
       of values.
9. **Bookkeeping and repetition on a reader's page.** **words**
   - Where: every Overview, and the index.
   - Seen in: `shots/pla-ov-1280-light-01.png`, `-07`, `-08`, `-15`; `shots/peicf-ov-1280-light-01.png`;
     `shots/hub-1280-light-02.png`.
   - What is wrong:
     - the "Draft" badge, and the agent byline in the footer;
     - "on file", "in words:", "71 of 139 products in the median", "Set in Inter and Newsreader";
     - "PLA / Polylactic Acid / Polylactic acid, 195 products…" followed by "PLA is polylactic acid";
     - PLA's printing message ("195–230 °C, 50–60 °C, no chamber, standard nozzle") is stated four times: in the plate,
       the figure title, the sentence under the figure, and the table;
     - PEI-CF's "needs more heat than the H2C gives" appears four times in its first two screens;
     - the index lists "PA612 (0)" under "No page yet".
   - Fix:
     - keep draft status and authorship in the release notes;
     - state each printing fact once (plate, then figure, then the per-sheet table) and title the figure with the
       question it answers;
     - drop materials with no products from the index.
10. **The phone tables and the A4 printout.** **frame**
    - Where: PLA Overview at 390, and the PLA A4 PDF.
    - Seen in: `shots/pla-ov-390-light-14.png`, `shots/pla-overview-A4.pdf` (pp. 2, 5, 9, 11, 16).
    - What is wrong on the phone: four of the six Overview tables need sideways scrolling inside a 358 px box, with no
      fixed first column and no sign that they scroll. The settings table gives "Nozzle" a 176 px column and cuts
      "Bambu Lab's Filament Guide" to "Bamb…".
    - What is wrong on paper:
      - the printout runs to 18 pages;
      - page 5 holds three lines and is otherwise blank;
      - "Compare the 195 products", "Printing in full" and "Hover a product… select one" are printed;
      - strip labels are clipped ("Fiberlogy IMPACT PL");
      - "Draft" is printed;
      - no page carries the page's URL or a page number.
    - Fix:
      - on the phone, stack a table's rows as label/value pairs;
      - in print, hide controls and interaction hints, keep a figure with its title, let a short section share a page,
        and add the URL and page numbers.

### Lesser findings

- **The trust note sits 4 px off the grid.** **frame** It starts at x=84 while the key-figure plate, the summary and
  every heading start at x=80. Its 795 px width matches no column either (`shots/pla-ov-1280-light-01.png`).
- **The method page is nearly hidden.** **frame** Its only links are inside closed "The figure as a table"
  disclosures, plus one "How XY and Z differ". The bar, the footer, the Products page and the index have none. It has
  no footer itself (`shots/method-1280-light-05.png`).
- **The way back loses the scroll position.** **frame** *Back to your results* restores the requirements but leaves the
  table at its top, and opens PETG's drawer, the last material read, rather than PLA's, where I left it. PETG's is
  arguably right, but the page should say so (`shots/trip-05-back.png`).
- **The logo leads to the selector.** **frame** On a material page, "Filament Atlas" goes to the selector. A reader
  expects the index; "Materials" in the breadcrumb does that.
- **The PEI-CF Products page never says the material is beyond the H2C.** **frame** The table shows 365–390 °C with no
  flag (`shots/peicf-pr-1280-light-01.png`).
- **A drying schedule no maker gave.** **words** PEI-CF's plate says "Drying 120 °C for 7 h", the median of 140 °C/8 h
  and 100 °C/6 h. Show the span: "100–140 °C, 6–8 h" (`shots/peicf-pr-1280-light-02.png`, `shots/peicf-ov-1280-light-06.png`).
- **A Vicat value no sheet published.** **figures** PCTG-GF's printing figure shows Vicat "83 °C, as published", but the
  table shows 77 °C and 89 °C (`shots/pctggf-ov-1280-light-05.png`).
- **A glass-filled grade filed as toughened.** **words** Fiberlogy PCTG+GF10 carries the "sold as toughened" mark
  because its sheet says "impact resistance". A GF10 grade is not a toughened grade to an engineer
  (`shots/pctggf-pr-1280-dark-01.png`).
- **Labels float away from their marks.** **figures** Each strip's extreme-product label is centred at the top and
  shifted to fit, so "colorFabb PLA Chameleon" sits 65 px left of its dot, with no leader line. On the phone labels are
  dropped at random (`shots/pla-ov-1280-light-04.png`, `shots/pla-ov-390-light-07.png`).
- **Excluded marks are louder than counted ones.** **figures** In the PLA strips the hollow grey "orientation not
  stated" circles outnumber and outweigh the filled counted ones. Lighten the excluded marks.
- **PLA's own products disappear in dark mode.** **figures** In the PLA landscape scatter, the dark-blue product dots are
  barely visible on the dark ground (`shots/zoom-pla-scatter-dark.png`).
- **Numbers break from their units.** **words** "11 / % stronger flat", "0.45 / MPa", "4 / h" and "350 / °C" wrap
  across lines (`shots/pla-ov-1280-light-02.png`, PDF p. 9). Use a non-breaking space between a number and its unit.
- **The index search count is wrong.** **frame** "ultem" says "1 material matches" but shows six
  (`shots/hub-search-ultem.png`).
- **Sorting has stale text and no way back.** **frame** A second click on a sorted column does not reverse it, and the
  intro does not change with the sort (`shots/pla-pr-sort-strxy-2.png`).
- **The key needs eight symbols.** **frame** The Products page key has eight symbols on three lines, and on the phone
  eight lines before the first product (`shots/pla-pr-390-01.png`).
- **The AMS row quotes one product.** **words** In PLA's settings table, the AMS row quotes Bambu Lab PLA Tough+ alone
  (`shots/pla-ov-1280-light-08.png`).
- **Two makers' values are identical with no explanation.** **words** Kingroon PLA Basic and Kingroon PETG Basic carry
  Bambu Lab's numbers exactly, with no "shared sheet" mark (`shots/pla-pr-1280-light-01.png`,
  `shots/petg-pr-1280-light-01.png`).

## What is genuinely good, so the fixes keep it

- **The key-figure plate.** Its six figures, each with a mini range and "N products · middle half", say how typical
  the value is and how much products vary. The one trust line under it ("Well documented…", "Thinly documented… Read
  each figure as one or two sheets' word") says how far to trust the numbers, once.
- **The summaries and the thermal paragraph.** They read like an engineer: "amorphous as printed, so it softens at its
  glass transition"; "semicrystalline, so it carries light load well above its glass transition"; the three PLA
  grades that reach 110–135 °C, each with its annealing state.
- **The figures that answer an engineer's question.** The alternatives grid is one of them. Another is the one
  temperature axis, with print settings above and service temperatures below. A third is the Z/XY rays with each
  alternative's share. The strip plots' linked hover (one product lit in every strip) is excellent.
- **Traceability.** Every value on a card names its document, page and the sheet's own label ("p. 2: Young's Modulus
  (X-Y)"), with its conditions as chips.
- **The Products page's handling of unstated values.** Under a sort, values with no stated orientation, and Izod, go
  into their own named group instead of being ranked.
- **The way back.** It keeps the selector's state, including from the status-bar *Material pages* link.
- **Dark mode.** It is consistent and legible almost everywhere.
- **The method page.** "Notched Charpy and Izod", "Bending and tension" and "Every temperature on one axis" are clear,
  correct and short.
