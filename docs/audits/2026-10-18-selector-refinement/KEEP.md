# The keep register: what works, and must survive the round

> **Historical record** (2026-10-18): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

> **Working record** (2026-10-18) of the selector-refinement round ([README](README.md)). The owner's rule: "anything that
> is good in the drawer and in the actual tool should be recorded and then preserved or at least reproduced". Each item:
> what and where, why it is good, how its loss would be noticed, and, at the final review, **kept**, **reproduced**
> (another form, the same virtue) or **lost** (only with the owner's word). Seeded from the owner's own words and the
> earlier reviews; the baseline reviewer and the four experts add to it at step 1; the owner adds or strikes at the gate.

## Seeded from the record

| # | What, where | Why it is good | How a loss is noticed | Final |
|---|---|---|---|---|
| K01 | **The quiet frame** (top bar, status bar, rail head): neutral tones, the accent only for what is selected, sentence case, one line-icon language, provenance at the foot (INTERFACE "The frame") | The owner merged it after readers called the top overwhelming (2026-10-16/17) | `shots/base/main-cold-01.png` against the after shot || kept |
| K02 | **One candidate set behind every lens**; a material highlighted in one is highlighted in all (INTERFACE "One candidate set, five lenses") | The reader never wonders which set a chart shows | `ui:fuzz` invariants; probe views 40/41 || kept |
| K03 | **Templates fill the controls and step aside**; the header says which template and whether it changed, and what it does not check | A starting point, not a recommendation | `build/snapshot/ui/10-*`, `11-*` || kept |
| K04 | **Every rail control says how much data exists before it is touched** ("97 of 134 have data", the "e.g." line) | INTERFACE calls it the pattern that "does most of the work" | `01-default.txt`; `shots/base/main-cold-01.png` rail || kept |
| K05 | **The result chips are filters with ☑/☐** and a count, PASS / UNKNOWN / FAIL / SCREENED, icon plus text | The four states are always visible and never by colour alone | `ui:fuzz` chip invariant || kept |
| K06 | **Why excluded** ranks the requirements by how many materials each costs | Answers "why is X not here" without a hidden mode | probe `explain` view || kept |
| K07 | **The drawer opens on the answer** with requirements set: how many products pass, fail, publish too little, with *Show the products* (C8: passing products first, on a laptop's first view) | The owner's funnel step 5; GOALS C8 | `shots/base/drawer-pla-overview-01.png`; `14-drawer-first-ranked-products.txt` || kept |
| K08 | **"Your requirements", each line with its source button**; one describer for every place a requirement is named (`describeConstraint`) | The pill, the panel and the drawer never disagree | `drawer.test.js`; text views || kept |
| K09 | **The comparison headings** (Impact tests; Tensile tests, XY and Z; Flexural; Heat deflection and glass transition): a dot per product, middle half and median, toughened set apart, then every result with its document (D133, D139, D140) | The owner: "a good setup", asked for it on mechanical, thermal and printing | `13-drawer-*.txt`; `drawer-comparisons.test.js` || kept |
| K10 | **Print temperatures across products** with the H2C's limit drawn (D139) | How a material prints, product by product, against the printer | `13-drawer-pla-print*.txt`; `print-spread.test.js` || kept |
| K11 | **Traceability**: every value's source button opens its document, page and the sheet's own label; IDs behind an ID mark only | GOALS: every number traced; D124 | `drawer-ids.mjs` (the same set reached) || kept |
| K12 | **Products first among the tabs after Overview**, passing products first, a card staying as left; *Choose* beside the line | The things you buy, where you look for them (D124) | `14-drawer-first-ranked-products.txt` || kept |
| K13 | **Known gaps visible**, never hidden (Sources › Known gaps; a tab with nothing says so and offers the gaps) | "Making absence legible" is the design problem (INTERFACE) | text views; `drawer-ids.mjs` || kept |
| K14 | **Words for engineers** (D124): data-sheet terms kept, coinages gone, IDs out of sentences | The owner's ruling of 2026-10-04 | M4 in TRACKER || kept |
| K15 | **The way to a material page and back** (*Full page*, *Material pages*, *Back to your results* restoring the selection, the drawer, its tab and the scroll; D145) | The owner kept it, and asked that it stay as built | probe `50-page-return-trip`; a hand test || kept |
| K16 | **Estimates marked and said once** under *Estimated, not measured*; none under Confirmed only | A hint never passes; the reader always knows | probe `strict-drawer` views || kept |

## Added at step 1 (baseline reviewer and experts)

| # | What, where | Why it is good | How a loss is noticed | From | Final |
|---|---|---|---|---|---|
| K17 | **A heavy tab opens as a closed index**: Mechanical and Thermal open on bordered comparison headings with a count at the right | A 1,513-value tab fits one screen; the reader chooses what to open | `shots/base/drawer-pla-mechanical-01.png` scrolls before its last heading | UX U2, coherence KC8 || kept |
| K18 | **The strip-plot grammar**: label column with its count, one scale per unit with XY above Z (Charpy above Izod; HDT 0.45, 1.8, Tg), middle half shaded and the median marked, marks by shape not colour, a log scale named on its axis only for wide spans | The XY–Z gap and the spread read at a glance, in grey and in dark | `graphs/shots/pla-mech-01..02`; `13-drawer-*.txt` | UX U3, graphs G1, G5 || kept |
| K19 | **Gate rows**: a fixed chip column, the requirement in bold, one reason in the printer's numbers ("Requires up to 480 °C; the H2C reaches only 350 °C") | Answer, then why, scanned in one glance | `shots/base/drawer-peek-overview-01.png` | UX U4, coherence KC3 || kept |
| K20 | **A product card's head**: name, state chip and *Choose* on one line; print settings in a tinted inset | The buy decision sits on one line; the settings read as one unit | `shots/base/drawer-pla-grades-01.png` | UX U5 || kept |
| K21 | **Absence drawn**: the dashed "Not published for this material … a gap, not a zero" box | A gap looks different from a value at a glance | `shots/base/drawer-pla-mechanical-01.png` | UX U6, coherence KC8 || kept |
| K22 | **One form for every record**: property, value, conditions, locator and an ID mark, the same in every tab | The reader learns it once | `shots/base/drawer-pla-evidence-01.png` | UX U7 || kept |
| K23 | **Template cards lead with the part** ("A bracket that lives outside"), then its requirements in data-sheet terms | The engineer recognises the job before reading limits | `01-default.txt`; `main-cold-01.png` | UX U8, words W1, coherence KC1 || kept |
| K24 | **The basis line and the unchecked line** under a template: "Values judged: as printed, dry." / "Not checked by this template: …" | The condition compared and what is left open, in two short phrases | `10-*.txt` | words W2 || kept |
| K25 | **The tool's one promise, once, on the cold page**: "the tool shows the gap rather than a guess, so no material is ranked on a number nobody measured" | Its ethic, said once at the start | `01-default.txt` | words W3, coherence KC2 || reproduced (one line, reworded) |
| K26 | **The method explainers in the comparison headings** (XY against Z; HDT and Tg "none is a service temperature") | Engineer-grade, physically right, plain | `13-drawer-pla-tensile.txt`, `-heat.txt` | words W5 || kept |
| K27 | **Caveats said once at the top or foot of a view** (Environment's "treat them as indications, not design data"; the Overview's allowables sentence from `method.csv`) | The Words rule done right | `13-*`; `30-laptop-drawer-overview.txt` | words W6 || kept |
| K28 | **Plain verdict and legend words**: "No heated chamber needed", "Choose this product", "— not published", "* published, not comparable", "n/a not applicable" | Data-sheet vocabulary; absence named, never blank | `01-default.txt`; legend in `table.js` | words W7 || reproduced (the words, reworded where needed) |
| K29 | **One sentence of purpose per tab**, saying what it holds and how it is traced (may be shortened, not lost) | The reader knows what a tab is for before reading it | `30-*-drawer-*.txt` | words W8 || kept |
| K30 | **Every dot opens its record; hovering lights the product's other dots** | The graph is a way into the evidence (K11) | `drawer-comparisons.test.js`; a hand test | graphs G2 || kept (not clicked in the review; test/drawer-comparisons.test.js holds every dot to its record) |
| K31 | **What is left out of a median is counted, with its range** (no silent exclusion; its wording may get lighter) | Exclusions visible, never silent | `13-drawer-*.txt` | graphs G3 || kept |
| K32 | **A key only for the marks drawn; no band, median or graph without the values for one** | No empty legend, no spread from one point | text views | graphs G4 || kept |
| K33 | **The H2C limit drawn only where it is near the values**, otherwise said on the axis | PLA's windows are not squeezed against 350 °C | `graphs/shots/pla-print-01.png` | graphs G6 || kept |
| K34 | **The two-tier number**: median large, spread and count small, on one column (table cell, drawer, page plate) | One form across the surfaces; the eye reads the median first | `drawer-pla-overview-cold-01.png`; ui-fuzz cell check | graphs G7, coherence KC5 || kept |
| K35 | **Toughened in its own colour and in words**, distinct in dark | Never colour alone | `graphs/shots/abs-impact-dark-01.png` | graphs G8 || kept |
| K36 | **"Shown for its best match, <product>"** above Your requirements | A material answered by a named product | `14-drawer-*`; drawer text | coherence KC4 || reproduced ("Shown for X, one of the N that pass") |
| K37 | **Definitions on demand**: a dotted property name opens its definition; "Select a value to see where it comes from" | Words stay short; the definition is one press away | key-property popovers | coherence KC6 || kept |
| K38 | **Tabs grey at 0** (PCTG-GF's Environment, PEEK's Price) | Absence before the click | `drawer-pctggf-overview-01.png` | coherence KC7 || kept |
| K40 | **"Reported, not required"**: a soft criterion (price) shown on every candidate without filtering, in its own dashed pill | The right handling of a criterion that informs but must not exclude | `main-indoor-01.png`; `10-*.txt` | review R5 || kept |
| K41 | **The Price tab's listing table**: retailer, listing, kg, CAD/kg, stock, "used", with the method in one paragraph (sampled, not live, Canadian first, the dates) | Auditable price, never a bare number | `shots/base/drawer-pla-price-01.png` | review R12 || kept |
| K42 | **Why excluded's sensitivity**: per requirement, failed, could not check, "removing it would bring back N", and *Remove* | A sensitivity analysis in one glance, rare in any selector (extends K06) | `lens-explain-01.png` | review R6 || kept |
| K43 | **Release and data date** at the foot and in the Compare summary, with the requirements written out and *Print summary* | A comparison handed off can be reproduced | `review/shots-0/lens-compare-3-01.png` | review R15 || kept |
| K44 | **The rail control's anchor example** ("e.g. 3; unfilled PLA is about 2.5") beside its coverage and direction (extends K04) | How a data-literate engineer wants to type a limit | `review/shots-0/rail-scrolled-01.png` | review R2 || kept |
| K45 | **The material page's key figures and engineering prose** are the reference the drawer may borrow from, not the other way round (the pages themselves do not change this round) | The reviewer's strongest block for "one tool" | `review/shots-0/page-pla-01.png` | review R13 || kept |
| K39 | **What already agrees with the pages**: the toughened orange, the square (annealed), the grey diamond, "middle half", "median", the property names, "Bambu Lab Filament Guide" | Coherence that exists must not be lost while the rest is aligned | M5c re-run | coherence KC9 || kept |
