# The engineer's review of the reimagined pages, second reviewer

> **Current** (2026-10-17). An independent review done to [REVIEW-BRIEF.md](../REVIEW-BRIEF.md), of the frozen
> build copied to the scratchpad (`review2/materials/` and the selector beside it), opened as `file://` pages in
> headless Chrome at 1280 px and 390 px, light and dark, plus one A4 printout. I read no code, no other review and no
> proposal before scoring. Screenshots are in [shots-2/](../PACKETS.md); `shots-2/m/` holds side-by-side phone strips.

## Scores

| # | Line | Score | What holds it back |
|---|---|---|---|
| 1 | The first screen | **8** | At 1280 it answers nearly everything, but at 390 the printing card is two screens down, and the lede's "though not every brand of it is" and a 33.7 among whole numbers cost trust. |
| 2 | The writing | **5** | The summaries and section openings read well; underneath, I counted about fifteen "why is this here?" moments on PLA alone: tallies, a draft byline, a garbled reference sentence, marketing quotes, repeated captions. |
| 3 | Figures, insight | **7** | The alternatives grid, the two landscape maps, the Z-against-XY plots and the one-axis printing chart answer real questions; the product strips mostly restate the table, and the density/price figure adds little. |
| 4 | Figures, craft | **6** | The scales are honest and the labels sit on the marks, but the PLA HDT strip is crushed, the counts printed beside the strips do not match the marks drawn, and the legends run to seven items. |
| 5 | Alignment | **6** | One left edge and right-aligned numbers, but the tables end at six different right edges, the same product's column moves between tables, some headers sit on different baselines, phone rows put values at two heights, and one cell spills past the grid. |
| 6 | Tables | **6** | The Products table is sound at its core; blank cells say nothing, Izod values sit in the Charpy column, half the names wrap, and a product card runs to 3,400 px of repeated text. |
| 7 | Visual eye flow | **6** | The first screen leads well from the title to the plate to the summary; after that every section has the same weight, a 280 px hole opens under the summary, and the Products plate breaks the account halfway down. |
| 8 | Choosing a product | **8** | Sort, search by maker, ranked rows first and a document and page for every value make this quick; a product card that is too long, and Izod mixed into the Charpy sort, let it down. |
| 9 | Navigation and the way back | **8** | The return trip restores the template, the counts, the table scroll and the drawer; the drawer's tab is lost, and the drawer and the page print different numbers for the same material. |
| 10 | Thin pages and trust | **6** | The thin pages are half as long and say "thinly documented" once, but the main plate is half "Not published", the full set of figures is drawn for two or three products, and the footer says "Draft, not yet reviewed by the owner". |
| | **Total** | **66 / 100** | |

## The owner's critique, line by line

1. **Coherent text from the beginning to the end, with nothing that reads like a placeholder: partly.** The summary,
   the "Among the materials" paragraph and each section's opening read as one account (PLA:
   `shots-2/rt-02-pla-from-selector.png`, `pla-ov-1280L-02.png`, `-06.png`). Below them the account breaks into
   records: "Reference data for plain PLA resin, where no maker of these products speaks: moisture sensitivity, limited
   (moisture content before melt processing, absorbs)." (`pla-ov-1280L-13.png`); "Crystallization temperature: named,
   no value given" and "Counted" on the card (`pla-pr-card-02.png`); an unexplained † in Estimated values
   (`pctggf-ov-1280L-09.png`); and in every footer "Summary by Claude Opus (agent), 2026-10-17. Draft, not yet reviewed
   by the owner." (`pla-ov-1280L-16.png`, `peicf-ov-1280L-08.png`).
2. **"I have all I need to know about this filament", in an amazing way: partly.** The first screen comes close
   (`rt-02-pla-from-selector.png`), and every value can be traced to its document and page. But the PLA Overview is
   14,250 px long at 1280, 26,600 px on a phone and 13 pages on A4, and its last third (quote stacks, tallies, a
   15-row "Other properties" table) is weaker than its first.
3. **The links and the navigation at the top and bottom, and the way back to the selector: resolved, with two gaps.**
   Selector, then Indoor-prototype template, then PLA's drawer, then *Full page*, then PETG through the alternatives,
   then *Back to your results*: the template, "87 shown", the table's scroll position and the drawer all come back
   (`rt-01` … `rt-04`, `rt-07`, `rt-08`). The status bar's *Material pages* link goes to the hub with *Back to your
   results* in the bar and returns intact (`rt-05`, `rt-06`). The gaps: the drawer tab I had chosen (Mechanical) comes
   back as Overview, and the drawer says PEI-CF's HDT is "> 200 °C" with a nozzle of "365–400 °C" where the page says
   "200 °C" and "370–390 °C" (`rt-09-open-in-selector-peicf.png` against `peicf-ov-1280L-01.png`).
4. **Plots that are lively, helpful and carefully designed: partly.** The alternatives grid (`zoom-pla-alt.png`), the
   landscape maps (`pla-ov-1280L-03.png`), the Z/XY plots (`ppscf-ov-1280L-05.png`) and the printing axis
   (`anchor-printing.png`) are genuinely good. Craft slips: the PLA HDT strip (`zoom-pla-hdtstrip.png`), counts that
   disagree with the marks, seven-item legends repeated above each figure, a "68–85 °C" Vicat label beside a tick near
   170 °C (`petg-ov-1280L-08.png`), and two Melting ticks drawn as an "H" (`ppscf-ov-1280L-07.png`).
5. **A clear hub, with no confusing index and no needless links or buttons: partly.** It has few controls: the
   selector, the method link, a search box that knows aliases ("nylon" finds "PA, Polyamide (Nylon) → see the family",
   `hub-search-nylon-01.png`). But every family carries a grey "No page yet: …" list, two families (Support /
   Interface, Metal and Ceramic Sintering) hold nothing else, and the families run down the columns in an unstated
   order (by number of pages), so a reader scanning across the rows sees PLA, Industrial High-Temperature, PET
   Engineering, and finds PETG only in the middle of the second screen (`hub-1280L-01.png`, `-02.png`).
6. **A Products page with no buggy or over-long filters, no ghosting, no strange combinations, and sound graphics:
   partly.** There are no filters to go wrong (search, sort, count), the empty state is clean (`pla-pr-nores-01.png`)
   and the search finds a maker (`pla-pr-search-01.png`). But there is ghosting: "dry before use" spills past the
   table's right edge and shows beside the sticky header as it scrolls under it (`pla-pr-ghost-01.png`,
   `pla-pr-ghost3-01.png`). And there is a strange combination: sorting by Charpy brings up a second tier where Izod
   values sit in the "Charpy notched" column, under a divider that writes "charpy" in lower case
   (`pla-pr-charpy-tier-01.png`).

## Findings, ranked by what they cost the reader

Each is marked **frame**, **words** or **figures** for who would fix it.

1. **words** · PLA and PEI-CF Overview, every width, footer; Products card. The page shows its own bookkeeping:
   "Summary by Claude Opus (agent) … Draft, not yet reviewed by the owner."; an "On the Overview: Counted / Not
   counted" column on every card value; "named, no value given"; chemical tallies such as "mostly not resistant: 25 not
   resistant, 7 resistant, 2 without a verdict, 1 limited" with a Statements column; an AMS row reading '"AMS, AMS
   2PRO, AMS HT, AMS Lite"; the other 194: not stated'. Shots: `pla-ov-1280L-16.png`, `pla-ov-1280L-12.png`,
   `pla-ov-1280L-09.png`, `pla-pr-card-02.png`. *Fix:* drop the byline and the draft status from the public footer;
   say "in the median" in place of "Counted", or leave the column out; turn the tallies into one verdict with a count
   ("not resistant, in 25 of 35 statements"); drop the AMS row when only one product speaks.
2. **words** · Several pages. One quantity is printed two ways: PLA's price is 33.7 CAD/kg in the plate and 34 in
   the alternatives grid and the text (and the method page promises whole dollars from 10); PCTG-GF's Vicat is
   "77–89 °C, from one product" in the text and "83 °C, 1 product" in the figure; PEI-CF's HDT is "> 200 °C" in the
   drawer and "200 °C" on the page; a card's price is the "median of 2 listings" above a "5 listings" fold. Shots:
   `rt-02-pla-from-selector.png`, `pctggf-ov-1280L-04.png` with `-05.png`, `rt-09-open-in-selector-peicf.png`,
   `pla-pr-card-03.png`. *Fix:* one rounding rule for each quantity, everywhere; say why the listings and the median
   differ ("2 of 5 listings are Canadian").
3. **frame** · PLA Products, 1280, light and dark, while scrolling. "dry before use" in the Drying column runs to
   x = 1218, past the 1200 px edge, and its tail ("se") shows beside the sticky header as the row passes under it.
   Shots: `pla-pr-ghost-01.png`, `pla-pr-ghost3-01.png`. *Fix:* wrap or shorten the cell ("dry first") and clip the
   table to its column.
4. **figures** · PLA Overview, Thermal properties, 1280 and 390. The HDT at 0.45 MPa strip keeps the full 50–300 °C
   scale, so 89 products pile into 50–60 °C as overlapping hollow rings, the middle-half band cannot be seen, and the
   heading's "54–59 °C" cannot be read from it; the two strips below it are zoomed in. Shots:
   `zoom-pla-hdtstrip.png`, `m/pla390L-3-01.png`. *Fix:* zoom where the products cluster, as the other strips do,
   and mark the few products out at 75–135 °C as beyond the scale.
5. **figures** · Every strip figure. The label counts only the ranked products ("Tensile strength (XY) · 71
   products", "Notched Charpy impact · 14 products") while about 140 and 45 marks are drawn. Shot: `hover-01.png`.
   *Fix:* "71 ranked of 140 shown", or draw the unranked marks in a separate lane.
6. **words** · PLA and PCTG-GF Overview. Sentences that read as a broken record or leave a puzzle: the "Reference data
   for plain PLA resin" sentence above; a † beside every Likely range with nothing that explains it; "poor: an order
   of magnitude only" for 1.6–4.5 GPa, which is a factor of 2.8; "Bambu Lab, H2C Filamant Printing Guide" beside
   "Bambu Lab's Filament Guide" with no word on how the two differ; "though not every brand of it is" in the lede.
   Shots: `pla-ov-1280L-13.png`, `pctggf-ov-1280L-09.png`, `pla-ov-1280L-15.png`, `rt-02-pla-from-selector.png`.
   *Fix:* rewrite each as a sentence an engineer would write; mark the title [sic] if "Filamant" is the wiki's own
   spelling.
7. **words** · PLA Overview, "What makers say about printing it" and "Uses, limitations and chemicals". Each topic
   carries a count ("22 makers") above a single quote, and the quotes chosen are advertising or trivia: "Odorless
   during printing and fully biodegradable, making it safe for home use", "The material is not easy to bend as the
   strong rigidity.", a note that regrind varies in colour. Shots: `pla-ov-1280L-09.png`, `pla-ov-1280L-11.png`.
   *Fix:* choose quotes that carry a condition or a number (a temperature, a nozzle size, a time), and leave out
   claims a sheet cannot support.
8. **frame** · PLA Products, product card, 1280 and 390. The first card is 3,434 px tall: each of its 22 values
   repeats "also in Bambu Lab, Technical Data Sheet V3.0 PLA Basic" and the same three chips ("dry", "annealed at 55
   °C for 8 h", "print settings"), and a row of advertising "Benefits" follows. Shots: `pla-pr-cardtop-01.png`,
   `pla-pr-card-02.png`, `pla-pr-card-03.png`, `m/plapr390card-01.png`. *Fix:* state a document's shared conditions
   once in its group heading and list only the exceptions per row; fold the maker's statements.
9. **frame** · All Overviews, 1280 and 390. The tables share no grid: on PPS-CF their right edges are 600, 649, 683,
   871, 958, 960 and 1119 px; on PEI-CF the same three products sit at 320–432 / 432–553 / 553–697 in Mechanical,
   553–669 in Thermal and 320–464 / 464–608 / 608–784 in the settings table, so the eye loses a product moving down
   the page. In the settings table "Setting" is top-aligned while the other headers sit on the bottom line (y 587
   against 607). On a phone, a product row's values sit at two heights (581 and 596 px) because "Strength XY, MPa"
   wraps and "HDT 0.45, °C" does not. Shots: `peicf-ov-1280L-04.png`, `-05.png`, `pla-ov-1280L-08.png`,
   `m/plapr390-01.png`. *Fix:* one set of column widths for every "as each sheet publishes it" table on a page; align
   every header to its bottom line; put the phone labels on one line or the values on a common baseline.
10. **frame** · PLA Products, 1280. The product column is 190 px, so 28 of the first 60 names wrap and the rows
    alternate between 43 and 61 px; a blank cell means "not published" without saying so, where the Overview prints
    "not published" and the selector a dash; "Strength XY" wraps in its header while "Strength Z" does not. Shots:
    `pla-pr-1280L-01.png`, `pla-pr-charpy-tier-01.png`. *Fix:* give the name 60–80 px more (the number columns can
    spare it), print a dash in empty cells and add it to the key, and use the same short headers ("XY", "Z") under one
    group heading.
11. **frame** · PEI-CF and PCTG-GF Overview, first screen. Three of the plate's six cells read "Not published"
    (PEI-CF), or show as-published values in grey with no range (PCTG-GF), so the most prominent block on a thin page
    is half empty. Shots: `peicf-ov-1280L-01.png`, `m/peicf390L-0-01.png`. *Fix:* collapse empty cells into one line
    under the plate ("Not published: strength across the layers, notched impact, price").
12. **words** · Every Overview. The strip caption ("One mark per product, on the scale the property has on every page
    (zoomed where its products sit close together, as its label says) …") appears three times on PLA, the grid's
    caption explains its frames again, and "Hover a product …" stays on a phone. Shots: `pla-ov-1280D-05.png`,
    `pla-ov-1280D-07.png`, `m/pla390L-1-01.png`. *Fix:* say it once (the method page, or the first figure) and keep
    one short line per figure; on touch screens drop "hover".
13. **frame** · PLA Overview, 1280, below the first screen. The summary ends at y 823 and the H2C card at about 1,100,
    which leaves a 280 px hole in the left column; further down, the boxed Products plate sits between Printing and
    Uses and breaks the account. Shots: `pla-ov-1280L-02.png`, `pla-ov-1280L-10.png`. *Fix:* put the "Well
    documented" note or the Products standouts under the summary, and move the Products plate to the end, or under
    the first screen.
14. **figures** · PETG and PPS-CF, printing chart. PETG's Vicat label reads "68–85 °C" beside a tick near 170 °C;
    PPS-CF's two Melting ticks at 280 and 284 °C read as the letter "H"; PETG's heading leads with the chamber setting
    of 2 of 73 products rather than its 70 °C softening. Shots: `petg-ov-1280L-07.png`, `petg-ov-1280L-08.png`,
    `ppscf-ov-1280L-07.png`. *Fix:* make the label cover every mark drawn; draw close ticks as one range; lead the
    heading with what governs most products.
15. **frame** · Hub, 1280. The families run down the columns by number of pages, which is never said, so across the
    rows the order reads arbitrary; the grey "No page yet" lists are on every family, and two families hold nothing
    else. Shots: `hub-1280L-01.png`, `hub-1280L-03.png`. *Fix:* order the families in a way the page states (or by
    rows), and collect the materials without a page in one line at the end.
16. **figures** · Phone, alternatives grid. It scrolls sideways inside a 358 px box, cut at "Strength (", with no hint
    that more columns follow. Shot: `m/peicf390L-0-01.png`. *Fix:* a fade at the edge with "scroll →", or stack two
    properties per row.
17. **words** · Small slips: "Carbon-Fiber-Reinforced" in the subtitle and "Carbon-fibre-filled" in the lede on the
    same screen (PPS-CF); PEI-CF has no full chemical name where the other pages do; PLA's grid heading is a label
    ("PLA against its alternatives") where the other pages state a finding; "colorFabb PLA Vertigo prints the same
    sheet"; "1 no data" counted as a statement. Shots: `ppscf-ov-1280L-01.png`, `peicf-ov-1280L-01.png`,
    `pla-ov-1280L-02.png`, `pla-ov-1280L-10.png`.
18. **figures** · Print, A4. The page prints cleanly, but breaks before each figure leave pages 2, 4 and 6 half empty,
    and page 13 holds only the footer: 13 pages in all. Shot: `pla-print-A4.pdf`. *Fix:* let the short text blocks
    share a page with the figure that follows; keep the footer with Sources.

## What is genuinely good, to keep

- **The first screen at 1280:** a big serif name, a six-cell plate with the median, the middle half, the count and a
  small range on each property's own scale, the trust line, a short summary and an "On the H2C" card. Every number in
  the plate sits on one baseline (y = 348.6) even where a label wraps.
- **The return trip:** the selector comes back with its template, its counts, its table scroll and the drawer open.
  The bar swaps *Open in the selector* for *Back to your results*, and keeps it from one material page to the next.
- **The bar:** a breadcrumb, a section menu that names the current section and lists Products, All materials and the
  method, and anchors that land just under the sticky bar.
- **The comparison figures:** the alternatives grid on fixed scales with every material's median as ticks above; the
  two landscape maps; the Z-as-a-share-of-XY plots with the alternatives' shares beneath; the single temperature axis
  that sets the print settings against HDT and Tg.
- **Traceability:** every card value names its document, page and wording, and links to the original. Selecting a
  mark on the Overview opens that product's card on the Products page (`hover-02-card.png`).
- **The Products page's restraint:** search, sort, a count; ranked rows first and a labelled tier for as-published
  values; a clean empty state; columns trimmed to what thin materials publish.
- **Honesty on thin pages:** as-published values are greyed and not ranked, and "Read each figure as one or two
  sheets' word" is said once. Dark mode works throughout, and the theme toggle works.

## What I could not test

Real pointer hover (the CSS hover states did not respond to synthetic events; the click-through did), keyboard and
screen-reader use, real touch scrolling, printing from other browsers or on Letter paper, the pages over https (all
were `file://`, so the printed running header shows a long local path), and the selector beyond the return trip.
