# The selector, refined: the plan

> **Working plan** (2026-10-18), the executor's decisions from the four proposals ([UI and visual](ux/PROPOSAL.md),
> [words](words/PROPOSAL.md), [graphs](graphs/PROPOSAL.md), [first impression and coherence](coherence/PROPOSAL.md)),
> answering the baseline review ([REVIEW-0](review/REVIEW-0.md), 62/100) against the [keep register](KEEP.md). Where
> the proposals differ, the decision below is final unless the owner changes it at the gate. Priorities: P1 keep what
> works and say only what is true, P2 the two landing screens, P3 the drawer's reading flow, P4 coherence with the
> material pages, P5 the rest of the main page.

## In short

The drawer stops contradicting itself and the material page: one **On the H2C** block worked out by the page's own
functions, key properties in the page's form, and the page's record where no median exists. Its frame gets thinner
(one row of tabs, headings that lead, content from 148 px instead of 261), its Overview follows the page's order, its
graphs borrow the page's key, counts and marks, and its bookkeeping moves behind the ID mark or into a closed line.
The main page keeps every control and quiets its frame: the missing-data panel without its box, the rail opening on
what a part needs, the H2C clause said once, one control row above the table, an annealed median drawn as the
drawer's square. No answer moves.

## Decisions where the proposals differ

| Question | Decision | Why |
|---|---|---|
| How the drawer states printability | **One block, *On the H2C***: each row the page's value (`onTheH2cRows`, moved unchanged from `app/pages/findings.js` to `app/js/ui/`), a chip worked out from `printCounts` (Within, Partly within, Beyond, No data), one line of counts against the H2C's limit; nozzle type and drying print their values; one closing line on where settings were read (coherence 1, words 1) | P1: the four numbers for PLA's nozzle and PEEK's green *Within* beside its FAIL are one cause, two computations; the page's is the reviewer's reference (K45) |
| The build's gate reason ("Needs up to 210 °C") | Off the Overview. It disagrees with the requirement rows (PEEK nozzle 400 against 480 °C): to OPEN-PROBLEMS | P1; a build change is out of scope |
| Key properties | **The page's six, in its order, median · middle half · products** at the page's display precision (`fmtDisplay`, moved to `format.js`); density, elongation, Izod and Tg on one *Also* line; where no comparable median exists, **the page's as-published value**, never another record with a star (coherence 2) | P1: 11 cells show a different record from the page's (PEEK Charpy 7 against 6); P4 |
| Numbers on the drawer's first screen | Kept in the page's form, **about 30 under a template, not 20**: each agrees with the page and is said once. The other form (median and products, middle half in the popover) is the owner's alternative | P1 and P4 above the count; **owner, gate question 2** |
| The product "Your requirements" is shown for | A passing product whose report-only lines are resolved, else the engine's; "Shown for *X*, one of the 183 that pass" (coherence 3). Display only: the engine's pick and every answer stay | F2; 49 of 72 materials under Indoor get a product with a price |
| The H2C standing | The chip once ("Type on Bambu Lab's H2C list"); the lede that repeated it goes; an excluded material's callout says it once and **names the limits** ("its products need a nozzle up to 480 °C and a bed up to 180 °C; the H2C reaches 350 °C and 120 °C") (words 4, coherence 4) | F15; the chip keeps "type" (its meaning), the popover the rest |
| Drawer tabs | One row; counts on Products and Sources only; a tab at 0 stays grey; Overview's caption goes (its answer is its purpose), the other tabs' captions move into their body (UX 1) | F4; K29 reproduced on Overview by its headings |
| Overview order | Answer, your requirements, key properties, On the H2C, uses and limitations, on file, the allowables line; **AMS moves to Printing** (coherence 5) rather than a sixth row | One block per question, the page's order |
| Section heads | The page's plate heading: 15 px, 650, ink, sentence case; small grey text through a selector text token at 4.5:1 in `app.css`; `tokens.css` unchanged (UX 2, coherence 8) | Structure read top-down; M6 |
| Comparison headings' counts | **The page's form**: "55 ranked of 106 shown", the column *Ranked*, the left-out line *Not ranked: 39 with no stated orientation (1.44–4.78), 12 with an added filler or additive (…)* (graphs 3, words 2: one vocabulary, the page's) | P4; one count, one word |
| The tally and the n paragraph | The n paragraph goes (the closed explainer gives the rule); the tally becomes a closed line, "814 results: 460 drawn above, 354 not drawn", open to the reasons (words 2) | F6; K31 kept: every exclusion still counted |
| The graphs' marks | Key above the first graph, in the page's words; hollow means one thing, *shown, not ranked*, the key saying why; hollow and filler marks drawn light; the middle half outlined (visible in dark); columns keep their counts past six rows; values in the tables at the page's precision (graphs 1–4, 6) | Line 8; P4 |
| Print temperatures | Open by default; a head line per setting naming its unit and the H2C's limit; the limit a solid line with the range beyond washed, the page's (graphs 5) | K10; the red dashed line read as a failure |
| Bookkeeping in the inner tabs | The maintainers' notes (about 2,700 of 3,004 "review notes") move behind the ID mark by the pages' own rule (moved to the shared layer); profile rows of "Not published" fold to one line; a card's sources de-duplicated; "Not stated by its maker: 12 topics" closed; codes out of prose; the guide block's locator and drying shortened; a card's guide provenance said once (words 3, 10; UX 10) | F6; K11 and K22: every ID still reachable (`drawer-ids.mjs`) |
| INDETERMINATE | Shown as **UNKNOWN** in the drawer's requirement rows (its ◐ mark and reason kept) (words 6) | F5; the table already counts it so |
| Price tab | Opens on the price: "33.7 → **34 CAD/kg**, the median of 26 products' prices (18–80), from 54 listings…", then the method (words 7) | The answer first; K41 kept |
| Counts and numbers | "183 of 195 products" in the table, as in the drawer; thousands grouped; the grammar of one (words 7, coherence 7) | F12; M5c 14 |
| Missing-data panel | **Quiet in place**: no box or fill, label beside the choice, the estimates switch **kept visible**, "Only under Include uncertain" into its ? popover (coherence 9 over UX 4, which hid the switch) | F3, without hiding a control |
| Policy words | "Materials with missing data: Confirmed only / Include uncertain" → "Materials that could not be checked: **Leave out / Include**"; the header "39 more could not be checked and are left out"; the switch keeps "Let estimates rule out materials" (words 9, its switch wording not taken) | The reviewer stopped on both; **owner, gate question 3**; `ui-fuzz.mjs` moves with it |
| The cold start panel | The H2C clause said once, above the cards (the six descriptions, a release input); cards tighter; "not tested" quiet text, not a chip (its words stay for the fuzz); **the four-step line folded** (UX 6, coherence 9) | M2a/d; **owner, gate question 1** for the step line |
| The rail | Opens on Mechanical and Thermal; Material family closed (it opens itself when a family is ticked); its badge names *Build materials only* (UX 5) | F14; a default, not a move |
| Results header | Properties / Printing, Rank by and Compare against on one row; the caption read aloud only; tighter cells; the legend on one line, its rare marks behind one fold if needed (UX 7, graphs 7) | F10 |
| "annealed median" in a cell | The drawer's **square** on the median's line, and a legend entry "■ annealed median: from a bar annealed after printing; requirements still judge each product as printed" (graphs 7 over words 8's caption) | F8; P4, one mark |
| ¤ | The currency converted from ("USD"), the rate in its popover (graphs 7), if the fuzz's price read allows | F10 |
| Lenses | Compare draws a tick, not a bar, on a log track; Parallel lines takes a log axis by Compare's rule; Ashby's y title gets its room (graphs 8–10) | F9; P5, cheap |
| Phone | The drawer's tab strip fades at its edge; *Full page* reads "Page" (done, 862f67b0) (UX 8) | F13 |
| Not done | The comparison headings' glyph (UX 9: little for its cost); hiding the estimates switch (UX 4); moving the pages' data tokens into `tokens.css` (graphs 4: the drawer takes the values in `app.css`); the main table's starred cells (to OPEN-PROBLEMS); Ashby's shape vocabulary against the drawer's (D110; to OPEN-PROBLEMS, the owner's later call) | |

## Keep items this plan changes in form (each **reproduced**, the owner may strike)

- **K29** One sentence of purpose per tab: dropped on Overview (its answer box and headings say it), moved into the body
  on the other seven.
- **K36** "Shown for its best match": reproduced as "Shown for *X*, one of the N that pass", a product with the
  requirement in view resolved.
- **K31** What is left out of a median, counted with its range: kept per row; the tally behind a closed line.
- **K19** Gate rows: the chip column and one reason line kept, worked out from the products' counts.
- **K34** The two-tier number: kept; the spread beside the median becomes the middle half in the Overview (the page's).
- **K05** The four states: kept on the main page; the drawer's rows show INDETERMINATE as UNKNOWN with its ◐.

## Who builds what

| Track | Who | Where | Files |
|---|---|---|---|
| M: the main page | the UI expert, carrying the words and graphs experts' main-page changes | worktree W2 (`selector-main`, from this branch) | `app/index.html`; the frame of `app/js/main.js`; `start.js`, `filters.js`, `table.js`, `chart.js`, `ashby.js`, `parallel.js`, `heatmap.js`, `compare.js`; main-page sections of `app.css` |
| D: the drawer | the executor | W1 (`selector-refinement`) | `detail.js`, `explain.js` `renderWhy`, `print-spread.js`, the drawer's words, the drawer's sections of `app.css` |
| Shared | the executor only | W1 | the moved functions (`onTheH2cRows` and helpers, `fmtDisplay`/`spanDisplay`, the pages' reader-text rule), `labels.js`, `format.js`, `scales.js`, the text token, `ui-fuzz.mjs`, `ui-probe.mjs`, tests, snapshots, the release-input commit, docs |

## Definition of done

The approved plan's twelve items, with M3's target as the owner decides at the gate. Checked by the executor from
`measure.mjs`, `drawer-ids.mjs`, the screenshot set and the checks; then the final review.
