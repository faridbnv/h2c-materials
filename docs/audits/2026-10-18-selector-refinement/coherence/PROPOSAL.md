# First impression and coherence: proposal (Part B)

> Working record, 2026-10-18, selector-refinement round. Answers REVIEW-0 findings 1, 2, 3, 4, 7 and 15 first. I read
> the code but changed none of it. The mocks are DOM rewrites (`--eval`) or CSS (`--css`) over the built file:
> `coherence/mocks/`, shots in `coherence/shots/`. Inventory: [INVENTORY.md](INVENTORY.md).

## Vision

**One tool, two depths.** The drawer is a material page's first screen with the reader's answer on top. The page is
the drawer read at length. A reader who goes from one to the other should meet the same names, the same numbers in the
same form, and the same marks. Two blocks carry most of this, and both come from the functions the pages already use:

- **Key properties.** The page's six, in its order, each as median, middle half and products.
- **On the H2C.** The page's five rows, plus each product's count against the H2C limit.

The drawer moves toward the page. The page is the reviewer's reference (K45), and the pages do not change this round.

**Each fact once, in one form.** Today the drawer's Overview states printability twice, from two different
computations, and the two disagree:

- a bullet list counts every product against each limit;
- cards show the material's recorded window (`m.print.nozzleC`) beside the gate reason of its best product.

So PEEK's card shows a green *Within* bed of 110–250 °C three rows below *FAIL Bed ≤ 120 °C, requires 180 °C*. PLA's
nozzle appears as 260, 210, 195 and 230 across the drawer, and as 195–230 °C on the page. The fix is not new wording. It
is one block computed one way, which is also the page's way.

**The first five seconds.**

- **Main page.** The eye should meet the name, the six templates (the front door, K23) and the top of the results. The
  frame should not compete:
  - the data panel loses its box (K01 is kept: neutral, grouped);
  - the step line goes, because the heading already says where to start and the status bar says it again;
  - the cards and the table bar tighten.
- **Drawer.**
  - Who it is: name, identity, the H2C standing once.
  - The answer: the verdict box, then the requirement decided on a product you could actually buy.
  - What it is like: six numbers, as on the page.
  - Whether it prints: one block.
  - Then uses, the record count and the allowables line.

**What to cut or quiet, as plainly as what to add:**

- **Cut:**
  - the lede that repeats the H2C chip;
  - PEEK's red callout;
  - the record counts on six of the eight tabs;
  - Overview's tab caption;
  - the printability bullet list;
  - the window chips from `m.print.*C`;
  - the gate reasons in the printability cards;
  - the badges "Published", "Some products" and "Any nozzle";
  - the AMS line on Overview (it moves to Printing);
  - the drawer's starred stand-in values where a page says *as published* or *not published*;
  - "special formulation";
  - the cold page's step line.
- **Quiet:**
  - the data panel's box;
  - the drawer's uppercase section labels, which become sentence case;
  - the table bar, onto one row.

## Changes, ranked

Each change gives:

- **P**: its priority;
- **F**: the REVIEW-0 findings it answers;
- **K**: the keep items it touches (kept unless marked otherwise);
- **Feeds**: the field or function it runs on;
- **Size** (S, M or L);
- **Risk**: guardrails 6 and 7, plus the tests and views that move;
- **Evidence**: the before and after shots.

### 1. One "On the H2C" block, computed as the page computes it

- **P1 · F1, F7, F5 (in part).**
- **What changes.** The drawer's printability bullets and its gate cards become one block, named as on the page:
  *On the H2C*, with *Printing in full* opening the Printing tab. It has five rows:
  - **Nozzle, Bed and Heated chamber.** Each row has:
    - the page's window, from `typicalWindow(printWindows(…))`, with its note ("most products that give one");
    - the count against the limit from `printCounts`: "all 195 within the H2C's 350 °C", or "3 within 120 °C, 4 above
      or only partly within";
    - a chip worked out from that count: *Within* when all are within, *Beyond* when none is, *Partly* otherwise.
  - **Drying and Nozzle type.** Each prints its value ("40–65 °C, 3–12 h", "standard for most"), not a badge.
- **What stays.** The origin line (Bambu Lab Filament Guide or shared sheet) stays, once. The chamber estimate card
  stays, under Include uncertain only (K16).
- **What goes.**
  - from `gateLine` (detail.js ~967–1046): the `m.print.*C` windows and the `m.gates.*.reason` text;
  - `productPrintCounts` (~705), whose content is merged in.
- **What it no longer contradicts.** The requirement rows keep the engine's per-product reasons. They speak for the named
  product, the block for every product.
- **K.** K19 (the chip column, reused), K10 and K33 (the Printing tab is untouched), K11 (every setting stays one press
  from its profile and source), K16.
- **Feeds.** `onTheH2cRows` and its helpers (`windowRow`, `chamberRow`, `dryingRow`, `nozzleTypeRow`) move from
  `app/pages/findings.js` into a shared module under `app/js/ui/`; the page imports them from there, unchanged. Also
  `printCounts` and `printWindows`/`typicalWindow` (already shared).
- **Size.** M.
- **Risk.**
  - Guardrail 6: the move must leave the pages' digest unchanged (`pages:check` 16/16).
  - Guardrail 7: none.
  - What moves: the probe view `15-drawer-first-ranked-maker-says` (it reads `.print-counts`) and the `13-*`/`14-*` text
    views.
- **Evidence.**
  - `shots/base/drawer-peek-overview-02.png` → `coherence/shots/mock-drawer-peek-02.png`
  - `shots/base/drawer-pla-overview-02.png` → `coherence/shots/mock-drawer-pla-02.png`

### 2. Key properties in the page's form, with the page's record where no median exists

- **P1 · F7, F4 · M5a, M5b.**
- **The six.** The first six rows are the page's `KEY_FIGURES` (from `material-highlights.js`), in its order. Each
  prints:
  - the median, at the page's display precision (`fmtDisplay`: whole °C, whole CAD/kg and % from 10, otherwise three
    significant figures, thousands grouped);
  - "middle half a–b · N products". With 2–3 products it is lowest–highest; with one, "one product".
- **The other four.** Density, elongation at break (XY), notched Izod and Tg follow on one *Also* line in the same form.
  No headline is lost, and each name keeps its definition popover (K37).
- **Truth fix (P1).** Where a material has no comparable median, the drawer prints the page's `summary[key].asPublished`
  ("6 kJ/m², as published · no stated orientation"), not `headline.related.best` with an asterisk.
  - **Different record.** In 11 key-property cells of materials with a page, the asterisked value is a different record
    from the page's as-published value. Examples:
    - PA6 tensile strength (XY): drawer 27 \* (endpoint unspecified), page 50–80;
    - PEEK notched Charpy: drawer 7 \* (a moulded "Charpy strength"), page 6;
    - TPU-CF elongation: drawer 380 \*, page 15.
  - **No page value.** In 25 more cells the drawer prints an asterisked number where the page prints none; 9 of these
    are among the page's six.
  - The related record stays one press away, in the value's popover and in Mechanical.
- **K.** K34 (the two-tier number), K37, K16 (`estimateGroup` is unchanged), K45, K39.
- **Feeds.**
  - `KEY_FIGURES` and `summary[key]` (q1, q3, n, asPublished).
  - `fmtDisplay` and `spanDisplay` move from `app/pages/numbers.js` to `format.js`, and the page imports them from there.
  - A drawer-only renderer. **`renderValue` is not touched**: the table and Compare share it, and the fuzz rounds through
    `fmtNumber`.
- **Size.** M.
- **Risk.**
  - Guardrail 6: the page's output must be unchanged.
  - The main table's asterisked cells will still show `related.best`. Moving them too is a P5 call with fuzz risk;
    otherwise it goes on OPEN-PROBLEMS.
  - **Numbers on the first screen.** I counted the numbers rendered in the drawer's top 800 px, with changes 1–5
    applied, using my own count rather than `measure.mjs`. Under Indoor, PLA falls from 38 to 35 and PEEK from 31 to
    28. Cold PLA is not mocked; my estimate is that it falls from 56 to about 32. Changes 1–5 do not reach M3's ≤ 20.
    If that target binds, the fallback is "2.53 GPa · 55 products", with the middle half in the popover. Every printed
    number would still agree with the page.
- **Evidence.** `shots/base/drawer-pla-overview-cold-01.png` → `coherence/shots/mock-drawer-pla-01.png`; the PEEK rows
  in `mock-drawer-peek-02.png`.

### 3. "Shown for" a product the reader can act on

- **P2 · F2.**
- **The rule (display only).** The engine's pick stays as it is (`evaluateProducts` → `gradeId`, constraints.js ~689).
  The drawer, when the material passes, shows instead:
  - the first passing product, in engine order, whose report-only lines are all resolved (PASS or FAIL, not UNKNOWN);
  - else the engine's product.
- **Where it runs.** `renderWhy` is given that product's `products[i].results`, which carry the same fields (status,
  reason, constraint, measurementId, priceIds).
- **Wording.** "Shown for *Bambu Lab PLA Basic*, one of the 183 that pass", not "its best match". "Its closest product"
  stays for UNKNOWN and FAIL.
- **What it moves (Indoor).** 87 materials pass. On 72 of them, the product shown leaves the price unknown. On 49 of
  those 72, a passing product has a known price: PLA's shows "PASS · Published 27.99 CAD/kg", not "UNKNOWN".
- **The other 23.** No passing product has a price, and the line should say so once.
- **K.** K36 (reproduced, with a better product), K07, K08 (`describeConstraint` and the source button are unchanged).
- **Feeds.** `evaluation.products[].results`, `constraint.mandatory === false`.
- **Size.** S.
- **Risk.** No answer moves. The decision brief and the exports keep `gradeId`, so the executor decides whether the
  brief follows. The `14-drawer-*` views move.
- **Evidence.** `shots/base/drawer-pla-overview-01.png` → `coherence/shots/mock-drawer-pla-01.png`.

### 4. The H2C standing said once, and only the page's tab counts

- **P2 · F15, F4.**
- **The header.**
  - The chip says it ("On Bambu Lab's H2C list"; the page's sentence goes into the chip's popover).
  - The lede goes when it only repeats the chip.
  - The red *Beyond H2C capability* callout goes; the header's chip keeps it.
- **PEEK's capability row.** Its reason names the limit from block 1 ("Every product asks for a hotter nozzle than the
  H2C's 350 °C"), not "its Limitations say why".
- **Tabs.** Counts only on *Products* and *Sources*, as on the page's own "Products 195". A tab with nothing stays grey
  (K38). Overview's caption goes, because the answer box is the first line. The other tabs keep their sentence (K29).
- **K.** K29 (kept on 7 of 8 tabs; reproduced on Overview by its section heads), K38, K13.
- **Feeds.** `ledeWords`, `H2C_STATUS` (labels.js, shared: the page's identity sentence comes from findings.js, so check
  `pages:check`), and the tab template.
- **Size.** S.
- **Risk.** INTERFACE's Words table changes one row: "Type on Bambu's H2C list" becomes "On Bambu Lab's H2C list".
- **Evidence.** The headers in `mock-drawer-pla-01.png` and `mock-drawer-peek-01.png`.

### 5. Overview in the page's order

- **P3 · F4.**
- **The order.** With requirements set: answer → your requirements → key properties → On the H2C → uses and
  limitations → on file and the allowables line. Cold, the same order without the first two.
- **Feeds.** Only the order of the return in `tabBody('Overview')` changes (`print` and `numbers` swap).
- **What leaves.** The AMS line goes to Printing.
- **K.** K07, K27.
- **Size.** S.
- **Risk.** None.
- **Evidence.** `mock-drawer-pla-01.png` and `mock-drawer-pla-02.png`.

### 6. The pages' names and marks in the drawer

- **P4 · F7 · M5c items 1, 6, 7, 11, 13, 19.**
- **Words.**
  - "special formulation(s)" becomes "added filler or additive". It sits in the keys, the "Also drawn" lines and the
    tally: `material-words.js` `outOfMedianWords` and `apartWords`, `format.js:413`, and the keys at `detail.js` 803 and
    912. `pages.check.js` already bans the old phrase on the pages.
  - The hollow mark reads "as published · no stated orientation (or load)".
  - "281 sources" becomes "281 documents" in the on-file line; the *Sources* tab keeps its name, the page's section name.
  - "Typical applications" takes the page's attribution: what makers sell it for. This is the words expert's string.
- **Mark.** The drawer's hollow dot is a grey ring, as on the page; today it is an accent ring. The graphs expert owns
  this.
- **K.** K39, K18, K35 (the orange is already shared).
- **Size.** S.
- **Risk.** Guardrail 6: `material-words.js` feeds the pages' cards through `pageWords`, so confirm with `pages:check`.
  What moves: `test/print-spread.test.js:368` and `drawer-comparisons.test.js` read "special formulation"; the tally
  line (guardrail 7).
- **Evidence.** The checklist below (M5c).

### 7. One rule for numbers, said once

- **P4 · F7, Smaller · M5b, M5c items 4 and 14.**
- **The rule (the page's own).** The Overviews (drawer and page) print to a reader's precision. Every place that lists
  records or ranks (the table, a comparison's table, a product card) prints three significant figures, and a value's
  popover gives the exact figure. After change 2, M5b's 22 cells agree.
- **Thousands grouped in counts.** "14822 measurements" on the cold page, and "1513 values" and "2430 measurements" in
  the drawer, each get a grouping separator. This uses a count formatter at those call sites, **not** `fmtNumber` (the
  fuzz rounds through it).
- **K.** K34.
- **Size.** S.
- **Risk.** `01-default.txt` moves.

### 8. Section labels in sentence case

- **P4 · F9 · M5c item 16.**
- **What changes.** The drawer's `h3.sec` drops its uppercase tracking ("KEY PROPERTIES" becomes "Key properties").
  This follows INTERFACE "The frame" (sentence case) and the page's headings. The main page's "REPORTED, NOT REQUIRED"
  label follows. Weight and size come from the UX expert.
- **K.** K01.
- **Size.** S (CSS).
- **Risk.** None to checks.

### 9. The cold page's first five seconds (polish only)

- **P2 · F3, F14 · M2a, M2d.**
- **What changes.**
  - The data-settings panel loses its box and fill. "Only under Include uncertain" moves into the switch's ? popover;
    the switch stays visible.
  - The step line goes.
  - The heading and the cards tighten. "within H2C temperature limits" is said once, in the heading; that string is the
    words expert's.
  - The table bar fits one row: the column-set caption is visually hidden but kept for screen readers.
- **Measured on the mock.** The table bar rises from 761 px to 633 px, and the header row is at 703 px. Rows still need
  the UX expert's denser rows and the graphs expert's one-line legend to reach ≥ 3.
- **Not mocked.** An empty result cell while no requirement is set (F14). Guardrail 7: the fuzz reads "not tested".
- **K.** K01, K03, K23, K25 (the promise stays, on one line), K04.
- **Size.** S (CSS and one string).
- **Risk.** `01-default.txt` moves.
- **Evidence.** `shots/base/main-cold-01.png` → `coherence/shots/mock-main-cold-01.png`.

## M5c: the drawer against the pages, final (21 items)

Rows are numbered as in INVENTORY.md; item 21 is new.

**15 move, 6 stay with a reason. Target: 0 left open.**

| # | Item | Which side moves | By |
|---|---|---|---|
| 1 | "special formulation" vs "added filler or additive" | drawer | 6 |
| 2 | full range vs middle half beside the median | drawer Overview. The comparison tables keep both (K31), and the table cell keeps its "median and range", as its legend says | 2 |
| 3 | "· 55" vs "55 products" | drawer | 2 |
| 4 | 33.7 vs 34 (precision) | drawer Overview; the stated rule covers the rest | 2, 7 |
| 5 | 10 key rows vs 6 key figures, order | drawer: six first, four on the *Also* line | 2 |
| 6 | as-published wording (5 phrasings, 3 glyphs) | drawer, to "as published · no stated orientation". **Stays with a reason:** the table's "\* published, not comparable" (K28) | 2, 6 |
| 7 | hollow mark accent vs grey | drawer | 6 (graphs) |
| 8 | data colour, dot size, median mark | **Stays with a reason:** `tokens.css` stays unchanged (M6); the 9 px dot is a press target in HTML marks | — |
| 9 | Bambu standing: three wordings | drawer: the chip once, the page's sentence in its popover | 4 |
| 10 | print windows 260 / 210 / 195–230 | drawer | 1 |
| 11 | "H2C printability", "Chamber", badges vs "On the H2C", "Heated chamber", values | drawer | 1 |
| 12 | tab names vs section names | **Stays with a reason:** the tabs index records and the sections read them; *Printing in full* is shared | 1 |
| 13 | "sources" vs "documents" | drawer (the on-file line) | 6 |
| 14 | thousands grouping | drawer and cold page | 7 |
| 15 | identity line with family and filler | **Stays with a reason:** in a list, the family and filler place it | — |
| 16 | uppercase labels vs sentence case | drawer | 8 |
| 17 | Inter vs Newsreader for the name | **Stays with a reason:** the selector is the workbench, and serif is the page's reading voice (INTERFACE, "Type and colour") | — |
| 18 | short names in the table ("Modulus XY") | **Stays with a reason:** the column width; the long name is in the header's popover | — |
| 19 | "Typical applications" without attribution | drawer | 6 (words) |
| 20 | ¤ on a converted price | **Stays with a reason:** the drawer's mark is one press from the rate; the page says it in prose | — |
| 21 | **asterisked value from another record vs the page's as published** (11 cells differ; 25 more where the page prints none) | drawer (**P1**) | 2 |

**Found while reading, not this round's to fix:** the decision brief keeps the engine's product (change 3), and the
page loses the reader's verdict on arrival (F7: the pages do not change this round). Both are for OPEN-PROBLEMS.
