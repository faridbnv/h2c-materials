# The completeness round's closing check

> **Historical record** (2026-10-07): written for one review or round. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](../../../../README.md) and [OPEN-PROBLEMS](../../../../docs/OPEN-PROBLEMS.md).

A fresh Claude Sonnet reader with no access to the tables read records the round changed on their pages
(`PROMPT.md`), and Claude Opus compared each reading with the record.

- **First draw** (`draw.csv`, seed 20261011, 40 records: 20 added values, 5 retirements, a move, 2 relabelled bars,
  4 makers' statements, 2 claims, 3 page statements, 3 profile cells): 38 hold, 2 are partly wrong in a cell that decides
  nothing (`verdicts-20261011.csv`). B30 is a row of a print-settings table ("Fan speed: 0-70%") entered as a maker's
  statement; the curation now holds such rows (13). B37 is a page statement typed "Printed specimen" whose words name
  only standards and a thickness; m413 narrows it. Both families were swept.
- **Twenty of curate's holds** (`holds.csv`, `readings-holds.csv`, `holds-verdicts.csv`): every hold was right. Each of
  the proposed corrections was the neighbouring cell of the held one; the zero melt flow and the label-and-standard
  disagreement are what the page prints; YOUSU PC's stacked "19" and "900" stay unsettled.
- **Second draw** after the sweep (`draw-2.csv`, seed 20261012, 20 records: 10 statements, 5 page statements, 5 values):
  19 hold, 1 is partly wrong in a cell that decides nothing (`verdicts-20261012.csv`): C10, a bullet of MatterHackers'
  general "What is PLA Filament?" list recorded as one product's benefit. The same reading showed Fillamentum's drying
  guide giving its general sentences to eight products, and the curation now drops a sentence one document gives to
  four materials or more (226 rows); the rest of that kind is listed in OPEN-PROBLEMS §34.
- **Missed claims** (`claims-negative.csv`, seed 20261011, 20 unmarked products among those item 4 read): none missed.
  Spectrum ABS Kevlar's "10% Aramid fiber reinforced, high rigidity & impact strength" lists features without saying
  the fibre toughens it, as Spectrum ASA Kevlar's does.
