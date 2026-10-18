# Engineer's review of the selector: final (REVIEW-1)

> **Historical record** (2026-10-18): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

> Final review, step 7 of the selector-refinement round. The reviewer is an independent mechanical engineer who had
> never seen the tool. I scored from the rendered pages only:
> - the built selector `dist/H2C_Material_Selector_2026-09-21_4bb15f825013.html`;
> - the PLA (`M001`) and PCTG-GF (`M110`) material pages;
> - the round's fixed screenshot set, re-taken into `review/shots-1/`, and about twenty walks of my own (`walk-*`,
>   `page-*`).
>
> Only after scoring did I read `KEEP.md` and `review/REVIEW-0.md`. Paths below are relative to
> `docs/audits/2026-10-18-selector-refinement/`. Screens are 1280×800 light unless a shot is named otherwise.

## Scores

| # | Line | Score | What holds it back |
|---|---|---:|---|
| 1 | The cold first impression | 6 | The template cards are a clear front door. But the top bar's two missing-data controls are still the loudest thing on the page, and every row of the cold table says "not tested". |
| 2 | Setting requirements | 7 | The templates, removable pills, "Reported, not required", "Values judged" and "Allow annealing: 4 more pass" are excellent. Two pills ("Within H2C capability" and "…within H2C limits") read as the same thing. |
| 3 | Reading the candidates | 7 | Cells are honest (median, range, count, marks with a one-line legend). Under a requirement they grow to three lines ("passing: … / all products: …"). They show the full range where the drawer shows the middle half. |
| 4 | The lenses' graphs | 7 | Why excluded, Compare and Parallel lines (now on log axes) read well. Ashby's plot still starts about 430 px down, under four bands of controls. |
| 5 | Words on the main page | 6 | Mostly data-sheet language. "not tested" before any test is set, the two "H2C" pills, an inert "Let estimates rule out materials" toggle, and lower-cased names in Compare ("tensile modulus (xy)", "notched charpy") make me stop. |
| 6 | The drawer's first screen | 8 | The answer comes first, then the named product, the gate rows with their published value, standard and source, the page's six key figures, and On the H2C. Held back by a red FAIL on a reported-only row under a PASS verdict, and by headers and tabs that wrap. |
| 7 | The drawer's reading flow | 6 | Overview and Printing give different windows for the same setting. Products is an unsorted list of up to 195 cards with no find box. Print profiles still carry empty "Not published / no data" rows. |
| 8 | The drawer's graphs | 8 | The dot-per-product strips (XY over Z, middle half, median, the H2C limit shaded, hollow for unstated) are the best thing in the tool. The counts' wording changes from tab to tab ("ranked of … shown", "counted of … shown", "not counted", "kept out of the median"). |
| 9 | Eye flow, hierarchy and alignment | 7 | A calm palette, consistent chips, dark mode on a par with light, a usable phone layout. Held back by the drawer tab bar wrapping with "Sources" alone on row two, long names wrapping the header to three lines, and one product card whose head collapses. |
| 10 | Tracing and handing off | 8 | Value pop-ups, source links per requirement, Sources with a find box and "Open the original", and a full-page round trip that restores the template, drawer and tab. The pop-up's counts do not add up (176 against 195). "Choose this product" gives no feedback where you pressed it. |
| | **Total** | **70 / 100** | (baseline 62) |

## The owner's asks

1. **Coherent: partly.**
   - **What now agrees:**
     - the drawer's Key properties and the page's six figures (PLA: 2.53 GPa, middle half 1.93–2.87, 55 products);
     - On the H2C on both surfaces (195–230 °C, 50–60 °C, "none needed, 160 of 195");
     - one set of verdict words (PASS / UNKNOWN / FAIL; Within / Partly within / Beyond).
   - **What still breaks:**
     - the table shows the range while the drawer and the page show the middle half (and 33.7 against 34 CAD/kg);
     - Overview against Printing windows (finding 2);
     - two baskets, Shortlist and Chosen products (finding 13);
     - two looks for UNKNOWN (finding 15).
2. **Less overwhelming first impression: partly.**
   - **Better:** the rail opens on Mechanical with real controls, the legend is one line with a "3 more marks" popover, and the stepper is gone.
   - **Still competing with the six template cards:**
     - the top bar's two missing-data controls;
     - a long, open rail;
     - a statistics line;
     - 152 rows that each say "not tested", starting with "316L stainless steel sintering filament".
3. **The drawer transfers its information with good eye and reading flow: partly, close to resolved.**
   - **Overview now runs in the right order:** answer, your requirements, key properties, On the H2C, drying, nozzle
     type, applications, what to verify.
   - **What remains:**
     - the Printing tab disagrees with the Overview's windows;
     - the Products tab is long and its order unexplained.
4. **Terminology an engineer reads without stopping: partly.**
   - **Reads cleanly:** HDT at 0.45 MPa, XY and Z, middle half, "a gap, not a zero", "reported, not required", "Allow
     annealing", "Leave out / Include".
   - **Makes me stop:**
     - "not tested" with no test set;
     - "Within H2C capability" beside "within H2C limits";
     - "its Limitations say why";
     - "55 ranked of 106 shown";
     - a price pop-up that speaks of "products that state the test's orientation or load".
5. **The drawer and the material pages read as one tool: resolved, with two residues.** The names, figures, marks,
   "On the H2C" and "Printing in full" match, and *Full page* → *Back to your results* returns to the same template,
   drawer, tab and highlighted row (`review/shots-1/walk-page-from-drawer.png`, `walk-back-to-results.png`). The page's
   serif display type is a different register, but it reads as the same publication's reference page. The residues:
   - the page still does not carry the reader's PASS;
   - the page prints PCTG-GF's 165 CAD/kg without the drawer's "USD" mark.

## Findings, ranked by what they cost the reader

1. **"not tested" fills the Result column of the cold page.** Main · words · 1280 light and 390 phone ·
   `review/shots-1/main-cold-01.png`, `main-cold-phone-02.png`, `walk-abscf-mech-01.png`.
   - **What is wrong.**
     - Before any requirement is set, every one of the 152 rows reads "not tested". To an engineer, "not tested" next
       to a material means nobody ran the test.
     - The first row is "316L stainless steel sintering filament", which is not what an H2C user came for.
   - **Fix.**
     - Leave the Result cell empty, or hide the column, until a requirement exists. The status bar already says "Set
       a requirement in Filters to see what passed".
     - Open the cold table sorted with build materials first, or with metal and wood under their own fold.
2. **Overview and Printing give different windows for the same setting.** Drawer · words · 1280 light ·
   `review/shots-1/drawer-abscf-overview-02.png`, `walk-abscf-printing-01.png`, `drawer-pla-overview-02.png`,
   `drawer-pla-printing-02.png`.
   - **What is wrong.** Each pair below is one drawer; neither place says which statistic it uses.

     | Material | Setting | Overview | Printing, "Medians of the lowest and highest" |
     |---|---|---|---|
     | ABS-CF | Nozzle | 240–250 °C | 240–260 °C |
     | ABS-CF | Chamber | 60–70 °C | 60–80 °C |
     | PLA | Bed | 50–60 °C | 45–60 °C |
     | PLA | Drying | 40–65 °C | 50 °C |
     | PLA | Chamber | none needed | 25–43 °C |
     | PEEK | Bed | 120 °C | 120–150 °C |
     | PEEK | Chamber | 90 °C | 90–140 °C |

   - **Fix.** Use one statistic in both places, or name each: "the window most products share" in Overview, "median
     lowest – median highest" in Printing.
3. **The missing-data controls are still the loudest thing on the cold page.** Main · frame · 1280 light and dark, 390
   phone · `review/shots-1/main-cold-01.png`, `main-cold-dark-01.png`, `main-cold-phone-01.png`.
   - **What is wrong.**
     - "Materials that could not be checked: Leave out / Include" and a toggle that shows as on but greyed ("Let
       estimates rule out materials… Works only when the materials that could not be checked are included") take
       the top bar before any requirement exists.
     - On a phone the toggle's label wraps to three lines.
   - **Fix.**
     - Put the choice in the results header, beside "39 more could not be checked and are left out" ("Show them").
     - Show the estimates toggle only once Include is chosen.
4. **A reported-only row carries a red FAIL under a PASS verdict.** Drawer · frame/words · 1280 light ·
   `review/shots-1/drawer-pctggf-overview-01.png`, `drawer-pla-overview-01.png`.
   - **What is wrong.**
     - PCTG-GF opens with "✓ PASS: Of its 3 products, 3 meet all your requirements". Below it, the only row under
       "Your requirements" is "✕ FAIL Price at most 45 CAD/kg (reported, not required), Published 164.58 CAD/kg".
     - Under Indoor prototype the gates sit in an "Also met" line, so the one row shown is the one that does not count.
   - **Fix.**
     - List the gates as rows, as they are listed when a numeric requirement is set (`walk-pa6gf-requirements.png`).
     - Put reported rows under a rule, with a neutral mark ("above the 45 CAD/kg you noted") in place of FAIL.
5. **Products is a long, unsorted list with no way in.** Drawer · frame · 1280 light ·
   `review/shots-1/drawer-pla-grades-01.png`, `drawer-pla-grades-02.png`, `drawer-petg-products-01.png`.
   - **What is wrong.**
     - The order is unexplained: PLA's 183 passing cards run 3DXTECH, iSANMATE, Bambu Lab… Nothing says by what.
     - The first card opens fully, about two screens long, and it is not the product Overview named (Bambu Lab PLA
       Basic).
     - There is no find box, while Sources has one.
     - The "Bambu Lab PLA Tough+" card's head collapses: the name wraps under the chevron and PASS drops to its own
       line, pushed by the "sold as toughened" tag.
   - **Fix.**
     - Open on the product Overview named.
     - State the sort ("by price", or "most published first").
     - Add the Sources find box.
     - Put the tag after the name on one line.
6. **Two pills that read as one, and a pointer to nowhere.** Main and drawer · words · 1280 light ·
   `review/shots-1/main-indoor-01.png`, `drawer-peek-overview-01.png`, `drawer-peicf-overview-01.png`.
   - **What is wrong.**
     - "Within H2C capability" and "Nozzle, bed and chamber within H2C limits" sit side by side. Nothing on screen
       says the first is Bambu Lab's material list plus maker limitations.
     - PEEK and PEI-CF say "Beyond H2C capability; its Limitations say why", and no Limitations heading is visible.
   - **Fix.**
     - Rename the first to what it checks ("Not ruled out by Bambu Lab or its maker").
     - Replace the pointer with the reason itself.
7. **One number, three spreads, and pop-up counts that do not add up.** Main ↔ drawer · words · 1280 light ·
   `review/shots-1/main-indoor-table-01.png`, `walk-trace-value.png`, `walk-pa6gf-requirements.png`.
   - **What is wrong.**
     - The same 2.53 GPa is given three ways:
       - the table cell gives "0.95–4.24 · 55" (the range);
       - the drawer and page give "middle half 1.93–2.87";
       - the pop-up says "interquartile".
     - The pop-up's counts do not add up:
       - it says "121 of its 176 products do not report it" for a material the header gives 195 products;
       - its left-out counts (39 + 12) sum to neither.
     - The Price and Density pop-ups say "Median of 3 products that state the test's orientation or load", which a
       price does not have.
     - Price: 33.7 in the table, 34 in the drawer and on the page.
   - **Fix.**
     - Pick one spread for the cell and the drawer, or label the cell "range".
     - Use "middle half" everywhere.
     - Reconcile the pop-up to the header's product count.
     - Word the Price and Density pop-ups for what they are.
8. **The counts' wording changes on every graph.** Drawer · graphs/words · 1280 light and dark ·
   `review/shots-1/drawer-pla-mechanical-dark-01.png`, `drawer-pla-printing-01.png`, `walk-abscf-mech-01.png`.
   - **What is wrong.** The same idea is said several ways:
     - "55 ranked of 106 shown" (Mechanical);
     - "169 counted of 194 shown" (Printing);
     - "kept out of the median" and "not counted" (legends);
     - "Not ranked: …" (table).

     "Ranked" also collides with the table's "Rank by".
   - **Fix.** One phrase everywhere: "55 in the median · 106 drawn", "Left out of the median: …".
9. **The drawer's header and tabs wrap.** Drawer · frame · 1280 light and 390 phone ·
   `review/shots-1/drawer-pla-overview-01.png`, `drawer-pctggf-overview-01.png`, `drawer-abscf-overview-01.png`,
   `walk-pa6gf-requirements.png`, `drawer-pla-overview-phone-01.png`.
   - **What is wrong.**
     - PLA's and PETG's tabs wrap, leaving "Sources 281" alone on a second row.
     - PCTG-GF's full name takes three lines.
     - The ABS-CF and PA6-GF headers spell it "Carbon-Fiber-Reinforced" / "Glass-Fiber-Reinforced" on one line and
       "carbon-fibre filled" / "glass-fibre filled" on the next.
     - On a phone the tab strip runs off with no edge cue.
   - **Fix.**
     - Keep the tabs on one row (shorter "Sources" count, or a scroll with a fade).
     - Clamp the full name to one line, with a title.
     - Use one spelling.
10. **The print profiles still carry bookkeeping.** Drawer · words · 1280 light · `review/shots-1/walk-abscf-printing-01.png`,
    `drawer-pla-grades-02.png`, `drawer-pla-mechanical-01.png`.
    - **What is wrong.**
      - ABS-CF's first profile is all "Not published / no data" rows.
      - Raw strings are shown as values ("220-240C", "80C for 4 hours").
      - "Abrasion: Hardened Steel with .4mm diameter minimum" repeats the nozzle material.
      - A source title is misspelt "H2C Filamant Printing Guide".
      - One product lists "3DXTECH, ECOMAX PLA; …; 3DXTECH, ECOMAX® PLA; 3DXTECH, ECOMAX® PLA".
      - "Named on a data sheet without a value: …" remains in Mechanical and Thermal.
    - **Fix.**
      - Fold an empty profile into one line ("1 profile gives no settings").
      - Show the typed value, with the sheet's words on hover.
      - De-duplicate the sources.
11. **Ashby's plot starts below the fold.** Main · graphs · 1280 light · `review/shots-1/lens-ashby-01.png`,
    `walk-ashby-chart.png`.
    - **What is wrong.**
      - Goal and Asked, Draw, Also, and the two axis pickers come first. The plot begins at about 430 px, and its family
        and shape legends sit under the plot.
      - Most product points carry no label: four PA6-CF diamonds, one named.
    - **Fix.**
      - Fold Goal, Asked and Also into one line above the plot.
      - Put the axis pickers on the axes.
      - Label each material's cluster once.
12. **The results header and the cells are tall.** Main · frame · 1280 light · `review/shots-1/main-indoor-01.png`,
    `walk-outdoor.png`, `main-cold-1180-01.png`.
    - **What is wrong.**
      - About 330 px separates "7 shown" from the first row.
      - Under a requirement, each cell becomes three lines ("passing: 1,060–1,090 / all products: 1,095 /
        1,020–1,170 · 16"), so about five rows fit a screen.
      - The Price column is cut at 1280, and at 1180 the table starts below the fold.
    - **Fix.**
      - Show "passing" only in the requirement's own column.
      - Fit the default column set to 1280.
13. **Choosing a product goes into a second basket, silently.** Drawer and main · frame · 1280 light ·
    `review/shots-1/walk-choose-product.png`.
    - **What is wrong.** Pressing *Choose this product* leaves the button unchanged. A "Chosen products: 1" chip
      appears in the foot beside "Shortlist 0 of 6", a separate basket for materials.
    - **Fix.**
      - Turn the button to "Chosen ✓".
      - Make one basket that holds materials and their chosen products.
14. **Compare's explainer lower-cases the property names.** Main · words · 1280 light ·
    `review/shots-1/walk-compare-filled-01.png`, `walk-compare-filled-02.png`.
    - **What is wrong.**
      - "Tracks spanning more than a hundredfold (tensile modulus (xy) and elongation at break (xy) and notched charpy
        impact) use a log scale".
      - "widened to a value shown" is opaque.
    - **Fix.**
      - Keep the names' case.
      - Say "scale extended to PA6-GF's 61.4 MPa".
15. **Two looks for UNKNOWN, four kinds of header badge.** Drawer · words/frame · 1280 light ·
    `review/shots-1/drawer-peek-overview-01.png`, `drawer-pla-overview-01.png`, `drawer-pctggf-overview-01.png`,
    `walk-pa6gf-requirements.png`.
    - **What is wrong.**
      - PEEK shows "◐ UNKNOWN" (blue) and "? UNKNOWN" (amber) one row apart, and no key says how they differ.
      - The badge under the name takes four forms: "Type on Bambu Lab's H2C list", "Bambu Lab filament", "Unlisted,
        within H2C temperatures" and "Beyond H2C capability".
    - **Fix.**
      - Give the partial case its own word ("partly within").
      - Bring the header badge to two or three states, worded like the gate rows.

Smaller:
- "Published 1350 kg/m³" without a separator, beside "1,310 kg/m³".
- The search placeholder is cut to "Material, r" at 1180.
- The page's PCTG-GF price lacks the drawer's USD mark.

## What is genuinely good and must be kept

1. **The template cards** (main, cold page, `review/shots-1/main-cold-01.png`). They name a part first ("A jig or a
   fixture") and then the data-sheet limits. They say "decides nothing", and their effect is visible in the rail
   ("1500", "3", "2 set").
2. **The template's basis and its levers** (main, results header, `review/shots-1/walk-outdoor.png`):
   - "Values judged: as printed, dry";
   - "Allow annealing: 4 more pass";
   - "Not checked by this template: UV and weathering";
   - the dashed "Reported, not required" pill.

   They state what is compared, what is left open and what one change would buy.
3. **Why excluded** (main, `review/shots-1/lens-explain-01.png`). For each requirement: failed, could not check,
   "removing it would bring back N", and *Remove*. The reported price is set apart under a rule. It is a sensitivity
   analysis in one glance.
4. **"What this database cannot answer"** (main, cold page fold). It names warping, AMS, enclosure need and UV/food
   contact/creep/fatigue as unanswerable, with the counts. An engineer trusts a tool that says this.
5. **The drawer's gate rows with numbers, standards and sources** (drawer Overview,
   `review/shots-1/walk-pa6gf-requirements.png`, `drawer-peek-overview-01.png`). Each row reads like this: "PASS
   Tensile modulus (XY) at least 3 GPa, Published 4.261 GPa (XY, ISO 527). Moisture state and post-processing not
   stated · source". FAIL rows give the reason in the printer's numbers: "Requires up to 480 °C; the H2C reaches only
   350 °C".
6. **The verdict box naming the product** (drawer Overview, `drawer-abscf-overview-01.png`). "Of its 11 products, none
   meets all … 1 fails … 10 publish too little to judge", then "Shown for its closest product". The UNKNOWN chamber row
   explains itself: "recommended with no temperature, so 65 °C is not shown to be enough".
7. **Key properties shared with the material page** (drawer Overview and page, `drawer-pla-overview-01.png`,
   `walk-page-from-drawer.png`). The same six figures appear on both, with the same median, middle half and count. "as
   published · no stated orientation" is greyed where it applies, and "Not published" is written out.
8. **The product-by-product strips** (drawer Mechanical, Thermal, Printing, `drawer-pla-mechanical-dark-01.png`,
   `walk-abscf-mech-01.png`, `drawer-pla-printing-01.png`). XY sits over Z, with the middle half and median, hollow
   for unstated, and the H2C limit shaded. The table below says what was left out and its range. Z as a share of XY
   is given in one sentence.
9. **On the H2C, with Within / Partly within / Beyond and counts** (drawer Overview and page). "All 195 products are
   within the H2C's 350 °C", "3 within … 4 above". Drying and nozzle type are printed as values, not badges.
10. **The full-page round trip** (`review/shots-1/walk-page-from-drawer.png`, `walk-back-to-results.png`). *Full page*
    becomes *Back to your results*, and returns to the same template, drawer, tab (tested on Mechanical) and
    highlighted row.
11. **Sources and Price as audit trails** (drawer, `drawer-pla-evidence-01.png`, `drawer-pla-price-01.png`).
    - **Sources:** documents by publisher, a find box, "Covers / Gave", "Open the original", one record form.
    - **Price:** listings with sale, stock and "used", and the method in one paragraph.
12. **Absence shown, not hidden** (drawer Mechanical, Thermal, tabs, `drawer-pla-mechanical-01.png`,
    `drawer-pctggf-overview-01.png`). The dashed "Not published for this material … a gap, not a zero" box, and grey
    tabs at zero (PCTG-GF Environment, PEEK Price).
13. **The Compare summary for hand-off** (main, `walk-compare-filled-01.png`). It writes out the requirements, the
    template, the missing-data choice, the release, the data date and the build date, with *Print summary*. Linear
    tracks are bars and log tracks are ticks, with the requirement drawn as a line.
14. **Dark mode at full parity** (`main-cold-dark-01.png`, `drawer-pla-mechanical-dark-01.png`). The chips, strips and
    shading all hold their meaning.

## Final review: the keep register

Where I checked each item; "not checked" where I could not see it on screen.

| # | Final | Where checked |
|---|---|---|
| K01 | kept | Neutral top bar, accent only on the selected tab or chip, provenance at the foot: `main-cold-01.png`, `main-cold-dark-01.png` |
| K02 | kept | "87 shown" behind Table, Ashby, Parallel lines, Data coverage and Why excluded (`lens-*-01.png`). Cross-lens highlight not checked |
| K03 | kept | "Indoor prototype template · 39 more could not be checked…", "Not checked by this template", rail filled (`walk-outdoor.png`). The "changed" note was not checked |
| K04 | kept | "147 of 152 have data" and "e.g." on every rail control (`main-cold-01.png`) |
| K05 | kept | Footer ☑ PASS 87 · ☐ UNKNOWN 39 · ☐ FAIL 26 (`main-indoor-01.png`). SCREENED not seen (estimates off under Leave out) |
| K06 | kept | `lens-explain-01.png` |
| K07 | kept | "Of its 195 products, 183 meet… 12 publish too little to judge. Show the products" (`drawer-pla-overview-01.png`) |
| K08 | kept | Each gate row has its own *source* button ("Opens measurement V001170 in Sources"). The names agree across the pill, Why excluded and the drawer (`walk-pa6gf-requirements.png`) |
| K09 | kept | Tensile, Flexural, Impact, Hardness, Heat deflection and glass transition headings with counts (`drawer-pla-mechanical-01.png`, `drawer-pla-thermal-01.png`). Toughened set apart in Impact not opened |
| K10 | kept | `drawer-pla-printing-01.png`, `walk-abscf-printing-01.png` |
| K11 | kept | Sources: "Open the original (web page)", ID marks only (`drawer-pla-evidence-01.png`), value pop-up with "Open its products" (`walk-trace-value.png`). Opening a cached document not checked |
| K12 | kept | Products is the second tab, "Meet all your requirements" group first, *Choose* on the name line (`drawer-pla-grades-01.png`) |
| K13 | kept | "1 known gap · See the sources", "Not published for this material", grey tabs (`drawer-pla-overview-cold-02.png`, `drawer-pctggf-overview-01.png`) |
| K14 | kept | Data-sheet terms throughout. Residues in findings 1, 6 and 8 |
| K15 | kept | Full page → Back to your results restored the template, drawer, Mechanical tab and highlighted row (`walk-back-to-results.png`). Scroll position not checked |
| K16 | kept | "Estimates for the missing values show when … Include, with 'Let estimates rule out materials' ticked", said once (`drawer-pctggf-overview-02.png`). The Include state was not checked |
| K17 | kept | Mechanical and Thermal open as closed bordered headings with counts (`drawer-pla-mechanical-01.png`, `drawer-pla-thermal-01.png`) |
| K18 | kept | XY over Z, middle half shaded, median, "%, log scale" on the axis only (`drawer-pla-mechanical-dark-02.png`) |
| K19 | kept | Fixed chip column, bold requirement, one reason in the printer's numbers (`drawer-peek-overview-01.png`) |
| K20 | kept | Name, chip and *Choose* on one line, settings in a tinted inset (`drawer-pla-grades-01.png`). It breaks when a "sold as toughened" tag is present (finding 5) |
| K21 | kept | Dashed "Not published for this material … A gap, not a zero" box (`drawer-pla-mechanical-01.png`) |
| K22 | kept | Property, value, conditions, locator, ID in Sources (`drawer-pla-evidence-01.png`) |
| K23 | kept | `main-cold-01.png` |
| K24 | kept | "Values judged: as printed, dry. Allow annealing: 4 more pass" and "Not checked by this template: UV and weathering" (`walk-outdoor.png`) |
| K25 | reproduced | Once, on the cold page, reworded: "No material is ranked on a number nobody measured: a property never published shows as a gap, not a guess" (`main-cold-01.png`) |
| K26 | kept | "How XY and Z differ, and what is compared" fold present (`walk-abscf-mech-02.png`). The HDT/Tg explainer's text was not opened |
| K27 | kept | Environment's "treat them as indications, not design data" and the Overview's allowables sentence at the foot (`drawer-pla-environment-01.png`, `drawer-pla-overview-cold-02.png`) |
| K28 | reproduced | "— not published", "* published, not comparable", "n/a not applicable", "Choose this product" kept. "No heated chamber needed" now reads "Heated chamber · none needed" (`drawer-pla-overview-02.png`) |
| K29 | kept | One opening sentence per tab (Mechanical, Thermal, Printing, Environment, Price, Sources, Products shots) |
| K30 | not checked | The instruction "Select a dot to open its result below; hover to find the same product in the other rows" is present. My click on a dot did not reach it |
| K31 | kept | "Not ranked: 39 with no stated orientation (1.44–4.78), 12 with an added filler or additive (0.715–4.73)" (`drawer-pla-mechanical-dark-02.png`). The wording could be lighter (finding 8) |
| K32 | kept | ABS-CF's legend shows only its three marks against PLA's five. No band where n < 4 (`walk-abscf-mech-01.png`) |
| K33 | kept | PLA nozzle: "the H2C reaches 350 °C, above this scale"; the 65 °C chamber limit drawn (`drawer-pla-printing-01.png`, `-02.png`) |
| K34 | kept | The median is large and the spread and count small in the table cell, the drawer row and the page plate (`main-indoor-01.png`, `drawer-pla-overview-01.png`, `page-pla-01.png`) |
| K35 | kept | "sold as toughened" orange tag in Products (`drawer-pla-grades-02.png`). Its colour in the Impact graph was not checked |
| K36 | reproduced | Now "Shown for Bambu Lab PLA Basic, one of the 183 that pass" and "Shown for its closest product, …" (`drawer-pla-overview-01.png`, `drawer-abscf-overview-01.png`) |
| K37 | kept | A dotted name opens its definition, and a value opens its median, range and left-out counts (`walk-trace-keyprop.png`, `walk-trace-value.png`) |
| K38 | kept | PCTG-GF Environment, PEEK Price and PEI-CF Environment and Price are grey |
| K39 | kept | "middle half", "median", the property names, "Bambu Lab Filament Guide", the annealed square in the table legend, the grey diamond for filler, the toughened orange |
| K40 | kept | Dashed pill on main, "reported, not required" tag in the drawer. Its FAIL chip in the drawer is finding 4 |
| K41 | kept | `drawer-pla-price-01.png` |
| K42 | kept | `lens-explain-01.png`, with the reported row under its own rule |
| K43 | kept | Foot "data 2026-09-21 · release 4bb15f825013"; the Compare summary with requirements, release, data and build dates, *Print summary* (`walk-compare-filled-01.png`) |
| K44 | kept | "e.g. 3; unfilled PLA is about 2.5." (`main-cold-01.png`) |
| K45 | kept | The page is unchanged in form (`page-pla-01.png`, `page-pctggf-01.png`), and the drawer now borrows its six figures and On the H2C |

**Lost: none.** Not checked: K30 (the dot click). Partly checked: K02, K05, K09, K16, K26 and K35, as noted.

## Final review: the baseline's ten costliest findings

| # | REVIEW-0 finding | Final | Evidence |
|---|---|---|---|
| 1 | The drawer contradicts itself on printability | **partly** | **Fixed:** inside Overview, the gate rows and On the H2C now agree (PEEK: "FAIL Bed ≤ 120 °C, requires up to 180 °C" beside "Partly within, Bed 120 °C · 3 within, 4 above"), and PLA's windows match the page. **Remains:** the Printing tab gives other windows for the same settings (finding 2) |
| 2 | The "best match" is a product with no price | **resolved** | "Shown for Bambu Lab PLA Basic, one of the 183 that pass … Published 27.99 CAD/kg" (`drawer-pla-overview-01.png`) |
| 3 | A policy switch is the loudest thing on the cold page | **not** | Reworded to "Materials that could not be checked: Leave out / Include", but still in the top bar, with the on-but-inert estimates toggle beside it (`main-cold-01.png`, `main-cold-phone-01.png`) |
| 4 | The Overview is long; the tabs are bookkeeping | **partly** | **Fixed:** Overview is in the proposed order, about two screens, and tab counts are gone except Products and Sources. **Remains:** the tab bar still wraps with "Sources" alone at 1280 for PLA and PETG (`drawer-pla-overview-01.png`) |
| 5 | Too many verdict words | **resolved** | PASS / UNKNOWN / FAIL; Within / Partly within / Beyond; drying and nozzle type printed as values. Residue: two looks for UNKNOWN (finding 15) and the cold "not tested" (finding 1) |
| 6 | Bookkeeping fills the inner tabs | **partly** | **Fixed:** "Not stated by its maker: 12 topics" is folded, and IDs sit behind ID marks. **Remains:** empty "Not published / no data" profile rows, duplicated sources, and "Named on a data sheet without a value" (finding 10) |
| 7 | The drawer and the page disagree | **partly** | **Fixed:** PLA's figures, windows, drying and price match exactly (`drawer-pla-overview-01.png`, `walk-page-from-drawer.png`). **Remains:** the table still shows 33.7 against 34, and the page does not carry the verdict |
| 8 | "annealed median" contradicts the header | **partly** | **Fixed:** it is now a square mark explained under "3 more marks". **Remains:** an annealed median still marks ABS's density under "Values judged: as printed, dry", and nothing says why it may decide |
| 9 | The lens graphs mislead or clip | **partly** | **Fixed:** the Ashby y-axis title is whole, Compare draws ticks on log tracks and says "all 152 materials", and Parallel lines uses log axes. **Remains:** Ashby's plot still starts about 430 px down (finding 11) |
| 10 | The results header is heavy and rows are tall | **partly** | **Fixed:** Rank by and Compare against share one row, and the legend is one line plus a popover. **Remains:** the header is about 330 px, cells are three lines under a requirement, and the Price column is cut at 1280 (finding 12) |

**Count: 2 resolved, 7 partly, 1 not.**

## What I could not test

- **Clicking a dot** in a comparison graph and the hover that lights the same product (K30). My synthetic click did not reach a dot.
- **The Include state:** the Estimated section, the SCREENED chip and the estimates toggle working.
- **The Impact heading:** toughened products set apart, in colour.
- **A cached source document** opening at its page.
- **Pages beyond these:** the material pages in dark mode or on a phone, and keyboard-only navigation.
- **Scroll position** restored after the round trip (the tab was restored).
