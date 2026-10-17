# Material pages round, 2026-10-16

> **Historical record** (2026-10-16): written for one round. It describes the tool and its data as they were then;
> numbers, rules and file names may have changed since. For where things stand now, read the
> [README](../../../README.md) and [OPEN-PROBLEMS](../../OPEN-PROBLEMS.md).

> **In short.** The owner asked for a page of its own for each well-documented material, opened from the drawer: a
> written summary, then the material's data as processed figures, with every record one link away. The
> [assessment](../2026-10-16-material-pages/README.md) found it doable and light; the owner answered its eight questions
> the same day. This round builds it to the [plan](PLAN.md). In progress.

## Steps

| Step | What | State |
|---|---|---|
| 1 | One shared facts layer for the drawer and the pages (`app/js/ui/material-facts.js`, scales, words, the page rule, shared design tokens); the drawer's output unchanged | done: 11,900 drawer renders byte-identical before and after; 0 database differences; verify:fast, 83 interface views and 300 rendered scenarios green; [API](FACTS-API.md) |
| 2 | Fonts, the page design system and chart grammar, three prototype pages (PETG, PLA, PCTG-GF) | done: Inter and Newsreader (approved); the renderer, chart grammar and three prototypes with their records pages; every page renders in 0.4 s; the drawer still byte-identical |
| Gate | The owner approves the prototypes | prototypes shown to the owner on 2026-10-16; waiting for the answer |
| 3 | Build stage 8, the records and index pages, the drawer's Full page link, the release zip, the checks | waiting |
| 4 | The written summaries: table, placeholders, lint, drafts, judging | waiting |
| 5 | Blind read of 40 pages, documents, close | waiting |

## The owner's review and the redesign

The owner scored the three prototypes 65/100 on 2026-10-16: "not easy to read… both because of way of writing and
graphics", figures "almost what is already available in the drawer", the product tables "pure headaches to read and
scroll or search", and section links landing a few pixels off. Two Claude Opus agents redesigned the page (findings
first, counting rules behind a fold, figures the drawer cannot draw) and the tables (a Products table to choose from, a
records finder), in parallel and in separate files (7a59fb18). An independent Claude Opus reviewer, reading the rendered
pages as a mechanical engineer and never the code, then scored them 66/100: navigation and the finder much better, but a
search-after-sort bug in Products, counts that contradict each other across sections, project wording in the reading
path, a first screen of inventory counts, maps zoomed out to every polymer, and very long pages. A second pass on its
findings is under way.

## Data problems the review found (not fixed in this round)

Each was checked against `dist/db.json` on 2026-10-16. They are faults in the data, not in the pages, and go to
OPEN-PROBLEMS when the round closes; the pages show the data as it is.

- **Kingroon's reprints of Bambu Lab's tables are not marked annealed.** Kingroon PLA Basic (G001-192) prints Bambu Lab
  PLA Basic's (G002-01) table: the same tensile modulus, strength and HDT values, which Bambu's rows hold as annealed and
  Kingroon's as as-printed. Kingroon PETG Basic (G020-72) repeats Bambu Lab PETG Translucent's (G023-01) values; its
  tensile rows are annealed, its HDT rows not. Neither pair shares a formulation key, so each value counts twice in its
  material's median. OPEN-PROBLEMS records Kingroon's TPU reprint (MEAS-CROSS-SOURCE-TWIN) and the PETG sheet's annealing
  sentence (§31.10), not these.
- **Elastomer-only properties have no Applies-to rule**: tear strength, compression set and tensile stress at 100, 200,
  300 and 400 % elongation, so a rigid material lists them as not published.
- **Prusament's "Horizontal" and "Vertical XZ" bars are never compared**: they are kept as source labels
  (G001-87, G001-90, G001-144), so Prusament PLA's tensile values stand nowhere on its material's comparisons.

## The second engineer review

After the review pass (ba9a1d82, 4e8ec388), a fresh Claude Opus reviewer, who had seen neither earlier version, scored
the pages 72/100 on 2026-10-16 (first minute 7, writing 6, figure insight 7, figure craft 7, choosing a product 6,
finding a record 8, trust 7, thin data 6, navigation 8, typography 7). Anchors, the records finder and the figures
that answer a question (what Z keeps of XY, print windows, the heat ladder) were its strongest points. What holds the
score down, in its words and ranked: the Products table does not fit a laptop and truncates names into lookalikes;
reprinted sheets and physically implausible values sit inside medians and ranges; the first screen gives numbers but
no comparison; bookkeeping and coinages remain in places ("as the build chose it", "36 settings from Bambu Lab's
guide" beside "66 products"); and the thin page keeps empty sections and estimates that disagree with its sheets.
About half of that is data (the reprints, the implausible moduli, the estimates, Bambu Lab's PETG HF guide row read for
every PETG product), the rest the pages. The owner decides whether to go on.

## Main moved on: D141 taken, heat loads and print windows typed again

On 2026-10-17 main fixed a parser that dropped a print window's or a heat-deflection load's stated number when it fell
outside a plausibility window (D141, m420, m421): five print windows, three drying cells and 41 heat-deflection loads
were typed again, and three scenario answers moved. For this round: its decision is **D142** (the plan and the
assessment named D141 before main used it); the pages' numbers move with the data once main is merged, so the drawer's
golden baseline and the page-count check are recorded again on the merged tree before step 3 changes the drawer on
purpose; and the reviewer's hollow "no stated load" mark in PETG's HDT column (Spectrum's "method=A/B") is expected to
go. Main's reader sweep left its findings in OPEN-PROBLEMS §3, §4, §11 and §12; this round's three data problems above
are not among them.
