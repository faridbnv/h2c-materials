# The keep register: what works, and must survive the round

> **Working record** (2026-10-18) of the selector-refinement round ([README](README.md)). The owner's rule: "anything that
> is good in the drawer and in the actual tool should be recorded and then preserved or at least reproduced". Each item:
> what and where, why it is good, how its loss would be noticed, and, at the final review, **kept**, **reproduced**
> (another form, the same virtue) or **lost** (only with the owner's word). Seeded from the owner's own words and the
> earlier reviews; the baseline reviewer and the four experts add to it at step 1; the owner adds or strikes at the gate.

## Seeded from the record

| # | What, where | Why it is good | How a loss is noticed | Final |
|---|---|---|---|---|
| K01 | **The quiet frame** (top bar, status bar, rail head): neutral tones, the accent only for what is selected, sentence case, one line-icon language, provenance at the foot (INTERFACE "The frame") | The owner merged it after readers called the top overwhelming (2026-10-16/17) | `shots/base/main-cold-01.png` against the after shot | |
| K02 | **One candidate set behind every lens**; a material highlighted in one is highlighted in all (INTERFACE "One candidate set, five lenses") | The reader never wonders which set a chart shows | `ui:fuzz` invariants; probe views 40/41 | |
| K03 | **Templates fill the controls and step aside**; the header says which template and whether it changed, and what it does not check | A starting point, not a recommendation | `build/snapshot/ui/10-*`, `11-*` | |
| K04 | **Every rail control says how much data exists before it is touched** ("97 of 134 have data", the "e.g." line) | INTERFACE calls it the pattern that "does most of the work" | `01-default.txt`; `shots/base/main-cold-01.png` rail | |
| K05 | **The result chips are filters with ☑/☐** and a count, PASS / UNKNOWN / FAIL / SCREENED, icon plus text | The four states are always visible and never by colour alone | `ui:fuzz` chip invariant | |
| K06 | **Why excluded** ranks the requirements by how many materials each costs | Answers "why is X not here" without a hidden mode | probe `explain` view | |
| K07 | **The drawer opens on the answer** with requirements set: how many products pass, fail, publish too little, with *Show the products* (C8: passing products first, on a laptop's first view) | The owner's funnel step 5; GOALS C8 | `shots/base/drawer-pla-overview-01.png`; `14-drawer-first-ranked-products.txt` | |
| K08 | **"Your requirements", each line with its source button**; one describer for every place a requirement is named (`describeConstraint`) | The pill, the panel and the drawer never disagree | `drawer.test.js`; text views | |
| K09 | **The comparison headings** (Impact tests; Tensile tests, XY and Z; Flexural; Heat deflection and glass transition): a dot per product, middle half and median, toughened set apart, then every result with its document (D133, D139, D140) | The owner: "a good setup", asked for it on mechanical, thermal and printing | `13-drawer-*.txt`; `drawer-comparisons.test.js` | |
| K10 | **Print temperatures across products** with the H2C's limit drawn (D139) | How a material prints, product by product, against the printer | `13-drawer-pla-print*.txt`; `print-spread.test.js` | |
| K11 | **Traceability**: every value's source button opens its document, page and the sheet's own label; IDs behind an ID mark only | GOALS: every number traced; D124 | `drawer-ids.mjs` (the same set reached) | |
| K12 | **Products first among the tabs after Overview**, passing products first, a card staying as left; *Choose* beside the line | The things you buy, where you look for them (D124) | `14-drawer-first-ranked-products.txt` | |
| K13 | **Known gaps visible**, never hidden (Sources › Known gaps; a tab with nothing says so and offers the gaps) | "Making absence legible" is the design problem (INTERFACE) | text views; `drawer-ids.mjs` | |
| K14 | **Words for engineers** (D124): data-sheet terms kept, coinages gone, IDs out of sentences | The owner's ruling of 2026-10-04 | M4 in TRACKER | |
| K15 | **The way to a material page and back** (*Full page*, *Material pages*, *Back to your results* restoring the selection, the drawer, its tab and the scroll; D145) | The owner kept it, and asked that it stay as built | probe `50-page-return-trip`; a hand test | |
| K16 | **Estimates marked and said once** under *Estimated, not measured*; none under Confirmed only | A hint never passes; the reader always knows | probe `strict-drawer` views | |

## Added at step 1 (baseline reviewer and experts)

| # | What, where | Why it is good | How a loss is noticed | From | Final |
|---|---|---|---|---|---|
