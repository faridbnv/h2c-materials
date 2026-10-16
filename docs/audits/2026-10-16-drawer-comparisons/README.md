# Drawer comparisons round, 2026-10-16

> **Historical record** (2026-10-16): written for one round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../README.md) and [OPEN-PROBLEMS](../../../docs/OPEN-PROBLEMS.md).

> **In short.** The owner asked for the impact heading's way of reading a material (a dot per product, the median
> table, every result with its document) in more of the drawer, and chose two headings: Tensile tests, XY and Z, and
> Heat deflection and glass transition, with three rows drawn in the drawer alone (tensile modulus Z, elongation at
> break Z, HDT at 1.8 MPa). Claude Opus designed it, wrote the code and the migrations m414 and m415, and judged every
> finding; Claude Sonnet agents wrote tests from its specifications, read all 521 headings against a checklist and
> re-read 40 newly drawn values blind. Then, once the owner had seen them, Print temperatures across products on the
> Printing tab. No answer moved (D139).

## What was built

| Step | What | Check |
|---|---|---|
| 1 | Unstated load and Drawer only columns, drawer_comparisons.csv (m414); drawer-only rows kept off every decision list | `build:diff`: three registry paths only |
| 2 | The drawer draws any comparison the data names: a graph per unit, words from each headline, the drawer's count mirroring assess's reason codes | Impact tests unchanged but for three phrases, each now true of its lists |
| 3 | The tensile and heat comparisons and their three new rows, with captions (m415); a flat bar preferred before a printed specimen | snapshot: rows added only; templates, states, gates, screening unchanged |
| 4 | Tests (`test/drawer-comparisons.test.js`, registry cases), ui views by name, the sweep and the blind draw | below |

## The sweep of every heading

Two Claude Sonnet agents read every material's headings as text (`sweep/`): 143 tensile, 112 impact and 122 heat. Every
count added up (rows against the table, the counted line against its parts). Fixed in the drawer:

- an abbreviation lower-cased in a sentence ("hDT at 0.45 MPa", 18 headings);
- a scale of one tick where every product gives one temperature (2);
- middle halves and Z shares printed as ranges of one number ("64–64", "83 % (83 %–83 %)", 9).

Read and kept, with why:

- **More dots than results drawn** (52 headings): a twin reads its sibling's record (D89), so one record stands
  for several products' dots. The counted line counts records, the rows products; the record says which products it
  stands for.
- **A row of dashes beside rows with medians** (14 headings): that row's products are all special formulations or state no
  orientation or load; the line under it says so.
- **A "sold as toughened" key with no toughened product in a median** (6 impact headings): the coloured dot is a
  toughened product whose value states no orientation, so it is hollow and listed under that reason.
- **Medians of HDT at 1.8 MPa above those at 0.45 MPa** (5 materials) and Z above XY (1): the two rows are different
  products; per product, `sweep/value-checks.txt` found one inversion, colorFabb's PA Blue Metal Detectable, which its
  sheet prints (OPEN-PROBLEMS §30.5).
- **Z shares of XY outside 20 % to 150 %** (16 products, 15 of them elongation): as the sheets print them; Polymaker's
  PolyLite PLA Pro prints a Z elongation above its XY one, and the blind reader read it so.
- **PPSU's unloaded 207 °C** beside its twins' 207 °C at 1.8 MPa: OPEN-PROBLEMS §15.

## The blind draw

40 newly drawn values, all as their pages print them ([blind-draw/RESULT.md](blind-draw/RESULT.md)).

## Print temperatures (the second step)

The owner saw the three headings and chose to go on (2026-10-16). The Printing tab opens with **Print temperatures
across products**: each product's lowest and highest nozzle, bed and heated-chamber setting and its drying temperature,
as its print gate reads them, the guide's values hollow and never counted, the H2C's limit dashed where it is near the
values, the typical window (the medians), the products outside the limits by their gate's verdict, and what is not
drawn by why (`app/js/ui/print-spread.js`, page-side; `build:diff` shows no change). `test/print-spread.test.js` checks
the 5,436 dots of 144 materials against `g.print`, the table, the window, the outside line and the counts.

A Claude Sonnet agent read all 144 headings (`sweep/print-findings.md`). Every count squared with the products.
Fixed: a window given at one end said as "open at one end" without the end (now "gives only a lowest setting"); a
single product's window printed without "at least" or "up to"; "ask an enclosure with no temperature"; two medians
that cross where few products give both ends (now said by name); and a decision number in a sentence. The product
"Themax PEEK" is 3DXTECH's ThermaX PEEK, as its sheet's heading prints it (m416; "Themax" is the shop's file name).
Odd-looking settings it listed (Extrudr PEARL at 140–210 °C, Fabru PBT's 160–200 °C bed, Grupa Azoty POM's 70–140 °C
chamber, LEHVOSS PEI at 400–450 °C) are what their profiles' sheets print.
