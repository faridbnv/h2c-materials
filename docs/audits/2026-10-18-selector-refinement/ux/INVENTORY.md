# UI and visual: inventory (Part A)

> **Historical record** (2026-10-18): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

> **Working record** (2026-10-18), selector-refinement round. What the screen does to the eye now, before any proposal.
> Shots: `shots/base/` (B), mine in `ux/shots/` (U): `pla-Mechanical-open-*`, `pla-Printing-open-*` (first heading
> opened, Indoor prototype), `page-pla-01` (the material page, for comparison). Drawer geometry measured in Chrome at 1280×800.

## What I see

**Main page, cold** (B `main-cold-01`). Eye path: brand, the tinted mode panel, "152 materials", the view-tab strip
(the loudest control), its caption, a 4-step stepper, the heading at 237 px, six template cards (2×3, four-line bodies,
"within H2C temperature limits" in five), the stats line, "What this database cannot answer" at 723 px, the table bar
at 761 px. Three thin lines (tab caption, stepper, stats) sit between the reader and the first row. The rail opens on
Material family: 24 checkboxes fill it, so the rail's other groups (what a part needs) are below the fold.

**Main page, Indoor** (B `main-indoor-01`). "87 shown PASS" then "87 of the 152 materials meet these requirements" 85 px
lower; *Clear requirements* twice (rail head, results head); "REPORTED, NOT REQUIRED" in uppercase grey; three control
rows (Properties / Printing + Rank by; Compare against; a two-line legend) push the column header to 540 px. Cells are
three lines (value / range · n / "annealed median"), so about 2.5 rows show.

**Drawer, first screen** (B `drawer-pla-overview-01`, `drawer-peek-overview-01`). Header 0–139 px, tab strip 139–227
(eight tabs wrap to two rows; the break moves with the counts: Environment wraps for PLA, Price for PEEK), the tab
caption to 261: **content starts at a third of the screen**. Then the lede, which restates the header chip ("Type on
Bambu's H2C list" / "A material type on Bambu Lab's H2C list…"; PEEK says "beyond H2C" in the chip, a red banner and
the lede before its answer). The answer box (tinted, chip, sentence, *Show the products*) is the first strong block.
**Section heads are the faintest type on screen**: `h3.sec` 12.5 px uppercase `--ink-3` (3.5:1), while the bold
sub-heads, chips and bullets under them are louder, so structure reads bottom-up. H2C printability uses three layouts
in one section (bold line + bullets; a chip column of gate rows; AMS as a bare heading) and states each axis twice;
its chip column mixes states (Within, Some products) with a non-state ("Published"). Key properties: two columns,
every name dotted-underlined, median in ink, range · n at 11 px grey; the page's tiles show the middle half and a bar
for the same figures, and Price prints 33.7 here, 34 there (U `page-pla-01`).

**Drawer, tabs.** Mechanical and Thermal open on a closed index of bordered headings with a count at the right (B
`drawer-pla-mechanical-01`, `-thermal-01`): calm, the whole tab in one screen; but a heading with a graph and a plain
property list look the same. Opened (U `pla-Mechanical-open-01/02`): label column with "n products", one axis per unit,
middle half shaded, median line, marks by shape; the key is two lines under the plot, and the table under it is twice
as tall as its numbers ("Also drawn, not in the median…" in two grey lines under every row). Printing's own graph
(K10) is **closed** under a three-line caption (B `drawer-pla-printing-01`); the guide block below prints "190 - 230 °C"
with a spaced hyphen. Products (B `drawer-pla-grades-01`): passing group open, first card open, print settings in a
tinted inset, values in a plain list. Sources (B `drawer-pla-evidence-01`): search, publisher groups with counts,
entries in a steady three-line form. **Phone** (B `drawer-pla-overview-phone-01`): *Full page* renders as an **empty
pill** (app.css 1357–1364 hides the words for "the arrow alone", but detail.js 455 has no arrow), and the tabs scroll
sideways cut mid-word ("Therma") with no cue.

## Keep candidates (UI side; K01–K16 already hold the frame, chips, comparisons, traceability)

| # | What, where | Why it is good | How a loss is noticed |
|---|---|---|---|
| U1 | **The answer box** as the first strong block of the Overview: tint, state chip, one sentence, one button | The eye lands on the verdict before any number (K07's form) | B `drawer-pla-overview-01`: another block outweighs it |
| U2 | **Tab as a closed index**: Mechanical / Thermal open on bordered headings with right-aligned counts | A 1,513-value tab fits one screen; the reader chooses what to open | B `drawer-pla-mechanical-01` scrolls before the last heading |
| U3 | **The strip-plot grammar**: label column with n, one axis per unit, middle half and median, marks by shape not colour, tabular numbers | Reads product by product without a legend hunt; works in grey and dark | U `pla-Mechanical-open-01`, B `drawer-pla-mechanical-dark-01` |
| U4 | **Gate rows**: a fixed chip column, the requirement in bold, a one-line reason | The FAIL / INDETERMINATE / UNKNOWN column is scanned in one glance | B `drawer-peek-overview-01` rows lose their column |
| U5 | **Product card head**: name, state chip, *Choose* at the line's right; print settings in an inset | The buy decision sits on one line; settings read as one unit | B `drawer-pla-grades-01` |
| U6 | **Absence drawn**: the dashed "Not published for this material … a gap, not a zero" box | A gap looks different from a value at a glance | B `drawer-pla-mechanical-01` |
| U7 | **Source entry form**: property — value / conditions / locator + ID mark, the same in every tab | One shape for every record: the reader learns it once | B `drawer-pla-evidence-01` |
| U8 | **Template cards lead with the part** ("A bracket that lives outside") before the numbers | The engineer recognises the job before reading limits | B `main-cold-01` |
