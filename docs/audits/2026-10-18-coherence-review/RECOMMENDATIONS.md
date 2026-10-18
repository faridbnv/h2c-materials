# Coherence review: recommendations for the owner

> **Historical record** (2026-10-18): the product manager's combination of this round's five reviews, for the owner
> ([brief](BRIEF.md)). Review only: nothing in the code or the data was changed. The reviews, named below by one word:
> **Frame** ([ui-frame](ui-frame/REVIEW.md)), **Flow** ([ux-flow](ux-flow/REVIEW.md)), **Drawer–page**
> ([drawer-page](drawer-page/REVIEW.md)), **Graphs** ([dataviz](dataviz/REVIEW.md)) and **Words**
> ([words](words/REVIEW.md)). Their own numbers are kept ("Frame R1", "Flow 3").

**How to use this page.** Every change has an ID (C01 to C54), in the order it should be built. Every judgement, the
reviewers' and mine, has an ID (V01 to V36). Answer by ID ("agree V04, V09; disagree V07; build C01 to C22"). The IDs
are fixed: a later addition takes the next free number, and nothing is renumbered.

**Recommendation words.** *Do*: build it in this round. *Later*: worth doing, lower value. *Owner's call*: it touches a
decision you made or a matter of taste; my lean is given. *Don't*: rejected, with the reason (in the V list).

**Effort.** S is under an hour, M a few hours. The 40 *do* changes come to about four working days; none moves a
screening answer. If you want one day only: C01, C04, C08, C14, C20, C21, C22, C25, C32, C33 (about eight hours; each
depends only on another in that set).

## 1. Answers to your questions

**The material page's footer.** Keep it a footer and make it a band (V04, change C31). Today it does not read as the end
of the page: it sits on the same grey as the content behind one hairline, so its first sentence reads as the last
paragraph of Sources. Its fine print gives the documents-read span twice (and Sources a third time, in another date
form), the three page kinds end three different ways, and on a phone its return button shows the short label. Of
Frame's three options, I pick B, as Frame does: a full-width white band, the same three ways out on every page kind
(*All materials* added), the summary's authorship in one sentence (Words), *Print this page* beside *Copy the citation*
(Flow), and one closing line across the width with the mark and the provenance in the selector's own words (C03). Not
the citation plate (V05). The look is your call: mock-ups in `ui-frame/shots/footer-B-band-signoff.png`, `-dark` and
`-phone`.

**The drawer against the page.** More coherence is worth it for facts and words, not for form (V01). The drawer is an
instrument for a quick check and the page a document to read; most differences in form are right (V22 to V30). The help
is modest per item, but each sits at the moment a reader opens *Full page* and compares (V02). The rule I applied
everywhere: one computation per fact, shared by both surfaces, and one word per thing (V03). The drawer should borrow
the page's evidence word (C20), its verdict per chemical exposure (C22), its words (C04 to C07), its order of products
(C35) and its typesetting of the name (C29). The page should borrow the drawer's labels for missing key properties
(C19), "key properties" itself (C09) and "the H2C reaches N °C" (C04). Both must print a bound with its sign (C14) and
agree on drying, gaps and precision (C15, C17, C21).

**Shared elements done two ways.** Theme control: align the pages to the selector's, and stop the selector's white
flash in dark mode (V06; C23 to C25). Logo: the same drawing already; keep it on a selector phone (V08, C28); keep its
link as you set it in D145 (V07, owner's call). Dates: one form a person reads, "13 Sep 2026", ISO only where a machine
reads (V09, C02). Provenance: one string on both surfaces, dropping "data 2026-09-21", which reads as a data date
older than the documents (V10, C03). Typeface: one sans (Inter) in both, after the frame changes and on your word
(V11, C50); the serif stays on the pages (V12). Leave the two bars, the two tab styles and the breadcrumbs as they are
(V28).

**The Parallel lines view.** Keep it and tune it (V13). It is the right form for 30 to 90 candidates and a weak one
for the 5 to 15 where a trade-off is decided: lines unnamed, the requirement not drawn, a failing line drawn as a
passing one, six families sharing one grey, and every scenario opening on the same four axes. The tunings, in order:
show each line's result (C40), draw the requirement on its axis (C41), open on the properties asked (C42), Ashby's
colours with one grey key (C43), names on a small set (C44). No brushing and no broken lines (V14, V15). The better
form for a short list already exists on the pages, the strip table of *Against its alternatives*; making it Compare's
form is a larger move for a later round (V17).

**Tone and words.** One voice already: data-sheet terms, British spelling, absence named (V18). What differs is the
drawer's older wiring: file names in a fold (C08), ISO dates (C02), "outside" and "above" where the page says
"beyond" (C04), the guide's name two ways (C05), and "retailers", "Chamber" and "Manufacturer" where the page says
"shops", "Heated chamber" and "maker" (C06, C16). Each fix is a string or a shared helper.

**UI and UX at large.** Identity is already one tool (V35). The flow's best feature is the round trip (V32). Its
breaks are at the seams: the way back lands on the wrong tab (C32), it promises results that do not exist (C33), and
nothing handed on points to the page (C37, C38). In the selector, the shortlist star is off a laptop screen although
Compare tells you to use it (C39). Use cases: screen, drill down, choose and hand on works on a laptop and a phone.
Browsing from a cold start is hidden on purpose (V34). Comparing a short list is the weakest use case (V13, V17).

## 2. The changes, in the order to build them

Each stage can be built and checked on its own. After each one: `npm run snapshot`, `npm run ui:check -- --write`, the
pages re-rendered, `npm run pages:check`, and `npm run build:diff` (0 differences except where an item says so).

### S1. Shared words and helpers (C01 to C13)

*Serves:* words for an engineer (INTERFACE, D124) and one computation per fact; S2 and S4 read what this stage builds.

**C01. Move the page's word helpers into the shared folder.** Do · S–M · Words 2, 5, 6; Drawer–page R2, R7, R9 ·
unblocks C02, C04, C07, C16, C21, C22
- *Before → after:* the date form (`dayWords`, `daysWords`), the count of verdicts per exposure (`verdictWords`), the
  gap rule (`shownGap`), the price-sample sentence, the key properties' basis sentence and the beyond-the-limits
  sentence (`masthead.js:160–162`) live in `app/pages`, where the drawer may not import them → in `app/js/ui`, called
  by both, as D146 moved `onTheH2cRows` and the display numbers. The verdict counter takes a new name, because
  `material-words.js` already has a different `verdictWords`.
- *Why:* one function per fact is what stops the two surfaces from ever saying it two ways.
- *Risk:* none on screen: views and `pages:check` unchanged.

**C02. One date form for people: "13 Sep 2026".** Do · S–M · Words 2, Frame R2 · depends on C01 · unblocks C03, C16,
C31, C38
- *Before → after:* about 330 ISO dates in PLA's drawer ("read 2026-09-13", "website checked 2026-09-26", "sampled
  2026-09-10 to 2026-10-07") and the page's product cards ("seen 2026-09-10"), against the page's "read 18 Sep 2026" →
  "13 Sep 2026" wherever a person reads a date, the citation and the brief included; ISO only where a machine reads
  (exports, the saved scenario, file names). See V09.
- *Where:* `detail.js:240`, `material-words.js:435`, `format.js:436` (`priceSampleWords`), `app/pages/products/card.js:268`,
  the footer's citation, `brief.js` where it prints a date.
- *Why:* the most frequent visible mismatch between the surfaces.
- *Risk:* `test/prices.test.js` pins data, not words.

**C03. One provenance line, from one helper.** Do · S · Frame R2 · depends on C02 · unblocks C31
- *Before → after:* the selector's status bar "data 2026-09-21 · release 3cc2e5f2a439" → "release 3cc2e5f2a439 ·
  documents read 10 Sep–5 Oct 2026", the build date and the snapshot's name in its tooltip. The pages' sign-off line
  (C31) prints the same words plus "built 17 Oct 2026".
- *Where:* `main.js:1123`, a helper in `format.js`.
- *Why:* the one frame difference that could mislead about how current the data is.
- *Risk:* the selector must carry the documents-read span; a test that reads `#meta`.

**C04. The H2C block's words: "beyond", and no clause said twice.** Do · S · Words 4 and "Also small", Drawer–page R3
in part (V20) · depends on C01 · unblocks C15
- *Before → after:*
  - The drawer's Printing foot "No product's setting is outside the H2C's limits (…)" → the page's own sentence, "No
    product's setting is beyond the H2C's limits: nozzle 350 °C, bed 120 °C, heated chamber 65 °C".
  - The On the H2C rows' "2 above or only partly within" → "2 beyond or only partly within".
  - A row whose count repeats its note ("All 3 products · All 3 products are within the H2C's 350 °C") keeps one.
  - Counts in one form (`countWords`, `print-brief.js:29`).
  - The page figure's "H2C max 120 °C" → "the H2C reaches 120 °C", the form it already uses off the scale.
- *Where:* `material-words.js:339, 362`, `detail.js:1129`, `print-brief.js`, `app/pages/charts/temperatures.js:90`.
- *Why:* the chip says *Beyond*. Three words for one gate read as three tests. D146's per-row counts stay (V20).
- *Risk:* `test/print-spread.test.js:414–426` pins the drawer sentence: change it in the same commit.

**C05. One name for the guide.** Do · S · Words 3
- *Before → after:* "Bambu Lab's Filament Guide for PLA" (347 times in PLA's drawer) beside "Bambu Lab Filament Guide"
  (335 times on its Products page) → "the Bambu Lab Filament Guide (PLA column)", then "the guide", as INTERFACE names it.
- *Where:* `build/src/print-guide.js:16` (`guideName`), `app/pages/sections/sources.js:74`, `charts/temperatures.js:190`,
  the Products key.
- *Risk:* the build writes the name, so `build:diff` shows label paths (no answer moves).

**C06. The drawer's labels in the tool's words.** Do · S · Words 6, 7, "Also small" · depends on C01
- *Before → after:*
  - On the product cards: "Chamber" → "Heated chamber", which the drawer's own Overview already says, and
    "Manufacturer" → "Maker".
  - The Variant line "left out of the material's range" → "kept out of the material's median".
  - "Gave: 1 environment statement" → "1 statement on chemicals or use".
  - On the page, "User-supplied reference" → "Reference" (INTERFACE).
  - Known-gap property names in lower case inside a sentence.
- *Where:* `detail.js:611, 1319, 1321–1322`, `material-words.js:97`, `app/pages/sections/sources.js:55, 62, 84`.
- *Why:* the drawer disagrees with itself and with the page on every product card.

**C07. One sentence under the key properties.** Do · S · Words 5 · depends on C01
- *Before → after:* "Each figure is the median of the products that state the test's orientation or load." → the
  page's sentence, imported: "…that publish it with a stated orientation or test load, and beside it the middle half of
  them". The Products tab's "the range is between products, not a product's test scatter" → "The range is the products'
  lowest to highest."
- *Why:* one definition for the same six numbers. "Test scatter" is a coinage the page never uses.

**C08. The drawer's bookkeeping goes under "Record notes".** Do · S · Words 1, 7
- *Before → after:* the Overview's fold *About this entry* prints source IDs, migration IDs and file names ("No row in
  polymers.csv, so the estimate model…") on 72 of the 88 drawers that have one → the fold is titled *Record notes*,
  the drawer's existing place for maintainers' notes. Each product card's *Availability* ("product page returned
  HTTP 403") moves into it too.
- *Where:* `detail.js:1165`, the cards' Product details.
- *Why:* the last place an engineer meets file names in the drawer. Every record stays one press away.
- *Risk:* `drawer-ids.mjs` (each record still reached).

**C09. "Key properties" on the pages too.** Do · S · Words "Also small" (V19)
- *Before → after:* "key figure(s)" on the method page and in the plate's label → "key property(ies)" (INTERFACE).
  "The special effect grades, support materials, anti-static grades" → "special-effect, support and anti-static
  materials".
- *Where:* `method-page.js:32, 36`, the plate's `aria-label`.
- *Risk:* the refused-word list in `pages:check`.

**C10. "Typical applications" names its source.** Do · S · Words glossary; OPEN-PROBLEMS §37.20
- *Before → after:* the drawer gives a guide's sentence in the tool's voice (PLA's is Prusa Research's) → the heading
  stays, and the line ends "after Prusa Research", as the page does.
- *Why:* every statement says whose it is.

**C11. The environment caveat, said once from the method table.** Later · S–M · Words 10
- *Before → after:* the drawer's "…treat them as indications, not design data" beside the page's "…so these are
  indications, not design data" → one `method.csv` row both read. Use the drawer's wording, which the last round's
  keep register kept (K27).
- *Risk:* a migration adds the row.

**C12. Thousands separators in requirement text.** Later · M · Words 11
- *Before → after:* "Density at most 1500 kg/m³" and "Published 1310 kg/m³" beside "1,310 kg/m³" → "1,500 kg/m³" in
  `describeConstraint` and the drawer's "Published" value. The rail's input keeps "1500".
- *Risk:* `ui:fuzz` and saved scenarios read the pill text: run the 300 rendered scenarios.

**C13. A range writes its unit once.** Later · S · Words glossary
- *Before → after:* "40 MPa–53 MPa" in the page's flat/across table and "67 %–103 %" in the drawer → "40–53 MPa" and
  "67–103 %", as a data sheet prints them.

### S2. The drawer and the page state each fact once (C14 to C22)

*Serves:* "every number traceable, every gap visible" and the material summary (scorecard C3, C5). These matter most:
each removes a number or a judgement that differs between the surfaces.

**C14. A bound keeps its sign everywhere.** Do · S · Drawer–page R1; OPEN-PROBLEMS §37.19 · unblocks C36
- *Before → after:* PEI-CF's HDT at 0.45 MPa is "> 200 °C" on both key-figure plates, but "200" in the drawer's
  Products spread table and Thermal table, and in the page's alternatives figure and table and its In service row →
  "> 200" everywhere.
- *Where:* `detail.js`, `app/pages/sections/among.js`, `charts/temperatures.js`.
- *Why:* a bound printed as a value overstates the sheet, two lines below the right number.
- *Risk:* `pages:check` compares each figure mark with the spread entries and must accept the operator.

**C15. The drying count agrees with itself.** Do · S · Drawer–page R11 · depends on C04 (same file)
- *Before → after:* PEI-CF "100–140 °C, 6–8 h · 1 of 3 products calls for it", then "2 products" a section later, on
  both surfaces → "1 of 3 calls for it; 1 more gives it as optional", in the shared sentence (`print-brief.js`).

**C16. The price, described the page's way.** Do · S · Drawer–page R7, Words 8 · depends on C01, C02
- *Before → after:*
  - "165 CAD/kg ᵁˢᴰ, one product's price, from 2 shop listings" (one of the two is unused) → "165 CAD/kg, one product's
    price, from 1 listing in USD, converted".
  - "9 Canadian retailers and 7 foreign sellers, sampled 2026-09-10 to 2026-10-07, not live" → the page's sentence:
    "Regular prices from 9 Canadian shops and 7 foreign shops, sampled 10 Sep–7 Oct 2026, not live; shipping and tax
    are not included".
  - The column "Retailer" → "Shop".
  - Unused listings stay listed (V25).
- *Why:* a superscript USD reads as a price in USD, and a buyer needs the shipping-and-tax caveat.

**C17. One precision for a median inside the drawer.** Do · S · Words 9
- *Before → after:* the Products tab's spread table "Glass transition (Tg) 58.9" and "Price 33.7" → "59 °C" and
  "34 CAD/kg", the Overview's and the page's display precision (`display-numbers.js`).

**C18. An as-published value says so in the *Also* line.** Do · S · Drawer–page R6
- *Before → after:* PCTG-GF's "Elongation at break (XY) 8 %" in a median's weight → "8 % as published", grey, with the
  page's hollow mark.
- *Why:* the drawer stops presenting a number as a median when its own key rows decline to rank it.

**C19. The page names missing key properties by their labels.** Do · S · Drawer–page R5
- *Before → after:* "Not published: strength across the layers, notched impact, price" → "Not published: tensile
  strength (Z), notched Charpy impact, price", the names on the plate, in the drawer and on the Products columns.
- *Where:* `app/pages/sections/masthead.js`.

**C20. The drawer says how well documented the material is.** Do · S · Drawer–page R4
- *Before → after:* "On file: 20 measurements from 8 documents · 2 known gaps" → "Thinly documented · 20 measurements
  from 8 documents · …": the page's word (well, partly or thinly documented) from the shared `evidenceTier`, with its
  reason as the tooltip.
- *Why:* in the drawer, PCTG-GF's two sheets look as solid as PLA's 281 documents.

**C21. The gap count adds up.** Do · S · Drawer–page R9 · depends on C01
- *Before → after:* PCTG-GF "2 known gaps" with one shown (the other is a review note), and PLA and PETG "1 known gap"
  for the standing *Rarely published properties* row → the count and the list follow the page's rule (`shownGap`). A
  gap is counted where it is listed. A gap another tab already states (the sparse properties in Mechanical's and
  Thermal's *Not published* lists, the Canadian price in Price) is said there, once.
- *Guard:* before a row leaves the Known gaps list, confirm the other tab states it; if not, it stays, counted. No gap
  may disappear.

**C22. One verdict per exposure in the Environment tab.** Do · S–M · Drawer–page R2 · depends on C01
- *Before → after:* "Acid resistance", then 12 statements in mixed words ("Not resistant", "Good", "Poor", a quotation)
  → "Acid resistance: not resistant, in 8 of 12 statements", from the page's moved function; the statements below stay
  as they are.
- *Why:* environment is one of the three core decisions; "does it take acid?" gets the page's answer in one line.
- *Risk:* it counts makers' statements and is not a pass. The answer to an environment requirement stays at the
  Overview's top, product by product (D98), and "in N of M statements" keeps the two apart.

### S3. The frame and identity (C23 to C31)

*Serves:* no method step directly. It removes the doubts a reader has on crossing from one surface to the other, and
C31 with C03 says how current the data is. Check both surfaces at phone width and in the dark theme.

**C23. Three radius tokens and one button weight.** Do · S · Frame R9 · unblocks C24, C31
- *Before → after:* radii of 6, 7, 8, 9 and 11 px in the selector and 6, 7, 10 and 12 on the pages → `--r-ctl` 7,
  `--r-track` 10 and `--r-plate` 12 in `tokens.css`, so the lens tabs and *Overview | Products* match to the pixel.
  `.btn` takes weight 500 on both surfaces.
- *Why:* few will see it, but it lets C24 and C31 follow one rule.

**C24. One theme button.** Do · S · Frame R1 · depends on C23
- *Before → after:* the pages' half-filled disc, labelled "Dark theme" → the selector's moon or sun, showing what a
  press switches to, named "Switch to dark theme" or "Switch to light theme"; one 36 px box on both.
- *Where:* `app/pages/shell.js` (`ICON.theme`), `app/pages/assets/page.js` (`paintTheme`).

**C25. No white flash when the selector opens dark.** Do · S · Frame R1
- *Before → after:* the selector applies a stored dark theme only after its 8 MB script, so it shows light for about
  0.1 s each time *Back to your results* reopens it → the pages' one-line head script in `app/index.html`, with the
  same key (`h2c-theme`).

**C26. The page bar on the selector's white.** Do · S · Frame R3
- *Before → after:* the bar on the warm grey (`--bg`), 56 + 1 px → `--surface`, 58 px. The centred column stays.
- *Where:* `frame.src.css` `.atlas-bar`.

**C27. *Full page →*.** Do · S · Frame R7
- *Before → after:* "Full page", with no icon → "Full page →", the mirror of the page's "← Open in the selector";
  "Page →" on a phone. *Where:* `detail.js:461`.

**C28. The mark stays on a phone.** Do · S · Frame R4, second half (V08)
- *Before → after:* below phone width the selector hides its mark → it hides only the name, as the pages do.
- *Where:* `app.css:998`. *Risk:* at 390 px the search box loses 34 px.

**C29. The drawer's head set as the page sets it.** Do · S · Flow 11, Drawer–page R10, Frame R10
- *Before → after:*
  - A long full name ("Polyethylene Terephthalate Glycol-Modified") wraps into three lines beside the buttons and
    pushes the tabs down 65 px, about 200 px on a phone → the full name on its own line under the name, at the
    identity line's size, as on the page.
  - The tag "Type on Bambu Lab's H2C list" at 10 px, the smallest text on either surface → 12.5 px.
- *Where:* `app.css` `.drawer-head h2`, `.h2-full`, `.chip-small`.

**C30. One search field.** Later · S · Frame R11
- *Before → after:* the white search pill on the index and the Products page → the selector's filled pill and its
  focus state.

**C31. The footer: a band that ends the page.** Do; the look is your call (V04) · M · Frame R5 option B, Flow 8,
Words 12 · depends on C02, C03, C23
- *Before → after:* see answer 1 and `ui-frame/shots/footer-0-now.png`. After:
  - A full-width white band (`--surface`). The mock-up's band is clipped at the sides; the real one is full width.
  - The standing sentence, word for word.
  - The same three buttons on every page kind: the return (its long words on a phone), *Products N* and *All
    materials*.
  - In the second column:
    - "The summary above was drafted by an AI agent (Claude Opus) on 17 Oct 2026 and has not yet been reviewed."
    - The citation, with *Copy the citation* and *Print this page* (hidden in print).
  - One closing line across the width: the 18 px mark, then **Filament Atlas** · release · documents read · built,
    from C03.
- *Where:* `app/pages/sections/footer.js`; `shell.js` `siteFooter` (render it after `</main>`, because `.page` clips
  a full-width band); `index-page.js`; the method page.
- *Risk:* `pages:check` P12 requires the byline to contain the summary's ISO date and its review words, so change it to
  the new date form; `docs/OPERATING.md` describes the colophon's sentence.

### S4. The way across and the hand-offs (C32 to C39)

*Serves:* step 5 (drill down to products, scorecard C8) and the team's hand-off (C14). Check: the interface probe's
return trip, the links in `pages:check`, `drawer-ids.mjs`, and `ui:fuzz` for C39.

**C32. The way back lands on Products.** Do · S · Flow 1; OPEN-PROBLEMS §37.19 · unblocks C33
- *Before → after:* from a Products page, *Back to your results* reopens the drawer on the tab last used, usually
  Overview → on Products, where the passing products and *Choose this product* are. The link writes the tab into the
  kept scroll.
- *Where:* `app/pages/assets/page.js`, `main.js` (`keepScroll`).
- *Why:* a reader who comes back from browsing every product is about to choose one. The page stays free of verdicts
  (V22).

**C33. "Back to the selector" when there are no results.** Do · S · Flow 2 · depends on C32 (same link)
- *Before → after:* with no requirement and an empty shortlist the pages still say *Back to your results* → *Back to
  the selector*. The index's "use the selector" becomes that link.
- *Where:* `page.js`, `index-page.js`.

**C34. The drawer's product search above the products.** Do · S · Flow 4; OPEN-PROBLEMS §37.20 · unblocks C35
- *Before → after:* the search sits below up to 63 passing PETG products → first, filtering both lists, as on the
  Products page. *Where:* `detail.js`, about line 1338.

**C35. The drawer's products in one order, and the order said.** Do · M · Flow 3, Drawer–page R8; OPEN-PROBLEMS §37.20
(V21) · depends on C34 · unblocks C36
- *Before → after:*
  - Today PETG has three "first" products. The passing products are listed in maker order and the first opens
    (3DXTECH). The Overview is "Shown for Bambu Lab PETG Basic". The page opens on Bambu Lab PETG HF. A cold list leads
    with a maker chosen by an unstated rule.
  - After: the passing group is sorted most documented first, by the Products page's own sort key (imported, so there
    is one rule), and the Overview's product opens first.
  - The rest stay by maker, and the first line says so: "by maker; 3DXTECH first, its products most often the
    material's typical value".
- *Why:* one material, one first product, and an order that no longer looks arbitrary.

**C36. A closed product line shows the plate's figures.** Do · S · Drawer–page R8 · depends on C14, C35
- *Before → after:* "Density 1,280 kg/m³ · Modulus XY 1.4 GPa · Strength XY 47 MPa" → the first three a product
  publishes of modulus XY, strength XY, HDT at 0.45 MPa and price: the page's columns.

**C37. Each drawer product links to its card on the Products page.** Do · S · Flow 5 · unblocks C38
- *Before → after:* none → "Its card on the Products page", to `M033-products.html#G033-xx`, carrying the selection as
  *Full page* does, where the material has a page.
- *Why:* the full record of the product about to be chosen, one press away; C32 brings the reader back.

**C38. The decision brief names the page.** Do · S · Flow 6 · depends on C37, C02
- *Before → after:* the brief has no link → one line giving the material page and the product's card, with the release.
- *Why:* the colleague who receives a decision can read the reasons behind it. This is the hand-off the pages were
  built for.
- *Risk:* a relative link works only where the pages sit beside the selector; say so in one clause, and use the
  absolute address on the site.

**C39. The shortlist star beside the material's name.** Do · S · Flow 9
- *Before → after:* at 1280 px with the rail open, the star column is at x = 1364, off the screen, while Compare's empty
  state says to use it → a narrow column straight after *Material*.
- *Risk:* `ui:fuzz` and the views select by column.

### S5. Parallel lines and the lenses' graphs (C40 to C49)

*Serves:* step 4, understanding the trade-off (scorecard C7). It is independent of S1 to S4 and can run beside them.

**C40. Parallel lines shows each line's result.** Do · S · Graphs R9
- *Before → after:* with Unknown or Fail shown in the table, a failing line is drawn like a passing one → Unknown
  dashed and Fail faded, as Ashby draws them (`ashby.js:592`), with a key entry.
- *Why:* a lens must not blur the selector's verdict, which is why I moved this from a tidy-up to *do*.

**C41. The requirement drawn on its axis.** Do · S · Graphs R1 · unblocks C46
- *Before → after:* nothing is drawn. Under *Warm environment*, 4 of 33 lines (PLA, PLA-CF, PETG, ASA Aero) sit below
  the 80 °C asked for, with nothing to say why: each passes on some of its products → Compare's requirement mark across
  each constrained axis, dashed when the requirement is reported only. A threshold beyond the drawn range sits at the
  end with Compare's chevron. No tint, to keep it quiet.

**C42. Open on the properties asked.** Do · S · Graphs R3
- *Before → after:* every scenario opens on density, modulus, elongation and HDT, so *Indoor prototype*, which asks
  about price, has no price axis → the constrained properties first (required, then reported), filled to four or five
  from today's defaults. A reader's own choice is kept.
- *Where:* `parallel.js` (`DEFAULT_AXES`).

**C43. Ashby's family colours and one grey key.** Do · S · Graphs R6 · unblocks C44, C51
- *Before → after:* families are ranked over all 152 materials, so six of them (ABS, ASA, PC, PET, Styrenics,
  Polyolefins) share one grey and get six identical keys → the same colour call as Ashby, and one "Other families" key.

**C44. Names on a small set, and one selection across lenses.** Do · S–M · Graphs R4 · depends on C43
- *Before → after:* five unnamed lines, two of them the same grey →
  - with 15 lines or fewer, each name at its right end;
  - once anything is shortlisted, the shortlisted lines at full weight and the rest lighter;
  - Ashby's selected material raised on arrival, and a line selected here selected there (INTERFACE: "a material
    highlighted in one is highlighted in all").
- *Risk:* names collide in a tight cluster, so none above 15 lines.

**C45. The better end and real ticks.** Later · S · Graphs R5
- *Before → after:* only the two ends of each axis are labelled → "↑ better" or "↓ better" under each unit, and three to
  five ticks (decades on a log axis). The axes are not flipped (V16).

**C46. The products' spread on the line being read.** Later · S–M · Graphs R2 · depends on C41
- *Before → after:* the readout gives the median alone ("Modulus XY 3.4 GPa") → the raised line and the readout take
  the page's glyph (middle half and range) and say "passes on 1 of 9 products".

**C47. Far outliers parked at the axis end.** Later · S–M · Graphs R7
- *Before → after:* one elastomer at 0.006 GPa packs 53 rigid materials into a third of the modulus axis → the page's
  "beyond the scale ›" rule.

**C48. Compare draws the page's glyph.** Later · M · Graphs R10 (V17, V30)
- *Before → after:* a navy bar to the median and an outlined range box, with no middle half → a median tick, a
  middle-half bar and a range hairline on the same full-span track. D146 already made a log track a tick.

**C49. One wording for log scales and counts.** Later · S · Graphs R11; OPEN-PROBLEMS §37.20
- *Before → after:* "log", "log scale" and "GPa · log" → "<unit> · log scale"; "· 3" → "3 products". One phrase for
  what a median leaves out: "kept out of the median" for a product, "not ranked" for a count (Words).

### S6. Your calls (C50 to C54)

**C50. Inter in the selector.** Owner's call: I lean yes, after S3 · M · Frame R6 (V11) · depends on C23 to C31
- *Before → after:* the pages draw numbers in Inter, the selector in the system face (SF Pro on a Mac, Segoe UI on
  Windows) → Inter first in `--sans`, with the same 60 KB subset embedded (about 1 % of the file).
- *Gain:* the same "2.53 GPa" in the same glyphs on both surfaces, a plain difference on Windows.
- *Cost:* every view moves, and the top bar's one-row widths (1101 to 1250 px) need re-checking.

**C51. One meaning per colour.** Owner's call: I lean yes · S · Graphs R6, R12 (V36) · depends on C43
- *Before → after:* Nylon's family blue sits next to the accent that means "this material", and PETG's red-orange next
  to PLA's → hues well apart.
- *Cost:* Ashby's colours, which readers may know, change once.

**C52. A line to the pages on the first screen.** Owner's call: I lean no, for now · S · Flow 7 (V34)
- *Change:* one grey line under the template cards, "Or read a material whole: the 76 material pages, by family".
- *Gain:* browsing is visible from the start.
- *Cost:* it goes back on your D145 answer (a quiet link) and on D146's calmer first screen, and it pulls the first
  screen from screening, the method's first steps, toward browsing.

**C53. The pages' mark leads to the selector.** Owner's call: I lean no · S · Frame R4 (V07)
- *Gain:* the usual "logo goes home".
- *Cost:* it reverses D145. The bar reads as a trail (Filament Atlas › Materials › PLA) whose root is the materials,
  the selector is the labelled button beside it, and the change swaps one duplicate link for another.

**C54. "Compare these in the selector" under the page's alternatives.** Owner's call: I lean not now · S–M · Flow 10
(V33)
- *Gain:* the page's six alternatives judged against your requirements in one press.
- *Cost:* it replaces the reader's shortlist. It belongs with V17's Compare.

## 3. Verdicts and judgements

"Held by" names who holds the judgement. Those marked **owner** need your word.

| ID | Judgement | Held by | My recommendation |
|---|---|---|---|
| V01 | More coherence is worth it at the seams (facts, words, the frame a reader crosses), not in form | All five | Agree; every C item follows it |
| V02 | How much it helps: modest per item (perhaps one reader in three notices a given one), but each sits where a reader compares the two surfaces; no answer moves | Drawer–page, Flow | Agree; S2 helps most, then S1 |
| V03 | The rule: one computation per fact, shared by both surfaces; one word per thing, from INTERFACE's word list, else the wording you kept (the keep register), else the page's; only the selector judges; each surface keeps the form of its job | Mine, from the five | The test I held every item to (section 5) |
| V04 | **Owner.** The footer: keep a footer. A: a band (S). B: the band, *All materials* and one sign-off line with the provenance (M). C: a citation plate on top. Frame picks B; Flow adds Print; Words wants the authorship in one sentence | Frame, Flow, Words | B with Print and the one sentence (C31) |
| V05 | Option C, the citation plate | Frame, optional | Don't for now: weight with no shown use |
| V06 | Theme control: the pages take the selector's icon, words and box; the selector applies the stored theme before the first paint | Frame | Agree (C23 to C25) |
| V07 | **Owner.** The mark's link: the index on the pages (D145); Frame proposes the selector, or else the index on both | Frame against D145 | Keep D145 (C53 not built): the trail's root is the materials, and the selector has its own button |
| V08 | The mark stays on a phone on both surfaces | Frame | Agree (C28) |
| V09 | **Owner, for the citation only.** Dates: "13 Sep 2026" where a person reads. Words keeps ISO in the citation, brief and exports; Frame keeps it in the citation if you prefer | Words, Frame | Day-month wherever a person reads, citation and brief included, so one footer never shows one span two ways; ISO for machines only (C02) |
| V10 | Provenance: "data 2026-09-21" is a snapshot's name that reads as a date of the data; use one string on both surfaces | Frame | Agree (C03) |
| V11 | **Owner.** One sans: Inter in the selector too | Frame | Yes, after S3 (C50) |
| V12 | The drawer's name in the pages' serif (Newsreader) | Frame, optional | Don't: the serif is the document's voice; the drawer is an instrument, and C29 gives the cue |
| V13 | Parallel lines: keep and tune; right for 30 to 90 candidates, weak for 5 to 15 | Graphs | Agree (C40 to C47) |
| V14 | No brushing: the rail owns and saves the requirements; a brush would be a second, unsaved filter | Graphs | Agree |
| V15 | Draw incomplete candidates as broken lines | Graphs R8 | Don't: busier and harder to read; the axis chips already say what each axis costs |
| V16 | Flip density and price so up is better | Graphs (rejected it) | Agree: don't |
| V17 | **Owner, for a later round.** The short-list trade-off belongs to a strip table (the pages' *Against its alternatives*) used as Compare's form | Graphs | Right direction, larger than "minor"; C48 is the small first step |
| V18 | Tone: one voice already; the gap is the drawer's older wiring | Words | Agree (C02, C04 to C11) |
| V19 | "Key properties", not "key figures" | Words, INTERFACE | Agree (C09) |
| V20 | On the H2C rows: Drawer–page would drop each row's count against the limit and close with the page's one line; D146 gave the drawer those counts; Words keeps them and changes the word | Drawer–page against Words and D146 | Keep D146's counts, which explain a Partly or Beyond chip (the drawer's job); "beyond"; trim only a clause that repeats its note (C04). No closing line: the head already says "beyond capability" once |
| V21 | The drawer's product order: the page's order (Flow), or by maker with the order explained (Drawer–page) | Flow against Drawer–page | Method step 5 is "which pass, by maker": the passing group takes the page's order and opens on the Overview's product; the rest stay by maker, with the order said (C35) |
| V22 | The page shows no verdict: no Choose, no pass marks, no requirement colours | Flow, Drawer–page, Words | Keep; C32 closes the gap instead |
| V23 | No sort in the drawer's Products tab: cards with Choose in the drawer, a sortable table on the page | Flow, Drawer–page | Keep; C37 is the bridge |
| V24 | No summary, *Among the materials* or plate drawings in the drawer | Drawer–page | Keep |
| V25 | The drawer's full record (every missing property, statement and listing) against the page's chosen record | Drawer–page | Keep |
| V26 | Two printing figures: the page's one temperature axis, the drawer's lowest and highest dots | Drawer–page | Keep |
| V27 | Status colours only in the selector; PEI-CF red in the drawer, grey on the page | Frame, Drawer–page | Keep |
| V28 | App bar against document bar; underline tabs against segmented control; breadcrumbs only on the pages | Frame | Keep |
| V29 | The table's full range (it screens on any product) against the middle half (it describes), each labelled | Words; OPEN-PROBLEMS §37.20 | Keep |
| V30 | The figure grammar (median tick, middle-half bar, range hairline, hollow) is the best visual idea; the lenses borrow it | Graphs, Drawer–page | Agree (C46, C48) |
| V31 | Draw the drawer's graphs on the page's log scale | Drawer–page R12 | Don't: the drawer draws one material's products, the page every material on fixed frames; the values agree, and the scale rule is tested |
| V32 | The round trip is the best thing in the tool | Flow | Keep; C32 and C33 refine it |
| V33 | **Owner.** "Compare these in the selector" from the page | Flow 10 | Not now: it replaces the shortlist (C54) |
| V34 | **Owner.** A line to the pages on the first screen | Flow 7 | Not now: D145, D146 and the goal's order (C52) |
| V35 | Identity is already one tool: mark, palette, segmented control, focus ring, icons | Frame | Agree; C23 to C29 close the rest |
| V36 | **Owner.** Blue means "this material"; no family borrows it, and PLA and PETG should not look alike | Graphs | Agree (C51) |

## 4. Keep as it is, and what not to do

**Keep:** the page decides nothing and the selector judges (V22, V27); the drawer's full record and its cards with
*Choose* against the page's chosen record and sortable table (V23, V25); the two printing figures (V26); the two bars,
the two tab styles and the serif on the pages only (V28, V12); the table's range against the middle half (V29); the
figure grammar (V30); the round trip (V32).

**Not to do:**
- Drop the drawer's per-row counts against the H2C's limits; it would undo D146 (V20).
- The serif in the drawer (V12).
- The citation plate (V05).
- Broken lines, brushing or flipped axes in Parallel lines (V14 to V16).
- The page's log scale in the drawer (V31).

Held as your calls, with my lean against: the mark to the selector (C53), a line to the pages on the first screen
(C52), and *Compare these* from the page (C54).

## 5. Coherence check

I checked all 54 changes and 36 judgements against the goal (a defensible shortlist; every number traceable; every gap
visible; the page explains and the selector decides) and against each other. No *do* change undoes another, and none
undoes D145 or D146 except the three marked as your calls (C52, C53, C54), each with my lean against.

**Reshaped for coherence:**
- **C04** takes only the word from Drawer–page R3 and keeps D146's counts (V20).
- **C21** carries a guard, so a gap leaves the count only where another tab states it and no gap disappears.
- **C02 and C31** put the citation in day-month too. Words and Frame had kept ISO there, which would have shown one span
  two ways in one footer.
- **C35** limits Flow's page order to the passing group, so the grouping by maker in method step 5 stays.
- **C22** is worded as a count of statements, so it cannot be read as the selector's verdict.
- **C40** was promoted to *do*: a failing line drawn as a passing one blurs a verdict.
- **C08** moves bookkeeping and removes none of it, and C16 keeps unused listings listed, so traceability holds.
- **C11** uses the drawer's caveat wording, which you kept (K27), over the page's.

**Dropped:** Frame R5 option C, Frame R8, Graphs R8, Drawer–page R12 and the closing line of Drawer–page R3.

**Ordered where two items touch one thing:**
- `print-brief.js`: C04, then C15.
- The drawer's Products block: C34, C35, C36.
- The return link: C32, then C33.
- The theme CSS: C23, then C24.
- The footer, after the date and provenance helpers: C02, C03, then C31.
- The palette: C43, then C51.
- The shared helpers come before everything that reads them: C01.

**The principles that tie the set together:**
1. One fact, one computation; one thing, one word. Both surfaces call the same helpers and use INTERFACE's words, the
   page's wording filling any gap.
2. Form follows the job. Only the selector judges, the page explains, and every gap and record stays visible where a
   reader looks.
