# The material pages' words, reimagined (content expert)

> **Current** (2026-10-17). The content expert's proposal for the pages-reimagined round (BRIEF.md beside it). Full page
> texts: [PLA.md](PLA.md) (195 products), [PCTG-GF.md](PCTG-GF.md) (3, the thinnest), [HUB.md](HUB.md). Screens of the
> current pages: `shots/`.

## The vision on one screen

A material page should read like a handbook entry by a colleague who has read every data sheet: **what it is and
whether it suits the H2C; the numbers you design from and how much products vary; how to print it and what goes wrong;
which products stand out and why; what makers sell it for and warn about; what it costs; and, said once, how far to
trust it.** Everything about how the page was built leaves the page.

Five changes carry that:

1. **One evidence line, then no hedges.** Under the first screen's figures, one generated sentence says how well
   documented the material is (well, partly, thinly) and why, and defines *typical* once. After it no sentence repeats
   a caveat; each number carries its product count beside it, as data.
2. **Bookkeeping leaves the page.** What was drawn, left out, read from where ("Of the 814 results on file… 460 are
   drawn") goes to the records page, whose finder already counts it. The physics explanations repeated on all 76 pages
   ("How XY and Z differ…") move to one shared page, *How the numbers are worked out*. A figure's fold keeps one line of
   what this material leaves out, its data table and that link.
3. **Each fact has one home.** The first screen gives the number, a section's opening interprets it, a figure's title
   states the finding the opening does not. PLA's 55 °C HDT is printed today in the first screen, the summary, two
   tables, a fold, the Heat sentence and a figure title.
4. **The engineer's sections.** Mechanical properties, Thermal properties, Printing on the H2C, Products; Uses,
   limitations and chemicals; Price; Other properties; Estimated values; Sources. "Strength and stiffness" and "Heat" are
   the renaming the owner refused for the selector (2026-10-04); the drawer's tab names are right. Maker statements are
   split by purpose: printing notes to Printing, uses and warnings to *Uses, limitations and chemicals*.
5. **Thin pages are designed, not degraded.** Under four ranked products a figure becomes a small table of what each
   product publishes; under six products the products are cards and the print settings a column per product; up to
   twelve maker statements are all shown. A three-product page reads short and complete, not as a full page with holes.

## What the reader trips on now

From `pages:text` of M001, M073, M110 and the screens in `shots/`.

| Cause | Exact quotes |
|---|---|
| Bookkeeping | "most of the 169 counted products (of 195) accept"; "Of the 814 results on file for these tests, 460 are drawn. The other 354: 122 more of products already drawn, 69 measured on film…"; "Key values 15/16"; "(1 of 297 profiles)". |
| The page narrating itself | "n counts the products compared, special formulations left out: on the XY rows, those whose sheet states the bar's orientation (XY); on the others, every product drawn."; "Not drawn as a panel: Nozzle: all 3 counted windows are the same, said above…"; the byline "Its numbers are filled from the data, and it decides nothing." |
| Repeated caveats | PCTG-GF says "not compared" 20 times, "A gap, not a zero or a low value" 4 times, its foreign-price sentence 3 times; PLA says "'Sold as toughened' is the maker's statement, not a test result" 3 times and again in the key. |
| Placeholder-looking text | Summary numbers drawn as highlighted chips ("sold as **[195]** products"); "none 508 h" (none · 50 °C, 8 h); "Dryingtypically 50 °C for 6 h"; "Price per kilogram1 shown, 1 compared"; "6Izod Izod" and a sample "48" in the key; "2026 - 09 - 10". |
| Project words | "special formulations", "counted products", "comparable basis", "key properties", "drawn but not counted", "1 their nozzle, 1 bed and 1 drying", "the material in general, maker's product page or guide" (for Prusa's Knowledge Base). |
| Lists of what is missing | The same seven-item "Not published by any product: Compression strength, Coefficient of thermal expansion…" on PLA and PCTG-GF; "Key properties no product publishes: Flexural modulus (XY)…"; "No maker states AMS compatibility." |
| Misleading or misplaced | "PCTG-GF's typical density and price are in the top quarter" (top reads as merit); PCTG-GF set against PLA and PETG, not PCTG, its own base; PLA's annealing advice under *Chemicals and environment*; "3 further review notes are on the records page". |

## The narrative arc

| # | Section | The reader's question |
|---|---|---|
| — | First screen | What is it, does it suit the H2C, what are its numbers, how sure are they? |
| 1 | Among the materials | Where does it sit against what I know? |
| 2 | Mechanical properties | How strong and stiff is a printed part, flat and across the layers, and how tough? |
| 3 | Thermal properties | At what temperature does it soften under load? |
| 4 | Printing on the H2C | What do I set, what do I need, what goes wrong? |
| 5 | Products | Which products stand out, and for what? |
| 6 | Uses, limitations and chemicals | What is it sold for, what do makers warn about, how does it take chemicals and sun? |
| 7 | Price | What does it cost, and how much do products differ? |
| 8 | Other properties, as published | What else do the sheets give? |
| 9 | Estimated values | Only where a key figure is missing or cannot be ranked. |
| 10 | Sources | Where does every number come from? |
| — | Colophon | Release, dates, who wrote the summary, how to cite. |

A section with nothing to say leaves the page and the contents silently. Absence is said once, where the reader would
look for the thing (a tile, a table cell, the one sentence of a subsection), never as a list elsewhere.

## Section by section

Each rule names what feeds it; "new" is a function the facts layer can compute from compiled fields but does not have;
"wish" is what the data cannot feed.

### First screen

In order: name and full name; identity line; Bambu Lab's standing; the summary; eight tiles; the evidence line; the
neighbours; the way to the selector.

- **Identity line**: `identityLine(identity(m, c))`, filler first: "Glass-fibre-filled PCTG copolyester · 3 products from
  3 makers". The family becomes the breadcrumb. The Polymer / Filler / Family / Status / Products row goes, and with it
  "Unfilled (18 special formulations carry a filler)".
- **Standing**: the status chip and `H2C_STATUS[...].lede`, as now.
- **Tiles** (six key figures, nozzle, bed); one line under each value:
  4+ products "71 products · middle half 40–53" (`summary[key].n, q1, q3`); 2–3 "3 products · 76–78"; 1 "one product";
  published but not rankable, value in grey, "as published · orientation not stated" (`summary[key].asPublished`);
  only a near value, "not published · unnotched values only" (`nearestLacks`); else "not published". Nozzle and bed:
  "most products that give one", "all 3 products", "one product; two give at least 50 °C" (`printWindows`, `ends`).
- **Evidence line** (new `evidenceTier(m, c)`: the six tiles' `n` and `asPublished`, `summary[key].twins`,
  `documents(c)`):
  - *Well documented* (every tile 5+ products): "Well documented: {documents} documents from {publishers} publishers,
    {datasheets} of them data sheets. Each figure is the median of the products that publish it with a stated
    orientation or test load, and beside it the middle half of them. Products with an added filler or additive are
    shown but kept out of the medians."
  - *Partly documented* (a tile under 5 or missing): "Partly documented: {the weakest tiles and their n}." + the
    definition.
  - *Thinly documented* (3 products or fewer, or under two tiles ranked): "Thinly documented: {n} products, with values
    from {k} data sheets{: …, which … shares}. {The one reason values cannot be ranked.} Read each figure as one or two
    sheets' word."
- **Neighbours** (replaces "Against PLA… Against PETG…"): a sentence, then a table of medians with their n. Two
  neighbours (new `neighboursOf(m, db)`): a filled or variant material's unfilled base where it has a page (same
  `basePolymer`, unfilled `modifier`); the same filler on another polymer of its `polymers[].group`, most products first
  (PETG-GF for PCTG-GF); then the landmarks (`landmarkMaterials`, not itself). The sentence turns `compareMedians` into
  "stiffer", "stronger", "an HDT 15 °C lower", "notched Charpy 70 % lower"; for a filled material it says what the filler
  does to its base ("Glass fibre adds little to PCTG's heat resistance…", within 5 °C or 5 %). No ratio rests on one
  product; that cell shows the value and "(1)".
- **To the selector**: "Check {name}'s products against your requirements in the selector →".

### 1 Among the materials

Places the material; does not restate its numbers. Opening (rewritten `glanceFindings`): the top and bottom quarters as
"a high {property}" and "a low {property}", never "top quarter": "PCTG-GF has a high density and a high price among the
materials: both are in the top quarter of the 147 and 108 materials that publish them. Its HDT and glass transition sit
in the middle half." Cut: "Each typical value rests on…", "Only 4 of its 10 key properties have a typical value…".
**F1** answers where each median sits among every material's (`propertyProfile`). Title: "{name} among the materials:
high {…}, low {…}, mid-range otherwise". Caption: "Each row places {name}'s products (band: middle half; tick: median) on
the spread of every material's median. PLA, PETG and ABS are marked for reference." Rows with nothing to rank collapse to
one: "Not ranked: tensile values (orientation not stated). Not published: notched Charpy and Izod."

### 2 Mechanical properties

Opening, two sentences at most (rewritten `strengthFindings`): the flat tensile values with elongation, and the bending
values. Figures carry the rest, each drawn only where it ranks 4+ products:
**F2** where its products sit in strength and stiffness (`materialMap`); title "Most {name} products: {q1–q3} MPa at
{q1–q3} GPa, among {nearest named materials}". **F3** what a part loses across the layers (`comparisonsOf().shares`);
title "Across the layers (Z), {name} keeps {s} of its flat strength and {s} of its stiffness"; the caption names
products whose Z exceeds XY: "check those sheets". **F4** how tough, and which products are tougher; title "Notched
Charpy is typically {median}; the {k} products sold as toughened publish {min} to {max}" (`summary.charpyNotched.claimed`).
**Thin rule**: under 4 ranked products, one table, *What each sheet publishes*, product × tensile, modulus, elongation,
impact, with conditions (`productRows`, `conditionLine`). **Moves out**: "Other properties on file" (§8); "How XY and Z
differ", "How Charpy and Izod differ", "How flexural and tensile results relate" (the method page: they are
`drawer_comparisons.csv` rows, identical on every page).

### 3 Thermal properties

Opening (rewritten `heatFindings`): where it softens and why, when the polymer data says (`printsAmorphous`); then the
products well above the rest, named with their state (new `standOut(m, key)`: comparable values above q3 + 1.5 × IQR,
top three named, how many annealed from `grades[].headline[key].anneal`); Vicat and melting "as published" in a clause.
**F5** where it softens, under which load (`heatLadder`). Title: two loads within 3 °C on an amorphous polymer, "{name}
softens at its glass transition: HDT {x} at both loads, Tg {y}"; HDT at 0.45 MPa 20 °C or more above Tg, "{name} carries
light load above its glass transition"; else "Where {name} softens under load". The HDT-against-strength map goes
(content's view; the products table sorts for it; the dataviz expert decides). Thin rule: a table per product.

### 4 Printing on the H2C

Opening, one sentence from the gates and `printFacts().outside`: "PLA prints well inside every H2C limit, with no heated
chamber and a standard nozzle for all but six products." Any product beyond a limit is named here.
**Settings table**: rows Nozzle, Bed, Heated chamber, Drying, Nozzle type, AMS; columns *Most {name} products*
(`printWindows`, `dryingStats`, `printCounts`) and *Bambu Lab Filament Guide, {type}* (`guideFacts`, the guide's own
words, plates by name). Under six products, a column per product instead (`grades[].print`). A value read from a shared
sheet or the guide is grey, explained once under the table. The AMS cell quotes the sheet that states it, by product, or
reads "not stated".
**Hardened nozzle**: every product that needs one, by name, up to eight (`hard.needing`).
**After printing** (where a product publishes an annealing schedule, `grades[].print.anneal`, or a statement mentions
annealing or heat treatment): the schedules' span and the makers' annealing instructions.
**What makers say about printing it**: the print topics of `knowHow` (warping and shrinkage, moisture, nozzle wear,
layer adhesion, supports, odour, printing advice), most makers first, one quote each, three open and the rest behind
"More from makers". Choice by rule: a statement with a number, unit or instruction ("use", "dry", "scale", "recommend")
first, then a data sheet before a product page, then the maker with most products. *Telling a warning from praise is a
wish*: the statements carry no polarity.
**F7** (4+ products) what temperatures products agree on, against the H2C's limits; title "Most {name} products print at
{nozzle} on a {bed} bed, well inside the H2C's 350 °C and 120 °C" or "; {k} ask for more than the H2C gives".
**Cut**: "Where a sheet is silent: 173 products take at least one setting…", "Not drawn: …", "Medians of the lowest and
highest settings…", the limits table when nothing is outside.

### 5 Products

Opening: "{n} products from {makers} makers. Sorted by how much each publishes; select a column to sort, a product to see
its values, print settings and documents."
**Products that stand out** (6+ products; new `standOutProducts(c)`), a fact per line, never a verdict: most values
published; highest tensile strength XY and Z; keeps most across the layers (under 100 %); highest HDT at 0.45 MPa;
highest notched Charpy; lowest price. Each with its value and state (sold as toughened, annealed, shares a sheet);
modified products are not eligible. Then: "These are published values, not recommendations: the selector judges each
product against your requirements." Under six products: cards, open, no search or toggles.

### 6 Uses, limitations and chemicals

**What it is sold for**: up to three quotes from *Good for* and *Benefits*, and `m.bestUses`. Every quote is attributed
by product, or general guidance by publisher and title ("Prusa Knowledge Base, PLA").
**What makers warn about**: *Pitfalls and limitations* and stated limitations, up to five. **Finish and accuracy**
(surface, precision) closed.
**Chemicals and environment**: a row per category, *What makers say* and *Statements*. The verdict two thirds of its
makers agree on (`environmentFindings`' rule); else the one two thirds of its statements give ("mostly not resistant (25
of 35 statements)"); else "mixed". One closing line: "Makers rarely give concentration, temperature or duration." Resin
reference data in its own small table, as now. With nothing on file, one sentence ("No maker of these products publishes
resistance to a named chemical or to sunlight.").
Moves here: application notes, limitations, safety, disposal. Moves out: specimen preparation (records page),
post-processing (§4).

### 7 Price

Opening: "{name} typically costs {median} CAD/kg, the middle half {q1–q3}, across the {n} products with a regular price
in the sample; the lowest is {product} at {min}." With one price: the product, its shop and, for a foreign listing,
"converted at the Bank of Canada rate of {date}"; a Canadian listing not used is named, so the reader knows the product
is sold here (`priceRows().unused`). The sampling sentence once, last: "Regular prices, never sale prices, sampled from 9
Canadian and 7 foreign shops between 10 Sep and 7 Oct 2026; shipping and tax are not included."
**F8** (4+ priced) what it costs; title "Most {name} costs {q1–q3} CAD/kg". **F9** whether paying more buys strength;
title by the rank correlation of the products drawn (a display statistic): |ρ| under 0.3 "No clear link between price
and tensile strength across {n} {name} products" (PLA: ρ = −0.04 over 21), else "Dearer {name} products tend to be
{stronger | weaker}".

### 8 Other properties, as published

One table for every property outside the key figures, mechanical, thermal and physical together: Property · Products ·
Lowest–highest. One line: "Each value under its own sheet's test conditions, so they are listed, not ranked." Replaces
three "Other properties on file" tables and the Physical section. "Named on a data sheet without a value" goes to the
records page.

### 9 Estimated values

Only where a tile is "not published" or "as published". Once: "No product publishes a {property} that can be ranked, so
the selector estimates it from the products' related values and similar materials. An estimate is a range, never a
product's value, and nothing above rests on it." A table: Likely · Plausible · Precision · Beside what is published.
"Likely" and "plausible" (80 % and 95 %) defined in a fold.

### 10 Sources and the colophon

"{documents} documents from {publishers} publishers ({kinds}), read {first}–{last}. Every value links to its document
and page on the records page." The publisher table, as now. Known gaps: only the material's own gap findings
(`gapSplit(c.cov).gaps`) that no section already says, in sentences. Cut: the four count tiles, the seven unpublished
properties, the count of review notes.
Colophon: the allowables sentence, as now; "Summary drafted by {by}, {date}; {status}." · "Data: release {id}, documents
read {range}." · "Cite as: {name}. Filament Atlas, release {id}." Dates as 10 Sep 2026.

## The written summary

**Its job**: the lede a colleague gives in twenty seconds. The first screen carries the numbers and the evidence line the
caveats, so the summary carries meaning. New rules (replacing AGENTS.md's checklist):

- 40 to 75 words, three or four sentences, no semicolons.
- First, what it is in engineering terms and what makers sell it for, attributed. Then its defining behaviour in
  service, with at most two placeholders. Last, the one H2C need that decides how it prints (hardened nozzle, drying,
  chamber heat, a plate), or the main limitation its makers state.
- Never: counts of products, makers or values (`{products}`, `{makers}`, `{values}`, `{profiles}` refused, new
  SUMMARY-COUNT); what is not published or not compared; how a count was based ("many by the Bambu Lab Filament Guide");
  quantifiers about the data rather than the material ("a few of them filled", "Of the makers that speak to…");
  comparisons with other materials (the neighbours do that); superlatives and verdicts, as now.
- **Placeholders read as words**: a filled value prints as plain text, no chip or highlight; `in-short.js` keeps its
  `data-field` for P12, and `pages:text --proof` may mark them. New fields from the same compiled facts (`written.js`):
  `{nozzle.window}`, `{bed.window}`, `{drying.schedule}`, `{zshare.tensileStrength}`.
- Beside it only a tag, "Draft summary, not yet reviewed" or "Reviewed"; the byline moves to the colophon.

Examples, as written in the table, are in PLA.md and PCTG-GF.md.

## The hub's words

[HUB.md](HUB.md): title "Materials"; a lede on what a page gives and where the selector fits; per family, a table whose
columns answer "which page do I want?" (Products, HDT at 0.45 MPa, tensile strength XY, price, Bambu Lab standing, from
`m.summary`), rows by products; ¹ marks a one-product value. Materials without a page share one line ("No page yet:
PLA-ESD (2 products), …"); the page rule is said once at the foot. "Names that are not materials" becomes "Also sold as".
"Measured values" goes.

## Products explorer and records page

**Table.** Toggles "Publishes Z values (42)", "Has its own data sheet (178)", "Priced in Canada (28)"; search "Find a
product or maker"; "Show all 195 products"; empty "No product matches "{q}". Clear the search". Columns, cells and the
key, each mark said once, as in [PLA.md](PLA.md) §5: "Values published" ("15 of 16") replaces "Key values"; drying reads
"50 °C · 8 h"; "modified" replaces "special formulation". Under the table, once: "Values are for the colour each sheet
tested; pigment can change them."
**Card**: name, maker, documents; *Published values* with conditions; *Print settings*, each with its origin ("own data
sheet", "{product}'s data sheet, shared", "Bambu Lab Filament Guide"); *Maker's statements*; *Price* or "Not in the price
sample"; "All records for this product →" (`#product=`).
**Records page.** Title "{name}: every record". Lede: "The {n} records behind the {name} page, as recorded: each value
with its conditions and the document page it was read from. The ID names the record in the data tables." Types with
none are hidden; "Print profiles" becomes "Print settings", "Known gaps and review notes" becomes "Known gaps" (review
notes closed, "Notes for the data's maintainers"). Finder: "Search the records", "All products", "All documents", "Clear
filters", "Showing 8 of 67". Empty: "No record matches these filters. Clear a filter, or search a product, property or
document." Column *On the page*: "In the median" · "Shown, not in the median: {why}" · "Not shown: {why}" · "Shown as
published (the only value of its test)". Group head: "HDT at 1.8 MPa · 2 values from 3 products (one sheet shared) · on
the page: 68 °C" (today "median 66 °C … main page: 68 °C over 3 compared products"). Document cell: "Fiberlogy data
sheet, p. 1" and the sheet's row label in quotes.

## Voice rules

| Rule | Before | After |
|---|---|---|
| The fact, not the bookkeeping | "most of the 169 counted products (of 195) accept" | "most products that give one" |
| Say why, not "not compared" | "Not compared: 3 products give 55 MPa, with no stated orientation. See the estimate." | "55 MPa · as published · orientation not stated" |
| A caveat once per page | "(one product)" after each comparison | the evidence line; n beside each value |
| Direction, not rank | "density and price are in the top quarter" | "a high density and a high price among the materials" |
| Absence in cells | "Not published by any product: Compression strength, …" | "not published" in the cell, nothing more |
| No page narration | "The dashed line is half of them." | in the figure's key, if anywhere |
| Engineering names | "Strength and stiffness", "Heat" | "Mechanical properties", "Thermal properties" |
| Findings as titles | "HDT 55 °C at 0.45 MPa and 55 °C at 1.8 MPa; Tg 58.9 °C" | "PLA softens at its glass transition: HDT 55 °C at both loads, Tg 58.9 °C" |
| Values as a sheet prints them | "none 508 h" | "none · 50 °C, 8 h" |
| Name the source | "the material in general, maker's product page or guide" | "Prusa Knowledge Base, PLA" |
| Project words out | "special formulations" | "products with an added filler or additive" (key: "modified") |

## Implementation sketch

- **`app/pages/findings.js`** (page-only words, so the drawer is untouched): rewrite `glanceFindings`, `strengthFindings`,
  `heatFindings`, `printFindings`, `priceFindings`, `environmentFindings`' statement fallback; drop "counted" and "(of N)"
  from `acceptSubject`; add `evidenceTier`, `neighboursOf`, `standOut`, `standOutProducts` and one `figureTitle(kind, …)`.
- **`app/js/ui/material-words.js`** (shared with the drawer): change only what both should say alike (the drying cell
  words; "Products shows which" in `hardenedFactWords`). Each change re-baselines the drawer's golden renders.
- **`app/pages/sections/`**: `masthead.js` takes the identity line, tiles, evidence line, neighbours and the summary
  (`in-short.js` folds into it: plain filled values, a tag). `key-figures.js` §1. `mechanical.js`, `thermal.js`: the
  thin-table rule, no "Other properties". `physical.js` becomes §8 for all three domains. `printing.js`: settings table,
  guide column, after printing, makers' print notes. `makers-say.js` and `environment.js` merge into §6. `products.js`:
  stand-outs, labels, key, cards under six. `estimates.js`: the table. `sources.js`: no tiles, no review-note count.
  `footer.js`: colophon. `index.js`: the order above. Each fold: one line, the data table, the method link.
- **New `app/pages/method-page.js`**: *How the numbers are worked out*, from `drawer_comparisons.csv`'s explanations and
  `method.csv`'s Comparison rows, written once by stage 8.
- **`app/pages/records/*.js`**: labels, badges, group heads, empty state; `review-notes.js` closed.
- **`app/pages/index-page.js`**: HUB.md.
- **`build/src/written.js`**: SUMMARY-COUNT; the four new fields. **`material_summaries.csv`**: the 76 rewritten to the
  new rules as drafts for the owner. **AGENTS.md**, "Write or revise a material's summary": the new checklist.
- **Checks**: `pages:check` gains rules that no page contains a retired phrase ("counted products", "(of ", "not
  compared", "special formulation", "drawn but not counted", "Key values"), that each tile's line follows its rule, and
  that every number in a figure title equals its compiled value. A blind engineer's read of PLA, PPS-CF and PCTG-GF,
  scored against the owner's bar ("I have all I need to know"), closes the round.

## Constraints worth revisiting

- **The page rule counts products, not independent sheets.** PCTG-GF's three products rest on two sheets with values;
  FormFutura's reads Spectrum's. Counting distinct sheets with values would be the honest threshold; the owner decides
  whether PCTG-GF then waits for a third.
- **The summary's byline.** The owner chose "author and status shown". A tag beside the summary and the byline in the
  colophon keep that decision and take the meta-narration out of the lede.
- **For the executor, a data note**: Spectrum PCTG GF10 is listed at 3D Printing Canada (CA0156: 115.99 CAD for 1 kg,
  out of stock), recorded with no regular price per kilogram, so PCTG-GF is priced from one US listing alone.
