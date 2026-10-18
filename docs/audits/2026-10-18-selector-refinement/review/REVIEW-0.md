# Engineer's review of the selector: baseline (REVIEW-0)

> **Historical record** (2026-10-18): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

> Baseline review, step 1 of the selector-refinement round, 2026-10-18. The reviewer is an independent mechanical
> engineer who had never seen the tool. I judged only what is on screen: the built selector
> `dist/H2C_Material_Selector_2026-09-21_7f3f14384dab.html`, the PLA (`M001`) and PCTG-GF (`M110`) material pages, the
> screenshots in `shots/base/`, and seven screenshots of my own in `review/shots-0/`. I read no code and none of the
> round's other documents before scoring. Screenshot paths below are relative to
> `docs/audits/2026-10-18-selector-refinement/`. Laptop is 1280×800, light theme, unless a screenshot is named otherwise.

## Scores

| # | Line | Score | What holds it back |
|---|---|---:|---|
| 1 | The cold first impression | 6 | The templates are a good place to start, but the loudest thing on the page is a missing-data policy switch in the top bar, set before the reader has asked anything. |
| 2 | Setting requirements | 7 | The rail controls are excellent once you reach them, but they sit about 850 px down, under a 25-row family checklist, and the pill names change from one view to the next. |
| 3 | Reading the candidates | 6 | The cells are honest (median, range, count), but they are tall, overflow to the right, and carry an "annealed median" caption that contradicts "Values judged: as printed, dry" and is not in the legend. |
| 4 | The lenses' graphs | 6 | Ashby clips its own y-axis title and starts below the fold; Compare draws bars from zero on a log scale; one 400 % outlier flattens the Parallel lines. |
| 5 | Words on the main page | 6 | The engineering terms are right, but project words stand beside them: Confirmed only, Include uncertain, reported only, not tested, "nothing: sort by column". |
| 6 | The drawer's first screen | 6 | The answer comes first, which is right, but the "best match" shown is a product with no price while price is the one requirement in view. |
| 7 | The drawer's reading flow | 5 | Overview runs about three screens and states printability twice with different numbers; twelve verdict words; IDs and locators on every row. |
| 8 | The drawer's graphs | 7 | The product-by-product dot graphs are strong, but they overplot and their counts (106 products) differ from the table's n (55). |
| 9 | Eye flow, hierarchy and alignment | 6 | The top bar and the results header are heavy; the drawer's tab bar wraps to two rows; on a phone the drawer's Full page button is blank. |
| 10 | Tracing and handing off | 7 | Every value reaches a dated source and "Choose this product" exists, but the trail is cluttered with ID, "where" and "review note" chips, and the page loses your verdict. |
| | **Total** | **62 / 100** | |

## The owner's asks

1. **Coherent: partly.** One statistical language runs through the tool (median, middle half or range, count, "not
   published", a gap that is not a zero), and that is its backbone. It breaks in three places:
   - verdict words multiply (finding 5);
   - the same requirement has different names in the pills, Why excluded and the drawer (finding 11);
   - the drawer and the page give different numbers for the same material (finding 7).
2. **Less overwhelming first impression: partly.** The six template cards are the right front door. Too many things
   compete with them: the policy controls in the top bar, a four-step stepper, a statistics line, a caveat, a
   25-family rail, and a "not tested" pill on every one of 152 rows.
3. **The drawer moves its information with good eye and reading flow: partly.** It leads with the answer ("183 of 195
   meet all your requirements"), which is right. Below that, Overview repeats printability twice, with numbers that
   disagree, before the key properties. The tabs wear record counts, and the inner tabs carry bookkeeping.
4. **Terminology an engineer reads without stopping: partly.**
   - Reads cleanly: HDT at 0.45 MPa, XY and Z, notched Charpy, middle half, "a gap, not a zero".
   - Makes me stop: Confirmed only / Include uncertain, "Let estimates rule out materials", reported only,
     INDETERMINATE against UNKNOWN, "Published" as a drying verdict, "Type on Bambu's H2C list", "nothing: sort by
     column", "its Limitations say why".
5. **The drawer and the material pages read as one tool: not yet.** Both carry the same mark, the same "Products" and
   "Overview", and the label "Back to your results" changes correctly when you arrive from the drawer. The page,
   though, looks like a different publication: serif display type, six figure cards with strips against a 10-row list,
   an "On the H2C" table against badge cards. It also gives other numbers for the nozzle, bed, chamber, drying and
   price (finding 7), and it drops the reader's pass/fail result.

## Findings, ranked by what they cost the reader

1. **The drawer contradicts itself on printability.** Drawer · words/frame · 1280 light ·
   `shots/base/drawer-peek-overview-01.png`, `shots/base/drawer-peek-overview-02.png`,
   `shots/base/drawer-pla-overview-cold-02.png`.
   - **What is wrong.** On PEEK's Overview, the requirement rows say **FAIL Bed ≤ 120 °C, "Requires up to 180 °C"** and
     **INDETERMINATE Chamber ≤ 65 °C, "Recommends up to 140 °C"**. A few lines further down the same tab:
     - **✓ Within Bed 110–250 °C, "Needs up to 120 °C"**;
     - **✓ Within Chamber 70–230 °C, "No heated chamber needed"**.

     A green "Within" next to a 70–230 °C chamber chip, against a 65 °C chamber, reads as a bug. On PLA, the nozzle
     chip says "up to 260 °C", the line under it says "Needs up to 210 °C", the Bambu guide says "190 - 230 °C" and
     the page says "195–230 °C". An engineer stops trusting all four.
   - **Fix.**
     - Give one window per limit: the range across products and a count against the H2C limit ("Bed: 4 of 7 products
       above 120 °C"), worded the same as the requirement rows.
     - Drop the per-card verdict that is computed differently.
     - Merge the bullet counts and the cards into one block.
2. **The "best match" is a product with no price.** Drawer · words · 1280 light ·
   `shots/base/drawer-pla-overview-01.png`, `shots/base/drawer-pctggf-overview-01.png`,
   `shots/base/drawer-pla-grades-02.png`.
   - **What is wrong.** "Shown for its best match, 3DXTECH ECOMAX PLA" is followed by "? UNKNOWN Price at most
     45 CAD/kg: no price observation". Meanwhile Bambu Lab PLA Basic passes everything at 28 CAD/kg. PCTG-GF shows the
     same pattern (Spectrum PCTG GF10). The first product I am shown is the one I could not buy on my own terms.
   - **Fix.** Rank the best match by the number of requirements it resolves, reported ones included, then by how much
     it publishes. Otherwise call it "first passing product", not "best match".
3. **A policy switch is the loudest thing on the cold page.** Main · frame · 1280 light and dark, 390 phone ·
   `shots/base/main-cold-01.png`, `shots/base/main-cold-dark-01.png`, `shots/base/main-cold-phone-01.png`.
   - **What is wrong.** The top bar holds a boxed control group: "Materials with missing data: Confirmed only / Include
     uncertain", a toggle that looks on but is greyed out ("Let estimates rule out materials — Only under Include
     uncertain"), and a "?". It decides nothing until a requirement is set, yet it takes the prime spot. On a phone it
     takes about 140 px.
   - **Fix.** Move it into the results header, as a plain choice beside "39 more could not be checked" (for example
     "Show the 39 that could not be checked"). Show the estimates toggle only once that choice is on.
4. **The drawer's Overview is long, and its tabs are bookkeeping.** Drawer · frame · 1280 light ·
   `shots/base/drawer-pla-overview-01.png` to `-03.png`, `shots/base/drawer-abscf-overview-01.png`.
   - **What is wrong.**
     - Overview runs about three screens, in this order: answer, requirements, printability as a bullet list, the same
       printability again as cards, hardened nozzle, drying, AMS, then key properties, applications and the verify
       note.
     - The tab bar wraps to two rows and every tab carries a record count (Mechanical 1513, Thermal 522, Environment
       94, Price 0).
     - A sentence under the tabs restates what the tab is.
   - **Fix.**
     - Put the tabs on one row, with no counts except Products and Sources.
     - Drop the tab sentence.
     - Order Overview as: answer, your requirements, key properties (compact), printing on the H2C (one block),
       what to verify.
5. **There are too many verdict words.** Drawer and main · words · 1280 light · `shots/base/drawer-peek-overview-01.png`,
   `shots/base/drawer-peek-overview-02.png`, `shots/base/drawer-pla-overview-02.png`,
   `shots/base/drawer-pla-overview-cold-01.png`.
   - **What is wrong.** The badges are PASS, FAIL, UNKNOWN, INDETERMINATE, Within, Partly within, Exceeds, Some
     products, Any nozzle, Published, not tested and reported only. Nothing on screen says how UNKNOWN differs from
     INDETERMINATE. "Published" as the drying badge tells me nothing; the page states the actual schedule ("40–65 °C,
     3–12 h").
   - **Fix.**
     - Three requirement verdicts: pass, fail, cannot tell.
     - Three printing marks: within, partly, beyond.
     - For drying and nozzle type, print the value itself in place of a badge.
6. **Bookkeeping fills the drawer's inner tabs.** Drawer · words · 1280 light · `shots/base/drawer-pla-grades-02.png`,
   `shots/base/drawer-pla-printing-01.png`, `shots/base/drawer-pla-printing-02.png`,
   `shots/base/drawer-pla-environment-01.png`, `shots/base/drawer-pla-evidence-01.png`,
   `shots/base/drawer-pla-mechanical-01.png`.
   - **What is wrong.**
     - "ID", "where" and "review note" chips sit on almost every row.
     - "Not stated by the maker: applications, benefits, pitfalls, warping, …".
     - "Named on a data sheet without a value: flexural modulus (Polymaker PolySonic PLA) …".
     - A raw locator: "p. 1, the column headed PLA: Nozzle Temperature; Build Plate & Bed Temperature; …".
     - A raw drying string from the guide.
     - "AMS and H2C nozzle routing: shown on the 1 profile that says more than 'verify the exact grade'".
     - The same 3DXTECH source listed three times under one product.
     - eSUN profiles show eight rows of "Not published".
   - **Fix.**
     - Fold IDs and locators into the source link's detail.
     - Drop the "not stated by the maker" and "named without a value" lists, or put them behind one "gaps" line.
     - De-duplicate the sources.
     - Hide "Not published" rows in a profile; give one count line ("6 settings not published").
7. **The drawer and the page disagree for the same material.** Drawer and page · frame/words · 1280 light ·
   `shots/base/drawer-pla-overview-cold-01.png`, `shots/base/drawer-pla-overview-02.png`,
   `review/shots-0/fullpage-from-drawer-01.png`, `review/shots-0/page-pla-01.png`.

   | PLA | Drawer | Page |
   |---|---|---|
   | Nozzle | "up to 260 °C" chip, "Needs up to 210 °C" | "195–230 °C" |
   | Bed | "up to 90 °C" chip, "Needs up to 60 °C" | "50–60 °C" |
   | Chamber | "183 within, 12 not published" | "none needed, 160 of 195 products" |
   | Drying | "Published" | "40–65 °C, 3–12 h" |
   | Price | 33.7 CAD/kg | 34 CAD/kg |
   | Key figures | a 10-row list | 6 cards with strips |

   - **What else is wrong.** The type differs (serif display on the page, sans in the drawer), and the page does not
     show the "PASS, 183 of 195" result I just read in the drawer.
   - **Fix.**
     - Give one "key figures" block and one "On the H2C" block to both surfaces, using the page's versions, which read
       better, with the same rounding.
     - When the page is reached from the drawer, carry over one line with the reader's verdict.
8. **"annealed median" contradicts the table's own header.** Main · words · 1280 light ·
   `shots/base/main-indoor-table-01.png`, `shots/base/main-indoor-table-02.png`, `shots/base/main-indoor-table-03.png`.
   - **What is wrong.** ABS density and modulus, ABS-GF modulus and PA12-CF modulus and elongation carry the caption
     "annealed median". The header states "Values judged: as printed, dry", and the legend has no entry for the
     caption. An annealed density is also odd on its face.
   - **Fix.** Say what it means in the legend's own mark system, or reword it ("median includes annealed bars"). If
     annealed values decide a cell under an as-printed requirement, say why.
9. **The lens graphs mislead or clip.** Main · graphs · 1280 light · `shots/base/lens-ashby-01.png`,
   `shots/base/lens-parallel-01.png`, `review/shots-0/lens-compare-3-01.png`, `review/shots-0/lens-compare-3-02.png`.
   - **What is wrong.**
     - **Ashby.** The y-axis title is clipped ("nsile modulus (XY) (GPa)"), and the plot starts about 440 px down,
       under four rows of controls.
     - **Compare.** It draws bars from the left end on a log scale (0.0053–10.1 GPa), so bar length means nothing and
       PLA and PLA Silk look alike. It also says "all 152 candidate materials" while 87 are candidates.
     - **Parallel lines.** The elongation axis runs to 400 %, which presses every other line onto the floor.
   - **Fix.**
     - Ashby: collapse its controls to one line and pad the axis title.
     - Compare: draw a dot with its range on the track, not a bar from zero, and say "all 152 materials".
     - Parallel lines: give the axes a log option, or clip them at a percentile and mark the outliers.
10. **The results header is heavy and the rows are tall.** Main · frame · 1280 light · `shots/base/main-indoor-01.png`,
    `review/shots-0/rail-scrolled-01.png`.
    - **What is wrong.**
      - About 380 px separates "87 shown PASS" from the first row. In between: "87 of the 152 materials meet these
        requirements", the provenance line, the pills, Reported not required, Values judged, Not checked by this
        template, the view toggle, Rank by, Compare against, and a seven-mark legend that wraps.
      - Rows hold about eight materials per screen, and the table runs past the right edge (the HDT column is cut).
      - The "converted" mark is a glyph I could not read at this size.
    - **Fix.**
      - Make the header one line: "87 of 152 pass · 39 cannot be checked · 26 fail".
      - Put Rank by and Compare against on one row, and make the legend a single line or a popover.
      - Tighten the row height and fit the default column set to 1280.
11. **The same requirement has different names.** Main and drawer · words · 1280 light · `shots/base/main-indoor-01.png`,
    `shots/base/lens-explain-01.png`, `shots/base/drawer-pla-overview-01.png`.
    - **What is wrong.** The pill "Within H2C temperature limits" becomes three rows in Why excluded (Chamber ≤ 65 °C,
      Bed ≤ 120 °C, Nozzle ≤ 350 °C) and three items in the drawer's "Also met". Why excluded also lists "Price …
      reported only", with failed bars, although price removes nothing.
    - **Fix.** Use one name everywhere: either the pill expands to its three limits, or all three surfaces group them
      under it. List the reported-only rows apart, under a rule.
12. **The product counts disagree.** Main and drawer · words · 1280 light · `shots/base/drawer-pla-overview-01.png`,
    `shots/base/main-indoor-table-01.png`.
    - **What is wrong.** The table says PLA "PASS 183 of 183 products", but ABS "46 of 48". The drawer says "Of its 195
      products, 183 meet … 12 publish too little to judge".
    - **Fix.** Always count against all of the material's products: "183 of 195".
13. **On a phone, the drawer's Full page button is blank.** Drawer · frame · 390 phone light ·
    `shots/base/drawer-pla-overview-phone-01.png`.
    - **What is wrong.** At the drawer's top left there is an empty pill where "Full page" should be. The tabs scroll
      off to the right with no cue.
    - **Fix.** Give the button a label or icon at phone width, and fade the tab strip's edge.
14. **The rail opens on families, not on requirements, and the table opens on noise.** Main · frame · 1280 light ·
    `shots/base/main-cold-01.png`, `review/shots-0/rail-scrolled-01.png`, `shots/base/drawer-pla-overview-cold-01.png`.
    - **What is wrong.**
      - The first screen of the rail is a 25-row family checklist. Density, modulus and HDT start about 850 px down.
      - "1 set" on Material family comes from "Build materials only", which sits inside that group.
      - Cold, every row of the table carries a grey "not tested" pill.
    - **Fix.**
      - Open the rail on Mechanical and Thermal, and fold the families.
      - Move "Build materials only" out of the family group.
      - Leave the result cell empty until a requirement is set.
15. **PEEK says "beyond capability" four times and points to a section that is not there.** Drawer · words · 1280 light
    · `shots/base/drawer-peek-overview-01.png`.
    - **What is wrong.** The red banner, the chip, a sentence and the FAIL box all say it is beyond capability. The
      requirement row says "Beyond H2C capability; its Limitations say why", and no Limitations tab or heading is
      visible.
    - **Fix.** Say it once, naming the limit it breaks ("nozzle 360–480 °C; the H2C reaches 350 °C"). Remove the
      pointer, or name the real place.

Smaller: "14822 measurements" has no thousands separator, while the table writes "1,050". "Rank by: nothing: sort by
column" reads oddly. The family subtitle under a material name appears on some rows (CoPE, CPE) and not on others (ABS,
ASA).

## What is genuinely good and must be kept

1. **The template cards** (main, cold page, `shots/base/main-cold-01.png`). Each names a real part ("a jig or a fixture")
   and then the exact thresholds it sets (HDT at 0.45 MPa at least 90 °C, tensile modulus at least 5 GPa). It also
   says what is reported and not required, and that "nothing is decided for you". This is the right front door for
   an engineer.
2. **The rail's requirement controls** (main, rail, `review/shots-0/rail-scrolled-01.png`).
   - at least or at most, a unit, and the test direction stated ("Bars printed in the XY plane");
   - coverage stated ("101 of 152 have data");
   - an anchor example ("e.g. 3; unfilled PLA is about 2.5").

   This is how a data-literate engineer wants to type a limit.
3. **Honest cells** (main, table, `shots/base/main-indoor-table-01.png`): a median with its range and count, "—" for not
   published, "•" for a single measurement, "*" for published but not comparable, "n/a" for not applicable. A number
   nobody measured is never ranked. This is the tool's integrity; keep the system, even if the legend is tightened.
4. **PASS, UNKNOWN and FAIL kept apart, with counts** (main, footer and header, `shots/base/main-indoor-01.png`).
   "39 more could not be checked, left out under Confirmed only", with the footer chips PASS 87 · UNKNOWN 39 · FAIL 26.
   Missing data is never folded into fail.
5. **The "Reported, not required" distinction** (main, the dashed pill, `shots/base/main-indoor-01.png`). Price shown
   but not filtering is exactly the right handling of a soft criterion.
6. **The Why excluded lens** (main, `shots/base/lens-explain-01.png`). For each requirement: failed, could not check,
   "removing it would bring back N candidates", and a Remove button. This is a sensitivity analysis in one glance, and
   rare in any selector.
7. **The drawer's answer box** (drawer Overview, `shots/base/drawer-pla-overview-01.png`). "Of its 195 products, 183 meet
   all your requirements and 12 publish too little to judge", with "Show the products". The answer comes first, at
   the right grain: the product, not the family.
8. **The comparison dot graphs in Mechanical** (drawer, `shots/base/drawer-pla-mechanical-dark-01.png`,
   `shots/base/drawer-pla-mechanical-dark-02.png`).
   - one dot per product, XY and Z drawn together;
   - filled for a stated orientation, hollow for none, a square for annealed, a diamond for a special formulation;
   - the median and middle half shaded;
   - below it, a table of n, median, middle half and range, with "Also drawn, not in the median: 39 with no stated
     orientation".

   This is how scatter between products should be shown.
9. **The print-temperature graph** (drawer Printing, `review/shots-0/drawer-pla-printtemps-01.png`). The lowest and
   highest setting of each product as dots, with "H2C limit 350 °C, above the scale" said outright. It shows the
   spread of makers' recipes honestly.
10. **"Not published for this material … A gap, not a zero or a low value"** (drawer Mechanical and Thermal,
    `shots/base/drawer-pla-mechanical-01.png`). It states plainly what is missing.
11. **The products list, with "Choose this product"** (drawer Products, `shots/base/drawer-pla-grades-01.png`). Print
    settings are set against the H2C limits with "within" marks, followed by the product's own values. This is the
    hand-off point to buying and printing.
12. **The price tab's listing table** (drawer Price, `shots/base/drawer-pla-price-01.png`). Retailer, listing, kg, CAD/kg,
    stock and "used", with the method in one paragraph: sampled, not live, Canadian first, the date range. Auditable.
13. **The material page's key figures and prose** (page, `review/shots-0/page-pla-01.png`,
    `review/shots-0/page-pla-02.png`, `review/shots-0/page-pctggf-01.png`).
    - Six figures, each with a strip against all materials and its middle half.
    - Prose that reasons like an engineer: "amorphous as printed, so it softens at its glass transition: its HDT at
      0.45 MPa is 55 °C".
    - "Against PLA-CF, PLA is 21 % stronger across the layers".
    - "Not published: strength across the layers, notched impact" on PCTG-GF.

    The drawer should borrow these blocks, not the other way round.
14. **The page's "Back to your results"** (page, `review/shots-0/fullpage-from-drawer-01.png`). The label changes from
    "Open in the selector" when the page is reached from the drawer, which tells the reader the round trip is safe.
15. **The release and data date in the footer and in the Compare summary** (main, `review/shots-0/lens-compare-3-01.png`).
    "Release 7f3f14384dab, data of 2026-09-21", with the requirements written out above the comparison, and "Print
    summary". A handed-off comparison can be reproduced.
16. **Mechanical-property naming** throughout: "HDT at 0.45 MPa", "Tensile strength (Z)", "Notched Charpy impact",
    "middle half". An engineer reads these without stopping.

## What I could not test

- **The full round trip back from the page.** "Back to your results" restoring the drawer and the requirements: the
  screenshot tool starts a fresh browser for each shot. I saw the label change, not the restored state.
- **Some states and inputs.** The material pages in dark mode, keyboard-only navigation, hover tooltips (Ashby points,
  the table's underlined values) and the "Select a value to see where it comes from" pop-ups.
- **Parts of the drawer.** The ABS-CF and PEEK drawers beyond Overview and Products, as the base screenshots show them.
- **A legend I could not see.** The chamber row of the print-temperature graph: a red dashed line sits at about 82 on
  what looks like the bed's 0–100 °C axis. I could not confirm whether it is the 65 °C chamber limit on its own scale.
