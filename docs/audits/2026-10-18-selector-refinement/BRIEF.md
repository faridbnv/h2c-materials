# The selector, refined: the brief for the four experts

> **Working brief** (2026-10-18) for the selector-refinement round. The plan it serves is the owner-approved plan
> summarised in [README.md](README.md); the decisions that follow from your proposals will be in PLAN.md beside it.

## Why this round exists

Filament Atlas (the tool; `docs/GOALS.md` says what it is for) is a screening workbench: an engineer sets a part's
requirements on the main page, reads the candidates, and opens a material's **drawer** to check it. Each well-documented
material also has a page of its own (`dist/materials/`, reimagined on 2026-10-17, D145).

The owner, in their words: the changes should be **"far more subtle"** than the pages' reimagining; **"the tool is good
as is"** and the main screening tool is at **"an acceptable level"**. The goal is **"to make it more coherent and less
overwhelming as the first impression of the reader"**, and for the drawer to be **"less overwhelming, more transferring
information to the reader, giving a better eye flow and reading flow and terminologies, with the UI and the design and
the word choices and the graphs"**. And: **"anything that is good in the drawer and in the actual tool should be recorded
and then preserved or at least reproduced."** The selector and the drawer are the **landing pages**, so their first
impression and their coherence with the material pages both matter.

## Priorities (a change names the one it serves; the higher wins a conflict)

| # | Priority | Share |
|---|---|---|
| **P1** | **Keep what works.** The keep register ([KEEP.md](KEEP.md)) is a gate: nothing on it is lost without the owner's word. A number the drawer and a material page print differently is a truth defect and ranks here. | gate |
| **P2** | **The two landing screens**: the cold main page at 1280×800 and the drawer's first screen (header, tabs, top of Overview). What it is, where to start, the first results; nothing said twice. | ~35 % |
| **P3** | **The drawer's reading flow**: order, folds and repetition across its tabs; words; its graphs. The drawer may be **reorganised** (tabs merged, renamed, reordered; sections moved or folded). | ~35 % |
| **P4** | **Coherence with the material pages**: the same name for the same thing, the same marks with the same meaning, the same numbers in the same form, the same visual tokens. | ~20 % |
| **P5** | **The rest of the main page** (rail, table cells, legend, lenses): only a cheap fix for a costly finding. | ~10 % |

## Hard guardrails

1. **No data, rule or answer changes.** `npm run build:diff` must stay at 0 differences; no scenario answer moves.
2. **Main page: polish only.** Every lens, rail group, control, template and table column stays. You may change order
   within a view, what is open by default, spacing, type and colour hierarchy, wording, the legend and the cell form,
   graph craft. The `#lens` scroll container stays (the way back from a material page restores its scroll).
3. **Drawer: free within its job.** Every record stays reachable and traceable to its document (the source button and
   the ID mark stay); old tab keys (`Grades`, `Evidence`, `Coverage`) still land in the right place. Its graphs stay
   HTML marks on the shared scale (`app/js/ui/scales.js`), restyled: no port to SVG this round.
4. **The material pages link is unchanged**: the status bar's *Material pages* and the drawer header's *Full page*.
5. **Words**: `docs/INTERFACE.md` "Words" (D124). The reader is a mechanical or manufacturing engineer: tensile modulus,
   HDT at 0.45 MPa, notched Charpy, XY and Z, annealed, median are right; the project's coinages are not.
6. **Shared code**: `material-words.js`, `labels.js`, `scales.js`, `format.js` and `material-facts.js` also feed the
   material pages. Say when a change would move a page.
7. **Checks read some strings** (`scripts/ui-fuzz.mjs`: the count line, the result chips, "not tested", the cell form
   `lo–hi ·`, the Ashby legend; `test/drawer-comparisons.test.js`: the tally line). A change there is fine, but say so.

## What is there now (look before you think)

- **The built selector**: `dist/H2C_Material_Selector_*.html` (open as a `file://` URL in Chrome). The material pages:
  `dist/materials/`. **Do not run `npm run build`**: the build is shared; use `dist/` as it is.
- **Baseline screenshots** (1280×800 light unless named): `shots/base/` in this folder: `main-cold*`, `main-indoor*`,
  `lens-*`, `drawer-pla-<tab>-NN` (every tab, under the Indoor prototype template), `drawer-pla-overview-cold`, `-dark`,
  `-phone`, and Overview and Products of PETG, ABS-CF, PEEK, PCTG-GF and PEI-CF.
- **Your own screenshots**: `node docs/audits/2026-10-18-selector-refinement/shots.mjs <file-url> <out-prefix> [--width
  1280] [--height 800] [--max N] [--eval "js"] [--dark] [--scroll "#lens" | ".drawer-body"] [--css <file>]`. `--eval`
  can click (`document.querySelector('[data-template="1"]').click()`, a row `tr[data-material="M001"]`, a drawer tab
  `.drawer [data-tab="Mechanical"]`); `--css` injects a stylesheet, which is how you show a change without the code.
  Write your shots into your own folder. Read them with the Read tool.
- **Rendered text**: `build/snapshot/ui/01-default.txt` (the cold page as text), `13-drawer-*.txt`, `14-*`, `15-*`.
  A drawer's text in Node: `node -e "import('./docs/audits/2026-10-18-selector-refinement/lib.mjs').then(({situation,drawerHtml,readerText})=>console.log(readerText(drawerHtml(situation(),'M001','Overview'))))"`.
- **The baseline measures** ([TRACKER.md](TRACKER.md), from `measure.mjs`): the cold page shows no table row above the
  fold (the table bar starts at 761 px of 800); "within H2C temperature limits" six times; the drawer's first screen
  carries 22 to 56 numbers; the tally "Of the N results below…" in 394 drawers, "special formulation" in 698, "n
  counts" in 652, "comparable basis" in 596, a decision or migration name in 264; small grey text at 3.5–3.7:1 contrast
  (`--ink-3`) across the page. The drawer and the pages' key figures agree in value; 22 are printed two ways (33.7 and
  34).
- **Code**: the main page `app/index.html`, `app/js/main.js`, `app/js/ui/{start,filters,table,chart,ashby,parallel,heatmap,compare,explain}.js`;
  the drawer `app/js/ui/detail.js` (and `material-words.js`, `print-spread.js`, `labels.js`, `format.js`); CSS
  `app/css/tokens.css` (shared with the pages) and `app/css/app.css`. The pages: `app/pages/`. Docs:
  `docs/INTERFACE.md` ("The frame", "One candidate set, five lenses", "The filter rail", "The material drawer",
  "Words", "The material pages"); open problems `docs/OPEN-PROBLEMS.md` §37.1, §37.2, §37.14, §37.19.

## The four experts

| Expert | Owns |
|---|---|
| **UI and visual** (`ux/`) | Hierarchy, spacing, type, alignment, contrast, the eye's path on each screen; the drawer's layout (tabs, sections, what is open or folded). |
| **Words** (`words/`) | Every string on the main page and in the drawer: terminology, repetition, bookkeeping, caveats said once, answer first. |
| **Graphs** (`graphs/`) | The drawer's graphs (comparison headings, print temperatures, key-property spreads), the table's legend and cell form, the lenses' legends; lens plots only for a costly finding. Where the pages' figures (`app/pages/charts/`) do it better, say how the drawer could borrow it. |
| **First impression and coherence** (`coherence/`) | The two landing screens as a whole (P2: what the eye meets in the first five seconds); the drawer against the material pages (P4): names, marks, numbers, tokens, and the hand-off between them (the link itself stays). |

## What you deliver, in two parts

**Part A, now (about 15 minutes): inventory.** In `<your folder>/INVENTORY.md`, at most one screen: what you see on
your side, with screenshot paths; and **keep candidates**: what is good and must survive, each with where it is, why
it is good, and how its loss would be noticed. Do not propose yet: a baseline engineer review is running, and you will
receive it.

**Part B, when the executor sends the baseline review: proposal.** `<your folder>/PROPOSAL.md`:

- one screen of vision first;
- then **at most 10 changes**, ranked. Each names its priority (P1–P5), the review finding it answers (number), the
  keep items it touches, what feeds it (a field or a function), its size (S/M/L), its risk (guardrails 6–7), and a
  **before/after** screenshot pair (at most 3 mocks in all, through `shots.mjs --css` or `--eval`);
- say what to cut or quiet as clearly as what to add. On the main page, nothing structural.

No code changes, no data changes, nothing outside your folder. The executor decides where proposals conflict, the
owner approves one plan, and then the build starts.
