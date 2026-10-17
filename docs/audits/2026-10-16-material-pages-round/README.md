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
| 4 | The written summaries: table, placeholders, lint, drafts, judging | done: 76 summaries in `material_summaries.csv`, all draft; 40 judged, 5 false claims in the first pass, 0 after the second ([below](#step-4-the-written-summaries)) |
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

## The final page pass, and main merged again

On the owner's word, one more page pass on the second review's page findings, without a further review (d2b1c388,
894e6fb8): the first screen compares the material with the two most common ones; the sample summaries characterise
instead of reciting numbers; one meaning per word ("range" lowest to highest, "middle half" said); sections with nothing
on file leave the page; the Products table fits a laptop column with names in full and a two-line list on a phone; the
records page keeps the maintainers' notes in a closed group. Then main was fetched as it stood (c69ff7b1) and merged
(17b8ec01): only the owner's decision log conflicted, both entries kept in date order. On the merged tree:

| Check | Result |
|---|---|
| Drawer golden | a new baseline recorded on the merged data (TOTAL 11900 25398b25…, two runs identical); 793 renders moved with main's data, none with code (the merge changed nothing under `app/`) |
| verify:fast | 651 of 651 tests; 42.6 s warm; the first run after the data change took 117.7 s, over the 90 s budget, measured again in step 3 |
| Interface views | 83 of 83 match, no layout failure |
| Review snapshot | current |
| All 76 pages | rendered; page-counts.mjs 755 cross-section checks, 0 disagreements |
| Anchors | 108 of 108 land below the sticky header, at 1180 and 390 px |
| Products check | 2,088 checks, 0 failures, at 1180 and 390 px |

The reviewer's hollow "no stated load" mark in PETG's HDT column went with main's fix: Spectrum PET-G HT100's 94 °C is
read at 0.45 MPa and compared, and PETG's 0.45 MPa median now rests on 46 products.

## Step 3 and a data round, in parallel

Asked whether to go on to step 3 or to a data round on what the reviews found, the owner chose both at once. Step 3
(the build stage, the drawer's Full page link, the index page, the site and the release zip, the checks, D142) runs here
on `material-pages`. The data round runs on its own branch, `data-review-fixes`, cut from main at c69ff7b1, in a
separate worktree that reads this checkout's source caches and writes none of them; it takes D143 if it changes a rule.
Its scope is the review's data findings above and the reviewers' unverified ones (implausible moduli in ranges, a stale
moisture gap, one publisher spelt two ways, line-break hyphens in statements, OCR-garbled titles, orientation wordings,
a toughened claim on a glass-filled product, the PETG HF guide row read for PETG); the estimates' disagreement waits on
the frozen estimate stage (D138), and main's reader-sweep gaps stay in OPEN-PROBLEMS. The two branches merge later, main
fetched as it stands at that moment.

## Step 3 done, the data round merged, the integrated tree verified

Step 3 is committed (7c68b693): the build renders the pages, the drawer links to them, and the site and each release
carry them. Main had not moved (c69ff7b1), and the data round was merged (e0c8c761): DECISIONS.md kept this round's
D142 in place of the data round's placeholder, and D143 after it; the generated files were rebuilt from the merged data.
With the Full page link removed, all 11,900 drawer renders equal the baseline recorded on main's data. On the integrated
tree, from an empty build cache and with nothing else running, `npm run verify` passed all 21 steps in 627 s; verify:fast's
steps took 86.9 s, within the 90 s budget (the 93 s and 118 s seen earlier were measured beside another full verify and
on a cold cache after a data change). The interface views, now with the 24 page views, took 191 s.

Next, on the owner's word of 2026-10-17: this branch goes to main through a pull request first; then the draft #2 (verify
side by side, CI's scenarios in parts) is brought up to date with it, its decision renumbered D144 and its timings
measured again with the page checks in, and merged; then steps 4 and 5 on a branch from main.

## On main, and the other pull request reconciled

On the owner's word (2026-10-17), this round's branch went to main first as pull request #3: its first CI run failed the
eight laptop page views, because CI's Linux Chrome draws a 15 px scrollbar where macOS draws an overlay one and a page
that scrolls its document read 1165 px wide; the views now say whether a page fits the room it has (9740bb91). The second
run passed and #3 was merged (0a5259c1); main's Verify and Pages passed, and the site serves the material pages.

The draft #2 (verify runs side by side, CI runs the rendered scenarios in parts) had also taken D142. It was brought up
to date with main and its own latest commit, renumbered **D144** throughout, the material pages' check placed in its
step order (after the build), and the shared documents made to describe both (AGENTS, ARCHITECTURE, GOALS C13, the
probe's comments). On the combined tree, from an empty build cache on the owner's 10-core machine, verify took 432 s
side by side where the same checks one at a time took 627 s; verify:fast's steps 88.4 s. Its CI passed (the longest job
4 m 54 s, where #3's interface job had taken 11 m 12 s) and it was merged (1b9c107f). Steps 4 and 5 follow on
`material-pages-summaries`, from that main.

## Step 4: the written summaries

On `material-pages-summaries`, cut from main at 1b9c107f, on 2026-10-17. The summaries extend D142; they take no
decision of their own.

- **The table and the fill.** `data/tables/material_summaries.csv` (MaterialID, Summary, Written by, Written on, Review
  status from `schema/vocab/summary-status.csv`, Notes for maintainers). `build/src/written.js` fills each placeholder
  after the products' spreads are compiled, into `materials[].written`, with the field semantics the prototypes'
  samples used; the dev renderer's `--sample-summaries` went, so the build's fill is the only one. A field the material
  cannot fill, a stray brace, or a row on a group name is SUMMARY-PLACEHOLDER (error); a number typed outside a
  placeholder, or a count of records spelled out, is SUMMARY-NUMBER (lint). `test/summaries.test.js` (43 tests, Claude
  Sonnet from the specification; it found the names applied before the polyamide types).
- **The tools.** `npm run pages:fields -- <id>`, `npm run pages:text -- <id>`, `npm run pages:add-summaries --
  <file.csv>` (all or none, `--check`, `--revise`); the recipe "Write or revise a material's summary" in AGENTS.md.
- **Drafting.** Eight Claude Sonnet drafters, about ten materials each, read only each page's text and its fields
  ([brief](summaries/DRAFTER-BRIEF.md)). Every draft passed the build's fill and the lint before it was judged.
- **Judging.** Claude Opus read 40 drafts claim by claim on their pages, the 10 largest, 20 middle and 10 smallest by
  measured values ([JUDGED.csv](summaries/JUDGED.csv)): 312 claims, 5 false. Four classes: a count word on a single
  product ("some products need a hardened nozzle", 1 of 3; twice), the printing section's "7 state none" read as "no
  chamber needed", drying advice read from the Bambu Lab Filament Guide given to "their sheets", and one maker's words
  given to "makers". Over the limit of 4, so every batch was revised against them and a fifth class, no comparison
  through a maker's words ([second pass](summaries/SECOND-PASS.md)); the 27 judged drafts it changed were read again, and
  the 40 hold no false claim. The judge reworded six summaries' "only a product has a price" and named the guide in
  ASA's enclosure count (Written by says "corrected by Claude Opus (agent)"); [drafts/pass-1/](summaries/drafts/pass-1/)
  keeps the first pass.
- **Checks.** `build:diff`: `db.materials[].written` on the 76 materials and nothing else; `pages:check` green (P12, 889
  checks); `data:lint` no new finding; snapshot `pages.csv` and the 15 page views moved (In short no longer empty).

Left for step 5 from what the drafters and the judge met on the pages: "N state none" in the printing counts reads as
"none needed" (six of eight drafters asked; `labels.js` NOT_DRAWN); "all 3 products accept" on a material of nine, and
"all 2" and "both" likewise, count the products that give the setting; ASA-GF's notched Charpy is "orientation not
stated" in the masthead and "a moulded bar" in At a glance; Known gaps keep bookkeeping ("Mandatory review", "estimate
band", "H2C status ... recorded with no document cited"); ABS-AF's and POM's mastheads call the filler undisclosed. And
for the data: Raise3D Industrial PA12 CF+ is a product of PA612-CF (its filing to be checked); a Bambu Lab statement on
PAHT-CF speaks of "highly hygroscopic wood fibers"; PEEK's HDT at 0.45 MPa median (2 products) sits below its 1.8 MPa one (3); PEEK-CF's
printing says no source mentions nozzle wear beside a maker's "abrasion resistant" nozzle. The 36 drafts not judged were
revised in the second pass; all 76 wait for the owner's review.

