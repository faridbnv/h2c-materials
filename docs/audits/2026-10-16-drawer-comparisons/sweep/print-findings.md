# Print temperatures sweep (2026-10-16)

> **Historical record** (2026-10-16): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

A Claude Sonnet agent read all 144 "Print temperatures across products" headings as text (`print-text.mjs` over each
material's rendered Printing tab) against a checklist, and checked the counts against `dist/db.json`. Claude Opus judged
each finding. "Fixed" means changed in the drawer before the round's commit.

| Check | Found | Judged |
|---|---|---|
| A row's products against its dots and its table (n plus what is drawn and not counted) | 0 | — |
| Products drawn plus not drawn against the material's products, per setting | 0 real; 26 rows in 23 headings looked short where a window gives one end, drawn on one row and named in "Not drawn" | Fixed: such a window is now "gives only a lowest (or highest) setting" |
| A typical window whose low end is above its high end | 1 (M037, heated chamber 62.5–60 °C: 2 products give a lowest, 1 a highest) | Fixed: crossing medians are said by name |
| A limit drawn off its ticks, or "above the scale" below the top tick | 0 | — |
| A product named outside the limits whose window is within them | 0 (a nozzle or bed window whose highest end is above the limit is outside by the gate's rule) | — |
| A one-product line without its open end ("(120 °C)" for "up to 120 °C") | 6 headings | Fixed: the line gives the product's window as its sheet does |
| "ask an enclosure with no temperature" | 10 headings | Fixed: "ask for an enclosure and give no temperature" |
| A decision number in a sentence ("(D89)") | every heading | Fixed: removed |
| "Themax PEEK" beside "THERMAX PPSU" | 1 product | Fixed by m416: the sheet's heading prints ThermaX™ PEEK |
| A middle half shown as a dash under four products | 498 cells | Kept: as in every comparison table, a middle half is drawn from four products |

Counts: 144 headings; settings drawn: nozzle 144, bed 141, heated chamber 72, drying 84; 43 headings name products
outside the H2C's limits, 101 say none is. Settings the agent found odd for their material are what their profiles'
sheets print: Extrudr PEARL's nozzle 140–210 °C, four PLAs to 260 °C, Fillamentum Timberfill's 150–170 °C, Fabru
PBT's bed 160–200 °C and PC's 120–150 °C, Ensinger TECAFIL PEEK EV's bed 160–250 °C and chamber 160–230 °C, LEHVOSS
PEI's nozzle 400–450 °C, Grupa Azoty POM's chamber 70–140 °C, and PLA drying at 65–80 °C on four sheets.
