# The drawer against the material page

> Review only (2026-10-18). PLA (M001), PETG (M020), PCTG-GF (M110), PEI-CF (M118): the selector's drawer, all eight tabs,
> cold and under Indoor prototype, against each material's Overview and Products pages, read as text with every fold
> open and checked in screenshots. Screenshots are in this folder. Nothing in the code or data was changed.

## Findings

**What is already coherent.** The facts agree. On all four materials, every key figure, middle half and product count
in the drawer is the same as on the page's plate (PLA 2.53 GPa, 45.5 MPa, 30.6 MPa, 6 kJ/m², 55 °C, 34 CAD/kg, and the
middle halves too). The windows for nozzle, bed, chamber and drying are the same, and so are the "N ranked of M shown"
counts on every comparison graph, the document counts (281, 127, 8, 5), the H2C status words and the "not design
allowables" sentence. Since D146 the drawer's Overview follows the page's order (key figures, then On the H2C), and its
comparison graphs follow the page's figure grammar: the same marks, the same key and the same middle half and median.
That shared facts layer is the right base. Very little is left to align.

**What is not.** There are two kinds of difference.

1. *A fact stated two ways* (the list is below the table). PEI-CF's HDT median is "> 200 °C" on both plates but "200" in
   five tables and figures. The drawer's price sentence counts a listing that was not used. The drawer counts gaps the
   page does not show. The drawer says "2 above or only partly within" where the page says "beyond". The drawer's
   *Also* line shows an as-published value as if it were a median. And PEI-CF's drying is "1 of 3 products calls for it"
   but "2 products" a section later, on both surfaces.
2. *A reading aid one side has and the other lacks.* The page has an **evidence line** ("Thinly documented … read each
   figure as one or two sheets' word") and a **verdict for each chemical exposure** ("Not resistant, in 8 of 12
   statements"). The drawer has neither. It shows PCTG-GF's two-sheet numbers with the same confidence as PLA's 281
   documents, and it lists PETG's 12 acid statements with no summary line. In the other direction, the drawer names
   the missing key figures by their own labels ("Tensile strength (Z)"). The page's plate renames them in its
   *Not published* line ("strength across the layers", "notched impact").

**Is more coherence worth it?** Yes for facts and words, no for form. The two surfaces do different jobs. The drawer is a
check inside a screening workflow: does it pass, can the H2C print it, where does this number come from. The page is
read at length: what is this material, how does it compare, which product. Most differences in form are right and
should stay (see *What to keep*). The reader notices an incoherence at one moment: they click **Full page** and find
the same number written differently, or a judgement on one surface that the other leaves out. That moment costs trust,
and the fixes below remove every case I found in four materials. The benefit is real but modest: perhaps one reader in
three would ever notice a given item. Making the drawer a small copy of the page would hurt. A summary, *Among the
materials* or the plate's small spread drawings would push "Can the H2C print it?" below the fold of a 620 px panel,
and they would repeat what the selector's lenses already do.

### What each shows, section by section

| Section | Drawer (tab, form) | Page (section, form) | Verdict |
|---|---|---|---|
| Name, identity, status | Name, then the full name beside it (a long name wraps to 3 lines); identity line; status chip, coloured | Name, full name in italics, identity sentence; a neutral grey banner when beyond the H2C | Same facts. Keep the colour difference. Fix the wrap (R10) |
| Answer to requirements | Overview opens on PASS, the counts, *Your requirements* | None, by rule | Keep |
| Key figures | 6 rows: label, bold value, "middle half … · N products"; missing figures stay in place as "Not published" | A 6-card plate: large value, small spread drawing, "N products / middle half …"; missing figures move to one *Not published* line under other names | Values identical. Align the names (R5) |
| Other properties | One *Also* line (density, elongation, Izod, Tg) | Spread across Mechanical, Thermal and *Density and price* prose | Mark as-published values (R6) |
| Summary, evidence | None. *On file: N measurements from N documents · N known gaps* | A written summary, then the **evidence line** (well, partly or thinly documented) | Borrow the evidence word (R4) |
| On the H2C | Chip per row (Within, Partly, Beyond) + window + count + a second clause per row that repeats the limit | A table of window and count, then **one** closing line about the H2C's limits | Borrow the closing line (R3) |
| Among the materials | None (the selector's lenses do this) | Alternatives figure, two maps | Keep |
| Mechanical, thermal | Closed headings with graphs; each property list with every record; a long *Not published for this material* list | Prose, graphs per property (≥ 4 ranked) or a per-sheet table; Z against XY | One grammar. Different axes for the same property (R11) |
| Printing | Lowest and highest dot graphs per setting, the window "as the Overview gives it", a card per profile | One temperature axis that also shows service temperatures, a settings table, makers' quotes | Keep both (they answer different questions) |
| Products | Grouped by maker, the lead maker first; collapsed line "Density · Modulus XY · Strength XY"; spread table; *What makers say* counts | A flat table, most documented first, with the plate's columns, sortable | Align the line values and say the order (R8) |
| Uses, limitations | *Typical applications* (the project's text, no source shown) | *What it is sold for*: makers' quotes, the same text last, "after Prusa Research" | Keep. The page's attribution is better |
| Environment | Every statement, its verdict word in bold, grouped by category, **no category verdict** | One verdict per exposure, with counts | Borrow the verdict (R2) |
| Price | A tab: headline, method note, listings table (unused ones shown) | Prose in *Density and price* | Align the count and the sampling sentence (R7) |
| Sources, gaps | A tab; Known gaps, then Review notes; count on Overview | One paragraph, a publisher table, own gaps only | Align the gap count (R9) |
| Estimates | Only with Include and *Let estimates rule out* on | A fenced table when a key figure is missing or cannot be ranked | Keep (the drawer depends on the mode) |

### Where they still state a fact differently

| # | Fact | Drawer | Page | Evidence |
|---|---|---|---|---|
| D1 | PEI-CF HDT 0.45 MPa median | "> 200 °C" (key figures) but **"200"** in the Products spread table and the Thermal heading's table | "> 200" (plate) but **"200"** in the alternatives figure and table and the *In service* figure and table | `drawer-peicf-overview-01.png`, `drawer-peicf-products-01.png`, `page-M118-01.png`, `page-peicf-inservice.png` |
| D2 | PCTG-GF price | "165 CAD/kg ᵁˢᴰ, one product's price, **from 2 shop listings**" (one is unused: out of stock, a sale price) | "165 CAD/kg, one product", "from Texas Filament Supply's **listing** in USD" | `drawer-pctggf-price-01.png`, `page-pctggf-price.png` |
| D3 | Products beyond a limit | "None within the H2C's 350 °C, **2 above or only partly within**" (PEI-CF); PETG chamber chip "Partly within", "2 above or only partly within" | "Beyond the H2C's limits …: nozzle for 2 products …"; PETG "chamber for 2 products" | `drawer-peicf-overview-01.png`, `page-M118-01.png` |
| D4 | Known gaps | "On file: … **2 known gaps**" (PCTG-GF; Known gaps shows 1, and the other is in Review notes); PLA and PETG "**1 known gap**" is the *Rarely published properties* row that every material has | No gap named for any of the four | `drawer-pctggf-overview-02.png` |
| D5 | PCTG-GF elongation at break | *Also*: "Elongation at break (XY) 8 %", unmarked (only a tooltip says as published) | "As published, its products give … an elongation at break of 8 %" | `drawer-pctggf-overview-01.png` |
| D6 | Missing key figures | "Tensile strength (Z)", "Notched Charpy impact" | "strength across the layers", "notched impact" | `drawer-pctggf-overview-01.png`, `page-M110-01.png` |
| D7 | PEI-CF drying (both surfaces) | "100–140 °C, 6–8 h · 1 of 3 products calls for it"; Printing: "Drying, 2 products" | The same first line; the printing figure: "100–140 °C, 6–8 h, 2 products" | `page-M118-01.png`, `page-peicf-inservice.png` |
| D8 | Price sample | "9 Canadian **retailers** and 7 foreign **sellers**, sampled **2026-09-10 to 2026-10-07**, not live" | "9 Canadian **shops** and 7 foreign **shops** between **10 Sep and 7 Oct 2026**; shipping and tax are not included" | `drawer-pctggf-price-01.png` |

## Recommendations

Ranked by benefit for effort. Each names the side that moves.

**R1. Keep the bound's sign wherever a median is a bound (fixes D1).** *Moves:* the tables on both surfaces move to the
key figure's form. *Place:* the drawer's Products spread table and Thermal comparison table; on the page, the
alternatives figure and table (`among.js`) and the *In service* row and table (`charts/temperatures.js`). *Before:* "200".
*After:* "> 200", the same as the plate two lines above. *Benefit:* an engineer who checks PEI-CF's heat resistance reads
one number, not two. Commit 733b919e fixed this in the per-sheet tables only. *Effort:* S. *Risk:* none. A test that
compares number strings may need the operator.

**R2. Drawer: one verdict per exposure at the head of each Environment category (fills the drawer's main gap).**
*Moves:* the drawer. *Place:* the Environment tab (`drawer-petg-environment-01.png`, against `page-petg-chemicals.png`).
*Before:* "Acid resistance", then 12 statements in mixed words ("Not resistant", "Good", "Poor", a quoted sentence).
*After:* "Acid resistance: Not resistant, in 8 of 12 statements", with the statements below unchanged. Move
`verdictWords` from `app/pages/findings.js` into a shared `app/js/ui` module so both surfaces count the same way.
*Benefit:* "does it take acid?" gets an answer in one line, the page's answer. *Effort:* S–M. *Risk:* low, since it is
one function used twice.

**R3. Drawer, On the H2C: drop each row's second clause and close with the page's one line (fixes D3).** *Moves:* the
drawer. *Place:* the Overview's *On the H2C* block. *Before:* "All 3 products · All 3 products are within the H2C's 350
°C." on each of three rows, or "None within the H2C's 350 °C, 2 above or only partly within and 1 gives no nozzle
temperature". *After:* each row keeps its chip and the page's count ("all 3 products", "both that give one"). One line
under the rows, the page's own: "No product's setting is beyond the H2C's limits: nozzle 350 °C, bed 120 °C, heated
chamber 65 °C" or "Beyond the H2C's limits (…): nozzle for 2 products, bed for 2 products and chamber for 1 product".
*Benefit:* the Overview is 3 to 6 lines shorter, the words match the page, and the hedge "above or only partly within"
goes. *Effort:* S (`print-brief.js` already has both sentences). *Risk:* a *Partly within* chip loses its count on its
own row. The closing line names it.

**R4. Drawer: put the page's evidence word on the On-file line.** *Moves:* the drawer. *Place:* the Overview's *On file*
line (`drawer-pctggf-overview-02.png`, against `page-M110-01.png`). *Before:* "On file: 20 measurements from 8 documents ·
2 known gaps". *After:* "**Thinly documented** · 20 measurements from 8 documents …", the word from `evidenceTier`
(`material-highlights.js`, already shared), with the page's one-sentence reason as its title. *Benefit:* the most useful
trust cue in a quick check. Today PCTG-GF and PEI-CF look as solid as PLA in the drawer. *Effort:* S. *Risk:* none.

**R5. Page: name the missing key figures with the plate's own labels (fixes D6).** *Moves:* the page. *Place:* the
plate's *Not published* line (`app/pages/sections/masthead.js`). *Before:* "Not published: strength across the layers,
notched impact, price." *After:* "Not published: tensile strength (Z), notched Charpy impact, price." *Benefit:* one name
per figure on the plate, in the drawer and on the Products columns, so a reader looking for "(Z)" finds it. *Effort:* S.
*Risk:* none.

**R6. Drawer: mark an as-published value in the *Also* line, as the key rows and the page do (fixes D5).** *Moves:* the
drawer. *Place:* `.kp-also`. *Before:* "Elongation at break (XY) 8 %" in the same weight as a median. *After:* "○ 8 % as
published", using the page's hollow mark from the Products key, and the value set grey as on the page's plate. *Benefit:*
the drawer stops presenting a number its own key rows decline to rank. *Effort:* S. *Risk:* none.

**R7. Drawer, Price: count the listings used and use the page's sampling sentence (fixes D2, D8).** *Moves:* the drawer.
*Place:* the Price tab's headline and note. *Before:* "165 CAD/kg ᵁˢᴰ, one product's price, from 2 shop listings" and "9
Canadian retailers and 7 foreign sellers, sampled 2026-09-10 to 2026-10-07, not live". *After:* "165 CAD/kg, one
product's price, from 1 listing in USD, converted to CAD", and the page's `priceSampleLine`. A superscript "USD" beside
"CAD/kg" reads as a price in USD; "from USD" says what it is. *Benefit:* the same price is described the same way in both
places. *Effort:* S. *Risk:* none.

**R8. Drawer, Products: list the key figures in the plate's order, and say why the first maker leads.** *Moves:* the
drawer. *Place:* the Products tab, before any requirement is set (`drawer-petg-products-closed-01.png`, against
`page-M020-products-01.png`). *Before:* each product reads "Density 1,280 kg/m³ · Modulus XY 1.4 GPa · Strength XY 47
MPa". The list opens on 3DXTECH, a 2-product maker, by an unstated rule (`leadMaker`: the maker of the typical product).
*After:* the first three published of "Modulus XY · Strength XY · HDT 0.45 · Price", the page's columns, and the first
line ends "…by maker; 3DXTECH first, its products being the material's typical value most often". *Benefit:* the
collapsed line answers the questions the plate asks, and the order no longer looks arbitrary next to the page's "Most
documented first". *Effort:* S. *Risk:* none. Under requirements, the passing-first order stays.

**R9. Drawer: count only the gaps the reader is shown (fixes D4).** *Moves:* the drawer, to the page's `readerGap`
rule. *Place:* the *On file* line and the empty-tab offers. *Before:* "2 known gaps" (PCTG-GF), where one gap is shown and
one is in Review notes; "1 known gap" (PLA, PETG), where that gap is the boilerplate *Rarely published properties* row.
*After:* the count of rows shown under *Known gaps*, leaving out the rarely-published row. PLA and PETG then say no gap,
as their pages do. *Benefit:* a count that adds up when followed. *Effort:* S. *Risk:* none.

**R10. Drawer head: set a long full name as the page does.** *Moves:* the drawer. *Place:* `.drawer-head h2`
(`drawer-pctggf-overview-01.png`). *Before:* PCTG-GF's full name wraps at the heading's line height into three ragged
lines, and the tabs start 65 px lower than for PLA. *After:* the full name in the identity line's size and line height,
on its own line under the name as on the page (italics optional). *Benefit:* a calmer head and the page's typographic
order. *Effort:* S. *Risk:* none.

**R11. Make the drawer's two drying counts agree, through the shared sentence (fixes D7).** *Moves:* the shared brief
(`print-brief.js`), so both surfaces move together. *Before:* "100–140 °C, 6–8 h · 1 of 3 products calls for it", then
"2 products" in the figure. *After:* "1 of 3 products calls for it; 1 more gives it as optional". *Benefit:* the window
and its count describe the same products. *Effort:* S. *Risk:* none.

**R12 (lowest). Drawer graphs: use the page's scale type for a property.** *Moves:* the drawer. *Place:* the comparison
headings (`drawer-pla-mechanical-01.png`, against `page-pla-scroll-04.png`). *Before:* PLA's tensile modulus on a linear
0–5 GPa axis in the drawer, but on a log 0.5–10 axis on the page's plate and figure. *After:* log for modulus and impact,
as on the page, keeping the drawer's shared XY/Z axis. *Benefit:* the same dots look the same on both surfaces. Few
readers will notice. *Effort:* M. *Risk:* the "log beyond 10×" rule is tested, so it would need a decision line.

## What to keep (different on purpose)

- **Status colours and chips in the drawer, none on the page.** The drawer judges against the H2C and the requirements.
  The page decides nothing (D145). PEI-CF's red banner in the drawer and grey banner on the page are both right.
- **No summary, *Among the materials* or plate drawings in the drawer.** The panel is 620 px wide and its job is the
  check. The page and the selector's lenses already compare.
- **The drawer's full record and the page's chosen record.** The drawer lists every property not published (17 for
  PCTG-GF), every statement and every listing, unused ones included. The page names what matters and folds the rest.
  This is the right division for a check versus a reading.
- **Two printing figures.** The page's single temperature axis answers "how hot can a part get". The drawer's lowest and
  highest dots answer "which product, and where". Each fits its job.
- **Cards with *Choose* in the drawer, a sortable table on the page.**
