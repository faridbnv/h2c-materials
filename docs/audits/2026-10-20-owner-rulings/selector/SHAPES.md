# Shapes, plot by plot

> **Historical record** (2026-10-20): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

> **In short.** Every plot of the selector, its drawer and the material pages, with what its shapes, fills and marks
> mean, read on 2026-10-20 from the code and from screenshots of the built page (track T3 of the owner's rulings, by
> Claude Opus 5.5, an agent). The owner's ruling: unify the shapes as far as it helps, but each plot's own readability
> comes first. One change was made (the Ashby chart's Material ranges view, row 2); the square and the diamond keep their
> two meanings, for the reasons under the table. Decision D174.

## What each plot draws

| # | Plot | Where | Shape | Fill and outline | Other marks | Read on its own |
|---|---|---|---|---|---|---|
| 1 | Ashby, Material typicals | selector, Ashby lens (`app/js/ui/ashby.js`) | the filler: circle unfilled, diamond carbon fibre, square glass fibre, triangle up ESD, star foaming, triangle down another named filler, hexagon an undisclosed variant (D110, D170) | pale: did not pass; thick outline: a mixed-condition pair; faint: an assumption | whiskers: a sheet's own spread | well: one mark per material, keyed under the chart |
| 2 | Ashby, Material ranges | selector, Ashby lens (`decision.js`, view `overview`) | the filler, as row 1, on each product | small and pale: a product inside its material's range; **ringed with a dot: a product kept out of its material's range, a variant or (on an impact axis) one sold as toughened** | box: middle half; whiskers: lowest to highest; thin plus: the medians; shade: an estimate | **changed**: a product sold as toughened was a plain ring and a variant a ring with a dot, two marks told apart by a two-pixel dot, and a plain ring means "could not be settled" in the Products view of the same chart. Both are now ringed with a dot, the key naming both reasons and the hover which one |
| 3 | Ashby, Products | selector, Ashby lens (`decision.js`, view `decision`) | the filler, as row 1 | filled: meets every requirement (or, with none set, a product); hollow: could not be settled; small and faint: fails | whisker: a sheet's spread; dotted staircase: Pareto front; red dashed line: a requirement; line: one value of the goal's M | well: the marks are 10 px, where every filler shape reads |
| 4 | Ashby, raw test pairs | selector, Ashby lens, More (`ashby.js`) | the filler, as row 1 | as row 1 | capped dotted line and dotted box: an estimated axis; cross: the familiar filament | well |
| 5 | Parallel lines | selector (`parallel.js`) | none | dashed: could not be checked; faded: fails | on the read line, the pages' glyph: median tick, middle-half bar, range hairline; chevron: a value parked at an axis end | well; no shape vocabulary to share |
| 6 | Compare | selector (`compare.js`) | none | dashed requirement line: only tracked | `*` tick: a value not comparable; span: an estimate; doubled line: a requirement past the end | well |
| 7 | Results table | selector (`table.js`) | small square beside a median | filled: annealed median; open: conditioned median | `•` one measurement; `*` not comparable; `≈` close to the limit; `†` estimate | well; the square is the drawer's annealed mark (row 8) |
| 8 | Drawer, comparison graphs (tensile, flexural, heat, impact) | selector drawer, Mechanical and Thermal (`detail.js`, `material-facts.js` dotMarks) | dot: a product; **square: measured after annealing; diamond: an added filler or additive (a variant), kept out of the median** | filled: in the median; hollow, light: shown, not ranked (no stated orientation or load; a variant); claim colour: sold as toughened | band: middle half; line: median | well: dot, square and diamond are the three shapes that stay apart at 7 px |
| 9 | Drawer, print temperatures | selector drawer, Printing (`detail.js`) | dot: a product's data sheet; diamond: a variant | hollow, light: read from the Bambu Lab Filament Guide, kept out of the median | band and line: middle half and median; shaded: the H2C's limit and beyond; number over a column: how many it holds | well, but a hollow mark inside a tall stacked column is faint (the stack, not the shape) |
| 10 | Material page, products strips | pages (`app/pages/charts/strips.js`, `kit.js` productMark) | as row 8: dot, square annealed, diamond variant | as row 8 | chevron: beyond the scale; band and line | well; drawn from the same marks as the drawer (`dotMarks`) |
| 11 | Material page, layers (XY against Z) | pages (`layers.js`) | dot: a product; square: measured after annealing | as row 8 | rays: equal share; the material's median ray; alternatives' cells | well |
| 12 | Material page, among materials (map) | pages (`map.js`) | dots only | this material's median: a dot, its middle half as a cross; its products: small blue dots; an alternative: dark; another material: grey | chevron: beyond the scale | well; no filler shapes |
| 13 | Material page, temperatures | pages (`temperatures.js`) | dot: a product | shade: share of products that accept each temperature; box: what most accept | line with a dot: one end given; shaded: the H2C's limit and beyond | well |
| 14 | Material page, alternatives | pages (`peers.js`) | none | cell: median and middle half; hairline: lowest to highest; ticks: each material's median | hollow: as published | well |

## The two meanings of the square and the diamond

On the Ashby chart (rows 1 to 4) the square and the diamond are glass fibre and carbon fibre; in the drawer, the table
and the pages (rows 7 to 11) the square is a value measured after annealing and the diamond a product with an added
filler or additive. They are kept, because each plot reads best with them:

- **The Ashby chart** compares materials whose filler is the first thing an engineer sorts them by, and needs seven
  shapes at 6 to 11 px: the square and the diamond are the two that stay distinct from the circle at every size, so
  they went to the two commonest fillers (D110). Moving glass or carbon fibre to a triangle, a star or a hexagon would
  make the most common marks the hardest to read.
- **The drawer and the pages** compare one material's products, which share its filler, so a filler shape there would
  say nothing. They need three marks at 7 px: a product, a value in another state (annealed), a product kept apart (a
  variant). Below about 8 px only the circle, the square and the diamond stay apart in the screenshots; a hexagon or a
  pentagon reads as a circle, and a ring with a dot as a ring. The Ashby chart's own variant mark, a ring with a dot, was
  considered for the drawer's variant and set aside for that reason.
- **Where the two meet.** A reader who knows the Ashby chart could read a square in a glass-fibre material's graphs as
  glass fibre. That can happen in five materials' graphs today (annealed products of ABS-GF, PA6-GF, PET-GF, PPA-GF and
  PPS-GF), and the diamond in one (PLA-GF's variant); no carbon-fibre material has a variant. Every graph's key, above
  it, names its marks.

What was unified instead: the words. The Ashby chart's key now calls a variant "an added filler or additive", the
drawer's and the pages' words; and "kept out" is one mark within the Ashby chart (ringed with a dot), as it is one idea
in the drawer (hollow: shown, not ranked).

## Reversing it

Putting the plain ring back for a product sold as toughened (row 2) brings back two marks told apart by a dot, and a
hollow mark with two meanings across the chart's views. Giving the drawer or the pages the Ashby chart's filler shapes
would cost them a mark that reads at 7 px; giving the Ashby chart the drawer's would cost glass and carbon fibre their
shapes.
