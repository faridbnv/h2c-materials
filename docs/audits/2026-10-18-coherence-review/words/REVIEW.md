# Words: are the pages and the selector one voice?

> **Historical record** (2026-10-18): one reviewer's findings for the coherence review (see [BRIEF.md](../BRIEF.md)).
> Nothing in the code or the data was changed. Read from the built `dist/` at 0125d29e: PLA (M001), PETG (M020) and
> PEI-CF (M118) pages and PLA's Products page; the method and index pages; PLA's drawer on every tab (no template and
> Indoor prototype) and PEI-CF's under Outdoor structural part (printed in Node with
> `docs/audits/2026-10-18-selector-refinement/lib.mjs`); `build/snapshot/ui/01-default.txt`, `10-*`, `13-*`, `20-*`.
> Text views strip tags, so each spacing or dash finding below was checked in the raw HTML. The text views show
> "195 – 230" because of word joiners; the pages print "195–230", which is correct.

## Findings

**Verdict: the two surfaces already speak with one voice, and closing the remaining gap is worth doing because it is
cheap.** They write for the same reader in the same register: data-sheet terms (XY and Z, HDT at 0.45 MPa, notched
Charpy, middle half, median), the answer first, and absence named rather than left blank ("Not published", "—"). Tool
text is British everywhere: moulded, odour, fibre, colour, labelled, per cent. American spellings appear only in makers'
names and quotations (colorFabb, Fiberlogy, "Odorless"), which is right. Several things are already identical, and
should stay so:

- "ranked of … shown"
- "Printing in full"
- "Beyond H2C capability"
- "added filler or additive, kept out of the median"
- "On the H2C" and its five rows (one function, `print-brief.js`)
- the foot caveat "Data-sheet values describe test specimens, not design allowables…", read by both from `method.csv`
  (the pattern every shared caveat should follow)

**What is not coherent is mostly the drawer's older wiring, not its design.** The differences fall into four groups:

1. **Two forms of one thing.**
   - Dates: the drawer prints "read 2026-09-13", the page "read 13 Sep 2026".
   - The guide's name: "Bambu Lab's Filament Guide" 347 times in PLA's drawer, "Bambu Lab Filament Guide" 335 times
     on PLA's Products page.
   - The H2C's limits: "outside" or "above" in the drawer, "beyond" on the page.
   - Who sells: "retailers" and "sellers" in the drawer, "shops" on the page.
   - Labels: "Chamber" against "Heated chamber", "Manufacturer" against "maker".
2. **One caveat, two sentences.** The basis of the medians and the environment caveat are said in almost the same
   words on each surface, but not in the same words.
3. **Record bookkeeping in reader text.** The drawer's *About this entry* fold prints source IDs, migration IDs and
   `polymers.csv` on 72 of the 88 drawers that have one. The page shows none of it. INTERFACE's own rule puts such
   notes under "Record notes".
4. **Numbers.** In the drawer, "Density at most 1500 kg/m³" and "Published 1310 kg/m³" sit one line above
   "1,310 kg/m³". In the same drawer, the Products tab's spread table gives medians of "58.9 °C" and "33.7 CAD/kg"
   where the Overview and the page say 59 and 34.

**Is more coherence worth it?** For words, yes, and the case is easy to make:

- Every fix below is a string or a shared helper (S, under an hour).
- Most are one function that both surfaces call, or should call.
- An engineer who opens *Full page* from the drawer meets the same name for the same thing.
- None changes the drawer's job (judge against requirements: PASS, FAIL, UNKNOWN) or the page's job (describe;
  "nothing judged").

**Keep the differences that follow from the jobs.** The drawer's verdict chips stay, and so does the page's refusal to
judge ("These are published values, not recommendations: the selector judges each product against your
requirements"). Each surface keeps its own button and link pairs: *Full page* against *Open in the selector* or *Back to
your results*, and *Show the products* against *Compare the 195 products*. The selector's table keeps the full range
(lowest to highest), because it screens on any product, while the page keeps the middle half, because it describes.
Both are labelled.

## Glossary: where the two surfaces differ

| Thing | Material page says | Drawer or selector says | Keep | Why |
|---|---|---|---|---|
| A document's read date | "read 13 Sep 2026", "10 Sep–5 Oct 2026" (`dayWords`) | "read 2026-09-13", "website checked 2026-09-26", "sampled 2026-09-10 to 2026-10-07"; the page's own price lines "seen 2026-09-10" | **13 Sep 2026** | How a reader writes a date. The ISO date stays only in the page's citation line and the brief/export |
| The printer maker's guide | "Bambu Lab Filament Guide" (product cards); "Bambu Lab's Filament Guide" (key, Sources, figure note) | "Bambu Lab's Filament Guide for PLA" (cards, Printing heading); "the Bambu Lab Filament Guide" (ledes) | **the Bambu Lab Filament Guide**, then "the guide" | INTERFACE's name; a document's title is not a possessive |
| Past the printer's limit | "beyond the H2C's limits" | "outside the H2C's limits"; "2 above or only partly within" | **beyond** | INTERFACE: Exceeds → Beyond. The chip already says *Beyond* |
| The printer's limit in a figure | "H2C max 120 °C" beside "H2C reaches 350 °C" (one figure) | "the H2C reaches 350 °C, above this scale" | **the H2C reaches N °C** | One form; the drawer's is the clearer |
| Basis of a median | "the median of the products that publish it with a stated orientation or test load, and beside it the middle half of them" | "the median of the products that state the test's orientation or load"; Products tab: "the range is between products, not a product's test scatter" | **the page's sentence** | It also says what the second number is |
| Left out of a median | "kept out of the median(s)" | "kept out of the median" (legend), "Not ranked:", "Left out of the range", "left out of the material's range" (Variant), "not counted" (Printing) | **kept out of the median** for a product; **not ranked** for a count | The legend and the page already agree |
| Who sells | "shops", "listings" | "retailers", "sellers", "shop listings", column "Retailer" | **shops**; "listings" when listings are counted | One word for one thing |
| Heated chamber | "Heated chamber" (plate, cards, figure) | "Heated chamber" (Overview) but "Chamber" plus "Enclosure" on every product card | **Heated chamber** | The drawer disagrees with itself |
| Maker | "maker", "makers" | "Manufacturer" (Product details, on every card) | **Maker** | Used everywhere else on both surfaces |
| A statement on chemicals | "statement on chemicals or use" (Sources) | "environment statement" (Sources: "Gave: 1 environment statement") | **statement on chemicals or use** | "Environment statement" is the table's name (`evidence.csv`), not the reader's |
| A user-supplied publisher | "User-supplied reference" (PLA's document list) | "Reference" | **Reference** | INTERFACE row; the drawer already maps it (`publisherName`) |
| Six headline numbers | "key figures" (method page, plate's aria-label) | "Key properties" (drawer, selector "Key properties of each material") | **Key properties** | INTERFACE: headline → key property. "Key figures" is the plate's code name |
| What makers sell it for | "What it is sold for", attributed ("after Prusa Research, PLA \| Prusa Knowledge Base") | "Typical applications", unattributed for PLA | Keep the drawer's heading (a data-sheet term), **add the attribution** | A guide's sentence should not appear in the tool's voice |
| Spread on a key property | "55 products · middle half 1.93–2.87" (count first, unit on the value) | "2.53 GPa middle half 1.93–2.87 GPa · 55 products" | Keep both | Stacked cell against one line; both are clear |
| Range forms | "1.93–2.87 GPa"; but the flat/across table prints "40 MPa–53 MPa" | "67 %–103 %" (Kept across the layers) | Unit once, at the end | As a data sheet prints it (INTERFACE, Words). Low priority |
| Verdicts | none ("nothing judged") | PASS, FAIL, UNKNOWN, "reported, not required" | Keep | Different jobs; the page says the selector judges |
| "Typical" | "typically" in prose, column "Median", method heading "Typical values" | "a typical value, not a certificate" (data-sheet caveat) | Keep | INTERFACE allows "typically" in a sentence |

## Recommendations, ranked by benefit for effort

Every item is **S** (under an hour) unless marked otherwise. After each one, refresh the snapshot views (`npm run
snapshot`, `npm run ui:check -- --write`) and re-render the pages.

### 1. Put the drawer's record bookkeeping under "Record notes"
- **Place:** drawer Overview, *About this entry* fold (`app/js/ui/detail.js:1164–1165`).
- **Evidence:** PEI-CF's drawer reads "Identity read from X-ECOMAX-CarbonX-CF-Ultem-TDS-v3 (p. 1): name: ultem; filler:
  carbonfiber. No row in polymers.csv, so the estimate model does not identify it…". 72 of the 88 drawer materials
  with an identity note carry a source ID, migration ID, grade ID, a `.csv` name or "estimate model". The page shows
  none of this.
- **Change:** `<summary>About this entry</summary>` → `<summary>Record notes</summary>`. This is INTERFACE's fold for
  maintainers' notes, and `readerText` already leaves it out.
- **Benefit:** the engineer stops meeting file names and IDs, and the drawer obeys the Words rule as the page does.
- **Risk:** none known; `drawer-ids.mjs` reaches the same records.

### 2. Write dates one way: "13 Sep 2026"
- **Place:**
  - drawer Sources (`detail.js:240`, "read …")
  - drawer maker statements (`material-words.js:435`, "website checked …")
  - drawer Price lede (`format.js:436–441`, `priceSampleWords`)
  - page product cards (`app/pages/products/card.js:268`, "seen …")
- **Evidence:** PLA's drawer prints about 330 ISO dates. The page's Sources section prints "read 18 Sep 2026" and its
  Price section "between 10 Sep and 7 Oct 2026". The page's own price lines say "seen 2026-09-10".
- **Change:** run each through `dayWords` / `daysWords` (`app/pages/findings.js:84–86`); move them to a shared module
  if the drawer may not import from `app/pages`. "read 2026-09-13" → "read 13 Sep 2026".
- **Benefit:** the most frequent visible mismatch disappears.
- **Risk:** `test/prices.test.js` pins `meta.from` (data), not the words, so it is unaffected. Keep ISO in the page's
  citation line and in the decision brief and exports.

### 3. One name for the guide: "the Bambu Lab Filament Guide"
- **Place:**
  - `build/src/print-guide.js:16` (`guideName`, which yields "Bambu Lab's Filament Guide")
  - `app/pages/sections/sources.js:74`
  - `app/pages/charts/temperatures.js:190`
  - the products key
  - `app/pages/products/card.js:210`, already right
- **Evidence:** PLA's drawer has 347 × "Bambu Lab's Filament Guide" and 6 × "the Bambu Lab Filament Guide". PLA's
  Products page has 335 × "Bambu Lab Filament Guide" and 4 × the possessive form.
- **Change:** "from Bambu Lab's Filament Guide for PLA" → "from the Bambu Lab Filament Guide (PLA column)". "Windows
  read from Bambu Lab's Filament Guide" → "Windows read from the Bambu Lab Filament Guide".
- **Benefit:** the name INTERFACE fixes, said one way on both surfaces.
- **Risk:** the build output changes, so `build:diff` shows label paths. Check `guideName` callers for tests.

### 4. Past the limit is "beyond", and the limit "the H2C reaches"
- **Place:**
  - `app/js/ui/material-words.js:339` (drawer Printing foot)
  - `:362` and `detail.js:1129` (On the H2C sub-line)
  - `app/pages/charts/temperatures.js:90` (page figure)
- **Change:**
  - Drawer foot: "No product's setting is outside the H2C's limits (nozzle 350 °C, bed 120 °C and heated chamber 65
    °C)." → the page's own sentence, "No product's setting is beyond the H2C's limits: nozzle 350 °C, bed 120 °C,
    heated chamber 65 °C." Do the same for "Outside the H2C's limits (…)" → "Beyond the H2C's limits (…)".
  - Sub-line: "2 above or only partly within" → "2 beyond or only partly within".
  - Page figure: "H2C max 120 °C" → "the H2C reaches 120 °C" (it already says "reaches" when the limit is off the
    scale).
- **Benefit:** one word for the one gate the chip already calls *Beyond*.
- **Risk:** `test/print-spread.test.js:414–426` pins the drawer sentence, so change the test in the same commit.

### 5. One sentence under the key properties
- **Place:** drawer Overview (`detail.js:1112`); Products tab spread-table note (`detail.js:1000`).
- **Change:**
  - Overview: "Each figure is the median of the products that state the test's orientation or load." → "Each figure is
    the median of the products that publish it with a stated orientation or test load, and beside it the middle half
    of them." This is `findings.js:191`; better still, import it. Keep "Select a value to see where it comes from."
  - Products note: "…; the range is between products, not a product's test scatter." → "The range is the products'
    lowest to highest."
- **Benefit:** the same six numbers carry the same definition in both places. "Test scatter" is a coinage the page
  never uses.

### 6. The two document lists use one vocabulary
- **Place:**
  - page Sources (`app/pages/sections/sources.js:55, 62, 84`)
  - drawer Sources (`app/js/ui/material-words.js:97`)
- **Change:**
  - Page: "User-supplied reference, Plastics Engineering: pseudo-elastic design" → "Reference, Plastics Engineering:
    pseudo-elastic design", by calling `publisherName` (`material-facts.js:45`).
  - Drawer: "Gave: 1 environment statement" → "Gave: 1 statement on chemicals or use".
  - Better: one `gaveWords` that both surfaces call.
- **Benefit:** this removes the last INTERFACE coinage on the page and the table's name in the drawer.

### 7. Product cards: the page's labels
- **Place:** drawer Products tab (`detail.js:611`, `:1319`, `:1321–1322`).
- **Change:**
  - Print settings: "Chamber" → "Heated chamber".
  - Product details: "Manufacturer" → "Maker".
  - Variant line: "…so they are left out of the material's range" → "…so they are kept out of the material's median".
  - Move *Availability* into Record notes. Its values are notes of retrieval, for example "Official Fiberon TDS
    retrieved 2026-09-13; product page returned HTTP 403", and the page does not show them.
- **Benefit:** the drawer stops disagreeing with its own Overview, and with the page, on every card.

### 8. The price sample in the page's words
- **Place:** `priceSampleWords` (`app/js/ui/format.js:436`); drawer Price note (`detail.js:1358`).
- **Change:** "9 Canadian retailers and 7 foreign sellers, sampled 2026-09-10 to 2026-10-07, not live." → "Regular
  prices from 9 Canadian shops and 7 foreign shops, sampled 10 Sep–7 Oct 2026, not live; shipping and tax are not
  included." Add the last clause, which the page states and the drawer omits. Rename the column "Retailer" → "Shop".
- **Benefit:** one sentence for one sample. The drawer gains the "shipping and tax" caveat, which a buyer needs.
- **Risk:** `test/prices.test.js:83`'s title says "retailers", but it asserts counts only.

### 9. Medians at one precision inside the drawer
- **Place:** drawer Products tab, *Across its products* table (`detail.js:996`, `fmtNumber`).
- **Evidence:** "Glass transition (Tg) 58.9" and "Price 33.7", while the Overview two tabs away and the page say "59 °C"
  and "34 CAD/kg".
- **Change:** print the median with the display precision the Overview already uses ("at the page's display precision",
  `detail.js:1069`; `display-numbers.js`).
- **Benefit:** no engineer wonders which of two medians is right.

### 10. Say the environment caveat once, from `method.csv`
- **Place:** drawer Environment lede (`detail.js:93`); page Chemicals (`app/pages/sections/uses.js:119`).
- **Evidence:** drawer: "Makers rarely give the concentration, temperature or duration: treat them as indications, not
  design data." Page: "Makers rarely give the concentration, temperature or duration, so these are indications, not
  design data."
- **Change:** one sentence, in a `method.csv` row read by both, as the "Transferable allowables" foot already is. Keep
  the drawer's wording: it is the review's kept W6.
- **Effort:** S–M, because the `method.csv` row goes in through a migration.

### 11. Thousands separators in requirement text
- **Place:** `describeConstraint` (`app/js/ui/labels.js:190, 200`); the drawer's "Published …" value; template card text.
- **Evidence:**
  - Drawer: "Density at most 1500 kg/m³", "Published 1310 kg/m³ (ISO 1183)", then "Also: Density 1,310 kg/m³".
  - Template card: "density at most 1500 kg/m³" beside table cells of "1,050".
  - The page: "1,240 kg/m³".
- **Change:** `n(c.value)` → grouped thousands, the same rule as `fmtNumber`. "1500 kg/m³" → "1,500 kg/m³".
- **Risk: M.** `ui:fuzz` and saved scenarios read pill text, so run the 300 rendered scenarios. A rail input keeps
  "1250", which is right there.

### 12. The page footer's draft line: one sentence
- **Place:** page footer (`app/pages/sections/footer.js:29, 54`).
- **Change:** "The summary above was drafted with AI assistance (Claude) on 2026-10-17 and has not yet been reviewed.
  Drafted by Claude Opus (agent)." → "The summary above was drafted by Claude Opus (agent) on 17 Oct 2026 and has not
  yet been reviewed."
- **Benefit:** the footer the owner asked about says who and when once, in the page's date form.

### Also small, and listed for whoever does the above

- **Counts in On the H2C.** "1 product; beyond the H2C's 65 °C" sits beside "one product; one gives at least 150 °C".
  Use `countWords` at `print-brief.js:29`, which serves both surfaces.
- **Method page.** "the special effect grades, support materials, anti-static grades" → "special-effect,
  support and anti-static materials" (INTERFACE: no "grade"). "key figure(s)" → "key property(ies)" at
  `method-page.js:32, 36`.
- **Drawer Sources, known gaps.** "Compression strength, Coefficient of thermal expansion, Thermal conductivity…": use
  lower case inside the sentence.
