# The material pages, reimagined: structure, navigation and the visual system

> **Working proposal** (2026-10-17), the UI/UX expert's part of the pages-reimagined round ([BRIEF](../BRIEF.md)).
> Mockups from `dist/db.json` (real numbers; dashed boxes are the other experts' slots): [material-PLA.html](mockups/material-PLA.html),
> [products-PLA.html](mockups/products-PLA.html) (`?sort=hdt045`: sorted), [hub.html](mockups/hub.html); add `?theme=dark`,
> `?menu=open` or `?from=none` (a reader who did not come from the selector). Screenshots beside them at 1280 and
> 390 px, light and dark. Today's pages: `shots/now-*`; bugs I hit: `shots/bug-*`. Generator: `mockups/build-mockups.mjs`.

## In one screen

**Two pages per material, one index, the selector's frame.**

- **The Overview reads; the Products page chooses.** A material's *Overview* explains it across its products; its
  *Products* page lists every product, sortable, each opening to everything on file about it with every value's
  conditions, document and page. The records page and its seven-way finder go: every record lives in its product's
  card, so every value still traces (constraint 6).
- **The first screen does most of the work**: the name, one identity sentence, a plate of six key numbers each with
  its product spread under it, the summary, and beside it an *On the H2C* plate (nozzle, bed, chamber, drying,
  hardened nozzle). Read alone, it says how strong, stiff, tough and hot the material is, how much products vary,
  what it costs and how to print it.
- **One way to move.** One top bar shaped like the selector's: mark › *Materials* › *PLA* › *the section in view*
  (press it for every section and the Products page), and on the right **Back to your results**, which reopens the
  selector exactly as the reader left it, the drawer on the material they are reading. No rail, no strip, no numbered
  sections, no link pile in the footer.
- **The hub is an atlas's index.** Every material by family on two screens, `name ······ products`, one search field.

**The three biggest changes**

1. **The return restores the reader's results.** Today the drawer opens the page in a new tab and the page's *Open in
   the selector* starts a fresh selection, so the reader ends with two selector tabs, the new one without their
   requirements. The drawer will open the page in the same tab carrying the selection, and the page will carry it
   back. (The selector boots from disk in 445–508 ms, measured: a same-tab return costs half a second.)
2. **The Products explorer has two controls whose states cannot contradict**: a search and one sort. Toggles, quarter
   shading, paging and the column picker go; a sort answers what they asked, with values not compared and products
   that publish nothing set apart in labelled groups instead of mixed in.
3. **The pages wear the selector's frame**: its bar, mark, buttons, segmented control and plates, 16 px body text
   instead of 17.5 px; Newsreader kept for names, section titles and the summary.

## What I saw

| Where | What happens | Shot |
|---|---|---|
| Products toggles | *Z values 42*, *Own data sheet 178*, *Canadian price 28* combine as AND, their counts never respond to each other, and the result ("16 of 195") cannot be explained from the screen | `bug-products-toggles` |
| Products sort | By HDT 0.45 MPa, values *not compared* (○ 108) rank above compared ones (90); a bound "> 95" sorts as 95 | `bug-products-sort2` |
| Products table | A quarter shade per column reads as grey bars across unrelated columns; a row opens through a checkbox hidden in its name, so a screen reader hears "checkbox" | `bug-products-card` |
| Records finder | *Print profiles* + *Orientation Z*: "Showing 0 of 4,271", a blank page, Orientation still enabled though it applies only to measurements | `bug-rec-combo` |
| Records finder | One test split into chips (*Tensile break strength 0* beside *… yield or break not stated 4*); a group median mixing XY and Z; "Show all 4" with all 4 shown | `bug-rec-prop` |
| Navigation | 11 numbered sections and *Every record* in a rail; PLA is about 20 screens at 1280 × 1000; on a phone the bar drops *Open in the selector* | `now-M001-*` |
| Hub | A 20-item rail repeating the headings, a status chip per row, the page rule repeated under every unpaged material; no link from the selector | `now-hub-*` |
| Contrast | `--ink-3` on `--bg` is 3.5:1, under AA for small text; today's stylesheets set text in it 45 times | |

## Information architecture

| Page | File | Job |
|---|---|---|
| **Materials** | `materials/index.html` | find a page |
| **Overview** | `materials/M001.html` | understand the material across its products |
| **Products** | `materials/M001-products.html` | choose a product; trace any value to its document and page |
| stub | `materials/M001-records.html` | old links: `#product=G…` → `M001-products.html#G…`, `#type=documents` → `M001.html#sources`, the rest → Products |

The Overview's sections follow the content expert's arc (Among the materials, Mechanical, Thermal, Printing on the H2C,
Products, Uses, limitations and chemicals, Price, Other properties, Estimated values, Sources); an empty one leaves the
page and the list. *Products* there is a hand-off plate, not a table: who makes it, the content expert's *products that
stand out*, and the page's one primary button, *Compare the 195 products*.

From the records page: each product's measurements, profiles, statements and listings go to its card; reference and
study specimens (`isProduct` false) to a last group on Products; statements about the material in general to *Uses*;
the full document list, the known gaps and (closed) the maintainers' notes to *Sources*. Links between materials are the
dataviz expert's Figure 1, whose five named alternatives link to their pages; nothing else links sideways.

## Navigation

```
[mark] Filament Atlas  ›  Materials  ›  PLA │ Mechanical properties ▾          [← Back to your results]  [◐]
```

- **Top bar** (sticky, 56 px; 52 on a phone). The mark leads to the selector, like the return button. *Materials* leads
  to the hub. The grey part after *PLA* is the section in view (`page.js` already tracks it for today's rail); pressing
  it opens a disclosure list (not an ARIA menu): the sections, then *Products 195*, then *All materials*. On a phone:
  mark, *PLA ▾*, *← Results*, theme; *Materials* moves into the list. The theme control becomes the selector's icon
  button, still following `h2c-theme`.
- **Tabs** under the name, *Overview | Products 195*: the selector's segmented control, the only page switch in the body.
- **Footer**: the disclaimer, *Back to your results*, *Products 195* (or *PLA overview*), release and dates, *Copy the
  citation*. Nothing else.

**Return to the selector.** From the drawer (this tab, or a tab opened from it), the button says *Back to your results*
and opens the selector with the whole selection (requirements, missing-data mode, estimates, lens, plot, shortlist,
chosen products, rank, baseline) and the drawer on **the material of the page in view**. Arrived any other way (a shared
link, the hub), it says *Open in the selector* and opens today's link: a fresh selection, this material's drawer open.

1. `app/js/ui/detail.js`: *Full page* becomes `materials/M001.html?from=<toHash(state.scenario)>`, without
   `target="_blank"` or ↗ (⌘-click still opens a tab, and the state travels).
2. `assets/page.js` on load: keep `from` in `sessionStorage` (`atlas-return`) and `replaceState` the URL without it, so
   a link copied from a page never carries someone's selection. Where storage throws (Firefox gives each `file://` page
   its own origin), keep `?from=` on internal links instead.
3. Every `[data-return]` link gets `selector#` + the stored selection with `m` set to `main[data-material]` (the hub keeps
   the stored `m`), and its words switch. Without script it stays today's `selectorLink(c, env)`.
4. `app/js/main.js`: chosen products' notes and tests are not in the hash (D103); keep them per tab in `sessionStorage`
   and restore them when the hash's chosen products match, so a same-tab trip loses nothing.
5. The browser's Back does the same, since the selector's history entry holds its hash.

The page never shows or uses the selection: it decides nothing. It only carries it home.

## Layouts

**Overview** (`material-PLA-1280-01.png`, `-390-01.png`, `-dark-menu-1280-01.png`)

| Block | Layout | Fed by |
|---|---|---|
| Head | Name 64 px Newsreader, full name italic, identity sentence (content), tabs right (full width on a phone) | `m.name`, `m.fullName`, `identity`/`identityLine`, `H2C_STATUS[m.h2cStatus].lede`, `productsOf(c)` |
| Key figures | Full-width plate, six cells split by hairlines (3 × 2 under 1,080 px, 2 × 3 on a phone): label, 34 px number and unit, the spread drawing (dataviz slot), "71 products, 26 to 70.9"; the plate's footer row holds the content expert's evidence line. Column order is Figure 1's | `m.headline[key]`, `m.summary[key].{n,min,max,q1,q3,asPublished}`; alternatives from dataviz's `peerSet` (new) |
| Beside | 7 : 5. The summary (Newsreader 21/1.6, ≤ 62 ch, byline small); *On the H2C*: five rows, value bold, count small at the right (below on a phone), one line on the H2C's limits, *Printing in full* | `m.written`; `printWindows`, `acceptedAt`, `dryingStats`, `hardenedFactWords`, `printCounts`, `db.meta.h2cBaseline` |
| Sections | 104 px apart, no rules or numbers; Newsreader 32 title; a 19 px opening ≤ 60 ch; figures to 1,120 px | content, dataviz |
| Hand-off | Plate: products and makers, stand-outs, primary button | `productRows`, `groupByMaker`, content's `standOutProducts` (new) |

At 1280 × 860 the first screen shows the name, the six numbers with their spread, the summary and four print rows; at
390 × 844 the name, the tabs and the six numbers.

**Products** (`products-PLA-1280-01.png`, `-sorted-1280-01.png`, `-390-01.png`). The head with *Products* selected,
one line (content), a sticky row (search, *Sort by*, count), the key of only the marks this material uses (today's
`kinds`), then the list. Columns: Product | strength XY, Z, modulus XY | notched Charpy (Izod, labelled, where a product
has none) | HDT 0.45, 1.8 | price | nozzle (hardened-nozzle icon in the cell), bed, chamber, drying. A column nobody
fills is dropped and named below. 720–1,079 px: sideways scroll, name held. Phone: the name and four labelled values,
the sorted one first in the accent. A row is a native `<details>` whose `<summary>` is the row (each value with a
hidden column name): keyboard, screen reader, no-script and find-in-page work for free. The card: values grouped by
test, each group closed by its conditions and its document and page linked to the original; *All N measurements* with
whether the page uses each and why not; printing with each setting's origin; price; statements; documents (from
`measurementFacts`, `notDrawnWhy`, `specimenWords`, `standardWords`, `changedState`, `print.from`, `priceRows`,
`makersSayFacts`, `productDocuments`, `originalOf`). Every measurement has `id="V…"`, so a figure's dot links to
`M001-products.html#V005355`, which opens its card at that value.

**Hub** (`hub-1280-01.png`, `hub-390-01.png`). Title, one sentence (the page rule said once), search, "152 materials,
76 with a page", then families in three columns (two, then one), each a Newsreader heading, its paged materials as
`name ······ products` and one small line "Also on file, without a page: PLA-ESD (2), …" (`db.materials` by `family`,
`pageOf`, `gradeIds`). Search matches names, full names and the names that are not materials (`familyEntry`: "PLA Matte
is a name for PLA"); product names too if 35 KB of names is accepted.

## The Products explorer: controls and states

| State | Values | Set by | Never |
|---|---|---|---|
| `q` | text | the search (`/` focuses it, as in the selector) | reorders |
| `sort` | *Most documented* (default), *Name*, or a column in its one meaningful direction (properties high first; price, nozzle, drying low first) | the select, or a column heading (same state) | hides a product, reverses |
| open | products whose card is open | a row; `#G…`, `#V…` on arrival | touches `q` or `sort` |

With no filters, only a search can empty the list, and it says so ("No product or maker matches "xyz"", *Clear the
search*). Sorting by a value column splits the list into labelled groups in fixed order: compared, high to low; "No
stated test load: shown, not compared (33)", hollow; "Not published (67)", by name. A bound sorts at its bound and keeps
its sign. Only the sorted column draws bars (dataviz may restyle). Special formulations and products sold as toughened
stay in place, marked. No paging. The count reads "195 products" or "12 of 195 products". Only `#G…` goes in the URL.
What the toggles asked, a sort answers: *Z values* is *Sort by tensile strength Z*, *Canadian price* is *Sort by price*,
*own data sheet* is the shared-sheet mark.

## The visual system

**Colour**: `app/css/tokens.css` unchanged, light and dark. Rules: `--ink-3` never colours light-theme text under 18 px;
the accent marks this material, links, the selected tab and the sorted column, nothing else; no status colour on a page.
I second the dataviz expert on replacing `--claim` (purple reads as the accent blue to a deuteranope).

**Type** (Inter and Newsreader, embedded as now):

| Token | px / line | Face | For |
|---|---|---|---|
| `--t-h1` | 64 / .95 (44 phone) | Newsreader 600, −.022 em | material name, *Materials* |
| `--t-h2` | 32 / 1.15 (27) | Newsreader 500 | section titles |
| `--t-num` | 34 / 1 (28) | Inter 600, tabular | key figures |
| `--t-xl` | 21 / 1.6 (19) | Newsreader 400 | the summary |
| `--t-l` | 19 / 1.5 | Inter | a section's opening |
| `--t-m` | 16 / 1.55 | Inter | body, list values |
| `--t-s`, `--t-xs` | 14, 13 | Inter | labels, controls, captions; counts, provenance, the key |

No uppercase labels, eyebrows, middle-dot strings or arrows typed after link words; icons in the selector's 20 px line
language. **Space** 4 8 12 16 24 32 48 72 104; content 1,120 px; prose ≤ 62 ch; gutter 16 px (32 from 720). **Radius**
7 px controls, 12 px plates, pill searches. **Plates** (surface, 1 px border, no shadow) only for the key figures, *On
the H2C*, the hand-off, an open card and the section list, so a plate means "facts to act on". **Components**: bar,
crumb with section list, return button (the bar's one bordered control), 36 px icon button (40 on a phone), segmented
tabs, key-figure cell, plate, disclosure row, search pill, select, group divider, primary button (one per page), the
dataviz expert's figure frame.

## Phone, print, dark, keyboard, screen reader

- **Phone**: everything stacks; the bar keeps the return and the section list; targets ≥ 40 px; Products' controls stop
  being sticky; no sideways page scroll.
- **Print**: light; bar, tabs, controls and footer buttons hidden; a print-only line with the address, release and date;
  plates, figures and cards never split; closed folds stay closed; URLs printed in *Sources* only; Products prints its
  rows and the cards left open.
- **Dark**: the tokens; marks take colour from classes (see the dark shots).
- **Keyboard**: skip link; the section list opens on Enter, closes on Escape and returns focus; `/` searches; a 2 px
  accent focus ring; no motion but the list and the chevron, none under reduced motion.
- **Screen reader**: `header`, `nav` (*You are here*), `main`, `footer`; tabs as a `nav` with `aria-current="page"`; key
  figures a `dl`; figures with caption and table twin; Products rows as disclosures with column names; the count live.

## Cut

The contents rail and phone strip; section and figure numbers on screen; *Material pages* beside the brand; *Every
record* in the bar; the footer's links and the closing "Every record behind this page…"; the Polymer / Filler / Status
row. In Products: the toggles, quarter shading, *Show all*, *Columns*, *Key values n/16* (now the default order, named in
the select), the phone's second header row, the checkbox disclosure. The records page and its finder. In the hub: the
rail, the status chips, *Measured values*, the repeated rule, the stat tiles, the lede's selector link.

## Implementation sketch

Five tracks, each owning its files; the shared contract is `documentShell`'s new signature, landed first.

| Track | Owns | Delivers |
|---|---|---|
| 1 Frame | `app/pages/shell.js`, `render.js`, `html.js`, `budget.js`, `assets/page.js`, new `assets/frame.src.css`; `app/js/ui/detail.js`, `app/js/main.js`, `app/js/ui/page-rule.js` | `documentShell({ kind, crumbs, sections, tabs, returnTo, body })`, bar, section list, tabs, footer, return logic, records stub, print; the drawer's link |
| 2 Overview | `app/pages/sections/*`, `findings.js`, `charts/*`, new `assets/sections.src.css` | head, key figures, *On the H2C*, hand-off in this layout; the other experts' sections |
| 3 Products | new `app/pages/products/` (`index.js`, `rows.js`, `card.js`), new `assets/products.src.{css,js}` replacing `tables.src.*`; `records/*` reused read-only, `records/panel.js` deleted | list, card, search, sort, groups, anchors |
| 4 Hub | `app/pages/index-page.js`, new `assets/hub.src.{css,js}` | index and search |
| 5 Checks | `test/pages.check.js`, `scripts/ui-probe.mjs`, `scripts/lib/page-products-check.js` | below |

`buildAssets` concatenates the stylesheets; each page loads the frame script plus its own, so the 30 KB script budget
holds per page. The records budget becomes the Products page's (PLA's records page is 2.76 MB raw; Products carries the
same records).

**Checks.** `pages:check`: P13 becomes "same tab, carries `?from=`"; new rules: every `[data-return]` link points at the
selector with this page's `m`; every record of a material appears in exactly one card or section; the hub lists all 152
materials and links exactly the 76; no light-theme text in `--ink-3` under 18 px. Interface probe: Products pages
replace the records pages; a return trip (set a requirement, open PLA from the drawer, see the URL cleaned, press *Back
to your results*, compare the selector's hash and requirements); for every sortable column, compared before not
compared before none, and the count equal to the visible rows. The drawer's goldens re-baseline once for the link.

## Constraints worth revisiting

1. **D142: the selector does not link to the index.** With an index worth having, one quiet entry (*All material pages*
   at the foot of the selector's material search) costs the frame nothing. The owner decides.
2. **17.5 px body text** made the pages feel like another tool than the selector's 13–14 px; 16 px proposed.
3. **A records page**: constraint 6 asks that every value trace, not that the page exist. This keeps the trace.

**Where I differ.** The content expert keeps the toggles, *Show all* and the records page with its finder; I would cut
them for the reasons above and carry their words (card labels, the "on the page" reasons, empty states) into Products.
They propose value columns on the hub; I would not (the selector's Table lens compares materials by value; the index
finds a page). Their evidence line fits the key-figures plate's footer, their neighbours the dataviz expert's Figure 1,
their first-screen link to the selector the bar's return. Figure 1 and the key figures should share one column order.
