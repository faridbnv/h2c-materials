# First impression and coherence: inventory (Part A)

> Working record, 2026-10-18. Baseline `shots/base/`; the pages in `coherence/shots/page-{M001,M001-products,M110,method}-0N.png`.

## 1. The two landing screens, first five seconds

**Cold main page** (`main-cold-01.png`). The eye meets, in order: the bordered *Materials with missing data* panel at top
centre (the loudest object in the frame, and it decides nothing until a requirement is set); the 24-row family list with
counts (the longest block on screen); then the template heading and six cards. Results: "152 materials · no requirements
set" in small type, no table row (bar at 761 px). Where to start is said three times (stepper "1 Set requirements",
the heading "…or set your own requirements in Filters", the status bar "Set a requirement in Filters…"), and the lens
caption "The candidates as a sortable list" names a list that is not on screen. "within H2C temperature limits" ends four
cards; the facts strip prints 14822 unseparated. **Indoor** (`main-indoor-01.png`): chips, an uppercase *REPORTED, NOT
REQUIRED*, a fold, the Properties/Printing switch, *Compare against*, a two-line legend: the first row at about 600 px.

**Drawer first screen** (`drawer-{pla,abscf,peek,pctggf}-overview-01.png`, `drawer-pla-overview-cold-01.png`). The
header takes 140–160 px; the eight tabs wrap to two rows, each with a record count (1513, 522, 297…), so the first
numbers the eye meets are counts of records, not properties. A caption restates the tab. Cold: the lede repeats the H2C
chip, then 10 key properties × 3 numbers. Indoor: the verdict box (right first thing) sits under chip and lede; "Also
met:" repeats the pills in grey; printability states each axis twice (counts, then *Within* rows). PEEK says "beyond H2C
capability" four times (chip, red banner, lede, FAIL row) before its verdict. ABS-CF's header wraps to five lines.

## 2. Coherence checklist, drawer against the pages (measure M5c): 20 items

| # | Drawer (and main table) | Material pages |
|---|---|---|
| 1 | "special formulation" (keys, tables, 698 drawers) | "added filler or additive" |
| 2 | Beside the median, the **full range** "0.95–4.24 GPa" | the **middle half** "1.93–2.87", same slot |
| 3 | count "· 55" | "55 products" |
| 4 | three significant figures: 33.7 CAD/kg, 58.9 °C | the method's rule: whole °C, whole $/kg from 10 → 34 (M5b, 22 cells) |
| 5 | "Key properties": 10 rows, density first, Izod, Tg, elongation | six key figures, no density, modulus first |
| 6 | as published: "3.4 GPa \*", table "\* published, not comparable", figures "no stated orientation", "not in the median" | "as published · no stated orientation" (grey italic), "○ orientation or load not stated", "shown as published" |
| 7 | hollow dot: an **accent** ring (`.imp-dot.open`) | hollow: a **light grey** ring (`--dv-light`) |
| 8 | data colour `--accent` #1f5f8b; dot 9 px, no ring; median a dark line | `--dv-self` #1d65a3; dot 7 px with a surface ring; key-figure median an accent tick |
| 9 | chip "Type on **Bambu's** H2C list" + lede "A material type on Bambu Lab's H2C list, though not every brand of it is." | "Bambu Lab lists PLA as a material type for the H2C; the listing covers the type, not each brand." |
| 10 | PLA nozzle: "up to 260 °C", "Needs up to 210 °C"; Printing tab medians 195 / 230 | "195–230 °C, most products that give one" (bed: 90 / 60 against "50–60 °C") |
| 11 | "H2C printability"; "Chamber"; "Hardened nozzle: Some products"; "Drying: Published" | "On the H2C"; "Heated chamber: none needed"; "Nozzle type: standard for most"; "Drying 40–65 °C, 3–12 h" |
| 12 | tabs Mechanical, Thermal, Printing, Environment, Price | Mechanical properties, Thermal properties, Printing on the H2C, Uses, limitations and chemicals, Density and price |
| 13 | "Sources 281", "2430 measurements from 281 sources" | "281 documents from 41 publishers, 240 of them data sheets" |
| 14 | "1,240 kg/m³" beside "1513 values", "2430 measurements"; cold page "14822" | thousands grouped |
| 15 | identity "PLA · unfilled · 195 products from 40 makers" | "195 products from 40 makers." (no family, no "unfilled") |
| 16 | uppercase tracked labels (KEY PROPERTIES, H2C PRINTABILITY, YOUR REQUIREMENTS) | sentence-case serif headings; INTERFACE "The frame": sentence case |
| 17 | name in Inter bold, full name plain | Newsreader display, full name italic |
| 18 | table "Modulus XY", "HDT 0.45"; drawer "Tensile modulus (XY)" | figure heads "Modulus (XY)", "HDT 0.45 MPa"; Products "Tensile modulus, GPa / XY" |
| 19 | "Typical applications: Detailed display models…" (unattributed) | "Makers sell it for prototypes and display models" (attributed) |
| 20 | converted price marked ¤ (key property, table) | Overview key figure unmarked (prose says it) |

Already agreeing: `--claim` orange for toughened, the square (annealed), the grey diamond, "middle half", "median",
"Tensile modulus (XY)", "HDT at 0.45 MPa", "Notched Charpy impact", "Bambu Lab Filament Guide".

## 3. Keep candidates

| # | What, where | Why it is good | How a loss is noticed |
|---|---|---|---|
| KC1 | Template cards: a part in plain words, then its requirements in data-sheet terms (main, cold) | Starts from the reader's part, speaks HDT and modulus | `01-default.txt`; `main-cold-01.png` |
| KC2 | The facts strip's promise: "shows the gap rather than a guess, so no material is ranked on a number nobody measured" | The tool's ethic, once, on the cold page | `01-default.txt` |
| KC3 | A requirement row: chip, requirement, one reason in the printer's numbers ("Requires up to 480 °C; the H2C reaches only 350 °C") | Answer, then why, in one line | `drawer-peek-overview-01.png`; `13-drawer-*` |
| KC4 | "Shown for its best match, 3DXTECH ECOMAX PLA" | A material answered by a named product | the drawer's Your requirements |
| KC5 | The two-tier number: median large, spread and count small and grey, values on one column (drawer and page plate) | One form across both surfaces; the eye reads the median first | `drawer-pla-overview-cold-01.png`; `page-M001-01.png` |
| KC6 | Definitions on demand: dotted property names open their definition; "Select a value to see where it comes from" | Words stay short; the definition is one click away | key-property popovers |
| KC7 | Tabs that grey out at 0 (PCTG-GF Environment 0, PEEK Price 0) | Absence before the click (K13's virtue, in the header) | `drawer-pctggf-overview-01.png` |
| KC8 | Mechanical opens closed: the comparison headings as a contents list with counts; "Not published for this material … a gap, not a zero" in a dashed box | A 1,513-value tab reads calmly; the gap has its own look | `drawer-pla-mechanical-01.png` |
| KC9 | The names and marks already shared (the "Already agreeing" line) | Coherence that exists must not be lost while the rest is aligned | M5c re-run |
