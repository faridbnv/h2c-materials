# The material pages, reimagined: the plan

> **Current** (2026-10-17), the executor's plan for the pages-reimagined round, from the three experts' proposals
> ([UX](ux/PROPOSAL.md), [content](content/PROPOSAL.md), [data visualisation](dataviz/PROPOSAL.md)) and the
> [brief](BRIEF.md). Where they conflict, the decision below is final; it is judged against `docs/GOALS.md` (a workbench
> that turns requirements into a defensible shortlist, then products; every number traceable; screening-grade evidence).

## In short

Each material gets **two pages**: an **Overview** that explains it across its products, and a **Products** page to
choose a product, where every value opens to its document, page and test conditions. The records page and its
seven-way finder go. The **hub** becomes a plain index of every material. One **top bar** carries the way around
(Filament Atlas › Materials › PLA › the section in view) and a **Back to your results** button that returns to the
selector exactly as the reader left it. The page says each thing once: the numbers and how far to trust them on the
first screen, then one section per engineering question, each with a finding for a title. **Five kinds of figure in one
visual language** replace nine dull ones, and the first compares the material with the five materials an engineer would
weigh it against, linked to their pages. Everything still comes from the one compiled database through the facts layer
the selector's drawer uses, and decides nothing.

## The owner's critique, and what answers it

| The owner said | What answers it |
|---|---|
| Texts not coherent from beginning to end; placeholders that make a reader say "What???" | One reading arc, each fact said once; bookkeeping ("169 counted products (of 195)", "Of the 814 results… 460 are drawn") off the page; one evidence line instead of caveats in every sentence; the method's explanations on one shared page; summaries rewritten without counts, filled numbers printed as plain words |
| Not "I have all I need to know, in an amazing way" | A first screen that answers the engineer's questions (six numbers with their spread, how well documented, the summary, how to print it on the H2C); figures with findings for titles; products that stand out, named |
| Links between pages terrible; top and bottom navigation badly designed; back to selector there for its own sake | One bar: breadcrumb and a list of sections, nothing else; tabs Overview / Products; a return that restores the reader's results; the alternatives in the first figure are the links between materials; the footer holds the disclaimer, the return and the citation |
| Plots dull, not helpful | Five figures, each answering one question better than a table; fixed frames learnt once; one data colour for this material, grey for everything else; thin data drawn honestly |
| The hub: a confusing AI-generated wiki index, too many links and buttons | An atlas index: families, `name ······ products`, one search |
| The products page: buggy, over-extensive filters, ghosting, strange combinations, bad graphics | A search and one sort; values not compared and products that publish nothing set apart in labelled groups; no toggles, paging, column picker or shading; a row is a native disclosure |

## Decisions where the experts differ

| Question | Decision | Why |
|---|---|---|
| Pages per material | **Overview + Products** (UX); the records page becomes a redirect stub | The owner's worst page was the products/records pair; one place to choose and trace. Constraint 6 holds: every record sits in its product's card or in Sources |
| Product controls | **Search + one sort**, labelled groups (UX); content's toggles, "Show all" and finder go | The owner named the filters; a sort answers what the toggles asked, and two controls cannot contradict |
| The hub | **Index only** (UX); no value columns | The hub finds a page; the selector compares materials by value |
| Compared with what | **One rule, five alternatives** (dataviz `peerSet`, the unfilled base or other fibre state first, as content asked), drawn in the first figure of *Among the materials*; the first screen's sentence names the first two. PETG and ABS on every page go | An engineer compares with what they would buy instead; one rule, one list, used by words and figure alike |
| First screen | UX's layout: name, identity sentence, tabs; a plate of six key figures in the first figure's column order, each with its products' spread drawn small (no peer ticks: comparing is the figure's job) and the **evidence line** (content) as the plate's footer; the summary beside an *On the H2C* plate | Each fact has one home: the plate gives the numbers and their spread, the figure compares |
| Section names and order | Content's names (Mechanical properties, Thermal properties, Printing on the H2C, …), no numbers on screen (UX) | The owner's 2026-10-04 ruling: engineering terms, not renamed |
| Products' spread (dataviz figure 3) | **Split by section**: each section draws its own properties' product strips | Each section then answers its question at both levels; hovering a product still lights it across the page |
| Temperatures (dataviz figure 5) | Opens *Printing on the H2C*; *Thermal properties* keeps its sentences and strips | The figure's insight (Tg against the chamber, the nozzle window against 350 °C) belongs where the reader sets the printer |
| Folds | One per figure, *The figure as a table*: the table twin, one line on what this material leaves out, the method link. The repeated explanations move to one shared page, *How the numbers are worked out* (content) | Nothing repeated on 76 pages |
| Thin data | Content's layout rules (under four ranked products a small table; under six products the cards open) with dataviz's mark rules (band from four, hairline and tick at two or three, a tick at one, hollow as published) | A three-product page reads short and complete |
| Summary | Content's rules: 40 to 75 words, no counts (new SUMMARY-COUNT), placeholders print as plain words, byline in the colophon with a *Draft* tag beside the summary; the 76 rewritten as drafts | The owner's "from the summary to the very end" |
| Colour | `--claim` becomes the validated orange in the shared tokens (selector and pages); `--dv-*` data tokens on the pages; no `--ink-3` text under 18 px on a page | The purple reads as the accent to a deuteranope; one tool, one meaning |
| Type | 16 px body, Inter and Newsreader as approved | The pages should feel like the selector |
| Numbers | Display precision on the Overview (whole °C, three significant figures); Products cards print values exactly as published | Readable where read, exact where traced |
| Sections merged | Makers say + Chemicals → *Uses, limitations and chemicals*; Physical + every "Other properties on file" → *Other properties, as published*; Price → *Density and price* (density is the weight half of the core decision) | Fewer, truer sections |
| Maintainers' review notes | Off the pages (the drawer and the tables keep them) | Not for the engineer |
| Selector link to the hub (D142: none) | Unchanged; an owner question below | It is the owner's decision |

## The pages

**Overview** (`materials/<id>.html`), top to bottom:

1. *Head*: name, full name, identity sentence (filler first, products and makers, Bambu Lab's standing), tabs
   *Overview | Products 195*.
2. *Key figures*: tensile modulus XY, tensile strength XY, strength Z, notched Charpy, HDT 0.45 MPa, price; each the
   median with "71 products · middle half 40–53" or its thin-data form, and a small spread drawing; the evidence line.
3. *Summary* and *On the H2C* (nozzle, bed, heated chamber, drying, hardened nozzle; "most products that give one").
4. *Among the materials*: a sentence against the first two alternatives; figure **Against its alternatives**; figure
   **Among all materials** (strength against modulus, HDT against price, fixed frames).
5. *Mechanical properties*: two sentences; the products' strips; figure **Across the layers**; the XY/Z table.
6. *Thermal properties*: where it softens and why; products well above the rest, named; strips for HDT and Tg.
7. *Printing on the H2C*: figure **Every temperature on one axis**; the settings table (most products, and the Bambu
   Lab Filament Guide); hardened nozzle; after printing; what makers say about printing it.
8. *Products*: who makes it, the products that stand out (a fact per line), the button *Compare the 195 products*.
9. *Uses, limitations and chemicals*; 10. *Density and price* (strips, sentences); 11. *Other properties, as
   published* (one table); 12. *Estimated values* (only where a key figure is missing or cannot be ranked);
   13. *Sources* (publishers, kinds, known gaps, every document in a fold); the colophon (allowables sentence, the
   return, release and dates, who wrote the summary, *Copy the citation*).

A section with nothing to say leaves the page silently. **Products** (`materials/<id>-products.html`): the head with
*Products* selected, one line, a sticky search and *Sort by*, the key of only the marks used, then the list (columns as
UX specifies; a row a native `<details>`; its card every value grouped by test with conditions, document and page
linked to the original, all measurements with whether the Overview uses each and why not, print settings with their
origin, price, statements, documents); reference and study specimens last; `#G…` and `#V…` open a card. **Hub**
(`materials/index.html`): title *Materials*, one sentence, a search, families in columns. **Method**
(`materials/method.html`): *How the numbers are worked out*, written once. **Stub** (`materials/<id>-records.html`):
redirects old links (`#product=G…` → Products `#G…`, documents → `#sources`, the rest → Products).

**Navigation.** One sticky bar: mark (to the selector) › *Materials* › *PLA* › the section in view (a disclosure list of
the sections, *Products*, *All materials*) and, on the right, *Back to your results* and the theme. The drawer's *Full
page* opens the page in the same tab with `?from=<selection>`; the page keeps it per tab (sessionStorage), cleans the
address, and every return link rebuilds the selector's address with the material of the page in view. Arrived any other
way, the button reads *Open in the selector*. The selector keeps chosen products' notes per tab so the trip loses
nothing.

## One source of data

`dist/db.json` → `materialContext` and its siblings (shared with the drawer) → the sections, figures and cards. What
the pages add is display statistics computed at render time from compiled fields, deciding nothing: the alternatives,
map frames, layer shares and dot scales in `app/js/ui/material-stats.js` and `scales.js`; the evidence tier and the
stand-outs in a new `app/js/ui/material-highlights.js`. Page-only words live in `app/pages/findings.js`; a shared word
in `material-words.js` changes only where the drawer should say the same, and the drawer's golden renders are recorded
again on purpose. Summary numbers stay placeholders filled by `build/src/written.js`. `build/snapshot/pages.csv` gains
the alternatives, so the rule's picks show in every diff. A data change reaches the selector and the pages in the same
build; nothing is typed into a page.

## Who builds what (file ownership; nobody edits another track's files)

| Track | Owner | Files |
|---|---|---|
| A Frame, Products, hub | UX expert | `app/pages/shell.js`, `render.js`, `html.js`, `read-assets.js`, `budget.js`, `index-page.js`, `sections/masthead.js` (head, key-figure plate, summary block, *On the H2C*), `sections/products.js` (hand-off), `sections/footer.js`, `sections/in-short.js` (folded into the masthead), new `app/pages/products/`, `records/*`, new `stub.js`, `assets/page.js`, new `assets/frame.src.css`, `assets/products.src.{css,js}` (replacing `tables.src.*`; `pages.src.css` retired at integration) |
| B Words and sections | Content expert | `app/pages/findings.js`, `sections/index.js` (order), `sections/common.js`, every other section file (mechanical, thermal, printing, new uses, price, new other, estimates, sources; makers-say, environment, physical, key-figures, maps retired), new `app/pages/method-page.js`, new `app/js/ui/material-highlights.js`, `material-words.js` (shared changes only), `build/src/written.js` and the SUMMARY-COUNT lint, new `assets/sections.src.css`, the summaries' rules and drafts |
| C Figures | Data-visualisation expert | `app/js/ui/material-stats.js`, `scales.js`, `app/pages/figures.js`, `numbers.js`, `charts/*`, new `assets/figures.src.css` |
| D Selector side, checks, docs, integration | Executor | `app/js/ui/detail.js`, `app/js/main.js`, `app/css/tokens.css`, `test/pages.check.js`, `scripts/ui-probe.mjs`, `build/snapshot` and its script, `docs/*`, the decision, merges, verify |

**Contracts**, so the tracks build in parallel:

- `documentShell({ kind, title, description, stamps, material, crumbs, sections, tabs, returnHref, body, products })`
  (A); `kind` is overview, products, hub, method or stub.
- A section is `{ id, title, render(c, env) → { html, empty, stats } }`, listed in `sections/index.js` (B); the
  masthead, the products hand-off and the footer are A's modules in that list.
- Figures (C), each `(c, env, opts) → { html, empty, stats: { figures, dots } }`: `peersFigure`, `mapsFigure`,
  `stripsFigure(c, env, keys, { id })`, `layersFigure`, `temperaturesFigure`; `miniSpread(c, key)` returns the plate's
  small SVG; `peerSet(db, m, ix, { max: 5 })` returns the alternatives (landed first: B's sentence and A's nothing else
  read it). Figure titles and captions follow content's patterns; B reviews their words at integration.
- Every product mark carries `data-grade`, every material mark `data-mat`; `page.js` (A) lights both across the page and
  shows the tooltip; a product mark links to `<id>-products.html#<gradeId>`.
- A figure is `<figure class="fig" id="fig-…">` with a title, the question, a key of only the marks drawn, the plot, one
  how-to-read line and `<details class="fig-data">` (C's `charts/figure.js`).
- Stylesheets are concatenated by `buildAssets`: tokens, faces, frame (A), sections (B), figures (C), products (A).
- `fmtDisplay(v, unit)` in `app/pages/numbers.js` (C) for every displayed value on the Overview and in the table.

Each track renders its own copy while it works: `npm run pages -- M001 M020 M073 M110 --out <own folder>` (and `--all`
before handing back), then screenshots it with the brief's helper. Nobody commits; the executor commits at each
milestone.

## Order of work

1. **Build** (tracks A, B, C in parallel; D: the selector's return, the `--claim` token).
2. **Integrate** (D): render all 76 pages, fix the seams, retire `pages.src.css`, `tables.src.*` and the dead
   section and chart modules; rewrite `pages:check` to the new structure (every number against the facts, every record
   in exactly one card or section, the return links, the hub lists all 152 and links the 76, no retired phrase, no
   number in a title the facts do not hold, budgets) and the interface probe's page views (Overview and Products of
   PLA, PETG, PPS-CF and PCTG-GF, the hub, the method page, a return trip); record the drawer's golden renders again
   for the link.
3. **Summaries** (B): the rules and SUMMARY-COUNT in, then Sonnet drafters write the 76 from the new page text, B judges
   a sample of 20, applied with `pages:add-summaries --revise`, all as drafts for the owner.
4. **Review**: a fresh Opus reviewer who has seen no version reads the rendered pages as an engineer (PLA, PETG, PPS-CF,
   PCTG-GF, their Products pages, the hub; laptop and phone; light and dark) and scores them against the owner's bar
   and each line of the critique above; target 85 of 100. One fix pass by the owning tracks.
5. **Close** (D): INTERFACE "The material pages", D145, ARCHITECTURE, AGENTS' summary recipe, GOALS-LOG, OPEN-PROBLEMS
   §37; `npm run snapshot`, `ui:check -- --write`, `verify` green and `verify:fast` within 90 s; commit on this branch
   and ask the owner before a pull request.

## Questions for the owner (not blocking)

1. **A link from the selector to the hub.** Recommended: one quiet *All material pages* link at the foot of the
   selector's material search; it reverses part of D142. Until answered, the hub is reached from any page's bar.
2. **The page rule counts products, not independent sheets** (PCTG-GF's three products rest on two sheets).
   Recommended: keep it now, and revisit when the data next grows by a third.
3. **The alternatives rule's picks** (PLA: PLA-CF, PLA-GF, PETG, PLA blend, ABS) are listed in `pages.csv` for a read.
